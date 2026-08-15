import assert from 'node:assert/strict';
import test from 'node:test';
import type { AccessTokenClaims } from '../../src/modules/auth/crypto.js';
import { AdvertisingLedgerServiceError, createAdvertisingLedgerService, type AdvertisingFinancialRecord } from '../../src/modules/reports/advertising-ledger.js';

const admin = { iss: 'sadat-realestate-api', aud: 'sadat-realestate', sub: '3123456789abcdef01234567', sid: '1123456789abcdef01234567', role: 'admin', status: 'verified', iat: 1, exp: 9999999999, jti: 'test' } as AccessTokenClaims;
const seeker = { ...admin, role: 'seeker' } as AccessTokenClaims;

const request = { id: 'aaaaaaaaaaaaaaaaaaaaaaaa', providerId: '2123456789abcdef01234567', placementKey: 'homepage.hero', purpose: 'Reviewed campaign', intervalStart: '2026-09-01T09:00:00+00:00', intervalEnd: '2026-09-02T09:00:00+00:00', status: 'active' as const, version: 5, createdAt: '2026-08-13T00:00:00+00:00', updatedAt: '2026-08-13T01:00:00+00:00' };
const record: AdvertisingFinancialRecord = {
  request,
  quote: { id: 'bbbbbbbbbbbbbbbbbbbbbbbb', requestId: request.id, providerId: request.providerId, currency: 'EGP', lineItems: [{ description: 'One day', quantity: 1, unitAmountMinor: 1500 }], totalMinor: 1500, validUntil: '2026-10-01T00:00:00+00:00', terms: 'Quote only', status: 'accepted', issuerId: 'cccccccccccccccccccccccc', version: 1, decisionHistory: [{ action: 'issued', actorId: 'cccccccccccccccccccccccc', actorRole: 'admin', version: 0, createdAt: '2026-08-13T00:30:00+00:00' }, { action: 'accepted', actorId: request.providerId, actorRole: 'provider', version: 1, createdAt: '2026-08-13T00:40:00+00:00' }], createdAt: '2026-08-13T00:30:00+00:00', updatedAt: '2026-08-13T00:40:00+00:00' },
  paymentProofs: [{ id: 'dddddddddddddddddddddddd', adRequestId: request.id, providerId: request.providerId, originalFilename: 'proof.png', normalizedExtension: '.png', detectedMime: 'image/png', byteSize: 100, sha256: 'e'.repeat(64), version: 1, securityState: 'clean', status: 'approved', reviewHistory: [{ action: 'approve', actorId: admin.sub, reason: 'Reviewed document', version: 1, createdAt: '2026-08-13T00:50:00+00:00' }], uploadedAt: '2026-08-13T00:45:00+00:00', active: true, idempotentReplay: false }],
  schedule: { requestId: request.id, placementKey: request.placementKey, providerId: request.providerId, status: 'active', startsAt: request.intervalStart, endsAt: request.intervalEnd, timezone: 'Africa/Cairo', localStart: '2026-09-01T12:00:00', localEnd: '2026-09-02T12:00:00', version: 6 }
};

test('financial review separates quote and payment-proof states and emits non-realized ledger entries', async () => {
  const service = createAdvertisingLedgerService({ source: { list: async () => [record] } });
  const result = await service.listFinancialReview(admin, { page: 1, limit: 10 });
  assert.equal(result.total, 1);
  assert.equal(result.items[0]?.financialState, 'payment_proof_approved');
  assert.equal(result.items[0]?.quotedTotalMinor, 1500);
  assert.equal('realizedRevenueMinor' in result.items[0]!, false);
  assert.equal('bankVerified' in result.items[0]!, false);
  const ledger = await service.listLedger(admin, { source: 'quote', page: 1, limit: 10 });
  assert.equal(ledger.total, 2);
  assert.equal(ledger.items.every(item => item.accountingTreatment === 'not_realized'), true);
  assert.equal(ledger.items.every(item => item.amountMinor === 1500), true);
  const detail = await service.getFinancialReview(admin, request.id);
  assert.equal(detail.paymentProofStatus, 'approved');
});

test('financial reports require verified admins, reject unsafe filters, and fail closed for source ownership', async () => {
  const service = createAdvertisingLedgerService({ source: { list: async () => [record] } });
  await assert.rejects(() => service.listFinancialReview(seeker, {}), (error) => error instanceof AdvertisingLedgerServiceError && error.code === 'AD_REPORT_FORBIDDEN');
  await assert.rejects(() => service.listFinancialReview(admin, { from: '2026-09-02T00:00:00+00:00', to: '2026-09-01T00:00:00+00:00' }), /to must be after from/);
  await assert.rejects(() => service.listLedger(admin, { unknown: true }), /Unrecognized key/);
  const invalid = createAdvertisingLedgerService({ source: { list: async () => [{ ...record, quote: { ...record.quote!, providerId: '999999999999999999999999' } }] } });
  await assert.rejects(() => invalid.listFinancialReview(admin, {}), (error) => error instanceof AdvertisingLedgerServiceError && error.code === 'AD_REPORT_SOURCE_INVALID');
  await assert.rejects(() => service.getFinancialReview(admin, 'ffffffffffffffffffffffff'), (error) => error instanceof AdvertisingLedgerServiceError && error.code === 'AD_REPORT_NOT_FOUND');
});
