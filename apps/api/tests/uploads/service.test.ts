import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import test from 'node:test';
import type { AccessTokenClaims } from '../../src/modules/auth/crypto.js';
import {
  createDeterministicMalwareScanner,
  createInMemoryStorageAdapter,
  createPrivateDownloadSigner,
  createUnavailableStorageAdapter
} from '../../src/modules/uploads/adapters.js';
import type {
  ProviderDocumentEntity,
  ProviderDocumentRepository,
  RegisterProviderDocumentInput
} from '../../src/modules/uploads/repository.js';
import {
  createProviderDocumentService,
  UploadServiceError
} from '../../src/modules/uploads/service.js';

const providerId = '1'.repeat(24);
const otherProviderId = '2'.repeat(24);
const applicationId = '3'.repeat(24);
const claims: AccessTokenClaims = {
  iss: 'sadat-real-estate-api', aud: 'sadat-real-estate', sub: providerId,
  sid: '4'.repeat(24), role: 'provider', status: 'draft', iat: 1, exp: 9_999_999_999, jti: 'test'
};
const pdf = Buffer.from('%PDF-1.7\nsynthetic private fixture\n%%EOF');

function repository() {
  let sequence = 0;
  const documents = new Map<string, ProviderDocumentEntity>();
  const repo: ProviderDocumentRepository = {
    async findOwnedApplication(ownerId) {
      return ownerId === providerId ? {
        id: applicationId,
        providerId,
        providerType: 'individual_broker',
        status: 'draft',
        requirementVersion: '2026-08-13.1'
      } : undefined;
    },
    async register(input: RegisterProviderDocumentInput) {
      const replay = [...documents.values()].find((item) => (
        item.providerId === input.application.providerId
        && item.category === input.category
        && item.sha256 === input.sha256
        && item.active
      ));
      if (replay) return { kind: 'replay' as const, document: replay };
      const prior = [...documents.values()].find((item) => item.category === input.category && item.active);
      if (prior) prior.active = false;
      sequence += 1;
      const document: ProviderDocumentEntity = {
        id: sequence.toString(16).padStart(24, '0'),
        applicationId,
        providerId,
        category: input.category,
        requirementVersion: input.requirementVersion,
        originalFilename: input.originalFilename,
        normalizedExtension: input.normalizedExtension,
        declaredMime: input.declaredMime,
        detectedMime: input.detectedMime,
        byteSize: input.byteSize,
        sha256: input.sha256,
        storageKey: input.storageKey,
        version: (prior?.version ?? 0) + 1,
        securityState: 'quarantined',
        reviewState: 'uploaded',
        uploadedAt: input.uploadedAt.toISOString(),
        active: true
      };
      documents.set(document.id, document);
      return { kind: 'created' as const, document };
    },
    async updateSecurity(id, securityState) {
      const document = documents.get(id);
      if (!document) return undefined;
      document.securityState = securityState;
      return document;
    },
    async findOwned(ownerId, documentId) {
      const document = documents.get(documentId);
      return document?.providerId === ownerId ? document : undefined;
    },
    async findById(documentId) { return documents.get(documentId); },
    async markDeleted(ownerId, documentId, now) {
      const document = documents.get(documentId);
      if (!document || document.providerId !== ownerId) return undefined;
      document.securityState = 'deleted';
      document.active = false;
      document.deletedAt = now;
      return document;
    }
  };
  return { repo, documents };
}

function fixture(scanner = createDeterministicMalwareScanner('clean')) {
  const state = repository();
  const storage = createInMemoryStorageAdapter();
  const audits: Array<Record<string, unknown>> = [];
  let now = new Date('2026-08-13T12:00:00.000Z');
  const service = createProviderDocumentService({
    repository: state.repo,
    storage,
    scanner,
    signer: createPrivateDownloadSigner(Buffer.alloc(32, 7)),
    audit: { record(event) { audits.push(event); } },
    now: () => now,
    createObjectKey: (() => {
      let value = 0;
      return () => `quarantine/${(++value).toString(16).padStart(32, '0')}`;
    })()
  });
  return { ...state, service, storage, audits, setNow(value: Date) { now = value; } };
}

const headers = {
  category: 'government_id_front' as const,
  filename: 'identity.pdf',
  contentType: 'application/pdf' as const,
  contentLength: pdf.byteLength
};

test('uploads to quarantine, scans clean, fingerprints metadata, and treats checksum replay idempotently', async () => {
  const value = fixture();
  const created = await value.service.upload(claims, headers, Readable.from(pdf));
  assert.equal(created.securityState, 'clean');
  assert.equal(created.reviewState, 'uploaded');
  assert.equal(created.sha256.length, 64);
  assert.equal(created.idempotentReplay, false);
  assert.equal('storageKey' in created, false);
  const replay = await value.service.upload(claims, headers, Readable.from(pdf));
  assert.equal(replay.id, created.id);
  assert.equal(replay.idempotentReplay, true);
  assert.equal(value.documents.size, 1);
});

test('fails closed for unavailable or failed scanning and never grants non-clean access', async () => {
  const unavailable = fixture();
  const closed = createProviderDocumentService({
    repository: unavailable.repo,
    storage: createUnavailableStorageAdapter(),
    scanner: createDeterministicMalwareScanner('clean'),
    signer: createPrivateDownloadSigner(Buffer.alloc(32, 1)),
    audit: { record() {} }
  });
  await assert.rejects(closed.upload(claims, headers, Readable.from(pdf)), (error: unknown) => (
    error instanceof UploadServiceError && error.code === 'UPLOAD_CAPABILITY_UNAVAILABLE'
  ));

  const infected = fixture(createDeterministicMalwareScanner('infected'));
  const document = await infected.service.upload(claims, headers, Readable.from(pdf));
  assert.equal(document.securityState, 'infected');
  await assert.rejects(
    infected.service.createAccessGrant(claims, document.id, 'provider_review', { requestId: 'r' }),
    (error: unknown) => error instanceof UploadServiceError && error.code === 'DOCUMENT_NOT_CLEAN'
  );

  for (const outcome of ['timeout', 'failed'] as const) {
    const failed = fixture(createDeterministicMalwareScanner(outcome));
    await assert.rejects(failed.service.upload(claims, headers, Readable.from(pdf)), (error: unknown) => (
      error instanceof UploadServiceError && error.code === 'MALWARE_SCAN_FAILED'
    ));
    assert.equal([...failed.documents.values()][0]?.securityState, 'scan_failed');
  }
});

test('grants only owner-scoped clean downloads for 300 seconds and audits without the bearer URL', async () => {
  const value = fixture();
  const document = await value.service.upload(claims, headers, Readable.from(pdf));
  const grant = await value.service.createAccessGrant(
    claims, document.id, 'provider_review', { requestId: 'request-1', traceId: 'trace-1' }
  );
  assert.equal(grant.method, 'GET');
  assert.equal(new Date(grant.expiresAt).getTime() - new Date('2026-08-13T12:00:00.000Z').getTime(), 300_000);
  assert.equal(JSON.stringify(value.audits).includes(grant.url), false);
  const url = new URL(grant.url, 'http://private.test');
  const download = await value.service.resolveDownload(
    document.id, url.searchParams.get('expires')!, url.searchParams.get('signature')!
  );
  const chunks: Buffer[] = [];
  for await (const chunk of download.source) chunks.push(Buffer.from(chunk));
  assert.deepEqual(Buffer.concat(chunks), pdf);

  value.setNow(new Date('2026-08-13T12:05:01.000Z'));
  await assert.rejects(value.service.resolveDownload(
    document.id, url.searchParams.get('expires')!, url.searchParams.get('signature')!
  ), /INVALID_DOWNLOAD_GRANT/);
  await assert.rejects(value.service.createAccessGrant(
    { ...claims, sub: otherProviderId }, document.id, 'provider_review', { requestId: 'r' }
  ), /DOCUMENT_NOT_FOUND/);
});

test('enforces applicable categories and deletion revokes every download path idempotently', async () => {
  const value = fixture();
  await assert.rejects(value.service.upload(claims, {
    ...headers, category: 'commercial_registration'
  }, Readable.from(pdf)), /DOCUMENT_CATEGORY_NOT_APPLICABLE/);
  const document = await value.service.upload(claims, headers, Readable.from(pdf));
  const grant = await value.service.createAccessGrant(claims, document.id, 'replace_document', { requestId: 'r' });
  const url = new URL(grant.url, 'http://private.test');
  assert.deepEqual(await value.service.delete(claims, document.id), { documentId: document.id, deleted: true });
  await assert.rejects(value.service.resolveDownload(
    document.id, url.searchParams.get('expires')!, url.searchParams.get('signature')!
  ), /DOCUMENT_NOT_FOUND/);
});

test('versions replacements and maps an atomic concurrent loser without leaving its binary', async () => {
  const value = fixture();
  const first = await value.service.upload(claims, headers, Readable.from(pdf));
  const changed = Buffer.from('%PDF-1.7\nchanged synthetic fixture\n%%EOF');
  const second = await value.service.upload(claims, {
    ...headers, contentLength: changed.byteLength
  }, Readable.from(changed));
  assert.equal(first.version, 1);
  assert.equal(second.version, 2);
  assert.equal([...value.documents.values()].filter((item) => item.active).length, 1);

  const conflictStorage = createInMemoryStorageAdapter();
  const conflict = createProviderDocumentService({
    repository: {
      ...value.repo,
      async register() { return { kind: 'concurrency_conflict' as const }; }
    },
    storage: conflictStorage,
    scanner: createDeterministicMalwareScanner('clean'),
    signer: createPrivateDownloadSigner(Buffer.alloc(32, 1)),
    audit: { record() {} },
    createObjectKey: () => `quarantine/${'f'.repeat(32)}`
  });
  await assert.rejects(conflict.upload(claims, headers, Readable.from(pdf)), (error: unknown) => (
    error instanceof UploadServiceError && error.code === 'DOCUMENT_CONCURRENT_UPLOAD'
  ));
  assert.equal(conflictStorage.has(`quarantine/${'f'.repeat(32)}`), false);
});
