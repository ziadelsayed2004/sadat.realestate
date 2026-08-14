import assert from 'node:assert/strict';
import test from 'node:test';
import { createApiServer, startApiServer, stopApiServer } from '../../src/server.js';
import type { PublicRouterDependencies } from '../../src/modules/public/router.js';

const details = { id: '0123456789abcdef01234567', slug: 'apartment', kind: 'property' as const, name: { en: 'Apartment' }, transactionType: 'sale' as const, source: { sourceType: 'individual_broker' as const }, seo: { title: { en: 'Apartment' }, slug: 'apartment' }, project: null, media: [], relatedProperties: [] };
const service: PublicRouterDependencies['service'] = { async read() { return { sections: [], properties: [], developers: [], content: [], banners: [] }; } };
const detailsService: NonNullable<PublicRouterDependencies['details']> = { async get(slug) { return slug === 'apartment' ? details : null; } };

test('property details are public, cacheable, and not found is explicit', async () => {
  const server = createApiServer({ database: { isReady: async () => true }, publicHomepage: { service, details: detailsService } });
  const address = await startApiServer(server, { host: '127.0.0.1', port: 0 });
  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/api/v1/public/properties/apartment`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'public, max-age=60, stale-while-revalidate=300');
    assert.equal((await response.json() as { data: { slug: string } }).data.slug, 'apartment');
    assert.equal((await fetch(`http://127.0.0.1:${address.port}/api/v1/public/properties/missing`)).status, 404);
    assert.equal((await fetch(`http://127.0.0.1:${address.port}/api/v1/public/properties/BAD_SLUG`)).status, 400);
  } finally { await stopApiServer(server); }
});
