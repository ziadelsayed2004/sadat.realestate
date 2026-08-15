import assert from 'node:assert/strict';
import test from 'node:test';
import { UAT_FIXTURE_STATES, UAT_FIXTURE_SURFACES, uatFixtureCatalogSchema, uatFixtureSchema } from '@sadat-real-estate/contracts';
import { assertUatFixtureCatalog, createUatFixtureCatalog, getUatFixture } from '../../src/modules/fixtures/catalog.js';

test('creates a deterministic synthetic catalog for every surface and common screen state', () => {
  const first = createUatFixtureCatalog();
  const second = createUatFixtureCatalog();
  assert.deepEqual(first, second);
  assert.equal(first.items.length, UAT_FIXTURE_SURFACES.length * UAT_FIXTURE_STATES.length);
  assert.deepEqual([...new Set(first.items.map(item => item.key))].sort(), first.items.map(item => item.key).sort());
  for (const surface of UAT_FIXTURE_SURFACES) {
    for (const state of UAT_FIXTURE_STATES) {
      const item = getUatFixture(first, `${surface}.${state}`);
      assert.ok(item);
      assert.equal(item.synthetic, true);
      assert.equal(item.surface, surface);
      assert.equal(item.state, state);
      assert.equal(item.locale, 'en');
    }
  }
});

test('fixture contracts are strict, credential-free, and preserve safe unavailable/empty states', () => {
  const catalog = createUatFixtureCatalog();
  assert.deepEqual(assertUatFixtureCatalog(catalog), catalog);
  assert.equal(uatFixtureCatalogSchema.safeParse({ ...catalog, extra: true }).success, false);
  assert.equal(uatFixtureSchema.safeParse({ ...catalog.items[0]!, password: 'not-a-secret' }).success, false);
  assert.equal(uatFixtureSchema.safeParse({ ...catalog.items[0]!, payload: { apiToken: 'not-a-secret' } }).success, false);
  assert.deepEqual(getUatFixture(catalog, 'public.empty')?.payload, { viewState: 'empty', items: [] });
  assert.equal(getUatFixture(catalog, 'operational.unavailable')?.payload.reason, 'adapter_unavailable');
  assert.equal(getUatFixture(catalog, 'admin.long_text')?.payload.text, 'Synthetic UAT long text '.repeat(32).trim());
});
