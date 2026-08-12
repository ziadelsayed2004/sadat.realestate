import type { Connection } from 'mongoose';
import { createIdentityModels } from '../identity/models.js';
import {
  createArgon2PasswordHasher,
  createHmacAccessTokenService,
  createHmacOtpCodeHasher,
  createOpaqueTokenService
} from './crypto.js';
import type { AuthEnvironment } from './environment.js';
import { createAuthModels } from './models.js';
import {
  createMongooseAuthRepository,
  createMongooseOtpRepository
} from './repository.js';
import { createAuthRouter, type AuthRouterDependencies } from './router.js';
import { createAuthService } from './service.js';
import {
  createDeterministicFakeOtpProvider,
  createDeterministicOtpCodeGenerator,
  createSecureOtpCodeGenerator,
  createUnconfiguredOtpProvider,
  type OtpCodeGenerator,
  type OtpProvider
} from './otp-provider.js';
import { createOtpService } from './otp-service.js';

export interface AuthRuntimeOptions {
  otpProvider?: OtpProvider;
  otpCodeGenerator?: OtpCodeGenerator;
}

export function createAuthRuntime(
  connection: Connection,
  environment: AuthEnvironment,
  options: AuthRuntimeOptions = {}
): AuthRouterDependencies {
  const identityModels = createIdentityModels(connection);
  const authModels = createAuthModels(connection);
  const repository = createMongooseAuthRepository(identityModels, authModels);
  const accessTokens = createHmacAccessTokenService(
    environment.accessTokenSecret,
    environment.accessTokenTtlSeconds
  );
  const service = createAuthService({
    repository,
    passwordHasher: createArgon2PasswordHasher(),
    accessTokens,
    refreshTokens: createOpaqueTokenService(),
    accessTokenTtlSeconds: environment.accessTokenTtlSeconds,
    refreshTokenTtlSeconds: environment.refreshTokenTtlSeconds
  });
  const deterministic = environment.otpProviderMode === 'deterministic-fake';
  const otpService = createOtpService({
    repository: createMongooseOtpRepository(identityModels, authModels),
    provider: options.otpProvider
      ?? (deterministic ? createDeterministicFakeOtpProvider() : createUnconfiguredOtpProvider()),
    codeGenerator: options.otpCodeGenerator
      ?? (deterministic ? createDeterministicOtpCodeGenerator() : createSecureOtpCodeGenerator()),
    codeHasher: createHmacOtpCodeHasher(environment.accessTokenSecret),
    verificationTokens: createOpaqueTokenService(),
    authService: service
  });
  return { service, otpService, cookie: environment.cookie, accessTokens };
}

export { createAuthRouter };
