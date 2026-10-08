import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';
import { createAuditModels } from '../apps/api/src/modules/audit/models.ts';
import { createMongooseAuditWriter } from '../apps/api/src/modules/audit/writer.ts';
import { createMongooseCommissionExceptionRepository } from '../apps/api/src/modules/commissions/exception-repository.ts';
import { createCommissionExceptionService } from '../apps/api/src/modules/commissions/exception-service.ts';

const database = `qa_owner_exceptions_${randomUUID().replaceAll('-', '')}`;
const connection = await mongoose.createConnection(`mongodb://127.0.0.1:27031/${database}?replicaSet=adcampaignqa`).asPromise();
try {
  const models = createAuditModels(connection); await models.AuditLog.init();
  const durable = createMongooseAuditWriter(models);
  let fail = false;
  const repository = createMongooseCommissionExceptionRepository(connection, { async record(event, session) {
    await durable.record(event, session); if (fail) throw new Error('QA_AUDIT_FAILURE'); return 'unused';
  } });
  const service = createCommissionExceptionService({ repository });
  const claims = { role: 'admin', status: 'verified', sub: new mongoose.Types.ObjectId().toHexString() };
  const draft = await service.createException(claims, { accountId: new mongoose.Types.ObjectId().toHexString(), kind: 'percentage', percentageBps: 600, reason: 'ده', effectiveFrom: new Date(Date.now() - 1000).toISOString() });
  assert.equal(draft.status, 'draft'); assert.equal('_id' in draft, false); assert.equal(draft.effectiveTo, undefined);
  const active = await service.updateException(claims, draft.id, { expectedVersion: 0, reason: 'اعتماد الاستثناء', status: 'active' });
  assert.equal((await service.findActiveException(draft.accountId))?.id, active.id);
  fail = true;
  await assert.rejects(service.updateException(claims, draft.id, { expectedVersion: 1, reason: 'إيقاف الاستثناء', status: 'inactive' }), /QA_AUDIT_FAILURE/);
  assert.equal((await repository.findById(draft.id)).status, 'active');
  fail = false;
  await service.updateException(claims, draft.id, { expectedVersion: 1, reason: 'إيقاف الاستثناء', status: 'inactive' });
  assert.equal(await service.findActiveException(draft.accountId), undefined);
  assert.equal(await models.AuditLog.countDocuments(), 3);
  console.log('PASS: real Mongo create without end, clean response, activation, audit rollback, stop, exactly three audits.');
} finally { await connection.dropDatabase(); await connection.close(); }
