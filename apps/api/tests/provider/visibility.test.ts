import { account, application, profile, policyId, database } from '../helpers/provider-identity-db.js';
import assert from 'node:assert/strict';
import test from 'node:test';
import { publicIdentitySubscriptionPutSchema } from '@sadat-real-estate/contracts';
import { createProviderVisibilityReader, identitySubscriptionActive, providerVisibility } from '../../src/modules/provider/visibility.js';
import { createIdentitySubscriptionService } from '../../src/modules/provider/identity-subscription.js';
import type { AuditWriter, AuditRecordInput } from '../../src/modules/audit/writer.js';

test('identity policy fails closed for unknown and unapproved accounts; individuals never subscribe', () => {
  for (const providerType of ['individual_broker', 'brokerage_office', 'developer_company'] as const) {
    assert.equal(providerVisibility({ accountId: account.toHexString(), providerType, approved: false, subscribed: true, acknowledged: true }).publicIdentity, false);
  }
  const individual = providerVisibility({ accountId: account.toHexString(), providerType: 'individual_broker', approved: true, subscribed: true, acknowledged: true });
  assert.deepEqual([individual.publicIdentity, individual.customerIdentity, individual.contact], [false, false, false]);
});
test('paid office visibility is half-open and never reveals customer identity or contact details', () => {
  const row = { status: 'active', paymentConfirmed: true, startAt: new Date('2026-10-10T09:00:00Z'), endAt: new Date('2026-10-10T10:00:00Z') };
  for (const [at, expected] of [['2026-10-10T08:59:59Z', false], ['2026-10-10T09:00:00Z', true], ['2026-10-10T09:59:59Z', true], ['2026-10-10T10:00:00Z', false]] as const) assert.equal(identitySubscriptionActive(row, new Date(at)), expected);
  assert.equal(identitySubscriptionActive({ ...row, status: 'inactive' }, row.startAt), false);
  assert.equal(identitySubscriptionActive({ ...row, paymentConfirmed: false }, row.startAt), false);
  const office = providerVisibility({ accountId: account.toHexString(), providerType: 'brokerage_office', approved: true, subscribed: true, acknowledged: false });
  assert.deepEqual([office.publicIdentity, office.customerIdentity, office.contact], [true, false, false]);
});
test('office defaults hidden, resolves all server-owned identifiers and expires on read without a task', async () => {
  const db = database(); let clock = new Date('2026-10-10T09:00:00Z'); const reader = createProviderVisibilityReader(db.connection, () => clock);
  assert.equal((await reader.read(application.toHexString())).publicIdentity, false);
  db.rows.provider_identity_subscriptions!.push({ _id: account, status: 'active', paymentConfirmed: true, startAt: clock, endAt: new Date('2026-10-10T10:00:00Z') });
  for (const id of [account, profile, application]) assert.equal((await reader.read(id.toHexString())).publicIdentity, true);
  clock = new Date('2026-10-10T10:00:00Z'); assert.equal((await reader.read(application.toHexString())).publicIdentity, false);
  db.rows.users![0]!.status = 'suspended'; assert.equal((await reader.read(application.toHexString())).approved, false);
  assert.equal((await reader.read('unknown')).publicIdentity, false);
});
test('developers need an acknowledgement bound to the current effective source and version', async () => {
  const db = database('developer_company'), reader = createProviderVisibilityReader(db.connection);
  assert.equal((await reader.read(profile.toHexString())).customerIdentity, false);
  db.rows.commission_confirmations!.push({ accountId: account.toHexString(), source: 'policy', sourceRecordId: policyId.toHexString(), policyVersion: 1, status: 'acknowledged' });
  assert.equal((await reader.read(account.toHexString())).customerIdentity, true);
  db.rows.commission_policies![0]!.version = 2;
  assert.equal((await reader.read(account.toHexString())).customerIdentity, false);
  db.rows.commission_confirmations![0]!.policyVersion = 2;
  assert.equal((await reader.read(account.toHexString())).customerIdentity, true);
  db.rows.commission_confirmations![0]!.status = 'revoked';
  assert.equal((await reader.read(account.toHexString())).publicIdentity, false);
});
test('only the independent visibility permission can confirm payment, renew or stop an office', async () => {
  const db = database(); let manage = false; const events: AuditRecordInput[] = [];
  const service = createIdentitySubscriptionService(db.connection, { async authorize(_id, permission) { return permission === 'admin:providers.view' || manage; } }, { async record(input) { events.push(input); } } as AuditWriter);
  const actor = '5'.repeat(24), provider = application.toHexString(), context = { requestId: 'test', traceId: '0'.repeat(32) };
  const body = { status: 'active', paymentConfirmed: true, startAt: '2020-01-01T00:00:00Z', endAt: '2099-01-01T00:00:00Z', expectedVersion: 0 };
  assert.equal((await service.read(actor, provider)).canManage, false);
  await assert.rejects(service.put(actor, provider, body, context), { code: 'FORBIDDEN' });
  manage = true; assert.equal((await service.put(actor, provider, body, context)).visible, true);
  await assert.rejects(service.put(actor, provider, body, context), { code: 'VERSION_CONFLICT' });
  const renewed = await service.put(actor, provider, { ...body, endAt: '2099-02-01T00:00:00Z', expectedVersion: 1 }, context); assert.equal(renewed.version, 2);
  const stopped = await service.put(actor, provider, { status: 'inactive', paymentConfirmed: true, expectedVersion: 2 }, context); assert.equal(stopped.visible, false);
  assert.equal(events.length, 3); assert.equal(events[0]?.actorId, actor); assert.equal((events[2]?.before as Record<string, unknown>).status, 'active'); assert.equal((events[2]?.after as Record<string, unknown>).status, 'inactive');
});
test('individuals cannot receive subscriptions, and activation requires paid valid dates', async () => {
  const db = database('individual_broker'); const service = createIdentitySubscriptionService(db.connection, { authorize: async () => true }, { record: async () => {} } as unknown as AuditWriter);
  await assert.rejects(service.put('5'.repeat(24), application.toHexString(), { status: 'active', paymentConfirmed: true, startAt: '2020-01-01T00:00:00Z', endAt: '2099-01-01T00:00:00Z', expectedVersion: 0 }, { requestId: 'test', traceId: '0'.repeat(32) }), { code: 'NOT_FOUND' });
  for (const input of [{ status: 'active', paymentConfirmed: false, expectedVersion: 0 }, { status: 'active', paymentConfirmed: true, startAt: '2026-10-11T00:00:00Z', endAt: '2026-10-10T00:00:00Z', expectedVersion: 0 }]) assert.equal(publicIdentitySubscriptionPutSchema.safeParse(input).success, false);
});
