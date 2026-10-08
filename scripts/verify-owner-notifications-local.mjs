import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';
import { createAuditModels } from '../apps/api/src/modules/audit/models.ts';
import { createMongooseAuditWriter } from '../apps/api/src/modules/audit/writer.ts';
import { createAccountCommunicator } from '../apps/api/src/modules/accounts/communication.ts';
import { createMongooseNotificationRepository } from '../apps/api/src/modules/notifications/repository.ts';
import { createNotificationService } from '../apps/api/src/modules/notifications/service.ts';
const database = `qa_owner_notifications_${randomUUID().replaceAll('-', '')}`;
const connection = await mongoose.createConnection(`mongodb://127.0.0.1:27031/${database}?replicaSet=adcampaignqa`).asPromise();
try {
  const models = createAuditModels(connection); await models.AuditLog.init();
  const audit = createMongooseAuditWriter(models);
  const sender = new mongoose.Types.ObjectId(); const recipient = new mongoose.Types.ObjectId(); const other = new mongoose.Types.ObjectId();
  await connection.collection('users').insertOne({ _id: recipient, roleType: 'provider', status: 'verified' });
  const send = createAccountCommunicator(connection, { authorize: async () => true }, audit);
  const result = await send({ userId: sender.toHexString() }, recipient.toHexString(), { action: 'notify', reason: 'رسالة اختبار وصول محلي', title: 'اختبار الإشعارات' }, { requestId: 'qa-notification', traceId: 'a'.repeat(32) });
  const service = createNotificationService({ repository: createMongooseNotificationRepository(connection), isActiveAccount: async () => true });
  const claims = { sub: recipient.toHexString(), role: 'provider', status: 'verified' };
  const list = await service.listProvider(claims, {});
  assert.equal(list.items[0]?.id, result.id); assert.equal(list.unreadCount, 1);
  assert.equal((await service.listProvider({ ...claims, sub: other.toHexString() }, {})).total, 0);
  await connection.collection('notifications').insertOne({ recipientId: recipient, audience: 'provider', type: 'invalid', title: {}, createdAt: new Date(), readAt: null });
  assert.equal((await service.listProvider(claims, {})).unreadCount, 1);
  await service.markProviderRead(claims, result.id);
  assert.equal((await service.listProvider(claims, {})).unreadCount, 0);
  assert.equal((await service.listProvider(claims, { unreadOnly: true })).items.length, 0);
  console.log('PASS: admin send reaches recipient only, invalid records do not create unread badges, mark-read clears count.');
} finally { await connection.dropDatabase(); await connection.close(); }
