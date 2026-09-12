import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import mongoose from 'mongoose';
import { createMongooseAdBannerRepository } from '../apps/api/src/modules/ads/banner-repository.ts';
import { createAuditModels } from '../apps/api/src/modules/audit/models.ts';
import { createMongooseAuditWriter } from '../apps/api/src/modules/audit/writer.ts';

const database = `admin_banners_${randomUUID().replaceAll('-', '')}`;
const connection = await mongoose.createConnection(`mongodb://127.0.0.1:27018/${database}?replicaSet=rs0`).asPromise();
const report = {
  status: 'RUNNING', journey: 'GUIDE-25', journeys: ['GUIDE-25'], mockedRoutes: false,
  environment: 'isolated-local-MongoDB',
  faultInjection: 'durable audit throws after insert inside banner create and update transactions',
  commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  startedAt: new Date().toISOString(), checks: [], cleanup: false
};

try {
  const audits = createAuditModels(connection);
  await audits.AuditLog.init();
  const durable = createMongooseAuditWriter(audits);
  let failAudit = true;
  const audit = {
    async record(entry, session) {
      const id = await durable.record(entry, session);
      if (failAudit) throw new Error('INJECTED_BANNER_AUDIT_FAILURE');
      return id;
    }
  };
  const repository = createMongooseAdBannerRepository(connection, audit);
  const actorId = new mongoose.Types.ObjectId().toHexString();
  const placementKey = 'guide25.banner';
  const createdAt = new Date('2026-09-13T08:00:00.000Z');
  const metadata = { requestId: 'guide25-banner-create', traceId: 'a'.repeat(32) };
  const input = {
    placementKey,
    title: { ar: 'بنر اختبار ذري', en: 'Atomic test banner' },
    startAt: '2026-10-01T00:00:00.000Z',
    endAt: '2026-10-31T00:00:00.000Z',
    sortOrder: 900
  };
  await connection.collection('ad_placements').insertOne({
    key: placementKey, surface: 'homepage', active: true, targetUrlRequired: false, sortOrder: 900
  });

  await assert.rejects(repository.createBanner(actorId, input, createdAt, metadata), /INJECTED_BANNER_AUDIT_FAILURE/u);
  assert.equal(await connection.collection('ad_banners').countDocuments(), 0);
  assert.equal(await audits.AuditLog.countDocuments(), 0);
  report.checks.push('audit_failure_rolls_back_banner_creation_and_inserted_audit');

  failAudit = false;
  const created = await repository.createBanner(actorId, input, createdAt, { ...metadata, requestId: 'guide25-banner-create-retry' });
  assert.equal(created.version, 0);
  assert.equal(await connection.collection('ad_banners').countDocuments(), 1);
  assert.equal(await audits.AuditLog.countDocuments({ targetId: created.id, action: 'ad_banner.create' }), 1);
  report.checks.push('create_retry_commits_banner_with_exactly_one_audit');

  failAudit = true;
  const updateInput = { expectedVersion: 0, reason: 'Verify atomic banner update', title: { ar: 'بنر ذري محدث', en: 'Updated atomic banner' } };
  await assert.rejects(
    repository.updateBanner(actorId, created.id, updateInput, new Date('2026-09-13T08:01:00.000Z'), {
      requestId: 'guide25-banner-update', traceId: 'b'.repeat(32)
    }),
    /INJECTED_BANNER_AUDIT_FAILURE/u
  );
  const rolledBack = await connection.collection('ad_banners').findOne({ _id: new mongoose.Types.ObjectId(created.id) });
  assert.equal(rolledBack?.version, 0);
  assert.deepEqual(rolledBack?.title, input.title);
  assert.equal(await audits.AuditLog.countDocuments({ targetId: created.id }), 1);
  report.checks.push('audit_failure_rolls_back_banner_values_version_and_update_audit');

  failAudit = false;
  const updated = await repository.updateBanner(actorId, created.id, updateInput, new Date('2026-09-13T08:01:00.000Z'), {
    requestId: 'guide25-banner-update-retry', traceId: 'c'.repeat(32)
  });
  assert.equal(updated.version, 1);
  assert.equal(updated.title.en, 'Updated atomic banner');
  assert.equal(await audits.AuditLog.countDocuments({ targetId: created.id, action: 'ad_banner.update' }), 1);
  report.checks.push('update_retry_commits_values_version_and_exactly_one_audit');

  await assert.rejects(
    repository.updateBanner(actorId, created.id, updateInput, new Date('2026-09-13T08:02:00.000Z'), {
      requestId: 'guide25-banner-stale', traceId: 'd'.repeat(32)
    }),
    /VERSION_CONFLICT/u
  );
  assert.equal(await audits.AuditLog.countDocuments({ targetId: created.id }), 2);
  await assert.rejects(
    repository.createBanner(actorId, input, createdAt, { ...metadata, requestId: 'guide25-banner-duplicate' }),
    /DUPLICATE/u
  );
  assert.equal(await audits.AuditLog.countDocuments({ targetId: created.id }), 2);
  report.checks.push('stale_update_and_duplicate_create_write_no_state_or_audit');
  report.status = 'PASS_LOCAL';
} catch (error) {
  report.status = 'FAIL_LOCAL';
  report.failure = error instanceof Error ? error.message : String(error);
  process.exitCode = 1;
} finally {
  try {
    await connection.dropDatabase();
    report.cleanup = true;
  } catch (error) {
    report.status = 'FAIL_LOCAL';
    report.cleanupError = error instanceof Error ? error.message : String(error);
    process.exitCode = 1;
  }
  report.finishedAt = new Date().toISOString();
  await writeFile('docs/quality/guide-runs/admin-banner-guarantees-local-latest.json', `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await connection.close();
}

console.log(`GUIDE-25 admin banner guarantees: ${report.status}; ${report.checks.length} checks; cleanup=${report.cleanup}`);
