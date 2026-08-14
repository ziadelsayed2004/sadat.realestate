import assert from 'node:assert/strict';
import test from 'node:test';
import type { AccessTokenClaims } from '../../src/modules/auth/crypto.js';
import { createInMemoryRequestRepository, createRequestService } from '../../src/modules/requests/service.js';

const seeker = { iss: 'sadat-real-estate-api', aud: 'sadat-real-estate', sub: '0123456789abcdef01234567', sid: '1123456789abcdef01234567', role: 'seeker', status: 'verified', iat: 1, exp: 9999999999, jti: 'test' } as AccessTokenClaims;
const provider = { ...seeker, sub: '2123456789abcdef01234567', role: 'provider' } as AccessTokenClaims;
const admin = { ...seeker, sub: '3123456789abcdef01234567', role: 'admin' } as AccessTokenClaims;

test('creates discriminated requests and prevents client-controlled state or metadata', async () => {
  const service = createRequestService({ repository: createInMemoryRequestRepository(), now: () => new Date('2026-08-14T10:00:00.000Z') });
  const created = await service.create(seeker, { type: 'contact', payload: { message: 'Please contact me' } });
  assert.equal(created.type, 'contact'); assert.equal(created.status, 'new'); assert.equal(created.seekerId, seeker.sub); assert.equal(created.version, 0);
  await assert.rejects(() => service.create(seeker, { type: 'contact', payload: { message: 'x' }, status: 'resolved' }), /Unrecognized key/);
  await assert.rejects(() => service.create(provider, { type: 'contact', payload: { message: 'provider cannot impersonate seeker contact' } }), error => (error as { code?: string }).code === 'REQUEST_FORBIDDEN');
});

test('enforces ownership, deterministic listing, and optimistic state transitions', async () => {
  const repository = createInMemoryRequestRepository(); const service = createRequestService({ repository, now: () => new Date('2026-08-14T10:00:00.000Z') });
  const created = await service.create(seeker, { type: 'property_search', payload: { locations: [], propertyTypes: ['apartment'], minBudget: 10, maxBudget: 20 } });
  assert.equal((await service.list(seeker, { page: 1, limit: 20 })).total, 1);
  await assert.rejects(() => service.get(provider, created.id), error => (error as { code?: string }).code === 'REQUEST_NOT_FOUND');
  const updated = await service.transition(admin, created.id, { transition: 'start_review', expectedVersion: 0 }); assert.equal(updated.status, 'under_review'); assert.equal(updated.version, 1);
  await assert.rejects(() => service.transition(admin, created.id, { transition: 'contact', expectedVersion: 0 }), error => (error as { code?: string }).code === 'REQUEST_VERSION_CONFLICT');
});

test('stores bounded locale-neutral search criteria without fabricating matches', async () => {
  const service = createRequestService({ repository: createInMemoryRequestRepository(), now: () => new Date('2026-08-14T10:00:00.000Z') });
  const created = await service.create(seeker, { type: 'property_search', payload: { locations: ['4123456789abcdef01234567'], propertyTypes: ['apartment'], minBudget: 100, maxBudget: 500, minBedrooms: 1, maxBedrooms: 3, locale: 'ar' } });
  assert.deepEqual(created.payload, { locations: ['4123456789abcdef01234567'], propertyTypes: ['apartment'], minBudget: 100, maxBudget: 500, minBedrooms: 1, maxBedrooms: 3, locale: 'ar' });
  await assert.rejects(() => service.create(seeker, { type: 'property_search', payload: { locations: [], propertyTypes: [], minBudget: 900, maxBudget: 100 } }), /maxBudget/);
  assert.equal('matchScore' in created.payload, false);
});

test('allows provider-owned customer requests without seeker impersonation or mass assignment', async () => {
  const service = createRequestService({ repository: createInMemoryRequestRepository(), now: () => new Date('2026-08-14T10:00:00.000Z') });
  const created = await service.create(provider, {
    type: 'provider_customer',
    payload: {
      firstName: 'Mona',
      lastName: 'Hassan',
      phone: '+201000000000',
      email: 'mona@example.com',
      message: 'Interested in a two-bedroom apartment',
      sourceNote: 'Provider showroom lead'
    }
  });
  assert.equal(created.source, 'provider');
  assert.equal(created.providerId, provider.sub);
  assert.equal('seekerId' in created, false);
  assert.equal(created.payload.sourceNote, 'Provider showroom lead');
  await assert.rejects(() => service.create(seeker, { type: 'provider_customer', payload: { firstName: 'Mona', lastName: 'Hassan', phone: '+201000000000' } }), error => (error as { code?: string }).code === 'REQUEST_FORBIDDEN');
  await assert.rejects(() => service.create(provider, { type: 'provider_customer', payload: { firstName: 'Mona', lastName: 'Hassan', phone: '+201000000000', status: 'resolved' } }), /Unrecognized key/);
});
