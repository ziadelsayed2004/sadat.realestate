import assert from 'node:assert/strict';
import test from 'node:test';
import { createApiServer, startApiServer, stopApiServer } from '../../src/server.js';
import type { PublicSearchRouterDependencies } from '../../src/modules/search/router.js';

const result = { items: [], categories: [], page: 1, limit: 20, total: 0 };
const service: PublicSearchRouterDependencies['service'] = { async list() { return result; } };

test('public property listing is unauthenticated and returns pagination metadata', async () => {
  const server = createApiServer({ database: { isReady: async () => true }, publicSearch: { service } });
  const address = await startApiServer(server, { host: '127.0.0.1', port: 0 });
  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/api/v1/public/properties?page=1&limit=20`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'public, max-age=30, stale-while-revalidate=120');
    const body = await response.json() as { data: typeof result; meta: { total: number } };
    assert.deepEqual(body.data, result);
    assert.equal(body.meta.total, 0);
  } finally { await stopApiServer(server); }
});

test('public property listing rejects operator-shaped and unbounded query input', async () => {
  const server = createApiServer({ database: { isReady: async () => true }, publicSearch: { service } });
  const address = await startApiServer(server, { host: '127.0.0.1', port: 0 });
  try {
    assert.equal((await fetch(`http://127.0.0.1:${address.port}/api/v1/public/properties?limit=101`)).status, 400);
    assert.equal((await fetch(`http://127.0.0.1:${address.port}/api/v1/public/properties?%24where=true`)).status, 400);
    assert.equal((await fetch(`http://127.0.0.1:${address.port}/api/v1/public/properties?sort=price.amount`)).status, 400);
  } finally { await stopApiServer(server); }
});
