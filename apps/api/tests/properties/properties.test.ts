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
  propertySourceSchema,
  propertySourceIdentitySchema
} from '@sadat-real-estate/contracts';
import { propertySchema } from '../../src/modules/properties/models.js';
import { derivePropertySourceIdentity } from '../../src/modules/properties/source-identity.js';

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

test('validates localized property identity and rejects unknown or unsupported fields', () => {
  assert.equal(propertyCreateSchema.safeParse(base).success, true);
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
  }, 'zh-CN');
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

test('rejects invalid source relationships and property/unit state combinations', () => {
  assert.equal(propertySourceSchema.safeParse({ providerId, sourceType: 'individual_broker', organizationId }).success, false);
  assert.equal(propertyCreateSchema.safeParse({ ...base, kind: 'property', parentPropertyId: organizationId }).success, false);
  assert.equal(propertyCreateSchema.safeParse({ ...base, kind: 'unit', parentPropertyId: undefined, projectId: undefined }).success, false);
  assert.equal(propertyDataSchema.safeParse({ ...base, id: providerId, active: true, status: 'draft', version: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }).success, false);
});

test('validates resumable core and location steps with bounded coordinates and versions', () => {
  assert.equal(propertyCoreStepSchema.safeParse({ version: 0, name: { en: 'Updated apartment' }, reason: 'Save basic property data' }).success, true);
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

test('validates feature and service associations with deterministic references', () => {
  assert.equal(propertyFeaturesServicesStepSchema.safeParse({ version: 0, featureIds: [providerId], serviceIds: [organizationId], reason: 'Save property features' }).success, true);
  assert.equal(propertyFeaturesServicesStepSchema.safeParse({ version: 0, featureIds: [providerId, providerId], reason: 'Reject duplicate features' }).success, false);
  assert.equal(propertyFeaturesServicesStepSchema.safeParse({ version: 0, featureIds: [providerId], serviceIds: [providerId], reason: 'Reject cross-kind duplicate' }).success, false);
  assert.equal(propertyFeaturesServicesStepSchema.safeParse({ version: 0, featureIds: [providerId], reason: 'Unknown field', secret: 'nope' }).success, false);
});

test('validates contact data without allowing identity or secret fields', () => {
  assert.equal(propertyContactSchema.safeParse({ contactName: 'Property desk', phone: '+201234567890', whatsappNumber: '+201234567891', email: 'contact@example.com', preferredLocale: 'ar' }).success, true);
  assert.equal(propertyContactStepSchema.safeParse({ version: 0, contact: { phone: '+201234567890' }, reason: 'Save property contact' }).success, true);
  assert.equal(propertyContactStepSchema.safeParse({ version: 0, contact: { phone: '01012345678' }, reason: 'Reject non normalized phone' }).success, false);
  assert.equal(propertyContactStepSchema.safeParse({ version: 0, contact: { providerId }, reason: 'Reject source override' }).success, false);
  assert.equal(propertyContactStepSchema.safeParse({ version: 0, contact: { email: 'contact@example.com' }, reason: 'Unknown field', password: 'nope' }).success, false);
});
