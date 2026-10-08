import assert from 'node:assert/strict';
import test from 'node:test';
import type { AccessTokenClaims } from '../../src/modules/auth/crypto.js';
import { createAdSettingsService } from '../../src/modules/ads/service.js';

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
