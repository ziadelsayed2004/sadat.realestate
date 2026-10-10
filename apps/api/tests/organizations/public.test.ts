import assert from 'node:assert/strict';
import test from 'node:test';
import { createMongoosePublicOrganizationRepository, createPublicOrganizationService, type PublicOrganizationSource } from '../../src/modules/organizations/public.js';
import type { Connection } from 'mongoose';

const id = '0123456789abcdef01234567';
const secondId = '1123456789abcdef01234567';
const localized = { ar: 'شركة موثوقة', en: 'Trusted Company' };
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

test('company name searches support Arabic and English fragments without a text index or regex operators', async () => {
  let filters: Array<Record<string, unknown>> = [];
  const connection = {
    collection(name: string) {
      return {
        find(filter: Record<string, unknown>) {
          assert.equal(name, 'organizations'); filters.push(filter);
          return { sort() { return this; }, skip() { return this; }, limit() { return this; }, async toArray() { return []; } };
        },
        async countDocuments(filter: Record<string, unknown>) { filters.push(filter); return 0; }
      };
    }
  } as unknown as Connection;
  const service = createPublicOrganizationService({ repository: createMongoosePublicOrganizationRepository(connection) });
  for (const search of ['النيل', 'NiLe', 'A.*(group)']) {
    filters = [];
    assert.equal((await service.list({ search })).total, 0);
    assert.equal(filters.length, 1);
    for (const filter of filters) {
      assert.equal(filter.status, 'approved');
      assert.deepEqual(filter.directoryVisible, { $ne: false });
      assert.equal('$text' in filter, false);
      const alternatives = filter.$or as Array<Record<string, RegExp>>;
      assert.deepEqual(alternatives.map(item => Object.keys(item)[0]), ['name.ar', 'name.en', 'slug']);
      for (const item of alternatives) {
        const pattern = Object.values(item)[0]!;
        assert.ok(pattern.test(`Company ${search.toLowerCase()} Real Estate`));
        assert.equal(pattern.test('An unrelated developer'), false);
        if (search.includes('*')) assert.equal(pattern.test('A random group'), false);
      }
    }
  }
});
