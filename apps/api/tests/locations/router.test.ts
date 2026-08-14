import assert from 'node:assert/strict';
import test from 'node:test';
import type { LocationData } from '@sadat-real-estate/contracts';
import type { AccessTokenClaims, AccessTokenService } from '../../src/modules/auth/crypto.js';
import { LocationServiceError, type LocationService } from '../../src/modules/locations/service.js';
import { createApiServer, startApiServer, stopApiServer } from '../../src/server.js';

const adminId = '0123456789abcdef01234567';
const viewerId = '1123456789abcdef01234567';
const locationId = '2123456789abcdef01234567';

function item(): LocationData {
  return {
    id: locationId, kind: 'location', name: { ar: 'مدينة السادات' }, slug: 'sadat-city',
    order: 0, active: true, version: 0,
    createdAt: '2026-08-14T08:00:00.000Z', updatedAt: '2026-08-14T08:00:00.000Z',
    availableActions: ['update', 'delete']
  };
}

function claims(role: 'admin' | 'seeker', sub = adminId): AccessTokenClaims {
  return {
    iss: 'sadat-real-estate-api', aud: 'sadat-real-estate', sub,
    sid: '3123456789abcdef01234567', role, status: 'verified', iat: 1, exp: 2, jti: 'synthetic'
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

function service(): LocationService {
  return {
    async list(principal, query) {
      if (principal.userId === viewerId) throw new LocationServiceError('LOCATION_FORBIDDEN');
      return { data: { items: [item()] }, page: query.page, limit: query.limit, total: 1 };
    },
    async create(principal) {
      if (principal.userId === viewerId) throw new LocationServiceError('LOCATION_FORBIDDEN');
      return item();
    },
    async update(_principal, id, input) {
      if (id !== locationId) throw new LocationServiceError('LOCATION_NOT_FOUND');
      return { ...item(), order: input.order ?? 0, active: input.active ?? true, version: 1 };
    },
    async delete(_principal, id, input) {
      if (id !== locationId) throw new LocationServiceError('LOCATION_NOT_FOUND');
      if (input.reason === 'Referenced location') throw new LocationServiceError('LOCATION_IN_USE');
      return { id, deleted: true };
    }
  };
}

async function withServer(run: (baseUrl: string) => Promise<void>): Promise<void> {
  const server = createApiServer({
    database: { isReady: async () => true },
    locations: { service: service(), accessTokens: accessTokens() }
  });
  const address = await startApiServer(server, { host: '127.0.0.1', port: 0 });
  try { await run(`http://127.0.0.1:${address.port}`); }
  finally { await stopApiServer(server); }
}

function request(baseUrl: string, method: string, path: string, token: string, body?: unknown) {
  return fetch(`${baseUrl}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
}

test('rejects unauthenticated, non-Admin, and unauthorized Admin access', async () => {
  await withServer(async (baseUrl) => {
    assert.equal((await fetch(`${baseUrl}/api/v1/admin/locations`)).status, 401);
    assert.equal((await request(baseUrl, 'GET', '/api/v1/admin/locations', 'seeker-token')).status, 403);
    assert.equal((await request(baseUrl, 'GET', '/api/v1/admin/locations', 'viewer-token')).status, 403);
  });
});

test('lists and mutates strict no-store localized projections', async () => {
  await withServer(async (baseUrl) => {
    const listed = await request(baseUrl, 'GET', '/api/v1/admin/locations?active=true&limit=10', 'admin-token');
    assert.equal(listed.status, 200);
    assert.equal(listed.headers.get('cache-control'), 'no-store');
    const listBody = await listed.json() as { data?: { items?: LocationData[] }; meta?: { total?: number } };
    assert.equal(listBody.data?.items?.[0]?.name.ar, 'مدينة السادات');
    assert.equal(listBody.meta?.total, 1);

    const created = await request(baseUrl, 'POST', '/api/v1/admin/locations', 'admin-token', {
      kind: 'location', name: { en: 'Sadat City' }, slug: 'sadat-city', reason: 'Create master location'
    });
    assert.equal(created.status, 201);
    const updated = await request(baseUrl, 'PATCH', `/api/v1/admin/locations/${locationId}`, 'admin-token', {
      version: 0, order: 2, active: false, reason: 'Reorder and deactivate'
    });
    assert.equal(updated.status, 200);
    assert.equal((await updated.json() as { data?: LocationData }).data?.active, false);
    assert.equal((await request(baseUrl, 'DELETE', `/api/v1/admin/locations/${locationId}`, 'admin-token', {
      version: 0, reason: 'Delete unused location'
    })).status, 200);
  });
});

test('rejects invalid payloads, unknown fields, unsafe queries, unknown IDs, and referenced deletion', async () => {
  await withServer(async (baseUrl) => {
    assert.equal((await request(baseUrl, 'GET', '/api/v1/admin/locations?limit=101', 'admin-token')).status, 400);
    assert.equal((await request(baseUrl, 'POST', '/api/v1/admin/locations', 'admin-token', {
      kind: 'location', name: { en: 'Unsafe' }, slug: 'Unsafe Slug', reason: 'Invalid payload', ownerId: adminId
    })).status, 400);
    assert.equal((await request(baseUrl, 'PATCH', '/api/v1/admin/locations/not-an-id', 'admin-token', {
      version: 0, order: 1, reason: 'Invalid identifier'
    })).status, 400);
    assert.equal((await request(baseUrl, 'PATCH', '/api/v1/admin/locations/4123456789abcdef01234567', 'admin-token', {
      version: 0, order: 1, reason: 'Unknown location'
    })).status, 404);
    assert.equal((await request(baseUrl, 'DELETE', `/api/v1/admin/locations/${locationId}`, 'admin-token', {
      version: 0, reason: 'Referenced location'
    })).status, 409);
  });
});
