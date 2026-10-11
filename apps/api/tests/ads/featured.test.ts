import assert from 'node:assert/strict';
import test from 'node:test';
import { Types } from 'mongoose';
import { adBannerCreateSchema } from '@sadat-real-estate/contracts';
import { featuredOptions, resolveFeatured } from '../../src/modules/ads/featured.js';
import { importLegacyFeatured } from '../../src/modules/ads/featured-migration.js';
import { createAdSettingsService } from '../../src/modules/ads/service.js';
import { createBannerManagement } from '../../src/modules/ads/banner-management.js';
import type { AccessTokenClaims } from '../../src/modules/auth/crypto.js';
import type { AuditWriter } from '../../src/modules/audit/writer.js';
import { database, account, application, profile, policyId } from '../helpers/provider-identity-db.js';
const organization = new Types.ObjectId('7'.repeat(24)), owned = new Types.ObjectId('8'.repeat(24)), foreign = new Types.ObjectId('9'.repeat(24));
function fixture() {
  const db = database('developer_company');
  db.rows.commission_confirmations!.push({ accountId: account.toHexString(), source: 'policy', sourceRecordId: policyId.toHexString(), policyVersion: 1, status: 'acknowledged' });
  db.rows.organizations = [{ _id: organization, providerId: profile, name: { ar: 'شركة حقيقية', en: 'Actual company' }, slug: 'actual-company', imageUrl: '/actual.png', status: 'approved' }];
  db.rows.properties = [
    { _id: owned, providerId: account, organizationId: organization, status: 'published', active: true, name: { en: 'Owned property' }, slug: 'owned-property' },
    { _id: foreign, providerId: foreign, organizationId: foreign, status: 'published', active: true, name: { en: 'Other company property' }, slug: 'foreign-property' },
    { _id: new Types.ObjectId(), providerId: account, status: 'draft', active: true, name: { en: 'Draft' }, slug: 'draft' },
    { _id: new Types.ObjectId(), providerId: account, status: 'published', active: true, expiresAt: new Date('2020-01-01T00:00:00Z'), name: { en: 'Expired' }, slug: 'expired' }
  ];
  db.rows.projects = [{ _id: new Types.ObjectId('a'.repeat(24)), organizationId: organization, status: 'published', name: { en: 'Owned project' }, slug: 'owned-project' }];
  return db;
}
test('featured destination options only expose an eligible real advertiser and its own published internal pages', async () => {
  const db = fixture(); const value = await featuredOptions(db.connection, application.toHexString());
  assert.equal(value.advertisers[0]?.name.en, 'Actual company');
  assert.equal(value.advertisers[0]?.id, account.toHexString());
  assert.deepEqual(value.advertisers[0]?.aliases, [account, profile, application].map(value => value.toHexString()));
  assert.deepEqual((await featuredOptions(db.connection, account.toHexString())).destinations, value.destinations);
  assert.deepEqual(value.destinations.map(item => item.kind), ['organization', 'property', 'project']);
  assert.equal(value.destinations.find(item => item.kind === 'project')?.href, '/developers/actual-company/projects/owned-project');
  assert.equal((await resolveFeatured(db.connection, { advertiserProviderId: application.toHexString(), destination: { kind: 'project', id: 'a'.repeat(24) } })).targetPath, '/developers/actual-company/projects/owned-project');
  assert.equal(value.destinations.some(item => item.id === foreign.toHexString()), false);
  assert.ok(value.destinations.every(item => item.href.startsWith('/') && !item.href.startsWith('//')));
  const creative = { advertiserProviderId: application.toHexString(), destination: { kind: 'property' as const, id: owned.toHexString() } };
  assert.equal((await resolveFeatured(db.connection, creative)).targetPath, '/properties/owned-property');
  await assert.rejects(resolveFeatured(db.connection, { ...creative, destination: { kind: 'property', id: foreign.toHexString() } }), { code: 'FEATURED_DESTINATION_UNAVAILABLE' });
  db.rows.properties![0]!.status = 'draft'; await assert.rejects(resolveFeatured(db.connection, creative), { code: 'FEATURED_DESTINATION_UNAVAILABLE' });
});
test('a hidden or unapproved advertiser cannot publish; external links cannot be a featured destination', async () => {
  const db = fixture(); db.rows.commission_confirmations![0]!.status = 'revoked';
  await assert.rejects(resolveFeatured(db.connection, { advertiserProviderId: application.toHexString(), destination: { kind: 'organization', id: organization.toHexString() } }), { code: 'FEATURED_ADVERTISER_UNAVAILABLE' });
  assert.deepEqual((await featuredOptions(db.connection)).advertisers, []);
  assert.equal(adBannerCreateSchema.safeParse({ placementKey: 'homepage.featured', title: { en: 'Ad' }, startAt: '2026-10-10T00:00:00Z', endAt: '2026-10-11T00:00:00Z', featured: { advertiserProviderId: application.toHexString(), destination: { kind: 'external', id: 'https://outside.invalid' } } }).success, false);
});
test('an eligible office can advertise its published property without a separate organization page', async () => {
  const db = fixture();
  db.rows.organizations = [];
  db.rows.provider_applications![0]!.providerType = 'brokerage_office';
  db.rows.provider_applications![0]!.tradeName = 'Actual office';
  db.rows.provider_applications![0]!.accountOwnerFullName = 'Private owner';
  db.rows.provider_profiles![0]!.providerType = 'brokerage_office';
  db.rows.provider_identity_subscriptions!.push({ _id: account, status: 'active', paymentConfirmed: true, startAt: new Date('2020-01-01'), endAt: new Date('2099-01-01') });
  const value = await featuredOptions(db.connection, account.toHexString());
  assert.deepEqual(value.advertisers[0]?.name, { ar: 'Actual office', en: 'Actual office' });
  assert.deepEqual(value.destinations.map(item => item.kind), ['property']);
  assert.equal((await resolveFeatured(db.connection, { advertiserProviderId: account.toHexString(), destination: { kind: 'property', id: owned.toHexString() } })).targetPath, '/properties/owned-property');
  db.rows.provider_identity_subscriptions![0]!.paymentConfirmed = false;
  assert.deepEqual((await featuredOptions(db.connection)).advertisers, []);
  await assert.rejects(resolveFeatured(db.connection, { advertiserProviderId: account.toHexString(), destination: { kind: 'property', id: owned.toHexString() } }), { code: 'FEATURED_ADVERTISER_UNAVAILABLE' });
});
test('advertiser options deduplicate account aliases and never substitute the private owner for a business name', async () => {
  const db = fixture();
  db.rows.provider_applications!.push({ ...db.rows.provider_applications![0], _id: new Types.ObjectId('b'.repeat(24)) });
  assert.equal((await featuredOptions(db.connection)).advertisers.length, 1);
  db.rows.organizations = [];
  db.rows.provider_applications![0]!.accountOwnerFullName = 'Private owner';
  assert.deepEqual((await featuredOptions(db.connection)).advertisers, []);
});
test('legacy import is idempotent, preserves creative fields as drafts and never invents a company association', async () => {
  const db = fixture(); db.rows.cms_banners = [{ _id: new Types.ObjectId(), key: 'old_card', title: { en: 'Old card' }, body: { en: 'Saved description' }, highlight: { en: 'Saved highlight' }, imageUrl: '/old-image.png', order: 1, status: 'published', active: true }];
  const events: unknown[] = []; const audit = { record: async (event: unknown) => { events.push(event); } } as unknown as AuditWriter;
  assert.equal(await importLegacyFeatured(db.connection, audit, account.toHexString(), { requestId: 'test', traceId: '0'.repeat(32) }), 1);
  assert.equal(await importLegacyFeatured(db.connection, audit, account.toHexString(), { requestId: 'test', traceId: '0'.repeat(32) }), 0);
  assert.equal(db.rows.ad_banners?.length, 1); const row = db.rows.ad_banners![0]!;
  assert.equal(row.status, 'draft'); assert.deepEqual(row.featured, { highlight: { en: 'Saved highlight' } });
  assert.equal((row.featured as Record<string, unknown>).advertiserProviderId, undefined);
  assert.equal(db.rows.cms_banners[0]?.active, false); assert.equal(events.length, 1);
  assert.equal(db.rows.ad_banner_media?.[0]?.url, '/old-image.png');
});
test('explicit featured setup activates its disabled placement without publishing drafts or changing the hero, and enforces permission and version', async () => {
  const db = fixture(), claims = { sub: account.toHexString(), role: 'admin', status: 'verified' } as AccessTokenClaims;
  db.rows.ad_settings = [{ _id: account, enabled: false, allowedSurfaces: ['homepage'], version: 0 }];
  db.rows.ad_placements = [{ key: 'homepage.hero', surface: 'homepage', active: false, version: 3 }, { key: 'homepage.featured', surface: 'homepage', active: false, version: 2 }];
  db.rows.ad_banners = [{ _id: owned, placementKey: 'homepage.featured', status: 'draft' }];
  let allowed = true;
  const events: Array<Record<string, unknown>> = [];
  const management = createBannerManagement({ connection: db.connection, authorization: { authorize: async () => allowed }, audit: { record: async (event: Record<string, unknown>) => { events.push(event); } } as unknown as AuditWriter, storage: {} as never, scanner: {} as never, policy: {} as never });
  const context = { requestId: 'setup-test', traceId: '0'.repeat(32) };
  const globalOnly = await management.updateConfig(claims, { enabled: true, expectedVersion: 0, reason: 'Enable global display' }, context);
  assert.equal(globalOnly.placements.find(value => value.key === 'homepage.featured')?.active, false);
  allowed = false;
  await assert.rejects(management.updateConfig(claims, { enabled: true, featuredActive: true, expectedVersion: 1, reason: 'Enable cards' }, context), { statusCode: 403 });
  allowed = true;
  const value = await management.updateConfig(claims, { enabled: true, featuredActive: true, expectedVersion: 1, reason: 'Enable cards' }, context);
  assert.equal(value.enabled, true);
  assert.equal(value.placements.find(value => value.key === 'homepage.featured')?.active, true);
  assert.equal(value.placements.find(value => value.key === 'homepage.hero')?.active, false);
  assert.equal(db.rows.ad_banners[0]?.status, 'draft');
  assert.deepEqual(events.at(-1)?.before, { enabled: true, version: 1, featuredActive: false });
  assert.deepEqual(events.at(-1)?.after, { enabled: true, version: 2, featuredActive: true });
  await assert.rejects(management.updateConfig(claims, { enabled: true, featuredActive: false, expectedVersion: 1, reason: 'Stale setup' }, context), { statusCode: 409 });
  assert.equal(db.rows.ad_placements[1]?.active, true);
});
test('several featured cards can overlap, preserve content, stop and restart without replacing the hero placement', async () => {
  const now = new Date('2026-10-10T10:00:00Z'), admin = { sub: account.toHexString(), role: 'admin', status: 'verified' } as AccessTokenClaims;
  const service = createAdSettingsService({ now: () => now });
  for (const key of ['homepage.hero', 'homepage.featured']) await service.createPlacement(admin, { key, surface: 'homepage', label: { en: key }, width: 1200, height: 800, active: true, sortOrder: key.endsWith('hero') ? 0 : 1, allowedLocales: ['ar', 'en'], targetUrlRequired: true });
  await service.updateSettings(admin, { expectedVersion: 0, patch: { enabled: true, allowedSurfaces: ['homepage'] }, reason: 'Enable ads' });
  const values = [];
  for (const key of ['homepage.hero', 'homepage.featured', 'homepage.featured']) {
    let banner = await service.createBanner(admin, { placementKey: key, title: { en: 'Card title' }, body: { en: 'Description' }, ...(key.endsWith('featured') ? { featured: { advertiserProviderId: application.toHexString(), destination: { kind: 'property', id: owned.toHexString() }, highlight: { en: 'Yellow line' }, installment: { en: '10% deposit' } } } : {}), targetUrl: 'https://elsadatrealestate.com/properties/owned-property', startAt: '2026-10-10T09:00:00Z', endAt: '2026-10-11T09:00:00Z' });
    const media = await service.createBannerMedia(admin, banner.id, { url: 'https://elsadatrealestate.com/image.png', mime: 'image/png', width: 1200, height: 800 });
    banner = await service.updateBanner(admin, banner.id, { mediaIds: [media.id], status: 'active', expectedVersion: banner.version, reason: 'Publish ad' }); values.push(banner);
  }
  assert.equal(values[1]?.displaySeconds, 6); assert.equal(values[2]?.sortOrder, 1);
  assert.equal((await service.listBanners(admin, { placementKey: 'homepage.hero', page: 1, limit: 100 })).total, 1);
  const card = values[1]!; assert.deepEqual((await service.previewBanner(admin, card.id)).banner.featured, card.featured);
  const stopped = await service.updateBanner(admin, card.id, { status: 'draft', expectedVersion: card.version, reason: 'Stop card' }); assert.equal(stopped.status, 'draft');
  assert.equal((await service.updateBanner(admin, card.id, { status: 'active', expectedVersion: stopped.version, reason: 'Restart card' })).status, 'active');
});
