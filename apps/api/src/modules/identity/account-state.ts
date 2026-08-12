export const USER_ROLE_TYPES = ['seeker', 'provider', 'admin'] as const;
export type UserRoleType = (typeof USER_ROLE_TYPES)[number];

export const ACCOUNT_STATES = [
  'draft',
  'unverified',
  'pending_review',
  'needs_information',
  'verified',
  'rejected',
  'restricted',
  'suspended'
] as const;
export type AccountState = (typeof ACCOUNT_STATES)[number];

export const PROVIDER_TYPES = [
  'individual_broker',
  'office',
  'development_company'
] as const;
export type ProviderType = (typeof PROVIDER_TYPES)[number];

export const PROVIDER_PROFILE_STATES = [
  'draft',
  'pending_review',
  'needs_information',
  'approved',
  'rejected',
  'suspended'
] as const;
export type ProviderProfileState = (typeof PROVIDER_PROFILE_STATES)[number];

const accountTransitions: Readonly<Record<AccountState, readonly AccountState[]>> = {
  draft: ['pending_review'],
  unverified: ['pending_review'],
  pending_review: ['needs_information', 'verified', 'rejected'],
  needs_information: ['pending_review'],
  verified: ['restricted', 'suspended'],
  rejected: [],
  restricted: ['verified'],
  suspended: ['verified']
};

const providerTransitions: Readonly<
  Record<ProviderProfileState, readonly ProviderProfileState[]>
> = {
  draft: ['pending_review'],
  pending_review: ['needs_information', 'approved', 'rejected'],
  needs_information: ['pending_review'],
  approved: ['suspended'],
  rejected: [],
  suspended: ['approved']
};

export function canTransitionAccountState(from: AccountState, to: AccountState): boolean {
  return accountTransitions[from].includes(to);
}

export function canTransitionProviderProfileState(
  from: ProviderProfileState,
  to: ProviderProfileState
): boolean {
  return providerTransitions[from].includes(to);
}
