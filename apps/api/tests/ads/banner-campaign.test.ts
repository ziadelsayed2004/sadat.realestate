import assert from 'node:assert/strict';
import test from 'node:test';
import { validateBannerCampaign } from '../../src/modules/ads/banner-campaign.js';

const request = { id: 'a'.repeat(24), status: 'scheduled' as const, placementKey: 'homepage.hero', intervalStart: '2026-10-08T12:00:00Z', intervalEnd: '2026-10-09T12:00:00Z' };
const banner = { adRequestId: request.id, status: 'active' as const, placementKey: request.placementKey, startAt: request.intervalStart, endAt: request.intervalEnd, targetUrl: 'https://elsadatrealestate.com/properties/test' };

test('linked advertisements require their exact existing request, placement and window', () => {
  assert.doesNotThrow(() => validateBannerCampaign(banner, request));
  assert.throws(() => validateBannerCampaign(banner), /NOT_FOUND/);
  for (const patch of [{ id: 'b'.repeat(24) }, { placementKey: 'other.hero' }, { intervalStart: '2026-10-08T13:00:00Z' }, { intervalEnd: '2026-10-10T12:00:00Z' }]) {
    assert.throws(() => validateBannerCampaign(banner, { ...request, ...patch }));
  }
});
test('a linked ad needs scheduling and its destination before publication', () => {
  assert.doesNotThrow(() => validateBannerCampaign({ ...banner, status: 'draft', targetUrl: undefined }, { ...request, status: 'waiting_payment' }));
  assert.throws(() => validateBannerCampaign(banner, { ...request, status: 'waiting_payment' }), /BANNER_INVALID_STATE/);
  assert.throws(() => validateBannerCampaign({ ...banner, targetUrl: undefined }, request), /BANNER_TARGET_REQUIRED/);
});
test('standalone administrator banners preserve their existing workflow', () => {
  assert.doesNotThrow(() => validateBannerCampaign({ ...banner, adRequestId: undefined }));
});
