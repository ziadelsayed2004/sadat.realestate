import assert from 'node:assert/strict';
import test from 'node:test';
import {
  LOCALIZED_FIELD_ALLOWLIST,
  TEXT_INDEX_DEFINITIONS,
  inspectLocaleDatabase,
  type LocaleDatabase
} from '../../src/modules/database/locale-migration.js';

function fakeDatabase(documents: Record<string, Record<string, unknown>[]>): LocaleDatabase {
  return {
    databaseName: 'test',
    listCollections: () => ({ toArray: async () => Object.keys(documents).map((name) => ({ name })) }),
    collection(name) {
      const rows = documents[name] ?? [];
      return {
        find: () => ({ toArray: async () => rows }),
        countDocuments: async () => rows.length,
        updateMany: async () => ({ matchedCount: 0, modifiedCount: 0 }),
        listIndexes: () => ({ toArray: async () => [{ name: '_id_', key: { _id: 1 } }] }),
        createIndex: async () => 'ignored',
        dropIndex: async () => undefined,
        insertMany: async () => undefined
      };
    },
    admin: () => ({ command: async () => ({}) })
  };
}

test('keeps the migration allowlist explicit and AR/EN-only', () => {
  assert.deepEqual(LOCALIZED_FIELD_ALLOWLIST.properties, ['name', 'description']);
  assert.equal(TEXT_INDEX_DEFINITIONS.some((definition) => Object.keys(definition.weights).some((field) => field.includes('zh-CN'))), false);
});

test('reports retired values without emitting document identifiers or values', async () => {
  const report = await inspectLocaleDatabase(fakeDatabase({
    properties: [{ _id: '670000000000000000000001', name: { ar: 'Arabic', en: 'English', 'zh-CN': 'retired' } }],
    users: [{ locale: 'zh-CN' }]
  }));
  assert.equal(report.aggregateCounters.recordsWithRetiredLocale, 1);
  assert.equal(report.aggregateCounters.recordsWithRetiredPreferredLocale, 1);
  assert.deepEqual(report.retiredFieldPathsObserved, ['$.name.zh-CN']);
  assert.equal(JSON.stringify(report).includes('Arabic'), false);
  assert.equal(JSON.stringify(report).includes('English'), false);
  assert.equal(JSON.stringify(report).includes('670000000000000000000001'), false);
});
