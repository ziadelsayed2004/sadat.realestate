import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import mongoose from 'mongoose';
import { createAuditModels } from '../apps/api/src/modules/audit/models.ts';
import { createMongooseAuditWriter } from '../apps/api/src/modules/audit/writer.ts';
import { createMongooseCommissionAccountOverrideRepository } from '../apps/api/src/modules/commissions/account-repository.ts';
import { createCommissionAccountService } from '../apps/api/src/modules/commissions/account-service.ts';
import { createMongooseCommunityReportService } from '../apps/api/src/modules/community/report-service.ts';

// A disposable database on the local QA replica set; no application records.
const database = `account_report_qa_${randomUUID().replaceAll('-', '')}`;
const connection = await mongoose.createConnection(`mongodb://127.0.0.1:27018/${database}?replicaSet=rs0`).asPromise();
const result = { status: 'RUNNING', mockedRoutes: false, environment: 'isolated-local-MongoDB', checks: [], cleanup: false };
try {
  const models = createAuditModels(connection); await models.AuditLog.init();
  const durable = createMongooseAuditWriter(models);
  let failAudit = false;
  const audit = { async record(event, session) { const id = await durable.record(event, session); if (failAudit) throw new Error('INJECTED_AUDIT_FAILURE'); return id; } };
  const admin = { sub: new mongoose.Types.ObjectId().toHexString(), role: 'admin', status: 'verified' };
  const accountId = new mongoose.Types.ObjectId().toHexString();
  const context = { requestId: 'account-report-local-qa', traceId: 'a'.repeat(32) };
  const collection = connection.collection('commission_account_overrides');
  await collection.createIndex({ accountId: 1, effectiveFrom: 1 }, { unique: true, name: 'commission_account_overrides_account_effective_unique' });
  const repository = createMongooseCommissionAccountOverrideRepository(connection, audit);
  const service = createCommissionAccountService({ repository, now: () => new Date('2026-10-15T10:00:00Z') });
  const input = { kind: 'percentage', percentageBps: 300, effectiveFrom: '2026-10-14T00:00:00.000Z' };
  failAudit = true;
  await assert.rejects(service.createOverride(admin, accountId, input, context, true), /INJECTED_AUDIT_FAILURE/);
  assert.equal(await collection.countDocuments(), 0);
  assert.equal(await connection.collection('notifications').countDocuments(), 0);
  assert.equal(await models.AuditLog.countDocuments(), 0);
  failAudit = false;
  const first = await service.createOverride(admin, accountId, input, context, true);
  const indexes = await collection.indexes();
  assert.equal(indexes.some(index => index.name === 'commission_account_overrides_account_effective_unique'), false);
  assert.equal(indexes.some(index => index.name === 'commission_account_overrides_nonarchived_effective_unique' && index.unique), true);
  await service.createOverride(admin, accountId, input, context, true);
  assert.equal(await connection.collection('notifications').countDocuments({ recipientId: new mongoose.Types.ObjectId(accountId), type: 'commission.account_changed' }), 1);
  await assert.rejects(service.createOverride(admin, accountId, { ...input, percentageBps: 400 }, context, true), /COMMISSION_ACCOUNT_DUPLICATE/);
  failAudit = true;
  const cancel = { status: 'archived', expectedVersion: first.version, reason: 'Replace incorrect assignment' };
  await assert.rejects(service.updateOverride(admin, first.id, cancel, context), /INJECTED_AUDIT_FAILURE/);
  assert.equal((await repository.findById(first.id)).status, 'active');
  assert.equal(await connection.collection('notifications').countDocuments(), 1);
  failAudit = false;
  await service.updateOverride(admin, first.id, cancel, context);
  const replacement = await service.createOverride(admin, accountId, { ...input, percentageBps: 400 }, context, true);
  assert.notEqual(first.id, replacement.id);
  assert.equal((await repository.findById(first.id)).status, 'archived');
  assert.equal((await service.getAccountCommission(admin, accountId)).percentageBps, 400);
  assert.equal(await collection.countDocuments(), 2);
  assert.equal(await connection.collection('notifications').countDocuments(), 3);
  assert.equal(await models.AuditLog.countDocuments(), 3);
  result.checks.push('legacy_unique_index_migrates_without_removing_rows', 'archive_retains_history_and_allows_same_date_replacement', 'audit_failure_rolls_back_assignment_and_notification', 'identical_retries_create_one_notice');

  const reports = createMongooseCommunityReportService(connection, { authorize: async () => true }, audit);
  for (const role of ['provider', 'seeker']) {
    const reporterId = new mongoose.Types.ObjectId();
    await connection.collection('users').insertOne({ _id: reporterId, roleType: role, deletedAt: null });
    const row = { id: new mongoose.Types.ObjectId().toHexString(), postId: new mongoose.Types.ObjectId().toHexString(), reporterId: reporterId.toHexString(), reason: 'other', details: 'Synthetic public report', status: 'open', version: 0, createdAt: input.effectiveFrom, updatedAt: input.effectiveFrom };
    await connection.collection('community_reports').insertOne({ ...row });
    const resolution = { version: 0, action: 'resolve', reason: 'Private administrator resolution reason' };
    failAudit = true;
    await assert.rejects(reports.resolve(admin, row.id, resolution, context), /INJECTED_AUDIT_FAILURE/);
    assert.equal((await connection.collection('community_reports').findOne({ id: row.id })).status, 'open');
    assert.equal(await connection.collection('notifications').countDocuments({ recipientId: reporterId }), 0);
    failAudit = false;
    await reports.resolve(admin, row.id, resolution, context);
    const notices = await connection.collection('notifications').find({ recipientId: reporterId }).toArray();
    assert.equal(notices.length, 1); assert.equal(notices[0].audience, role); assert.equal(notices[0].type, 'community.report_resolved');
    assert.equal(JSON.stringify(notices).includes(resolution.reason), false);
    await assert.rejects(reports.resolve(admin, row.id, resolution, context), /VERSION_CONFLICT/);
    assert.equal(await connection.collection('notifications').countDocuments({ recipientId: reporterId }), 1);
  }
  result.checks.push('report_resolution_notifies_provider_and_seeker', 'report_failure_rolls_back_resolution_and_notice', 'report_notice_excludes_private_reason_and_is_not_replayed');
  result.status = 'PASS_LOCAL';
} catch (error) {
  result.status = 'FAIL_LOCAL'; result.failure = error.message; process.exitCode = 1;
} finally {
  try { await connection.dropDatabase(); result.cleanup = true; }
  finally { await connection.close(); }
  await mkdir('.tmp/account-report-notifications', { recursive: true });
  await writeFile('.tmp/account-report-notifications/result.json', `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result));
}
