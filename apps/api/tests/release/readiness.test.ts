import assert from 'node:assert/strict';
import test from 'node:test';
import { releaseReadinessSchema } from '@sadat-real-estate/contracts';
import {
  RELEASE_EXTERNAL_PREREQUISITES,
  RELEASE_GATE_CHECKS,
  buildReadinessReport,
  passedReleaseChecks,
  validateReadinessReport
} from '../../src/modules/release/readiness.js';

const generatedAt = '2026-09-01T12:00:00.000Z';

test('classifies all local gates as passed while keeping unavailable external prerequisites blocked', () => {
  const report = buildReadinessReport({
    checks: passedReleaseChecks(),
    prerequisites: RELEASE_EXTERNAL_PREREQUISITES,
    generatedAt
  });
  assert.equal(report.outcome, 'conditional');
  assert.equal(report.frontendStarted, false);
  assert.equal(report.checks.length, RELEASE_GATE_CHECKS.length);
  assert.equal(report.prerequisites.length, 4);
  assert.ok(report.prerequisites.every(item => item.status === 'blocked'));
  assert.deepEqual(validateReadinessReport(report), []);
  assert.equal(JSON.stringify(report).match(/password|secret|credential|token/gi), null);
});

test('fails the readiness gate when a mandatory local check fails', () => {
  const checks = passedReleaseChecks().map(check => check.name === 'tests'
    ? { ...check, status: 'failed' as const, notes: 'Synthetic failure for classification test.' }
    : check);
  const report = buildReadinessReport({ checks, generatedAt });
  assert.equal(report.outcome, 'blocked');
  assert.equal(report.prerequisites.length, 0);
});

test('rejects duplicate, unknown, and loose readiness records', () => {
  assert.throws(() => buildReadinessReport({
    checks: [passedReleaseChecks()[0]!, passedReleaseChecks()[0]!], generatedAt
  }), /Duplicate release check/);
  const report = buildReadinessReport({ checks: passedReleaseChecks(), generatedAt });
  assert.ok(validateReadinessReport({ ...report, checks: [...report.checks, { name: 'future-check', command: 'future', status: 'passed', notes: 'not run' }] }).some(issue => /Unknown release check/.test(issue)));
  assert.throws(() => releaseReadinessSchema.parse({ ...report, frontendStarted: true }), /false/);
  assert.throws(() => releaseReadinessSchema.parse({ ...report, unknown: true }), /Unrecognized key/);
});
