import assert from 'node:assert/strict';
import test from 'node:test';
import { createApiServer, startApiServer, stopApiServer } from '../../src/server.js';
import type { PublicOrganizationRouterDependencies } from '../../src/modules/organizations/router.js';

const profile = { id: '0123456789abcdef01234567', kind: 'developer_company' as const, slug: 'trusted-company', name: { en: 'Trusted Company' }, verified: true as const, projectCount: 0, propertyCount: 0, projects: [], properties: [] };
const service: PublicOrganizationRouterDependencies['service'] = { async list() { return { items: [profile], page: 1, limit: 20, total: 1 }; }, async get(slug) { return slug === 'trusted-company' ? profile : null; } };

test('directory and profile are unauthenticated, cacheable, and strict', async () => {
  const server = createApiServer({ database: { isReady: async () => true }, publicOrganizations: { service } });
  const address = await startApiServer(server, { host: '127.0.0.1', port: 0 });
  try {
    const list = await fetch(`http://127.0.0.1:${address.port}/api/v1/public/developers?kind=developer_company`);
    assert.equal(list.status, 200);
    assert.equal(list.headers.get('cache-control'), 'public, max-age=60, stale-while-revalidate=300');
    assert.equal((await list.json() as { data: { items: unknown[] } }).data.items.length, 1);
    const detail = await fetch(`http://127.0.0.1:${address.port}/api/v1/public/developers/trusted-company`);
    assert.equal(detail.status, 200);
    assert.equal((await detail.json() as { data: { verified: boolean } }).data.verified, true);
    assert.equal((await fetch(`http://127.0.0.1:${address.port}/api/v1/public/developers/missing`)).status, 404);
  } finally { await stopApiServer(server); }
});

test('directory rejects unbounded and operator-shaped query input', async () => {
  const server = createApiServer({ database: { isReady: async () => true }, publicOrganizations: { service } });
  const address = await startApiServer(server, { host: '127.0.0.1', port: 0 });
  try {
    assert.equal((await fetch(`http://127.0.0.1:${address.port}/api/v1/public/developers?limit=101`)).status, 400);
    assert.equal((await fetch(`http://127.0.0.1:${address.port}/api/v1/public/developers?%24where=true`)).status, 400);
    assert.equal((await fetch(`http://127.0.0.1:${address.port}/api/v1/public/developers/BAD_SLUG`)).status, 400);
  } finally { await stopApiServer(server); }
});
