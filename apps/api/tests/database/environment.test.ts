import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DatabaseEnvironmentValidationError,
  parseDatabaseEnvironment,
  toSafeDatabaseSummary
} from '../../src/modules/database/environment.js';

test('accepts MongoDB URI forms without exposing the URI', () => {
  for (const MONGODB_URI of ['mongodb://127.0.0.1:27017/sadat?replicaSet=rs0', 'mongodb+srv://cluster.example/sadat']) {
    const parsed = parseDatabaseEnvironment({ MONGODB_URI });
    assert.deepEqual(toSafeDatabaseSummary(parsed), { databaseConfigured: true });
  }
});

test('rejects missing and malformed MongoDB URIs without leaking values', () => {
  for (const source of [{}, { MONGODB_URI: 'postgres://secret-user:secret-pass@example.invalid/db' }, { MONGODB_URI: 'mongodb://bad host/db' }]) {
    assert.throws(
      () => parseDatabaseEnvironment(source),
      (error: unknown) => {
        assert.ok(error instanceof DatabaseEnvironmentValidationError);
        assert.doesNotMatch(error.message, /secret-user|secret-pass|postgres/);
        return true;
      }
    );
  }
});
