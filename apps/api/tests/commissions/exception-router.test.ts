import assert from 'node:assert/strict';
import test from 'node:test';
import type { AccessTokenClaims, AccessTokenService } from '../../src/modules/auth/crypto.js';
import type { CommissionException } from '@sadat-real-estate/contracts';
import type {
  CommissionExceptionRepository,
  CommissionExceptionReplaceResult,
  CommissionExceptionWriteResult
} from '../../src/modules/commissions/exception-repository.js';
import { createCommissionExceptionService } from '../../src/modules/commissions/exception-service.js';
import { createApiServer, startApiServer, stopApiServer } from '../../src/server.js';

const adminId = '0123456789abcdef01234567';
const accountId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const adminToken = 'admin-token';
const seekerToken = 'seeker-token';

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
    jti: 'commission-exception-router'
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

function repository(): CommissionExceptionRepository {
  const values = new Map<string, CommissionException>();
  return {
    async list() { return [...values.values()]; },
    async findById(id) { return values.get(id); },
    async insert(value): Promise<CommissionExceptionWriteResult> {
      if ([...values.values()].some(item => item.accountId === value.accountId && item.effectiveFrom === value.effectiveFrom)) return { kind: 'duplicate' };
      values.set(value.id, value);
      return { kind: 'written' };
    },
    async replace(value, expectedVersion): Promise<CommissionExceptionReplaceResult> {
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
  const service = createCommissionExceptionService({
    now: () => new Date('2026-08-20T00:00:00.000Z'),
    repository: repository()
  });
  const server = createApiServer({
    database: { isReady: async () => true },
    commissionExceptions: {
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

test('protects exception list/create with strict projections and reason-bearing drafts', async () => {
  await withServer(['admin:commissions.view', 'admin:commissions.manage'], async baseUrl => {
    const path = `${baseUrl}/api/v1/admin/commission-exceptions?page=1&limit=20`;
    assert.equal((await fetch(path)).status, 401);
    assert.equal((await fetch(path, { headers: { authorization: `Bearer ${seekerToken}` } })).status, 403);
    assert.equal((await fetch(`${path}&unknown=true`, { headers: { authorization: `Bearer ${adminToken}` } })).status, 400);

    const list = await fetch(path, {
      headers: { authorization: `Bearer ${adminToken}`, 'x-request-id': 'commission-exception-list-1' }
    });
    assert.equal(list.status, 200);
    assert.equal(list.headers.get('cache-control'), 'no-store');
    const listBody = await list.json() as { data: { items: unknown[]; total: number }; meta: { requestId: string } };
    assert.deepEqual(listBody.data, { items: [], page: 1, limit: 20, total: 0 });
    assert.equal(listBody.meta.requestId, 'commission-exception-list-1');

    const create = await fetch(`${baseUrl}/api/v1/admin/commission-exceptions`, {
      method: 'POST',
      headers: { authorization: `Bearer ${adminToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        accountId,
        kind: 'percentage',
        percentageBps: 0,
        reason: 'Approved launch-period waiver',
        effectiveFrom: '2026-09-01T00:00:00.000Z'
      })
    });
    assert.equal(create.status, 201);
    const body = await create.json() as { data: Record<string, unknown> };
    assert.equal(body.data.accountId, accountId);
    assert.equal(body.data.status, 'draft');
    assert.equal(body.data.source, 'exception');
    assert.equal(body.data.lastMutationReason, 'Approved launch-period waiver');
    assert.equal('storageKey' in body.data, false);
  });
});

test('keeps exception view/manage permissions separate and rejects invalid payloads', async () => {
  await withServer(['admin:commissions.view'], async baseUrl => {
    const response = await fetch(`${baseUrl}/api/v1/admin/commission-exceptions`, {
      method: 'POST',
      headers: { authorization: `Bearer ${adminToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({ accountId, kind: 'exempt', reason: 'No access', effectiveFrom: '2026-09-01T00:00:00.000Z' })
    });
    assert.equal(response.status, 403);
  });

  await withServer(['admin:commissions.manage'], async baseUrl => {
    const response = await fetch(`${baseUrl}/api/v1/admin/commission-exceptions`, {
      method: 'POST',
      headers: { authorization: `Bearer ${adminToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({ accountId, kind: 'exempt', reason: 'Unknown field', effectiveFrom: '2026-09-01T00:00:00.000Z', unsupported: true })
    });
    assert.equal(response.status, 400);
  });
});
