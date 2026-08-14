import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose from 'mongoose';
import {
  canTransitionProviderDocumentSecurity,
  createUploadModels
} from '../../src/modules/uploads/models.js';

function indexByName(model: mongoose.Model<unknown>, name: string) {
  return model.schema.indexes().find(([, options]) => options.name === name);
}

test('declares strict private document state, lifecycle fields, and query indexes', async () => {
  const connection = mongoose.createConnection();
  const first = createUploadModels(connection);
  assert.equal(first, first);
  const value = new first.ProviderDocument({
    applicationId: new mongoose.Types.ObjectId(), providerId: new mongoose.Types.ObjectId(),
    category: 'government_id_front', requirementVersion: '2026-08-13.1',
    originalFilename: 'identity.pdf', normalizedExtension: '.pdf',
    declaredMime: 'application/pdf', detectedMime: 'application/pdf', byteSize: 20,
    sha256: 'a'.repeat(64), storageKey: `quarantine/${'a'.repeat(32)}`,
    uploadActorId: new mongoose.Types.ObjectId(), uploadedAt: new Date(), version: 1,
    active: true, securityState: 'quarantined', reviewState: 'uploaded',
    deleteAfter: new Date(), retentionReason: 'abandoned_draft',
    legalHold: { actorId: new mongoose.Types.ObjectId(), reason: 'Compliance hold', startedAt: new Date() }
  });
  await value.validate();
  assert.ok(indexByName(first.ProviderDocument, 'provider_documents_active_category_unique')?.[1].unique);
  assert.ok(indexByName(first.ProviderDocument, 'provider_documents_checksum_idempotency'));
  assert.ok(indexByName(first.ProviderDocument, 'provider_documents_replacement_window'));
  assert.ok(indexByName(first.ProviderDocument, 'provider_documents_retention_cleanup'));
  await assert.rejects(new first.ProviderDocument({ ...value.toObject(), securityState: 'safe' }).validate());
  await assert.rejects(new first.ProviderDocument({
    ...value.toObject(), reviewState: 'rejected', reviewReason: undefined
  }).validate(), /reviewReason/);
  assert.equal(canTransitionProviderDocumentSecurity('quarantined', 'scan_pending'), true);
  assert.equal(canTransitionProviderDocumentSecurity('quarantined', 'clean'), false);
  assert.equal(canTransitionProviderDocumentSecurity('scan_failed', 'clean'), false);
  assert.equal(canTransitionProviderDocumentSecurity('deleted', 'scan_pending'), false);
  await connection.destroy();
});
