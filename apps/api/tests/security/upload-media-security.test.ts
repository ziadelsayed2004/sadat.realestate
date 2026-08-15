import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import test from 'node:test';
import {
  mediaCleanupCandidateSchema,
  propertyMediaUploadHeadersSchema,
  providerDocumentUploadHeadersSchema
} from '@sadat-realestate/contracts';
import {
  createInMemoryStorageAdapter,
  createPrivateDownloadSigner
} from '../../src/modules/uploads/adapters.js';
import {
  MAX_PROVIDER_DOCUMENT_BYTES,
  ProviderDocumentValidationTransform,
  sanitizeDisplayFilename,
  UploadValidationError,
  validateFilenameAndType
} from '../../src/modules/uploads/validation.js';
import {
  assertMediaPlacement,
  evaluateMediaCleanup,
  executeMediaCleanup,
  MediaGovernanceError
} from '../../src/modules/media/governance.js';

const now = new Date('2026-08-14T12:00:00.000Z');
const documentId = '0123456789abcdef01234567';
const storageKey = `private/${'a'.repeat(32)}`;

async function validate(bytes: Buffer, filename: string, mime: string): Promise<void> {
  const validator = new ProviderDocumentValidationTransform(filename, mime);
  await new Promise<void>((resolve, reject) => {
    Readable.from([bytes]).pipe(validator).on('finish', resolve).on('error', reject);
  });
  validator.result();
}

test('keeps upload and media contracts bounded and rejects traversal-shaped storage keys', async () => {
  assert.equal(sanitizeDisplayFilename('../nested\\identity.pdf'), 'identity.pdf');
  assert.equal(validateFilenameAndType('../nested\\identity.pdf', 'application/pdf').originalFilename, 'identity.pdf');
  assert.equal(providerDocumentUploadHeadersSchema.safeParse({
    category: 'government_id_front', filename: 'identity.pdf', contentType: 'application/pdf',
    contentLength: MAX_PROVIDER_DOCUMENT_BYTES
  }).success, true);
  assert.equal(providerDocumentUploadHeadersSchema.safeParse({
    category: 'government_id_front', filename: 'identity.pdf', contentType: 'application/pdf',
    contentLength: MAX_PROVIDER_DOCUMENT_BYTES + 1
  }).success, false);
  assert.equal(propertyMediaUploadHeadersSchema.safeParse({
    kind: 'image', filename: 'photo.jpg', contentType: 'image/jpeg', unexpected: true
  }).success, false);

  const storage = createInMemoryStorageAdapter();
  await assert.rejects(
    storage.putPrivateQuarantine('quarantine/../escape', Readable.from(Buffer.from('private'))),
    /Storage object key is invalid/
  );
  assert.throws(
    () => assertMediaPlacement({ visibility: 'public', namespace: 'private', storageKey }),
    (error: unknown) => error instanceof MediaGovernanceError && error.code === 'MEDIA_NAMESPACE_MISMATCH'
  );
});

test('requires declared MIME, magic bytes, encryption and size boundaries to agree', async () => {
  await validate(Buffer.from('%PDF-1.7\nsynthetic\n%%EOF'), 'identity.pdf', 'application/pdf');
  await assert.rejects(
    validate(Buffer.from('%PDF-1.7\nsynthetic\n%%EOF'), 'identity.jpg', 'image/jpeg'),
    (error: unknown) => error instanceof UploadValidationError && error.code === 'INVALID_FILE_SIGNATURE'
  );
  await assert.rejects(
    validate(Buffer.from('%PDF-1.7\n/Encrypt\n%%EOF'), 'identity.pdf', 'application/pdf'),
    (error: unknown) => error instanceof UploadValidationError && error.code === 'ENCRYPTED_PDF_REJECTED'
  );
  await assert.rejects(
    validate(Buffer.alloc(MAX_PROVIDER_DOCUMENT_BYTES + 1), 'identity.pdf', 'application/pdf'),
    (error: unknown) => error instanceof UploadValidationError && error.code === 'FILE_TOO_LARGE'
  );
});

test('private download signatures are document-bound, expiring, and malformed-input safe', () => {
  const signer = createPrivateDownloadSigner(Buffer.alloc(32, 9));
  const expiresAt = new Date(now.getTime() + 300_000);
  const url = new URL(signer.issue(documentId, expiresAt), 'http://private.test');
  const expires = url.searchParams.get('expires')!;
  const signature = url.searchParams.get('signature')!;
  assert.equal(signer.verify(documentId, expires, signature, now), true);
  assert.equal(signer.verify('f'.repeat(24), expires, signature, now), false);
  assert.equal(signer.verify(documentId, expires, signature, new Date(expiresAt.getTime() + 1_000)), false);
  assert.equal(signer.verify(documentId, 'not-a-timestamp', signature, now), false);
  assert.equal(signer.verify(documentId, expires, `${signature.slice(0, -1)}!`, now), false);
});

test('orphan cleanup tombstones access before deleting bytes and preserves legal holds', async () => {
  const orphan = mediaCleanupCandidateSchema.parse({
    id: documentId,
    storageKey: `quarantine/${'b'.repeat(32)}`,
    visibility: 'private',
    namespace: 'quarantine',
    lifecycle: 'processing',
    attached: false,
    referenceAt: new Date(now.getTime() - 86_400_001).toISOString()
  });
  const held = { ...orphan, id: 'f'.repeat(24), legalHold: {
    actorId: 'e'.repeat(24), reason: 'Security review', startedAt: now.toISOString()
  }};
  assert.equal(evaluateMediaCleanup(orphan, now).action, 'delete');
  assert.equal(evaluateMediaCleanup(held, now).reason, 'legal_hold');
  const events: string[] = [];
  const result = await executeMediaCleanup([orphan, held], {
    async markDeleted(id) { events.push(`tombstone:${id}`); },
    async deleteObject(key) { events.push(`delete:${key}`); }
  }, now);
  assert.equal(result.find(item => item.id === documentId)?.cleaned, true);
  assert.equal(result.find(item => item.id === 'f'.repeat(24))?.cleaned, false);
  assert.deepEqual(events, [`tombstone:${documentId}`, `delete:quarantine/${'b'.repeat(32)}`]);
});
