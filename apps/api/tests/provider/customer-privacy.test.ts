import assert from 'node:assert/strict';
import test from 'node:test';
import type { AccessTokenClaims } from '../../src/modules/auth/crypto.js';
import { createViewingService, createInMemoryViewingRepository, type ViewingRecord } from '../../src/modules/viewings/service.js';
import { createRequestService, createInMemoryRequestRepository, type RequestRecord } from '../../src/modules/requests/service.js';
import { providerVisibility } from '../../src/modules/provider/visibility.js';
const provider = { sub: '1'.repeat(24), role: 'provider', status: 'verified' } as AccessTokenClaims;
const seeker = { sub: '2'.repeat(24), role: 'seeker', status: 'verified' } as AccessTokenClaims;
const admin = { sub: '3'.repeat(24), role: 'admin', status: 'verified' } as AccessTokenClaims;
const stamp = new Date('2026-10-10T00:00:00Z'), viewingId = '4'.repeat(24), propertyId = '5'.repeat(24), requestId = '6'.repeat(24);
const viewing: ViewingRecord = { id: viewingId, propertyId, seekerId: seeker.sub, providerId: provider.sub, customerName: 'Private customer', customerPhone: '+201012345678', note: 'Call Private customer +201012345678', status: 'requested', requestedAt: new Date('2026-10-11T00:00:00Z'), timezone: 'Africa/Cairo', version: 0, createdAt: stamp, updatedAt: stamp };
const request: RequestRecord = { id: requestId, type: 'contact', source: 'seeker', seekerId: seeker.sub, creatorId: seeker.sub, providerId: provider.sub, propertyId, payload: { fullName: 'Private customer', phone: '+201012345678', email: 'private@example.invalid', message: 'Private text', propertyId }, customerUpdates: [{ status: 'new', message: 'Private update', createdAt: stamp }], status: 'new', version: 0, createdAt: stamp, updatedAt: stamp };
for (const providerType of ['brokerage_office', 'individual_broker', 'developer_company'] as const) test(`${providerType}: hidden incoming requests omit identifiers, text, name and contact; API decisions fail closed`, async () => {
  const visibility = { read: async () => providerVisibility({ accountId: provider.sub, providerType, approved: true, acknowledged: false, subscribed: true }) };
  const viewings = createViewingService({ visibility, repository: createInMemoryViewingRepository([viewing]), now: () => stamp, authorization: { authorize: async () => true } });
  const requests = createRequestService({ visibility, repository: createInMemoryRequestRepository([request]), now: () => stamp, authorization: { authorize: async () => true } });
  for (const result of [(await viewings.list(provider, {})).items[0]!, await viewings.get(provider, viewingId), (await requests.list(provider, {})).items[0]!, await requests.get(provider, requestId)]) {
    assert.equal(result.customerVisibility, 'hidden'); assert.equal(result.seekerId, undefined); assert.equal(JSON.stringify(result).includes('Private'), false); assert.equal(JSON.stringify(result).includes(seeker.sub), false); assert.equal(JSON.stringify(result).includes('+201012345678'), false);
  }
  assert.deepEqual((await viewings.list(provider, {})).items[0]?.availableActions, []);
  await assert.rejects(viewings.transition(provider, viewingId, { action: 'confirm', expectedVersion: 0 }), /VIEWING_FORBIDDEN/);
  await assert.rejects(requests.transition(provider, requestId, { transition: 'contact', expectedVersion: 0 }), /REQUEST_FORBIDDEN/);
  assert.equal((await viewings.get(admin, viewingId)).customerName, 'Private customer');
  assert.equal((await requests.get(admin, requestId)).payload.email, 'private@example.invalid');
  assert.equal((await viewings.cancel(seeker, viewingId, 0)).status, 'cancelled');
});
test('an acknowledged developer sees only customer name/phone, manages its own requests and loses access after policy change', async () => {
  let acknowledged = true;
  const visibility = { read: async () => providerVisibility({ accountId: provider.sub, providerType: 'developer_company', approved: true, acknowledged, subscribed: false }) };
  const viewings = createViewingService({ visibility, repository: createInMemoryViewingRepository([viewing]), now: () => stamp });
  const requests = createRequestService({ visibility, repository: createInMemoryRequestRepository([request]), now: () => stamp });
  const customer = await viewings.get(provider, viewingId); assert.equal(customer.customerName, 'Private customer'); assert.equal(customer.customerPhone, viewing.customerPhone); assert.equal(customer.seekerId, undefined);
  const inquiry = await requests.get(provider, requestId); assert.equal(inquiry.customerVisibility, 'visible'); assert.equal(inquiry.payload.fullName, 'Private customer'); assert.equal(inquiry.payload.email, undefined); assert.equal(inquiry.seekerId, undefined);
  assert.equal((await viewings.transition(provider, viewingId, { action: 'confirm', expectedVersion: 0 })).status, 'confirmed');
  await assert.rejects(viewings.get({ ...provider, sub: '7'.repeat(24) }, viewingId), /VIEWING_NOT_FOUND/);
  await assert.rejects(requests.get({ ...provider, sub: '7'.repeat(24) }, requestId), /REQUEST_NOT_FOUND/);
  acknowledged = false; assert.equal((await viewings.get(provider, viewingId)).customerName, undefined);
  await assert.rejects(viewings.transition(provider, viewingId, { action: 'cancel', expectedVersion: 1 }), /VIEWING_FORBIDDEN/);
});
