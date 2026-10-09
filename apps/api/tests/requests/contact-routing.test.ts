import test from 'node:test';
import assert from 'node:assert/strict';
import { Types, type Connection } from 'mongoose';
import { directContactNotification, routeContact } from '../../src/modules/requests/contact-routing.js';
import { createInMemoryRequestRepository, createRequestService, type RequestRecord } from '../../src/modules/requests/service.js';

const oid = (letter: string) => new Types.ObjectId(letter.repeat(24));
const org = { _id: oid('a'), providerId: oid('b'), name: { ar: 'الشركة', en: 'Company' }, slug: 'company' };
const profile = { userId: oid('c') };
const base: RequestRecord = { id: 'f'.repeat(24), type: 'contact', source: 'seeker', seekerId: 'd'.repeat(24), status: 'new', payload: { organizationId: String(org._id), contactChannel: 'provider', message: 'Hello' }, version: 0, createdAt: new Date(), updatedAt: new Date() };
function connection(approved = true): Connection {
  return { collection(name: string) { return { async findOne(filter: Record<string, unknown>) {
    if (name === 'organizations') { assert.equal(filter.status, 'approved'); return approved ? org : null; }
    if (name === 'provider_profiles') { assert.equal(filter.status, 'approved'); return profile; }
    if (name === 'users') { assert.equal(filter.status, 'verified'); return { _id: oid('c') }; }
    if (name === 'properties') return { providerId: oid('b'), organizationId: oid('a') };
    return null;
  } }; } } as unknown as Connection;
}
test('direct company inquiries resolve the verified owner on the server and create a provider notification', async () => {
  const routed = await routeContact(connection(), base);
  assert.equal(routed.providerId, 'c'.repeat(24));
  assert.equal(routed.payload.organizationNameEn, 'Company');
  assert.equal(directContactNotification(routed)?.audience, 'provider');
  assert.equal(String(directContactNotification(routed)?.recipientId), routed.providerId);
});
test('platform-mediated inquiries stay out of the provider inbox, and unapproved or forged targets are rejected', async () => {
  const routed = await routeContact(connection(), { ...base, payload: { ...base.payload, contactChannel: 'platform' } });
  assert.equal(routed.providerId, undefined);
  assert.equal(directContactNotification(routed), undefined);
  await assert.rejects(routeContact(connection(false), base), /REQUEST_NOT_FOUND/u);
  await assert.rejects(routeContact(connection(), { ...base, propertyId: 'e'.repeat(24), payload: { ...base.payload, organizationId: 'f'.repeat(24) } }), /REQUEST_NOT_FOUND/u);
  await assert.rejects(routeContact(connection(), { ...base, projectId: 'e'.repeat(24) }), /REQUEST_NOT_FOUND/u);
});
test('only the receiving provider can read, update and send customer replies for a direct inquiry', async () => {
  const routed = await routeContact(connection(), base);
  const service = createRequestService({ repository: createInMemoryRequestRepository([routed]) });
  const provider = { sub: 'c'.repeat(24), role: 'provider', status: 'verified' } as const;
  assert.equal((await service.list(provider, {})).total, 1);
  await assert.rejects(service.get({ ...provider, sub: 'e'.repeat(24) }, base.id), /REQUEST_NOT_FOUND/u);
  const result = await service.transition(provider, base.id, { transition: 'contact', expectedVersion: 0, customerMessage: 'We will call tomorrow' });
  assert.equal(result.status, 'contacted');
  assert.equal(result.customerUpdates?.[0]?.message, 'We will call tomorrow');
  assert.equal((await service.get({ ...provider, sub: base.seekerId!, role: 'seeker' }, base.id)).customerUpdates?.[0]?.message, 'We will call tomorrow');
});

test('platform property inquiries work without an active company recipient or matching company project', async () => {
  const request = { ...base, propertyId: 'e'.repeat(24), projectId: '1'.repeat(24), payload: { ...base.payload, projectId: '1'.repeat(24), contactChannel: 'platform' } };
  for (const company of [org, { ...org, providerId: undefined }, null]) {
    const queried: string[] = [];
    const database = { collection(name: string) { return { async findOne() {
      queried.push(name);
      if (name === 'properties') return { providerId: oid('b'), organizationId: oid('a'), projectId: oid('1') };
      if (name === 'organizations') return company;
      return null;
    } }; } } as unknown as Connection;
    const routed = await routeContact(database, request);
    assert.equal(routed.providerId, undefined);
    assert.equal(routed.projectId, request.projectId);
    assert.equal(directContactNotification(routed), undefined);
    assert.deepEqual(queried, ['properties', 'organizations']);
    await assert.rejects(routeContact(database, { ...request, projectId: '2'.repeat(24) }), /REQUEST_NOT_FOUND/u);
    await assert.rejects(routeContact(database, { ...request, payload: { ...request.payload, organizationId: '2'.repeat(24) } }), /REQUEST_NOT_FOUND/u);
    await assert.rejects(routeContact(database, { ...request, payload: { ...request.payload, contactChannel: 'provider' } }), /REQUEST_NOT_FOUND/u);
  }
});
