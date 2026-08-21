import assert from 'node:assert/strict';
import test from 'node:test';
import {
  adCalendarEventSchema,
  adAdminRequestSchema,
  type AdAdminRequest,
  type AdCalendarEvent,
  type AdAdminRequestListQuery
} from '@sadat-real-estate/contracts';
import type { AccessTokenClaims, AccessTokenService } from '../../src/modules/auth/crypto.js';
import { createApiServer, startApiServer, stopApiServer } from '../../src/server.js';
import { createAdAdminRequestService, type AdAdminRequestRepository, type AdCalendarService } from '../../src/modules/ads/service.js';

const adminId = '0123456789abcdef01234567';
const requestId = 'abcdefabcdefabcdefabcdef';
const adminToken = 'admin-token';
const seekerToken = 'seeker-token';
const pendingAdminToken = 'pending-admin-token';

function claims(role: AccessTokenClaims['role'], status: AccessTokenClaims['status'] = 'verified'): AccessTokenClaims {
  return {
    iss: 'sadat-real-estate-api', aud: 'sadat-real-estate', sub: adminId,
    sid: '1123456789abcdef01234567', role, status, iat: 1, exp: 9_999_999_999, jti: 'admin-ads-router'
  };
}

const accessTokens: AccessTokenService = {
  issue: () => 'unused',
  verify(token) {
    if (token === adminToken) return claims('admin');
    if (token === seekerToken) return claims('seeker');
    if (token === pendingAdminToken) return claims('admin', 'pending_review');
    throw new Error('invalid token');
  }
};

const record: AdAdminRequest = adAdminRequestSchema.parse({
  request: {
    id: requestId,
    providerId: adminId,
    placementKey: 'homepage.hero',
    purpose: 'Promote a verified provider listing',
    intervalStart: '2026-09-01T09:00:00.000Z',
    intervalEnd: '2026-09-02T09:00:00.000Z',
    status: 'waiting_pricing',
    version: 1,
    createdAt: '2026-08-13T00:00:00.000Z',
    updatedAt: '2026-08-13T00:00:00.000Z'
  }
});

const calendarEvent = adCalendarEventSchema.parse({
  requestId,
  placementKey: 'homepage.hero',
  providerId: adminId,
  status: 'scheduled',
  startsAt: '2026-09-01T09:00:00.000Z',
  endsAt: '2026-09-02T09:00:00.000Z',
  timezone: 'Africa/Cairo',
  localStart: '2026-09-01T12:00:00',
  localEnd: '2026-09-02T12:00:00',
  version: 2
});

function repository(): AdAdminRequestRepository {
  return {
    async listAdminRequests(query: AdAdminRequestListQuery) {
      assert.equal(query.status, 'waiting_pricing');
      assert.equal(query.page, 1);
      assert.equal(query.limit, 20);
      return { items: [record], total: 1 };
    },
    async getAdminRequest(id) {
      return id === requestId ? record : undefined;
    }
  };
}

const calendar: AdCalendarService = {
  async list() {
    return { items: [calendarEvent], page: 1, limit: 50, total: 1 };
  },
  async schedule() {
    return calendarEvent;
  }
};

async function withServer(
  allowed: boolean,
  run: (baseUrl: string) => Promise<void>
): Promise<void> {
  const service = createAdAdminRequestService({
    repository: repository(),
    authorization: { authorize: async () => allowed }
  });
  const server = createApiServer({ database: { isReady: async () => true }, adminAds: { service, calendar, accessTokens } });
  const address = await startApiServer(server, { host: '127.0.0.1', port: 0 });
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await stopApiServer(server);
  }
}

test('lists and returns administrator ad-request projections with permission and safe fields', async () => {
  await withServer(true, async baseUrl => {
    const listPath = `${baseUrl}/api/v1/admin/ad-requests?status=waiting_pricing&page=1&limit=20`;
    assert.equal((await fetch(listPath)).status, 401);
    assert.equal((await fetch(listPath, { headers: { Authorization: `Bearer ${seekerToken}` } })).status, 403);
    assert.equal((await fetch(listPath, { headers: { Authorization: `Bearer ${pendingAdminToken}` } })).status, 403);

    const list = await fetch(listPath, { headers: { Authorization: `Bearer ${adminToken}`, 'x-request-id': 'admin-ads-1' } });
    assert.equal(list.status, 200);
    const listBody = await list.json() as { data: { items: AdAdminRequest[]; page: number; limit: number; total: number }; meta: { requestId: string } };
    assert.deepEqual(listBody.data.items, [record]);
    assert.deepEqual({ page: listBody.data.page, limit: listBody.data.limit, total: listBody.data.total }, { page: 1, limit: 20, total: 1 });
    assert.equal(listBody.meta.requestId, 'admin-ads-1');
    assert.equal('storageKey' in (listBody.data.items[0] ?? {}), false);
    assert.equal('history' in (listBody.data.items[0]?.request ?? {}), false);

    const detail = await fetch(`${baseUrl}/api/v1/admin/ad-requests/${requestId}`, { headers: { Authorization: `Bearer ${adminToken}` } });
    assert.equal(detail.status, 200);
    const detailBody = await detail.json() as { data: AdAdminRequest };
    assert.deepEqual(detailBody.data, record);
    assert.equal((await fetch(`${baseUrl}/api/v1/admin/ad-requests/not-an-id`, { headers: { Authorization: `Bearer ${adminToken}` } })).status, 400);
    assert.equal((await fetch(`${baseUrl}/api/v1/admin/ad-requests/${'1'.repeat(24)}`, { headers: { Authorization: `Bearer ${adminToken}` } })).status, 404);
    assert.equal((await fetch(`${baseUrl}/api/v1/admin/ad-requests?unknown=true`, { headers: { Authorization: `Bearer ${adminToken}` } })).status, 400);
  });
});

test('denies the permission boundary even for a verified administrator', async () => {
  await withServer(false, async baseUrl => {
    const response = await fetch(`${baseUrl}/api/v1/admin/ad-requests`, { headers: { Authorization: `Bearer ${adminToken}` } });
    assert.equal(response.status, 403);
  });
});

test('exposes the administrator calendar and schedule transition with strict paths and no-store responses', async () => {
  await withServer(true, async baseUrl => {
    const listPath = `${baseUrl}/api/v1/admin/ad-calendar?page=1&limit=50`;
    assert.equal((await fetch(listPath)).status, 401);
    assert.equal((await fetch(listPath, { headers: { Authorization: `Bearer ${seekerToken}` } })).status, 403);

    const list = await fetch(listPath, { headers: { Authorization: `Bearer ${adminToken}` } });
    assert.equal(list.status, 200);
    assert.equal(list.headers.get('cache-control'), 'no-store');
    const listBody = await list.json() as { data: { items: AdCalendarEvent[]; total: number } };
    assert.deepEqual(listBody.data.items, [calendarEvent]);
    assert.equal(listBody.data.total, 1);
    assert.equal((await fetch(`${baseUrl}/api/v1/admin/ad-calendar?unknown=true`, { headers: { Authorization: `Bearer ${adminToken}` } })).status, 400);

    const schedule = await fetch(`${baseUrl}/api/v1/admin/ad-requests/${requestId}/schedule`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ expectedVersion: 1 })
    });
    assert.equal(schedule.status, 200);
    assert.deepEqual((await schedule.json() as { data: AdCalendarEvent }).data, calendarEvent);
    assert.equal((await fetch(`${baseUrl}/api/v1/admin/ad-requests/not-an-id/schedule`, { method: 'POST', headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ expectedVersion: 1 }) })).status, 400);
  });
});
