import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  AccountRepository,
  AccountTarget,
  AccountTransitionWriteInput,
  ProviderReviewTarget,
  ProviderReviewWriteInput
} from '../../src/modules/accounts/repository.js';
import {
  AccountServiceError,
  createAccountService
} from '../../src/modules/accounts/service.js';

const adminId = '0123456789abcdef01234567';
const viewerId = '1123456789abcdef01234567';
const seekerId = '2123456789abcdef01234567';
const providerUserId = '3123456789abcdef01234567';
const providerApplicationId = '4123456789abcdef01234567';
const otherAdminId = '5123456789abcdef01234567';
const transitionId = '6123456789abcdef01234567';
const changedAt = new Date('2026-08-14T08:00:00.000Z');
const context = { requestId: 'accounts-test-1', traceId: '7'.repeat(32) };

class MemoryRepository implements AccountRepository {
  accounts = new Map<string, AccountTarget>();
  providers = new Map<string, ProviderReviewTarget>();
  writes: Array<AccountTransitionWriteInput | ProviderReviewWriteInput> = [];
  conflict = false;

  async findAccount(userId: string) { return this.accounts.get(userId); }
  async findProviderReviewTarget(id: string) { return this.providers.get(id); }
  async isAccessSessionCurrent() { return true; }
  async transitionAccount(input: AccountTransitionWriteInput) {
    this.writes.push(input);
    if (this.conflict) return { kind: 'conflict' as const };
    this.accounts.set(input.target.userId, {
      ...input.target,
      status: input.toStatus,
      version: input.target.version + 1
    });
    return { kind: 'written' as const, transitionId, version: input.target.version + 1 };
  }
  async reviewProvider(input: ProviderReviewWriteInput) {
    this.writes.push(input);
    if (this.conflict) return { kind: 'conflict' as const };
    this.providers.set(input.target.providerApplicationId, {
      ...input.target,
      accountStatus: input.toAccountStatus,
      accountVersion: input.target.accountVersion + 1,
      applicationStatus: input.toProviderStatus,
      applicationVersion: input.target.applicationVersion + 1,
      profileStatus: input.toProviderStatus,
      profileVersion: input.target.profileVersion + 1
    });
    return {
      kind: 'written' as const,
      transitionId,
      accountVersion: input.target.accountVersion + 1,
      applicationVersion: input.target.applicationVersion + 1
    };
  }
}

function fixture() {
  const repository = new MemoryRepository();
  repository.accounts.set(seekerId, {
    userId: seekerId, roleType: 'seeker', status: 'verified', version: 0
  });
  repository.accounts.set(providerUserId, {
    userId: providerUserId, roleType: 'provider', status: 'pending_review', version: 1
  });
  repository.accounts.set(otherAdminId, {
    userId: otherAdminId, roleType: 'admin', status: 'verified', version: 0
  });
  repository.providers.set(providerApplicationId, {
    providerApplicationId,
    userId: providerUserId,
    providerType: 'brokerage_office',
    accountStatus: 'pending_review',
    accountVersion: 1,
    applicationStatus: 'pending_review',
    applicationVersion: 2,
    profileStatus: 'pending_review',
    profileVersion: 0
  });
  const permissions = new Map([
    [adminId, new Set(['admin:users.manage', 'admin:providers.review'])],
    [viewerId, new Set(['admin:users.view', 'admin:providers.view'])]
  ]);
  const service = createAccountService({
    repository,
    authorization: {
      async authorize(actorId, permission) {
        return permissions.get(actorId)?.has(permission) ?? false;
      }
    },
    now: () => changedAt
  });
  return { repository, service };
}

function code(expected: string) {
  return (error: unknown) => error instanceof AccountServiceError && error.code === expected;
}

test('restricts and restores a non-provider account with mandatory trace evidence', async () => {
  const { repository, service } = fixture();
  const restricted = await service.transitionAccount({ userId: adminId }, seekerId, {
    action: 'restrict', reason: '  Confirmed policy breach  '
  }, context);
  assert.equal(restricted.status, 'restricted');
  assert.deepEqual(restricted.availableActions, ['verify']);
  assert.equal(restricted.reason, 'Confirmed policy breach');
  assert.equal(repository.writes[0]?.requestId, context.requestId);

  const restored = await service.transitionAccount({ userId: adminId }, seekerId, {
    action: 'verify', reason: 'Restriction review completed'
  }, context);
  assert.equal(restored.status, 'verified');
  assert.deepEqual(restored.availableActions, ['suspend', 'restrict']);
});

test('synchronizes provider application, profile, and account review states', async () => {
  const { repository, service } = fixture();
  const approved = await service.reviewProvider({ userId: adminId }, providerApplicationId, {
    action: 'verify', reason: 'Manual platform review completed'
  }, context);
  assert.equal(approved.applicationStatus, 'approved');
  assert.equal(approved.accountStatus, 'verified');
  assert.deepEqual(approved.availableActions, ['suspend']);

  const suspended = await service.reviewProvider({ userId: adminId }, providerApplicationId, {
    action: 'suspend', reason: 'Repeated marketplace policy breach'
  }, context);
  assert.equal(suspended.applicationStatus, 'suspended');
  assert.equal(suspended.accountStatus, 'suspended');
  assert.deepEqual(suspended.availableActions, ['verify']);

  const restored = await service.reviewProvider({ userId: adminId }, providerApplicationId, {
    action: 'verify', reason: 'Corrective review completed'
  }, context);
  assert.equal(restored.applicationStatus, 'approved');
  assert.equal(repository.writes.length, 3);
});

test('supports reason-bearing provider needs-information and rejection transitions', async () => {
  for (const [action, expected] of [
    ['needs_information', 'needs_information'],
    ['reject', 'rejected']
  ] as const) {
    const { service } = fixture();
    const result = await service.reviewProvider({ userId: adminId }, providerApplicationId, {
      action, reason: `Manual ${action} decision`
    }, context);
    assert.equal(result.applicationStatus, expected);
    assert.equal(result.accountStatus, expected);
    assert.deepEqual(result.availableActions, []);
  }
});

test('fails closed for View Only, self, Admin-target, missing, and provider-bypass attempts', async () => {
  const { repository, service } = fixture();
  await assert.rejects(service.transitionAccount({ userId: viewerId }, seekerId, {
    action: 'restrict', reason: 'Viewer attempted mutation'
  }, context), code('ACCOUNT_FORBIDDEN'));

  repository.accounts.set(adminId, {
    userId: adminId, roleType: 'admin', status: 'verified', version: 0
  });
  await assert.rejects(service.transitionAccount({ userId: adminId }, adminId, {
    action: 'suspend', reason: 'Unsafe self mutation'
  }, context), code('ACCOUNT_SELF_TRANSITION_FORBIDDEN'));
  await assert.rejects(service.transitionAccount({ userId: adminId }, otherAdminId, {
    action: 'suspend', reason: 'Admin lifecycle belongs to staff management'
  }, context), code('ACCOUNT_ADMIN_TARGET_FORBIDDEN'));
  await assert.rejects(service.transitionAccount({ userId: adminId }, providerUserId, {
    action: 'verify', reason: 'Attempted provider review bypass'
  }, context), code('ACCOUNT_PROVIDER_REVIEW_REQUIRED'));
  await assert.rejects(service.transitionAccount(
    { userId: adminId },
    '7123456789abcdef01234567',
    { action: 'suspend', reason: 'Unknown target' },
    context
  ), code('ACCOUNT_NOT_FOUND'));
});

test('rejects invalid state jumps, inconsistent provider aggregates, replays, and concurrency', async () => {
  const { repository, service } = fixture();
  await assert.rejects(service.transitionAccount({ userId: adminId }, seekerId, {
    action: 'reject', reason: 'Invalid direct rejection'
  }, context), code('ACCOUNT_TRANSITION_INVALID'));

  const first = await service.transitionAccount({ userId: adminId }, seekerId, {
    action: 'suspend', reason: 'Confirmed temporary suspension'
  }, context);
  assert.equal(first.status, 'suspended');
  await assert.rejects(service.transitionAccount({ userId: adminId }, seekerId, {
    action: 'suspend', reason: 'Duplicate replay'
  }, context), code('ACCOUNT_TRANSITION_INVALID'));

  repository.providers.get(providerApplicationId)!.profileStatus = 'draft';
  await assert.rejects(service.reviewProvider({ userId: adminId }, providerApplicationId, {
    action: 'verify', reason: 'Inconsistent aggregate'
  }, context), code('ACCOUNT_STATE_INCONSISTENT'));

  const next = fixture();
  next.repository.conflict = true;
  await assert.rejects(next.service.reviewProvider({ userId: adminId }, providerApplicationId, {
    action: 'verify', reason: 'Concurrent review'
  }, context), code('ACCOUNT_TRANSITION_CONFLICT'));
});
