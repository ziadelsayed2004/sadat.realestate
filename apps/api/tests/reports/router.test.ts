import assert from 'node:assert/strict';
import test from 'node:test';
import type { AccessTokenClaims, AccessTokenService } from '../../src/modules/auth/crypto.js';
import { createAdvertisingLedgerService } from '../../src/modules/reports/advertising-ledger.js';
import { createApiServer, startApiServer, stopApiServer } from '../../src/server.js';

const adminId = '3123456789abcdef01234567';
const requestId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const providerId = '2123456789abcdef01234567';

function claims(role: 'admin' | 'seeker'): AccessTokenClaims {
  return {
    iss: 'sadat-realestate-api',
    aud: 'sadat-realestate',
    sub: adminId,
    sid: '1123456789abcdef01234567',
    role,
    status: 'verified',
    iat: 1,
    exp: 9_999_999_999,
    jti: 'advertising-ledger-router'
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

function service() {
  return createAdvertisingLedgerService({
    authorization: {
      authorize: async (subject, permission) => subject === adminId && permission === 'admin:ads.view'
    },
    source: {
      list: async () => [{
        request: {
          id: requestId,
          providerId,
          placementKey: 'homepage.hero',
          purpose: 'Reviewed campaign',
          intervalStart: '2026-09-01T09:00:00+00:00',
          intervalEnd: '2026-09-02T09:00:00+00:00',
          status: 'waiting_payment',
          version: 1,
          createdAt: '2026-08-13T00:00:00+00:00',
          updatedAt: '2026-08-13T01:00:00+00:00'
        }
      }]
    }
  });
}

async function withServer(run: (baseUrl: string) => Promise<void>): Promise<void> {
  const server = createApiServer({
    database: { isReady: async () => true },
    advertisingLedger: { service: service(), accessTokens: accessTokens() }
  });
  const address = await startApiServer(server, { host: '127.0.0.1', port: 0 });
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await stopApiServer(server);
  }
}

test('protects advertising financial review and ledger routes with Admin ads-view authorization', async () => {
  await withServer(async (baseUrl) => {
    const listPath = `${baseUrl}/api/v1/admin/ad-financial-review?page=1&limit=20`;
    assert.equal((await fetch(listPath)).status, 401);
    assert.equal((await fetch(listPath, { headers: { authorization: 'Bearer seeker-token' } })).status, 403);

    const response = await fetch(listPath, {
      headers: { authorization: 'Bearer admin-token', 'x-request-id': 'advertising-ledger-1' }
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const body = await response.json() as { data?: { items: Array<Record<string, unknown>> }; meta?: { requestId?: string } };
    assert.equal(body.data?.items[0]?.requestId, requestId);
    assert.equal(body.data?.items[0]?.financialState, 'not_submitted');
    assert.equal('storageKey' in (body.data?.items[0] ?? {}), false);
    assert.equal(body.meta?.requestId, 'advertising-ledger-1');

    const detail = await fetch(`${baseUrl}/api/v1/admin/ad-financial-review/${requestId}`, {
      headers: { authorization: 'Bearer admin-token' }
    });
    assert.equal(detail.status, 200);

    const ledger = await fetch(`${baseUrl}/api/v1/admin/ad-ledger?page=1&limit=20`, {
      headers: { authorization: 'Bearer admin-token' }
    });
    assert.equal(ledger.status, 200);
  });
});

test('rejects strict report filters and avoids request enumeration', async () => {
  await withServer(async (baseUrl) => {
    const headers = { authorization: 'Bearer admin-token' };
    assert.equal((await fetch(`${baseUrl}/api/v1/admin/ad-financial-review?unknown=true`, { headers })).status, 400);
    assert.equal((await fetch(`${baseUrl}/api/v1/admin/ad-financial-review/not-an-object-id`, { headers })).status, 404);
  });
});
