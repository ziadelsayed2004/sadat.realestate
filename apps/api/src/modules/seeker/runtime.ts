import type { Connection } from 'mongoose';
import type { AccessTokenService } from '../auth/crypto.js';
import type { AuthCookiePolicy } from '../auth/environment.js';
import { createAuthModels } from '../auth/models.js';
import { createMongooseOtpRepository } from '../auth/repository.js';
import type { AuthService } from '../auth/service.js';
import { createIdentityModels } from '../identity/models.js';
import { createSeekerRouter, type SeekerRouterDependencies } from './router.js';
import { createMongooseSeekerRepository } from './repository.js';
import { createSeekerService } from './service.js';
import { createOpaqueTokenService } from '../auth/crypto.js';
import { createMongooseSeekerOverviewRepository, createSeekerOverviewService } from './overview.js';

export function createSeekerRuntime(
  connection: Connection,
  authService: Pick<AuthService, 'issueAccount' | 'setAccountPassword'>,
  accessTokens: AccessTokenService,
  cookie: AuthCookiePolicy
): SeekerRouterDependencies {
  const identityModels = createIdentityModels(connection);
  const authModels = createAuthModels(connection);
  const otpRepository = createMongooseOtpRepository(identityModels, authModels);
  return {
    service: createSeekerService({
      repository: createMongooseSeekerRepository(identityModels),
      registrationTokens: createOpaqueTokenService(),
      async redeemRegistrationGrant(verificationTokenHash, roleType, now) {
        const grant = await otpRepository.redeemRegistrationGrant(
          verificationTokenHash,
          roleType,
          now
        );
        return grant?.roleType === 'seeker' ? {
          email: grant.email,
          roleType: 'seeker' as const,
          purpose: 'registration' as const
        } : undefined;
      },
      authService
    }),
    accessTokens,
    cookie,
    overview: createSeekerOverviewService({ repository: createMongooseSeekerOverviewRepository(connection) })
  };
}

export { createSeekerRouter };
