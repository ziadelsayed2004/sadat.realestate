import assert from 'node:assert/strict';
import test from 'node:test';
import { Types, type ClientSession, type Connection } from 'mongoose';
import { notificationDataSchema } from '@sadat-real-estate/contracts';
import { advertisingNotification, writeAdvertisingNotification } from '../../src/modules/ads/notifications.js';

const input = { requestId: 'aaaaaaaaaaaaaaaaaaaaaaaa', providerId: 'bbbbbbbbbbbbbbbbbbbbbbbb', version: 3, occurredAt: new Date('2026-10-08T08:00:00Z') };

test('advertising lifecycle messages are valid localized in-app notifications owned by the provider', () => {
  for (const event of ['approved', 'rejected', 'quote_sent', 'waiting_payment', 'payment_approved', 'payment_rejected', 'scheduled', 'payment_waived'] as const) {
    const row = advertisingNotification({ ...input, event });
    assert.equal(row.recipientId.toHexString(), input.providerId);
    assert.equal(row.audience, 'provider');
    assert.equal(row.link, `/provider/ads/${input.requestId}`);
    assert.equal(row.readAt, null);
    notificationDataSchema.parse({ id: row._id.toHexString(), type: row.type, title: row.title, message: row.message, link: row.link, readAt: row.readAt, createdAt: row.createdAt.toISOString() });
  }
  assert.match(advertisingNotification({ ...input, event: 'approved' }).message.ar, /مبدئيًا/u);
  assert.match(advertisingNotification({ ...input, event: 'payment_approved' }).message.ar, /لا يعني/u);
});

test('retried events keep their identity while other providers, versions and payment proofs remain separate', () => {
  const event = { ...input, event: 'payment_rejected' as const, sourceId: 'cccccccccccccccccccccccc' };
  const id = advertisingNotification(event)._id.toHexString();
  assert.equal(advertisingNotification(event)._id.toHexString(), id);
  for (const different of [{ ...event, version: 4 }, { ...event, providerId: 'dddddddddddddddddddddddd' }, { ...event, sourceId: 'eeeeeeeeeeeeeeeeeeeeeeee' }, { ...event, event: 'payment_approved' as const }]) {
    assert.notEqual(advertisingNotification(different)._id.toHexString(), id);
  }
});

test('writes notifications within the workflow transaction without replacing existing read receipts or sending email', async () => {
  const session = {} as ClientSession;
  const calls: unknown[] = [];
  const connection = { collection(name: string) { assert.equal(name, 'notifications'); return { async updateOne(filter: unknown, update: unknown, options: unknown) { calls.push({ filter, update, options }); } }; } } as unknown as Connection;
  const row = advertisingNotification({ ...input, event: 'waiting_payment' });
  await writeAdvertisingNotification(connection, { ...input, event: 'waiting_payment' }, session);
  assert.deepEqual(calls, [{ filter: { _id: new Types.ObjectId(row._id) }, update: { $setOnInsert: row }, options: { upsert: true, session } }]);
});
