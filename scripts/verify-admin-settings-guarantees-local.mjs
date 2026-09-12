import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import mongoose from 'mongoose';
import { createAuditModels } from '../apps/api/src/modules/audit/models.ts';
import { createMongooseAuditWriter } from '../apps/api/src/modules/audit/writer.ts';
import { createMongooseSettingsRepository } from '../apps/api/src/modules/settings/repository.ts';

const database = `admin_settings_${randomUUID().replaceAll('-', '')}`;
const connection = await mongoose.createConnection(`mongodb://127.0.0.1:27018/${database}?replicaSet=rs0`).asPromise();
const report = { status: 'RUNNING', journey: 'GUIDE-25', journeys: ['GUIDE-25'], mockedRoutes: false,
  environment: 'isolated-local-MongoDB', faultInjection: 'durable audit throws after insert inside settings transaction',
  commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), startedAt: new Date().toISOString(), checks: [], cleanup: false };
try {
  const audits = createAuditModels(connection); await audits.AuditLog.init(); const durable = createMongooseAuditWriter(audits);
  let failAudit = true; const audit = { async record(entry, session) { const id = await durable.record(entry, session); if (failAudit) throw new Error('INJECTED_SETTINGS_AUDIT_FAILURE'); return id; } };
  const repository = createMongooseSettingsRepository(connection, audit); const actorId = new mongoose.Types.ObjectId().toHexString();
  const initial = { namespace: 'display', schemaVersion: 1, values: { guide25_atomic: false }, version: 0, updatedBy: new mongoose.Types.ObjectId(actorId), updatedAt: new Date('2026-09-13T00:00:00.000Z') };
  await connection.collection('admin_settings').insertOne(initial);
  const input = { namespace: 'display', actorId, expectedVersion: 0, data: { schemaVersion: 1, expectedVersion: 0, reason: 'Atomic settings update', values: { guide25_atomic: true } }, now: '2026-09-13T00:01:00.000Z' };
  const event = { actorType: 'admin', actorId, targetType: 'admin_settings', targetId: 'display', reason: input.data.reason,
    before: { ...initial, updatedBy: actorId, updatedAt: initial.updatedAt.toISOString() }, requestId: 'guide25-settings', traceId: 'a'.repeat(32), occurredAt: new Date(input.now) };
  await assert.rejects(repository.upsertWithAudit(input, event), /INJECTED_SETTINGS_AUDIT_FAILURE/u);
  const failed = await repository.find('display'); assert.equal(failed?.version, 0); assert.equal(failed?.values.guide25_atomic, false); assert.equal(await audits.AuditLog.countDocuments(), 0);
  report.checks.push('audit_failure_rolls_back_settings_values_version_and_inserted_audit');
  failAudit = false; const updated = await repository.upsertWithAudit(input, { ...event, requestId: 'guide25-settings-retry' });
  assert.equal(updated.kind, 'updated'); if (updated.kind !== 'updated') throw new Error('Expected updated settings'); assert.equal(updated.setting.version, 1); assert.equal(await audits.AuditLog.countDocuments(), 1);
  report.checks.push('retry_commits_settings_and_exactly_one_audit');
  const stale = await repository.upsertWithAudit(input, { ...event, requestId: 'guide25-settings-stale' }); assert.equal(stale.kind, 'version_conflict'); assert.equal(await audits.AuditLog.countDocuments(), 1);
  report.checks.push('stale_settings_version_writes_no_state_or_audit'); report.status = 'PASS_LOCAL';
} catch (error) { report.status = 'FAIL_LOCAL'; report.failure = error instanceof Error ? error.message : String(error); process.exitCode = 1; }
finally { try { await connection.dropDatabase(); report.cleanup = true; } catch (error) { report.status = 'FAIL_LOCAL'; report.cleanupError = error instanceof Error ? error.message : String(error); process.exitCode = 1; } report.finishedAt = new Date().toISOString(); await writeFile('docs/quality/guide-runs/admin-settings-guarantees-local-latest.json', `${JSON.stringify(report, null, 2)}\n`, 'utf8'); await connection.close(); }
console.log(`GUIDE-25 admin settings guarantees: ${report.status}; ${report.checks.length} checks; cleanup=${report.cleanup}`);
