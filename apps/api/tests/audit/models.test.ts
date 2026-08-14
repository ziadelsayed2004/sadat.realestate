import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose from 'mongoose';
import { createAuditModels } from '../../src/modules/audit/models.js';

function validRecord() {
  return {
    actorType: 'admin',
    actorId: new mongoose.Types.ObjectId('0123456789abcdef01234567'),
    targetType: 'user',
    targetId: '1123456789abcdef01234567',
    action: 'account.restrict',
    reason: 'Confirmed policy breach',
    before: { status: 'verified', password: 'must-not-persist' },
    after: { status: 'restricted' },
    requestId: 'audit-model-1',
    traceId: 'a'.repeat(32),
    createdAt: new Date('2026-08-14T00:00:00.000Z')
  };
}

test('defines strict append-only audit evidence with query-driven indexes', async () => {
  const connection = mongoose.createConnection();
  connection.set('bufferCommands', false);
  const { AuditLog } = createAuditModels(connection);
  const document = new AuditLog(validRecord());
  await document.validate();
  assert.equal((document.before as Record<string, unknown>).password, '[REDACTED]');
  assert.equal(AuditLog.schema.get('strict'), 'throw');
  assert.equal(AuditLog.schema.get('versionKey'), false);
  const names = new Set(AuditLog.schema.indexes().map(([, options]) => options.name));
  for (const name of [
    'audit_logs_actor_created',
    'audit_logs_target_created',
    'audit_logs_action_created',
    'audit_logs_trace_created',
    'audit_logs_created'
  ]) assert.ok(names.has(name));

  await assert.rejects(
    AuditLog.updateOne({ _id: document._id }, { $set: { reason: 'Changed later' } }).exec(),
    /AUDIT_LOG_APPEND_ONLY/
  );
  await assert.rejects(
    AuditLog.deleteOne({ _id: document._id }).exec(),
    /AUDIT_LOG_APPEND_ONLY/
  );
  await assert.rejects(
    AuditLog.bulkWrite([{ deleteOne: { filter: { _id: document._id } } }]),
    /AUDIT_LOG_APPEND_ONLY/
  );
  await connection.destroy();
});

test('rejects malformed identifiers, action keys, traces, reasons, and unknown fields', async () => {
  const connection = mongoose.createConnection();
  const { AuditLog } = createAuditModels(connection);
  for (const change of [
    { action: 'Account Restrict' },
    { targetType: '../user' },
    { targetId: '../target' },
    { reason: 'no' },
    { reason: 'unsafe\nreason' },
    { traceId: 'not-a-trace' },
    { requestId: 'unsafe request' }
  ]) await assert.rejects(new AuditLog({ ...validRecord(), ...change }).validate());
  assert.throws(() => new AuditLog({ ...validRecord(), storageKey: 'private/key' }));
  await connection.destroy();
});
