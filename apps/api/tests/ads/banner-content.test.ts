import assert from 'node:assert/strict';
import test from 'node:test';
import type { AccessTokenClaims } from '../../src/modules/auth/crypto.js';
import { createAdSettingsService } from '../../src/modules/ads/service.js';
import { adBannerMediaSchema, adSettingsSchema } from '@sadat-real-estate/contracts';
import type { AdBannerRepository } from '../../src/modules/ads/service.js';

test('keeps independent slide copy and links, falls back to banner copy and prunes removed image overrides', async () => {
  const admin = { sub: 'aaaaaaaaaaaaaaaaaaaaaaaa', role: 'admin', status: 'verified' } as AccessTokenClaims;
  const now = new Date('2026-10-10T12:00:00Z');
  const service = createAdSettingsService({ now: () => now, settings: adSettingsSchema.parse({ enabled: true, allowedSurfaces: ['homepage'], maxActiveBanners: 100, defaultDisplaySeconds: 8, version: 0, updatedBy: admin.sub, updatedAt: now.toISOString() }) });
  await service.createPlacement(admin, { key: 'homepage.hero', surface: 'homepage', label: { en: 'Home' }, width: 1200, height: 400, active: true, sortOrder: 0, allowedLocales: ['ar', 'en'], targetUrlRequired: false });
  const banner = await service.createBanner(admin, { placementKey: 'homepage.hero', title: { en: 'Platform' }, body: { en: 'Default description' }, targetUrl: 'https://example.com/', startAt: '2026-10-10T00:00:00Z', endAt: '2026-10-11T00:00:00Z' });
  const images = await Promise.all([1, 2].map(index => service.createBannerMedia(admin, banner.id, { url: `https://example.com/${index}.png`, mime: 'image/png', width: 1200, height: 400 })));
  let saved = await service.updateBanner(admin, banner.id, { expectedVersion: banner.version, mediaIds: images.map(image => image.id), slides: [{ mediaId: images[0]!.id, title: { en: 'Company one' }, body: { en: 'First image description' }, targetUrl: 'https://example.com/one' }], status: 'active', reason: 'Publish independent slides' });
  let published = await service.listPublicBanners('homepage', 'en');
  assert.deepEqual(published.map(row => row.resolvedTitle), ['Company one', 'Platform']);
  assert.deepEqual(published.map(row => row.targetUrl), ['https://example.com/one', 'https://example.com/']);
  await assert.rejects(service.updateBanner(admin, banner.id, { expectedVersion: saved.version, slides: [{ mediaId: 'bbbbbbbbbbbbbbbbbbbbbbbb', title: { en: 'Unselected media' } }], reason: 'Reject unselected image' }));
  await assert.rejects(service.updateBanner(admin, banner.id, { expectedVersion: saved.version, slides: [{ mediaId: images[0]!.id, targetUrl: 'javascript:alert(1)' }], reason: 'Reject unsafe URL' }));
  saved = await service.updateBanner(admin, banner.id, { expectedVersion: saved.version, mediaIds: [images[1]!.id], reason: 'Remove first image' });
  assert.deepEqual(saved.slides, []);
  published = await service.listPublicBanners('homepage', 'en');
  assert.deepEqual(published.map(row => row.resolvedTitle), ['Platform']);
});

test('featured lists report actual public visibility only after administrative authorization', async () => {
  const admin = { sub: 'aaaaaaaaaaaaaaaaaaaaaaaa', role: 'admin', status: 'verified' } as AccessTokenClaims;
  const memory = createAdSettingsService();
  await memory.createPlacement(admin, { key: 'homepage.hero', surface: 'homepage', label: { en: 'Home' }, width: 1200, height: 400, active: true, sortOrder: 0, allowedLocales: ['ar', 'en'], targetUrlRequired: false });
  const draft = await memory.createBanner(admin, { placementKey: 'homepage.hero', title: { en: 'Ad' }, startAt: '2026-10-10T00:00:00Z', endAt: '2026-10-11T00:00:00Z' });
  const visible = { ...draft, placementKey: 'homepage.featured', status: 'active' as const };
  const hidden = { ...visible, id: 'bbbbbbbbbbbbbbbbbbbbbbbb' };
  let allowed = true, visibilityReads = 0;
  const service = createAdSettingsService({
    bannerAuthorization: { async authorize() { return allowed; } },
    bannerRepository: { async listBanners(query) { return { items: [visible, hidden], page: query.page, limit: query.limit, total: 2 }; } } as AdBannerRepository,
    async publishedBannerIds() { visibilityReads++; return new Set([visible.id]); }
  });
  const result = await service.listBanners(admin, { placementKey: 'homepage.featured', page: 1, limit: 100 });
  assert.equal(result.items[0]?.publiclyVisible, true);
  assert.equal(result.items[1]?.publiclyVisible, false);
  assert.equal(visibilityReads, 1);
  allowed = false;
  await assert.rejects(service.listBanners(admin, { page: 1, limit: 100 }), /FORBIDDEN/);
  assert.equal(visibilityReads, 1);
});

test('preserves legacy same-origin card images through saved preview and rejects escaped URLs', async () => {
  const admin = { sub: 'aaaaaaaaaaaaaaaaaaaaaaaa', role: 'admin', status: 'verified' } as AccessTokenClaims;
  const service = createAdSettingsService();
  await service.createPlacement(admin, { key: 'homepage.hero', surface: 'homepage', label: { en: 'Home' }, width: 1200, height: 400, active: true, sortOrder: 0, allowedLocales: ['ar', 'en'], targetUrlRequired: false });
  const draft = await service.createBanner(admin, { placementKey: 'homepage.hero', title: { en: 'Legacy image' }, startAt: '2026-10-10T00:00:00Z', endAt: '2026-10-11T00:00:00Z' });
  const media = await service.createBannerMedia(admin, draft.id, { url: '/assets/canonical/public/banner.png', mime: 'image/png', width: 1200, height: 800 });
  await service.updateBanner(admin, draft.id, { expectedVersion: draft.version, reason: 'Select legacy image', mediaId: media.id });
  assert.equal((await service.previewBanner(admin, draft.id)).media?.url, media.url);
  for (const url of ['//outside.invalid/image.png', '/\\outside.invalid/image.png', '/%2foutside.invalid/image.png', '/assets/../private.png', '/assets/%2e%2e/private.png', 'javascript:alert(1)', 'http://outside.invalid/image.png']) {
    assert.equal(adBannerMediaSchema.safeParse({ ...media, url }).success, false, url);
  }
});

test('banner content is saved, edited, returned and cleared through the service contracts', async () => {
  const admin = { sub: 'aaaaaaaaaaaaaaaaaaaaaaaa', role: 'admin', status: 'verified' } as AccessTokenClaims;
  const service = createAdSettingsService();
  await service.createPlacement(admin, { key: 'homepage.hero', surface: 'homepage', label: { en: 'Home' }, width: 1200, height: 400, active: true, sortOrder: 0, allowedLocales: ['ar', 'en'], targetUrlRequired: false });
  const body = { ar: 'المحتوى الذي كتبته بنفسي', en: 'Content I wrote myself' };
  const draft = await service.createBanner(admin, { placementKey: 'homepage.hero', title: { en: 'Banner title' }, body, startAt: '2026-10-10T00:00:00Z', endAt: '2026-10-11T00:00:00Z' });
  assert.deepEqual(draft.body, body);
  const edited = await service.updateBanner(admin, draft.id, { expectedVersion: draft.version, reason: 'Edit content', body: { en: 'Edited content' } });
  assert.deepEqual((await service.listBanners(admin, { page: 1, limit: 20 })).items[0]?.body, edited.body);
  const cleared = await service.updateBanner(admin, draft.id, { expectedVersion: edited.version, reason: 'Clear content', body: null });
  assert.equal(cleared.body, undefined);
});
