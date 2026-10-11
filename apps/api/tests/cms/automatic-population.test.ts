import assert from 'node:assert/strict';
import test from 'node:test';
import { createAutomaticPopulationReader, fetchPopulationSource, parsePopulationSource, POPULATION_SOURCE_URL, type PopulationSnapshot } from '../../src/modules/cms/automatic-population.js';
import { createPublicHomepageService, type HomepageSources } from '../../src/modules/public/homepage.js';
import { manualCityMetrics } from '../../src/modules/cms/city-statistics.js';

// Source sentence structure verified against the live page; use the precise value, not 79.1K.
const html = '<p>Sadat City\'s 2026 population is now estimated at <b>79,120</b>.</p>';
const checkedAt = '2026-10-11T10:00:00.000Z';
const now = () => new Date(checkedAt);
test('manual city counts require published whole numbers and never override automatic population', async () => {
  const overrides = manualCityMetrics([
    { key: 'city_metric_buildings', status: 'published', value: { kind: 'number', value: 123 } },
    { key: 'city_metric_housing_units', status: 'published', value: { kind: 'number', value: 0 } },
    { key: 'city_metric_residential_districts', status: 'draft', value: { kind: 'number', value: 50 } },
    { key: 'city_metric_annual_growth', status: 'published', value: { kind: 'number', value: -1 } },
    { key: 'city_metric_population', status: 'published', value: { kind: 'number', value: 999999 } }
  ]);
  assert.deepEqual(overrides.map(row => [row.key, row.value]), [['buildings', 123], ['housing_units', 0]]);
  assert.deepEqual(manualCityMetrics([{ key: 'city_metric_buildings', status: 'published', value: { kind: 'text', value: '123' } },
    { key: 'city_metric_housing_units', status: 'published', value: { kind: 'number', value: 1.5 } }]), []);
  const sources: HomepageSources = { sections: [], properties: [], developers: [], content: [], banners: [], manualMetrics: overrides,
    metrics: [{ key: 'housing_units', title: { en: 'Old count' }, value: 888, order: 3, status: 'published', visible: true }] };
  const result = await createPublicHomepageService({ repository: { async read() { return sources; } }, automaticPopulation: async () => ({ value: 79120, year: 2026, checkedAt }) }).read();
  assert.equal(result.metrics.find(row => row.key === 'population')?.value, 79120);
  assert.equal(result.metrics.find(row => row.key === 'housing_units')?.value, 0);
  assert.equal(result.metrics.find(row => row.key === 'buildings')?.value, 123);
});
test('extracts the precise Sadat estimate and year through markup, entities and whitespace', () => {
  assert.deepEqual(parsePopulationSource(html, now()), { value: 79120, year: 2026 });
  assert.deepEqual(parsePopulationSource(html.replace("'", '&#39;').replace('2026 ', '2026&nbsp;'), now()), { value: 79120, year: 2026 });
  assert.throws(() => parsePopulationSource('<script>' + html + '</script><p>79.1K Total Population</p>', now()));
  for (const bad of [html.replace('Sadat City', 'Cairo'), html.replace('2026', '1996'), html.replace('79,120', '0'), html.replace('79,120', '999,999,999'), html.replace('79,120', '79,120.5'), html.replace('79,120', '7,9,120'), html + html.replace('79,120', '80,000'), '<h1>Access denied</h1>']) {
    assert.throws(() => parsePopulationSource(bad, now()));
  }
});

test('fetches only the fixed source with bounded timeout, refuses redirects, errors and oversized bodies', async () => {
  assert.equal(await fetchPopulationSource(async (url, options) => {
    assert.equal(url, POPULATION_SOURCE_URL);
    assert.equal(options?.redirect, 'error'); assert.ok(options?.signal instanceof AbortSignal);
    return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
  }), html);
  await assert.rejects(fetchPopulationSource(async () => new Response('unavailable', { status: 503 })));
  await assert.rejects(fetchPopulationSource(async () => new Response('{}', { headers: { 'content-type': 'application/json' } })));
  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(new Uint8Array(2_000_001)); }, cancel() { cancelled = true; } });
  await assert.rejects(fetchPopulationSource(async () => new Response(stream, { headers: { 'content-type': 'text/html' } })));
  assert.equal(cancelled, true);
});

test('coalesces first requests, stores provenance and serves the persisted value without another download', async () => {
  let stored: PopulationSnapshot | null = null;
  let downloads = 0;
  const reader = createAutomaticPopulationReader({ now, store: {
    async read() { return stored; }, async save(value) { stored = value; }
  }, async load() { downloads++; return html; } });
  const result = await Promise.all([reader(), reader(), reader()]);
  assert.equal(downloads, 1);
  assert.deepEqual(result[0], { value: 79120, year: 2026, checkedAt });
  assert.deepEqual(await reader(), result[0]);
  assert.equal(downloads, 1);
  const restarted = createAutomaticPopulationReader({ now, store: {
    async read() { return stored; }, async save() { assert.fail('Fresh cache must not be overwritten'); }
  }, async load() { assert.fail('Restart must use the durable verified value'); } });
  assert.deepEqual(await restarted(), result[0]);
});

test('serves stale data immediately while a daily refresh persists the new source value', async () => {
  let stored: PopulationSnapshot = { value: 77000, year: 2026, checkedAt: '2026-10-09T10:00:00.000Z' };
  let release!: (html: string) => void;
  const reader = createAutomaticPopulationReader({ now, store: {
    async read() { return stored; }, async save(value) { stored = value; }
  }, load: () => new Promise(resolve => { release = resolve; }) });
  assert.equal((await reader())?.value, 77000);
  assert.equal((await reader())?.value, 77000);
  release(html);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal((await reader())?.value, 79120);
});

test('keeps the last verified data after a bad response, blocks year regression and retries after an hour', async () => {
  let at = now(); let downloads = 0; let failures = 0; let saves = 0;
  const stored: PopulationSnapshot = { value: 79120, year: 2026, checkedAt: '2026-10-09T10:00:00.000Z' };
  const reader = createAutomaticPopulationReader({ now: () => at, onError: () => { failures++; }, store: {
    async read() { return stored; }, async save() { saves++; }
  }, async load() { downloads++; return downloads === 1 ? '<p>temporarily unavailable</p>' : html.replace('2026', '2025'); } });
  assert.deepEqual(await reader(), stored);
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(await reader(), stored);
  assert.equal(downloads, 1); assert.equal(failures, 1); assert.equal(saves, 0);
  at = new Date(at.getTime() + 60 * 60 * 1000);
  assert.deepEqual(await reader(), stored);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(downloads, 2); assert.equal(failures, 2); assert.equal(saves, 0);
});

test('does not fabricate a number on first failure and can recover without restarting', async () => {
  let at = now(); let calls = 0; let stored: PopulationSnapshot | null = null;
  const reader = createAutomaticPopulationReader({ now: () => at, onError() {}, store: {
    async read() { return stored; }, async save(value) { stored = value; }
  }, async load() { if (++calls === 1) throw new Error('timeout'); return html; } });
  assert.equal(await reader(), null); assert.equal(await reader(), null); assert.equal(calls, 1);
  at = new Date(at.getTime() + 60 * 60 * 1000);
  assert.equal((await reader())?.value, 79120); assert.equal(calls, 2);
});

test('overrides legacy population settings only, keeps manual city metrics and honors hide control', async () => {
  const sources: HomepageSources = { sections: [], properties: [], developers: [], content: [], banners: [], metrics: [
    { key: 'population', title: { en: 'Population' }, value: 999999, order: 0, status: 'published', visible: true },
    { key: 'buildings', title: { en: 'Buildings' }, value: 123, order: 1, status: 'published', visible: true }
  ] };
  let snapshot: PopulationSnapshot | null = { value: 79120, year: 2026, checkedAt };
  let showPopulationCounter = true;
  const service = createPublicHomepageService({ repository: { async read() { return sources; } },
    automaticPopulation: async () => snapshot,
    displaySettings: { async read() { return { populationCount: 888888, showPopulationCounter }; } }
  });
  const output = await service.read();
  assert.deepEqual(output.metrics.find(row => row.key === 'buildings'), { key: 'buildings', title: { en: 'Buildings' }, value: 123, order: 1 });
  assert.equal(output.metrics.find(row => row.key === 'population')?.value, 79120);
  assert.equal(output.metrics[0]?.sourceUrl, POPULATION_SOURCE_URL);
  assert.equal(output.metrics[0]?.sourceYear, 2026);
  assert.equal(output.metrics[0]?.checkedAt, checkedAt);
  showPopulationCounter = false;
  assert.deepEqual((await service.read()).metrics.map(row => row.key), ['buildings']);
  showPopulationCounter = true; snapshot = null;
  assert.deepEqual((await service.read()).metrics.map(row => row.key), ['buildings']);
});
