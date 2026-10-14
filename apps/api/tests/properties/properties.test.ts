import assert from 'node:assert/strict';
import test from 'node:test';
import {
  propertyCoreStepSchema,
  propertyCreateSchema,
  propertyDataSchema,
  propertyDetailsStepSchema,
  propertyFeaturesServicesStepSchema,
  propertyContactSchema,
  propertyContactStepSchema,
  propertyLocationStepSchema,
  propertyPricingStepSchema,
  propertyMoneySchema,
  propertyAdminEditSchema,
  propertySourceSchema,
  propertySourceIdentitySchema
} from '@sadat-real-estate/contracts';
import { propertySchema, createPropertyModels } from '../../src/modules/properties/models.js';
import { derivePropertySourceIdentity } from '../../src/modules/properties/source-identity.js';
import { createProviderPropertySourceResolver } from '../../src/modules/properties/provider-source.js';
import { createConnection, Types, type Connection } from 'mongoose';

const providerId = '0123456789abcdef01234567';
const organizationId = '1123456789abcdef01234567';
const base = {
  kind: 'property' as const,
  name: { ar: 'شقة', en: 'Apartment' },
  slug: 'sadat-apartment',
  transactionType: 'sale' as const,
  source: { providerId, sourceType: 'developer_company' as const, organizationId },
  reason: 'Create a property draft'
};

test('resolves approved provider organizations automatically without bypassing ownership or review decisions', async () => {
  const account = new Types.ObjectId(providerId), profileId = new Types.ObjectId(organizationId), applicationId = new Types.ObjectId('c'.repeat(24));
  const rows: Record<string, Record<string, unknown> | null> = {
    users: { _id: account, roleType: 'provider', status: 'verified' },
    provider_applications: { _id: applicationId, userId: account, providerType: 'brokerage_office', status: 'approved', legalBusinessName: 'Approved office' },
    provider_profiles: { _id: profileId, userId: account, providerType: 'brokerage_office', status: 'approved' },
    organizations: null
  };
  let creates = 0;
  const connection = { transaction: async (run: (session: unknown) => Promise<unknown>) => run({}), collection: (name: string) => ({
    findOne: async (filter: Record<string, unknown>) => {
      const row = rows[name];
      if (!row || filter.status && row.status !== filter.status || filter.roleType && row.roleType && row.roleType !== filter.roleType || row.deletedAt) return null;
      if (name === 'organizations' && filter.providerId && ![providerId, organizationId, applicationId.toHexString()].includes(String(row.providerId))) return null;
      return row;
    },
    updateOne: async (_filter: unknown, update: { $setOnInsert: Record<string, unknown> }) => { if (!rows[name]) { rows[name] = { _id: profileId, ...update.$setOnInsert }; creates += 1; } }
  }) } as unknown as Connection;
  const resolve = createProviderPropertySourceResolver(connection);
  assert.deepEqual(await resolve(providerId), { providerId, sourceType: 'brokerage_office', organizationId });
  assert.equal(creates, 1);
  assert.deepEqual(await resolve(providerId), { providerId, sourceType: 'brokerage_office', organizationId });
  assert.equal(creates, 1);
  for (const alias of [account, profileId, applicationId.toHexString()]) {
    rows.organizations!.providerId = alias;
    assert.equal((await resolve(providerId))?.organizationId, organizationId);
  }
  rows.organizations!.status = 'suspended';
  assert.equal(await resolve(providerId), undefined);
  rows.organizations!.status = 'approved'; rows.organizations!.providerId = new Types.ObjectId('d'.repeat(24));
  assert.equal(await resolve(providerId), undefined);
  rows.organizations = null;
  for (const collection of ['users', 'provider_applications', 'provider_profiles']) {
    const saved = rows[collection]; rows[collection] = null;
    assert.equal(await resolve(providerId), undefined); rows[collection] = saved!;
  }
  rows.users!.status = 'restricted';
  assert.equal(await resolve(providerId), undefined);
  rows.users!.status = 'verified'; rows.users!.deletedAt = new Date();
  assert.equal(await resolve(providerId), undefined);
  delete rows.users!.deletedAt;
  rows.provider_profiles!.providerType = 'developer_company';
  assert.equal(await resolve(providerId), undefined);
  rows.provider_applications!.providerType = 'developer_company'; rows.provider_applications!.legalCompanyName = 'Approved developer';
  assert.equal((await resolve(providerId))?.sourceType, 'developer_company');
  rows.provider_profiles!.providerType = 'individual_broker'; rows.provider_applications!.providerType = 'individual_broker';
  assert.deepEqual(await resolve(providerId), { providerId, sourceType: 'individual_broker' });
});

test('validates localized property identity and rejects unknown or unsupported fields', () => {
  assert.equal(propertyCreateSchema.safeParse(base).success, true);
  assert.equal(propertyCreateSchema.safeParse({ ...base, source: undefined }).success, true);
  assert.equal(propertyCreateSchema.safeParse({ ...base, verified: true }).success, false);
  assert.equal(propertyCreateSchema.safeParse({ ...base, name: { fr: 'Appartement' } }).success, false);
  assert.equal(propertyCreateSchema.safeParse({ ...base, source: { providerId, sourceType: 'developer_company' } }).success, false);
});

test('keeps property source identity explicit and backend-derived', () => {
  const approved = derivePropertySourceIdentity({
    providerId,
    providerType: 'developer_company',
    providerApprovalStatus: 'approved',
    providerDisplayName: { en: 'Fallback' },
    organization: { id: organizationId, kind: 'developer_company', slug: 'trusted-developer', name: { ar: 'مطور موثوق', en: 'Trusted Developer' }, status: 'approved' }
  }, 'ar');
  assert.equal(propertySourceIdentitySchema.parse(approved).verified, true);
  assert.equal(derivePropertySourceIdentity({
    providerId,
    providerType: 'developer_company',
    providerApprovalStatus: 'suspended',
    providerDisplayName: { en: 'Fallback' },
    organization: { id: organizationId, kind: 'developer_company', slug: 'trusted-developer', name: { en: 'Trusted Developer' }, status: 'approved' }
  }, 'en').verified, false);
});

test('model is strict, links provider/project/source, and has deterministic lookup indexes', () => {
  assert.equal(propertySchema.options.strict, 'throw');
  assert.equal(propertySchema.path('providerId').options.immutable, true);
  assert.equal(propertySchema.path('sourceType').options.immutable, true);
  assert.equal(propertySchema.path('verified'), undefined);
  assert.ok(propertySchema.indexes().some(([keys, options]) => keys.providerId === 1 && keys.slug === 1 && options?.unique === true));
  assert.ok(propertySchema.indexes().some(([keys]) => keys.status === 1 && keys.active === 1));
});

test('adding a first map pin preserves the complete GeoJSON point through Mongoose update casting', async () => {
  const connection = createConnection();
  const { Property } = createPropertyModels(connection);
  const original = Property.collection.findOneAndUpdate;
  let sent: Record<string, unknown> = {};
  Property.collection.findOneAndUpdate = (async (_filter: unknown, update: unknown) => { sent = update as Record<string, unknown>; return null; }) as typeof original;
  try {
    await Property.findOneAndUpdate({ _id: new Types.ObjectId() }, { $set: { coordinates: { type: 'Point', coordinates: [30.74, 30.62] } } }, { runValidators: true, lean: true });
    assert.deepEqual((sent.$set as Record<string, unknown>).coordinates, { type: 'Point', coordinates: [30.74, 30.62] });
  } finally { Property.collection.findOneAndUpdate = original; await connection.destroy(); }
});

test('rejects invalid source relationships and property/unit state combinations', () => {
  assert.equal(propertySourceSchema.safeParse({ providerId, sourceType: 'individual_broker', organizationId }).success, false);
  assert.equal(propertyCreateSchema.safeParse({ ...base, kind: 'property', parentPropertyId: organizationId }).success, false);
  assert.equal(propertyCreateSchema.safeParse({ ...base, kind: 'unit', parentPropertyId: undefined, projectId: undefined }).success, false);
  assert.equal(propertyDataSchema.safeParse({ ...base, id: providerId, active: true, status: 'draft', version: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }).success, false);
});

test('validates resumable core and location steps with bounded coordinates and versions', () => {
  for (const mapUrl of ['https://maps.apple/p/U8rE9v8n8iVZjr', 'https://maps.apple.com/place?place-id=I521E602783BA9605', 'https://maps.apple.com/frame?center=30.62,30.74', 'https://maps.apple.com/search?query=Sadat']) {
    assert.equal(propertyLocationStepSchema.safeParse({ version: 1, mapUrl, reason: 'Save Apple Maps location' }).success, true, mapUrl);
  }
  for (const mapUrl of ['https://maps.apple/p/', 'https://maps.apple.com.evil.example/?q=Sadat', 'https://maps.app.goo.gl/Abc123xyz?link=https://example.com']) {
    assert.equal(propertyLocationStepSchema.safeParse({ version: 1, mapUrl, reason: 'Reject unsafe map target' }).success, false, mapUrl);
  }
  for (const mapUrl of ['https://maps.app.goo.gl/Abc123xyz', 'https://goo.gl/maps/Abc123xyz', 'https://www.google.com/maps/place/Sadat+City/', 'https://www.google.com/maps/@30.62,30.74,15z', 'https://www.google.com/maps/search/?api=1&query=Sadat', 'https://maps.apple.com/?ll=30.62,30.74', 'https://maps.apple.com/?q=Sadat']) {
    assert.equal(propertyLocationStepSchema.safeParse({ version: 1, mapUrl, reason: 'Save valid map link' }).success, true, mapUrl);
  }
  for (const mapUrl of ['https://example.com', 'https://www.google.com', 'https://www.google.com/maps', 'https://maps.apple.com/', 'https://maps.app.goo.gl/', 'https://goo.gl/Abc123xyz', 'https://maps.google.com.evil.example/?q=Sadat', 'https://maps.google.com@evil.example/?q=Sadat', 'https://evil@maps.google.com/?q=Sadat', 'https://www.google.com/url?url=https://example.com', 'https://maps.google.com:8443/?q=Sadat', 'https://maps.google.com/?ll=91,181']) {
    assert.equal(propertyLocationStepSchema.safeParse({ version: 1, mapUrl, reason: 'Reject unrelated website' }).success, false, mapUrl);
  }
  assert.equal(propertyCoreStepSchema.safeParse({ version: 0, name: { en: 'Updated apartment' }, reason: 'Save basic property data' }).success, true);
  assert.equal(propertyLocationStepSchema.safeParse({ version: 1, mapUrl: 'https://maps.google.com/?q=Sadat+City', reason: 'Save map location' }).success, true);
  assert.equal(propertyLocationStepSchema.safeParse({ version: 1, mapUrl: 'http://maps.example.com/sadat', reason: 'Reject insecure map link' }).success, false);
  assert.equal(propertyLocationStepSchema.safeParse({ version: 1, mapUrl: 'javascript:alert(1)', reason: 'Reject script map link' }).success, false);
  assert.equal(propertyLocationStepSchema.safeParse({ version: 1, reason: 'Reject missing location source' }).success, false);
  assert.equal(propertyLocationStepSchema.safeParse({ version: 1, locationId: providerId, coordinates: { latitude: 30.62, longitude: 30.74 }, reason: 'Save property location' }).success, true);
  assert.equal(propertyLocationStepSchema.safeParse({ version: 1, coordinates: { latitude: 91, longitude: 30 }, reason: 'Save invalid coordinates' }).success, false);
  assert.equal(propertyCoreStepSchema.safeParse({ version: 1, reason: 'No changed fields' }).success, false);
  assert.equal(propertyLocationStepSchema.safeParse({ version: 1, locationId: providerId, reason: 'Unknown field', unexpected: true }).success, false);
});

test('validates details, area, layout, price, and payment-plan conditionals', () => {
  assert.equal(propertyDetailsStepSchema.safeParse({ version: 0, area: { value: 85, unit: 'sqm' }, layout: { bedrooms: 2, bathrooms: 1, floor: 2, totalFloors: 5 }, reason: 'Save property details' }).success, true);
  assert.equal(propertyDetailsStepSchema.safeParse({ version: 0, layout: { floor: 6, totalFloors: 5 }, reason: 'Reject invalid layout' }).success, false);
  assert.equal(propertyPricingStepSchema.safeParse({ version: 1, price: { amount: 1_000_000, currency: 'EGP' }, paymentPlans: [{ name: { en: 'Plan' }, installments: 12, frequency: 'monthly', installmentAmount: { amount: 80_000, currency: 'EGP' } }], reason: 'Save pricing plan' }).success, true);
  assert.equal(propertyPricingStepSchema.safeParse({ version: 1, paymentPlans: [{ name: { en: 'Plan' }, installments: 12, frequency: 'monthly', installmentAmount: { amount: 80_000, currency: 'USD' } }], reason: 'Require price for plan' }).success, false);
  assert.equal(propertyPricingStepSchema.safeParse({ version: 1, price: { amount: 1_000_000, currency: 'EGP' }, paymentPlans: [{ name: { en: 'Plan' }, installments: 12, frequency: 'monthly', installmentAmount: { amount: 80_000, currency: 'USD' } }], reason: 'Reject mixed currencies' }).success, false);
});

test('pricing writes accept only pounds and dollars while legacy amounts remain readable', () => {
  for (const currency of ['EGP', 'USD']) {
    assert.equal(propertyPricingStepSchema.safeParse({ version: 1, price: { amount: 150000, currency }, paymentPlans: [{ name: { en: 'Plan' }, installments: 12, frequency: 'monthly', downPayment: { amount: 30000, currency }, installmentAmount: { amount: 10000, currency } }], reason: 'Save supported currency' }).success, true);
    assert.equal(propertyAdminEditSchema.safeParse({ version: 1, price: { amount: 150000, currency }, reason: 'Set supported property price' }).success, true);
  }
  for (const currency of ['EUR', 'GBP', 'دول', 'usd', 'جنيه']) {
    assert.equal(propertyPricingStepSchema.safeParse({ version: 1, price: { amount: 150000, currency }, reason: 'Reject unsupported property currency' }).success, false);
    assert.equal(propertyAdminEditSchema.safeParse({ version: 1, price: { amount: 150000, currency }, reason: 'Reject unsupported property currency' }).success, false);
    assert.equal(propertyPricingStepSchema.safeParse({ version: 1, price: { amount: 150000, currency: 'EGP' }, paymentPlans: [{ name: { en: 'Plan' }, installments: 12, frequency: 'monthly', installmentAmount: { amount: 10000, currency } }], reason: 'Reject unsupported plan currency' }).success, false);
  }
  assert.equal(propertyMoneySchema.safeParse({ amount: 150000, currency: 'EUR' }).success, true);
});

test('validates feature and service associations with deterministic references', () => {
  assert.equal(propertyFeaturesServicesStepSchema.safeParse({ version: 0, featureIds: [providerId], serviceIds: [organizationId], reason: 'Save property features' }).success, true);
  assert.equal(propertyFeaturesServicesStepSchema.safeParse({ version: 0, featureIds: [providerId, providerId], reason: 'Reject duplicate features' }).success, false);
  assert.equal(propertyFeaturesServicesStepSchema.safeParse({ version: 0, featureIds: [providerId], serviceIds: [providerId], reason: 'Reject cross-kind duplicate' }).success, false);
  assert.equal(propertyFeaturesServicesStepSchema.safeParse({ version: 0, featureIds: [providerId], reason: 'Unknown field', secret: 'nope' }).success, false);
});

test('validates contact data without allowing identity or secret fields', () => {
  for (const contactRole of ['account_owner', 'sales_agent', 'custom']) assert.equal(propertyContactSchema.safeParse({ contactRole, phone: '+201234567890' }).success, true);
  assert.equal(propertyContactSchema.safeParse({ contactRole: 'admin' }).success, false);
  assert.equal(propertyContactSchema.safeParse({ phone: '+201234567890', showPhone: false, showWhatsapp: true, showEmail: false, preferredContactTime: '9 to 5', internalNotes: 'Provider-only instructions' }).success, true);
  assert.equal(propertyContactSchema.safeParse({ showPhone: 'false' }).success, false);
  assert.equal(propertyContactSchema.safeParse({ internalNotes: 'x'.repeat(2001) }).success, false);
  assert.equal(propertyContactSchema.safeParse({ preferredContactTime: 'x'.repeat(201) }).success, false);
  assert.equal(propertyContactSchema.safeParse({ contactName: 'Property desk', phone: '+201234567890', whatsappNumber: '+201234567891', email: 'contact@example.com', preferredLocale: 'ar' }).success, true);
  assert.equal(propertyContactStepSchema.safeParse({ version: 0, contact: { phone: '+201234567890' }, reason: 'Save property contact' }).success, true);
  assert.equal(propertyContactStepSchema.safeParse({ version: 0, contact: { phone: '01012345678' }, reason: 'Reject non normalized phone' }).success, false);
  assert.equal(propertyContactStepSchema.safeParse({ version: 0, contact: { providerId }, reason: 'Reject source override' }).success, false);
  assert.equal(propertyContactStepSchema.safeParse({ version: 0, contact: { email: 'contact@example.com' }, reason: 'Unknown field', password: 'nope' }).success, false);
});
