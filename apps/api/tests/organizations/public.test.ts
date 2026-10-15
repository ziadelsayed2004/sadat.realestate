import assert from 'node:assert/strict';
import test from 'node:test';
import { createMongoosePublicOrganizationRepository, createPublicOrganizationService, type PublicOrganizationSource } from '../../src/modules/organizations/public.js';
import type { Connection } from 'mongoose';
import { account, profile as profileId, policyId, database } from '../helpers/provider-identity-db.js';
import { visiblePublicOrganizations } from '../../src/modules/public/identity.js';
import { createMongoosePublicSitemapSource } from '../../src/modules/public/sitemap.js';
import { Types } from 'mongoose';

const id = '0123456789abcdef01234567';
const secondId = '1123456789abcdef01234567';
const localized = { ar: 'شركة موثوقة', en: 'Trusted Company' };

test('finds developer properties stored under account/profile aliases and uses their ready cover image', async () => {
  const db = database('developer_company'), organizationId = new Types.ObjectId('a'.repeat(24));
  const propertyId = new Types.ObjectId('b'.repeat(24)), mediaId = new Types.ObjectId('c'.repeat(24));
  db.rows.organizations = [{ _id: organizationId, providerId: profileId, kind: 'developer_company', slug: 'cover-company', name: localized, status: 'approved' }];
  const property = { _id: propertyId, providerId: account, slug: 'company-property', kind: 'property', name: localized, transactionType: 'sale', status: 'published', active: true };
  db.rows.property_media = [{ _id: mediaId, propertyId, kind: 'image', active: true, processingState: 'ready', isCover: true }];
  db.rows.properties = [];
  const service = createPublicOrganizationService({ repository: createMongoosePublicOrganizationRepository(db.connection) });
  for (const owner of [account, account.toHexString(), profileId, profileId.toHexString()]) {
    db.rows.properties.splice(0, db.rows.properties.length, { ...property, providerId: owner });
    const result = await service.get('cover-company');
    assert.equal(result?.properties[0]?.slug, 'company-property');
    assert.equal(result?.properties[0]?.imageUrl, `/api/v1/public/properties/${propertyId}/media/${mediaId}/content`);
    assert.equal(result?.imageUrl, result?.properties[0]?.imageUrl);
    assert.equal(result?.stats.availableProperties, 1);
  }
  db.rows.properties.splice(0, db.rows.properties.length, { ...property, organizationId: new Types.ObjectId('d'.repeat(24)) }, { ...property, _id: new Types.ObjectId('e'.repeat(24)), expiresAt: new Date('2020-01-01') });
  assert.equal((await service.get('cover-company'))?.stats.availableProperties, 0);
});
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

test('approved developer companies and published projects stay browsable without commission acknowledgement, while contact and other identity scopes stay protected', async () => {
  const db = database('developer_company');
  const organizationId = new Types.ObjectId('a'.repeat(24));
  const projectId = new Types.ObjectId('b'.repeat(24));
  const organization = { _id: organizationId, providerId: profileId, kind: 'developer_company', slug: 'new-life', name: { en: 'The new life', ar: 'الحياة الجديدة' }, status: 'approved', contactPhone: '+201234567890', whatsappUrl: 'https://wa.me/201234567890', contactAddress: 'Company address' };
  db.rows.organizations = [organization];
  db.rows.projects = [{ _id: projectId, organizationId, slug: 'published-project', name: { en: 'Published project' }, status: 'published' }, { _id: new Types.ObjectId('c'.repeat(24)), organizationId, slug: 'draft-project', name: { en: 'Draft project' }, status: 'draft' }];
  const service = createPublicOrganizationService({ repository: createMongoosePublicOrganizationRepository(db.connection) });
  const assertListed = async () => {
    const result = await service.list({ search: 'new li' });
    assert.equal(result.total, 1); assert.equal(result.items[0]?.name.en, 'The new life');
    const profile = await service.get('new-life');
    assert.deepEqual(profile?.projects.map(item => item.slug), ['published-project']);
    return profile;
  };
  for (const deletedAt of [undefined, null]) {
    if (deletedAt === undefined) delete db.rows.users![0]!.deletedAt; else db.rows.users![0]!.deletedAt = deletedAt;
    const profile = await assertListed();
    assert.equal(profile?.contactPhone, undefined); assert.equal(profile?.whatsappUrl, undefined); assert.equal(profile?.contactAddress, undefined);
    assert.deepEqual(await visiblePublicOrganizations(db.connection, [organization]), []);
    assert.equal((await createMongoosePublicSitemapSource(db.connection).list()).some(item => item.path === '/developers/new-life'), true);
  }
  db.rows.commission_confirmations!.push({ accountId: account.toHexString(), source: 'policy', sourceRecordId: policyId.toHexString(), policyVersion: 1, status: 'acknowledged' });
  assert.equal((await assertListed())?.contactPhone, '+201234567890');
  db.rows.commission_confirmations![0]!.status = 'revoked';
  assert.equal((await assertListed())?.contactPhone, undefined);
  for (const owner of [account, account.toHexString(), profileId, profileId.toHexString()]) {
    db.rows.organizations![0]!.providerId = owner;
    await assertListed();
  }
  for (const [collection, field, value] of [['users', 'status', 'suspended'], ['users', 'deletedAt', new Date()], ['provider_profiles', 'status', 'suspended'], ['provider_applications', 'status', 'pending_review'], ['organizations', 'status', 'inactive']] as const) {
    const row = db.rows[collection]![0]!, before = row[field]; row[field] = value;
    assert.equal((await service.list({})).items.length, 0, `${collection}.${field}`);
    assert.equal(await service.get('new-life'), null);
    if (before === undefined) delete row[field]; else row[field] = before;
  }
});

test('project detail data excludes every unpublished project state and inactive linked unit', async () => {
  const row = source();
  const published = row.projects[0]!;
  row.projects = [published, ...['draft', 'pending_review', 'needs_changes', 'approved', 'hidden', 'archived', 'rejected'].map((status, index) => ({ ...published, id: (index + 2).toString().repeat(24), slug: `${status.replace('_', '-')}-project`, status }))];
  row.properties[0]!.projectId = published.id;
  row.properties[1]!.projectId = published.id;
  const service = createPublicOrganizationService({ repository: { async list() { return { items: [row], total: 1 }; }, async findBySlug() { return row; } } });
  const profile = await service.get('trusted-company');
  assert.deepEqual(profile?.projects.map(project => project.slug), ['published-project']);
  assert.deepEqual(profile?.properties.map(property => property.slug), ['published-home']);
  assert.equal(profile?.properties[0]?.projectId, published.id);
  assert.equal('providerId' in (profile ?? {}), false);
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
