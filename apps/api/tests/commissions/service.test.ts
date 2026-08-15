import assert from 'node:assert/strict';
import test from 'node:test';
import type { AccessTokenClaims } from '../../src/modules/auth/crypto.js';
import { CommissionPolicyServiceError, createCommissionPolicyService } from '../../src/modules/commissions/policy-service.js';
import { CommissionAccountServiceError, createCommissionAccountService } from '../../src/modules/commissions/account-service.js';
import { CommissionExceptionServiceError, createCommissionExceptionService } from '../../src/modules/commissions/exception-service.js';
import { CommissionResolverServiceError, createCommissionResolverService } from '../../src/modules/commissions/resolver-service.js';
import { CommissionConfirmationServiceError, createCommissionConfirmationService } from '../../src/modules/commissions/confirmation-service.js';
import type { AuditLogData } from '@sadat-real-estate/contracts';
import { CommissionChangeLogServiceError, createCommissionChangeLogService, type CommissionAuditSourceQuery } from '../../src/modules/commissions/change-log-service.js';

const admin = { iss: 'sadat-realestate-api', aud: 'sadat-realestate', sub: '3123456789abcdef01234567', sid: '1123456789abcdef01234567', role: 'admin', status: 'verified', iat: 1, exp: 9999999999, jti: 'test' } as AccessTokenClaims;
const seeker = { ...admin, role: 'seeker' } as AccessTokenClaims;

test('models percentage, fixed, and exempt policies with strict scope and effective dates', async () => {
  let current = new Date('2026-08-13T23:00:00.000Z');
  const service = createCommissionPolicyService({ now: () => current });
  const percentage = await service.createPolicy(admin, { key: 'default-percentage', label: 'Default percentage', kind: 'percentage', scope: { kind: 'default' }, percentageBps: 250, effectiveFrom: '2026-08-14T00:00:00+00:00', effectiveTo: '2027-01-01T00:00:00+00:00' });
  const fixed = await service.createPolicy(admin, { key: 'broker-fixed', label: 'Broker fixed', kind: 'fixed', scope: { kind: 'provider_type', key: 'individual_broker' }, fixedAmountMinor: 5000, currency: 'EGP', effectiveFrom: '2026-08-15T00:00:00+00:00' });
  const exempt = await service.createPolicy(admin, { key: 'developer-exempt', label: 'Developer exempt', kind: 'exempt', scope: { kind: 'provider_type', key: 'developer_company' }, effectiveFrom: '2026-08-15T00:00:00+00:00' });
  assert.equal(percentage.status, 'draft'); assert.equal(fixed.kind, 'fixed'); assert.equal(exempt.kind, 'exempt');
  await assert.rejects(() => service.createPolicy(admin, { ...({ key: 'bad', label: 'Bad', kind: 'percentage', scope: { kind: 'default' }, effectiveFrom: '2026-08-14T00:00:00+00:00' }) }), /Percentage policy requires/);
  await assert.rejects(() => service.createPolicy(admin, { ...({ key: 'bad-fixed', label: 'Bad fixed', kind: 'fixed', scope: { kind: 'default' }, fixedAmountMinor: 1, currency: 'EGP', effectiveFrom: '2026-08-14T00:00:00+00:00' }), unknown: true }), /Unrecognized key/);
  await assert.rejects(() => service.updatePolicy(seeker, percentage.id, { expectedVersion: 0, reason: 'No access', status: 'active' }), (error) => error instanceof CommissionPolicyServiceError && error.code === 'COMMISSION_FORBIDDEN');
  await assert.rejects(() => service.activatePolicy(admin, percentage.id, percentage.version, 'Too early'), (error) => error instanceof CommissionPolicyServiceError && error.code === 'COMMISSION_INVALID_STATE');
  current = new Date('2026-08-14T01:00:00.000Z');
  const active = await service.activatePolicy(admin, percentage.id, percentage.version, 'Effective policy approved');
  assert.equal(active.status, 'active'); assert.equal(active.version, 1);
  await assert.rejects(() => service.updatePolicy(admin, fixed.id, { expectedVersion: fixed.version, reason: 'Activate overlap', status: 'active', scope: { kind: 'default' }, effectiveFrom: '2026-08-14T00:00:00+00:00' }), (error) => error instanceof CommissionPolicyServiceError && error.code === 'COMMISSION_OVERLAP');
  const listed = await service.listPolicies(admin, { status: 'active', at: '2026-08-14T02:00:00+00:00', page: 1, limit: 10 });
  assert.deepEqual(listed.items.map(item => item.id), [active.id]);
});

test('applies account-level overrides with ownership-safe reads, source attribution, effective dates, and optimistic versions', async () => {
  let current = new Date('2026-08-14T00:00:00.000Z');
  const accountId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
  const service = createCommissionAccountService({ now: () => current, policies: [{ id: 'bbbbbbbbbbbbbbbbbbbbbbbb', key: 'default', label: 'Default', kind: 'percentage', scope: { kind: 'default' }, percentageBps: 100, effectiveFrom: '2026-01-01T00:00:00+00:00', status: 'active', version: 3, createdBy: admin.sub, updatedBy: admin.sub, createdAt: '2026-01-01T00:00:00+00:00', updatedAt: '2026-01-01T00:00:00+00:00' }] });
  const override = await service.createOverride(admin, accountId, { kind: 'fixed', fixedAmountMinor: 7500, currency: 'EGP', effectiveFrom: '2026-08-14T01:00:00+00:00' });
  const before = await service.getAccountCommission(admin, accountId, current);
  assert.equal(before.source, 'policy'); assert.equal(before.percentageBps, 100);
  current = new Date('2026-08-14T02:00:00.000Z');
  const active = await service.updateOverride(admin, override.id, { expectedVersion: 0, reason: 'Apply account arrangement', status: 'active' });
  const after = await service.readAccountCommission(admin, accountId, current);
  assert.equal(active.status, 'active'); assert.equal(after.source, 'account_override'); assert.equal(after.fixedAmountMinor, 7500); assert.equal(after.currency, 'EGP');
  await assert.rejects(() => service.updateOverride(admin, override.id, { expectedVersion: 0, reason: 'stale', status: 'inactive' }), (error) => error instanceof CommissionAccountServiceError && error.code === 'COMMISSION_ACCOUNT_VERSION_CONFLICT');
  await assert.rejects(() => service.getAccountCommission({ ...admin, role: 'seeker' } as AccessTokenClaims, accountId), (error) => error instanceof CommissionAccountServiceError && error.code === 'COMMISSION_FORBIDDEN');
  const none = await service.getAccountCommission(admin, 'cccccccccccccccccccccccc', new Date('2025-01-01T00:00:00.000Z'));
  assert.equal(none.source, 'none');
});

test('manages account commission exceptions with approval metadata, temporal conflicts, and deterministic active lookup', async () => {
  let current = new Date('2026-08-14T00:00:00.000Z');
  const accountId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
  const otherAccountId = 'bbbbbbbbbbbbbbbbbbbbbbbb';
  const service = createCommissionExceptionService({ now: () => current });
  const exception = await service.createException(admin, {
    accountId,
    kind: 'percentage',
    percentageBps: 0,
    reason: 'Approved account waiver for launch period',
    effectiveFrom: '2026-08-14T01:00:00+00:00',
    effectiveTo: '2026-09-01T00:00:00+00:00'
  });
  assert.equal(exception.status, 'draft');
  assert.equal(exception.source, 'exception');
  assert.equal(exception.lastMutationReason, exception.reason);
  await assert.rejects(() => service.createException(admin, { accountId, kind: 'percentage', percentageBps: 10, reason: 'bad', effectiveFrom: '2026-08-14T01:00:00+00:00' }), (error) => error instanceof CommissionExceptionServiceError && error.code === 'COMMISSION_EXCEPTION_DUPLICATE');
  await assert.rejects(() => service.createException(admin, { accountId, kind: 'fixed', fixedAmountMinor: 10, currency: 'EGP', reason: 'unknown field', effectiveFrom: '2026-09-01T00:00:00+00:00', unknown: true }), /Unrecognized key/);
  await assert.rejects(() => service.createException(seeker, { accountId, kind: 'exempt', reason: 'No access', effectiveFrom: '2026-09-02T00:00:00+00:00' }), (error) => error instanceof CommissionExceptionServiceError && error.code === 'COMMISSION_EXCEPTION_FORBIDDEN');
  await assert.rejects(() => service.activateException(admin, exception.id, exception.version, 'Too early'), (error) => error instanceof CommissionExceptionServiceError && error.code === 'COMMISSION_EXCEPTION_INVALID_STATE');

  current = new Date('2026-08-14T02:00:00.000Z');
  const active = await service.activateException(admin, exception.id, exception.version, 'Finance approved the waiver');
  assert.equal(active.status, 'active');
  assert.equal(active.approvedBy, admin.sub);
  assert.equal(active.approvedAt, current.toISOString());
  assert.equal(active.approvalReason, 'Finance approved the waiver');
  assert.equal((await service.findActiveException(accountId, current))?.id, exception.id);
  assert.equal(await service.findActiveException(otherAccountId, current), undefined);

  const second = await service.createException(admin, { accountId, kind: 'fixed', fixedAmountMinor: 1_000, currency: 'EGP', reason: 'Overlapping waiver', effectiveFrom: '2026-08-20T00:00:00+00:00', effectiveTo: '2026-08-30T00:00:00+00:00' });
  current = new Date('2026-08-21T00:00:00.000Z');
  await assert.rejects(() => service.updateException(admin, second.id, { expectedVersion: second.version, reason: 'Cannot overlap active exception', status: 'active' }), (error) => error instanceof CommissionExceptionServiceError && error.code === 'COMMISSION_EXCEPTION_OVERLAP');
  const differentAccount = await service.createException(admin, { accountId: otherAccountId, kind: 'exempt', reason: 'Other account waiver', effectiveFrom: '2026-08-20T00:00:00+00:00' });
  const activeOther = await service.activateException(admin, differentAccount.id, differentAccount.version, 'Approved separately');
  assert.equal(activeOther.status, 'active');

  await assert.rejects(() => service.updateException(admin, exception.id, { expectedVersion: exception.version, reason: 'stale', status: 'inactive' }), (error) => error instanceof CommissionExceptionServiceError && error.code === 'COMMISSION_EXCEPTION_VERSION_CONFLICT');
  await assert.rejects(() => service.updateException(admin, exception.id, { expectedVersion: active.version, reason: 'Retroactive value edit', percentageBps: 100 }), (error) => error instanceof CommissionExceptionServiceError && error.code === 'COMMISSION_EXCEPTION_INVALID_STATE');
  const inactive = await service.updateException(admin, exception.id, { expectedVersion: active.version, reason: 'Waiver ended', status: 'inactive' });
  assert.equal(inactive.status, 'inactive');
  assert.equal(await service.findActiveException(accountId, current), undefined);

  const listed = await service.listExceptions(admin, { accountId, status: 'inactive', page: 1, limit: 10 });
  assert.deepEqual(listed.items.map(item => item.id), [exception.id]);
});

test('resolves exception, account override, and default policy precedence and snapshots only approved events', async () => {
  const accountId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
  const current = new Date('2026-08-21T12:00:00.000Z');
  const exception = {
    id: '111111111111111111111111', accountId, kind: 'exempt' as const, reason: 'Approved waiver', effectiveFrom: '2026-08-20T00:00:00.000Z', effectiveTo: '2026-08-30T00:00:00.000Z', status: 'active' as const, source: 'exception' as const, approvedBy: admin.sub, approvedAt: '2026-08-19T00:00:00.000Z', approvalReason: 'Approved commercial exception', lastMutationReason: 'Approved commercial exception', version: 4, createdBy: admin.sub, updatedBy: admin.sub, createdAt: '2026-08-19T00:00:00.000Z', updatedAt: '2026-08-19T00:00:00.000Z'
  };
  const override = {
    id: '222222222222222222222222', accountId, kind: 'fixed' as const, fixedAmountMinor: 5000, currency: 'EGP', effectiveFrom: '2026-01-01T00:00:00.000Z', status: 'active' as const, source: 'account_override' as const, version: 2, createdBy: admin.sub, updatedBy: admin.sub, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z'
  };
  const policy = {
    id: '333333333333333333333333', key: 'default-policy', label: 'Default policy', kind: 'percentage' as const, scope: { kind: 'default' as const }, percentageBps: 250, effectiveFrom: '2026-01-01T00:00:00.000Z', status: 'active' as const, version: 3, createdBy: admin.sub, updatedBy: admin.sub, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z'
  };
  const resolver = createCommissionResolverService({ exceptions: [exception], overrides: [override], policies: [policy], now: () => current });
  const selectedException = resolver.resolve(accountId, current);
  assert.equal(selectedException.source, 'exception');
  assert.equal(selectedException.exceptionId, exception.id);
  assert.equal(selectedException.sourceVersion, exception.version);
  assert.equal(selectedException.kind, 'exempt');

  const overrideResolver = createCommissionResolverService({ overrides: [override], policies: [policy], now: () => current });
  const selectedOverride = overrideResolver.resolveCommission(accountId, current);
  assert.equal(selectedOverride.source, 'account_override');
  assert.equal(selectedOverride.accountOverrideId, override.id);
  assert.equal(selectedOverride.fixedAmountMinor, 5000);
  const policyResolver = createCommissionResolverService({ policies: [policy], now: () => current });
  const selectedPolicy = policyResolver.resolveCommission(accountId, current);
  assert.equal(selectedPolicy.source, 'policy');
  assert.equal(selectedPolicy.policyId, policy.id);
  assert.equal(selectedPolicy.policyVersion, undefined);
  assert.equal(selectedPolicy.sourceVersion, policy.version);
  const none = policyResolver.resolveCommission('bbbbbbbbbbbbbbbbbbbbbbbb', current);
  assert.equal(none.source, 'policy');
  const noPolicy = createCommissionResolverService({ now: () => current }).resolveCommission(accountId, current);
  assert.equal(noPolicy.source, 'none');
  assert.throws(() => resolver.resolveCommission('bad-id', current), (error) => error instanceof CommissionResolverServiceError && error.code === 'COMMISSION_RESOLUTION_INVALID_ACCOUNT');

  const snapshot = await resolver.resolveAndSnapshot({ commercialEventId: 'deal-approved-001', commercialEventStatus: 'approved', accountId, approvedAt: current.toISOString() });
  assert.equal(snapshot.resolution.source, 'exception');
  assert.equal(snapshot.resolution.sourceVersion, exception.version);
  assert.equal(resolver.getSnapshot(snapshot.commercialEventId).id, snapshot.id);
  const replay = await resolver.saveSnapshotAtApprovedEvent({ commercialEventId: 'deal-approved-001', commercialEventStatus: 'approved', accountId, approvedAt: current.toISOString(), resolution: selectedException });
  assert.equal(replay.id, snapshot.id);
  await assert.rejects(() => resolver.saveSnapshotAtApprovedEvent({ commercialEventId: 'deal-approved-001', commercialEventStatus: 'approved', accountId, approvedAt: current.toISOString(), resolution: noPolicy }), (error) => error instanceof CommissionResolverServiceError && error.code === 'COMMISSION_RESOLUTION_SNAPSHOT_CONFLICT');
  await assert.rejects(() => resolver.saveSnapshotAtApprovedEvent({ commercialEventId: 'deal-unapproved-001', commercialEventStatus: 'pending', accountId, approvedAt: current.toISOString(), resolution: selectedException }), /approved/);
  await assert.rejects(() => resolver.resolveAndSnapshot({ commercialEventId: 'deal-future-001', commercialEventStatus: 'approved', accountId, approvedAt: '2026-08-22T00:00:00.000Z' }), (error) => error instanceof CommissionResolverServiceError && error.code === 'COMMISSION_RESOLUTION_EVENT_INVALID');
});

test('records owner acknowledgements with policy versions, supersession, admin review, and revocation', async () => {
  const accountId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
  const otherAccountId = 'bbbbbbbbbbbbbbbbbbbbbbbb';
  const provider = { ...admin, role: 'provider', sub: accountId } as AccessTokenClaims;
  const otherProvider = { ...admin, role: 'provider', sub: otherAccountId } as AccessTokenClaims;
  let current = new Date('2026-08-21T12:00:00.000Z');
  const service = createCommissionConfirmationService({ now: () => current });
  const firstInput = { accountId, source: 'policy', sourceRecordId: '333333333333333333333333', policyId: '333333333333333333333333', policyVersion: 3, effectiveAt: '2026-01-01T00:00:00.000Z', acknowledge: true };
  const first = await service.acknowledge(provider, firstInput);
  assert.equal(first.status, 'acknowledged');
  assert.equal(first.acknowledgedBy, accountId);
  assert.equal(first.acknowledgedAt, current.toISOString());
  assert.equal(first.version, 0);
  assert.equal((await service.acknowledge(provider, firstInput)).id, first.id);
  await assert.rejects(() => service.acknowledge(otherProvider, firstInput), (error) => error instanceof CommissionConfirmationServiceError && error.code === 'COMMISSION_CONFIRMATION_FORBIDDEN');
  await assert.rejects(() => service.acknowledge(seeker, firstInput), (error) => error instanceof CommissionConfirmationServiceError && error.code === 'COMMISSION_CONFIRMATION_FORBIDDEN');
  await assert.rejects(() => service.acknowledge(admin, firstInput), (error) => error instanceof CommissionConfirmationServiceError && error.code === 'COMMISSION_CONFIRMATION_FORBIDDEN');
  await assert.rejects(() => service.acknowledge(provider, { ...firstInput, unknown: true }), /Unrecognized key/);
  await assert.rejects(() => service.acknowledge(provider, { ...firstInput, source: 'none' }), /expected one of/);

  current = new Date('2026-08-22T12:00:00.000Z');
  const second = await service.acknowledge(provider, { accountId, source: 'exception', sourceRecordId: '444444444444444444444444', exceptionId: '444444444444444444444444', policyVersion: 4, effectiveAt: '2026-08-22T00:00:00.000Z', acknowledge: true });
  assert.equal(second.status, 'acknowledged');
  assert.equal((await service.getConfirmation(admin, first.id)).status, 'superseded');
  await assert.rejects(() => service.acknowledge(provider, { accountId, source: 'policy', sourceRecordId: '555555555555555555555555', policyId: '555555555555555555555555', policyVersion: 4, effectiveAt: second.effectiveAt, acknowledge: true }), (error) => error instanceof CommissionConfirmationServiceError && error.code === 'COMMISSION_CONFIRMATION_CONFLICT');

  const providerList = await service.listConfirmations(provider, { page: 1, limit: 10 });
  assert.deepEqual(providerList.items.map(item => item.id), [second.id, first.id]);
  const adminList = await service.listConfirmations(admin, { status: 'acknowledged', page: 1, limit: 10 });
  assert.deepEqual(adminList.items.map(item => item.id), [second.id]);
  assert.equal((await service.listConfirmations(otherProvider, { page: 1, limit: 10 })).total, 0);
  await assert.rejects(() => service.listConfirmations(otherProvider, { accountId, page: 1, limit: 10 }), (error) => error instanceof CommissionConfirmationServiceError && error.code === 'COMMISSION_CONFIRMATION_FORBIDDEN');

  const revoked = await service.revoke(admin, second.id, { expectedVersion: second.version, reason: 'Policy acknowledgement withdrawn after correction' });
  assert.equal(revoked.status, 'revoked');
  assert.equal(revoked.revokedBy, admin.sub);
  assert.equal(revoked.revokeReason, 'Policy acknowledgement withdrawn after correction');
  await assert.rejects(() => service.revoke(admin, second.id, { expectedVersion: second.version, reason: 'Replay' }), (error) => error instanceof CommissionConfirmationServiceError && error.code === 'COMMISSION_CONFIRMATION_VERSION_CONFLICT');
  assert.equal((await service.getConfirmation(provider, second.id)).status, 'revoked');
});

test('projects commission history from validated audit records with effective dates and admin-only access', async () => {
  const first: AuditLogData = {
    id: '111111111111111111111111', actorType: 'admin', actorId: admin.sub, targetType: 'commission_policy', targetId: '222222222222222222222222', action: 'commission_policy.update', reason: 'Activate default commission policy', before: { status: 'draft', effectiveFrom: '2026-08-01T00:00:00.000Z' }, after: { status: 'active', effectiveFrom: '2026-08-01T00:00:00.000Z', effectiveTo: '2027-01-01T00:00:00.000Z' }, requestId: 'commission-audit-1', traceId: 'a'.repeat(32), createdAt: '2026-08-14T10:00:00.000Z'
  };
  const second: AuditLogData = {
    id: '333333333333333333333333', actorType: 'provider', actorId: '444444444444444444444444', targetType: 'commission_confirmation', targetId: '555555555555555555555555', action: 'commission_confirmation.acknowledge', reason: 'Acknowledged the applied policy', before: {}, after: { status: 'acknowledged', policyVersion: 3, effectiveFrom: '2026-08-14T00:00:00.000Z' }, requestId: 'commission-audit-2', traceId: 'b'.repeat(32), createdAt: '2026-08-14T11:00:00.000Z'
  };
  let lastQuery: CommissionAuditSourceQuery | undefined;
  const source = {
    async list(query: CommissionAuditSourceQuery) { lastQuery = query; const items = [first, second].filter(item => query.targetTypes.some(targetType => targetType === item.targetType) && (!query.targetId || item.targetId === query.targetId)); return { items, total: items.length }; },
    async findById(id: string) { return id === first.id ? first : id === second.id ? second : undefined; }
  };
  const service = createCommissionChangeLogService({ source });
  const listed = await service.list(admin, { page: 1, limit: 10 });
  assert.deepEqual(listed.items.map(item => item.id), [second.id, first.id]);
  assert.equal(listed.items[0]?.effectiveFrom, '2026-08-14T00:00:00.000Z');
  assert.equal(listed.items[0]?.effectiveTo, undefined);
  assert.deepEqual(lastQuery?.targetTypes, ['commission_policy', 'commission_exception', 'commission_account_override', 'commission_confirmation']);
  const filtered = await service.list(admin, { targetType: 'commission_policy', targetId: first.targetId, page: 1, limit: 5 });
  assert.equal(filtered.items[0]?.targetType, 'commission_policy');
  assert.equal((await service.findById(admin, first.id)).action, first.action);
  await assert.rejects(() => service.list(seeker, { page: 1, limit: 10 }), (error) => error instanceof CommissionChangeLogServiceError && error.code === 'COMMISSION_CHANGE_LOG_FORBIDDEN');
  await assert.rejects(() => service.list(admin, { targetId: first.targetId, page: 1, limit: 10 }), /targetType is required/);
  await assert.rejects(() => service.findById(admin, '666666666666666666666666'), (error) => error instanceof CommissionChangeLogServiceError && error.code === 'COMMISSION_CHANGE_LOG_NOT_FOUND');
  const invalidService = createCommissionChangeLogService({ source: { async list() { return { items: [{ ...first, targetType: 'user' }], total: 1 }; }, async findById() { return undefined; } } });
  await assert.rejects(() => invalidService.list(admin, { page: 1, limit: 10 }), (error) => error instanceof CommissionChangeLogServiceError && error.code === 'COMMISSION_CHANGE_LOG_INVALID_SOURCE');
});
