import { randomUUID } from 'node:crypto';
import type {
  OtpSendData,
  OtpSendRequest,
  OtpAuthenticatedData,
  OtpVerifiedData,
  OtpVerifyRequest
} from '@sadat-real-estate/contracts';
import type { OpaqueTokenService, OtpCodeHasher } from './crypto.js';
import type { OtpCodeGenerator, OtpProvider } from './otp-provider.js';
import type { OtpRepository } from './repository.js';
import type { AuthService, IssuedAuthSession } from './service.js';

const OTP_TTL_SECONDS = 5 * 60;
const OTP_RESEND_AFTER_SECONDS = 60;
const OTP_MAX_ATTEMPTS = 5;
const VERIFICATION_GRANT_TTL_SECONDS = 10 * 60;

export type OtpServiceErrorCode =
  | 'INVALID_OTP'
  | 'OTP_ATTEMPTS_EXCEEDED'
  | 'OTP_SEND_RATE_LIMITED'
  | 'OTP_PROVIDER_UNAVAILABLE'
  | 'ACCOUNT_NOT_ACTIVE';

export class OtpServiceError extends Error {
  readonly code: OtpServiceErrorCode;

  constructor(code: OtpServiceErrorCode) {
    super(code);
    this.name = 'OtpServiceError';
    this.code = code;
  }
}

export type OtpVerificationResult =
  | { data: OtpVerifiedData }
  | {
      data: OtpAuthenticatedData;
      refreshToken: string;
      refreshExpiresAt: Date;
    };

export interface OtpService {
  isReady(): boolean | Promise<boolean>;
  send(input: OtpSendRequest): Promise<OtpSendData>;
  verify(input: OtpVerifyRequest): Promise<OtpVerificationResult>;
}

export interface OtpServiceDependencies {
  repository: OtpRepository;
  provider: OtpProvider;
  codeGenerator: OtpCodeGenerator;
  codeHasher: OtpCodeHasher;
  verificationTokens: OpaqueTokenService;
  authService: Pick<AuthService, 'issueAccount'>;
  now?: () => Date;
  createChallengeId?: () => string;
  otpTtlSeconds?: number;
  resendAfterSeconds?: number;
  maxAttempts?: number;
  verificationGrantTtlSeconds?: number;
}

function asAuthenticated(session: IssuedAuthSession): OtpVerificationResult {
  return {
    data: { outcome: 'authenticated', ...session.data },
    refreshToken: session.refreshToken,
    refreshExpiresAt: session.refreshExpiresAt
  };
}

export function createOtpService(dependencies: OtpServiceDependencies): OtpService {
  const now = dependencies.now ?? (() => new Date());
  const createChallengeId = dependencies.createChallengeId ?? randomUUID;
  const otpTtlSeconds = dependencies.otpTtlSeconds ?? OTP_TTL_SECONDS;
  const resendAfterSeconds = dependencies.resendAfterSeconds ?? OTP_RESEND_AFTER_SECONDS;
  const maxAttempts = dependencies.maxAttempts ?? OTP_MAX_ATTEMPTS;
  const verificationGrantTtlSeconds = dependencies.verificationGrantTtlSeconds
    ?? VERIFICATION_GRANT_TTL_SECONDS;

  if (
    !Number.isSafeInteger(otpTtlSeconds) || otpTtlSeconds < 1
    || !Number.isSafeInteger(resendAfterSeconds) || resendAfterSeconds < 1
    || !Number.isSafeInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 10
    || !Number.isSafeInteger(verificationGrantTtlSeconds) || verificationGrantTtlSeconds < 1
  ) throw new Error('OTP service configuration is invalid');

  return Object.freeze({
    isReady: () => dependencies.provider.isReady(),
    async send(input: OtpSendRequest) {
      if (!await dependencies.provider.isReady()) {
        throw new OtpServiceError('OTP_PROVIDER_UNAVAILABLE');
      }
      const issuedAt = now();
      const expiresAt = new Date(issuedAt.getTime() + otpTtlSeconds * 1000);
      const challengeId = createChallengeId();
      const code = dependencies.codeGenerator.create();
      const context = {
        phone: input.phone,
        email: input.email,
        roleType: input.roleType,
        purpose: input.purpose
      };
      const created = await dependencies.repository.createChallenge({
        ...context,
        publicId: challengeId,
        codeHash: dependencies.codeHasher.hash(context, code),
        attempts: maxAttempts,
        now: issuedAt,
        expiresAt,
        resendAfterSeconds
      });
      if (created.kind === 'cooldown') throw new OtpServiceError('OTP_SEND_RATE_LIMITED');

      try {
        await dependencies.provider.send({
          phone: input.phone,
          email: input.email,
          roleType: input.roleType,
          purpose: input.purpose,
          code,
          expiresAt
        });
      } catch {
        await dependencies.repository.cancelChallenge(challengeId, now());
        throw new OtpServiceError('OTP_PROVIDER_UNAVAILABLE');
      }
      return {
        accepted: true as const,
        challengeId,
        expiresInSeconds: otpTtlSeconds,
        retryAfterSeconds: resendAfterSeconds
      };
    },

    async verify(input: OtpVerifyRequest): Promise<OtpVerificationResult> {
      const verifiedAt = now();
      const context = {
        phone: input.phone,
        email: input.email,
        roleType: input.roleType,
        purpose: input.purpose
      };
      const challenge = await dependencies.repository.findChallenge(
        input.challengeId,
        context,
        verifiedAt
      );
      if (!challenge) throw new OtpServiceError('INVALID_OTP');

      if (!dependencies.codeHasher.matches(context, input.code, challenge.codeHash)) {
        const failed = await dependencies.repository.recordFailedAttempt(challenge.id, verifiedAt);
        if (failed.kind === 'exhausted') throw new OtpServiceError('OTP_ATTEMPTS_EXCEEDED');
        throw new OtpServiceError('INVALID_OTP');
      }

      if (input.purpose === 'registration') {
        const verificationToken = dependencies.verificationTokens.create();
        const grantExpiresAt = new Date(
          verifiedAt.getTime() + verificationGrantTtlSeconds * 1000
        );
        const consumed = await dependencies.repository.verifyRegistrationChallenge(
          challenge.id,
          dependencies.verificationTokens.hash(verificationToken),
          verifiedAt,
          grantExpiresAt
        );
        if (!consumed) throw new OtpServiceError('INVALID_OTP');
        return {
          data: {
            outcome: 'verified',
            verificationToken,
            expiresInSeconds: verificationGrantTtlSeconds,
            roleType: input.roleType
          }
        };
      }

      const account = await dependencies.repository.findOtpAccount(
        input.phone,
        input.email,
        input.roleType
      );
      const consumed = await dependencies.repository.consumeLoginChallenge(challenge.id, verifiedAt);
      if (!consumed || !account) throw new OtpServiceError('INVALID_OTP');
      if (account.status === 'rejected' || account.status === 'suspended') {
        throw new OtpServiceError('ACCOUNT_NOT_ACTIVE');
      }
      return asAuthenticated(await dependencies.authService.issueAccount(account));
    }
  });
}
