import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import mongoose from 'mongoose';
import { createIdentityModels } from '../apps/api/src/modules/identity/models.ts';
import { createProviderModels } from '../apps/api/src/modules/provider/models.ts';
import { createAccountModels } from '../apps/api/src/modules/accounts/models.ts';
import { createModerationModels } from '../apps/api/src/modules/moderation/models.ts';
import { createAuditModels } from '../apps/api/src/modules/audit/models.ts';
import { createMongooseAuditWriter } from '../apps/api/src/modules/audit/writer.ts';
import { createMongooseAccountRepository } from '../apps/api/src/modules/accounts/repository.ts';
import { createMongooseModerationRepository } from '../apps/api/src/modules/moderation/repository.ts';

const database = `admin_account_guarantees_${randomUUID().replaceAll('-', '')}`;
const connection = await mongoose.createConnection(`mongodb://127.0.0.1:27018/${database}?replicaSet=rs0`).asPromise();
connection.base.set('transactionAsyncLocalStorage', true);
const report = { status: 'RUNNING', journey: 'GUIDE-19', journeys: ['GUIDE-19'], mockedRoutes: false,
  environment: 'isolated-local-MongoDB', faultInjection: 'durable audit throws after insert inside account and report transactions',
  commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), startedAt: new Date().toISOString(), checks: [], cleanup: false };

try {
  const identity = createIdentityModels(connection); const provider = createProviderModels(connection);
  const account = createAccountModels(connection); const moderation = createModerationModels(connection); const auditModels = createAuditModels(connection);
  await Promise.all([identity.User.init(), account.AccountStateTransition.init(), moderation.AccountReport.init(), auditModels.AuditLog.init()]);
  const adminId = new mongoose.Types.ObjectId(); const seekerId = new mongoose.Types.ObjectId(); const reportId = new mongoose.Types.ObjectId();
  const now = new Date('2026-09-12T18:00:00.000Z');
  await identity.User.create([
    { _id: adminId, normalizedEmail: 'admin-guarantee@example.invalid', roleType: 'admin', status: 'verified', locale: 'en', statusChangedAt: now },
    { _id: seekerId, normalizedEmail: 'seeker-guarantee@example.invalid', roleType: 'seeker', status: 'verified', locale: 'en', statusChangedAt: now }
  ]);
  await moderation.AccountReport.create({ _id: reportId, accountId: seekerId, accountRoleType: 'seeker', reason: 'Account guarantee fixture', status: 'open', relatedReports: 1, createdAt: now, updatedAt: now });
  const durable = createMongooseAuditWriter(auditModels); let failAudit = true;
  const audit = { async record(entry, session) { const id = await durable.record(entry, session); if (failAudit) throw new Error('INJECTED_ADMIN_ACCOUNT_AUDIT_FAILURE'); return id; } };
  const accounts = createMongooseAccountRepository(connection, identity, provider, account, audit);
  const target = await accounts.findAccount(seekerId.toHexString()); assert.ok(target);
  const transition = { target, toStatus: 'restricted', actorAdminId: adminId.toHexString(), action: 'restrict',
    reason: 'Confirmed account policy restriction', requestId: 'guide19-account-rollback', traceId: 'a'.repeat(32), changedAt: now };
  await assert.rejects(accounts.transitionAccount(transition), /INJECTED_ADMIN_ACCOUNT_AUDIT_FAILURE/u);
  assert.equal((await identity.User.findById(seekerId).lean())?.status, 'verified');
  assert.equal(await account.AccountStateTransition.countDocuments({ targetUserId: seekerId }), 0);
  assert.equal(await auditModels.AuditLog.countDocuments({ targetId: seekerId.toHexString() }), 0);
  report.checks.push('audit_failure_rolls_back_account_status_transition_and_inserted_audit');
  failAudit = false;
  const concurrent = await Promise.all([accounts.transitionAccount(transition), accounts.transitionAccount({ ...transition, requestId: 'guide19-account-concurrent' })]);
  assert.equal(concurrent.filter(value => value.kind === 'written').length, 1);
  assert.equal(concurrent.filter(value => value.kind === 'conflict').length, 1);
  assert.equal((await identity.User.findById(seekerId).lean())?.status, 'restricted');
  assert.equal(await account.AccountStateTransition.countDocuments({ targetUserId: seekerId }), 1);
  assert.equal(await auditModels.AuditLog.countDocuments({ targetId: seekerId.toHexString() }), 1);
  report.checks.push('concurrent_same_account_version_one_write_one_conflict_with_single_audit');

  failAudit = true;
  const reports = createMongooseModerationRepository(connection, moderation, audit);
  const resolution = { reportId: reportId.toHexString(), expectedVersion: 0, action: 'resolve', adminId: adminId.toHexString(),
    reason: 'Confirmed account report resolution', requestId: 'guide19-report-rollback', traceId: 'b'.repeat(32), now };
  await assert.rejects(reports.resolveAccountReport(resolution), /INJECTED_ADMIN_ACCOUNT_AUDIT_FAILURE/u);
  const afterFailure = await moderation.AccountReport.findById(reportId).lean();
  assert.equal(afterFailure?.status, 'open'); assert.equal(afterFailure?.version, 0);
  assert.equal(await auditModels.AuditLog.countDocuments({ targetId: reportId.toHexString() }), 0);
  report.checks.push('audit_failure_rolls_back_account_report_resolution_and_inserted_audit');
  failAudit = false;
  const resolved = await reports.resolveAccountReport(resolution); assert.equal(resolved.kind, 'written');
  const stale = await reports.resolveAccountReport({ ...resolution, action: 'dismiss', requestId: 'guide19-report-stale' });
  assert.equal(stale.kind, 'version_conflict');
  assert.equal(await auditModels.AuditLog.countDocuments({ targetId: reportId.toHexString() }), 1);
  report.checks.push('report_retry_writes_once_and_stale_version_conflicts');
  report.mongo = { failedAccountResidue: 0, accountStatus: 'restricted', accountTransitionCount: 1, accountAuditCount: 1,
    failedReportStatus: 'open', reportStatus: 'resolved', reportVersion: 1, reportAuditCount: 1 };
  report.status = 'PASS_LOCAL';
} catch (error) { report.status = 'FAIL_LOCAL'; report.failure = error instanceof Error ? error.message : String(error); process.exitCode = 1; }
finally {
  try { assert.equal(connection.name, database); await connection.dropDatabase(); report.cleanup = (await connection.db.listCollections().toArray()).length === 0; assert.equal(report.cleanup, true); }
  catch (error) { report.status = 'FAIL_LOCAL'; report.cleanup = false; report.cleanupFailure = error instanceof Error ? error.message : String(error); process.exitCode = 1; }
  await connection.close(); report.finishedAt = new Date().toISOString(); await mkdir('docs/quality/guide-runs', { recursive: true });
  await writeFile('docs/quality/guide-runs/admin-account-guarantees-local-latest.json', `${JSON.stringify(report, null, 2)}\n`);
}
console.log(JSON.stringify({ status: report.status, checks: report.checks.length, cleanup: report.cleanup, failure: report.failure }));
