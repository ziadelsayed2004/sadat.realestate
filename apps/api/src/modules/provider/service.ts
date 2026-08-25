import type {
  ErrorDetail,
  ProviderAccountPatch,
  ProviderApplicationCreateRequest,
  ProviderApplicationData,
  ProviderApplicationStatusData,
  ProviderBusinessPatch,
  ProviderCompanyPatch,
  ProviderDocumentCategory,
  ProviderRegistrationData,
  ProviderSubmitRequest
} from '@sadat-real-estate/contracts';
import type { AccessTokenClaims, OpaqueTokenService } from '../auth/crypto.js';
import type { AuthService } from '../auth/service.js';
import {
  availableProviderActions,
  missingProviderFields,
  PROVIDER_REQUIREMENT_VERSION,
  providerRequirementSnapshot,
  requiredDocumentCategories
} from './requirements.js';
import type {
  ProviderApplicationEntity,
  ProviderDocumentInventory,
  ProviderDraftPatch,
  ProviderRepository,
  ProviderWriteResult
} from './repository.js';

export type ProviderServiceErrorCode =
  | 'INVALID_REGISTRATION_TOKEN'
  | 'PROVIDER_ALREADY_EXISTS'
  | 'PROVIDER_APPLICATION_NOT_FOUND'
  | 'PROVIDER_APPLICATION_NOT_EDITABLE'
  | 'PROVIDER_APPLICATION_VERSION_CONFLICT'
  | 'PROVIDER_STEP_NOT_APPLICABLE'
  | 'PROVIDER_APPLICATION_INCOMPLETE';

export class ProviderServiceError extends Error {
  readonly code: ProviderServiceErrorCode;
  readonly details: readonly ErrorDetail[];

  constructor(code: ProviderServiceErrorCode, details: readonly ErrorDetail[] = []) {
    super(code);
    this.name = 'ProviderServiceError';
    this.code = code;
    this.details = details;
  }
}

export interface ProviderServiceDependencies {
  repository: ProviderRepository;
  documentInventory: ProviderDocumentInventory;
  registrationTokens: OpaqueTokenService;
  redeemRegistrationGrant: (
    verificationTokenHash: string,
    roleType: 'provider',
    now: Date
  ) => Promise<{
    phone: string;
    email: string;
    roleType: 'provider';
    purpose: 'registration';
  } | undefined>;
  authService: Pick<AuthService, 'issueAccount'>;
  now?: () => Date;
}

export interface ProviderService {
  registerDraft(input: ProviderApplicationCreateRequest): Promise<{
    data: ProviderRegistrationData;
    refreshToken: string;
    refreshExpiresAt: Date;
  }>;
  getApplication(claims: AccessTokenClaims): Promise<ProviderApplicationData>;
  updateAccount(claims: AccessTokenClaims, patch: ProviderAccountPatch): Promise<ProviderApplicationData>;
  updateBusiness(claims: AccessTokenClaims, patch: ProviderBusinessPatch): Promise<ProviderApplicationData>;
  updateCompany(claims: AccessTokenClaims, patch: ProviderCompanyPatch): Promise<ProviderApplicationData>;
  submit(claims: AccessTokenClaims, input: ProviderSubmitRequest): Promise<ProviderApplicationData>;
  getStatus(claims: AccessTokenClaims): Promise<ProviderApplicationStatusData>;
}

const acceptableSubmissionDocumentStates = new Set(['uploaded', 'pending_review', 'approved']);

function providerClaims(claims: AccessTokenClaims): void {
  if (claims.role !== 'provider') throw new ProviderServiceError('PROVIDER_APPLICATION_NOT_FOUND');
}

function writeError(result: Exclude<ProviderWriteResult, { kind: 'updated' }>): never {
  if (result.kind === 'version_conflict') {
    throw new ProviderServiceError('PROVIDER_APPLICATION_VERSION_CONFLICT');
  }
  if (result.kind === 'not_editable') {
    throw new ProviderServiceError('PROVIDER_APPLICATION_NOT_EDITABLE');
  }
  throw new ProviderServiceError('PROVIDER_APPLICATION_NOT_FOUND');
}

function missingDocumentCategories(
  required: readonly ProviderDocumentCategory[],
  documents: Awaited<ReturnType<ProviderDocumentInventory['list']>>
): ProviderDocumentCategory[] {
  const present = new Set(
    documents
      .filter((document) => acceptableSubmissionDocumentStates.has(document.status))
      .map((document) => document.category)
  );
  return required.filter((category) => !present.has(category));
}

async function completeness(
  application: ProviderApplicationEntity,
  inventory: ProviderDocumentInventory
): Promise<{ missingFields: string[]; missingDocuments: ProviderDocumentCategory[] }> {
  const snapshot = providerRequirementSnapshot(
    application.providerType,
    application.accountOwnerHasRegisteredAuthority,
    application.requirementVersion
  );
  return {
    missingFields: missingProviderFields(application),
    missingDocuments: missingDocumentCategories(
      requiredDocumentCategories(snapshot),
      await inventory.list(application.id)
    )
  };
}

function applicationData(
  application: ProviderApplicationEntity,
  missingFields: string[],
  missingDocuments: ProviderDocumentCategory[]
): ProviderApplicationData {
  return {
    id: application.id,
    providerType: application.providerType,
    status: application.status,
    version: application.version,
    phone: application.phone,
    requirementVersion: application.requirementVersion,
    ...(application.accountOwnerFullName ? { accountOwnerFullName: application.accountOwnerFullName } : {}),
    ...(application.displayName ? { displayName: application.displayName } : {}),
    ...(application.email ? { email: application.email } : {}),
    ...(application.primaryLocationId ? { primaryLocationId: application.primaryLocationId } : {}),
    ...(application.serviceAreaIds ? { serviceAreaIds: application.serviceAreaIds } : {}),
    ...(application.preferredLocale ? { preferredLocale: application.preferredLocale } : {}),
    ...(application.termsAcceptedAt ? { termsAcceptedAt: application.termsAcceptedAt.toISOString() } : {}),
    ...(application.privacyAcceptedAt ? { privacyAcceptedAt: application.privacyAcceptedAt.toISOString() } : {}),
    ...(application.secondaryPhone ? { secondaryPhone: application.secondaryPhone } : {}),
    ...(application.whatsappNumber ? { whatsappNumber: application.whatsappNumber } : {}),
    ...(application.profileAssetId ? { profileAssetId: application.profileAssetId } : {}),
    ...(application.biography ? { biography: application.biography } : {}),
    ...(application.website ? { website: application.website } : {}),
    ...(application.socialLinks ? { socialLinks: application.socialLinks } : {}),
    ...(application.legalBusinessName ? { legalBusinessName: application.legalBusinessName } : {}),
    ...(application.tradeName ? { tradeName: application.tradeName } : {}),
    ...(application.businessAddress ? { businessAddress: application.businessAddress } : {}),
    ...(application.legalCompanyName ? { legalCompanyName: application.legalCompanyName } : {}),
    ...(application.brandName ? { brandName: application.brandName } : {}),
    ...(application.headOfficeAddress ? { headOfficeAddress: application.headOfficeAddress } : {}),
    ...(application.commercialRegistrationNumber ? { commercialRegistrationNumber: application.commercialRegistrationNumber } : {}),
    ...(application.taxRegistrationNumber ? { taxRegistrationNumber: application.taxRegistrationNumber } : {}),
    ...(application.authorizedRepresentativeFullName ? { authorizedRepresentativeFullName: application.authorizedRepresentativeFullName } : {}),
    ...(application.authorizedRepresentativeTitle ? { authorizedRepresentativeTitle: application.authorizedRepresentativeTitle } : {}),
    ...(application.accountOwnerHasRegisteredAuthority !== undefined
      ? { accountOwnerHasRegisteredAuthority: application.accountOwnerHasRegisteredAuthority }
      : {}),
    ...(application.requirementsSnapshot ? { requirementsSnapshot: application.requirementsSnapshot } : {}),
    missingFields,
    missingDocuments,
    availableActions: availableProviderActions(application.providerType, application.status),
    ...(application.submittedAt ? { submittedAt: application.submittedAt.toISOString() } : {}),
    ...(application.reviewReason ? { reviewReason: application.reviewReason } : {}),
    createdAt: application.createdAt.toISOString(),
    updatedAt: application.updatedAt.toISOString()
  };
}

function statusData(application: ProviderApplicationEntity): ProviderApplicationStatusData {
  return {
    applicationId: application.id,
    providerType: application.providerType,
    status: application.status,
    version: application.version,
    ...(application.submittedAt ? { submittedAt: application.submittedAt.toISOString() } : {}),
    ...(application.reviewReason ? { reviewReason: application.reviewReason } : {}),
    availableActions: availableProviderActions(application.providerType, application.status)
  };
}

function incompleteDetails(
  missingFields: readonly string[],
  missingDocuments: readonly ProviderDocumentCategory[]
): ErrorDetail[] {
  return [
    ...missingFields.map((field) => ({
      path: [field], code: 'REQUIRED_FIELD_MISSING', messageKey: 'errors.provider.requiredFieldMissing'
    })),
    ...missingDocuments.map((category) => ({
      path: ['documents', category], code: 'REQUIRED_DOCUMENT_MISSING', messageKey: 'errors.provider.requiredDocumentMissing'
    }))
  ];
}

export function createProviderService(dependencies: ProviderServiceDependencies): ProviderService {
  const now = dependencies.now ?? (() => new Date());

  async function owned(claims: AccessTokenClaims): Promise<ProviderApplicationEntity> {
    providerClaims(claims);
    const application = await dependencies.repository.findByUserId(claims.sub);
    if (!application) throw new ProviderServiceError('PROVIDER_APPLICATION_NOT_FOUND');
    return application;
  }

  async function withCompleteness(application: ProviderApplicationEntity): Promise<ProviderApplicationData> {
    const state = await completeness(application, dependencies.documentInventory);
    return applicationData(application, state.missingFields, state.missingDocuments);
  }

  async function save(
    claims: AccessTokenClaims,
    version: number,
    patch: ProviderDraftPatch
  ): Promise<ProviderApplicationData> {
    await owned(claims);
    const result = await dependencies.repository.updateDraft(claims.sub, version, patch);
    if (result.kind !== 'updated') return writeError(result);
    return withCompleteness(result.application);
  }

  return {
    async registerDraft(input) {
      const createdAt = now();
      const grant = await dependencies.redeemRegistrationGrant(
        dependencies.registrationTokens.hash(input.verificationToken),
        'provider',
        createdAt
      );
      if (!grant || grant.roleType !== 'provider' || grant.purpose !== 'registration') {
        throw new ProviderServiceError('INVALID_REGISTRATION_TOKEN');
      }
      let application: ProviderApplicationEntity;
      try {
        application = await dependencies.repository.createDraft({
          phone: grant.phone,
          email: grant.email,
          providerType: input.providerType,
          requirementVersion: PROVIDER_REQUIREMENT_VERSION
        });
      } catch (error) {
        if (error instanceof Error && error.message === 'PROVIDER_ALREADY_EXISTS') {
          throw new ProviderServiceError('PROVIDER_ALREADY_EXISTS');
        }
        throw error;
      }
      const session = await dependencies.authService.issueAccount({
        id: application.userId,
        roleType: 'provider',
        status: 'draft'
      });
      return {
        ...session,
        data: {
          outcome: 'registered_draft',
          session: session.data,
          application: await withCompleteness(application)
        }
      };
    },

    async getApplication(claims) {
      return withCompleteness(await owned(claims));
    },

    async updateAccount(claims, patch) {
      const { version, ...fields } = patch;
      return save(claims, version, fields);
    },

    async updateBusiness(claims, patch) {
      const application = await owned(claims);
      if (application.providerType !== 'brokerage_office') {
        throw new ProviderServiceError('PROVIDER_STEP_NOT_APPLICABLE');
      }
      const { version, ...fields } = patch;
      return save(claims, version, fields);
    },

    async updateCompany(claims, patch) {
      const application = await owned(claims);
      if (application.providerType !== 'developer_company') {
        throw new ProviderServiceError('PROVIDER_STEP_NOT_APPLICABLE');
      }
      const { version, ...fields } = patch;
      return save(claims, version, fields);
    },

    async submit(claims, input) {
      const application = await owned(claims);
      const state = await completeness(application, dependencies.documentInventory);
      if (state.missingFields.length > 0 || state.missingDocuments.length > 0) {
        throw new ProviderServiceError(
          'PROVIDER_APPLICATION_INCOMPLETE',
          incompleteDetails(state.missingFields, state.missingDocuments)
        );
      }
      const snapshot = providerRequirementSnapshot(
        application.providerType,
        application.accountOwnerHasRegisteredAuthority,
        application.requirementVersion
      );
      const result = await dependencies.repository.submit(claims.sub, input.version, snapshot, now());
      if (result.kind !== 'updated') return writeError(result);
      return applicationData(result.application, [], []);
    },

    async getStatus(claims) {
      return statusData(await owned(claims));
    }
  };
}
