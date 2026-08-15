import assert from 'node:assert/strict';
import test from 'node:test';
import { SECURITY_ASSURANCE_CATEGORIES, securityAssuranceReportSchema } from '@sadat-realestate/contracts';
import { buildSecurityAssuranceReport, SECURITY_ASSURANCE_FINDINGS, summarizeSecurityAssurance, validateSecurityAssuranceReport } from '../../src/modules/security/assurance-report.js';

test('builds a complete deterministic assurance matrix with explicit conditional gaps', () => {
  const report = buildSecurityAssuranceReport(() => new Date('2026-01-01T00:00:00.000Z'));
  assert.equal(report.version, 1);
  assert.equal(report.generatedAt, '2026-01-01T00:00:00.000Z');
  assert.equal(report.overall, 'conditional');
  assert.equal(report.findings.length, SECURITY_ASSURANCE_CATEGORIES.length);
  assert.deepEqual(new Set(report.findings.map((finding) => finding.category)), new Set(SECURITY_ASSURANCE_CATEGORIES));
  assert.equal(report.findings.filter((finding) => finding.status === 'blocked').length, 1);
  assert.equal(report.findings.some((finding) => finding.status === 'partial' && finding.gap && finding.ownerAction), true);
  assert.equal(summarizeSecurityAssurance(report.findings), 'conditional');
});

test('validates report contracts and does not expose secrets or raw operational payloads', () => {
  const report = validateSecurityAssuranceReport(buildSecurityAssuranceReport());
  assert.deepEqual(report, securityAssuranceReportSchema.parse(report));
  assert.doesNotMatch(JSON.stringify(report), /password|person@example/);
  assert.throws(() => validateSecurityAssuranceReport({ ...report, findings: [{ ...SECURITY_ASSURANCE_FINDINGS[0], unknown: true }] }), /Unrecognized key/);
});
