import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import test from 'node:test';
import type { AccessTokenClaims } from '../../src/modules/auth/crypto.js';
import { createDeterministicMalwareScanner, createInMemoryStorageAdapter, createUnavailableMalwareScanner } from '../../src/modules/uploads/adapters.js';
import { PaymentProofServiceError, createPaymentProofService } from '../../src/modules/payments/service.js';

const provider = { iss: 'sadat-realestate-api', aud: 'sadat-realestate', sub: '2123456789abcdef01234567', sid: '1123456789abcdef01234567', role: 'provider', status: 'verified', iat: 1, exp: 9999999999, jti: 'test' } as AccessTokenClaims;
const admin = { ...provider, sub: '3123456789abcdef01234567', role: 'admin' } as AccessTokenClaims;
const seeker = { ...provider, role: 'seeker' } as AccessTokenClaims;
const adRequestId = '4123456789abcdef01234567';
const validPdf = Buffer.from('%PDF-1.7\nprivate proof\n%%EOF', 'ascii');
const headers = { filename: 'receipt.pdf', contentType: 'application/pdf' as const, contentLength: validPdf.byteLength };

function requestFor(ownerId: string, status = 'waiting_payment') {
  return { id: adRequestId, providerId: ownerId, status };
}

test('payment-proof upload is private, owner-scoped, scanned, and pending manual review', async () => {
  const storage = createInMemoryStorageAdapter();
  const service = createPaymentProofService({
    storage,
    scanner: createDeterministicMalwareScanner('clean'),
    findPayableAdRequest: (providerId, requestId) => requestId === adRequestId ? requestFor(providerId) : undefined
  });
  const proof = await service.upload(provider, adRequestId, headers, Readable.from(validPdf));
  assert.equal(proof.status, 'pending_review');
  assert.equal(proof.securityState, 'clean');
  assert.equal(proof.providerId, provider.sub);
  assert.equal(proof.adRequestId, adRequestId);
  assert.equal(proof.idempotentReplay, false);
  assert.equal('storageKey' in proof, false);
  assert.equal('downloadUrl' in proof, false);
  assert.equal('bankVerified' in proof, false);

  const replay = await service.upload(provider, adRequestId, headers, Readable.from(validPdf));
  assert.equal(replay.id, proof.id);
  assert.equal(replay.idempotentReplay, true);
  assert.deepEqual(service.get(proof.id), { ...proof, idempotentReplay: false });
});

test('payment-proof upload rejects unauthenticated or unauthorized ownership and non-payable states', async () => {
  const service = createPaymentProofService({
    storage: createInMemoryStorageAdapter(),
    scanner: createDeterministicMalwareScanner('clean'),
    findPayableAdRequest: (_providerId, requestId) => requestId === adRequestId ? requestFor('3123456789abcdef01234567') : undefined
  });
  await assert.rejects(() => service.upload(seeker, adRequestId, headers, Readable.from(validPdf)), (error) => error instanceof PaymentProofServiceError && error.code === 'FORBIDDEN');
  await assert.rejects(() => service.upload(provider, adRequestId, headers, Readable.from(validPdf)), (error) => error instanceof PaymentProofServiceError && error.code === 'FORBIDDEN');

  const notPayable = createPaymentProofService({
    storage: createInMemoryStorageAdapter(),
    scanner: createDeterministicMalwareScanner('clean'),
    findPayableAdRequest: (providerId, requestId) => requestId === adRequestId ? requestFor(providerId, 'quote_sent') : undefined
  });
  await assert.rejects(() => notPayable.upload(provider, adRequestId, headers, Readable.from(validPdf)), (error) => error instanceof PaymentProofServiceError && error.code === 'AD_REQUEST_NOT_PAYABLE');
});

test('payment-proof upload validates strict metadata and fails closed when capability or scanning is unavailable', async () => {
  const cleanDependencies = {
    storage: createInMemoryStorageAdapter(),
    scanner: createDeterministicMalwareScanner('clean'),
    findPayableAdRequest: (providerId: string, requestId: string) => requestId === adRequestId ? requestFor(providerId) : undefined
  };
  const service = createPaymentProofService(cleanDependencies);
  await assert.rejects(() => service.upload(provider, adRequestId, { ...headers, unknown: true }, Readable.from(validPdf)));
  await assert.rejects(() => service.upload(provider, adRequestId, { ...headers, contentLength: 10 * 1024 * 1024 + 1 }, Readable.from(validPdf)), /too_big|Too big|maximum/i);
  await assert.rejects(() => service.upload(provider, adRequestId, { ...headers, filename: 'receipt.pdf.exe' }, Readable.from(validPdf)));
  await assert.rejects(() => service.upload(provider, adRequestId, { ...headers, filename: 'receipt.pdf', contentType: 'image/png' }, Readable.from(validPdf)));

  const unavailable = createPaymentProofService({ ...cleanDependencies, scanner: createUnavailableMalwareScanner() });
  await assert.rejects(() => unavailable.upload(provider, adRequestId, headers, Readable.from(validPdf)), (error) => error instanceof PaymentProofServiceError && error.code === 'PAYMENT_PROOF_CAPABILITY_UNAVAILABLE');

  const infected = createPaymentProofService({ ...cleanDependencies, scanner: createDeterministicMalwareScanner('infected') });
  await assert.rejects(() => infected.upload(provider, adRequestId, headers, Readable.from(validPdf)), (error) => error instanceof PaymentProofServiceError && error.code === 'MALWARE_SCAN_FAILED');
});

test('payment-proof review requires RBAC and reasons, records audit, and replays idempotently', async () => {
  const events: unknown[] = [];
  const service = createPaymentProofService({
    storage: createInMemoryStorageAdapter(),
    scanner: createDeterministicMalwareScanner('clean'),
    findPayableAdRequest: (providerId, requestId) => requestId === adRequestId ? requestFor(providerId) : undefined,
    authorization: { authorize: async (_adminId, permission) => permission === 'admin:payments.review' },
    audit: { record: async (event) => { events.push(event); } }
  });
  const proof = await service.upload(provider, adRequestId, headers, Readable.from(validPdf));
  await assert.rejects(() => service.review(admin, proof.id, { action: 'approve', expectedVersion: proof.version }), /reason/i);
  const approved = await service.review(admin, proof.id, { action: 'approve', expectedVersion: proof.version, reason: 'Receipt matches the issued quote' }, { requestId: 'payment-review-1', traceId: 'a'.repeat(32) });
  assert.equal(approved.status, 'approved');
  assert.equal(approved.reviewHistory.length, 1);
  assert.equal(approved.reviewHistory[0]?.actorId, admin.sub);
  assert.equal(events.length, 1);
  assert.equal((events[0] as { action: string }).action, 'payment_proof.approve');
  assert.equal('storageKey' in (events[0] as { after: object }).after, false);

  const replay = await service.review(admin, proof.id, { action: 'approve', expectedVersion: 1, reason: 'Replay' }, { requestId: 'payment-review-replay', traceId: 'b'.repeat(32) });
  assert.equal(replay.version, approved.version);
  assert.equal(events.length, 1);
  await assert.rejects(() => service.review(admin, proof.id, { action: 'reject', expectedVersion: approved.version, reason: 'Wrong proof' }, { requestId: 'payment-review-2', traceId: 'c'.repeat(32) }), (error) => error instanceof PaymentProofServiceError && error.code === 'VERSION_CONFLICT');

  const denied = createPaymentProofService({
    storage: createInMemoryStorageAdapter(),
    scanner: createDeterministicMalwareScanner('clean'),
    findPayableAdRequest: (providerId, requestId) => requestId === adRequestId ? requestFor(providerId) : undefined,
    authorization: { authorize: async () => false },
    audit: { record: async () => undefined }
  });
  const deniedProof = await denied.upload(provider, adRequestId, headers, Readable.from(validPdf));
  await assert.rejects(() => denied.review(admin, deniedProof.id, { action: 'reject', expectedVersion: deniedProof.version, reason: 'Denied' }, { requestId: 'payment-review-denied', traceId: 'd'.repeat(32) }), (error) => error instanceof PaymentProofServiceError && error.code === 'FORBIDDEN');
});

test('payment-proof review remains pending when mandatory audit persistence fails', async () => {
  const service = createPaymentProofService({
    storage: createInMemoryStorageAdapter(),
    scanner: createDeterministicMalwareScanner('clean'),
    findPayableAdRequest: (providerId, requestId) => requestId === adRequestId ? requestFor(providerId) : undefined,
    authorization: { authorize: async () => true },
    audit: { record: async () => { throw new Error('audit unavailable'); } }
  });
  const proof = await service.upload(provider, adRequestId, headers, Readable.from(validPdf));
  await assert.rejects(() => service.review(admin, proof.id, { action: 'reject', expectedVersion: proof.version, reason: 'Needs a clearer receipt' }, { requestId: 'payment-review-fail', traceId: 'e'.repeat(32) }), (error) => error instanceof PaymentProofServiceError && error.code === 'PAYMENT_PROOF_AUDIT_FAILED');
  assert.equal(service.get(proof.id)?.status, 'pending_review');
});
