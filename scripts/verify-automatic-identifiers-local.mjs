import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import mongoose from 'mongoose';
import { backfillIdentifiers, targets } from './backfill-identifiers.mjs';
import { createFeatureService } from '../apps/api/dist/modules/taxonomy/features.js';

// Deliberately isolated. Never reads application or production connection settings.
const database = `automatic_identifiers_${randomUUID().replaceAll('-', '')}`;
const connection = await mongoose.createConnection(`mongodb://127.0.0.1:27018/${database}?replicaSet=rs0`, { serverSelectionTimeoutMS: 10000 }).asPromise();
const report = { status: 'RUNNING', environment: 'isolated-local-MongoDB', mockedRoutes: false, checks: [], cleanup: false };
try {
  const existingIds = new Map();
  for (const [collection, field] of targets) {
    const fixed = field === 'key' ? 'existing_key' : 'existing-link';
    const result = await connection.collection(collection).insertMany([
      { [field]: fixed, version: 7, name: { en: 'Existing' } },
      { version: 0, title: { ar: 'عنوان عربي' }, name: { ar: 'اسم عربي' } },
      { [field]: '', version: 2, title: { en: 'Same name' }, name: { en: 'Same name' } },
      { [field]: '   ', version: 4, title: { en: 'Same name' }, name: { en: 'Same name' } }
    ]);
    existingIds.set(collection, result.insertedIds[0]);
  }
  const plan = await backfillIdentifiers(connection);
  assert.equal(plan.collections.reduce((sum, row) => sum + row.missing, 0), targets.length * 3);
  assert.equal(plan.collections.reduce((sum, row) => sum + row.updated, 0), 0);
  assert.equal(await connection.collection('identifier_backfill_history').countDocuments(), 0);
  report.checks.push('plan_is_read_only');
  const applied = await backfillIdentifiers(connection, { apply: true });
  assert.equal(applied.collections.reduce((sum, row) => sum + row.updated, 0), targets.length * 3);
  for (const [collection, field] of targets) {
    const original = await connection.collection(collection).findOne({ _id: existingIds.get(collection) });
    assert.equal(original[field], field === 'key' ? 'existing_key' : 'existing-link');
    assert.equal(original.version, 7);
    const rows = await connection.collection(collection).find().toArray();
    assert.equal(new Set(rows.map(row => row[field])).size, 4);
    const newRows = rows.filter(row => !row._id.equals(existingIds.get(collection)));
    assert.deepEqual(newRows.map(row => row.version).sort((a, b) => a - b), [1, 3, 5]);
    for (const row of newRows) assert.match(row[field], field === 'key' ? /^[a-z][a-z0-9_]{1,63}$/ : /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  }
  report.checks.push('fills_all_twelve_collections_preserving_existing_links_and_versions', 'same_names_get_distinct_valid_identifiers');
  assert.equal(await connection.collection('identifier_backfill_history').countDocuments(), targets.length * 3);
  report.checks.push('every_backfill_change_is_audited');
  const repeated = await backfillIdentifiers(connection, { apply: true });
  assert.equal(repeated.collections.reduce((sum, row) => sum + row.updated, 0), 0);
  assert.equal(await connection.collection('identifier_backfill_history').countDocuments(), targets.length * 3);
  report.checks.push('repeat_run_is_idempotent');
  // A failed audit must undo the field and version update in the same transaction.
  const collection = connection.collection('articles');
  const result = await collection.insertOne({ version: 0, title: { en: 'Rollback example' } });
  const originalCollection = connection.collection.bind(connection);
  connection.collection = (...args) => args[0] === 'identifier_backfill_history'
    ? { insertOne: async () => { throw new Error('Injected audit failure'); } }
    : originalCollection(...args);
  await assert.rejects(backfillIdentifiers(connection, { apply: true }), /Injected audit failure/);
  connection.collection = originalCollection;
  const rolledBack = await collection.findOne({ _id: result.insertedId });
  assert.equal(rolledBack.slug, undefined); assert.equal(rolledBack.version, 0);
  report.checks.push('audit_failure_rolls_back_identifier_and_version');
  const features = createFeatureService(connection, { record: async (input, session) => {
    await connection.collection('local_feature_audit').insertOne(input, { session }); return randomUUID();
  } }, { authorize: async () => true });
  const actor = new mongoose.Types.ObjectId().toHexString();
  const context = { requestId: 'automatic-feature', traceId: 'a'.repeat(32) };
  const feature = await features.create(actor, { kind: 'feature', groupKey: 'building_amenities', name: { ar: 'مصعد' }, reason: 'Create an automatic feature' }, context);
  assert.match(feature.slug, /^feature-[a-f0-9]{32}$/);
  const edited = await features.update(actor, feature.id, { version: feature.version, name: { en: 'Elevator' }, reason: 'Rename feature only' }, context);
  assert.equal(edited.slug, feature.slug);
  report.checks.push('amenity_api_persists_generated_identifier_and_preserves_it_on_rename');
  report.status = 'PASS_LOCAL';
} finally {
  await connection.dropDatabase();
  await connection.close();
  report.cleanup = true;
  await writeFile('docs/quality/guide-runs/automatic-identifiers-local-latest.json', JSON.stringify(report, null, 2) + '\n');
}
console.log(`AUTOMATIC_IDENTIFIERS_LOCAL_PASS checks=${report.checks.length}`);
