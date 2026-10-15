import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import mongoose from 'mongoose';
import { createLocationModels } from '../apps/api/src/modules/locations/models.ts';
import { createMongooseLocationRepository } from '../apps/api/src/modules/locations/repository.ts';
import { createLocationService } from '../apps/api/src/modules/locations/service.ts';
import { createAuditModels } from '../apps/api/src/modules/audit/models.ts';
import { createMongooseAuditWriter } from '../apps/api/src/modules/audit/writer.ts';

const name = `location_order_qa_${randomUUID().replaceAll('-', '')}`;
const connection = await mongoose.createConnection(`mongodb://127.0.0.1:27018/${name}?replicaSet=rs0`).asPromise();
const result = { status: 'RUNNING', mockedRoutes: false, environment: 'isolated-local-MongoDB', checks: [], cleanup: false };
try {
  const models = createLocationModels(connection), audits = createAuditModels(connection);
  await Promise.all([models.Location.init(), audits.AuditLog.init()]);
  const durable = createMongooseAuditWriter(audits); let failAudit = false;
  const audit = { async record(event, session) { const id = await durable.record(event, session); if (failAudit) throw new Error('INJECTED_ORDER_AUDIT_FAILURE'); return id; } };
  const repository = createMongooseLocationRepository(connection, models, audit);
  const service = createLocationService({ repository, authorization: { authorize: async (_, permission) => permission === 'admin:locations.manage' || permission === 'admin:locations.view' } });
  const principal = { userId: new mongoose.Types.ObjectId().toHexString() }, context = { requestId: 'location-order-local', traceId: 'a'.repeat(32) };
  const first = await service.create(principal, { kind: 'location', name: { en: 'First' }, order: 10, active: true, reason: 'Create local location' }, context);
  const second = await service.create(principal, { kind: 'neighborhood', parentLocationId: first.id, name: { en: 'Second' }, order: 20, active: false, reason: 'Create local neighborhood' }, context);
  const third = await service.create(principal, { kind: 'neighborhood', parentLocationId: first.id, name: { en: 'Third' }, order: 20, active: true, reason: 'Create tied local neighborhood' }, context);
  const input = { items: [third, first, second].map(row => ({ id: row.id, version: row.version })), reason: 'Arrange list without numeric gaps' };
  await assert.rejects(service.reorder(principal, { ...input, items: input.items.slice(1) }, context), /LOCATION_VERSION_CONFLICT/);
  failAudit = true;
  await assert.rejects(service.reorder(principal, input, context), /INJECTED_ORDER_AUDIT_FAILURE/);
  assert.deepEqual((await models.Location.find().sort({ order: 1, slug: 1 }).lean()).map(row => row.order), [10, 20, 20]);
  assert.equal(await audits.AuditLog.countDocuments({ action: 'location.reorder' }), 0);
  failAudit = false;
  await service.reorder(principal, input, context);
  const rows = await models.Location.find().sort({ order: 1 }).lean();
  assert.deepEqual(rows.map(row => row._id.toString()), [third.id, first.id, second.id]);
  assert.deepEqual(rows.map(row => row.order), [0, 1, 2]);
  assert.equal(rows[2].active, false); assert.equal(rows[0].parentLocationId.toString(), first.id);
  assert.equal(await audits.AuditLog.countDocuments({ action: 'location.reorder' }), 3);
  await assert.rejects(service.reorder(principal, input, context), /LOCATION_VERSION_CONFLICT/);
  assert.equal(await models.Location.countDocuments(), 3);
  result.checks.push('tied_and_sparse_orders_become_sequential', 'incomplete_and_stale_lists_rejected', 'audit_failure_rolls_back_every_row', 'names_hierarchy_visibility_and_records_preserved');
  result.status = 'PASS_LOCAL';
} catch (error) { result.status = 'FAIL_LOCAL'; result.failure = error.message; process.exitCode = 1; }
finally {
  try { await connection.dropDatabase(); result.cleanup = true; } finally { await connection.close(); }
  await mkdir('.tmp/location-order-local', { recursive: true });
  await writeFile('.tmp/location-order-local/result.json', JSON.stringify(result, null, 2)); console.log(JSON.stringify(result));
}
