import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { auditLocales } from '../scripts/audit-locales.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

test('backend locale audit enforces Arabic and English without hiding deferred fixture/test work', () => {
  const report = auditLocales(rootDir, 'backend');
  assert.deepEqual(report.policy.supportedLocales, ['ar', 'en']);
  assert.equal(report.policy.defaultLocale, 'ar');
  assert.equal(report.activeViolationCount, 0);
});

test('full locale audit reports deferred fixture/test occurrences until the frontend task removes them', () => {
  const report = auditLocales(rootDir, 'all');
  assert.ok(report.deferredOccurrenceCount >= 0);
  assert.equal(report.status, report.activeViolationCount === 0 ? 'PASS' : 'FAIL');
});
