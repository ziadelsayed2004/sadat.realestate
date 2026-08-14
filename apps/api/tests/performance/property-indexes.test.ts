import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPropertyQueryPlan, evaluatePropertyExplainPlan, expectedPropertyHint, getPropertySchemaIndexes, missingPropertyIndexes, PROPERTY_INDEX_CATALOG } from '../../src/modules/performance/property-indexes.js';

test('catalogs compound, text, and geospatial property indexes from live query patterns', () => {
  const names = new Set(getPropertySchemaIndexes().map(index => index.name));
  assert.equal(missingPropertyIndexes().length, 0);
  assert.deepEqual(new Set(PROPERTY_INDEX_CATALOG.map(index => index.kind)), new Set(['compound', 'text', 'geospatial']));
  for (const index of PROPERTY_INDEX_CATALOG) assert.equal(names.has(index.name), true, index.name);
});

test('builds deterministic bounded pagination plans and stable hints', () => {
  const plan = buildPropertyQueryPlan({ pattern: 'provider_list', page: 3, limit: 20, sort: { updatedAt: -1, _id: -1 } });
  assert.equal(plan.skip, 40);
  assert.equal(plan.hint, 'properties_provider_status_updated');
  assert.deepEqual(plan.sort, { updatedAt: -1, _id: -1 });
  assert.throws(() => buildPropertyQueryPlan({ pattern: 'admin_list', page: 1, limit: 101 }));
  assert.equal(expectedPropertyHint('nearby'), 'properties_coordinates_geo');
});

test('evaluates explain summaries without claiming unavailable live MongoDB execution', () => {
  assert.deepEqual(evaluatePropertyExplainPlan({ winningIndex: 'properties_search_text', totalKeysExamined: 10, totalDocsExamined: 20, nReturned: 5 }, 'properties_search_text'), { usesExpectedIndex: true, bounded: true, returned: 5 });
  assert.equal(evaluatePropertyExplainPlan({ winningIndex: 'COLLSCAN', totalKeysExamined: 0, totalDocsExamined: 500, nReturned: 2 }, 'properties_search_text').usesExpectedIndex, false);
  assert.throws(() => evaluatePropertyExplainPlan({ winningIndex: 'properties_search_text', totalKeysExamined: -1, totalDocsExamined: 0, nReturned: 0 }, 'properties_search_text'));
});
