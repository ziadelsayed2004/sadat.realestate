import assert from 'node:assert/strict';
import test from 'node:test';
import { createPublicOrganizationService, type PublicOrganizationSource } from '../../src/modules/organizations/public.js';

const id = '0123456789abcdef01234567';
const secondId = '1123456789abcdef01234567';
const localized = { ar: 'شركة موثوقة', en: 'Trusted Company', 'zh-CN': '可信公司' };
function source(overrides: Partial<PublicOrganizationSource> = {}): PublicOrganizationSource { return { id, providerId: secondId, kind: 'developer_company', slug: 'trusted-company', name: localized, status: 'approved', providerStatus: 'approved', projects: [{ id, slug: 'published-project', name: localized, status: 'published' }, { id: secondId, slug: 'draft-project', name: localized, status: 'draft' }], properties: [{ id, slug: 'published-home', kind: 'property', name: localized, transactionType: 'sale', status: 'published', active: true }, { id: secondId, slug: 'inactive-home', kind: 'property', name: localized, transactionType: 'rent', status: 'published', active: false }], ...overrides }; }

test('projects approved organizations with only published projects and active properties', async () => {
  const service = createPublicOrganizationService({ repository: { async list() { return { items: [source(), source({ id: secondId, slug: 'other-company', providerStatus: 'approved' }), source({ slug: 'unapproved-company', status: 'pending_review' })], total: 3 }; }, async findBySlug() { return source(); } } });
  const result = await service.list({});
  assert.deepEqual(result.items.map(item => item.slug), ['other-company', 'trusted-company']);
  assert.equal(result.items[0]?.verified, true);
  const profile = await service.get('trusted-company');
  assert.deepEqual(profile?.projects.map(item => item.slug), ['published-project']);
  assert.deepEqual(profile?.properties.map(item => item.slug), ['published-home']);
  assert.deepEqual(profile?.stats, { publishedProjects: 1, availableProperties: 1, saleProperties: 1, rentalProperties: 0 });
  assert.equal('providerId' in (profile ?? {}), false);
  assert.equal('status' in (profile ?? {}), false);
});

test('rejects unsafe directory queries and unapproved provider identity', async () => {
  const service = createPublicOrganizationService({ repository: { async list() { return { items: [source({ providerStatus: 'pending_review' })], total: 1 }; }, async findBySlug() { return source({ providerStatus: 'pending_review' }); } } });
  assert.deepEqual((await service.list({})).items, []);
  assert.equal((await service.get('trusted-company')), null);
  await assert.rejects(() => service.list({ limit: 101 }));
  await assert.rejects(() => service.list({ $where: true }));
  await assert.rejects(() => service.get('Bad Slug'));
});
