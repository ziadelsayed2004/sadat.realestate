import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import mongoose from 'mongoose';
import { createAuditModels } from '../apps/api/src/modules/audit/models.ts';
import { createMongooseAuditWriter } from '../apps/api/src/modules/audit/writer.ts';
import { createPropertyModels } from '../apps/api/src/modules/properties/models.ts';
import { createMongoosePropertyRepository } from '../apps/api/src/modules/properties/repository.ts';

const database = `property_guarantees_${randomUUID().replaceAll('-', '')}`;
const connection = await mongoose.createConnection(`mongodb://127.0.0.1:27018/${database}?replicaSet=rs0`).asPromise();
const report = {
  status: 'RUNNING', journeys: ['GUIDE-14', 'GUIDE-15'],
  environment: 'isolated-local-MongoDB', mockedRoutes: false,
  faultInjection: 'durable audit writer throws after insert within the property transaction',
  commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  startedAt: new Date().toISOString(), checks: [], cleanup: false
};

try {
  const auditModels = createAuditModels(connection);
  const propertyModels = createPropertyModels(connection);
  await Promise.all([auditModels.AuditLog.init(), propertyModels.Property.init()]);
  const durableAudit = createMongooseAuditWriter(auditModels);
  let failAudit = true;
  const audit = {
    async record(entry, session) {
      const id = await durableAudit.record(entry, session);
      if (failAudit) throw new Error('INJECTED_PROPERTY_AUDIT_FAILURE');
      return id;
    }
  };
  const repository = createMongoosePropertyRepository(connection, propertyModels, audit);
  const propertyId = new mongoose.Types.ObjectId();
  const providerId = new mongoose.Types.ObjectId();
  const adminId = new mongoose.Types.ObjectId();
  const now = new Date('2026-09-12T12:00:00.000Z');
  await propertyModels.Property.create({
    _id: propertyId, providerId, sourceType: 'individual_broker', kind: 'property',
    name: { ar: 'عقار تحقق مؤقت', en: 'Temporary verification property' },
    slug: 'temporary-verification-property', transactionType: 'sale',
    status: 'pending_review', active: false, submittedAt: now,
    createdAt: now, updatedAt: now, version: 0
  });
  const before = await repository.findByIdAny(propertyId.toHexString());
  assert.ok(before);
  const input = {
    id: propertyId.toHexString(), expectedVersion: 0, toStatus: 'approved',
    reviewerId: adminId.toHexString(), before,
    metadata: {
      actorId: adminId.toHexString(), reason: 'Verify atomic property review rollback',
      requestId: 'property-guarantee-review', traceId: 'a'.repeat(32), changedAt: now
    }
  };
  await assert.rejects(repository.review(input), /INJECTED_PROPERTY_AUDIT_FAILURE/u);
  const unchanged = await propertyModels.Property.findById(propertyId).lean();
  assert.equal(unchanged?.status, 'pending_review');
  assert.equal(unchanged?.version, 0);
  assert.equal(await auditModels.AuditLog.countDocuments({ targetId: propertyId.toHexString() }), 0);
  report.checks.push('audit_failure_rolls_back_property_review_and_inserted_audit');

  failAudit = false;
  const retried = await repository.review(input);
  assert.equal(retried.kind, 'written');
  assert.equal(retried.property.status, 'approved');
  assert.equal(retried.property.version, 1);
  assert.equal(await auditModels.AuditLog.countDocuments({ targetId: propertyId.toHexString() }), 1);
  report.checks.push('same_expected_version_retry_after_rollback_writes_once');
  report.mongo = {
    failedReviewStatus: unchanged.status, failedReviewVersion: unchanged.version,
    failedReviewAuditCount: 0, recoveredStatus: retried.property.status,
    recoveredVersion: retried.property.version, recoveredAuditCount: 1
  };
  report.status = 'PASS_LOCAL';
} catch (error) {
  report.status = 'FAIL_LOCAL';
  report.failure = error instanceof Error ? error.message.slice(0, 1000) : String(error).slice(0, 1000);
  process.exitCode = 1;
} finally {
  try {
    assert.equal(connection.name, database);
    assert.match(database, /^property_guarantees_[a-f0-9]{32}$/u);
    await connection.dropDatabase();
    report.cleanup = (await connection.db.listCollections().toArray()).length === 0;
    assert.equal(report.cleanup, true);
  } catch (cleanupError) {
    report.cleanup = false;
    report.cleanupFailure = cleanupError instanceof Error ? cleanupError.message.slice(0, 1000) : String(cleanupError).slice(0, 1000);
    report.status = 'FAIL_LOCAL';
    process.exitCode = 1;
  }
  await connection.close();
  report.finishedAt = new Date().toISOString();
  await mkdir('docs/quality/guide-runs', { recursive: true });
  await writeFile('docs/quality/guide-runs/property-guarantees-local-latest.json', `${JSON.stringify(report, null, 2)}\n`);
}

console.log(`PROPERTY_GUARANTEES_${report.status} checks=${report.checks.length} cleanup=${report.cleanup}`);
