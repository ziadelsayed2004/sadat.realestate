import assert from 'node:assert/strict';
import test from 'node:test';
import { publicHomepageDataSchema } from '@sadat-real-estate/contracts';
import { createMongoosePublicHomepageRepository, createPublicHomepageService, publicHomepageProjection, type HomepageSources } from '../../src/modules/public/homepage.js';
import type { Connection } from 'mongoose';

const id = '0123456789abcdef01234567';
const secondId = '1123456789abcdef01234567';
const localized = { ar: 'الرئيسية', en: 'Home' };

function sources(overrides: Partial<HomepageSources> = {}): HomepageSources {
  return {
    sections: [
      { key: 'draft', title: localized, order: 0, status: 'draft', visible: true },
      { key: 'visible', title: localized, order: 2, status: 'published', visible: true },
      { key: 'hidden', title: localized, order: 1, status: 'published', visible: false }
    ],
    categories: [{ id, slug: 'apartments', name: localized, propertyCount: 7, order: 0, active: true }],
    metrics: [{ key: 'population', title: localized, value: 342800, order: 0, status: 'published', visible: true }],
    properties: [
      { id, slug: 'zeta-home', kind: 'property', name: localized, transactionType: 'sale', status: 'published', active: true, price: { amount: 1_000_000, currency: 'EGP' } },
      { id: secondId, slug: 'draft-home', kind: 'property', name: localized, transactionType: 'rent', status: 'draft', active: true }
    ],
    developers: [
      { id, slug: 'approved-developer', name: localized, kind: 'developer_company', status: 'approved' },
      { id: secondId, slug: 'inactive-developer', name: localized, kind: 'developer_company', status: 'inactive' }
    ],
    content: [
      { key: 'tip', type: 'tip', title: localized, order: 1, status: 'published', active: true },
      { key: 'draft-content', type: 'about', title: localized, order: 0, status: 'draft', active: true }
    ],
    banners: [
      { key: 'hero', title: localized, eyebrow: localized, body: localized, highlight: localized, order: 0, status: 'published', active: true, imageUrl: 'https://cdn.example/hero.webp' },
      { key: 'hidden-banner', title: localized, order: 1, status: 'published', active: false }
    ],
    ...overrides
  };
}

test('projects a deterministic published-only homepage without sensitive workflow fields', () => {
  const result = publicHomepageProjection(sources());
  assert.deepEqual(result.sections.map((item) => item.key), ['visible']);
  assert.deepEqual(result.categories.map((item) => [item.slug, item.propertyCount]), [['apartments', 7]]);
  assert.deepEqual(result.metrics.map((item) => [item.key, item.value]), [['population', 342800]]);
  assert.deepEqual(result.properties.map((item) => item.slug), ['zeta-home']);
  assert.deepEqual(result.developers.map((item) => item.slug), ['approved-developer']);
  assert.deepEqual(result.content.map((item) => item.key), ['tip']);
  assert.deepEqual(result.banners.map((item) => item.key), ['hero']);
  assert.deepEqual(result.banners[0]?.body, localized);
  assert.deepEqual(result.banners[0]?.eyebrow, localized);
  assert.deepEqual(result.banners[0]?.highlight, localized);
  assert.equal('status' in result.properties[0]!, false);
  assert.equal('active' in result.properties[0]!, false);
  assert.equal('providerId' in result.properties[0]!, false);
  assert.equal('contact' in result.properties[0]!, false);
});

test('uses stable order/key sorting and validates supported localized content', () => {
  const result = publicHomepageProjection(sources({
    sections: [
      { key: 'zeta', title: { en: 'Zeta' }, order: 1, status: 'published', visible: true },
      { key: 'alpha', title: { en: 'Alpha' }, order: 1, status: 'published', visible: true },
      { key: 'first', title: { ar: 'الأول' }, order: 0, status: 'published', visible: true }
    ]
  }));
  assert.deepEqual(result.sections.map((item) => item.key), ['first', 'alpha', 'zeta']);
  assert.equal(result.sections[0]?.title.ar, 'الأول');
  assert.equal(publicHomepageDataSchema.safeParse(result).success, true);
});

test('projects only active admin-managed locations for the hero search', () => {
  const result = publicHomepageProjection(sources({
    locations: [
      { id: secondId, kind: 'neighborhood', name: localized, slug: 'first-district', parentLocationId: id, order: 2, active: true },
      { id, kind: 'location', name: localized, slug: 'sadat-city', order: 1, active: true },
      { id: '2123456789abcdef01234567', kind: 'location', name: localized, slug: 'hidden-city', order: 0, active: false }
    ]
  }));
  assert.deepEqual(result.locations?.map((item) => [item.id, item.parentLocationId]), [[id, undefined], [secondId, id]]);
});

test('applies the saved population counter to the public homepage projection', () => {
  const visible = publicHomepageProjection(sources(), { populationCount: 500_000, populationLabel: { ar: 'سكان المدينة', en: 'City residents' }, showPopulationCounter: true });
  assert.deepEqual(visible.metrics[0], { key: 'population', title: { ar: 'سكان المدينة', en: 'City residents' }, value: 500_000, order: 0 });
  const hidden = publicHomepageProjection(sources(), { showPopulationCounter: false });
  assert.equal(hidden.metrics.some((metric) => metric.key === 'population'), false);
});

test('drops malformed persisted public rows and supports a safe empty state', async () => {
  const service = createPublicHomepageService({ repository: { async read() { return sources({ sections: [{ key: 'bad key', title: {}, order: -1, status: 'published', visible: true }] as never, properties: [], developers: [], content: [], banners: [] }); } } });
  assert.deepEqual(await service.read(), { sections: [], categories: [{ id, slug: 'apartments', name: localized, propertyCount: 7, order: 0 }], metrics: [{ key: 'population', title: localized, value: 342800, order: 0 }], properties: [], developers: [], content: [], banners: [] });
});

test('uses the sourced CMS statement over older counters and does not leak its administrative data', () => {
  const population = { status: 'available', value: 44000, sourceLabel: { ar: 'جهاز المدينة' }, sourceUrl: 'https://example.test/report', asOf: '2026-10-07T00:00:00.000Z' };
  const result = publicHomepageProjection(sources({ population }), { populationCount: 999999 });
  assert.equal(result.metrics.find(metric => metric.key === 'population')?.value, 44000);
  assert.equal('population' in result, false);
  assert.equal(JSON.stringify(result).includes('sourceLabel'), false);
  assert.equal(publicHomepageProjection(sources({ population }), { showPopulationCounter: false }).metrics.length, 0);
  for (const hidden of [{ status: 'unavailable' }, { status: 'draft' }, { ...population, sourceUrl: undefined }, { ...population, asOf: undefined }]) {
    assert.equal(publicHomepageProjection(sources({ population: hidden }), { populationCount: 999999 }).metrics.length, 0);
  }
});

test('reads the latest population statement from the collection used by CMS administration', async () => {
  const connection = {
    collection(name: string) {
      return {
        async findOne() { return null; },
        find(filter: unknown, options: unknown) {
          if (name === 'cms_population_values') {
            assert.deepEqual(filter, {});
            assert.deepEqual(options, { projection: { _id: 0, status: 1, value: 1, sourceLabel: 1, sourceUrl: 1, asOf: 1 } });
          }
          return { sort(sort: unknown) {
            if (name === 'cms_population_values') assert.deepEqual(sort, { updatedAt: -1, _id: 1 });
            return { limit(limit: number) {
              if (name === 'cms_population_values') assert.equal(limit, 1);
              return { async toArray() { return name === 'cms_population_values' ? [{ status: 'available', value: 44000, sourceLabel: { en: 'City authority' }, sourceUrl: 'https://example.test/report', asOf: new Date('2026-10-07T00:00:00.000Z') }] : []; } };
            } };
          } };
        },
        async countDocuments() { return 0; }
      };
    }
  } as unknown as Connection;
  const service = createPublicHomepageService({ repository: createMongoosePublicHomepageRepository(connection) });
  assert.equal((await service.read()).metrics[0]?.value, 44000);
});

test('reads the published listing total independently of the homepage preview limit and CMS city metrics', async () => {
  let countFilter: Record<string, unknown> | undefined;
  const connection = {
    collection(name: string) {
      return {
        async findOne(filter: Record<string, unknown>) {
          assert.equal(name, 'ad_settings');
          assert.deepEqual(filter, { enabled: true, allowedSurfaces: 'homepage' });
          return null;
        },
        find() { return { sort() { return { limit() { return { async toArray() { return name === 'cms_homepage_metrics' ? [{ key: 'housing_units', title: localized, value: 1200, order: 1, status: 'published', visible: true }] : []; } }; } }; } }; },
        async countDocuments(filter: Record<string, unknown>) { assert.equal(name, 'properties'); countFilter = filter; return 243; }
      };
    }
  } as unknown as Connection;
  const result = publicHomepageProjection(await createMongoosePublicHomepageRepository(connection).read());
  assert.equal(result.totalPropertyCount, 243);
  assert.equal(result.properties.length, 0);
  assert.equal(result.metrics[0]?.value, 1200);
  assert.equal(countFilter?.status, 'published');
  assert.equal(countFilter?.active, true);
  assert.ok(countFilter?.expiresAt, 'Expired listings must be excluded from the total');
});

test('includes enabled managed banners ahead of legacy CMS banners using only public fields', async () => {
  const connection = {
    collection(name: string) {
      return {
        async findOne() { assert.equal(name, 'ad_settings'); return { maxActiveBanners: 5 }; },
        aggregate(pipeline: Array<Record<string, unknown>>) {
          assert.equal(name, 'ad_banners');
          assert.ok(pipeline.some(stage => stage.$limit === 5));
          return { async toArray() { return [{ _id: id, title: localized, targetUrl: '/properties', media: { url: `/api/v1/public/banner-media/${secondId}` }, internalNotes: 'private' }]; } };
        },
        find() { return { sort() { return { limit() { return { async toArray() { return name === 'cms_banners' ? [{ key: 'legacy', title: localized, imageUrl: 'https://cdn.example/legacy.webp', order: 0, status: 'published', active: true }] : []; } }; } }; } }; },
        async countDocuments() { return 0; }
      };
    }
  } as unknown as Connection;
  const result = publicHomepageProjection(await createMongoosePublicHomepageRepository(connection).read());
  assert.deepEqual(result.banners.map(banner => banner.key), [`banner_${id}`, 'legacy']);
  assert.equal(result.banners[0]?.targetUrl, '/properties');
  assert.equal(result.banners[0]?.imageUrl, `/api/v1/public/banner-media/${secondId}`);
  assert.equal('internalNotes' in result.banners[0]!, false);
});
