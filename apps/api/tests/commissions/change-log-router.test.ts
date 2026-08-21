import assert from 'node:assert/strict';
import test from 'node:test';
import type { AuditLogData } from '@sadat-real-estate/contracts';
import type { AccessTokenClaims, AccessTokenService } from '../../src/modules/auth/crypto.js';
import type { CommissionAuditSource } from '../../src/modules/commissions/change-log-service.js';
import { createCommissionChangeLogService } from '../../src/modules/commissions/change-log-service.js';
import { createApiServer, startApiServer, stopApiServer } from '../../src/server.js';

const adminId = '0123456789abcdef01234567';
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
    jti: 'commission-change-log-router'
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

function auditRecord(): AuditLogData {
  return {
    id: 'dddddddddddddddddddddddd',
    actorType: 'admin',
    actorId: adminId,
    targetType: 'commission_policy',
    targetId: policyId,
    action: 'commission_policy.created',
    reason: 'Launch policy approved',
    before: {},
    after: {
      effectiveFrom: '2026-09-01T00:00:00.000Z',
      effectiveTo: '2026-12-01T00:00:00.000Z',
      version: 1
    },
    requestId: 'commission-change-log-test',
    traceId: '0123456789abcdef0123456789abcdef',
    createdAt: '2026-08-20T02:00:00.000Z'
  };
}

function source(): CommissionAuditSource {
  const record = auditRecord();
  return {
    async list(query) {
      assert.deepEqual(query.targetTypes, ['commission_policy']);
      return { items: [record], total: 1 };
    },
    async findById(id) {
      return id === record.id ? record : undefined;
    }
  };
}

async function withServer(
  permissions: readonly ('admin:commissions.view')[],
  run: (baseUrl: string) => Promise<void>
): Promise<void> {
  const server = createApiServer({
    database: { isReady: async () => true },
    commissionChangeLog: {
      service: createCommissionChangeLogService({ source: source() }),
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

test('protects change-log listing and returns a safe before/after projection', async () => {
  await withServer(['admin:commissions.view'], async baseUrl => {
    const path = `${baseUrl}/api/v1/admin/commission-change-log?targetType=commission_policy&page=1&limit=25`;
    assert.equal((await fetch(path)).status, 401);
    assert.equal((await fetch(path, { headers: { authorization: `Bearer ${seekerToken}` } })).status, 403);
    assert.equal((await fetch(`${path}&unknown=true`, { headers: { authorization: `Bearer ${adminToken}` } })).status, 400);

    const response = await fetch(path, {
      headers: { authorization: `Bearer ${adminToken}`, 'x-request-id': 'commission-change-log-list-1' }
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const body = await response.json() as { data: { items: Array<Record<string, unknown>>; page: number; limit: number; total: number }; meta: { requestId: string } };
    assert.equal(body.data.total, 1);
    assert.equal(body.data.items[0]?.targetType, 'commission_policy');
    assert.equal(body.data.items[0]?.effectiveFrom, '2026-09-01T00:00:00.000Z');
    assert.deepEqual(body.data.items[0]?.before, {});
    assert.equal('storageKey' in (body.data.items[0] ?? {}), false);
    assert.equal('internalNotes' in (body.data.items[0] ?? {}), false);
    assert.equal(body.meta.requestId, 'commission-change-log-list-1');
  });
});

test('keeps change-log listing behind the commission view permission', async () => {
  await withServer([], async baseUrl => {
    const response = await fetch(`${baseUrl}/api/v1/admin/commission-change-log`, {
      headers: { authorization: `Bearer ${adminToken}` }
    });
    assert.equal(response.status, 403);
  });
});
