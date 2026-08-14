import type {
  ProviderApplicationState,
  ProviderDocumentCategory,
  ProviderDocumentRequirement,
  ProviderRequirementSnapshot,
  ProviderType
} from '@sadat-real-estate/contracts';

export const PROVIDER_REQUIREMENT_VERSION = '2026-08-13.1';

const conditionalAuthorizationLetter = Object.freeze({
  key: 'authorization_letter' as const,
  labelKey: 'provider.documents.authorizationLetter' as const,
  classification: 'conditional' as const,
  condition: Object.freeze({
    key: 'account_owner_lacks_registered_authority' as const,
    field: 'accountOwnerHasRegisteredAuthority' as const,
    operator: 'equals' as const,
    value: false as const
  })
});

function defineRequirements(
  requirements: readonly ProviderDocumentRequirement[]
): readonly ProviderDocumentRequirement[] {
  return Object.freeze(requirements);
}

export const PROVIDER_DOCUMENT_REQUIREMENTS: Readonly<
  Record<ProviderType, readonly ProviderDocumentRequirement[]>
> = Object.freeze({
  individual_broker: defineRequirements([
    { key: 'government_id_front', labelKey: 'provider.documents.governmentIdFront', classification: 'required' },
    { key: 'government_id_back', labelKey: 'provider.documents.governmentIdBack', classification: 'required' },
    { key: 'broker_license', labelKey: 'provider.documents.brokerLicense', classification: 'optional' },
    { key: 'professional_membership', labelKey: 'provider.documents.professionalMembership', classification: 'optional' },
    { key: 'additional_supporting_document', labelKey: 'provider.documents.additionalSupportingDocument', classification: 'optional' }
  ]),
  brokerage_office: defineRequirements([
    { key: 'commercial_registration', labelKey: 'provider.documents.commercialRegistration', classification: 'required' },
    { key: 'tax_card', labelKey: 'provider.documents.taxCard', classification: 'required' },
    { key: 'authorized_representative_id_front', labelKey: 'provider.documents.authorizedRepresentativeIdFront', classification: 'required' },
    { key: 'authorized_representative_id_back', labelKey: 'provider.documents.authorizedRepresentativeIdBack', classification: 'required' },
    conditionalAuthorizationLetter,
    { key: 'brokerage_license', labelKey: 'provider.documents.brokerageLicense', classification: 'optional' },
    { key: 'company_profile', labelKey: 'provider.documents.companyProfile', classification: 'optional' },
    { key: 'additional_supporting_document', labelKey: 'provider.documents.additionalSupportingDocument', classification: 'optional' }
  ]),
  developer_company: defineRequirements([
    { key: 'commercial_registration', labelKey: 'provider.documents.commercialRegistration', classification: 'required' },
    { key: 'tax_card', labelKey: 'provider.documents.taxCard', classification: 'required' },
    { key: 'authorized_representative_id_front', labelKey: 'provider.documents.authorizedRepresentativeIdFront', classification: 'required' },
    { key: 'authorized_representative_id_back', labelKey: 'provider.documents.authorizedRepresentativeIdBack', classification: 'required' },
    conditionalAuthorizationLetter,
    { key: 'company_profile', labelKey: 'provider.documents.companyProfile', classification: 'optional' },
    { key: 'developer_license', labelKey: 'provider.documents.developerLicense', classification: 'optional' },
    { key: 'additional_supporting_document', labelKey: 'provider.documents.additionalSupportingDocument', classification: 'optional' }
  ])
});

const PROVIDER_DOCUMENT_REQUIREMENT_VERSIONS: Readonly<
  Record<string, Readonly<Record<ProviderType, readonly ProviderDocumentRequirement[]>>>
> = Object.freeze({
  [PROVIDER_REQUIREMENT_VERSION]: PROVIDER_DOCUMENT_REQUIREMENTS
});

export interface ProviderSubmissionCandidate {
  providerType: ProviderType;
  accountOwnerFullName?: string;
  displayName?: string;
  email?: string;
  primaryLocationId?: string;
  serviceAreaIds?: readonly string[];
  preferredLocale?: string;
  termsAcceptedAt?: Date;
  privacyAcceptedAt?: Date;
  legalBusinessName?: string;
  tradeName?: string;
  businessAddress?: string;
  legalCompanyName?: string;
  brandName?: string;
  headOfficeAddress?: string;
  commercialRegistrationNumber?: string;
  taxRegistrationNumber?: string;
  authorizedRepresentativeFullName?: string;
  authorizedRepresentativeTitle?: string;
  accountOwnerHasRegisteredAuthority?: boolean;
}

const commonFields = [
  'accountOwnerFullName',
  'displayName',
  'email',
  'primaryLocationId',
  'serviceAreaIds',
  'preferredLocale',
  'termsAcceptedAt',
  'privacyAcceptedAt'
] as const;

const officeFields = [
  'legalBusinessName',
  'tradeName',
  'businessAddress',
  'commercialRegistrationNumber',
  'taxRegistrationNumber',
  'authorizedRepresentativeFullName',
  'authorizedRepresentativeTitle',
  'accountOwnerHasRegisteredAuthority'
] as const;

const companyFields = [
  'legalCompanyName',
  'brandName',
  'headOfficeAddress',
  'commercialRegistrationNumber',
  'taxRegistrationNumber',
  'authorizedRepresentativeFullName',
  'authorizedRepresentativeTitle',
  'accountOwnerHasRegisteredAuthority'
] as const;

function missing(candidate: ProviderSubmissionCandidate, field: keyof ProviderSubmissionCandidate): boolean {
  const value = candidate[field];
  if (field === 'serviceAreaIds') return !Array.isArray(value) || value.length === 0;
  return value === undefined || value === null || value === '';
}

export function missingProviderFields(candidate: ProviderSubmissionCandidate): string[] {
  const fields: readonly (keyof ProviderSubmissionCandidate)[] = candidate.providerType === 'brokerage_office'
    ? [...commonFields, ...officeFields]
    : candidate.providerType === 'developer_company'
      ? [...commonFields, ...companyFields]
      : commonFields;
  return fields.filter((field) => missing(candidate, field));
}

export function providerRequirementSnapshot(
  providerType: ProviderType,
  accountOwnerHasRegisteredAuthority: boolean | undefined,
  version = PROVIDER_REQUIREMENT_VERSION
): ProviderRequirementSnapshot {
  const requirements = PROVIDER_DOCUMENT_REQUIREMENT_VERSIONS[version];
  if (!requirements) {
    throw new Error(`Unknown provider document requirement version: ${version}`);
  }

  return {
    version,
    providerType,
    requirements: requirements[providerType].map((requirement) => ({
      ...requirement,
      applies: requirement.classification !== 'conditional'
        || accountOwnerHasRegisteredAuthority === false
    }))
  };
}

export function requiredDocumentCategories(
  snapshot: ProviderRequirementSnapshot
): ProviderDocumentCategory[] {
  return snapshot.requirements
    .filter((requirement) => requirement.applies && requirement.classification !== 'optional')
    .map((requirement) => requirement.key);
}

export function availableProviderActions(
  providerType: ProviderType,
  state: ProviderApplicationState
): Array<'edit_account' | 'edit_business' | 'edit_company' | 'submit' | 'view_status' | 'open_dashboard'> {
  if (state === 'approved') return ['view_status', 'open_dashboard'];
  if (state !== 'draft' && state !== 'needs_information') return ['view_status'];
  const actions: Array<'edit_account' | 'edit_business' | 'edit_company' | 'submit' | 'view_status'> = [
    'edit_account',
    'submit',
    'view_status'
  ];
  if (providerType === 'brokerage_office') actions.splice(1, 0, 'edit_business');
  if (providerType === 'developer_company') actions.splice(1, 0, 'edit_company');
  return actions;
}

const transitions: Readonly<Record<ProviderApplicationState, readonly ProviderApplicationState[]>> = {
  draft: ['pending_review'],
  pending_review: ['needs_information', 'approved', 'rejected'],
  needs_information: ['pending_review'],
  approved: ['suspended'],
  rejected: [],
  suspended: ['approved']
};

export function canTransitionProviderApplication(
  from: ProviderApplicationState,
  to: ProviderApplicationState
): boolean {
  return transitions[from].includes(to);
}
