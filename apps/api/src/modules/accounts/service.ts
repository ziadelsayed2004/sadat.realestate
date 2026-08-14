import {
  accountObjectIdSchema,
  accountTransitionRequestSchema,
  providerReviewRequestSchema,
  type AccountTransitionAction,
  type AccountTransitionData,
  type AccountTransitionRequest,
  type AuthAccountState,
  type ProviderApplicationState,
  type ProviderReviewAction,
  type ProviderReviewData,
  type ProviderReviewRequest,
  type RbacPermission
} from '@sadat-real-estate/contracts';
import {
  canTransitionAccountState,
  canTransitionProviderProfileState
} from '../identity/account-state.js';
import type {
  AccountRepository,
  AccountTarget,
  ProviderReviewTarget
} from './repository.js';

export type AccountServiceErrorCode =
  | 'ACCOUNT_FORBIDDEN'
  | 'ACCOUNT_NOT_FOUND'
  | 'ACCOUNT_SELF_TRANSITION_FORBIDDEN'
  | 'ACCOUNT_ADMIN_TARGET_FORBIDDEN'
  | 'ACCOUNT_PROVIDER_REVIEW_REQUIRED'
  | 'ACCOUNT_TRANSITION_INVALID'
  | 'ACCOUNT_STATE_INCONSISTENT'
  | 'ACCOUNT_TRANSITION_CONFLICT';

export class AccountServiceError extends Error {
  readonly code: AccountServiceErrorCode;

  constructor(code: AccountServiceErrorCode) {
    super(code);
    this.name = 'AccountServiceError';
    this.code = code;
  }
}

export interface AccountPrincipal {
  userId: string;
}

export interface AccountRequestContext {
  requestId: string;
  traceId: string;
}

export interface AccountAuthorization {
  authorize(adminId: string, permission: RbacPermission): Promise<boolean>;
}

export interface AccountServiceDependencies {
  repository: AccountRepository;
  authorization: AccountAuthorization;
  now?: () => Date;
}

export interface AccountService {
  transitionAccount(
    principal: AccountPrincipal,
    userId: string,
    request: AccountTransitionRequest,
    context: AccountRequestContext
  ): Promise<AccountTransitionData>;
  reviewProvider(
    principal: AccountPrincipal,
    providerApplicationId: string,
    request: ProviderReviewRequest,
    context: AccountRequestContext
  ): Promise<ProviderReviewData>;
}

const ACCOUNT_ACTION_STATUS: Readonly<Record<AccountTransitionAction, AuthAccountState>> = {
  verify: 'verified',
  reject: 'rejected',
  needs_information: 'needs_information',
  suspend: 'suspended',
  restrict: 'restricted'
};

const PROVIDER_ACTION_STATUS: Readonly<
  Record<ProviderReviewAction, ProviderApplicationState>
> = {
  verify: 'approved',
  reject: 'rejected',
  needs_information: 'needs_information',
  suspend: 'suspended'
};

const PROVIDER_ACCOUNT_STATUS: Readonly<
  Record<ProviderApplicationState, AuthAccountState>
> = {
  draft: 'draft',
  pending_review: 'pending_review',
  needs_information: 'needs_information',
  approved: 'verified',
  rejected: 'rejected',
  suspended: 'suspended'
};

function availableAccountActions(target: AccountTarget): AccountTransitionAction[] {
  if (target.roleType === 'provider') {
    if (target.status === 'verified') return ['restrict'];
    if (target.status === 'restricted') return ['verify'];
    return [];
  }
  if (target.status === 'pending_review') return ['verify', 'reject', 'needs_information'];
  if (target.status === 'verified') return ['suspend', 'restrict'];
  if (target.status === 'restricted' || target.status === 'suspended') return ['verify'];
  return [];
}

function availableProviderReviewActions(
  state: ProviderApplicationState
): ProviderReviewAction[] {
  if (state === 'pending_review') return ['verify', 'reject', 'needs_information'];
  if (state === 'approved') return ['suspend'];
  if (state === 'suspended') return ['verify'];
  return [];
}

function providerGenericActionAllowed(
  target: AccountTarget,
  action: AccountTransitionAction
): boolean {
  return (target.status === 'verified' && action === 'restrict')
    || (target.status === 'restricted' && action === 'verify');
}

function providerTargetIsCoherent(target: ProviderReviewTarget): boolean {
  return target.profileStatus === target.applicationStatus
    && target.accountStatus === PROVIDER_ACCOUNT_STATUS[target.applicationStatus];
}

export function createAccountService(
  dependencies: AccountServiceDependencies
): AccountService {
  const now = dependencies.now ?? (() => new Date());

  async function requirePermission(adminId: string, permission: RbacPermission): Promise<void> {
    if (!await dependencies.authorization.authorize(adminId, permission)) {
      throw new AccountServiceError('ACCOUNT_FORBIDDEN');
    }
  }

  return {
    async transitionAccount(principal, unparsedUserId, unparsedRequest, context) {
      const userId = accountObjectIdSchema.parse(unparsedUserId);
      const request = accountTransitionRequestSchema.parse(unparsedRequest);
      await requirePermission(principal.userId, 'admin:users.manage');
      const target = await dependencies.repository.findAccount(userId);
      if (!target) throw new AccountServiceError('ACCOUNT_NOT_FOUND');
      if (target.userId === principal.userId) {
        throw new AccountServiceError('ACCOUNT_SELF_TRANSITION_FORBIDDEN');
      }
      if (target.roleType === 'admin') {
        throw new AccountServiceError('ACCOUNT_ADMIN_TARGET_FORBIDDEN');
      }
      if (target.roleType === 'provider' && !providerGenericActionAllowed(target, request.action)) {
        throw new AccountServiceError('ACCOUNT_PROVIDER_REVIEW_REQUIRED');
      }

      const toStatus = ACCOUNT_ACTION_STATUS[request.action];
      if (!canTransitionAccountState(target.status, toStatus)) {
        throw new AccountServiceError('ACCOUNT_TRANSITION_INVALID');
      }
      const changedAt = now();
      const result = await dependencies.repository.transitionAccount({
        target,
        toStatus,
        actorAdminId: principal.userId,
        action: request.action,
        reason: request.reason,
        requestId: context.requestId,
        traceId: context.traceId,
        changedAt
      });
      if (result.kind === 'conflict') {
        throw new AccountServiceError('ACCOUNT_TRANSITION_CONFLICT');
      }
      const nextTarget = { ...target, status: toStatus };
      return {
        transitionId: result.transitionId,
        userId: target.userId,
        roleType: target.roleType,
        action: request.action,
        fromStatus: target.status,
        status: toStatus,
        reason: request.reason,
        version: result.version,
        changedAt: changedAt.toISOString(),
        availableActions: availableAccountActions(nextTarget)
      };
    },

    async reviewProvider(principal, unparsedProviderId, unparsedRequest, context) {
      const providerApplicationId = accountObjectIdSchema.parse(unparsedProviderId);
      const request = providerReviewRequestSchema.parse(unparsedRequest);
      await requirePermission(principal.userId, 'admin:providers.review');
      const target = await dependencies.repository.findProviderReviewTarget(
        providerApplicationId
      );
      if (!target) throw new AccountServiceError('ACCOUNT_NOT_FOUND');
      if (target.userId === principal.userId) {
        throw new AccountServiceError('ACCOUNT_SELF_TRANSITION_FORBIDDEN');
      }
      if (!providerTargetIsCoherent(target)) {
        throw new AccountServiceError('ACCOUNT_STATE_INCONSISTENT');
      }

      const toProviderStatus = PROVIDER_ACTION_STATUS[request.action];
      const toAccountStatus = PROVIDER_ACCOUNT_STATUS[toProviderStatus];
      if (
        !canTransitionProviderProfileState(target.applicationStatus, toProviderStatus)
        || !canTransitionAccountState(target.accountStatus, toAccountStatus)
      ) {
        throw new AccountServiceError('ACCOUNT_TRANSITION_INVALID');
      }
      const changedAt = now();
      const result = await dependencies.repository.reviewProvider({
        target,
        toProviderStatus,
        toAccountStatus,
        actorAdminId: principal.userId,
        action: request.action,
        reason: request.reason,
        requestId: context.requestId,
        traceId: context.traceId,
        changedAt
      });
      if (result.kind === 'conflict') {
        throw new AccountServiceError('ACCOUNT_TRANSITION_CONFLICT');
      }
      return {
        transitionId: result.transitionId,
        providerApplicationId: target.providerApplicationId,
        userId: target.userId,
        providerType: target.providerType,
        action: request.action,
        fromAccountStatus: target.accountStatus,
        accountStatus: toAccountStatus,
        fromApplicationStatus: target.applicationStatus,
        applicationStatus: toProviderStatus,
        reason: request.reason,
        accountVersion: result.accountVersion,
        applicationVersion: result.applicationVersion,
        changedAt: changedAt.toISOString(),
        availableActions: availableProviderReviewActions(toProviderStatus)
      };
    }
  };
}
