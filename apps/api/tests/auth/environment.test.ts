import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AuthEnvironmentValidationError,
  parseAuthEnvironment,
  toSafeAuthEnvironmentSummary
} from '../../src/modules/auth/environment.js';

const secret = Buffer.alloc(32, 7).toString('base64url');

test('parses a redacted auth environment with environment-specific cookie security', () => {
  const local = parseAuthEnvironment({ AUTH_ACCESS_TOKEN_SECRET: secret }, 'test');
  const production = parseAuthEnvironment({ AUTH_ACCESS_TOKEN_SECRET: secret }, 'production');
  assert.equal(local.cookie.secure, false);
  assert.equal(local.otpProviderMode, 'deterministic-fake');
  assert.equal(production.cookie.secure, true);
  assert.equal(production.otpProviderMode, 'unconfigured');
  assert.equal(production.cookie.httpOnly, true);
  assert.equal(production.cookie.sameSite, 'Strict');
  assert.equal(production.cookie.path, '/api/v1/auth');
  const summary = toSafeAuthEnvironmentSummary(production);
  assert.equal('accessTokenSecret' in summary, false);
  assert.equal(JSON.stringify(summary).includes(secret), false);
  assert.equal(summary.otpProviderMode, 'unconfigured');
});

test('rejects missing, short, malformed, or non-canonical access secrets without echoing values', () => {
  for (const value of [undefined, 'short-secret', `${secret}=`, '*'.repeat(43)]) {
    assert.throws(
      () => parseAuthEnvironment({ AUTH_ACCESS_TOKEN_SECRET: value }, 'test'),
      (error: unknown) => {
        assert.ok(error instanceof AuthEnvironmentValidationError);
        if (value) assert.equal(error.message.includes(value), false);
        return true;
      }
    );
  }
  assert.throws(
    () => parseAuthEnvironment({
      AUTH_ACCESS_TOKEN_SECRET: 'bG9jYWwtZGV2ZWxvcG1lbnQtb25seS1rZXktMzItYnl0ZXM'
    }, 'production'),
    AuthEnvironmentValidationError
  );
});
