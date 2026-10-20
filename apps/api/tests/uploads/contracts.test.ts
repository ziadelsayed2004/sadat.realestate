import assert from 'node:assert/strict';
import test from 'node:test';
import {
  providerDocumentAccessDataSchema,
  providerDocumentDataSchema,
  providerDocumentListSuccessEnvelopeSchema,
  providerDocumentSuccessEnvelopeSchema,
  providerDocumentUploadHeadersSchema
} from '@sadat-real-estate/contracts';
import { OFFICE_REQUIREMENT_VERSION, PROVIDER_REQUIREMENT_VERSION } from '../../src/modules/provider/requirements.js';

test('upload and saved-document envelopes accept both current office and legacy requirement versions', () => {
  const document = {
    id: '1'.repeat(24), applicationId: '2'.repeat(24), category: 'authorized_representative_id_front',
    requirementVersion: OFFICE_REQUIREMENT_VERSION, originalFilename: 'identity.png', normalizedExtension: '.png',
    detectedMime: 'image/png', byteSize: 20, sha256: 'a'.repeat(64), version: 1,
    securityState: 'clean', reviewState: 'uploaded', uploadedAt: '2026-10-20T00:00:00.000Z',
    active: true, idempotentReplay: false
  };
  for (const requirementVersion of [OFFICE_REQUIREMENT_VERSION, PROVIDER_REQUIREMENT_VERSION]) {
    const data = { ...document, requirementVersion };
    assert.equal(providerDocumentSuccessEnvelopeSchema.safeParse({ data, meta: { requestId: 'office-upload-regression' } }).success, true);
    assert.equal(providerDocumentListSuccessEnvelopeSchema.safeParse({ data: { items: [data] }, meta: { requestId: 'office-list-regression' } }).success, true);
  }
  for (const requirementVersion of ['office', '2026-10-15.office', '2026-10-15.office.1.extra', '2026-10-15.<script>.1', 'x'.repeat(65)]) {
    assert.equal(providerDocumentDataSchema.safeParse({ ...document, requirementVersion }).success, false);
  }
  assert.equal(providerDocumentDataSchema.safeParse({ ...document, storageKey: 'private-storage' }).success, false);
});

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
