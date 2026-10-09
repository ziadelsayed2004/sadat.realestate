import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { createMongooseRequestRepository } from '../apps/api/src/modules/requests/repository.ts';
import { createRequestService } from '../apps/api/src/modules/requests/service.ts';
import { createAuditModels } from '../apps/api/src/modules/audit/models.ts';
import { createMongooseAuditWriter } from '../apps/api/src/modules/audit/writer.ts';

const connection = await mongoose.createConnection(`mongodb://127.0.0.1:27031/qa_request_information_${randomUUID().replaceAll('-', '')}?replicaSet=adcampaignqa`, { serverSelectionTimeoutMS: 15000 }).asPromise();
try {
  const models = createAuditModels(connection);
  await models.AuditLog.init();
  const writer = createMongooseAuditWriter(models);
  let failAudit = true;
  const repository = createMongooseRequestRepository(connection, { async record(input, session) {
    await writer.record(input, session);
    if (failAudit) throw new Error('QA_AUDIT_FAILURE');
  } });
  const seekerId = new mongoose.Types.ObjectId();
  const adminId = new mongoose.Types.ObjectId();
  const requestId = new mongoose.Types.ObjectId();
  const stamp = new Date();
  await connection.collection('users').insertMany([{ _id: seekerId, roleType: 'seeker', status: 'verified' }, { _id: adminId, roleType: 'admin', status: 'verified' }]);
  await connection.collection('requests').insertOne({ _id: requestId, type: 'contact', source: 'seeker', seekerId, status: 'needs_information', version: 3, payload: { message: 'Original inquiry' }, customerUpdates: [{ status: 'needs_information', message: 'What is your budget?', createdAt: stamp }], createdAt: stamp, updatedAt: stamp });
  const owner = { sub: String(seekerId), role: 'seeker', status: 'verified' };
  const admin = { sub: String(adminId), role: 'admin', status: 'verified' };
  const service = createRequestService({ repository, authorization: { authorize: async () => true } });
  const input = { transition: 'start_review', expectedVersion: 3, customerMessage: 'My budget is 2 million.\nCall in the morning.' };
  await assert.rejects(service.transition(owner, String(requestId), input), /QA_AUDIT_FAILURE/);
  assert.equal((await repository.get(String(requestId))).status, 'needs_information');
  assert.equal((await repository.get(String(requestId))).version, 3);
  assert.equal((await repository.get(String(requestId))).customerUpdates.length, 1);
  assert.equal(await models.AuditLog.countDocuments(), 0);
  failAudit = false;
  const updated = await service.transition(owner, String(requestId), input);
  assert.equal(updated.id, String(requestId));
  assert.equal(updated.status, 'under_review');
  assert.equal(updated.version, 4);
  assert.equal(updated.customerUpdates.at(-1).authorRole, 'seeker');
  assert.equal((await service.get(admin, updated.id)).customerUpdates.at(-1).message, input.customerMessage);
  assert.equal((await service.list(admin, { status: 'under_review' })).total, 1);
  assert.equal(await connection.collection('requests').countDocuments(), 1);
  assert.equal(await models.AuditLog.countDocuments({ action: 'request.provide_information', actorType: 'seeker' }), 1);
  await assert.rejects(service.transition(owner, updated.id, input), /REQUEST_FORBIDDEN/);
  console.log('PASS: information reply persists on the same request, returns to the admin review queue and rolls back with audit failure.');
} finally { await connection.dropDatabase(); await connection.close(); }
