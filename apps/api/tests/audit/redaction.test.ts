import assert from 'node:assert/strict';
import test from 'node:test';
import { redactAuditSnapshot, redactAuditText } from '../../src/modules/audit/redaction.js';

test('redacts credential keys, bearer values, URLs, and direct contact PII recursively', () => {
  const result = redactAuditSnapshot({
    status: 'verified',
    passwordHash: 'hash-value',
    nested: {
      accessToken: 'secret-token',
      signedUrl: 'https://example.invalid/private?signature=secret',
      note: 'Contact admin@example.com or +201012345678',
      authorization: 'Bearer abc.def.ghi'
    }
  });
  assert.equal(result.status, 'verified');
  assert.equal(result.passwordHash, '[REDACTED]');
  const nested = result.nested as Record<string, unknown>;
  assert.equal(nested.accessToken, '[REDACTED]');
  assert.equal(nested.signedUrl, '[REDACTED]');
  assert.equal(nested.authorization, '[REDACTED]');
  assert.equal(String(nested.note).includes('admin@example.com'), false);
  assert.equal(String(nested.note).includes('+201012345678'), false);
});

test('bounds malformed, circular, unsupported, and overlong audit values', () => {
  const circular: Record<string, unknown> = {};
  circular.self = circular;
  const result = redactAuditSnapshot({
    circular,
    unsupported: () => undefined,
    invalid: Number.NaN,
    long: 'x'.repeat(3_000)
  });
  assert.deepEqual(result.circular, { self: '[CIRCULAR]' });
  assert.equal(result.unsupported, '[UNSUPPORTED]');
  assert.equal(result.invalid, '[UNSUPPORTED]');
  assert.equal(String(result.long).length, 2_048);
  assert.equal(redactAuditText('Bearer top-secret'), 'Bearer [REDACTED]');
});
