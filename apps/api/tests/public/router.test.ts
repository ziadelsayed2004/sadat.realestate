import assert from 'node:assert/strict';
import test from 'node:test';
import { createApiServer, startApiServer, stopApiServer } from '../../src/server.js';
import type { PublicRouterDependencies } from '../../src/modules/public/router.js';

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
