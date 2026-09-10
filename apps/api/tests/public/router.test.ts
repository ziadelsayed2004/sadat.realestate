import assert from 'node:assert/strict';
import test from 'node:test';
import { createApiServer, startApiServer, stopApiServer } from '../../src/server.js';
import type { PublicRouterDependencies } from '../../src/modules/public/router.js';
import type { AccessTokenClaims } from '../../src/modules/auth/crypto.js';

const data = { sections: [], properties: [], developers: [], content: [], banners: [] };
const service: PublicRouterDependencies['service'] = { async read() { return data; } };

test('homepage is unauthenticated and returns the stable public envelope', async () => {
  const server = createApiServer({ database: { isReady: async () => true }, publicHomepage: { service } });
  const address = await startApiServer(server, { host: '127.0.0.1', port: 0 });
  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/api/v1/public/home`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'public, max-age=60, stale-while-revalidate=300');
    const body = await response.json() as { data: typeof data; meta: { requestId: string } };
    assert.deepEqual(body.data, data);
    assert.equal(typeof body.meta.requestId, 'string');
  } finally {
    await stopApiServer(server);
  }
});

test('bootstrap and sitemap expose safe cacheable public projections', async () => {
  const server = createApiServer({
    database: { isReady: async () => true },
    publicHomepage: {
      service,
      bootstrap: { async read() { return { defaultLocale: 'ar', supportedLocales: ['ar', 'en'], directions: { ar: 'rtl', en: 'ltr' }, display: {} }; } },
      sitemap: { async read() { return { items: [{ path: '/' }, { path: '/properties/published-home', updatedAt: '2026-09-10T00:00:00.000Z' }] }; } }
    }
  });
  const address = await startApiServer(server, { host: '127.0.0.1', port: 0 });
  try {
    const bootstrap = await fetch(`http://127.0.0.1:${address.port}/api/v1/public/bootstrap`);
    assert.equal(bootstrap.status, 200);
    assert.equal((await bootstrap.json() as { data: { defaultLocale: string } }).data.defaultLocale, 'ar');
    const sitemap = await fetch(`http://127.0.0.1:${address.port}/api/v1/public/sitemap`);
    assert.equal(sitemap.status, 200);
    assert.deepEqual((await sitemap.json() as { data: { items: Array<{ path: string }> } }).data.items.map(item => item.path), ['/', '/properties/published-home']);
    assert.match(bootstrap.headers.get('cache-control') ?? '', /max-age=300/);
  } finally {
    await stopApiServer(server);
  }
});

test('homepage failures use the standard internal error envelope', async () => {
  const server = createApiServer({ database: { isReady: async () => true }, publicHomepage: { service: { async read() { throw new Error('database unavailable'); } } } });
  const address = await startApiServer(server, { host: '127.0.0.1', port: 0 });
  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/api/v1/public/home`);
    assert.equal(response.status, 500);
    const body = await response.json() as { error: { code: string } };
    assert.equal(body.error.code, 'INTERNAL_ERROR');
  } finally {
    await stopApiServer(server);
  }
});

test('property details forwards an optional verified viewer and disables shared caching', async () => {
  let viewer: AccessTokenClaims | undefined;
  const claims: AccessTokenClaims = {
    iss: 'sadat-real-estate-api', aud: 'sadat-real-estate', sub: 'a'.repeat(24), sid: 'b'.repeat(24),
    role: 'seeker', status: 'verified', iat: 1, exp: 2, jti: 'viewer'
  };
  const server = createApiServer({
    database: { isReady: async () => true },
    publicHomepage: {
      service,
      accessTokens: { issue() { return 'unused'; }, verify() { return claims; } },
      details: { async get(_slug, nextViewer) { viewer = nextViewer; return { id: 'property' } as never; } }
    }
  });
  const address = await startApiServer(server, { host: '127.0.0.1', port: 0 });
  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/api/v1/public/properties/published-home`, {
      headers: { authorization: 'Bearer valid-token' }
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    assert.equal(viewer?.sub, claims.sub);
  } finally {
    await stopApiServer(server);
  }
});
