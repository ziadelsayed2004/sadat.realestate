import assert from 'node:assert/strict';
import test from 'node:test';
import type { AccessTokenClaims, AccessTokenService } from '../../src/modules/auth/crypto.js';
import type {
  CommissionAccountOverride,
  CommissionPolicy
} from '@sadat-real-estate/contracts';
import type {
  CommissionAccountOverrideRepository,
  CommissionAccountOverrideReplaceResult,
  CommissionAccountOverrideWriteResult
} from '../../src/modules/commissions/account-repository.js';
import { createCommissionAccountService } from '../../src/modules/commissions/account-service.js';
import { createApiServer, startApiServer, stopApiServer } from '../../src/server.js';

const adminId = '0123456789abcdef01234567';
const accountId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const adminToken = 'admin-token';
const seekerToken = 'seeker-token';
const now = new Date('2026-08-20T00:00:00.000Z');

function claims(role: AccessTokenClaims['role']): AccessTokenClaims {
  return {
    iss: 'sadat-real-estate-api',
    aud: 'sadat-real-estate',
    sub: adminId,
    sid: '1123456789abcdef01234567',
    role,
    status: 'verified',
    iat: 1,
    exp: 9_999_999_999,
    jti: 'commission-account-router'
  };
}

const accessTokens: AccessTokenService = {
  issue: () => 'unused',
  verify(token) {
    if (token === adminToken) return claims('admin');
    if (token === seekerToken) return claims('seeker');
    throw new Error('invalid token');
  }
};

function policy(): CommissionPolicy {
  return {
    id: 'bbbbbbbbbbbbbbbbbbbbbbbb',
    key: 'default-policy',
    label: 'Default policy',
    kind: 'percentage',
    scope: { kind: 'default' },
    percentageBps: 250,
    effectiveFrom: '2026-01-01T00:00:00.000Z',
    status: 'active',
    version: 2,
    createdBy: adminId,
    updatedBy: adminId,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  };
}

function repository(): CommissionAccountOverrideRepository {
  const values = new Map<string, CommissionAccountOverride>();
  const duplicate = (): CommissionAccountOverrideWriteResult => ({ kind: 'duplicate' });
  return {
    async list() { return [...values.values()]; },
    async findById(id) { return values.get(id); },
    async insert(value) {
      if ([...values.values()].some(item => item.accountId === value.accountId && item.effectiveFrom === value.effectiveFrom)) return duplicate();
      values.set(value.id, value);
      return { kind: 'written' };
    },
    async replace(value, expectedVersion): Promise<CommissionAccountOverrideReplaceResult> {
      const current = values.get(value.id);
      if (!current) return { kind: 'not_found' };
      if (current.version !== expectedVersion) return { kind: 'version_conflict' };
      values.set(value.id, value);
      return { kind: 'written' };
    }
  };
}

async function withServer(
  permissions: readonly ('admin:commissions.view' | 'admin:commissions.manage')[],
  run: (baseUrl: string) => Promise<void>
): Promise<void> {
  const service = createCommissionAccountService({
    now: () => now,
    policies: [policy()],
    repository: repository()
  });
  const server = createApiServer({
    database: { isReady: async () => true },
    commissionAccounts: {
      service,
      accessTokens,
      authorization: {
        authorize: async (_adminId, permission) => permissions.includes(permission)
      }
    }
  });
  const address = await startApiServer(server, { host: '127.0.0.1', port: 0 });
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await stopApiServer(server);
  }
}

test('protects account commission reads and writes with strict projections and permissions', async () => {
  await withServer(['admin:commissions.view', 'admin:commissions.manage'], async baseUrl => {
    const path = `${baseUrl}/api/v1/admin/account-commissions/${accountId}`;
    assert.equal((await fetch(path)).status, 401);
    assert.equal((await fetch(path, { headers: { authorization: `Bearer ${seekerToken}` } })).status, 403);
    assert.equal((await fetch(`${path}?unknown=true`, { headers: { authorization: `Bearer ${adminToken}` } })).status, 400);

    const read = await fetch(path, {
      headers: { authorization: `Bearer ${adminToken}`, 'x-request-id': 'commission-account-read-1' }
    });
    assert.equal(read.status, 200);
    assert.equal(read.headers.get('cache-control'), 'no-store');
    const readBody = await read.json() as { data: Record<string, unknown>; meta: { requestId: string } };
    assert.equal(readBody.data.accountId, accountId);
    assert.equal(readBody.data.source, 'policy');
    assert.equal(readBody.data.percentageBps, 250);
    assert.equal(readBody.meta.requestId, 'commission-account-read-1');
    assert.equal('internalNotes' in readBody.data, false);

    const write = await fetch(path, {
      method: 'PUT',
      headers: { authorization: `Bearer ${adminToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({ kind: 'fixed', fixedAmountMinor: 7500, currency: 'EGP', effectiveFrom: '2026-09-01T00:00:00.000Z' })
    });
    assert.equal(write.status, 201);
    const writeBody = await write.json() as { data: Record<string, unknown> };
    assert.equal(writeBody.data.accountId, accountId);
    assert.equal(writeBody.data.status, 'draft');
    assert.equal(writeBody.data.source, 'account_override');
    assert.equal('storageKey' in writeBody.data, false);
  });
});

test('keeps view and manage permissions separate and rejects invalid account inputs', async () => {
  await withServer(['admin:commissions.view'], async baseUrl => {
    const response = await fetch(`${baseUrl}/api/v1/admin/account-commissions/${accountId}`, {
      method: 'PUT',
      headers: { authorization: `Bearer ${adminToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({ kind: 'exempt', effectiveFrom: '2026-09-01T00:00:00.000Z' })
    });
    assert.equal(response.status, 403);
  });

  await withServer(['admin:commissions.manage'], async baseUrl => {
    const response = await fetch(`${baseUrl}/api/v1/admin/account-commissions/${accountId}`, {
      method: 'PUT',
      headers: { authorization: `Bearer ${adminToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({ kind: 'exempt', effectiveFrom: '2026-09-01T00:00:00.000Z', unsupported: true })
    });
    assert.equal(response.status, 400);
  });

  await withServer(['admin:commissions.view'], async baseUrl => {
    const response = await fetch(`${baseUrl}/api/v1/admin/account-commissions/not-an-account`, {
      headers: { authorization: `Bearer ${adminToken}` }
    });
    assert.equal(response.status, 404);
  });
});
