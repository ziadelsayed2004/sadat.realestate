import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveDatabaseIndexPolicy } from '../../src/modules/database/index-policy.js';

test('enables automatic indexes only for local and test environments', () => {
  assert.deepEqual(resolveDatabaseIndexPolicy('local'), { autoIndex: true, mode: 'automatic-development' });
  assert.deepEqual(resolveDatabaseIndexPolicy('test'), { autoIndex: true, mode: 'automatic-development' });
  for (const environment of ['preview', 'uat', 'production'] as const) {
    assert.deepEqual(resolveDatabaseIndexPolicy(environment), { autoIndex: false, mode: 'deployment-managed' });
  }
});
