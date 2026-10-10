import assert from 'node:assert/strict';
import test from 'node:test';

test('generates a property link without a manual slug and keeps it on draft edits', async () => {
  const { service } = fixture();
  const context = { requestId: 'auto-property', traceId: 'a'.repeat(32) };
  const created = await service.create(claims(), { kind: 'property', name: { ar: 'شقة في السادات' }, transactionType: 'sale', source: { providerId: provider, sourceType: 'individual_broker' }, reason: 'Create automatic property' }, context);
  assert.match(created.slug, /^property-[a-f0-9]{32}$/);
  const updated = await service.saveStep(claims(), created.id, 'basic', { version: created.version, name: { en: 'Updated apartment' }, reason: 'Rename property only' }, context);
  assert.equal(updated.slug, created.slug);
});
import type { AccessTokenClaims } from '../../src/modules/auth/crypto.js';
import type { PropertyRepository, StoredProperty } from '../../src/modules/properties/repository.js';
import { createPropertyService, PropertyServiceError } from '../../src/modules/properties/service.js';

const provider = '0123456789abcdef01234567';
const other = '1123456789abcdef01234567';
const id = '2123456789abcdef01234567';
const location = '3123456789abcdef01234567';
const admin = '4123456789abcdef01234567';
const now = new Date('2026-08-14T08:00:00.000Z');
const claims = (sub = provider, status: 'verified' | 'pending_review' = 'verified') => ({ sub, role: 'provider', status, iss: 'sadat-real-estate-api', aud: 'sadat-real-estate', sid: '4123456789abcdef01234567', iat: 1, exp: 2, jti: 'j' } as AccessTokenClaims);

test('saves all administrative editor fields together with one version and rejects invalid or stale writes', async () => {
  const { service, rows } = fixture();
  rows.set(id, record({ status: 'published', version: 3 }));
  const context = { requestId: 'unified-admin-edit', traceId: 'a'.repeat(32) };
  const input = { version: 3, reason: 'Administrative property edit', name: { en: 'Updated apartment' }, description: { en: 'Updated description' }, transactionType: 'rent', area: { value: 145, unit: 'sqm' }, layout: { bedrooms: 3, bathrooms: 2, floor: 4, totalFloors: 9 }, price: { amount: 2000, currency: 'EGP' } };
  await assert.rejects(service.adminEdit(other, id, input, context), error => error instanceof PropertyServiceError && error.code === 'PROPERTY_FORBIDDEN');
  await assert.rejects(service.adminEdit(admin, id, { ...input, price: { amount: -1, currency: 'EGP' } }, context));
  assert.equal(rows.get(id)?.version, 3);
  assert.equal(rows.get(id)?.name.en, 'Apartment');
  const saved = await service.adminEdit(admin, id, input, context);
  assert.equal(saved.version, 4);
  assert.equal(saved.name.en, 'Updated apartment');
  assert.deepEqual(saved.layout, input.layout);
  assert.deepEqual(saved.area, input.area);
  assert.deepEqual(saved.price, input.price);
  assert.equal(saved.description?.en, input.description.en);
  assert.equal(saved.status, 'published');
  assert.ok(saved.availableActions.includes('update'));
  await assert.rejects(service.adminEdit(admin, id, { ...input, name: { en: 'Stale overwrite' } }, context), error => error instanceof PropertyServiceError && error.code === 'PROPERTY_VERSION_CONFLICT');
  assert.equal(rows.get(id)?.name.en, 'Updated apartment');
  rows.set(id, record({ status: 'archived', version: 4 }));
  await assert.rejects(service.adminEdit(admin, id, { ...input, version: 4 }, context), error => error instanceof PropertyServiceError && error.code === 'PROPERTY_INVALID_STATE');
});

function record(overrides: Partial<StoredProperty> = {}): StoredProperty {
  return { id, providerId: provider, source: { providerId: provider, sourceType: 'individual_broker' }, kind: 'property', name: { en: 'Apartment' }, slug: 'apartment', transactionType: 'sale', status: 'draft', active: true, version: 0, createdAt: now, updatedAt: now, ...overrides };
}

function fixture(ready = false, settings?: { requiresAdminReview: boolean; publicationAfterApproval: 'automatic' | 'manual'; automaticExpiry?: 'never' | '30_days' | '60_days' | '90_days' }) {
  const rows = new Map([[id, record(ready ? { locationId: location, price: { amount: 1000000, currency: 'EGP' }, contact: { phone: '+201234567890' } } : {})]]);
  const repository: PropertyRepository = {
    async updateAdministrative(input) {
      const current = rows.get(input.id);
      if (!current || current.providerId !== input.providerId) return { kind: 'not_found' };
      if (current.version !== input.expectedVersion) return { kind: 'version_conflict' };
      const changes = Object.fromEntries(Object.entries(input.changes).filter(([key]) => key !== 'version' && key !== 'reason'));
      const next = { ...current, ...changes, version: current.version + 1, updatedAt: input.metadata.changedAt };
      rows.set(input.id, next);
      return { kind: 'written', property: next };
    },
    async findOwned(owner, target) { const property = rows.get(target); return property?.providerId === owner ? property : null; },
    async findByIdAny(target) { return rows.get(target) ?? null; },
    async listOwned(owner, query) { const items = [...rows.values()].filter(property => property.providerId === owner && (!query.status || property.status === query.status)); return { items: items.slice((query.page - 1) * query.limit, query.page * query.limit), total: items.length }; },
    async listAdmin(query) { const items = [...rows.values()].filter(property => (!query.status || property.status === query.status) && (query.providerId === undefined || property.providerId === query.providerId)); return { items: items.slice((query.page - 1) * query.limit, query.page * query.limit), total: items.length }; },
    async findPotentialDuplicates(target, limit) { if (!rows.has(target)) return null; const current = rows.get(target)!; const items = [...rows.values()].filter(property => property.id !== target && property.status !== 'archived' && (property.slug === current.slug || (property.locationId && property.locationId === current.locationId && property.transactionType === current.transactionType) || Object.values(property.name).some(name => Object.values(current.name).some(otherName => name && otherName && name.trim().toLowerCase() === otherName.trim().toLowerCase())))).slice(0, limit).map(property => ({ candidateId: property.id, signals: ['same_slug'] as const, explanation: 'Deterministic signals: same_slug' })); return { propertyId: target, items, total: items.length }; },
    async create(input) { const property = record({ ...input.property, id: '5123456789abcdef01234567', version: 0, createdAt: input.metadata.changedAt, updatedAt: input.metadata.changedAt }); rows.set(property.id, property); return { kind: 'written', property }; },
    async updateCore(input) {
      const current = rows.get(input.id);
      if (!current || current.providerId !== input.providerId) return { kind: 'not_found' };
      if (current.version !== input.expectedVersion) return { kind: 'version_conflict' };
      const changes = Object.fromEntries(Object.entries(input.changes).filter(([key]) => key !== 'version' && key !== 'reason'));
      const next = { ...current, ...changes, ...(changes.projectId === null ? { projectId: undefined } : {}), ...(changes.parentPropertyId === null ? { parentPropertyId: undefined } : {}), version: current.version + 1, updatedAt: input.metadata.changedAt };
      rows.set(input.id, next);
      return { kind: 'written', property: next };
    },
    async updateLocation(input) {
      const current = rows.get(input.id);
      if (!current || current.providerId !== input.providerId) return { kind: 'not_found' };
      if (current.version !== input.expectedVersion) return { kind: 'version_conflict' };
      if (input.changes.locationId === location && input.changes.coordinates?.latitude === 0) return { kind: 'location_not_found' };
      const changes = Object.fromEntries(Object.entries(input.changes).filter(([key]) => key !== 'version' && key !== 'reason'));
      const next = { ...current, ...changes, ...(changes.locationId === null ? { locationId: undefined } : {}), ...(changes.coordinates === null ? { coordinates: undefined } : {}), version: current.version + 1, updatedAt: input.metadata.changedAt };
      rows.set(input.id, next);
      return { kind: 'written', property: next };
    },
    async updateDetails(input) {
      const current = rows.get(input.id);
      if (!current || current.providerId !== input.providerId) return { kind: 'not_found' };
      if (current.version !== input.expectedVersion) return { kind: 'version_conflict' };
      const changes = Object.fromEntries(Object.entries(input.changes).filter(([key]) => key !== 'version' && key !== 'reason'));
      const next = { ...current, ...changes, ...(changes.description === null ? { description: undefined } : {}), ...(changes.area === null ? { area: undefined } : {}), version: current.version + 1, updatedAt: input.metadata.changedAt };
      rows.set(input.id, next);
      return { kind: 'written', property: next };
    },
    async updatePricing(input) {
      const current = rows.get(input.id);
      if (!current || current.providerId !== input.providerId) return { kind: 'not_found' };
      if (current.version !== input.expectedVersion) return { kind: 'version_conflict' };
      const changes = Object.fromEntries(Object.entries(input.changes).filter(([key]) => key !== 'version' && key !== 'reason'));
      const next = { ...current, ...changes, version: current.version + 1, updatedAt: input.metadata.changedAt };
      rows.set(input.id, next);
      return { kind: 'written', property: next };
    },
    async updateFeaturesServices(input) {
      const current = rows.get(input.id);
      if (!current || current.providerId !== input.providerId) return { kind: 'not_found' };
      if (current.version !== input.expectedVersion) return { kind: 'version_conflict' };
      const changes = Object.fromEntries(Object.entries(input.changes).filter(([key]) => key !== 'version' && key !== 'reason'));
      const next = { ...current, ...changes, version: current.version + 1, updatedAt: input.metadata.changedAt };
      rows.set(input.id, next);
      return { kind: 'written', property: next };
    },
    async updateContact(input) {
      const current = rows.get(input.id);
      if (!current || current.providerId !== input.providerId) return { kind: 'not_found' };
      if (current.version !== input.expectedVersion) return { kind: 'version_conflict' };
      const changes = Object.fromEntries(Object.entries(input.changes).filter(([key]) => key !== 'version' && key !== 'reason'));
      const next = { ...current, ...changes, ...(changes.contact === null ? { contact: undefined } : {}), version: current.version + 1, updatedAt: input.metadata.changedAt };
      rows.set(input.id, next);
      return { kind: 'written', property: next };
    },
    async submit(input) {
      const current = rows.get(input.id);
      if (!current || current.providerId !== input.providerId) return { kind: 'not_found' };
      if (current.status === 'pending_review') return { kind: 'already_submitted', property: current };
      if (current.version !== input.expectedVersion) return { kind: 'version_conflict' };
      const targetStatus = input.targetStatus ?? 'pending_review';
      const next = { ...current, status: targetStatus, submittedAt: input.metadata.changedAt, ...(targetStatus === 'published' ? { publishedAt: input.metadata.changedAt, ...(input.expiresAt ? { expiresAt: input.expiresAt } : {}) } : {}), version: current.version + 1, updatedAt: input.metadata.changedAt };
      rows.set(input.id, next);
      return { kind: 'written', property: next };
    },
    async review(input) {
      const current = rows.get(input.id);
      if (!current) return { kind: 'not_found' };
      if (current.version !== input.expectedVersion) return { kind: 'version_conflict' };
      if ((input.toStatus === 'published' && !['approved', 'pending_review'].includes(current.status)) || (input.toStatus !== 'published' && current.status !== 'pending_review')) return { kind: 'invalid_state' };
      const next = { ...current, status: input.toStatus, active: input.toStatus === 'published', reviewedBy: input.reviewerId, reviewedAt: input.metadata.changedAt, reviewReason: input.metadata.reason, ...(input.toStatus === 'published' ? { publishedAt: input.metadata.changedAt, ...(input.expiresAt ? { expiresAt: input.expiresAt } : {}) } : {}), version: current.version + 1, updatedAt: input.metadata.changedAt };
      rows.set(input.id, next);
      return { kind: 'written', property: next };
    },
    async visibility(input) {
      const current = rows.get(input.id);
      if (!current) return { kind: 'not_found' };
      if (current.version !== input.expectedVersion) return { kind: 'version_conflict' };
      const valid = input.action === 'hide' ? ['published', 'approved'].includes(current.status) : input.action === 'restore' ? current.status === 'hidden' : current.status !== 'archived';
      if (!valid) return { kind: 'invalid_state' };
      const status = input.action === 'hide' ? 'hidden' : input.action === 'restore' ? 'published' : 'archived';
      const next = { ...current, status: status as StoredProperty['status'], active: input.action === 'restore', ...(input.action === 'restore' ? { publishedAt: input.metadata.changedAt, ...(input.expiresAt ? { expiresAt: input.expiresAt } : {}) } : {}), version: current.version + 1, updatedAt: input.metadata.changedAt };
      rows.set(input.id, next);
      return { kind: 'written', property: next };
    }
  };
  return { service: createPropertyService({ repository, authorization: { async authorize(id, permission) { return id === admin && ['admin:properties.view', 'admin:properties.review', 'admin:properties.manage'].includes(permission); } }, ...(settings ? { settings: { async read() { return { requiresAdminReview: settings.requiresAdminReview, publicationAfterApproval: settings.publicationAfterApproval, automaticExpiry: settings.automaticExpiry ?? 'never', maxImages: 50, acceptedImageMimes: ['image/jpeg' as const, 'image/png' as const], maxImageBytes: 10 * 1024 * 1024, hideProviderContact: true, contactVisibility: 'authenticated' as const }; } } } : {}), now: () => now }), rows };
}

test('creates provider-owned drafts and saves core/location steps with optimistic versions', async () => {
  const { service } = fixture();
  const created = await service.create(claims(), { name: { en: 'New apartment' }, slug: 'new-apartment', transactionType: 'rent', source: { providerId: provider, sourceType: 'individual_broker' }, reason: 'Create property draft' }, { requestId: 'property-1', traceId: 'a'.repeat(32) });
  assert.equal(created.status, 'draft');
  assert.equal(created.source.providerId, provider);
  const updated = await service.saveStep(claims(), id, 'basic', { version: 0, name: { en: 'Updated apartment' }, reason: 'Save basic property data' }, { requestId: 'property-2', traceId: 'b'.repeat(32) });
  assert.equal(updated.version, 1);
  const located = await service.saveStep(claims(), id, 'location', { version: 1, locationId: location, mapUrl: 'https://maps.google.com/?q=Sadat+City', coordinates: { latitude: 30.62, longitude: 30.74 }, reason: 'Save property location' }, { requestId: 'property-3', traceId: 'c'.repeat(32) });
  assert.equal(located.locationId, location);
  assert.equal(located.mapUrl, 'https://maps.google.com/?q=Sadat+City');
  assert.deepEqual(located.coordinates, { latitude: 30.62, longitude: 30.74 });
  const details = await service.saveStep(claims(), id, 'details', { version: 2, deliveryStatus: 'ready_to_move', area: { value: 85, unit: 'sqm' }, layout: { bedrooms: 2, bathrooms: 1, floor: 2, totalFloors: 5 }, reason: 'Save property details' }, { requestId: 'property-8', traceId: '1'.repeat(32) });
  assert.equal(details.area?.value, 85);
  assert.equal(details.deliveryStatus, 'ready_to_move');
  const priced = await service.saveStep(claims(), id, 'price-payment', { version: 3, price: { amount: 1_000_000, currency: 'EGP' }, paymentPlans: [{ name: { en: 'Plan' }, installments: 12, frequency: 'monthly', installmentAmount: { amount: 80_000, currency: 'EGP' } }], reason: 'Save property pricing' }, { requestId: 'property-9', traceId: '2'.repeat(32) });
  assert.equal(priced.price?.currency, 'EGP');
  assert.equal(priced.paymentPlans?.[0]?.installments, 12);
  const tagged = await service.saveStep(claims(), id, 'features-services', { version: 4, featureIds: ['6123456789abcdef01234567'], serviceIds: ['7123456789abcdef01234567'], reason: 'Save property features' }, { requestId: 'property-10', traceId: '3'.repeat(32) });
  assert.deepEqual(tagged.featureIds, ['6123456789abcdef01234567']);
  const contacted = await service.saveStep(claims(), id, 'contact', { version: 5, contact: { contactName: 'Property desk', phone: '+201234567890', preferredLocale: 'ar' }, reason: 'Save property contact' }, { requestId: 'property-11', traceId: '4'.repeat(32) });
  assert.equal(contacted.contact?.phone, '+201234567890');
});

test('saves optional features empty and clears previous selections without blocking the draft', async () => {
  const { service } = fixture();
  const metadata = { requestId: 'optional-features', traceId: '3'.repeat(32) };
  const empty = await service.saveStep(claims(), id, 'features-services', { version: 0, featureIds: [], serviceIds: [], reason: 'Continue without optional features' }, metadata);
  assert.deepEqual(empty.featureIds, []);
  assert.deepEqual(empty.serviceIds, []);
  const selected = await service.saveStep(claims(), id, 'features-services', { version: 1, featureIds: ['6123456789abcdef01234567'], serviceIds: [], reason: 'Select elevator' }, metadata);
  assert.equal(selected.featureIds?.length, 1);
  const cleared = await service.saveStep(claims(), id, 'features-services', { version: 2, featureIds: [], serviceIds: [], reason: 'Remove optional selections' }, metadata);
  assert.deepEqual(cleared.featureIds, []);
  assert.equal(cleared.status, 'draft');
});

test('lists only owned properties with bounded filters and state-derived actions', async () => {
  const { service } = fixture();
  const result = await service.list(claims(), { status: 'draft', page: 1, limit: 20, sort: 'updatedAt', direction: 'desc' });
  assert.equal(result.total, 1);
  assert.deepEqual(result.data.items[0]?.availableActions, ['update', 'submit']);
  const otherResult = await service.list(claims(other), { page: 1, limit: 20, sort: 'updatedAt', direction: 'desc' });
  assert.equal(otherResult.total, 0);
  await assert.rejects(service.list(claims(provider, 'pending_review'), { page: 1, limit: 20, sort: 'updatedAt', direction: 'desc' }), error => error instanceof PropertyServiceError && error.code === 'PROPERTY_FORBIDDEN');
});

test('admin list requires view permission and exposes safe state actions', async () => {
  const { service } = fixture();
  const result = await service.adminList(admin, { status: 'draft', page: 1, limit: 20, sort: 'updatedAt', direction: 'desc' });
  assert.deepEqual(result.data.items[0]?.availableActions, ['archive', 'update']);
  await assert.rejects(service.adminList(other, { page: 1, limit: 20, sort: 'updatedAt', direction: 'desc' }), error => error instanceof PropertyServiceError && error.code === 'PROPERTY_FORBIDDEN');
});

test('admin detail requires view permission and returns the requested record with admin actions', async () => {
  const { service } = fixture();
  const result = await service.adminGet(admin, id);
  assert.equal(result.id, id);
  assert.deepEqual(result.availableActions, ['archive', 'update']);
  await assert.rejects(service.adminGet(other, id), error => error instanceof PropertyServiceError && error.code === 'PROPERTY_FORBIDDEN');
  await assert.rejects(service.adminGet(admin, '8123456789abcdef01234567'), error => error instanceof PropertyServiceError && error.code === 'PROPERTY_NOT_FOUND');
});

test('admin list tolerates legacy payment-plan records while preserving valid rows', async () => {
  const { service, rows } = fixture();
  rows.set(id, record({ paymentPlans: [{ downPaymentPercentage: 15 }] as never }));
  const legacyResult = await service.adminList(admin, { page: 1, limit: 20, sort: 'updatedAt', direction: 'desc' });
  assert.equal(legacyResult.data.items.length, 1);
  assert.equal(legacyResult.data.items[0]?.paymentPlans, undefined);

  rows.set(id, record({
    paymentPlans: [{ name: { en: 'Annual plan' }, installments: 12, frequency: 'monthly', installmentAmount: { amount: 80_000, currency: 'EGP' } }]
  }));
  const currentResult = await service.adminList(admin, { page: 1, limit: 20, sort: 'updatedAt', direction: 'desc' });
  assert.equal(currentResult.data.items[0]?.paymentPlans?.[0]?.installments, 12);
});

test('admin duplicate detection returns bounded explainable signals and requires review permission', async () => {
  const { service, rows } = fixture();
  rows.set('8123456789abcdef01234567', record({ id: '8123456789abcdef01234567', slug: 'apartment' }));
  const result = await service.duplicates(admin, { propertyId: id, limit: 20 });
  assert.equal(result.items[0]?.candidateId, '8123456789abcdef01234567');
  assert.deepEqual(result.items[0]?.signals, ['same_slug']);
  await assert.rejects(service.duplicates(other, { propertyId: id, limit: 20 }), error => error instanceof PropertyServiceError && error.code === 'PROPERTY_FORBIDDEN');
});

test('aggregates submission readiness and rejects incomplete or stale submissions', async () => {
  const { service } = fixture();
  const invalid = await service.validate(claims(), id);
  assert.equal(invalid.valid, false);
  assert.deepEqual(invalid.issues.map(issue => issue.path), ['location', 'price', 'contact']);
  await assert.rejects(service.submit(claims(), id, { version: 0, reason: 'Submit incomplete property' }, { requestId: 'property-submit-1', traceId: '5'.repeat(32) }), error => error instanceof PropertyServiceError && error.code === 'PROPERTY_VALIDATION_FAILED');
});

test('rejects unauthenticated or pending providers, IDOR, stale versions, invalid steps, and mass assignment', async () => {
  const { service } = fixture();
  await assert.rejects(service.get(claims(provider, 'pending_review'), id), error => error instanceof PropertyServiceError && error.code === 'PROPERTY_FORBIDDEN');
  await assert.rejects(service.get(claims(other), id), error => error instanceof PropertyServiceError && error.code === 'PROPERTY_NOT_FOUND');
  await assert.rejects(service.saveStep(claims(), id, 'basic', { version: 7, name: { en: 'Stale' }, reason: 'Stale property update' }, { requestId: 'property-4', traceId: 'd'.repeat(32) }), error => error instanceof PropertyServiceError && error.code === 'PROPERTY_VERSION_CONFLICT');
  await assert.rejects(service.saveStep(claims(), id, 'unexpected', { version: 0, name: { en: 'Bad' }, reason: 'Bad property step' }, { requestId: 'property-5', traceId: 'e'.repeat(32) }));
  await assert.rejects(service.create(claims(), { name: { en: 'Invalid' }, slug: 'invalid', transactionType: 'sale', source: { providerId: other, sourceType: 'individual_broker' }, reason: 'Attempt provider mismatch' }, { requestId: 'property-6', traceId: 'f'.repeat(32) }), error => error instanceof PropertyServiceError && error.code === 'PROPERTY_FORBIDDEN');
  await assert.rejects(service.create(claims(), { name: { en: 'Invalid' }, slug: 'invalid', transactionType: 'sale', source: { providerId: provider, sourceType: 'individual_broker' }, reason: 'Reject unknown field', verified: true } as never, { requestId: 'property-7', traceId: '0'.repeat(32) }));
});

test('admin review and visibility transitions require authorization, versions, and reasons', async () => {
  const { service } = fixture(true);
  const context = { requestId: 'property-review-1', traceId: '6'.repeat(32) };
  await assert.rejects(service.review(other, id, { version: 0, action: 'approve', reason: 'Approve property' }, context), error => error instanceof PropertyServiceError && error.code === 'PROPERTY_FORBIDDEN');
  const pending = await service.submit(claims(), id, { version: 0, reason: 'Submit property for review' }, context);
  const approved = await service.review(admin, id, { version: pending.version, action: 'approve', reason: 'Approve reviewed property' }, context);
  assert.equal(approved.status, 'approved');
  const published = await service.review(admin, id, { version: approved.version, action: 'publish', reason: 'Publish approved property' }, context);
  assert.equal(published.status, 'published');
  const hidden = await service.visibility(admin, id, { version: published.version, action: 'hide', reason: 'Hide property temporarily' }, context);
  assert.equal(hidden.status, 'hidden');
  const restored = await service.visibility(admin, id, { version: hidden.version, action: 'restore', reason: 'Restore property visibility' }, context);
  assert.equal(restored.status, 'published');
  const archived = await service.visibility(admin, id, { version: restored.version, action: 'archive', reason: 'Archive property record' }, context);
  assert.equal(archived.status, 'archived');
  await assert.rejects(service.visibility(admin, id, { version: archived.version, action: 'restore', reason: 'Restore archived property' }, context), error => error instanceof PropertyServiceError && error.code === 'PROPERTY_INVALID_STATE');
});

test('preserves the current published version by rejecting provider edits outside revision states', async () => {
  const { service, rows } = fixture();
  rows.set(id, record({ status: 'published', active: true, version: 4 }));
  const original = service;
  await assert.rejects(original.saveStep(claims(), id, 'basic', { version: 4, name: { en: 'Attempted public overwrite' }, reason: 'Attempt public revision' }, { requestId: 'property-revision-1', traceId: '7'.repeat(32) }), error => error instanceof PropertyServiceError && error.code === 'PROPERTY_INVALID_STATE');
  assert.equal(rows.get(id)?.status, 'published');
});

test('publishes a valid provider submission when administrative review is disabled', async () => {
  const { service } = fixture(true, { requiresAdminReview: false, publicationAfterApproval: 'manual' });
  const context = { requestId: 'property-policy-submit', traceId: '8'.repeat(32) };
  const published = await service.submit(claims(), id, { version: 0, reason: 'Publish under the configured property policy' }, context);
  assert.equal(published.status, 'published');
  assert.equal(published.publishedAt, now.toISOString());
});

test('publishes an approved review immediately when automatic publication is configured', async () => {
  const { service, rows } = fixture(true, { requiresAdminReview: true, publicationAfterApproval: 'automatic', automaticExpiry: '30_days' });
  const context = { requestId: 'property-policy-review', traceId: '9'.repeat(32) };
  rows.set(id, record({ status: 'pending_review', active: false }));
  const published = await service.review(admin, id, { version: 0, action: 'approve', reason: 'Approve and publish under policy' }, context);
  assert.equal(published.status, 'published');
  assert.equal(published.publishedAt, now.toISOString());
  assert.equal(published.expiresAt, '2026-09-13T08:00:00.000Z');
});

test('administrators edit published properties with management permission while providers remain restricted', async () => {
  const { service, rows } = fixture(true);
  rows.set(id, record({ status: 'published', name: { en: 'Original title' } }));
  const context = { requestId: 'admin-property-edit', traceId: 'a'.repeat(32) };
  const administrator = { ...claims(admin), role: 'admin' } as AccessTokenClaims;
  await assert.rejects(service.saveStep(claims(), id, 'basic', { version: 0, name: { en: 'Provider edit' }, reason: 'Edit published listing' }, context), error => error instanceof PropertyServiceError && error.code === 'PROPERTY_INVALID_STATE');
  await assert.rejects(service.saveStep({ ...administrator, sub: other }, id, 'basic', { version: 0, name: { en: 'Unauthorized edit' }, reason: 'Edit published listing' }, context), error => error instanceof PropertyServiceError && error.code === 'PROPERTY_FORBIDDEN');
  const saved = await service.saveStep(administrator, id, 'basic', { version: 0, name: { en: 'Revised title' }, reason: 'Correct published title' }, context);
  assert.equal(saved.status, 'published'); assert.equal(saved.name.en, 'Revised title'); assert.equal(saved.source.providerId, provider);
  await assert.rejects(service.saveStep(administrator, id, 'basic', { version: 0, name: { en: 'Stale edit' }, reason: 'Replay obsolete version' }, context), error => error instanceof PropertyServiceError && error.code === 'PROPERTY_VERSION_CONFLICT');
});
