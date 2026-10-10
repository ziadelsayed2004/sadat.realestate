import { acknowledgedDeveloperVisibility } from '../helpers/acknowledged-developer.js';
import assert from 'node:assert/strict';
import test from 'node:test';
import type { AccessTokenClaims } from '../../src/modules/auth/crypto.js';
import { createInMemoryRequestRepository, createRequestService } from '../../src/modules/requests/service.js';

const seeker = { iss: 'sadat-real-estate-api', aud: 'sadat-real-estate', sub: '0123456789abcdef01234567', sid: '1123456789abcdef01234567', role: 'seeker', status: 'verified', iat: 1, exp: 9999999999, jti: 'test' } as AccessTokenClaims;
const provider = { ...seeker, sub: '2123456789abcdef01234567', role: 'provider' } as AccessTokenClaims;
const admin = { ...seeker, sub: '3123456789abcdef01234567', role: 'admin' } as AccessTokenClaims;

test('providers send inquiries as themselves and retain only requester permissions on sent inquiries', async () => {
  const repository = createInMemoryRequestRepository();
  const recipient = { ...provider, sub: '4'.repeat(24) };
  const routedRepository = { ...repository, create: (row: Parameters<typeof repository.create>[0]) => repository.create({ ...row, providerId: recipient.sub }) };
  const service = createRequestService({ visibility: acknowledgedDeveloperVisibility, repository: routedRepository, authorization: { authorize: async () => true } });
  const sent = await service.createContact(provider, { message: 'Interested in your project', contactChannel: 'provider' });
  assert.equal(sent.source, 'provider');
  assert.equal(sent.creatorId, provider.sub);
  assert.equal(sent.seekerId, undefined);
  assert.equal(sent.providerId, recipient.sub);
  assert.deepEqual(sent.availableActions, ['cancel']);
  assert.equal((await service.list(provider, {})).total, 1);
  const incoming = await service.get(recipient, sent.id);
  assert.equal(incoming.creatorId, undefined);
  assert.ok(incoming.availableActions.includes('contact'));
  await assert.rejects(service.get({ ...provider, sub: '5'.repeat(24) }, sent.id), /REQUEST_NOT_FOUND/u);
  await assert.rejects(service.transition(provider, sent.id, { transition: 'contact', expectedVersion: 0 }), /REQUEST_INVALID_STATE/u);
  await service.transition(recipient, sent.id, { transition: 'start_review', expectedVersion: 0 });
  await service.transition(recipient, sent.id, { transition: 'needs_information', reason: 'Please provide details', customerMessage: 'What is your budget?', expectedVersion: 1 });
  assert.deepEqual((await service.get(provider, sent.id)).availableActions, ['start_review', 'cancel']);
  await assert.rejects(service.transition(provider, sent.id, { transition: 'start_review', expectedVersion: 2 }), /REQUEST_INVALID_STATE/u);
  const updated = await service.transition(provider, sent.id, { transition: 'start_review', customerMessage: 'Two million', expectedVersion: 2 });
  assert.equal(updated.customerUpdates?.at(-1)?.authorRole, 'provider');
  assert.deepEqual(updated.availableActions, ['cancel']);
  assert.equal((await service.get(recipient, sent.id)).customerUpdates?.at(-1)?.message, 'Two million');
});

test('platform inquiries remain accessible to their provider sender without a direct recipient', async () => {
  const service = createRequestService({ visibility: acknowledgedDeveloperVisibility, repository: createInMemoryRequestRepository() });
  const sent = await service.createContact(provider, { message: 'Please find this property', contactChannel: 'platform' });
  assert.equal(sent.providerId, undefined);
  assert.equal((await service.get(provider, sent.id)).id, sent.id);
  assert.equal((await service.list(provider, {})).total, 1);
  await assert.rejects(service.createContact(admin, { message: 'Admin inquiry' }), /REQUEST_FORBIDDEN/u);
});

test('creates discriminated requests and prevents client-controlled state or metadata', async () => {
  const service = createRequestService({ visibility: acknowledgedDeveloperVisibility, authorization: { authorize: async () => true }, repository: createInMemoryRequestRepository(), now: () => new Date('2026-08-14T10:00:00.000Z') });
  const created = await service.create(seeker, { type: 'contact', payload: { message: 'Please contact me' } });
  assert.equal(created.type, 'contact'); assert.equal(created.status, 'new'); assert.equal(created.seekerId, seeker.sub); assert.equal(created.version, 0);
  await assert.rejects(() => service.create(seeker, { type: 'contact', payload: { message: 'x' }, status: 'resolved' }), /Unrecognized key/);
  await assert.rejects(() => service.create(provider, { type: 'property_search', payload: { locations: [], propertyTypes: ['apartment'] } }), error => (error as { code?: string }).code === 'REQUEST_FORBIDDEN');
});

test('lets the owner supply requested information and return the same request for review', async () => {
  const service = createRequestService({ visibility: acknowledgedDeveloperVisibility, authorization: { authorize: async () => true }, repository: createInMemoryRequestRepository() });
  const original = await service.create(seeker, { type: 'contact', payload: { message: 'Please contact me' } });
  await service.transition(admin, original.id, { transition: 'start_review', reason: 'Review request', expectedVersion: 0 });
  await service.transition(admin, original.id, { transition: 'needs_information', reason: 'More details required', customerMessage: 'What is your budget?', expectedVersion: 1 });
  assert.deepEqual((await service.get(seeker, original.id)).availableActions, ['start_review', 'cancel']);
  const reply = { transition: 'start_review', customerMessage: 'My budget is 2 million.\nPlease call in the morning.', expectedVersion: 2 };
  await assert.rejects(service.transition({ ...seeker, sub: '9'.repeat(24) }, original.id, reply), /REQUEST_NOT_FOUND/u);
  await assert.rejects(service.transition(seeker, original.id, { transition: 'start_review', expectedVersion: 2 }), /REQUEST_INVALID_STATE/u);
  await assert.rejects(service.transition(seeker, original.id, { ...reply, expectedVersion: 1 }), /REQUEST_VERSION_CONFLICT/u);
  await assert.rejects(service.transition(seeker, original.id, { ...reply, authorRole: 'admin' }), /Unrecognized key/u);
  const updated = await service.transition(seeker, original.id, reply);
  assert.equal(updated.id, original.id);
  assert.equal(updated.status, 'under_review');
  assert.equal(updated.version, 3);
  assert.deepEqual(updated.payload, original.payload);
  assert.equal(updated.customerUpdates?.at(-1)?.authorRole, 'seeker');
  assert.equal((await service.get(admin, original.id)).customerUpdates?.at(-1)?.message, reply.customerMessage);
  assert.deepEqual(updated.availableActions, ['cancel']);
  await assert.rejects(service.transition(seeker, original.id, { ...reply, expectedVersion: 3 }), /REQUEST_FORBIDDEN/u);
});

test('enforces ownership, deterministic listing, and optimistic state transitions', async () => {
  const repository = createInMemoryRequestRepository(); const service = createRequestService({ visibility: acknowledgedDeveloperVisibility, authorization: { authorize: async () => true }, repository, now: () => new Date('2026-08-14T10:00:00.000Z') });
  const created = await service.create(seeker, { type: 'property_search', payload: { locations: [], propertyTypes: ['apartment'], minBudget: 10, maxBudget: 20 } });
  assert.equal((await service.list(seeker, { page: 1, limit: 20 })).total, 1);
  await assert.rejects(() => service.get(provider, created.id), error => (error as { code?: string }).code === 'REQUEST_NOT_FOUND');
  const updated = await service.transition(admin, created.id, { transition: 'start_review', reason: 'Review request', expectedVersion: 0 }); assert.equal(updated.status, 'under_review'); assert.equal(updated.version, 1);
  const seekerView = await service.get(seeker, created.id);
  assert.deepEqual(seekerView.availableActions, ['cancel']);
  await assert.rejects(() => service.transition(seeker, created.id, { transition: 'contact', expectedVersion: 1 }), error => (error as { code?: string }).code === 'REQUEST_INVALID_STATE');
  await assert.rejects(() => service.transition(admin, created.id, { transition: 'contact', reason: 'Contact requested', expectedVersion: 0 }), error => (error as { code?: string }).code === 'REQUEST_VERSION_CONFLICT');
});

test('continues review through contact and resolution while exposing only deliberate customer messages', async () => {
  const repository = createInMemoryRequestRepository(); const service = createRequestService({ visibility: acknowledgedDeveloperVisibility, authorization: { authorize: async () => true }, repository });
  const created = await service.create(seeker, { type: 'contact', payload: { message: 'Contact please' } });
  const reviewed = await service.transition(admin, created.id, { transition: 'start_review', reason: 'Private administration reason', customerMessage: 'We are reviewing your request', expectedVersion: 0 });
  assert.deepEqual(reviewed.availableActions, ['start_progress', 'contact', 'needs_information', 'cancel']);
  const contacted = await service.transition(admin, created.id, { transition: 'contact', reason: 'Called the customer', customerMessage: 'Our team contacted you', expectedVersion: 1 });
  const resolved = await service.transition(admin, created.id, { transition: 'resolve', reason: 'Follow-up completed', expectedVersion: contacted.version });
  const own = await service.get(seeker, resolved.id);
  assert.deepEqual(own.customerUpdates?.map(update => update.status), ['under_review', 'contacted', 'resolved']);
  assert.equal(own.customerUpdates?.[0]?.message, 'We are reviewing your request');
  assert.equal(JSON.stringify(own).includes('Private administration reason'), false);
  await assert.rejects(service.transition(seeker, created.id, { transition: 'cancel', reason: 'Cancel please', customerMessage: 'Forged admin message', expectedVersion: own.version }), error => (error as { code?: string }).code === 'REQUEST_FORBIDDEN');
});

test('stores bounded locale-neutral search criteria without fabricating matches', async () => {
  const service = createRequestService({ visibility: acknowledgedDeveloperVisibility, authorization: { authorize: async () => true }, repository: createInMemoryRequestRepository(), now: () => new Date('2026-08-14T10:00:00.000Z') });
  const created = await service.create(seeker, { type: 'property_search', payload: { locations: ['4123456789abcdef01234567'], propertyTypes: ['apartment'], minBudget: 100, maxBudget: 500, minBedrooms: 1, maxBedrooms: 3, locale: 'ar' } });
  assert.deepEqual(created.payload, { locations: ['4123456789abcdef01234567'], propertyTypes: ['apartment'], minBudget: 100, maxBudget: 500, minBedrooms: 1, maxBedrooms: 3, locale: 'ar' });
  await assert.rejects(() => service.create(seeker, { type: 'property_search', payload: { locations: [], propertyTypes: [], minBudget: 900, maxBudget: 100 } }), /maxBudget/);
  assert.equal('matchScore' in created.payload, false);
});

test('allows provider-owned customer requests without seeker impersonation or mass assignment', async () => {
  const service = createRequestService({ visibility: acknowledgedDeveloperVisibility, authorization: { authorize: async () => true }, repository: createInMemoryRequestRepository(), now: () => new Date('2026-08-14T10:00:00.000Z') });
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

test('accepts a contact request under review as follow-up without claiming a call occurred', async () => {
  const service = createRequestService({ visibility: acknowledgedDeveloperVisibility, authorization: { authorize: async () => true }, repository: createInMemoryRequestRepository() });
  const created = await service.create(seeker, { type: 'contact', payload: { message: 'Please contact me' } });
  const reviewed = await service.transition(admin, created.id, { transition: 'start_review', reason: 'Review started', expectedVersion: created.version });
  await assert.rejects(service.transition(admin, created.id, { transition: 'start_progress', reason: 'Accepted for follow-up', expectedVersion: created.version }), error => (error as { code?: string }).code === 'REQUEST_VERSION_CONFLICT');
  const accepted = await service.transition(admin, created.id, { transition: 'start_progress', reason: 'Accepted for follow-up', customerMessage: 'Your request was accepted', expectedVersion: reviewed.version });
  assert.equal(accepted.status, 'in_progress');
  assert.deepEqual(accepted.customerUpdates?.map(item => item.status), ['under_review', 'in_progress']);
  assert.equal((await service.get(seeker, created.id)).customerUpdates?.at(-1)?.message, 'Your request was accepted');
});

test('contact acceptance remains restricted to administrative management and does not expand other request workflows', async () => {
  const repository = createInMemoryRequestRepository();
  const service = createRequestService({ visibility: acknowledgedDeveloperVisibility, repository, authorization: { authorize: async (_id, permission) => permission !== 'admin:requests.manage' } });
  const created = await service.create(seeker, { type: 'contact', payload: { message: 'Please contact me' } });
  assert.deepEqual((await service.get(admin, created.id)).availableActions, []);
  await assert.rejects(service.transition(admin, created.id, { transition: 'start_progress', expectedVersion: created.version, reason: 'Accepted for follow-up' }), error => (error as { code?: string }).code === 'REQUEST_FORBIDDEN');
  const manager = createRequestService({ visibility: acknowledgedDeveloperVisibility, repository, authorization: { authorize: async () => true } });
  const search = await manager.create(seeker, { type: 'property_search', payload: { locations: [], propertyTypes: ['apartment'] } });
  const reviewed = await manager.transition(admin, search.id, { transition: 'start_review', expectedVersion: search.version, reason: 'Review search criteria' });
  assert.equal(reviewed.availableActions.includes('start_progress'), false);
  await assert.rejects(manager.transition(admin, search.id, { transition: 'start_progress', expectedVersion: reviewed.version, reason: 'Start follow-up' }), error => (error as { code?: string }).code === 'REQUEST_INVALID_STATE');
});
