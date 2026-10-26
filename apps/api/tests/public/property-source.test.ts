import assert from 'node:assert/strict';
import test from 'node:test';
import { Types } from 'mongoose';
import { publicPropertySourceSchema } from '@sadat-real-estate/contracts';
import { account, application, profile, policyId, database } from '../helpers/provider-identity-db.js';
import { createMongoosePublicPropertyDetailsRepository, createPublicPropertyDetailsService } from '../../src/modules/public/properties.js';
import { createMongoosePublicOrganizationRepository, createPublicOrganizationService } from '../../src/modules/organizations/public.js';
import { createPropertyReviewContextReader } from '../../src/modules/properties/review-context.js';
import type { StoredProperty } from '../../src/modules/properties/repository.js';

test('administrative review names an owned unpublished compound across all legacy owner aliases and scopes its links', async () => {
  const projectId = new Types.ObjectId('e'.repeat(24));
  for (const owner of [account, profile, application]) {
    const db = fixture('developer_company', owner);
    db.rows.projects = [{ _id: projectId, providerId: account, organizationId, slug: 'owner-compound', name: { ar: 'كمبوند الشركة', en: 'Owner compound' }, status: 'draft' }];
    const property: StoredProperty = { id: propertyId.toHexString(), providerId: owner.toHexString(), source: { providerId: owner.toHexString(), sourceType: 'developer_company', organizationId: organizationId.toHexString() }, projectId: projectId.toHexString(), kind: 'unit', name: { en: 'Pending unit' }, slug: 'pending-unit', transactionType: 'sale', status: 'pending_review', active: true, version: 0, createdAt: new Date(), updatedAt: new Date() };
    const read = createPropertyReviewContextReader(db.connection);
    const context = await read(property, { projects: true, providers: true });
    assert.deepEqual(context.project?.name, { ar: 'كمبوند الشركة', en: 'Owner compound' });
    assert.equal(context.project?.status, 'draft');
    assert.equal(context.project?.adminPath, `/admin/projects/review?projectId=${projectId}`);
    assert.equal(context.project?.publicPath, undefined);
    assert.equal(context.organization?.adminPath, `/admin/providers/${application}`);
    assert.equal(context.organization?.projectsPath, '/developers/sadat-business#developer-projects');
    const restricted = await read(property, { projects: false, providers: false });
    assert.equal(restricted.project?.adminPath, undefined); assert.equal(restricted.organization?.adminPath, undefined);
    db.rows.projects[0]!.status = 'published';
    assert.equal((await read(property, { projects: false, providers: false })).project?.publicPath, '/developers/sadat-business/projects/owner-compound');
    delete db.rows.projects[0]!.organizationId;
    assert.equal((await read(property, { projects: false, providers: false })).project?.name.en, 'Owner compound', 'legacy project without an organization key still needs a verified owner match');
    db.rows.projects[0]!.organizationId = new Types.ObjectId('f'.repeat(24));
    const foreign = await read(property, { projects: true, providers: true });
    assert.equal(foreign.project, undefined); assert.equal(foreign.projectUnavailable, true);
    db.rows.organizations![0]!.providerId = new Types.ObjectId('f'.repeat(24));
    assert.deepEqual(await read(property, { projects: true, providers: true }), { projectUnavailable: true });
  }
});

const propertyId = new Types.ObjectId('a'.repeat(24));
const organizationId = new Types.ObjectId('b'.repeat(24));
function fixture(type = 'brokerage_office', owner = account, organizationOwner = profile) {
  const db = database(type);
  db.rows.properties = [{ _id: propertyId, slug: 'office-home', kind: 'property', name: { en: 'Home' }, transactionType: 'sale', sourceType: 'individual_broker', providerId: owner, status: 'published', active: true }];
  db.rows.organizations = [{ _id: organizationId, providerId: organizationOwner, kind: type, name: { en: 'Public business' }, slug: 'sadat-business', status: 'approved', contactPhone: '+201111111111', contactAddress: 'Private address' }];
  db.rows.provider_identity_subscriptions!.push({ _id: account, status: 'active', paymentConfirmed: true, startAt: new Date('2020-01-01T00:00:00Z'), endAt: new Date('2099-01-01T00:00:00Z') });
  db.rows.commission_confirmations!.push({ accountId: account.toHexString(), source: 'policy', sourceRecordId: policyId.toHexString(), policyVersion: 1, status: 'acknowledged' });
  return { ...db, details: createPublicPropertyDetailsService({ repository: createMongoosePublicPropertyDetailsRepository(db.connection) }), profiles: createPublicOrganizationService({ repository: createMongoosePublicOrganizationRepository(db.connection) }) };
}

test('office sources use the actual account type and a reachable public slug across legacy owner aliases', async () => {
  for (const owner of [account, profile, application]) {
    for (const organizationOwner of [account, profile, application]) {
      const db = fixture('brokerage_office', owner, organizationOwner);
      const details = await db.details.get('office-home');
      assert.deepEqual(details?.source, { sourceType: 'brokerage_office', organizationId: organizationId.toHexString(), organizationSlug: 'sadat-business', name: { en: 'Public business' }, verified: true });
      const publicProfile = await db.profiles.get(details!.source.organizationSlug!);
      assert.equal(publicProfile?.kind, 'brokerage_office');
      assert.equal(publicProfile?.contactPhone, undefined);
      assert.equal(publicProfile?.contactAddress, undefined);
      assert.deepEqual(publicProfile?.properties.map(item => item.id), [propertyId.toHexString()]);
      assert.equal(publicProfile?.stats.availableProperties, 1);
      assert.equal(details?.contact, undefined);
      assert.equal(JSON.stringify(details).includes('+201111111111'), false);
    }
  }
});

test('developers resolve profiles owned by a user, application or provider profile', async () => {
  for (const owner of [account, application, profile]) {
    const db = fixture('developer_company', account, owner);
    const details = await db.details.get('office-home');
    assert.equal(details?.source.sourceType, 'developer_company');
    assert.equal(details?.source.organizationSlug, 'sadat-business');
    assert.equal((await db.profiles.get('sadat-business'))?.kind, 'developer_company');
  }
});

test('hidden, unpaid, expired and unapproved office identities have no public profile or contact', async () => {
  for (const state of ['unpaid', 'expired', 'suspended', 'organization-pending'] as const) {
    const db = fixture();
    if (state === 'unpaid') db.rows.provider_identity_subscriptions![0]!.paymentConfirmed = false;
    if (state === 'expired') db.rows.provider_identity_subscriptions![0]!.endAt = new Date('2020-02-01T00:00:00Z');
    if (state === 'suspended') db.rows.users![0]!.status = 'suspended';
    if (state === 'organization-pending') db.rows.organizations![0]!.status = 'pending_review';
    assert.deepEqual((await db.details.get('office-home'))?.source, { sourceType: 'brokerage_office' });
    assert.equal((await db.details.get('office-home'))?.contact, undefined);
    assert.equal(await db.profiles.get('sadat-business'), null);
  }
});

test('a stale or foreign organization link cannot reveal a different business or make an individual public', async () => {
  for (const type of ['brokerage_office', 'individual_broker']) {
    const db = fixture(type);
    const foreign = new Types.ObjectId('c'.repeat(24));
    db.rows.properties![0]!.organizationId = foreign;
    db.rows.organizations!.push({ _id: foreign, providerId: new Types.ObjectId('d'.repeat(24)), kind: 'developer_company', name: { en: 'Foreign business' }, slug: 'foreign-business', status: 'approved' });
    const details = await db.details.get('office-home');
    assert.equal(JSON.stringify(details).includes('Foreign business'), false);
    assert.equal(details?.source.organizationSlug, type === 'brokerage_office' ? 'sadat-business' : undefined);
    assert.equal(details?.source.sourceType, type);
  }
});

test('the public source contract rejects invalid profile slugs', () => {
  for (const slug of ['../admin', 'Bad Slug', 'https://example.com']) assert.equal(publicPropertySourceSchema.safeParse({ sourceType: 'brokerage_office', organizationSlug: slug }).success, false);
});

test('missing or malformed public organization profiles do not produce a source URL', async () => {
  for (const state of ['missing', 'invalid-slug', 'wrong-kind']) {
    const db = fixture();
    if (state === 'missing') db.rows.organizations!.splice(0);
    if (state === 'invalid-slug') db.rows.organizations![0]!.slug = '../admin';
    if (state === 'wrong-kind') db.rows.organizations![0]!.kind = 'developer_company';
    const source = (await db.details.get('office-home'))?.source;
    assert.equal(source?.sourceType, 'brokerage_office');
    assert.equal(source?.organizationSlug, undefined);
    assert.equal(await db.profiles.get('sadat-business'), null);
  }
});
