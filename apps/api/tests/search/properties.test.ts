import assert from 'node:assert/strict';
import test from 'node:test';
import { publicPropertySearchQuerySchema } from '@sadat-real-estate/contracts';
import { createPublicPropertySearchService, type PublicPropertySearchRepository, type PublicPropertySearchSource } from '../../src/modules/search/properties.js';

const id = '0123456789abcdef01234567';
const other = '1123456789abcdef01234567';
const localized = { ar: 'شقة', en: 'Apartment' };
const row = (overrides: Partial<PublicPropertySearchSource> = {}): PublicPropertySearchSource => ({ id, slug: 'apartment', kind: 'property', name: localized, transactionType: 'sale', status: 'published', active: true, price: { amount: 1_000_000, currency: 'EGP' }, layout: { bedrooms: 2 }, ...overrides });

function repository(rows: PublicPropertySearchSource[]): PublicPropertySearchRepository {
  return { async list(query) { const filtered = rows.filter((value) => value.status === 'published' && value.active && (!query.search || JSON.stringify(value.name).toLowerCase().includes(query.search.toLowerCase())) && (!query.transactionType || value.transactionType === query.transactionType)); return { items: filtered.slice((query.page - 1) * query.limit, query.page * query.limit), total: filtered.length, categories: [{ id: other, slug: 'residential', name: localized, propertyCount: filtered.length, order: 0 }], propertyTypes: [{ id: other, slug: 'apartments', name: localized, propertyCount: filtered.length, order: 0 }] }; } };
}

test('lists only published active properties with bounded paging and safe projection', async () => {
  const service = createPublicPropertySearchService({ repository: repository([row({ deliveryStatus: 'ready_to_move', sourceName: localized, sourceImageUrl: 'https://example.com/logo.png', sourceType: 'developer_company', viewCount: 342, installmentAvailable: true, featured: true }), row({ id: other, slug: 'draft', status: 'draft' }), row({ id: other, slug: 'hidden', active: false })]) });
  const result = await service.list({ page: '1', limit: '20', sort: 'publishedAt', direction: 'desc' });
  assert.equal(result.total, 1);
  assert.equal(result.items[0]?.slug, 'apartment');
  assert.equal('status' in result.items[0]!, false);
  assert.equal('active' in result.items[0]!, false);
  assert.equal('contact' in result.items[0]!, false);
  assert.equal(result.items[0]?.deliveryStatus, 'ready_to_move');
  assert.equal(result.items[0]?.sourceType, 'developer_company');
  assert.equal(result.items[0]?.sourceImageUrl, 'https://example.com/logo.png');
  assert.equal(result.items[0]?.viewCount, 342);
  assert.equal(result.items[0]?.installmentAvailable, true);
  assert.equal(result.items[0]?.featured, true);
  assert.equal(result.categories[0]?.propertyCount, 1);
  assert.equal(result.propertyTypes[0]?.slug, 'apartments');
});

test('supports allowlisted filters and deterministic query validation', async () => {
  const service = createPublicPropertySearchService({ repository: repository([row({ transactionType: 'rent', slug: 'rent-home' }), row({ transactionType: 'sale' })]) });
  const result = await service.list({ transactionType: 'rent', search: 'شقة', page: '1', limit: '1' });
  assert.equal(result.total, 1);
  assert.equal(result.items[0]?.transactionType, 'rent');
  assert.equal(publicPropertySearchQuerySchema.safeParse({ page: '1', limit: '20', '$where': 'true' }).success, false);
  assert.equal(publicPropertySearchQuerySchema.safeParse({ page: '1', limit: '20', sort: 'price.amount' }).success, false);
  assert.equal(publicPropertySearchQuerySchema.safeParse({ page: '1', limit: '20', minPrice: '2', maxPrice: '1' }).success, false);
  assert.equal(publicPropertySearchQuerySchema.safeParse({ propertyTypeId: id }).success, true);
  assert.equal(publicPropertySearchQuerySchema.safeParse({ propertyCategoryId: id }).success, true);
  assert.equal(publicPropertySearchQuerySchema.safeParse({ propertyCategoryId: 'not-an-object-id' }).success, false);
  assert.equal(publicPropertySearchQuerySchema.safeParse({ propertyTypeId: 'not-an-object-id' }).success, false);
  assert.equal(publicPropertySearchQuerySchema.safeParse({ deliveryStatus: 'ready_to_move' }).success, true);
  assert.equal(publicPropertySearchQuerySchema.safeParse({ deliveryStatus: 'unknown' }).success, false);
});

test('returns a safe empty page when no public rows exist', async () => {
  const service = createPublicPropertySearchService({ repository: repository([]) });
  assert.deepEqual(await service.list({}), { items: [], categories: [{ id: other, slug: 'residential', name: localized, propertyCount: 0, order: 0 }], propertyTypes: [{ id: other, slug: 'apartments', name: localized, propertyCount: 0, order: 0 }], page: 1, limit: 20, total: 0 });
});
