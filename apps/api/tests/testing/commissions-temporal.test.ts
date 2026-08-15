import assert from 'node:assert/strict';
import test from 'node:test';
import type { AccessTokenClaims } from '../../src/modules/auth/crypto.js';
import { createCommissionPolicyService } from '../../src/modules/commissions/policy-service.js';
import { CommissionExceptionServiceError, createCommissionExceptionService } from '../../src/modules/commissions/exception-service.js';
import { createCommissionResolverService } from '../../src/modules/commissions/resolver-service.js';
import { CommissionConfirmationServiceError, createCommissionConfirmationService } from '../../src/modules/commissions/confirmation-service.js';
import type { CommissionAccountOverride, CommissionException, CommissionPolicy } from '@sadat-real-estate/contracts';

const admin = {
  iss: 'sadat-realestate-api', aud: 'sadat-realestate', sub: '3123456789abcdef01234567',
  sid: '1123456789abcdef01234567', role: 'admin', status: 'verified', iat: 1, exp: 9_999_999_999, jti: 'temporal-test'
} as AccessTokenClaims;
const providerId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const provider = { ...admin, role: 'provider', sub: providerId } as AccessTokenClaims;
const otherProvider = { ...admin, role: 'provider', sub: 'bbbbbbbbbbbbbbbbbbbbbbbb' } as AccessTokenClaims;

test('uses half-open effective windows and allows adjacent policy and exception periods', async () => {
  let now = new Date('2026-08-14T09:00:00.000Z');
  const policies = createCommissionPolicyService({ now: () => now });
  const policy = await policies.createPolicy(admin, {
    key: 'temporal-default', label: 'Temporal default', kind: 'percentage', scope: { kind: 'default' },
    percentageBps: 200, effectiveFrom: '2026-08-14T10:00:00.000Z', effectiveTo: '2026-08-14T11:00:00.000Z'
  });
  now = new Date('2026-08-14T10:00:00.000Z');
  const active = await policies.activatePolicy(admin, policy.id, policy.version, 'Activate temporal default');
  assert.equal((await policies.listPolicies(admin, { at: '2026-08-14T10:00:00.000Z', page: 1, limit: 10 })).total, 1);
  assert.equal((await policies.listPolicies(admin, { at: '2026-08-14T11:00:00.000Z', page: 1, limit: 10 })).total, 0);
  assert.equal(active.status, 'active');

  const exceptions = createCommissionExceptionService({ now: () => now });
  const first = await exceptions.createException(admin, {
    accountId: providerId, kind: 'exempt', reason: 'First temporal exception',
    effectiveFrom: '2026-08-14T10:00:00.000Z', effectiveTo: '2026-08-14T11:00:00.000Z'
  });
  const second = await exceptions.createException(admin, {
    accountId: providerId, kind: 'fixed', fixedAmountMinor: 1_000, currency: 'EGP', reason: 'Adjacent temporal exception',
    effectiveFrom: '2026-08-14T11:00:00.000Z', effectiveTo: '2026-08-14T12:00:00.000Z'
  });
  assert.equal((await exceptions.activateException(admin, first.id, first.version, 'Approve first exception')).status, 'active');
  now = new Date('2026-08-14T11:00:00.000Z');
  assert.equal((await exceptions.activateException(admin, second.id, second.version, 'Approve adjacent exception')).status, 'active');
  assert.equal((await exceptions.findActiveException(providerId, new Date('2026-08-14T11:00:00.000Z')))?.id, second.id);
  await assert.rejects(
    () => exceptions.updateException(admin, second.id, { expectedVersion: 1, reason: 'Retroactive edit', fixedAmountMinor: 2_000 }),
    (error) => error instanceof CommissionExceptionServiceError && error.code === 'COMMISSION_EXCEPTION_INVALID_STATE'
  );
});

test('resolves precedence at exact temporal boundaries without inventing a value', () => {
  const exception: CommissionException = {
    id: '111111111111111111111111', accountId: providerId, kind: 'percentage', percentageBps: 500,
    reason: 'Boundary exception', effectiveFrom: '2026-08-14T10:00:00.000Z', effectiveTo: '2026-08-14T11:00:00.000Z',
    status: 'active', source: 'exception', approvedBy: admin.sub, approvedAt: '2026-08-14T09:00:00.000Z',
    approvalReason: 'Approved', lastMutationReason: 'Approved', version: 1, createdBy: admin.sub, updatedBy: admin.sub,
    createdAt: '2026-08-14T09:00:00.000Z', updatedAt: '2026-08-14T09:00:00.000Z'
  };
  const override: CommissionAccountOverride = {
    id: '222222222222222222222222', accountId: providerId, kind: 'fixed', fixedAmountMinor: 2_000, currency: 'EGP',
    effectiveFrom: '2026-08-14T09:00:00.000Z', effectiveTo: '2026-08-14T12:00:00.000Z', status: 'active', source: 'account_override',
    version: 2, createdBy: admin.sub, updatedBy: admin.sub, createdAt: '2026-08-14T09:00:00.000Z', updatedAt: '2026-08-14T09:00:00.000Z'
  };
  const policy: CommissionPolicy = {
    id: '333333333333333333333333', key: 'boundary-default', label: 'Boundary default', kind: 'exempt', scope: { kind: 'default' },
    effectiveFrom: '2026-08-14T09:00:00.000Z', status: 'active', version: 4, createdBy: admin.sub, updatedBy: admin.sub,
    createdAt: '2026-08-14T09:00:00.000Z', updatedAt: '2026-08-14T09:00:00.000Z'
  };
  const resolver = createCommissionResolverService({ exceptions: [exception], overrides: [override], policies: [policy] });
  assert.equal(resolver.resolve(providerId, new Date('2026-08-14T10:59:59.999Z')).source, 'exception');
  assert.equal(resolver.resolve(providerId, new Date('2026-08-14T11:00:00.000Z')).source, 'account_override');
  assert.equal(resolver.resolve(providerId, new Date('2026-08-14T12:00:00.000Z')).source, 'policy');
  assert.equal(resolver.resolve('cccccccccccccccccccccccc', new Date('2026-08-14T12:00:00.000Z')).source, 'policy');
  assert.equal(createCommissionResolverService().resolve('cccccccccccccccccccccccc', new Date('2025-01-01T00:00:00.000Z')).source, 'none');
});

test('keeps confirmations owner-scoped and supersedes earlier acknowledgements by policy version', async () => {
  let now = new Date('2026-08-14T10:00:00.000Z');
  const confirmations = createCommissionConfirmationService({ now: () => now });
  const firstInput = {
    accountId: providerId, source: 'policy', sourceRecordId: '333333333333333333333333', policyId: '333333333333333333333333',
    policyVersion: 1, effectiveAt: '2026-08-14T10:00:00.000Z', acknowledge: true
  } as const;
  const first = await confirmations.acknowledge(provider, firstInput);
  now = new Date('2026-08-14T11:00:00.000Z');
  const second = await confirmations.acknowledge(provider, { ...firstInput, policyVersion: 2, effectiveAt: '2026-08-14T11:00:00.000Z' });
  assert.equal((await confirmations.getConfirmation(admin, first.id)).status, 'superseded');
  assert.equal(second.status, 'acknowledged');
  await assert.rejects(
    () => confirmations.acknowledge(otherProvider, firstInput),
    (error) => error instanceof CommissionConfirmationServiceError && error.code === 'COMMISSION_CONFIRMATION_FORBIDDEN'
  );
  await assert.rejects(
    () => confirmations.acknowledge(provider, { ...firstInput, unknown: true }),
    /Unrecognized key/
  );
});
