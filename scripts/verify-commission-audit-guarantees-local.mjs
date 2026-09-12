import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import mongoose from 'mongoose';
import { createAuditModels } from '../apps/api/src/modules/audit/models.ts';
import { createMongooseAuditWriter } from '../apps/api/src/modules/audit/writer.ts';
import { createMongooseCommissionPolicyRepository } from '../apps/api/src/modules/commissions/policy-repository.ts';
import { createMongooseCommissionExceptionRepository } from '../apps/api/src/modules/commissions/exception-repository.ts';
import { createMongooseCommissionAccountOverrideRepository } from '../apps/api/src/modules/commissions/account-repository.ts';

const database = `commission_audit_${randomUUID().replaceAll('-', '')}`;
const connection = await mongoose.createConnection(`mongodb://127.0.0.1:27018/${database}?replicaSet=rs0`).asPromise();
const report = { status: 'RUNNING', journey: 'GUIDE-24', journeys: ['GUIDE-24'], mockedRoutes: false,
  environment: 'isolated-local-MongoDB', faultInjection: 'durable audit throws after insert inside each commission transaction',
  commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), startedAt: new Date().toISOString(), checks: [], cleanup: false };

try {
  const audits = createAuditModels(connection);
  await audits.AuditLog.init();
  const durable = createMongooseAuditWriter(audits);
  let failAudit = true;
  const audit = { async record(entry, session) { const id = await durable.record(entry, session); if (failAudit) throw new Error('INJECTED_COMMISSION_AUDIT_FAILURE'); return id; } };
  const policyRepository = createMongooseCommissionPolicyRepository(connection, audit);
  const exceptionRepository = createMongooseCommissionExceptionRepository(connection, audit);
  const accountRepository = createMongooseCommissionAccountOverrideRepository(connection, audit);
  const actorId = new mongoose.Types.ObjectId().toHexString();
  const accountId = new mongoose.Types.ObjectId().toHexString();
  const stamp = '2026-09-12T22:30:00.000Z';
  const records = [
    ['commission_policies', policyRepository, { id: new mongoose.Types.ObjectId().toHexString(), key: 'atomic.policy', label: 'Atomic policy', kind: 'percentage', scope: { kind: 'default' }, percentageBps: 125, effectiveFrom: stamp, status: 'draft', version: 0, createdBy: actorId, updatedBy: actorId, createdAt: stamp, updatedAt: stamp }, 'commission_policy', 'commission_policy.create', 'Create atomic commission policy'],
    ['commission_exceptions', exceptionRepository, { id: new mongoose.Types.ObjectId().toHexString(), accountId, kind: 'percentage', percentageBps: 75, reason: 'Atomic exception approval', effectiveFrom: stamp, status: 'draft', source: 'exception', version: 0, createdBy: actorId, updatedBy: actorId, createdAt: stamp, updatedAt: stamp, lastMutationReason: 'Atomic exception approval' }, 'commission_exception', 'commission_exception.create', 'Atomic exception approval'],
    ['commission_account_overrides', accountRepository, { id: new mongoose.Types.ObjectId().toHexString(), accountId, kind: 'exempt', effectiveFrom: stamp, status: 'draft', version: 0, source: 'account_override', createdBy: actorId, updatedBy: actorId, createdAt: stamp, updatedAt: stamp }, 'commission_account_override', 'commission_account_override.create', 'Create atomic account override']
  ];

  for (const [collection, repository, record, targetType, action, reason] of records) {
    const event = { actorType: 'admin', actorId, targetType, targetId: record.id, action, reason, before: {}, after: record,
      requestId: `guide24-${targetType}`, traceId: targetType === 'commission_policy' ? 'a'.repeat(32) : targetType === 'commission_exception' ? 'b'.repeat(32) : 'c'.repeat(32), occurredAt: new Date(stamp) };
    await assert.rejects(repository.insertWithAudit(record, event), /INJECTED_COMMISSION_AUDIT_FAILURE/u);
    assert.equal(await connection.collection(collection).countDocuments({ id: record.id }), 0);
    assert.equal(await audits.AuditLog.countDocuments({ targetId: record.id }), 0);
  }
  report.checks.push('audit_failure_rolls_back_policy_exception_override_and_inserted_audits');

  failAudit = false;
  for (const [, repository, record, targetType, action, reason] of records) {
    const result = await repository.insertWithAudit(record, { actorType: 'admin', actorId, targetType, targetId: record.id, action, reason,
      before: {}, after: record, requestId: `guide24-retry-${targetType}`, traceId: targetType === 'commission_policy' ? 'd'.repeat(32) : targetType === 'commission_exception' ? 'e'.repeat(32) : 'f'.repeat(32), occurredAt: new Date(stamp) });
    assert.equal(result.kind, 'written');
  }
  assert.equal(await audits.AuditLog.countDocuments(), 3);
  report.checks.push('retry_commits_three_records_with_exactly_three_reasoned_audits');

  for (const [, repository, record, targetType, action, reason] of records) {
    const duplicate = await repository.insertWithAudit(record, { actorType: 'admin', actorId, targetType, targetId: record.id, action, reason,
      before: {}, after: record, requestId: `guide24-duplicate-${targetType}`, traceId: '1'.repeat(32), occurredAt: new Date(stamp) });
    assert.equal(duplicate.kind, 'duplicate');
  }
  assert.equal(await audits.AuditLog.countDocuments(), 3);
  report.checks.push('duplicate_records_write_no_duplicate_audits');
  report.status = 'PASS_LOCAL';
} catch (error) {
  report.status = 'FAIL_LOCAL'; report.failure = error instanceof Error ? error.message : String(error); process.exitCode = 1;
} finally {
  try { await connection.dropDatabase(); report.cleanup = true; } catch (error) { report.status = 'FAIL_LOCAL'; report.cleanupError = error instanceof Error ? error.message : String(error); process.exitCode = 1; }
  report.finishedAt = new Date().toISOString();
  await writeFile('docs/quality/guide-runs/commission-audit-guarantees-local-latest.json', `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await connection.close();
}

console.log(`GUIDE-24 commission audit guarantees: ${report.status}; ${report.checks.length} checks; cleanup=${report.cleanup}`);
