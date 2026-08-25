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

test('parses Hostinger SMTP without exposing mailbox credentials', () => {
  const password = 'synthetic-mailbox-password';
  const environment = parseAuthEnvironment({
    AUTH_ACCESS_TOKEN_SECRET: secret,
    OTP_PROVIDER: 'smtp',
    SMTP_HOST: 'smtp.hostinger.com',
    SMTP_PORT: '465',
    SMTP_TLS: 'implicit',
    SMTP_USER: 'info@elsadatrealestate.com',
    SMTP_PASSWORD: password,
    SMTP_FROM: 'Elsadat Real Estate <info@elsadatrealestate.com>',
    SMTP_PRODUCT_NAME: 'Elsadat Real Estate'
  }, 'production');

  assert.equal(environment.otpProviderMode, 'smtp');
  assert.equal(environment.smtp?.port, 465);
  assert.equal(environment.smtp?.tls, 'implicit');
  const summary = toSafeAuthEnvironmentSummary(environment);
  assert.equal(summary.smtp?.authenticated, true);
  assert.equal(JSON.stringify(summary).includes(password), false);
  assert.equal(JSON.stringify(summary).includes('SMTP_PASSWORD'), false);
});

test('allows local Mailpit but rejects insecure or incomplete protected SMTP settings', () => {
  const mailpit = parseAuthEnvironment({
    AUTH_ACCESS_TOKEN_SECRET: secret,
    OTP_PROVIDER: 'smtp',
    SMTP_HOST: 'mailpit',
    SMTP_PORT: '1025',
    SMTP_TLS: 'none',
    SMTP_FROM: 'Elsadat Local <no-reply@elsadat.local>'
  }, 'local');
  assert.equal(mailpit.smtp?.user, undefined);
  assert.throws(() => parseAuthEnvironment({
    AUTH_ACCESS_TOKEN_SECRET: secret,
    OTP_PROVIDER: 'smtp',
    SMTP_HOST: 'smtp.hostinger.com',
    SMTP_PORT: '587',
    SMTP_TLS: 'none',
    SMTP_USER: 'info@elsadatrealestate.com',
    SMTP_PASSWORD: 'synthetic',
    SMTP_FROM: 'info@elsadatrealestate.com'
  }, 'production'), AuthEnvironmentValidationError);
  assert.throws(() => parseAuthEnvironment({
    AUTH_ACCESS_TOKEN_SECRET: secret,
    OTP_PROVIDER: 'deterministic-fake'
  }, 'production'), AuthEnvironmentValidationError);
});
