import assert from 'node:assert/strict';
import os from 'node:os';
import test from 'node:test';
import { parseUploadEnvironment } from '../../src/modules/uploads/environment.js';

test('uses isolated deterministic Local/Test storage modes', () => {
  const local = parseUploadEnvironment({}, 'local');
  assert.equal(local.mode, 'local-filesystem');
  assert.ok(local.localRoot?.startsWith(os.tmpdir()));
  assert.equal(parseUploadEnvironment({}, 'test').mode, 'memory');
});

test('never falls back to local storage in Preview/UAT/Production', () => {
  for (const environment of ['preview', 'uat', 'production'] as const) {
    const value = parseUploadEnvironment({}, environment);
    assert.equal(value.mode, 's3-compatible-unavailable');
    assert.equal(value.productionConfigurationPresent, false);
  }
});
