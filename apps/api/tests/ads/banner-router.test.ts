import assert from 'node:assert/strict';
import test from 'node:test';
import {
  adBannerMediaSchema,
  adBannerSchema,
  adPlacementSchema,
  type AccessTokenClaims
} from '@sadat-real-estate/contracts';
import type { AccessTokenService } from '../../src/modules/auth/crypto.js';
import { createApiServer, startApiServer, stopApiServer } from '../../src/server.js';
import { createAdSettingsService } from '../../src/modules/ads/service.js';

const adminId = '0123456789abcdef01234567';
const bannerId = 'abcdefabcdefabcdefabcdef';
const mediaId = 'fedcbafedcbafedcbafedcba';
const adminToken = 'banner-admin-token';
const seekerToken = 'banner-seeker-token';

function claims(role: AccessTokenClaims['role']): AccessTokenClaims {
  return {
    iss: 'sadat-real-estate-api', aud: 'sadat-real-estate', sub: adminId,
    sid: '1123456789abcdef01234567', role, status: 'verified', iat: 1, exp: 9_999_999_999,
    jti: 'admin-banners-router'
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

const placement = adPlacementSchema.parse({
  id: '111111111111111111111111', key: 'homepage.hero', surface: 'homepage',
  label: { en: 'Homepage hero' }, width: 1200, height: 400, active: true,
  sortOrder: 1, allowedLocales: ['ar', 'en'], targetUrlRequired: false,
  version: 0, updatedBy: adminId, updatedAt: '2026-08-20T00:00:00.000Z'
});

const banner = adBannerSchema.parse({
  id: bannerId, placementKey: placement.key, title: { en: 'Existing banner' },
  mediaId,
  targetUrl: 'https://example.com/existing', startAt: '2026-09-01T00:00:00.000Z',
  endAt: '2026-09-30T00:00:00.000Z', status: 'draft', sortOrder: 0, version: 0,
  createdBy: adminId, updatedBy: adminId, createdAt: '2026-08-20T00:00:00.000Z',
  updatedAt: '2026-08-20T00:00:00.000Z'
});

const media = adBannerMediaSchema.parse({
  id: mediaId, bannerId, url: 'https://cdn.example.com/banner.webp', mime: 'image/webp',
  width: 1200, height: 400, active: true, version: 0, createdBy: adminId,
  createdAt: '2026-08-20T00:00:00.000Z', updatedAt: '2026-08-20T00:00:00.000Z'
});

async function withServer(
  allowed: boolean,
  run: (baseUrl: string) => Promise<void>
): Promise<void> {
  const service = createAdSettingsService({
    placements: [placement],
    banners: [banner],
    bannerMedia: [media],
    bannerAuthorization: { authorize: async () => allowed }
  });
  const server = createApiServer({
    database: { isReady: async () => true },
    adminBanners: { service, accessTokens }
  });
  const address = await startApiServer(server, { host: '127.0.0.1', port: 0 });
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await stopApiServer(server);
  }
}

test('exposes strict banner list, preview, media, and mutation boundaries', async () => {
  await withServer(true, async baseUrl => {
    const headers = { Authorization: `Bearer ${adminToken}` };
    assert.equal((await fetch(`${baseUrl}/api/v1/admin/banners`)).status, 401);
    assert.equal((await fetch(`${baseUrl}/api/v1/admin/banners`, { headers: { Authorization: `Bearer ${seekerToken}` } })).status, 403);

    const list = await fetch(`${baseUrl}/api/v1/admin/banners?page=1&limit=20`, { headers });
    assert.equal(list.status, 200);
    const listBody = await list.json() as { data: { items: typeof banner[]; total: number } };
    assert.deepEqual(listBody.data.items, [banner]);
    assert.equal(listBody.data.total, 1);
    assert.equal(list.headers.get('cache-control'), 'no-store');

    const preview = await fetch(`${baseUrl}/api/v1/admin/banners/${bannerId}/preview`, { headers });
    assert.equal(preview.status, 200);
    const previewBody = await preview.json() as { data: { banner: typeof banner; media?: typeof media; preview: true } };
    assert.equal(previewBody.data.preview, true);
    assert.equal(previewBody.data.media?.url, media.url);

    const listedMedia = await fetch(`${baseUrl}/api/v1/admin/banners/${bannerId}/media`, { headers });
    assert.equal(listedMedia.status, 200);
    assert.deepEqual((await listedMedia.json() as { data: { items: typeof media[] } }).data.items, [media]);

    const created = await fetch(`${baseUrl}/api/v1/admin/banners`, {
      method: 'POST', headers: { ...headers, 'content-type': 'application/json' },
      body: JSON.stringify({ placementKey: placement.key, title: { en: 'New banner' }, startAt: '2026-10-01T00:00:00.000Z', endAt: '2026-10-30T00:00:00.000Z', sortOrder: 1 })
    });
    assert.equal(created.status, 201);
    assert.equal((await created.json() as { data: { status: string } }).data.status, 'draft');
    assert.equal((await fetch(`${baseUrl}/api/v1/admin/banners?unknown=true`, { headers })).status, 400);
    assert.equal((await fetch(`${baseUrl}/api/v1/admin/banners/not-an-id/preview`, { headers })).status, 400);
  });
});

test('enforces the separate banner manage permission', async () => {
  await withServer(false, async baseUrl => {
    const response = await fetch(`${baseUrl}/api/v1/admin/banners`, { method: 'POST', headers: { Authorization: `Bearer ${adminToken}`, 'content-type': 'application/json' }, body: JSON.stringify({ placementKey: placement.key, title: { en: 'Denied banner' }, startAt: '2026-10-01T00:00:00.000Z', endAt: '2026-10-30T00:00:00.000Z' }) });
    assert.equal(response.status, 403);
  });
});
