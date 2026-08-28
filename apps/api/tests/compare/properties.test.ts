import assert from 'node:assert/strict';
import test from 'node:test';
import { PUBLIC_PROPERTY_COMPARISON_FIELDS } from '@sadat-real-estate/contracts';
import { createPublicPropertyComparisonService, PublicPropertyComparisonError, type PublicPropertyComparisonRepository, type PublicPropertyComparisonSource } from '../../src/modules/compare/properties.js';

const id = '0123456789abcdef01234567'; const other = '1123456789abcdef01234567';
const localized = { ar: 'شقة', en: 'Apartment', 'zh-CN': '公寓' };
const row = (value: string, overrides: Partial<PublicPropertyComparisonSource> = {}): PublicPropertyComparisonSource => ({ id: value, slug: value === id ? 'first' : 'second', kind: 'property', name: localized, transactionType: 'sale', status: 'published', active: true, ...overrides });
function repository(rows: PublicPropertyComparisonSource[]): PublicPropertyComparisonRepository { return { async findPublished(ids) { return rows.filter((item) => ids.includes(item.id) && item.status === 'published' && item.active); } }; }

test('compares one or two published active properties using fixed fields and safe cards', async () => {
  const service = createPublicPropertyComparisonService({ repository: repository([row(id), row(other)]) });
  const result = await service.compare({ propertyIds: [other, id] });
  assert.deepEqual(result.items.map((item) => item.id), [other, id]);
  assert.deepEqual(result.fields, [...PUBLIC_PROPERTY_COMPARISON_FIELDS]);
  assert.equal('status' in result.items[0]!, false);
  assert.equal('active' in result.items[0]!, false);
});

test('rejects duplicate, over-limit, unavailable, draft, and operator-shaped input', async () => {
  const service = createPublicPropertyComparisonService({ repository: repository([row(id), row(other, { status: 'draft' })]) });
  await assert.rejects(service.compare({ propertyIds: [id, id] }));
  await assert.rejects(service.compare({ propertyIds: [id, other, '2123456789abcdef01234567'] }));
  await assert.rejects(service.compare({ propertyIds: [id, other] }), (error) => error instanceof PublicPropertyComparisonError && error.code === 'PROPERTY_UNAVAILABLE');
  await assert.rejects(service.compare({ propertyIds: { '$in': [id] } }));
});

test('returns a single item comparison without inventing unavailable data', async () => {
  const service = createPublicPropertyComparisonService({ repository: repository([row(id)]) });
  const result = await service.compare({ propertyIds: [id] });
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0]?.price, undefined);
});
