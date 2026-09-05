import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import mongoose from 'mongoose';
import { createUploadModels } from '../apps/api/src/modules/uploads/models.ts';
import { createMongooseProviderDocumentRepository } from '../apps/api/src/modules/uploads/repository.ts';

// Loopback-only, isolated collection; never writes application/user records.
const connection = await mongoose.createConnection('mongodb://127.0.0.1:27018/sadat_real_estate_local', { autoIndex: false, autoCreate: false }).asPromise();
const name = `codex_document_list_probe_${randomUUID().replaceAll('-', '')}`;
let created = false;
try {
  assert.equal(await connection.db.listCollections({ name }).hasNext(), false);
  await connection.db.createCollection(name); created = true;
  const schema = createUploadModels(connection).ProviderDocument.schema.clone();
  const model = connection.model('DocumentListProbe', schema, name);
  const id = () => new mongoose.Types.ObjectId();
  const owner = id(), app = id(), foreignOwner = id(), foreignApp = id();
  const base = { providerId: owner, applicationId: app, category: 'government_id_front', requirementVersion: '2026-08-13.1', originalFilename: 'synthetic.pdf', normalizedExtension: '.pdf', detectedMime: 'application/pdf', declaredMime: 'application/pdf', byteSize: 20, sha256: 'a'.repeat(64), storageKey: 'private/synthetic-only', version: 1, securityState: 'clean', reviewState: 'uploaded', uploadedAt: new Date(), active: true };
  const wanted = id();
  await connection.collection(name).insertMany([
    { ...base, _id: wanted },
    { ...base, _id: id(), providerId: foreignOwner },
    { ...base, _id: id(), applicationId: foreignApp },
    { ...base, _id: id(), active: false },
    { ...base, _id: id(), deletedAt: new Date() },
    { ...base, _id: id(), securityState: 'deleted' }
  ]);
  const repository = createMongooseProviderDocumentRepository(connection, { ProviderDocument: model });
  const actual = await repository.listOwned(String(owner), String(app));
  assert.deepEqual(actual.map(row => row.id), [String(wanted)]);
  assert.equal(actual[0].storageKey, undefined, 'private key must not be selected by the list query');
  assert.deepEqual(await repository.listOwned(String(id()), String(app)), []);
  await writeFile(new URL('../docs/quality/document-list-live-mongo-2026-09-05.json', import.meta.url), JSON.stringify({ generatedAt: new Date().toISOString(), scope: 'Actual repository and schema on isolated local Mongo collection; no HTTP/upload/browser journey', inserted: 6, returned: 1, ownershipAndApplicationIsolation: true, inactiveAndDeletedExcluded: true, privateStorageKeyNotSelected: true }, null, 2));
  console.log('DOCUMENT_LIST_LIVE_MONGO_OK inserted=6 returned=1');
} finally {
  if (created) { await connection.collection(name).drop(); console.log('OWNED_PROBE_COLLECTION_REMOVED'); }
  await connection.close();
}
