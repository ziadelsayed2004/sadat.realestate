import assert from 'node:assert/strict';
import test from 'node:test';
import { publicPropertyListDataSchema } from '@sadat-real-estate/contracts';
import { createPublicPropertySearchService, type PublicPropertySearchRepository, type PublicPropertySearchSource } from '../../src/modules/search/properties.js';
import { buildPropertyQueryPlan, expectedPropertyHint } from '../../src/modules/performance/property-indexes.js';

const localized = { ar: 'Ø´Ù‚Ø©', en: 'Apartment', 'zh-CN': 'å…¬å¯“' };

function row(index: number): PublicPropertySearchSource {
  return {
    id: index.toString(16).padStart(24, '0'),
    slug: `apartment-${index}`,
    kind: 'property',
    name: localized,
    transactionType: index % 2 === 0 ? 'sale' : 'rent',
    status: 'published',
    active: true,
    price: { amount: 1_000_000 + index, currency: 'EGP' },
    layout: { bedrooms: index % 5 }
  };
}

test('keeps a heavy public search page bounded and performs one repository query', async () => {
  const rows = Array.from({ length: 250 }, (_, index) => row(index));
  let repositoryCalls = 0;
  let observedQuery: Record<string, unknown> | undefined;
  const repository: PublicPropertySearchRepository = {
    async list(query) {
      repositoryCalls += 1;
      observedQuery = query;
      const start = (query.page - 1) * query.limit;
      return { items: rows.slice(start, start + query.limit), total: rows.length, categories: [], propertyTypes: [] };
    }
  };
  const service = createPublicPropertySearchService({ repository });
  const result = await service.list({ page: '2', limit: '100', sort: 'name', direction: 'asc' });
  const parsed = publicPropertyListDataSchema.parse(result);

  assert.equal(repositoryCalls, 1, 'public search must not introduce an N+1 repository pattern');
  assert.equal(observedQuery?.page, 2);
  assert.equal(observedQuery?.limit, 100);
  assert.equal(parsed.items.length, 100);
  assert.equal(parsed.total, 250);
  assert.ok(parsed.items.every(item => Object.keys(item).every(key => (
    ['id', 'slug', 'kind', 'name', 'transactionType', 'price', 'layout'].includes(key)
  ))));
  assert.ok(JSON.stringify(parsed).length > 0);
});

test('enforces documented page and index targets at the query-plan boundary', () => {
  const patterns = ['provider_list', 'admin_list', 'public_project', 'public_location', 'nearby', 'localized_search'] as const;
  for (const pattern of patterns) {
    const plan = buildPropertyQueryPlan({ pattern, page: 100_000, limit: 100 });
    assert.equal(plan.hint, expectedPropertyHint(pattern));
    assert.equal(plan.limit, 100);
    assert.ok(Number.isSafeInteger(plan.skip));
  }
  assert.throws(() => buildPropertyQueryPlan({ pattern: 'localized_search', page: 100_001, limit: 100 }));
  assert.throws(() => buildPropertyQueryPlan({ pattern: 'localized_search', page: 1, limit: 101 }));
});
