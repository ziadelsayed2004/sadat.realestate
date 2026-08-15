import assert from 'node:assert/strict';
import test from 'node:test';
import type { AccessTokenClaims } from '../../src/modules/auth/crypto.js';
import { AdSettingsServiceError, createAdSettingsService } from '../../src/modules/ads/service.js';

const admin = { iss: 'sadat-realestate-api', aud: 'sadat-realestate', sub: '3123456789abcdef01234567', sid: '1123456789abcdef01234567', role: 'admin', status: 'verified', iat: 1, exp: 9999999999, jti: 'test' } as AccessTokenClaims;
const seeker = { ...admin, role: 'seeker' } as AccessTokenClaims;
test('ad placements use stable keys, bounded settings, admin authorization, and no public price', async () => {
  const service = createAdSettingsService();
  const placement = await service.createPlacement(admin, { key: 'homepage.hero', surface: 'homepage', label: { ar: 'رئيسي', en: 'Hero' }, width: 1200, height: 400, active: true, sortOrder: 1, allowedLocales: ['ar', 'en', 'zh-CN'], targetUrlRequired: true });
  assert.equal(placement.key, 'homepage.hero'); assert.equal('price' in placement, false);
  await assert.rejects(() => service.createPlacement(admin, { key: 'homepage.hero', surface: 'homepage', label: { en: 'Duplicate' }, width: 1, height: 1, active: true, sortOrder: 2, allowedLocales: ['en'], targetUrlRequired: false }), (error) => error instanceof AdSettingsServiceError && error.code === 'DUPLICATE');
  await assert.rejects(() => service.createPlacement(seeker, { key: 'x', surface: 'homepage', label: { en: 'X' }, width: 1, height: 1, active: true, sortOrder: 1, allowedLocales: ['en'], targetUrlRequired: false }), (error) => error instanceof AdSettingsServiceError && error.code === 'FORBIDDEN');
  const settings = await service.getSettings(admin); const changed = await service.updateSettings(admin, { expectedVersion: settings.version, reason: 'Enable reviewed placements', patch: { enabled: true } }); assert.equal(changed.enabled, true);
  await assert.rejects(() => service.updateSettings(admin, { expectedVersion: settings.version, reason: 'stale', patch: { enabled: false } }), (error) => error instanceof AdSettingsServiceError && error.code === 'VERSION_CONFLICT');
});

test('advertising requests are provider-owned and use explicit draft-to-review workflow', async () => {
  const service = createAdSettingsService(); const provider = { ...admin, role: 'provider', sub: '2123456789abcdef01234567' } as AccessTokenClaims;
  await service.createPlacement(admin, { key: 'search.inline', surface: 'search', label: { en: 'Search' }, width: 600, height: 300, active: true, sortOrder: 1, allowedLocales: ['en'], targetUrlRequired: true });
  const request = await service.createRequest(provider, { placementKey: 'search.inline', purpose: 'Promote a project', intervalStart: '2026-09-01T09:00:00+00:00', intervalEnd: '2026-09-02T09:00:00+00:00' });
  assert.equal(request.status, 'draft'); assert.equal(request.providerId, provider.sub); assert.equal('price' in request, false);
  const reviewed = await service.transitionRequest(provider, request.id, { status: 'review', expectedVersion: 0 }); assert.equal(reviewed.status, 'review');
  await assert.rejects(() => service.transitionRequest({ ...provider, sub: '3123456789abcdef01234567' } as AccessTokenClaims, request.id, { status: 'cancelled', expectedVersion: 1, reason: 'IDOR' }), (error) => error instanceof AdSettingsServiceError && error.code === 'FORBIDDEN');
});

test('administrative quotes compute integer minor-unit totals and accept idempotently', async () => {
  const service = createAdSettingsService(); const provider = { ...admin, role: 'provider', sub: '2123456789abcdef01234567' } as AccessTokenClaims;
  await service.createPlacement(admin, { key: 'project.hero', surface: 'homepage', label: { en: 'Project' }, width: 900, height: 300, active: true, sortOrder: 1, allowedLocales: ['en'], targetUrlRequired: true });
  const request = await service.createRequest(provider, { placementKey: 'project.hero', purpose: 'Promote project', intervalStart: '2026-09-01T09:00:00+00:00', intervalEnd: '2026-09-02T09:00:00+00:00' }); await service.transitionRequest(provider, request.id, { status: 'review', expectedVersion: 0 }); await service.transitionRequest(admin, request.id, { status: 'waiting_pricing', expectedVersion: 1 });
  const quoteInput = { requestId: request.id, currency: 'EGP', lineItems: [{ description: 'One day', quantity: 2, unitAmountMinor: 1250 }], validUntil: '2026-10-01T00:00:00+00:00', terms: 'Manual quote; payment proof is reviewed separately.' };
  await assert.rejects(() => service.issueQuote(provider, quoteInput), (error) => error instanceof AdSettingsServiceError && error.code === 'FORBIDDEN');
  await assert.rejects(() => service.issueQuote(admin, { ...quoteInput, unknown: true }));
  const quote = await service.issueQuote(admin, quoteInput);
  assert.equal(quote.totalMinor, 2500); assert.equal(quote.status, 'issued'); assert.equal(quote.decisionHistory.length, 1); assert.equal(quote.decisionHistory[0]?.action, 'issued'); assert.equal('bankVerified' in quote, false);
  const afterIssue = (await service.listRequests(admin)).find(item => item.id === request.id); assert.equal(afterIssue?.status, 'quote_sent');
  await assert.rejects(() => service.decideQuote(admin, quote.id, { action: 'reject', expectedVersion: 0 }));
  const accepted = await service.decideQuote(provider, quote.id, { action: 'accept', expectedVersion: 0 }); assert.equal(accepted.status, 'accepted'); assert.equal(accepted.decisionHistory.at(-1)?.action, 'accepted');
  const afterAccept = (await service.listRequests(admin)).find(item => item.id === request.id); assert.equal(afterAccept?.status, 'waiting_payment');
  await assert.rejects(() => service.decideQuote(seeker, quote.id, { action: 'accept', expectedVersion: 0 }), (error) => error instanceof AdSettingsServiceError && error.code === 'FORBIDDEN');
  const replay = await service.decideQuote(provider, quote.id, { action: 'accept', expectedVersion: 0 }); assert.equal(replay.version, accepted.version); assert.equal(replay.decisionHistory.length, accepted.decisionHistory.length);
  await assert.rejects(() => service.decideQuote(admin, quote.id, { action: 'reject', expectedVersion: accepted.version, reason: 'Too late' }), (error) => error instanceof AdSettingsServiceError && error.code === 'VERSION_CONFLICT');
});

test('ad scheduling uses Africa/Cairo projections, lifecycle guards, and placement conflict checks', async () => {
  let current = new Date('2026-09-01T05:00:00.000Z');
  const service = createAdSettingsService({ now: () => current });
  const provider = { ...admin, role: 'provider', sub: '2123456789abcdef01234567' } as AccessTokenClaims;
  await service.createPlacement(admin, { key: 'calendar.hero', surface: 'homepage', label: { en: 'Calendar' }, width: 900, height: 300, active: true, sortOrder: 1, allowedLocales: ['en'], targetUrlRequired: true });
  const createPaidRequest = async (purpose: string) => {
    const request = await service.createRequest(provider, { placementKey: 'calendar.hero', purpose, intervalStart: '2026-09-01T09:00:00+03:00', intervalEnd: '2026-09-01T10:00:00+03:00' });
    await service.transitionRequest(provider, request.id, { status: 'review', expectedVersion: 0 });
    await service.transitionRequest(admin, request.id, { status: 'waiting_pricing', expectedVersion: 1 });
    const quote = await service.issueQuote(admin, { requestId: request.id, currency: 'EGP', lineItems: [{ description: 'Placement hour', quantity: 1, unitAmountMinor: 100 }], validUntil: '2026-09-03T00:00:00+03:00', terms: 'Manual review before activation.' });
    await service.decideQuote(provider, quote.id, { action: 'accept', expectedVersion: 0 });
    return (await service.listRequests(provider)).find(item => item.id === request.id)!;
  };
  const first = await createPaidRequest('First calendar request');
  const scheduled = await service.transitionRequest(admin, first.id, { status: 'scheduled', expectedVersion: 4 });
  assert.equal(scheduled.status, 'scheduled');
  await assert.rejects(() => service.transitionRequest(provider, first.id, { status: 'active', expectedVersion: 5 }), (error) => error instanceof AdSettingsServiceError && error.code === 'FORBIDDEN');
  await assert.rejects(() => service.transitionRequest(admin, first.id, { status: 'active', expectedVersion: 5 }), (error) => error instanceof AdSettingsServiceError && error.code === 'VERSION_CONFLICT');
  const calendar = await service.listCalendar(admin, { page: 1, limit: 10 });
  assert.equal(calendar.items[0]?.timezone, 'Africa/Cairo');
  assert.equal(calendar.items[0]?.localStart, '2026-09-01T09:00:00');
  assert.equal(calendar.items[0]?.localEnd, '2026-09-01T10:00:00');

  const second = await createPaidRequest('Overlapping calendar request');
  await assert.rejects(() => service.transitionRequest(admin, second.id, { status: 'scheduled', expectedVersion: 4 }), (error) => error instanceof AdSettingsServiceError && error.code === 'PLACEMENT_CONFLICT');

  current = new Date('2026-09-01T06:00:00.000Z');
  const active = await service.transitionRequest(admin, first.id, { status: 'active', expectedVersion: 5 });
  assert.equal(active.status, 'active');
  current = new Date('2026-09-01T07:01:00.000Z');
  const ended = await service.transitionRequest(admin, first.id, { status: 'ended', expectedVersion: 6 });
  assert.equal(ended.status, 'ended');
  const endedCalendar = await service.listCalendar(admin, { status: 'ended', page: 1, limit: 10 });
  assert.equal(endedCalendar.items[0]?.status, 'ended');
});

test('banners enforce admin media ownership, lifecycle publication, localization fallback, and deterministic ordering', async () => {
  let current = new Date('2026-09-01T08:00:00.000Z');
  const service = createAdSettingsService({ now: () => current });
  const placement = await service.createPlacement(admin, { key: 'homepage.banner', surface: 'homepage', label: { en: 'Banner' }, width: 1200, height: 400, active: true, sortOrder: 1, allowedLocales: ['ar', 'en'], targetUrlRequired: true });
  await assert.rejects(() => service.createBanner(seeker, { placementKey: placement.key, title: { en: 'Draft' }, startAt: '2026-09-01T09:00:00+00:00', endAt: '2026-09-01T12:00:00+00:00' }), (error) => error instanceof Error && error.message === 'FORBIDDEN');
  const banner = await service.createBanner(admin, { placementKey: placement.key, title: { en: 'Launch' }, altText: { en: 'Launch banner' }, targetUrl: 'https://example.com/launch', startAt: '2026-09-01T09:00:00+00:00', endAt: '2026-09-01T12:00:00+00:00', sortOrder: 1 });
  const media = await service.createBannerMedia(admin, banner.id, { url: 'https://cdn.example.com/launch.webp', mime: 'image/webp', width: 1200, height: 400 });
  assert.equal((await service.previewBanner(admin, banner.id)).preview, true);
  await assert.rejects(() => service.updateBanner(admin, banner.id, { expectedVersion: 0, reason: 'attach media', mediaId: media.id, unknown: true }), /Unrecognized key/);
  const attached = await service.updateBanner(admin, banner.id, { expectedVersion: 0, reason: 'Attach approved media', mediaId: media.id });
  const scheduled = await service.updateBanner(admin, banner.id, { expectedVersion: attached.version, reason: 'Schedule campaign', status: 'scheduled' });
  await service.updateSettings(admin, { expectedVersion: 0, reason: 'Enable advertising', patch: { enabled: true } });
  await assert.rejects(() => service.updateBanner(admin, banner.id, { expectedVersion: scheduled.version, reason: 'Activate too early', status: 'active' }), /BANNER_INVALID_STATE/);
  current = new Date('2026-09-01T10:00:00.000Z');
  const active = await service.updateBanner(admin, banner.id, { expectedVersion: scheduled.version, reason: 'Activate in window', status: 'active' });
  const publicItems = await service.listPublicBanners('homepage', 'ar', current);
  assert.equal(publicItems.length, 1);
  assert.equal(publicItems[0]?.resolvedTitle, 'Launch');
  assert.equal(publicItems[0]?.imageUrl, media.url);
  assert.equal('mediaId' in publicItems[0]!, false);
  await assert.rejects(() => service.deleteBannerMedia(admin, media.id, { expectedVersion: media.version, reason: 'Cannot remove active media' }), /MEDIA_IN_USE/);
  const second = await service.createBanner(admin, { placementKey: placement.key, title: { ar: 'ثانٍ' }, startAt: '2026-09-01T13:00:00+00:00', endAt: '2026-09-01T14:00:00+00:00', sortOrder: 5 });
  const reordered = await service.reorderBanners(admin, { placementKey: placement.key, reason: 'Stable ordering', items: [{ bannerId: second.id, sortOrder: 1 }, { bannerId: active.id, sortOrder: 2 }] });
  assert.deepEqual(reordered.map(item => item.id), [second.id, active.id]);
  await assert.rejects(() => service.updateBannerMedia(seeker, media.id, { expectedVersion: media.version, reason: 'IDOR', width: 900 }), /FORBIDDEN/);
});
