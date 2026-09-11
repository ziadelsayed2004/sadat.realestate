import assert from 'node:assert/strict';
import test from 'node:test';
import { reviewedJourneyGuarantees } from '../../../scripts/journey-guarantee-evidence.mjs';

test('missing, failed, mocked and unrelated request evidence cannot establish guarantees', () => {
  const check = 'audit_failure_rolls_back_both_mutation_and_inserted_audit';
  for (const requests of [null, { status: 'FAIL', checks: [check] }, { status: 'PASS_LOCAL', mockedRoutes: true, checks: [check] }, { status: 'PASS_LOCAL', checks: [] }]) {
    assert.deepEqual(reviewedJourneyGuarantees('GUIDE-06', { requests }), []);
  }
  assert.deepEqual(reviewedJourneyGuarantees('GUIDE-26', { requests: { status: 'PASS_LOCAL', checks: [check] } }), []);
});

test('a community version conflict does not establish duplicate creation, ownership or rollback', () => {
  const result = reviewedJourneyGuarantees('GUIDE-22', { community: {
    status: 'PASS_LOCAL', mockedRoutes: false, journeys: ['GUIDE-03', 'GUIDE-22'],
    transitions: ['concurrent_hide_one_200_one_409_v2'],
    authorization: ['limited_admin_moderation_denied_403'],
  } });
  assert.deepEqual(result.map(item => item.category), ['roleAuthorization', 'expectedVersion409']);
});

test('privacy conflict and role denial remain scoped to settings', () => {
  const privacy = { status: 'PASS_LOCAL', journeys: ['GUIDE-25', 'GUIDE-26'], authorization: [
    'stale_settings_version_rejected_409', 'limited_admin_settings_mutation_denied_403',
  ] };
  assert.deepEqual(reviewedJourneyGuarantees('GUIDE-26', { privacy }).map(item => item.category), ['expectedVersion409', 'roleAuthorization']);
  assert.deepEqual(reviewedJourneyGuarantees('GUIDE-06', { privacy }), []);
});

test('request and viewing rollback evidence cannot be interchanged', () => {
  const requests = { status: 'PASS_LOCAL', testedAt: '2026-09-10T12:41:39.149Z', checks: ['viewing_audit_failure_rolls_back_mutation_and_audit'] };
  assert.deepEqual(reviewedJourneyGuarantees('GUIDE-06', { requests }), []);
  const result = reviewedJourneyGuarantees('GUIDE-07', { requests });
  assert.equal(result.length, 1);
  assert.equal(result[0].category, 'atomicAuditRollback');
  assert.equal(result[0].verifiedAt, requests.testedAt);
  assert.match(result[0].path, /request-guarantees-local-latest.json$/u);
});

test('community rollback requires its explicit executed check', () => {
  const communityGuarantees = { status: 'PASS_LOCAL', journeys: ['GUIDE-03', 'GUIDE-22'], checks: ['audit_failure_rolls_back_post_and_inserted_audit'] };
  assert.deepEqual(reviewedJourneyGuarantees('GUIDE-22', { communityGuarantees }).map(item => item.category), ['atomicAuditRollback']);
  assert.deepEqual(reviewedJourneyGuarantees('GUIDE-21', { communityGuarantees }), []);
  communityGuarantees.status = 'FAIL_LOCAL';
  assert.deepEqual(reviewedJourneyGuarantees('GUIDE-22', { communityGuarantees }), []);
});
