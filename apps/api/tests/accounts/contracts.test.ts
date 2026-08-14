import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ACCOUNT_TRANSITION_ACTIONS,
  accountTransitionDataSchema,
  accountTransitionRequestSchema,
  PROVIDER_REVIEW_ACTIONS,
  providerReviewDataSchema,
  providerReviewRequestSchema
} from '@sadat-real-estate/contracts';

const timestamp = '2026-08-14T08:00:00.000Z';

test('publishes closed account and provider-review action catalogs', () => {
  assert.deepEqual(ACCOUNT_TRANSITION_ACTIONS, [
    'verify', 'reject', 'needs_information', 'suspend', 'restrict'
  ]);
  assert.deepEqual(PROVIDER_REVIEW_ACTIONS, [
    'verify', 'reject', 'needs_information', 'suspend'
  ]);
  assert.equal(new Set(ACCOUNT_TRANSITION_ACTIONS).size, ACCOUNT_TRANSITION_ACTIONS.length);
});

test('requires a bounded reason and rejects mass assignment', () => {
  assert.deepEqual(accountTransitionRequestSchema.parse({
    action: 'restrict',
    reason: '  Confirmed policy breach  '
  }), { action: 'restrict', reason: 'Confirmed policy breach' });
  for (const value of [
    { action: 'restrict', reason: '' },
    { action: 'restrict', reason: 'no' },
    { action: 'restrict', reason: 'valid reason', status: 'restricted' },
    { action: 'delete', reason: 'valid reason' },
    { action: 'suspend', reason: 'line\nbreak' }
  ]) {
    assert.equal(accountTransitionRequestSchema.safeParse(value).success, false);
  }
  assert.equal(providerReviewRequestSchema.safeParse({
    action: 'restrict', reason: 'Not a provider review action'
  }).success, false);
});

test('validates explicit account and provider review projections', () => {
  assert.equal(accountTransitionDataSchema.safeParse({
    transitionId: '0123456789abcdef01234567',
    userId: '1123456789abcdef01234567',
    roleType: 'seeker',
    action: 'restrict',
    fromStatus: 'verified',
    status: 'restricted',
    reason: 'Confirmed policy breach',
    version: 1,
    changedAt: timestamp,
    availableActions: ['verify']
  }).success, true);
  assert.equal(providerReviewDataSchema.safeParse({
    transitionId: '0123456789abcdef01234567',
    providerApplicationId: '2123456789abcdef01234567',
    userId: '3123456789abcdef01234567',
    providerType: 'individual_broker',
    action: 'verify',
    fromAccountStatus: 'pending_review',
    accountStatus: 'verified',
    fromApplicationStatus: 'pending_review',
    applicationStatus: 'approved',
    reason: 'Manual administrative review completed',
    accountVersion: 2,
    applicationVersion: 3,
    changedAt: timestamp,
    availableActions: ['suspend'],
    governmentVerified: true
  }).success, false);
});
