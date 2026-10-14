import assert from 'node:assert/strict';
import test from 'node:test';
import type { AccessTokenClaims } from '../../src/modules/auth/crypto.js';
import { createAdSettingsService } from '../../src/modules/ads/service.js';
import { adBannerMediaSchema } from '@sadat-real-estate/contracts';
import type { AdBannerRepository } from '../../src/modules/ads/service.js';

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
