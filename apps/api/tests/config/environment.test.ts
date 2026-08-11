import assert from 'node:assert/strict';
import test from 'node:test';
import {
  APP_ENVIRONMENTS,
  EnvironmentValidationError,
  parseRuntimeEnvironment,
  toSafeEnvironmentSummary
} from '../../src/modules/config/environment.js';

const validSource = (appEnvironment: string) => ({
  APP_ENV: appEnvironment,
  API_HOST: '127.0.0.1',
  API_PORT: '3000'
});

test('accepts every approved application environment', () => {
  for (const appEnvironment of APP_ENVIRONMENTS) {
    const parsed = parseRuntimeEnvironment(validSource(appEnvironment));
    assert.equal(parsed.appEnvironment, appEnvironment);
    assert.deepEqual(parsed.api, { host: '127.0.0.1', port: 3000 });
  }
});

test('rejects missing required environment values without exposing values', () => {
  assert.throws(
    () => parseRuntimeEnvironment({ API_HOST: 'secret-host', API_PORT: 'secret-port' }),
    (error: unknown) => {
      assert.ok(error instanceof EnvironmentValidationError);
      assert.match(error.message, /APP_ENV \(REQUIRED\)/);
      assert.doesNotMatch(error.message, /secret-host|secret-port/);
      return true;
    }
  );
});

test('rejects an unsupported application environment', () => {
  assert.throws(
    () => parseRuntimeEnvironment(validSource('production-like')),
    (error: unknown) => error instanceof EnvironmentValidationError && /APP_ENV \(INVALID_CHOICE\)/.test(error.message)
  );
});

test('rejects malformed hosts', () => {
  for (const API_HOST of ['https://example.com', 'example.com/path', 'bad host', 'bad\u0000host']) {
    assert.throws(
      () => parseRuntimeEnvironment({ ...validSource('test'), API_HOST }),
      (error: unknown) => error instanceof EnvironmentValidationError && /API_HOST \(INVALID_HOST\)/.test(error.message)
    );
  }
});

test('rejects non-decimal and out-of-range ports', () => {
  for (const API_PORT of ['0', '65536', '3.14', 'abc', '-1']) {
    assert.throws(
      () => parseRuntimeEnvironment({ ...validSource('test'), API_PORT }),
      (error: unknown) => error instanceof EnvironmentValidationError && /API_PORT \(INVALID_PORT\)/.test(error.message)
    );
  }
});

test('summaries expose only the allowlisted non-secret configuration', () => {
  const parsed = parseRuntimeEnvironment({
    ...validSource('test'),
    DATABASE_URL: 'mongodb://user:password@example.invalid',
    ACCESS_TOKEN_SECRET: 'secret-value'
  });
  assert.deepEqual(toSafeEnvironmentSummary(parsed), {
    appEnvironment: 'test',
    apiHost: '127.0.0.1',
    apiPort: 3000
  });
});
