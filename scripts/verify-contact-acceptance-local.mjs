import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { createMongooseRequestRepository } from '../apps/api/src/modules/requests/repository.ts';
import { createRequestService } from '../apps/api/src/modules/requests/service.ts';
import { createAuditModels } from '../apps/api/src/modules/audit/models.ts';
import { createMongooseAuditWriter } from '../apps/api/src/modules/audit/writer.ts';

const database = `qa_contact_acceptance_${randomUUID().replaceAll('-', '')}`;
const connection = await mongoose.createConnection(`mongodb://127.0.0.1:27031/${database}?replicaSet=adcampaignqa`, { serverSelectionTimeoutMS: 15000 }).asPromise();
try {
  const auditModels = createAuditModels(connection);
  await auditModels.AuditLog.init();
  const writer = createMongooseAuditWriter(auditModels);
  let failAudit = true;
  const repository = createMongooseRequestRepository(connection, { async record(input, session) {
    const result = await writer.record(input, session);
    if (failAudit) throw new Error('QA_AUDIT_FAILURE');
    return result;
  } });
  const adminId = new mongoose.Types.ObjectId();
  const seekerId = new mongoose.Types.ObjectId();
  const requestId = new mongoose.Types.ObjectId();
  const stamp = new Date();
  await connection.collection('users').insertMany([
    { _id: adminId, roleType: 'admin', status: 'verified' },
    { _id: seekerId, roleType: 'seeker', status: 'verified' }
  ]);
  await connection.collection('requests').insertOne({ _id: requestId, type: 'contact', source: 'seeker', seekerId, status: 'under_review', version: 3, payload: { message: 'Contact me' }, createdAt: stamp, updatedAt: stamp });
  const admin = { sub: adminId.toHexString(), role: 'admin', status: 'verified' };
  const service = createRequestService({ repository, authorization: { authorize: async () => true } });
  const input = { transition: 'start_progress', expectedVersion: 3, reason: 'Accept customer follow-up' };
  await assert.rejects(service.transition(admin, requestId.toHexString(), input), /QA_AUDIT_FAILURE/);
  assert.equal((await repository.get(requestId.toHexString())).status, 'under_review');
  assert.equal(await connection.collection('notifications').countDocuments(), 0);
  assert.equal(await auditModels.AuditLog.countDocuments(), 0);
  failAudit = false;
  const accepted = await service.transition(admin, requestId.toHexString(), input);
  assert.equal(accepted.status, 'in_progress');
  assert.equal(accepted.version, 4);
  assert.equal((await service.get(admin, accepted.id)).status, 'in_progress');
  assert.equal(await auditModels.AuditLog.countDocuments({ action: 'request.start_progress', actorType: 'admin' }), 1);
  assert.equal(await connection.collection('notifications').countDocuments({ recipientId: seekerId, type: 'request.updated' }), 1);
  assert.equal((await repository.get(accepted.id)).customerUpdates.at(-1).status, 'in_progress');
  console.log('PASS: contact acceptance persists with audit and customer notification; audit failure rolls back all writes.');
} finally { await connection.dropDatabase(); await connection.close(); }
