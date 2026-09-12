import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import mongoose from 'mongoose';
import { createAuditModels } from '../apps/api/src/modules/audit/models.ts';
import { createMongooseAuditWriter } from '../apps/api/src/modules/audit/writer.ts';
import { createMongooseProviderSettingsRepository } from '../apps/api/src/modules/settings/provider-repository.ts';
import { ProviderSettingsServiceError, createProviderSettingsService } from '../apps/api/src/modules/settings/provider-service.ts';

const database = `provider_settings_guarantees_${randomUUID().replaceAll('-', '')}`;
const connection = await mongoose.createConnection(`mongodb://127.0.0.1:27018/${database}?replicaSet=rs0`).asPromise();
connection.base.set('transactionAsyncLocalStorage', true);
const report = {
  status: 'RUNNING', journey: 'GUIDE-18', journeys: ['GUIDE-18'], mockedRoutes: false,
  environment: 'isolated-local-MongoDB', faultInjection: 'durable audit throws after insert inside provider settings transaction',
  commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  startedAt: new Date().toISOString(), checks: [], cleanup: false
};

try {
  const userId = new mongoose.Types.ObjectId();
  const now = new Date('2026-09-12T12:00:00.000Z');
  await connection.collection('users').insertOne({ _id: userId, normalizedEmail: 'settings-guarantee@example.invalid', roleType: 'provider', status: 'verified', createdAt: now, updatedAt: now, version: 0 });
  await connection.collection('provider_applications').insertOne({ _id: new mongoose.Types.ObjectId(), userId, email: 'settings-guarantee@example.invalid', status: 'approved', createdAt: now, updatedAt: now, version: 0 });
  const auditModels = createAuditModels(connection);
  await auditModels.AuditLog.init();
  const durable = createMongooseAuditWriter(auditModels);
  let failAudit = true;
  const audit = { async record(entry, session) {
    const id = await durable.record(entry, session);
    if (failAudit) throw new Error('INJECTED_PROVIDER_SETTINGS_AUDIT_FAILURE');
    return id;
  } };
  const service = createProviderSettingsService({
    repository: createMongooseProviderSettingsRepository(connection), audit,
    transaction: async operation => {
      const session = await connection.startSession();
      try { return await session.withTransaction(() => operation(session)); }
      finally { await session.endSession(); }
    }, now: () => now
  });
  const claims = { iss: 'sadat-real-estate-api', aud: 'sadat-real-estate', sub: userId.toHexString(), sid: new mongoose.Types.ObjectId().toHexString(), role: 'provider', status: 'verified', iat: 1, exp: 9_999_999_999, jti: randomUUID() };
  const context = { requestId: 'provider-settings-guarantee', traceId: 'a'.repeat(32) };
  await assert.rejects(service.update(claims, { expectedVersion: 0, whatsappNumber: '+201000000001' }, context), /INJECTED_PROVIDER_SETTINGS_AUDIT_FAILURE/u);
  assert.equal(await connection.collection('provider_settings').countDocuments({ userId }), 0);
  assert.equal(await auditModels.AuditLog.countDocuments({ targetId: userId.toHexString() }), 0);
  report.checks.push('audit_failure_rolls_back_provider_settings_and_inserted_audit');

  failAudit = false;
  const recovered = await service.update(claims, { expectedVersion: 0, whatsappNumber: '+201000000001' }, context);
  assert.equal(recovered.version, 1);
  assert.equal(await auditModels.AuditLog.countDocuments({ targetId: userId.toHexString() }), 1);
  report.checks.push('same_expected_version_retry_after_rollback_writes_once');

  const concurrent = await Promise.allSettled([
    service.update(claims, { expectedVersion: 1, officeAddress: 'First concurrent address' }, { requestId: 'provider-settings-concurrent-a', traceId: 'b'.repeat(32) }),
    service.update(claims, { expectedVersion: 1, officeAddress: 'Second concurrent address' }, { requestId: 'provider-settings-concurrent-b', traceId: 'c'.repeat(32) })
  ]);
  assert.equal(concurrent.filter(result => result.status === 'fulfilled').length, 1);
  const rejected = concurrent.find(result => result.status === 'rejected');
  assert.ok(rejected?.status === 'rejected' && rejected.reason instanceof ProviderSettingsServiceError && rejected.reason.code === 'PROVIDER_SETTINGS_VERSION_CONFLICT');
  const final = await service.get(claims);
  assert.equal(final.version, 2);
  assert.equal(await auditModels.AuditLog.countDocuments({ targetId: userId.toHexString() }), 2);
  report.checks.push('concurrent_same_version_one_write_one_conflict_with_two_total_audits');
  report.mongo = { rollbackResidue: 0, recoveredVersion: recovered.version, finalVersion: final.version,
    finalAuditCount: 2, auditAction: 'provider.settings.update' };
  report.status = 'PASS_LOCAL';
} catch (error) {
  report.status = 'FAIL_LOCAL';
  report.failure = error instanceof Error ? error.message : String(error);
  process.exitCode = 1;
} finally {
  try {
    assert.equal(connection.name, database);
    await connection.dropDatabase();
    report.cleanup = (await connection.db.listCollections().toArray()).length === 0;
    assert.equal(report.cleanup, true);
  } catch (error) {
    report.status = 'FAIL_LOCAL'; report.cleanup = false;
    report.cleanupFailure = error instanceof Error ? error.message : String(error); process.exitCode = 1;
  }
  await connection.close();
  report.finishedAt = new Date().toISOString();
  await mkdir('docs/quality/guide-runs', { recursive: true });
  await writeFile('docs/quality/guide-runs/provider-settings-guarantees-local-latest.json', `${JSON.stringify(report, null, 2)}\n`);
}
console.log(`PROVIDER_SETTINGS_GUARANTEES_${report.status} checks=${report.checks.length} cleanup=${report.cleanup}`);
