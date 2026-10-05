import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import mongoose from 'mongoose';
import { createMongooseAdBannerRepository } from '../apps/api/src/modules/ads/banner-repository.ts';
import { createAuditModels } from '../apps/api/src/modules/audit/models.ts';
import { createMongooseAuditWriter } from '../apps/api/src/modules/audit/writer.ts';

import sharp from 'sharp';
import { Readable } from 'node:stream';
import { createBannerManagement, readPublishedBannerRows } from '../apps/api/src/modules/ads/banner-management.ts';
import { createInMemoryStorageAdapter, createDeterministicMalwareScanner } from '../apps/api/src/modules/uploads/adapters.ts';
import { createMongoosePublicHomepageRepository } from '../apps/api/src/modules/public/homepage.ts';

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
  const claims = { sub: actorId, role: 'admin', status: 'verified' };
  const storage = createInMemoryStorageAdapter();
  const management = createBannerManagement({ connection, authorization: { authorize: async () => true }, audit: durable, storage, scanner: createDeterministicMalwareScanner('clean'), policy: { read: async () => ({ supportedPlacements: [], supportedAdTypes: [], acceptedFileFormats: [], dimensions: [], paymentProofMethods: [] }) } });
  await assert.rejects(management.readConfig({ ...claims, role: 'seeker' }), /errors.forbidden/u);
  const configured = await management.updateConfig(claims, { enabled: true, expectedVersion: 0, reason: 'Set up homepage banners' }, metadata);
  assert.equal(configured.enabled, true);
  assert.equal(configured.placements.some(row => row.key === 'homepage.hero'), true);
  await assert.rejects(management.updateConfig(claims, { enabled: false, expectedVersion: 0, reason: 'Stale config' }, metadata), /errors.conflict/u);
  report.checks.push('explicit_authorized_display_setup_creates_default_placement_and_rejects_stale_config');
  const now = new Date();
  const liveInput = { placementKey: 'homepage.hero', title: { ar: '???? ?????? ?????', en: 'Published test banner' }, startAt: new Date(now.getTime() - 60000).toISOString(), endAt: new Date(now.getTime() + 3600000).toISOString() };
  const [first, second] = await Promise.all([repository.createBanner(actorId, liveInput, now, metadata), repository.createBanner(actorId, liveInput, now, metadata)]);
  assert.notEqual(first.sortOrder, second.sortOrder);
  report.checks.push('concurrent_banner_creation_allocates_distinct_order_without_duplicate_drafts');
  await assert.rejects(repository.updateBanner(actorId, first.id, { expectedVersion: 0, status: 'active', reason: 'No image' }, now, metadata), /BANNER_MEDIA_REQUIRED/u);
  await assert.rejects(management.upload(claims, first.id, Readable.from(Buffer.from('<svg/>')), 'image/png', metadata));
  const image = await sharp({ create: { width: 1200, height: 400, channels: 3, background: '#154c40' } }).png().toBuffer();
  const media = await management.upload(claims, first.id, Readable.from(image), 'image/png', metadata);
  assert.equal(media.width, 1200); assert.equal(media.height, 400); assert.equal('storageKey' in media, false);
  await assert.rejects(management.openMedia(media.id), /errors.notFound/u);
  const preview = await management.openMedia(media.id, claims); for await (const chunk of preview.stream) { assert.ok(chunk.length > 0); }
  let current = await repository.updateBanner(actorId, first.id, { expectedVersion: 0, mediaId: media.id, reason: 'Attach scanned image' }, now, metadata);
  current = await repository.updateBanner(actorId, first.id, { expectedVersion: current.version, status: 'active', reason: 'Publish now' }, now, metadata);
  assert.equal((await readPublishedBannerRows(connection)).length, 1);
  const homepage = await createMongoosePublicHomepageRepository(connection).read();
  assert.equal(homepage.banners.some(row => row.key === 'banner-' + first.id && row.imageUrl === media.url), true);
  const visible = await management.openMedia(media.id); for await (const chunk of visible.stream) { assert.ok(chunk.length > 0); }
  report.checks.push('scanned_device_image_is_private_as_draft_and_visible_on_real_homepage_after_publication');
  const attachedSecond = await repository.createBannerMedia(actorId, second.id, { url: 'https://example.com/banner.png', mime: 'image/png', width: 1200, height: 400 }, now);
  await repository.updateBanner(actorId, second.id, { expectedVersion: 0, mediaId: attachedSecond.id, reason: 'Attach second image' }, now, metadata);
  await assert.rejects(repository.updateBanner(actorId, second.id, { expectedVersion: 1, status: 'active', reason: 'Overlapping publication' }, now, metadata), /PLACEMENT_CONFLICT/u);
  current = await repository.updateBanner(actorId, first.id, { expectedVersion: current.version, status: 'draft', reason: 'Stop display' }, now, metadata);
  assert.equal((await readPublishedBannerRows(connection)).length, 0);
  await assert.rejects(management.openMedia(media.id), /errors.notFound/u);
  const future = new Date(now.getTime() + 120000); const end = new Date(now.getTime() + 180000);
  current = await repository.updateBanner(actorId, first.id, { expectedVersion: current.version, startAt: future.toISOString(), endAt: end.toISOString(), status: 'scheduled', reason: 'Schedule future display' }, now, metadata);
  assert.equal((await readPublishedBannerRows(connection, now)).length, 0);
  assert.equal((await readPublishedBannerRows(connection, future)).length, 1);
  assert.equal((await readPublishedBannerRows(connection, end)).length, 0);
  await management.updateConfig(claims, { enabled: false, expectedVersion: configured.version, reason: 'Disable all banners' }, metadata);
  assert.equal((await readPublishedBannerRows(connection, future)).length, 0);
  await repository.updateBanner(actorId, first.id, { expectedVersion: current.version, status: 'archived', reason: 'Archive banner' }, now, metadata);
  report.checks.push('overlap_rejected_stop_revokes_public_image_schedule_appears_and_expires_without_manual_activation');
  const beforeReorder = (await repository.previewBanner(first.id)).banner;
  await assert.rejects(repository.reorderBanners(actorId, { placementKey: 'homepage.hero', reason: 'Reject partial reorder', items: [{ bannerId: first.id, sortOrder: 99, expectedVersion: beforeReorder.version }, { bannerId: second.id, sortOrder: 100, expectedVersion: 999 }] }, now), /VERSION_CONFLICT/u);
  assert.equal((await repository.previewBanner(first.id)).banner.sortOrder, beforeReorder.sortOrder);
  assert.equal((await repository.previewBanner(first.id)).banner.version, beforeReorder.version);
  report.checks.push('reorder_conflict_rolls_back_all_orders_and_versions');
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
