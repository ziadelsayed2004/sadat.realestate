import type { AdminLoginRequest, AuthRoleType, AuthSessionData, PasswordChangeRequest } from '@sadat-real-estate/contracts';
import type {
  AccessTokenService,
  OpaqueTokenService,
  PasswordHasher
} from './crypto.js';
import type { AuthAccount, AuthRepository } from './repository.js';

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

export interface AuthService {
  loginAdmin(input: AdminLoginRequest): Promise<IssuedAuthSession>;
  issueAccount(account: AuthAccount): Promise<IssuedAuthSession>;
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
  now?: () => Date;
}

function responseData(
  account: AuthAccount,
  sessionId: string,
  accessTokens: AccessTokenService,
  accessTokenTtlSeconds: number,
  now: Date
): AuthSessionData {
  return {
    accessToken: accessTokens.issue(account, sessionId, now),
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

  async function issue(account: AuthAccount): Promise<IssuedAuthSession> {
    const issuedAt = now();
    const refreshToken = dependencies.refreshTokens.create();
    const refreshExpiresAt = new Date(
      issuedAt.getTime() + dependencies.refreshTokenTtlSeconds * 1000
    );
    const { sessionId } = await dependencies.repository.createSession({
      userId: account.id,
      tokenHash: dependencies.refreshTokens.hash(refreshToken),
      expiresAt: refreshExpiresAt
    });
    return {
      data: responseData(
        account,
        sessionId,
        dependencies.accessTokens,
        dependencies.accessTokenTtlSeconds,
        issuedAt
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
      return issue({
        id: record.id,
        roleType: record.roleType,
        status: record.status
      });
    },

    async issueAccount(account) {
      if (account.status === 'rejected' || account.status === 'suspended') {
        throw new AuthServiceError('ACCOUNT_NOT_ACTIVE');
      }
      return issue(account);
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
          rotatedAt
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
