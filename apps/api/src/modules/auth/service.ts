import { randomBytes } from 'node:crypto';
import type { AdminLoginRequest, AuthLoginData, AuthRoleType, AuthSessionData, PasswordChangeRequest } from '@sadat-real-estate/contracts';
import type {
  AccessTokenService,
  OpaqueTokenService,
  PasswordHasher
} from './crypto.js';
import type { AuthAccount, AuthRepository } from './repository.js';
import type { PrivacySecuritySettingsReader } from '../settings/privacy-security-policy.js';

const DUMMY_PASSWORD = 'synthetic-timing-equalization-value-not-a-credential';

export type AuthServiceErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'ACCOUNT_NOT_ACTIVE'
  | 'INVALID_REFRESH_TOKEN'
  | 'REFRESH_TOKEN_REUSED';

export class AuthServiceError extends Error {
  readonly code: AuthServiceErrorCode;

  constructor(code: AuthServiceErrorCode) {
    super(code);
    this.name = 'AuthServiceError';
    this.code = code;
  }
}

export interface IssuedAuthSession {
  data: AuthSessionData;
  refreshToken: string;
  refreshExpiresAt: Date;
}

export type IssuedAuthLogin = IssuedAuthSession | { data: AuthLoginData };

export interface AuthService {
  loginAdmin(input: AdminLoginRequest): Promise<IssuedAuthLogin>;
  issueAccount(account: AuthAccount, authenticationMethod?: 'password' | 'otp' | 'mfa'): Promise<IssuedAuthSession>;
  refresh(refreshToken: string): Promise<IssuedAuthSession>;
  logout(refreshToken: string): Promise<void>;
  setAccountPassword(userId: string, newPassword: string): Promise<void>;
  resetAdminPassword(email: string, newPassword: string): Promise<void>;
  /** Role-agnostic password recovery used by seeker/provider/admin OTP grants. */
  resetAccountPassword?(email: string, roleType: AuthRoleType, newPassword: string): Promise<void>;
  changeAccountPassword(userId: string, input: PasswordChangeRequest): Promise<void>;
}

export interface AuthServiceDependencies {
  repository: AuthRepository;
  passwordHasher: PasswordHasher;
  accessTokens: AccessTokenService;
  refreshTokens: OpaqueTokenService;
  accessTokenTtlSeconds: number;
  refreshTokenTtlSeconds: number;
  privacySecurity?: PrivacySecuritySettingsReader;
  now?: () => Date;
}

function responseData(
  account: AuthAccount,
  sessionId: string,
  accessTokens: AccessTokenService,
  accessTokenTtlSeconds: number,
  now: Date,
  authenticationMethod: 'password' | 'otp' | 'mfa',
  authenticationEmail?: string
): AuthSessionData {
  return {
    accessToken: accessTokens.issue({
      ...account,
      authenticationMethod,
      ...(authenticationEmail ? { authenticationEmail } : {})
    }, sessionId, now),
    tokenType: 'Bearer',
    expiresInSeconds: accessTokenTtlSeconds,
    user: account
  };
}

export function createAuthService(dependencies: AuthServiceDependencies): AuthService {
  const now = dependencies.now ?? (() => new Date());
  let dummyHash: Promise<string> | undefined;

  async function passwordMatches(
    passwordHash: string | undefined,
    password: string
  ): Promise<boolean> {
    dummyHash ??= dependencies.passwordHasher.hash(DUMMY_PASSWORD);
    const valid = await dependencies.passwordHasher.verify(
      passwordHash ?? await dummyHash,
      password
    );
    return Boolean(passwordHash && valid);
  }

  async function issue(account: AuthAccount, authenticationMethod: 'password' | 'otp' | 'mfa' = 'password', authenticationEmail?: string): Promise<IssuedAuthSession> {
    const issuedAt = now();
    const refreshToken = dependencies.refreshTokens.create();
    const refreshExpiresAt = new Date(
      issuedAt.getTime() + dependencies.refreshTokenTtlSeconds * 1000
    );
    const { sessionId } = await dependencies.repository.createSession({
      userId: account.id,
      tokenHash: dependencies.refreshTokens.hash(refreshToken),
      expiresAt: refreshExpiresAt,
      authenticationMethod
    });
    return {
      data: responseData(
        account,
        sessionId,
        dependencies.accessTokens,
        dependencies.accessTokenTtlSeconds,
        issuedAt,
        authenticationMethod,
        authenticationEmail
      ),
      refreshToken,
      refreshExpiresAt
    };
  }

  return {
    async loginAdmin(input) {
      // Email is globally unique in the identity model, so the same endpoint
      // safely authenticates seekers, providers, and administrators. Keep the
      // legacy repository method as a fallback for test/older adapters.
      const record = dependencies.repository.findAccountLogin
        ? await dependencies.repository.findAccountLogin(input.email)
        : await dependencies.repository.findAdminLogin(input.email);
      if (!await passwordMatches(record?.passwordHash, input.password)) {
        throw new AuthServiceError('INVALID_CREDENTIALS');
      }
      if (!record || record.status === 'rejected' || record.status === 'suspended') {
        throw new AuthServiceError('ACCOUNT_NOT_ACTIVE');
      }
      // AdminLoginRecord carries the credential hash only for verification. Do
      // not let that repository-only field cross the authentication response
      // boundary into the session user projection.
      const authenticatedAccount = {
        id: record.id,
        roleType: record.roleType,
        status: record.status
      };
      const policy = dependencies.privacySecurity ? await dependencies.privacySecurity.read() : undefined;
      if (record.roleType === 'admin' && policy?.twoFactorAuthentication) {
        const data = responseData(
          { ...authenticatedAccount, status: 'unverified' },
          randomBytes(12).toString('hex'),
          dependencies.accessTokens,
          dependencies.accessTokenTtlSeconds,
          now(),
          'password',
          input.email
        );
        return { data: { ...data, user: authenticatedAccount, outcome: 'second_factor_required' } };
      }
      return issue(authenticatedAccount, 'password', input.email);
    },

    async issueAccount(account, authenticationMethod = 'otp') {
      if (account.status === 'rejected' || account.status === 'suspended') {
        throw new AuthServiceError('ACCOUNT_NOT_ACTIVE');
      }
      return issue(account, authenticationMethod);
    },

    async refresh(refreshToken) {
      if (!dependencies.refreshTokens.isValid(refreshToken)) {
        throw new AuthServiceError('INVALID_REFRESH_TOKEN');
      }
      const rotatedAt = now();
      const replacementToken = dependencies.refreshTokens.create();
      const replacementExpiresAt = new Date(
        rotatedAt.getTime() + dependencies.refreshTokenTtlSeconds * 1000
      );
      const result = await dependencies.repository.rotateSession({
        currentTokenHash: dependencies.refreshTokens.hash(refreshToken),
        replacementTokenHash: dependencies.refreshTokens.hash(replacementToken),
        replacementExpiresAt,
        now: rotatedAt
      });
      if (result.kind === 'invalid') throw new AuthServiceError('INVALID_REFRESH_TOKEN');
      if (result.kind === 'reuse_detected') throw new AuthServiceError('REFRESH_TOKEN_REUSED');
      if (result.kind === 'account_not_active') throw new AuthServiceError('ACCOUNT_NOT_ACTIVE');
      return {
        data: responseData(
          result.account,
          result.sessionId,
          dependencies.accessTokens,
          dependencies.accessTokenTtlSeconds,
          rotatedAt,
          result.authenticationMethod ?? 'password'
        ),
        refreshToken: replacementToken,
        refreshExpiresAt: replacementExpiresAt
      };
    },

    async logout(refreshToken) {
      if (!dependencies.refreshTokens.isValid(refreshToken)) {
        throw new AuthServiceError('INVALID_REFRESH_TOKEN');
      }
      const revoked = await dependencies.repository.revokeSession(
        dependencies.refreshTokens.hash(refreshToken),
        now()
      );
      if (!revoked) throw new AuthServiceError('INVALID_REFRESH_TOKEN');
    },

    async setAccountPassword(userId, newPassword) {
      const created = await dependencies.repository.createAccountPassword(
        userId,
        await dependencies.passwordHasher.hash(newPassword),
        now()
      );
      if (!created) throw new AuthServiceError('INVALID_CREDENTIALS');
    },

    async resetAdminPassword(email, newPassword) {
      const changed = dependencies.repository.updateAccountPassword
        ? await dependencies.repository.updateAccountPassword(
            email,
            'admin',
            await dependencies.passwordHasher.hash(newPassword),
            now()
          )
        : await dependencies.repository.updateAdminPassword(
            email,
            await dependencies.passwordHasher.hash(newPassword),
            now()
          );
      if (!changed) throw new AuthServiceError('INVALID_CREDENTIALS');
    },

    async resetAccountPassword(email, roleType, newPassword) {
      const changed = dependencies.repository.updateAccountPassword
        ? await dependencies.repository.updateAccountPassword(
            email,
            roleType,
            await dependencies.passwordHasher.hash(newPassword),
            now()
          )
        : roleType === 'admin'
          ? await dependencies.repository.updateAdminPassword(
              email,
              await dependencies.passwordHasher.hash(newPassword),
              now()
            )
          : false;
      if (!changed) throw new AuthServiceError('INVALID_CREDENTIALS');
    },

    async changeAccountPassword(userId, input) {
      const record = dependencies.repository.findAccountLoginById
        ? await dependencies.repository.findAccountLoginById(userId)
        : undefined;
      if (!await passwordMatches(record?.passwordHash, input.currentPassword) || !record) {
        throw new AuthServiceError('INVALID_CREDENTIALS');
      }
      const changed = dependencies.repository.updateAccountPasswordById
        ? await dependencies.repository.updateAccountPasswordById(
            userId,
            await dependencies.passwordHasher.hash(input.newPassword),
            now()
          )
        : false;
      if (!changed) throw new AuthServiceError('INVALID_CREDENTIALS');
    }
  };
}
