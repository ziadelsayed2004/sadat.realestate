import type { Connection } from 'mongoose';
import type { AccessTokenService } from '../auth/crypto.js';
import { createOpaqueTokenService } from '../auth/crypto.js';
import type { AuthCookiePolicy } from '../auth/environment.js';
import { createAuthModels } from '../auth/models.js';
import { createMongooseOtpRepository } from '../auth/repository.js';
import type { AuthService } from '../auth/service.js';
import { createIdentityModels } from '../identity/models.js';
import { createProviderModels } from './models.js';
import {
  createMongooseProviderDocumentInventory,
  createMongooseProviderRepository
} from './repository.js';
import type { ProviderRouterDependencies } from './router.js';
import { createProviderService } from './service.js';

export function createProviderRuntime(
  connection: Connection,
  authService: Pick<AuthService, 'issueAccount'>,
  accessTokens: AccessTokenService,
  cookie: AuthCookiePolicy
): ProviderRouterDependencies {
  const identityModels = createIdentityModels(connection);
  const authModels = createAuthModels(connection);
  const otpRepository = createMongooseOtpRepository(identityModels, authModels);
  return {
    service: createProviderService({
      repository: createMongooseProviderRepository(
        connection,
        identityModels,
        createProviderModels(connection)
      ),
      documentInventory: createMongooseProviderDocumentInventory(connection),
      registrationTokens: createOpaqueTokenService(),
      async redeemRegistrationGrant(verificationTokenHash, roleType, now) {
        const grant = await otpRepository.redeemRegistrationGrant(
          verificationTokenHash,
          roleType,
          now
        );
        return grant?.roleType === 'provider'
          ? { phone: grant.phone, roleType: 'provider', purpose: 'registration' }
          : undefined;
      },
      authService
    }),
    accessTokens,
    cookie
  };
}
