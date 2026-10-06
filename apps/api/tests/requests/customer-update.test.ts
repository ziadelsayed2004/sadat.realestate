import assert from 'node:assert/strict';
import test from 'node:test';
import { Types, type Connection } from 'mongoose';
import type { AuditRecordInput, AuditWriter } from '../../src/modules/audit/writer.js';
import type { RequestRecord } from '../../src/modules/requests/service.js';
import { requestCustomerNotification } from '../../src/modules/requests/customer-update.js';
import { createMongooseRequestRepository } from '../../src/modules/requests/repository.js';
import { notificationDataSchema, requestTransitionRequestSchema } from '@sadat-real-estate/contracts';

const updated: RequestRecord = { id: 'a'.repeat(24), seekerId: 'b'.repeat(24), source: 'seeker', type: 'contact', status: 'under_review', version: 1, payload: {}, createdAt: new Date('2026-10-06'), updatedAt: new Date('2026-10-06T18:00:00Z') };
const adminId = 'f'.repeat(24);

test('notifies the request owner with a link and explicit message without exposing internal reasons', () => {
  const notification = requestCustomerNotification(updated, adminId, 'We will call tomorrow');
  assert.equal(String(notification?.recipientId), updated.seekerId);
  assert.equal(notification?.audience, 'seeker'); assert.equal(notification?.readAt, null);
  assert.equal(notification?.message.en, 'We will call tomorrow');
  assert.equal(notification?.link, `/seeker/requests/${updated.id}`);
  assert.equal(String(notification?._id), String(requestCustomerNotification(updated, adminId)?._id));
  assert.equal(requestCustomerNotification(updated, updated.seekerId!), undefined);
  assert.equal(requestCustomerNotification({ ...updated, seekerId: undefined, source: 'public' }, adminId), undefined);
  const provider = requestCustomerNotification({ ...updated, seekerId: undefined, source: 'provider', providerId: 'c'.repeat(24) }, adminId);
  assert.equal(provider?.audience, 'provider'); assert.equal(provider?.link, `/provider/customer-requests/${updated.id}`);
});

test('accepts multiline customer replies but rejects controls that cannot appear in notifications', () => {
  const input = { transition: 'contact', expectedVersion: 1, reason: 'Customer contacted' };
  assert.equal(requestTransitionRequestSchema.safeParse({ ...input, customerMessage: 'Hello\nWe will call tomorrow' }).success, true);
  assert.equal(requestTransitionRequestSchema.safeParse({ ...input, customerMessage: 'Invalid\u0000reply' }).success, false);
  const notification = requestCustomerNotification(updated, adminId, 'Hello\nWe will call tomorrow')!;
  assert.equal(notificationDataSchema.safeParse({ id: String(notification._id), type: notification.type, title: notification.title, message: notification.message, link: notification.link, readAt: notification.readAt, createdAt: notification.createdAt.toISOString() }).success, true);
});

test('writes status, customer history, audit and notification within the same transaction; conflicts and private notes do not notify', async () => {
  const session = { marker: 'transaction-session' }; const writes: Array<{ name: string; document: unknown; options: unknown }> = [];
  let conflict = false; let mutation: Record<string, unknown> = {};
  const connection = {
    async transaction(run: (value: unknown) => unknown) { return run(session); },
    collection(name: string) { return {
      async findOneAndUpdate(_filter: unknown, update: Record<string, unknown>, options: unknown) {
        mutation = update; assert.deepEqual(options, { returnDocument: 'after', session });
        return conflict ? null : { ...updated, _id: new Types.ObjectId(updated.id), seekerId: new Types.ObjectId(updated.seekerId!) };
      },
      async insertOne(document: unknown, options: unknown) { writes.push({ name, document, options }); }
    }; }
  } as unknown as Connection;
  const audit = { async record(document: unknown, options: unknown) { writes.push({ name: 'audit', document, options }); } } as unknown as AuditWriter;
  const repository = createMongooseRequestRepository(connection, audit);
  const auditInput = {} as AuditRecordInput;
  const input = { id: updated.id, expectedVersion: 0, audit: auditInput, now: updated.updatedAt };
  assert.equal((await repository.transition({ ...input, actorId: adminId, status: updated.status, reason: 'Private reason', customerMessage: 'Public reply' })).kind, 'written');
  assert.deepEqual(writes.map(write => write.name), ['audit', 'notifications']);
  assert.equal(writes[0]?.options, session); assert.deepEqual(writes[1]?.options, { session });
  assert.equal(JSON.stringify(writes[1]?.document).includes('Private reason'), false);
  assert.deepEqual(mutation.$push, { customerUpdates: { $each: [{ status: 'under_review', message: 'Public reply', createdAt: updated.updatedAt }], $slice: -50 } });
  writes.length = 0; conflict = true;
  assert.equal((await repository.transition({ ...input, actorId: adminId, status: updated.status })).kind, 'version_conflict');
  assert.equal(writes.length, 0);
  conflict = false;
  await repository.addNote({ ...input, note: { id: 'd'.repeat(24), body: 'Private note', authorId: adminId, createdAt: updated.updatedAt } });
  assert.deepEqual(writes.map(write => write.name), ['audit']);
});
