import type { AccessTokenClaims } from '../auth/crypto.js';
import type {
  SeekerPreferences,
  SeekerPreferencesPatch,
  SeekerProfileData,
  SeekerProfilePatch,
  SeekerRegistrationData,
  SeekerRegistrationRequest
} from '@sadat-real-estate/contracts';
import type { OpaqueTokenService } from '../auth/crypto.js';
import type { AuthService } from '../auth/service.js';
import type {
  CreateSeekerInput,
  SeekerAccount,
  SeekerPreferencesRecord,
  SeekerRepository
} from './repository.js';

export type SeekerServiceErrorCode =
  | 'INVALID_REGISTRATION_TOKEN'
  | 'SEEKER_ALREADY_EXISTS'
  | 'SEEKER_NOT_FOUND'
  | 'ACCOUNT_NOT_ACTIVE';

export class SeekerServiceError extends Error {
  readonly code: SeekerServiceErrorCode;

  constructor(code: SeekerServiceErrorCode) {
    super(code);
    this.name = 'SeekerServiceError';
    this.code = code;
  }
}

export interface SeekerServiceDependencies {
  repository: SeekerRepository;
  registrationTokens: OpaqueTokenService;
  redeemRegistrationGrant: (
    verificationTokenHash: string,
    roleType: 'seeker',
    now: Date
  ) => Promise<{ phone: string; roleType: 'seeker'; purpose: 'registration' } | undefined>;
  authService: Pick<AuthService, 'issueAccount'>;
  now?: () => Date;
}

export interface SeekerService {
  register(input: SeekerRegistrationRequest): Promise<{
    data: SeekerRegistrationData;
    refreshToken: string;
    refreshExpiresAt: Date;
  }>;
  getProfile(claims: AccessTokenClaims): Promise<SeekerProfileData>;
  updateProfile(claims: AccessTokenClaims, patch: SeekerProfilePatch): Promise<SeekerProfileData>;
  getPreferences(claims: AccessTokenClaims): Promise<{ data: SeekerPreferences; updatedAt: Date }>;
  updatePreferences(claims: AccessTokenClaims, patch: SeekerPreferencesPatch): Promise<{ data: SeekerPreferences; updatedAt: Date }>;
}

function active(claims: AccessTokenClaims): boolean {
  return claims.role === 'seeker' && claims.status !== 'rejected' && claims.status !== 'suspended';
}

function profileData(account: SeekerAccount): SeekerProfileData {
  return {
    id: account.id,
    roleType: 'seeker',
    status: account.status,
    phone: account.phone,
    firstName: account.firstName,
    lastName: account.lastName,
    locale: account.locale
  };
}

function preferencesData(record: SeekerPreferencesRecord): { data: SeekerPreferences; updatedAt: Date } {
  return { data: record.preferences, updatedAt: record.updatedAt };
}

export function createSeekerService(dependencies: SeekerServiceDependencies): SeekerService {
  const now = dependencies.now ?? (() => new Date());

  async function accountFor(claims: AccessTokenClaims): Promise<SeekerAccount> {
    if (!active(claims)) throw new SeekerServiceError('ACCOUNT_NOT_ACTIVE');
    const account = await dependencies.repository.findByUserId(claims.sub);
    if (!account) throw new SeekerServiceError('SEEKER_NOT_FOUND');
    return account;
  }

  return {
    async register(input) {
      const issuedAt = now();
      const grant = await dependencies.redeemRegistrationGrant(
        dependencies.registrationTokens.hash(input.verificationToken),
        'seeker',
        issuedAt
      );
      if (!grant || grant.roleType !== 'seeker' || grant.purpose !== 'registration') {
        throw new SeekerServiceError('INVALID_REGISTRATION_TOKEN');
      }
      let account: SeekerAccount;
      try {
        const createInput: CreateSeekerInput = {
          phone: grant.phone,
          firstName: input.firstName,
          lastName: input.lastName,
          locale: input.locale ?? 'ar'
        };
        account = await dependencies.repository.create(createInput);
      } catch (error) {
        if (error instanceof Error && error.message === 'SEEKER_ALREADY_EXISTS') {
          throw new SeekerServiceError('SEEKER_ALREADY_EXISTS');
        }
        throw error;
      }
      const session = await dependencies.authService.issueAccount({
        id: account.id,
        roleType: 'seeker',
        status: account.status
      });
      return {
        ...session,
        data: { outcome: 'registered', session: session.data }
      };
    },

    async getProfile(claims) {
      return profileData(await accountFor(claims));
    },

    async updateProfile(claims, patch) {
      await accountFor(claims);
      const account = await dependencies.repository.updateProfile(claims.sub, patch);
      if (!account) throw new SeekerServiceError('SEEKER_NOT_FOUND');
      return profileData(account);
    },

    async getPreferences(claims) {
      await accountFor(claims);
      const preferences = await dependencies.repository.findPreferences(claims.sub);
      if (!preferences) throw new SeekerServiceError('SEEKER_NOT_FOUND');
      return preferencesData(preferences);
    },

    async updatePreferences(claims, patch) {
      await accountFor(claims);
      const current = await dependencies.repository.findPreferences(claims.sub);
      if (!current) throw new SeekerServiceError('SEEKER_NOT_FOUND');
      const merged = { ...current.preferences, ...patch };
      const preferences = await dependencies.repository.updatePreferences(claims.sub, merged);
      if (!preferences) throw new SeekerServiceError('SEEKER_NOT_FOUND');
      return preferencesData(preferences);
    }
  };
}
