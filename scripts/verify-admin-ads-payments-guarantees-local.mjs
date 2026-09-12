import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import mongoose from 'mongoose';
import { createAuditModels } from '../apps/api/src/modules/audit/models.ts';
import { createMongooseAuditWriter } from '../apps/api/src/modules/audit/writer.ts';
import { createMongooseAdAdminRequestRepository } from '../apps/api/src/modules/ads/repository.ts';
import { createMongoosePaymentProofRepository } from '../apps/api/src/modules/payments/repository.ts';
import { createProviderAdvertisingModels } from '../apps/api/src/modules/provider/advertising-models.ts';

const database = `admin_ads_payments_${randomUUID().replaceAll('-', '')}`;
const connection = await mongoose.createConnection(`mongodb://127.0.0.1:27018/${database}?replicaSet=rs0`).asPromise();
connection.base.set('transactionAsyncLocalStorage', true);
const report = {
  status: 'RUNNING', journey: 'GUIDE-23', journeys: ['GUIDE-23'], mockedRoutes: false,
  environment: 'isolated-local-MongoDB', faultInjection: 'durable audit throws after insert inside each review transaction',
  commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  startedAt: new Date().toISOString(), checks: [], cleanup: false
};

try {
  const audits = createAuditModels(connection);
  const models = createProviderAdvertisingModels(connection);
  await Promise.all([audits.AuditLog.init(), models.AdRequest.init(), models.PaymentProof.init()]);
  const durable = createMongooseAuditWriter(audits);
  let failAudit = true;
  const audit = {
    async record(entry, session) {
      const id = await durable.record(entry, session);
      if (failAudit) throw new Error('INJECTED_GUIDE23_AUDIT_FAILURE');
      return id;
    }
  };
  const actorId = new mongoose.Types.ObjectId();
  const providerId = new mongoose.Types.ObjectId();
  const requestId = new mongoose.Types.ObjectId();
  const proofId = new mongoose.Types.ObjectId();
  const now = new Date('2026-09-12T22:00:00.000Z');
  await models.AdRequest.create({
    _id: requestId, providerId, placementKey: 'homepage.hero', adType: 'banner', purpose: 'GUIDE-23 atomic request',
    intervalStart: new Date('2026-09-13T22:00:00.000Z'), intervalEnd: new Date('2026-09-14T22:00:00.000Z'),
    status: 'review', version: 0, history: [{ status: 'review', version: 0, reason: 'Atomic fixture', changedAt: now }],
    createdAt: now, updatedAt: now
  });
  await models.PaymentProof.create({
    _id: proofId, adRequestId: requestId, providerId, paymentMethod: 'bank_transfer', originalFilename: 'atomic.pdf',
    normalizedExtension: '.pdf', detectedMime: 'application/pdf', byteSize: 128, sha256: randomBytes(32).toString('hex'),
    version: 1, securityState: 'clean', status: 'pending_review', reviewHistory: [], uploadedAt: now,
    active: true, idempotentReplay: false, storageKey: `guide23/${proofId.toHexString()}.pdf`
  });

  const adRepository = createMongooseAdAdminRequestRepository(connection, models, audit);
  const adMetadata = { actorId: actorId.toHexString(), requestId: 'guide23-ad-review', traceId: 'a'.repeat(32) };
  await assert.rejects(
    adRepository.reviewAdminRequest(requestId.toHexString(), 0, 'waiting_pricing', 'Atomic ad approval', now, adMetadata),
    /INJECTED_GUIDE23_AUDIT_FAILURE/u
  );
  const requestAfterFailure = await models.AdRequest.findById(requestId).lean();
  assert.equal(requestAfterFailure?.status, 'review');
  assert.equal(requestAfterFailure?.version, 0);
  assert.equal(requestAfterFailure?.history?.length, 1);
  assert.equal(await audits.AuditLog.countDocuments({ targetId: requestId.toHexString() }), 0);
  report.checks.push('ad_request_audit_failure_rolls_back_state_version_history_and_inserted_audit');

  const paymentRepository = createMongoosePaymentProofRepository(connection, models, audit);
  const stored = await paymentRepository.find(proofId.toHexString());
  assert.ok(stored);
  const beforeProof = Object.fromEntries(Object.entries(stored).filter(([key]) => key !== 'storageKey'));
  const historyEntry = { action: 'approve', actorId: actorId.toHexString(), reason: 'Atomic payment approval', version: 2, createdAt: now.toISOString() };
  const afterProof = { ...beforeProof, status: 'approved', version: 2, reviewHistory: [...beforeProof.reviewHistory, historyEntry] };
  const proofEvent = {
    actorType: 'admin', actorId: actorId.toHexString(), targetType: 'payment_proof', targetId: proofId.toHexString(),
    action: 'payment_proof.approve', reason: historyEntry.reason, before: beforeProof, after: afterProof,
    requestId: 'guide23-proof-review', traceId: 'b'.repeat(32), occurredAt: now
  };
  await assert.rejects(
    paymentRepository.reviewWithAudit(proofId.toHexString(), 1, { status: 'approved', reviewHistoryEntry: historyEntry }, proofEvent),
    /INJECTED_GUIDE23_AUDIT_FAILURE/u
  );
  const proofAfterFailure = await models.PaymentProof.findById(proofId).lean();
  assert.equal(proofAfterFailure?.status, 'pending_review');
  assert.equal(proofAfterFailure?.version, 1);
  assert.equal(proofAfterFailure?.reviewHistory.length, 0);
  assert.equal(await audits.AuditLog.countDocuments({ targetId: proofId.toHexString() }), 0);
  report.checks.push('payment_proof_audit_failure_rolls_back_state_version_history_and_inserted_audit');

  failAudit = false;
  const reviewedAd = await adRepository.reviewAdminRequest(requestId.toHexString(), 0, 'waiting_pricing', 'Atomic ad approval', now, { ...adMetadata, requestId: 'guide23-ad-retry' });
  assert.equal(reviewedAd?.request.status, 'waiting_pricing');
  const reviewedProof = await paymentRepository.reviewWithAudit(proofId.toHexString(), 1, { status: 'approved', reviewHistoryEntry: historyEntry }, { ...proofEvent, requestId: 'guide23-proof-retry' });
  assert.equal(reviewedProof?.status, 'approved');
  assert.equal(await audits.AuditLog.countDocuments(), 2);
  report.checks.push('retries_commit_each_review_with_exactly_one_audit');

  const staleAd = await adRepository.reviewAdminRequest(requestId.toHexString(), 0, 'rejected', 'Stale ad review', now, { ...adMetadata, requestId: 'guide23-ad-stale' });
  const staleProof = await paymentRepository.reviewWithAudit(proofId.toHexString(), 1, { status: 'rejected', reviewHistoryEntry: { ...historyEntry, action: 'reject', reason: 'Stale payment review' } }, { ...proofEvent, action: 'payment_proof.reject', reason: 'Stale payment review', requestId: 'guide23-proof-stale' });
  assert.equal(staleAd, undefined);
  assert.equal(staleProof, undefined);
  assert.equal(await audits.AuditLog.countDocuments(), 2);
  report.checks.push('stale_competing_reviews_write_neither_state_nor_audit');
  report.status = 'PASS_LOCAL';
} catch (error) {
  report.status = 'FAIL_LOCAL';
  report.failure = error instanceof Error ? error.message : String(error);
  process.exitCode = 1;
} finally {
  try {
    await connection.dropDatabase();
    report.cleanup = true;
  } catch (cleanupError) {
    report.cleanupError = cleanupError instanceof Error ? cleanupError.message : String(cleanupError);
    report.status = 'FAIL_LOCAL';
    process.exitCode = 1;
  }
  report.finishedAt = new Date().toISOString();
  await writeFile('docs/quality/guide-runs/admin-ads-payments-guarantees-local-latest.json', `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await connection.close();
}

console.log(`GUIDE-23 admin ads/payments guarantees: ${report.status}; ${report.checks.length} checks; cleanup=${report.cleanup}`);
