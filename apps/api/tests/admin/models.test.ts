import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose from 'mongoose';
import { createAdminModels } from '../../src/modules/admin/models.js';

test('registers a strict one-time bootstrap guard with unique key and user indexes', async () => {
  const connection = mongoose.createConnection();
  const first = createAdminModels(connection);
  const second = createAdminModels(connection);
  assert.equal(first.AdminBootstrap, second.AdminBootstrap);

  const record = new first.AdminBootstrap({
    bootstrapKey: 'first-super-admin',
    userId: new mongoose.Types.ObjectId(),
    accessLevel: 'super_admin',
    completedAt: new Date('2026-08-13T18:00:00.000Z')
  });
  await record.validate();
  const indexes = new Map(
    first.AdminBootstrap.schema.indexes().map(([keys, options]) => [options.name, { keys, options }])
  );
  assert.equal(indexes.get('admin_bootstrap_key_unique')?.options.unique, true);
  assert.equal(indexes.get('admin_bootstrap_user_unique')?.options.unique, true);
  assert.deepEqual(indexes.get('admin_bootstrap_user_unique')?.keys, { userId: 1 });
  assert.equal(first.AdminBootstrap.schema.path('password'), undefined);
  assert.equal(first.AdminBootstrap.schema.path('normalizedEmail'), undefined);
  assert.throws(
    () => new first.AdminBootstrap({
      bootstrapKey: 'first-super-admin',
      userId: new mongoose.Types.ObjectId(),
      accessLevel: 'super_admin',
      completedAt: new Date(),
      passwordHash: 'unsafe'
    }),
    /strict mode/
  );
  await connection.close();
});

test('rejects non-canonical bootstrap keys and access levels', async () => {
  const connection = mongoose.createConnection();
  const { AdminBootstrap } = createAdminModels(connection);
  await assert.rejects(new AdminBootstrap({
    bootstrapKey: 'another-bootstrap',
    userId: new mongoose.Types.ObjectId(),
    accessLevel: 'root',
    completedAt: new Date()
  }).validate());
  await connection.close();
});
