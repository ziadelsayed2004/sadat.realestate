import assert from'node:assert/strict';import test from'node:test';import{organizationCreateSchema,organizationReviewSchema,sourceIdentitySchema}from'@sadat-real-estate/contracts';import{organizationSchema}from'../../src/modules/organizations/models.js';import{deriveSourceIdentity}from'../../src/modules/organizations/source-identity.js';
const providerId='0123456789abcdef01234567';
import { Types, type ClientSession, type Connection } from 'mongoose';
import { developerOrganizationId, ensureDeveloperOrganization, initializeDeveloperOrganizations } from '../../src/modules/organizations/provider-profile.js';

type Row = Record<string, unknown>;
function organizationFixture() {
  const accountId = new Types.ObjectId(providerId), profileId = new Types.ObjectId('1'.repeat(24)), applicationId = new Types.ObjectId('2'.repeat(24));
  const rows: Record<string, Row[]> = {
    provider_applications: [{ _id: applicationId, userId: accountId, providerType: 'developer_company', status: 'approved', brandName: 'New developer', taxRegistrationNumber: 'private-tax-data' }],
    provider_profiles: [{ _id: profileId, userId: accountId, providerType: 'developer_company', status: 'approved' }],
    users: [{ _id: accountId, roleType: 'provider', status: 'verified' }], organizations: [], organization_reconciliations: [],
    properties: [{ providerId: accountId, status: 'published', version: 3 }, { providerId: new Types.ObjectId('3'.repeat(24)), version: 1 }, { providerId: accountId, organizationId: new Types.ObjectId('4'.repeat(24)), version: 2 }],
    projects: [{ providerId: profileId, status: 'approved', version: 5 }]
  };
  const equals = (a: unknown, b: unknown) => a instanceof Types.ObjectId || b instanceof Types.ObjectId ? String(a) === String(b) : a === b;
  const matches = (row: Row, filter: Row) => Object.entries(filter).every(([key, value]) => {
    if (value === null) return row[key] == null;
    if (value && typeof value === 'object' && '$in' in value) return (value.$in as unknown[]).some(item => equals(row[key], item));
    return equals(row[key], value);
  });
  const session = {} as ClientSession;
  const connection = { transaction: async (run: (session: ClientSession) => unknown) => run(session), collection(name: string) {
    const items = rows[name] ??= [];
    return {
      async createIndex() {},
      async findOne(filter: Row) { return items.find(row => matches(row, filter)) ?? null; },
      find(filter: Row) { const cursor = { batchSize() { return cursor; }, async *[Symbol.asyncIterator]() { yield* items.filter(row => matches(row, filter)); } }; return cursor; },
      async updateOne(filter: Row, update: { $setOnInsert: Row }) { if (items.some(row => matches(row, filter))) return { upsertedCount: 0 }; items.push({ ...filter, ...update.$setOnInsert }); return { upsertedCount: 1 }; },
      async updateMany(filter: Row, update: { $set: Row; $inc: Record<string, number> }) { let modifiedCount = 0; for (const row of items.filter(row => matches(row, filter))) { Object.assign(row, update.$set); for (const [key, amount] of Object.entries(update.$inc)) row[key] = Number(row[key] ?? 0) + amount; modifiedCount++; } return { modifiedCount }; },
      async insertOne(row: Row) { items.push(row); }
    };
  } } as unknown as Connection;
  return { connection, session, rows, accountId, profileId };
}

test('restores approved developer identities and unlinked owned records idempotently without exposing application data', async () => {
  const f = organizationFixture();
  await initializeDeveloperOrganizations(f.connection);
  assert.equal(f.rows.organizations!.length, 1);
  const organization = f.rows.organizations![0]!;
  assert.deepEqual(organization.name, { ar: 'New developer', en: 'New developer' });
  assert.equal(organization.slug, `developer-${providerId}`);
  assert.equal('taxRegistrationNumber' in organization, false);
  assert.deepEqual(f.rows.properties![0]!.organizationId, f.profileId);
  assert.equal(f.rows.properties![0]!.status, 'published');
  assert.equal(f.rows.properties![0]!.sourceType, 'developer_company');
  assert.equal(f.rows.properties![0]!.version, 4);
  assert.equal(f.rows.properties![1]!.organizationId, undefined);
  assert.deepEqual(f.rows.properties![2]!.organizationId, new Types.ObjectId('4'.repeat(24)));
  assert.equal(f.rows.projects![0]!.status, 'approved');
  const before = JSON.stringify(f.rows);
  await initializeDeveloperOrganizations(f.connection);
  assert.equal(JSON.stringify(f.rows), before);
  assert.deepEqual(await developerOrganizationId(f.connection, providerId, f.session), f.profileId);
});

test('never provisions a public identity for unapproved, suspended, deleted or mismatched accounts', async () => {
  for (const [collection, patch] of [['provider_applications', { status: 'pending_review' }], ['provider_profiles', { status: 'suspended' }], ['provider_profiles', { providerType: 'brokerage_office' }], ['users', { status: 'suspended' }], ['users', { deletedAt: new Date() }]] as const) {
    const f = organizationFixture(); Object.assign(f.rows[collection]![0]!, patch);
    assert.equal(await ensureDeveloperOrganization(f.connection, f.accountId, new Date(), f.session), undefined);
    assert.equal(f.rows.organizations!.length, 0);
    assert.equal(f.rows.organization_reconciliations!.length, 0);
  }
});

test('preserves existing organization names, URLs and administrative visibility decisions', async () => {
  for (const status of ['approved', 'draft', 'inactive', 'rejected']) {
    const f = organizationFixture();
    const organization = { _id: f.profileId, providerId, kind: 'developer_company', name: { en: 'Custom name' }, slug: 'custom-url', status, directoryVisible: false };
    f.rows.organizations!.push(organization);
    await ensureDeveloperOrganization(f.connection, f.accountId, new Date(), f.session);
    assert.equal(f.rows.organizations!.length, 1);
    assert.deepEqual(f.rows.organizations![0], organization);
    if (status !== 'approved') assert.equal(f.rows.properties![0]!.organizationId, undefined);
  }
});
test('validates strict multilingual organizations and deterministic slugs',()=>{assert.equal(organizationCreateSchema.safeParse({providerId,kind:'developer_company',name:{ar:'مطور',en:'Developer'},slug:'trusted-developer'}).success,true);assert.equal(organizationCreateSchema.safeParse({providerId,kind:'developer_company',name:{en:'Developer'},slug:'Bad Slug',verified:true}).success,false);assert.equal(organizationReviewSchema.safeParse({version:0,status:'approved',reason:'Documents and authority approved'}).success,true)});
test('persists provider linkage and approval state without a writable verified flag',()=>{assert.equal(organizationSchema.path('providerId').options.unique,true);assert.equal(organizationSchema.path('kind').options.immutable,true);assert.equal(organizationSchema.path('verified'),undefined);assert.ok(organizationSchema.indexes().some(([keys])=>'status'in keys&&'kind'in keys))});
test('derives truthful source identity and localized fallback from genuine approvals',()=>{const base={providerId,providerType:'developer_company' as const,providerApprovalStatus:'approved' as const,providerDisplayName:{en:'Fallback'},organization:{id:'1123456789abcdef01234567',kind:'developer_company' as const,slug:'trusted-developer',name:{ar:'مطور موثوق',en:'Trusted Developer'},status:'approved' as const}};const approved=sourceIdentitySchema.parse(deriveSourceIdentity(base,'ar'));assert.equal(approved.verified,true);assert.equal(approved.displayName,'مطور موثوق');assert.equal(approved.locale,'ar');assert.equal(deriveSourceIdentity({...base,providerApprovalStatus:'pending_review'},'ar').verified,false);assert.equal(deriveSourceIdentity({...base,organization:{...base.organization,status:'inactive'}},'ar').verified,false)});
test('rejects mismatched provider and organization identities',()=>assert.throws(()=>deriveSourceIdentity({providerId,providerType:'brokerage_office',providerApprovalStatus:'approved',providerDisplayName:{en:'Office'},organization:{id:'1123456789abcdef01234567',kind:'developer_company',slug:'wrong',name:{en:'Wrong'},status:'approved'}},'en'),/SOURCE_ORGANIZATION_TYPE_MISMATCH/));
