import assert from 'node:assert/strict';
import test from 'node:test';
import { Types, type Connection } from 'mongoose';
import type { UploadModels } from '../../src/modules/uploads/models.js';
import { createMongooseProviderDocumentRepository } from '../../src/modules/uploads/repository.js';

test('document list Mongo query binds both ownership keys and excludes inactive/deleted records', async () => {
  const queries: Record<string, unknown>[] = [];
  const models = { ProviderDocument: {
    find(filter: Record<string, unknown>) {
      queries.push(filter);
      return { sort(sort: unknown) {
        assert.deepEqual(sort, { uploadedAt: -1, _id: -1 });
        return { lean() { return { exec: async () => [] }; } };
      } };
    }
  } } as unknown as UploadModels;
  const repository = createMongooseProviderDocumentRepository({} as Connection, models);
  assert.deepEqual(await repository.listOwned('1'.repeat(24), '2'.repeat(24)), []);
  assert.equal(queries.length, 1);
  assert.equal(String(queries[0]?.providerId), '1'.repeat(24));
  assert.equal(String(queries[0]?.applicationId), '2'.repeat(24));
  assert.equal(queries[0]?.active, true);
  assert.deepEqual(queries[0]?.deletedAt, { $exists: false });
  assert.deepEqual(queries[0]?.securityState, { $ne: 'deleted' });
  assert.deepEqual(await repository.listOwned('invalid', '2'.repeat(24)), []);
  assert.deepEqual(await repository.listOwned('1'.repeat(24), 'invalid'), []);
  assert.equal(queries.length, 1, 'invalid ownership IDs must never issue an unscoped query');
});

test('a concurrent scan state update must not claim the document after losing its conditional write', async () => {
  let reads = 0;
  const document = {
    _id: new Types.ObjectId(), applicationId: new Types.ObjectId(), providerId: new Types.ObjectId(),
    securityState: 'scan_failed', category: 'government_id_front', requirementVersion: '2026-08-13.1',
    originalFilename: 'id.png', normalizedExtension: '.png', declaredMime: 'image/png', detectedMime: 'image/png',
    byteSize: 100, sha256: 'a'.repeat(64), storageKey: 'quarantine/test', uploadedAt: new Date(),
    version: 1, active: true, reviewState: 'uploaded'
  };
  const models = { ProviderDocument: {
    findOne() {
      reads++;
      return { select() { return { lean() { return { exec: async () => document }; } }; } };
    },
    updateOne(filter: Record<string, unknown>) {
      assert.equal(filter.securityState, 'scan_failed');
      return { exec: async () => ({ matchedCount: 0 }) };
    }
  } } as unknown as UploadModels;
  const repository = createMongooseProviderDocumentRepository({} as Connection, models);
  assert.equal(await repository.updateSecurity(document._id.toHexString(), 'scan_pending'), undefined);
  assert.equal(reads, 1, 'must not return another scanner\'s newly loaded state as our own claim');
});
