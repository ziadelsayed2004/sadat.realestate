import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyIndexRollout,
  buildPropertyIndexRolloutPlan,
  DatabaseIndexRolloutError,
  planIndexRollout,
  type IndexRolloutAdapter
} from '../../src/modules/database/index-rollout.js';
import type { DatabaseIndexDefinition } from '@sadat-real-estate/contracts';

function adapter(initial: readonly DatabaseIndexDefinition[] = []): IndexRolloutAdapter & { created: DatabaseIndexDefinition[] } {
  const existing = new Map(initial.map((definition) => [`${definition.collection}:${definition.name}`, definition]));
  const created: DatabaseIndexDefinition[] = [];
  return {
    created,
    async listIndexes(collection) {
      return [...existing.values()].filter((definition) => definition.collection === collection).map((definition) => ({ name: definition.name, key: definition.key }));
    },
    async createIndex(collection, definition) {
      created.push(definition);
      existing.set(`${collection}:${definition.name}`, definition);
    }
  };
}

const definition: DatabaseIndexDefinition = { collection: 'properties', name: 'properties_test', key: { status: 1, _id: -1 } };

test('derives the rollout plan from the existing property schema and keeps deployment mode explicit', () => {
  const plan = buildPropertyIndexRolloutPlan();
  assert.equal(plan.length, 7);
  assert.equal(plan.some((entry) => entry.name === 'properties_search_text'), true);
  assert.equal(planIndexRollout([definition], { environment: 'production' }).status, 'planned');
  assert.equal(planIndexRollout([definition], { environment: 'production' }).mode, 'deployment-managed');
});

test('requires confirmation, creates only missing indexes, and is replay-safe', async () => {
  const blocked = await applyIndexRollout([definition], { environment: 'test', mode: 'apply' }, adapter());
  assert.equal(blocked.status, 'blocked');
  const target = adapter();
  const applied = await applyIndexRollout([definition], { environment: 'test', mode: 'apply', confirm: true }, target);
  assert.equal(applied.status, 'applied');
  assert.deepEqual(applied.created, ['properties_test']);
  const replay = await applyIndexRollout([definition], { environment: 'test', mode: 'apply', confirm: true }, target);
  assert.deepEqual(replay.created, []);
  assert.deepEqual(replay.alreadyPresent, ['properties_test']);
});

test('rejects duplicate and mismatched index definitions before destructive changes', async () => {
  await assert.rejects(
    applyIndexRollout([definition, definition], { environment: 'test', mode: 'apply', confirm: true }, adapter()),
    (error: unknown) => error instanceof DatabaseIndexRolloutError && error.code === 'INDEX_DEFINITION_DUPLICATE'
  );
  const mismatch = adapter([{ ...definition, key: { status: -1, _id: -1 } }]);
  await assert.rejects(
    applyIndexRollout([definition], { environment: 'test', mode: 'apply', confirm: true }, mismatch),
    (error: unknown) => error instanceof DatabaseIndexRolloutError && error.code === 'INDEX_DEFINITION_MISMATCH'
  );
});
