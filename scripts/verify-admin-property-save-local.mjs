import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { createPropertyModels } from '../apps/api/src/modules/properties/models.ts';
import { createMongoosePropertyRepository } from '../apps/api/src/modules/properties/repository.ts';
import { createPropertyService } from '../apps/api/src/modules/properties/service.ts';
import { createAuditModels } from '../apps/api/src/modules/audit/models.ts';
import { createMongooseAuditWriter } from '../apps/api/src/modules/audit/writer.ts';

// This verifier only connects to the local QA replica set. It never accepts a
// production URI and only drops the random database it creates itself.
const database = `qa_admin_property_save_${randomUUID().replaceAll('-', '')}`;
const connection = await mongoose.createConnection(`mongodb://127.0.0.1:27031/${database}?replicaSet=adcampaignqa`, { serverSelectionTimeoutMS: 10000 }).asPromise();
try {
  const models = createPropertyModels(connection);
  const auditModels = createAuditModels(connection);
  await Promise.all([models.Property.init(), auditModels.AuditLog.init()]);
  const durable = createMongooseAuditWriter(auditModels);
  let failAudit = false;
  const repository = createMongoosePropertyRepository(connection, models, { async record(event, session) {
    const result = await durable.record(event, session);
    if (failAudit) throw new Error('QA_AUDIT_FAILURE');
    return result;
  } });
  const administrator = new mongoose.Types.ObjectId().toHexString();
  const row = await models.Property.create({ providerId: new mongoose.Types.ObjectId(), sourceType: 'individual_broker', kind: 'property', name: { en: 'Original apartment' }, slug: 'original-apartment', transactionType: 'sale', status: 'published', active: true });
  const id = row.id;
  const service = createPropertyService({ repository, authorization: { async authorize(actor, permission) { return actor === administrator && permission === 'admin:properties.manage'; } } });
  const input = { version: 0, reason: 'Administrative property edit', name: { en: 'Updated apartment' }, description: { en: 'Updated description' }, transactionType: 'rent', area: { value: 145, unit: 'sqm' }, layout: { bedrooms: 3, bathrooms: 2, floor: 4, totalFloors: 9 }, price: { amount: 2000, currency: 'EGP' } };
  const context = { requestId: 'qa-unified-property-save', traceId: 'a'.repeat(32) };
  const saved = await service.adminEdit(administrator, id, input, context);
  assert.equal(saved.version, 1);
  assert.equal(saved.status, 'published');
  const persisted = await repository.findByIdAny(id);
  for (const field of ['name', 'description', 'transactionType', 'area', 'layout', 'price']) assert.deepEqual(persisted[field], input[field]);
  assert.equal(await auditModels.AuditLog.countDocuments({ targetId: id, action: 'property.update', actorType: 'admin', actorId: administrator, reason: input.reason }), 1);
  await assert.rejects(service.adminEdit(administrator, id, input, context), error => error.code === 'PROPERTY_VERSION_CONFLICT');
  failAudit = true;
  await assert.rejects(service.adminEdit(administrator, id, { ...input, version: 1, name: { en: 'Uncommitted title' }, price: { amount: 3000, currency: 'EGP' } }, context), /QA_AUDIT_FAILURE/);
  const rolledBack = await repository.findByIdAny(id);
  assert.equal(rolledBack.version, 1);
  assert.deepEqual(rolledBack.name, input.name);
  assert.deepEqual(rolledBack.price, input.price);
  assert.equal(await auditModels.AuditLog.countDocuments({ targetId: id, action: 'property.update' }), 1);
  failAudit = false;
  const retry = await service.adminEdit(administrator, id, { version: 1, reason: input.reason, layout: { bedrooms: 4, bathrooms: 3, floor: 2, totalFloors: 9 } }, context);
  assert.equal(retry.version, 2);
  assert.equal((await repository.findByIdAny(id)).layout.bedrooms, 4);
  console.log('PASS: real Mongo unified field persistence, one version and audit, stale write rejection, transactional rollback and retry.');
} finally {
  await connection.dropDatabase();
  await connection.close();
}
