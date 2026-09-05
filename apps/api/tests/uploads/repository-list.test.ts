import assert from 'node:assert/strict';
import test from 'node:test';
import type { Connection } from 'mongoose';
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
