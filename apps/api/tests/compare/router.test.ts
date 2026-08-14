import assert from 'node:assert/strict';
import test from 'node:test';
import { createApiServer, startApiServer, stopApiServer } from '../../src/server.js';
import type { PublicCompareRouterDependencies } from '../../src/modules/compare/router.js';

const result = { items: [{ id: '0123456789abcdef01234567', slug: 'first', kind: 'property' as const, name: { en: 'First' }, transactionType: 'sale' as const }], fields: ['name', 'transactionType', 'price', 'area', 'layout'] as const };
const service: PublicCompareRouterDependencies['service'] = { async compare() { return result; } };

test('comparison is unauthenticated and returns no-store fixed-field envelope', async () => {
  const server = createApiServer({ database: { isReady: async () => true }, publicCompare: { service } });
  const address = await startApiServer(server, { host: '127.0.0.1', port: 0 });
  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/api/v1/public/properties/compare`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ propertyIds: ['0123456789abcdef01234567'] }) });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.deepEqual((await response.json() as { data: typeof result }).data, result);
  } finally { await stopApiServer(server); }
});

test('comparison rejects invalid payloads before the service runs', async () => {
  const server = createApiServer({ database: { isReady: async () => true }, publicCompare: { service } });
  const address = await startApiServer(server, { host: '127.0.0.1', port: 0 });
  try {
    assert.equal((await fetch(`http://127.0.0.1:${address.port}/api/v1/public/properties/compare`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ propertyIds: ['$where'] }) })).status, 400);
  } finally { await stopApiServer(server); }
});
