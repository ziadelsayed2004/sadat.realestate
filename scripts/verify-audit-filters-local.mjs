import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { createAuditModels } from '../apps/api/src/modules/audit/models.ts';
import { createMongooseAuditRepository } from '../apps/api/src/modules/audit/repository.ts';

const database = `qa_audit_filters_${randomUUID().replaceAll('-', '')}`;
const connection = await mongoose.createConnection(`mongodb://127.0.0.1:27031/${database}?replicaSet=adcampaignqa`, { serverSelectionTimeoutMS: 15000 }).asPromise();
try {
  const models = createAuditModels(connection);
  const actorId = new mongoose.Types.ObjectId();
  for (const [index, [targetType, action]] of [
    ['property', 'property.update'], ['property', 'property.create'],
    ['admin_user', 'admin.administrator_updated'], ['cms_team_member', 'cms.team.write'],
    ['request', 'request.provide_information'], ['property', 'property.update_extra']
  ].entries()) {
    await models.AuditLog.create({ actorType: 'admin', actorId, targetType, targetId: new mongoose.Types.ObjectId().toHexString(), action,
      reason: 'Local audit filter QA', before: {}, after: {}, requestId: `local-audit-${index}`, traceId: 'a'.repeat(32), createdAt: new Date(`2026-10-09T0${index}:00:00.000Z`) });
  }
  const repository = createMongooseAuditRepository(models);
  const first = await repository.list({ actionGroup: 'update', page: 1, limit: 2 });
  assert.equal(first.total, 3);
  assert.deepEqual(first.items.map(item => item.action), ['cms.team.write', 'admin.administrator_updated']);
  const second = await repository.list({ actionGroup: 'update', page: 2, limit: 2 });
  assert.equal(second.total, 3);
  assert.deepEqual(second.items.map(item => item.action), ['property.update']);
  assert.equal((await repository.list({ actionGroup: 'update', targetType: 'property', page: 1, limit: 25 })).total, 1);
  assert.equal((await repository.list({ actionGroup: 'update', action: 'property.create', page: 1, limit: 25 })).total, 0);
  assert.equal((await repository.list({ actionGroup: 'review', page: 1, limit: 25 })).items[0]?.action, 'request.provide_information');
  console.log('PASS: real Mongo audit group filtering, section filtering, pagination totals and exact-action intersections.');
} finally {
  await connection.dropDatabase();
  await connection.close();
}
