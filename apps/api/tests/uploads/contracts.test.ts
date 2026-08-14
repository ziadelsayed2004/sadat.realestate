import assert from 'node:assert/strict';
import test from 'node:test';
import {
  providerDocumentAccessDataSchema,
  providerDocumentDataSchema,
  providerDocumentUploadHeadersSchema
} from '@sadat-real-estate/contracts';

test('accepts strict private-document metadata and excludes storage internals', () => {
  assert.equal(providerDocumentUploadHeadersSchema.safeParse({
    category: 'government_id_front',
    filename: 'identity.pdf',
    contentType: 'application/pdf',
    contentLength: 120
  }).success, true);
  assert.equal(providerDocumentUploadHeadersSchema.safeParse({
    category: 'government_id_front',
    filename: 'identity.svg',
    contentType: 'image/svg+xml'
  }).success, false);
  assert.equal(providerDocumentDataSchema.safeParse({
    id: '1'.repeat(24), applicationId: '2'.repeat(24), category: 'government_id_front',
    requirementVersion: '2026-08-13.1', originalFilename: 'identity.pdf', normalizedExtension: '.pdf',
    detectedMime: 'application/pdf', byteSize: 20, sha256: 'a'.repeat(64), version: 1,
    securityState: 'clean', reviewState: 'uploaded', uploadedAt: '2026-08-13T00:00:00.000Z',
    active: true, idempotentReplay: false, storageKey: 'must-never-leak'
  }).success, false);
});

test('accepts only private relative or absolute signed delivery URLs', () => {
  const base = { expiresAt: '2026-08-13T00:05:00.000Z', method: 'GET' as const };
  assert.equal(providerDocumentAccessDataSchema.safeParse({
    ...base, url: '/api/v1/private/provider-documents/1?expires=1&signature=x'
  }).success, true);
  assert.equal(providerDocumentAccessDataSchema.safeParse({ ...base, url: '/public/document.pdf' }).success, false);
});
