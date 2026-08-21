import assert from 'node:assert/strict';
import test from 'node:test';
import type { AccessTokenClaims, AccessTokenService } from '../../src/modules/auth/crypto.js';
import type { CommissionConfirmation } from '@sadat-real-estate/contracts';
import type {
  CommissionConfirmationRepository,
  CommissionConfirmationReplaceResult,
  CommissionConfirmationWriteResult
} from '../../src/modules/commissions/confirmation-repository.js';
import { createCommissionConfirmationService } from '../../src/modules/commissions/confirmation-service.js';
import { createApiServer, startApiServer, stopApiServer } from '../../src/server.js';

const adminId = '0123456789abcdef01234567';
const accountId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const confirmationId = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const policyId = 'cccccccccccccccccccccccc';
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
    jti: 'commission-confirmation-router'
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

function seedConfirmation(): CommissionConfirmation {
  return {
    id: confirmationId,
    accountId,
    source: 'policy',
    sourceRecordId: policyId,
    policyVersion: 3,
    policyId,
    effectiveAt: '2026-08-20T00:00:00.000Z',
    status: 'acknowledged',
    acknowledgedAt: '2026-08-20T01:00:00.000Z',
    acknowledgedBy: accountId,
    version: 0,
    createdAt: '2026-08-20T01:00:00.000Z',
    updatedAt: '2026-08-20T01:00:00.000Z'
  };
}

function repository(initial: CommissionConfirmation[] = []): CommissionConfirmationRepository {
  const values = new Map(initial.map(value => [value.id, value]));
  return {
    async list() { return [...values.values()]; },
    async findById(id) { return values.get(id); },
    async insert(value): Promise<CommissionConfirmationWriteResult> {
      if ([...values.values()].some(item => item.accountId === value.accountId && item.policyVersion === value.policyVersion)) return { kind: 'duplicate' };
      values.set(value.id, value);
      return { kind: 'written' };
    },
    async replace(value, expectedVersion): Promise<CommissionConfirmationReplaceResult> {
      const current = values.get(value.id);
      if (!current) return { kind: 'not_found' };
      if (current.version !== expectedVersion) return { kind: 'version_conflict' };
      values.set(value.id, value);
      return { kind: 'written' };
    }
  };
}

async function withServer(
  permissions: readonly ['admin:commissions.view'] | [],
  run: (baseUrl: string) => Promise<void>
): Promise<void> {
  const service = createCommissionConfirmationService({
    repository: repository([seedConfirmation()]),
    now: () => new Date('2026-08-20T02:00:00.000Z')
  });
  const server = createApiServer({
    database: { isReady: async () => true },
    commissionConfirmations: {
      service,
      accessTokens,
      authorization: {
        authorize: async (_adminId, permission) => permissions.includes(permission as 'admin:commissions.view')
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

test('protects confirmation listing and returns a safe persisted projection', async () => {
  await withServer(['admin:commissions.view'], async baseUrl => {
    const path = `${baseUrl}/api/v1/admin/commission-confirmations?page=1&limit=20`;
    assert.equal((await fetch(path)).status, 401);
    assert.equal((await fetch(path, { headers: { authorization: `Bearer ${seekerToken}` } })).status, 403);
    assert.equal((await fetch(`${path}&unknown=true`, { headers: { authorization: `Bearer ${adminToken}` } })).status, 400);

    const response = await fetch(path, {
      headers: { authorization: `Bearer ${adminToken}`, 'x-request-id': 'commission-confirmation-list-1' }
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const body = await response.json() as { data: { items: Array<Record<string, unknown>>; page: number; limit: number; total: number }; meta: { requestId: string } };
    assert.equal(body.data.total, 1);
    assert.equal(body.data.items[0]?.id, confirmationId);
    assert.equal(body.data.items[0]?.status, 'acknowledged');
    assert.equal(body.data.items[0]?.policyVersion, 3);
    assert.equal('storageKey' in (body.data.items[0] ?? {}), false);
    assert.equal('internalNotes' in (body.data.items[0] ?? {}), false);
    assert.equal(body.meta.requestId, 'commission-confirmation-list-1');
  });
});

test('keeps confirmation listing behind the commission view permission', async () => {
  await withServer([], async baseUrl => {
    const response = await fetch(`${baseUrl}/api/v1/admin/commission-confirmations`, {
      headers: { authorization: `Bearer ${adminToken}` }
    });
    assert.equal(response.status, 403);
  });
});
