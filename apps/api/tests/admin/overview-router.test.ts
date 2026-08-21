import assert from 'node:assert/strict';
import test from 'node:test';
import type { AdminOverviewData } from '@sadat-real-estate/contracts';
import type { AccessTokenClaims, AccessTokenService } from '../../src/modules/auth/crypto.js';
import {
  AdminOverviewServiceError,
  type AdminOverviewService
} from '../../src/modules/admin/overview-service.js';
import { createApiServer, startApiServer, stopApiServer } from '../../src/server.js';

const adminId = '0123456789abcdef01234567';
const range = {
  from: '2026-08-01T00:00:00+00:00',
  to: '2026-08-14T00:00:00+00:00'
} as const;

function claims(role: 'admin' | 'seeker'): AccessTokenClaims {
  return {
    iss: 'sadat-real-estate-api',
    aud: 'sadat-real-estate',
    sub: adminId,
    sid: '1123456789abcdef01234567',
    role,
    status: 'verified',
    iat: 1,
    exp: 9_999_999_999,
    jti: 'admin-overview-router'
  };
}

function accessTokens(): AccessTokenService {
  return {
    issue() { return 'unused'; },
    verify(token) {
      if (token === 'admin-token') return claims('admin');
      if (token === 'seeker-token') return claims('seeker');
      throw new Error('invalid');
    }
  };
}

function data(): AdminOverviewData {
  return {
    range,
    metrics: {
      users: 12,
      seekers: 7,
      providers: 5,
      verifiedProviders: 3,
      publishedProperties: 9,
      openRequests: 4,
      pendingReviews: 6
    },
    generatedAt: '2026-08-14T01:00:00.000Z'
  };
}

function service(mode: 'success' | 'forbidden' | 'unavailable' = 'success'): AdminOverviewService {
  const get = async (principal: AccessTokenClaims, input: unknown): Promise<AdminOverviewData> => {
    assert.equal(principal.sub, adminId);
    assert.deepEqual(input, range);
    if (mode === 'forbidden') throw new AdminOverviewServiceError('ADMIN_OVERVIEW_FORBIDDEN');
    if (mode === 'unavailable') throw new AdminOverviewServiceError('ADMIN_OVERVIEW_SOURCE_INVALID');
    return data();
  };
  return { get, getOverview: get, read: get };
}

async function withServer(
  overviewService: AdminOverviewService,
  run: (baseUrl: string) => Promise<void>
): Promise<void> {
  const server = createApiServer({
    database: { isReady: async () => true },
    adminOverview: { service: overviewService, accessTokens: accessTokens() }
  });
  const address = await startApiServer(server, { host: '127.0.0.1', port: 0 });
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await stopApiServer(server);
  }
}

test('requires a verified administrator and returns a strict no-store KPI projection', async () => {
  await withServer(service(), async (baseUrl) => {
    const path = `${baseUrl}/api/v1/admin/overview?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`;
    assert.equal((await fetch(path)).status, 401);
    assert.equal((await fetch(path, { headers: { authorization: 'Bearer seeker-token' } })).status, 403);

    const response = await fetch(path, {
      headers: { authorization: 'Bearer admin-token', 'x-request-id': 'admin-overview-1' }
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const body = await response.json() as { data?: AdminOverviewData; meta?: { requestId?: string } };
    assert.deepEqual(body.data, data());
    assert.equal(body.meta?.requestId, 'admin-overview-1');
    assert.equal('adminId' in (body.data ?? {}), false);
  });
});

test('rejects unknown query keys and maps source readiness and permission errors safely', async () => {
  const query = `from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`;
  await withServer(service(), async (baseUrl) => {
    const headers = { authorization: 'Bearer admin-token' };
    assert.equal((await fetch(`${baseUrl}/api/v1/admin/overview?${query}&unknown=true`, { headers })).status, 400);
  });
  await withServer(service('forbidden'), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/admin/overview?${query}`, { headers: { authorization: 'Bearer admin-token' } });
    assert.equal(response.status, 403);
  });
  await withServer(service('unavailable'), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/admin/overview?${query}`, { headers: { authorization: 'Bearer admin-token' } });
    assert.equal(response.status, 503);
  });
});
