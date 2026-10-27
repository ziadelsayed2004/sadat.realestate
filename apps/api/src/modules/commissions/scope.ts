import type { CommissionScope, ProviderType } from '@sadat-real-estate/contracts';

export interface CommissionScopeContext {
  accountId: string;
  providerType?: ProviderType | undefined;
  organizationId?: string | undefined;
}

// Specific account agreements precede organization/type policies and the fallback.
export function commissionScopePriority(scope: CommissionScope, context: CommissionScopeContext): number {
  if (scope.kind === 'account' && scope.key === context.accountId) return 4;
  if (scope.kind === 'organization' && scope.key === context.organizationId) return 3;
  if (scope.kind === 'provider_type' && scope.key === context.providerType) return 2;
  if (scope.kind === 'default') return 1;
  return 0;
}
