import assert from 'node:assert/strict';
import test from 'node:test';
import { paymentProofDataSchema, type PaymentProofData } from '@sadat-real-estate/contracts';
import type { AccessTokenService } from '../../src/modules/auth/crypto.js';
import { createInMemoryStorageAdapter, createDeterministicMalwareScanner } from '../../src/modules/uploads/adapters.js';
import { createPaymentProofService, type PaymentProofRepository, type StoredPaymentProof } from '../../src/modules/payments/service.js';
import { createApiServer, startApiServer, stopApiServer } from '../../src/server.js';

const providerId = '0123456789abcdef01234567';
const otherProviderId = '1123456789abcdef01234567';
const adRequestId = 'abcdefabcdefabcdefabcdef';
const providerToken = 'provider.payment-proof.token';
const seekerToken = 'seeker.payment-proof.token';
const adminToken = 'admin.payment-proof.token';
const pdf = Buffer.from('%PDF-1.7\nprivate receipt\n%%EOF', 'ascii');

function createRepository(): PaymentProofRepository {
  const records = new Map<string, StoredPaymentProof>();
  return {
    async findPayableAdRequest(ownerId, requestId) {
      return ownerId === providerId && requestId === adRequestId
        ? { id: adRequestId, providerId: ownerId, status: 'waiting_payment' }
        : undefined;
    },
    async find(id) {
      return records.get(id);
    },
    async list(query) {
      const values = [...records.values()]
        .filter((value) => value.active && (!query.status || value.status === query.status))
        .sort((left, right) => right.uploadedAt.localeCompare(left.uploadedAt) || right.id.localeCompare(left.id));
      return {
        items: values.slice((query.page - 1) * query.limit, query.page * query.limit),
        total: values.length
      };
    },
    async register(input) {
      const replay = [...records.values()].find((value) => value.adRequestId === input.adRequestId && value.providerId === input.providerId && value.sha256 === input.sha256 && value.active);
      if (replay) return { kind: 'replay' as const, proof: replay };
      const proof = paymentProofDataSchema.parse({
        id: '222222222222222222222222',
        adRequestId: input.adRequestId,
        providerId: input.providerId,
        originalFilename: input.originalFilename,
        normalizedExtension: input.normalizedExtension,
        detectedMime: input.detectedMime,
        byteSize: input.byteSize,
        sha256: input.sha256,
        version: 1,
        securityState: 'scan_pending',
        status: 'uploaded',
        reviewHistory: [],
        uploadedAt: input.uploadedAt.toISOString(),
        active: true,
        idempotentReplay: false
      }) as PaymentProofData;
      const stored = { ...proof, storageKey: input.storageKey };
      records.set(proof.id, stored);
      return { kind: 'created' as const, proof: stored };
    },
    async updateScan(id, expectedVersion, update) {
      const current = records.get(id);
      if (!current || current.version !== expectedVersion) return undefined;
      const updated = { ...current, ...update, version: current.version + 1 };
      records.set(id, updated);
      return updated;
    },
    async review(id, expectedVersion, update) {
      const current = records.get(id);
      if (!current || current.status !== 'pending_review' || current.version !== expectedVersion) return undefined;
      const updated = {
        ...current,
        status: update.status,
        version: current.version + 1,
        reviewHistory: [...current.reviewHistory, update.reviewHistoryEntry]
      };
      records.set(id, updated);
      return updated;
    }
  };
}

const accessTokens: AccessTokenService = {
  issue: () => providerToken,
  verify(value) {
    if (value !== providerToken && value !== seekerToken && value !== adminToken) throw new Error('invalid');
    return {
      iss: 'sadat-realestate-api', aud: 'sadat-realestate',
      sub: value === providerToken ? providerId : value === adminToken ? '2123456789abcdef01234567' : otherProviderId,
      sid: '999999999999999999999999',
      role: value === providerToken ? 'provider' : value === adminToken ? 'admin' : 'seeker',
      status: 'verified', iat: 1, exp: 9_999_999_999, jti: 'payment-proof-router-test'
    };
  }
};

async function withServer(run: (baseUrl: string) => Promise<void>) {
  const service = createPaymentProofService({
    repository: createRepository(),
    storage: createInMemoryStorageAdapter(),
    scanner: createDeterministicMalwareScanner('clean'),
    createObjectKey: () => 'quarantine/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    authorization: { authorize: async (_adminId, permission) => permission === 'admin:payments.review' },
    audit: { record: async () => undefined }
  });
  const server = createApiServer({
    database: { isReady: async () => true },
    payments: { service, accessTokens }
  });
  const address = await startApiServer(server, { host: '127.0.0.1', port: 0 });
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await stopApiServer(server);
  }
}

function upload(baseUrl: string, token = providerToken) {
  return fetch(`${baseUrl}/api/v1/provider/ads/${adRequestId}/payment-proof`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/pdf',
      'X-File-Name': 'receipt.pdf'
    },
    body: pdf
  });
}

test('provider payment-proof route is owner-scoped, private, scanned, and replay-safe', async () => {
  await withServer(async (baseUrl) => {
    assert.equal((await fetch(`${baseUrl}/api/v1/provider/ads/${adRequestId}/payment-proof`, { method: 'POST', body: pdf })).status, 401);
    assert.equal((await upload(baseUrl, seekerToken)).status, 403);

    const first = await upload(baseUrl);
    assert.equal(first.status, 201);
    const firstBody = await first.json() as { data: Record<string, unknown> };
    assert.equal(firstBody.data.status, 'pending_review');
    assert.equal(firstBody.data.securityState, 'clean');
    assert.equal('storageKey' in firstBody.data, false);
    assert.equal('downloadUrl' in firstBody.data, false);
    assert.equal('bankVerified' in firstBody.data, false);

    const replay = await upload(baseUrl);
    assert.equal(replay.status, 200);
    const replayBody = await replay.json() as { data: Record<string, unknown> };
    assert.equal(replayBody.data.idempotentReplay, true);
  });
});

test('payment-proof route rejects malformed object ids and cross-owner requests', async () => {
  await withServer(async (baseUrl) => {
    assert.equal((await fetch(`${baseUrl}/api/v1/provider/ads/not-an-id/payment-proof`, { method: 'POST', headers: { Authorization: `Bearer ${providerToken}`, 'Content-Type': 'application/pdf', 'X-File-Name': 'receipt.pdf' }, body: pdf })).status, 400);
    assert.equal((await fetch(`${baseUrl}/api/v1/provider/ads/${'111111111111111111111111'}/payment-proof`, { method: 'POST', headers: { Authorization: `Bearer ${providerToken}`, 'Content-Type': 'application/pdf', 'X-File-Name': 'receipt.pdf' }, body: pdf })).status, 404);
  });
});

test('admin payment-proof review route enforces RBAC, reasons, versioning, and redaction', async () => {
  await withServer(async (baseUrl) => {
    assert.equal((await fetch(`${baseUrl}/api/v1/admin/payment-proofs/222222222222222222222222/review`, { method: 'POST' })).status, 401);
    assert.equal((await fetch(`${baseUrl}/api/v1/admin/payment-proofs/222222222222222222222222/review`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${seekerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve', expectedVersion: 2, reason: 'Receipt matches' })
    })).status, 403);

    const uploaded = await upload(baseUrl);
    const uploadedBody = await uploaded.json() as { data: { id: string; version: number } };
    const review = await fetch(`${baseUrl}/api/v1/admin/payment-proofs/${uploadedBody.data.id}/review`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve', expectedVersion: uploadedBody.data.version, reason: 'Receipt matches the issued quote' })
    });
    assert.equal(review.status, 200);
    const body = await review.json() as { data: Record<string, unknown> };
    assert.equal(body.data.status, 'approved');
    assert.equal('storageKey' in body.data, false);
    assert.equal('bankVerified' in body.data, false);

    const replay = await fetch(`${baseUrl}/api/v1/admin/payment-proofs/${uploadedBody.data.id}/review`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve', expectedVersion: uploadedBody.data.version, reason: 'Replay' })
    });
    assert.equal(replay.status, 200);

    const invalidTransition = await fetch(`${baseUrl}/api/v1/admin/payment-proofs/${uploadedBody.data.id}/review`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject', expectedVersion: uploadedBody.data.version + 1, reason: 'Wrong proof' })
    });
    assert.equal(invalidTransition.status, 409);
  });
});

test('admin payment-proof listing exposes review metadata without private storage data', async () => {
  await withServer(async (baseUrl) => {
    assert.equal((await fetch(`${baseUrl}/api/v1/admin/payment-proofs`)).status, 401);
    assert.equal((await fetch(`${baseUrl}/api/v1/admin/payment-proofs`, {
      headers: { Authorization: `Bearer ${seekerToken}` }
    })).status, 403);

    const uploaded = await upload(baseUrl);
    assert.equal(uploaded.status, 201);
    const uploadedBody = await uploaded.json() as { data: { id: string; version: number; originalFilename: string } };

    const pending = await fetch(`${baseUrl}/api/v1/admin/payment-proofs?status=pending_review&page=1&limit=1`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(pending.status, 200);
    const pendingBody = await pending.json() as { data: { items: Array<Record<string, unknown>>; page: number; limit: number; total: number } };
    assert.equal(pendingBody.data.page, 1);
    assert.equal(pendingBody.data.limit, 1);
    assert.equal(pendingBody.data.total, 1);
    assert.equal(pendingBody.data.items[0]?.id, uploadedBody.data.id);
    assert.equal(pendingBody.data.items[0]?.version, uploadedBody.data.version);
    assert.equal(pendingBody.data.items[0]?.originalFilename, uploadedBody.data.originalFilename);
    assert.equal(pendingBody.data.items[0]?.status, 'pending_review');
    assert.equal('storageKey' in (pendingBody.data.items[0] ?? {}), false);
    assert.equal('downloadUrl' in (pendingBody.data.items[0] ?? {}), false);
    assert.equal('bankVerified' in (pendingBody.data.items[0] ?? {}), false);

    const unknownQuery = await fetch(`${baseUrl}/api/v1/admin/payment-proofs?unexpected=value`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(unknownQuery.status, 400);

    const review = await fetch(`${baseUrl}/api/v1/admin/payment-proofs/${uploadedBody.data.id}/review`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve', expectedVersion: uploadedBody.data.version, reason: 'Receipt matches the issued quote' })
    });
    assert.equal(review.status, 200);

    const approved = await fetch(`${baseUrl}/api/v1/admin/payment-proofs?status=approved`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(approved.status, 200);
    const approvedBody = await approved.json() as { data: { items: Array<{ id: string; status: string }> } };
    assert.deepEqual(approvedBody.data.items.map((item) => [item.id, item.status]), [[uploadedBody.data.id, 'approved']]);
  });
});
