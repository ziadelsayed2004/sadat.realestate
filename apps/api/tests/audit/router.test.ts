import assert from 'node:assert/strict';
import test from 'node:test';
import type { AuditLogData } from '@sadat-real-estate/contracts';
import type { AccessTokenClaims, AccessTokenService } from '../../src/modules/auth/crypto.js';
import { AuditServiceError, type AuditService } from '../../src/modules/audit/service.js';
import { createApiServer, startApiServer, stopApiServer } from '../../src/server.js';

const adminId = '0123456789abcdef01234567';
const viewerId = '1123456789abcdef01234567';
const auditId = '2123456789abcdef01234567';

function claims(role: 'admin' | 'seeker', subject = adminId): AccessTokenClaims {
  return {
    iss: 'sadat-real-estate-api', aud: 'sadat-real-estate', sub: subject,
    sid: '3123456789abcdef01234567', role, status: 'verified', iat: 1, exp: 2,
    jti: 'synthetic'
  };
}

function accessTokens(): AccessTokenService {
  return {
    issue() { return 'unused'; },
    verify(token) {
      if (token === 'admin-token') return claims('admin');
      if (token === 'viewer-token') return claims('admin', viewerId);
      if (token === 'seeker-token') return claims('seeker');
      throw new Error('invalid');
    }
  };
}

function item(): AuditLogData {
  return {
    id: auditId,
    actorType: 'admin',
    actorId: adminId,
    targetType: 'user',
    targetId: '4123456789abcdef01234567',
    action: 'account.restrict',
    reason: 'Confirmed policy breach',
    before: { status: 'verified' },
    after: { status: 'restricted' },
    requestId: 'audit-router-1',
    traceId: 'e'.repeat(32),
    createdAt: '2026-08-14T00:00:00.000Z'
  };
}

function service(): AuditService {
  return {
    async list(principal, query) {
      if (principal.userId === viewerId) throw new AuditServiceError('AUDIT_FORBIDDEN');
      return { data: { items: [item()] }, page: query.page, limit: query.limit, total: 1 };
    },
    async findById(principal, id) {
      if (principal.userId === viewerId) throw new AuditServiceError('AUDIT_FORBIDDEN');
      if (id !== auditId) throw new AuditServiceError('AUDIT_LOG_NOT_FOUND');
      return item();
    }
  };
}

async function withServer(run: (baseUrl: string) => Promise<void>): Promise<void> {
  const server = createApiServer({
    database: { isReady: async () => true },
    audit: { service: service(), accessTokens: accessTokens() }
  });
  const address = await startApiServer(server, { host: '127.0.0.1', port: 0 });
  try { await run(`http://127.0.0.1:${address.port}`); }
  finally { await stopApiServer(server); }
}

test('requires an authenticated Admin and the explicit audit.view permission', async () => {
  await withServer(async (baseUrl) => {
    assert.equal((await fetch(`${baseUrl}/api/v1/admin/audit-logs`)).status, 401);
    assert.equal((await fetch(`${baseUrl}/api/v1/admin/audit-logs`, {
      headers: { Authorization: 'Bearer seeker-token' }
    })).status, 403);
    assert.equal((await fetch(`${baseUrl}/api/v1/admin/audit-logs`, {
      headers: { Authorization: 'Bearer viewer-token' }
    })).status, 403);
  });
});

test('lists and reads strict no-store audit projections with bounded pagination', async () => {
  await withServer(async (baseUrl) => {
    const listed = await fetch(`${baseUrl}/api/v1/admin/audit-logs?page=2&limit=10`, {
      headers: { Authorization: 'Bearer admin-token', 'X-Request-Id': 'audit-list-1' }
    });
    assert.equal(listed.status, 200);
    assert.equal(listed.headers.get('cache-control'), 'no-store');
    const listBody = await listed.json() as {
      data?: { items?: AuditLogData[] };
      meta?: { page?: number; limit?: number; total?: number; requestId?: string };
    };
    assert.equal(listBody.data?.items?.[0]?.id, auditId);
    assert.deepEqual(listBody.meta, {
      requestId: 'audit-list-1', page: 2, limit: 10, total: 1
    });

    const detail = await fetch(`${baseUrl}/api/v1/admin/audit-logs/${auditId}`, {
      headers: { Authorization: 'Bearer admin-token' }
    });
    assert.equal(detail.status, 200);
    assert.equal((await detail.json() as { data?: AuditLogData }).data?.action, 'account.restrict');
  });
});

test('rejects unsafe filters and returns stable non-enumerating detail errors', async () => {
  await withServer(async (baseUrl) => {
    const headers = { Authorization: 'Bearer admin-token' };
    assert.equal((await fetch(`${baseUrl}/api/v1/admin/audit-logs?limit=101`, { headers })).status, 400);
    assert.equal((await fetch(`${baseUrl}/api/v1/admin/audit-logs?targetId=${auditId}`, { headers })).status, 400);
    assert.equal((await fetch(`${baseUrl}/api/v1/admin/audit-logs/not-an-id`, { headers })).status, 400);
    assert.equal((await fetch(
      `${baseUrl}/api/v1/admin/audit-logs/5123456789abcdef01234567`, { headers }
    )).status, 404);
  });
});
