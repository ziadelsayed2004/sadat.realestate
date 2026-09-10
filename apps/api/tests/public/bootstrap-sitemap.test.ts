import assert from 'node:assert/strict';
import test from 'node:test';
import { createPublicBootstrapService } from '../../src/modules/public/bootstrap.js';
import { createPublicSitemapService } from '../../src/modules/public/sitemap.js';

test('public bootstrap fixes locale direction before content and projects only display settings', async () => {
  const service = createPublicBootstrapService({
    async read() { return { populationCount: 342_800, populationLabel: { ar: 'نسمة', en: 'Residents' }, showPopulationCounter: true }; }
  });
  assert.deepEqual(await service.read(), {
    defaultLocale: 'ar',
    supportedLocales: ['ar', 'en'],
    directions: { ar: 'rtl', en: 'ltr' },
    display: { populationCount: 342_800, populationLabel: { ar: 'نسمة', en: 'Residents' }, showPopulationCounter: true }
  });
});

test('public sitemap removes duplicate paths and rejects unsafe projections', async () => {
  const service = createPublicSitemapService({
    async list() { return [{ path: '/' }, { path: '/' }, { path: '/properties/home', updatedAt: '2026-09-10T00:00:00.000Z' }]; }
  });
  assert.deepEqual((await service.read()).items.map(item => item.path), ['/', '/properties/home']);
  const unsafe = createPublicSitemapService({ async list() { return [{ path: '//external.example' }]; } });
  await assert.rejects(unsafe.read());
});
