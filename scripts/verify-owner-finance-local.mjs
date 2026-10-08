import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';
import { createProviderAdvertisingModels } from '../apps/api/src/modules/provider/advertising-models.ts';
import { createMongooseAdvertisingFinancialSource } from '../apps/api/src/modules/reports/advertising-ledger-repository.ts';
import { createAdvertisingLedgerService } from '../apps/api/src/modules/reports/advertising-ledger.ts';
import { createMongooseAdminOverviewSource } from '../apps/api/src/modules/admin/overview-repository.ts';

const connection = await mongoose.createConnection(`mongodb://127.0.0.1:27031/qa_owner_finance_${randomUUID().replaceAll('-', '')}?replicaSet=adcampaignqa`).asPromise();
try {
  const models = createProviderAdvertisingModels(connection);
  const providerId = new mongoose.Types.ObjectId(); const issuerId = new mongoose.Types.ObjectId();
  const createdAt = new Date('2026-10-07T10:00:00Z');
  const request = await models.AdRequest.create({ providerId, placementKey: 'homepage.hero', purpose: 'Native financial QA', intervalStart: new Date('2026-10-08T10:00:00Z'), intervalEnd: new Date('2026-10-09T10:00:00Z'), status: 'waiting_payment', version: 2, createdAt, updatedAt: createdAt });
  await models.AdRequest.create({ providerId, requestMode: 'assisted', contactPhone: '+201234567890', purpose: 'Unpriced contact request', status: 'review', version: 0, createdAt, updatedAt: createdAt });
  await models.AdQuote.create({ requestId: request._id, providerId, issuerId, currency: 'EGP', lineItems: [{ description: 'Campaign', quantity: 1, unitAmountMinor: 50000 }], totalMinor: 50000, validUntil: new Date('2026-10-10T00:00:00Z'), terms: 'Reviewed price', status: 'accepted', version: 1, decisionHistory: [{ action: 'issued', actorId: issuerId, actorRole: 'admin', version: 0, createdAt }, { action: 'accepted', actorId: providerId, actorRole: 'provider', version: 1, createdAt }], createdAt, updatedAt: createdAt });
  for (let n = 0; n < 2; n++) await models.PaymentProof.create({ adRequestId: request._id, providerId, originalFilename: 'proof.png', normalizedExtension: '.png', detectedMime: 'image/png', byteSize: 100, sha256: String(n).repeat(64), storageKey: `qa-${n}`, version: 1, securityState: 'clean', status: 'approved', reviewHistory: [{ action: 'approve', actorId: issuerId, reason: 'Checked receipt', version: 1, createdAt }], uploadedAt: createdAt, active: true, idempotentReplay: false });
  const source = createMongooseAdvertisingFinancialSource(connection, models);
  const rows = await source.list(); assert.equal(rows.length, 2);
  const admin = { sub: issuerId.toHexString(), role: 'admin', status: 'verified' };
  const service = createAdvertisingLedgerService({ source, authorization: { authorize: async () => true } });
  const financial = await service.listFinancialReview(admin, { status: 'payment_approved' });
  assert.equal(financial.total, 1); assert.deepEqual(financial.summary.totals, [{ currency: 'EGP', amountMinor: 50000 }]);
  const overview = createMongooseAdminOverviewSource(connection);
  const metrics = await overview.aggregate({ from: '2026-10-07T00:00:00Z', to: '2026-10-08T00:00:00Z' });
  assert.equal(metrics.approvedAdPaymentsMinor, 50000); assert.equal(metrics.adRequests, 2); assert.equal(metrics.paymentProofs, 2);
  assert.equal((await overview.aggregate({ from: '2026-10-08T00:00:00Z', to: '2026-10-09T00:00:00Z' })).approvedAdPaymentsMinor, 0);
  console.log('PASS: real Mongo approved-payment filter/summary, duplicate receipts counted once, unpriced assisted request, dashboard range totals.');
} finally { await connection.dropDatabase(); await connection.close(); }
