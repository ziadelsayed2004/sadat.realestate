import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ACCOUNT_TRANSITION_ACTIONS,
  adminAccountUserListDataSchema,
  accountDeleteRequestSchema,
  accountTransitionDataSchema,
  accountTransitionRequestSchema,
  PROVIDER_REVIEW_ACTIONS,
  providerReviewDataSchema,
  providerReviewRequestSchema
} from '@sadat-real-estate/contracts';

const timestamp = '2026-08-14T08:00:00.000Z';

test('account list summary can describe all pages even when a selected status is empty', () => {
  const list = { items: [], page: 1, limit: 20, total: 0, summary: { total: 45, seekers: 30, providers: 15, verified: 40, pending: 3, restricted: 2 } };
  assert.deepEqual(adminAccountUserListDataSchema.parse(list), list);
  assert.equal(adminAccountUserListDataSchema.safeParse({ ...list, summary: { ...list.summary, pending: -1 } }).success, false);
  assert.equal(adminAccountUserListDataSchema.safeParse({ ...list, summary: { ...list.summary, verified: 1.5 } }).success, false);
  assert.equal(adminAccountUserListDataSchema.safeParse({ ...list, summary: { ...list.summary, hiddenInternalCount: 1 } }).success, false);
  assert.equal(adminAccountUserListDataSchema.safeParse({ items: [], page: 1, limit: 20, total: 0 }).success, true);
});

test('account deletion requires current version, bounded reason, and explicit confirmation', () => {
  const valid = { version: 2, reason: 'Delete duplicate account', confirmed: true };
  assert.deepEqual(accountDeleteRequestSchema.parse(valid), valid);
  for (const value of [{ ...valid, version: -1 }, { ...valid, version: 1.2 }, { ...valid, confirmed: false }, { version: 2, reason: valid.reason }, { ...valid, reason: 'x' }, { ...valid, reason: 'invalid\nreason' }, { ...valid, userId: 'a'.repeat(24) }]) {
    assert.equal(accountDeleteRequestSchema.safeParse(value).success, false);
  }
});

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
