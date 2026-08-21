import type { Connection } from 'mongoose';
import type { AccessTokenService } from '../auth/crypto.js';
import { createOpaqueTokenService } from '../auth/crypto.js';
import type { AuthCookiePolicy } from '../auth/environment.js';
import { createAuthModels } from '../auth/models.js';
import { createMongooseOtpRepository } from '../auth/repository.js';
import type { AuthService } from '../auth/service.js';
import { createIdentityModels } from '../identity/models.js';
import { createProviderModels } from './models.js';
import { createProviderAdvertisingProjectionService } from './advertising.js';
import { createMongooseProviderAdvertisingSource } from './advertising-repository.js';
import { createProviderCommissionProjectionService } from './commission.js';
import { createMongooseProviderCommissionSource } from './commission-repository.js';
import { createProviderAdvertisingModels } from './advertising-models.js';
import { createAdSettingsService } from '../ads/service.js';
import { createMongooseAdQuoteRepository, createMongooseAdRequestRepository } from '../ads/repository.js';
import type { RbacService } from '../rbac/service.js';
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
  cookie: AuthCookiePolicy,
  authorization?: Pick<RbacService, 'authorize'>
): ProviderRouterDependencies {
  const identityModels = createIdentityModels(connection);
  const authModels = createAuthModels(connection);
  const otpRepository = createMongooseOtpRepository(identityModels, authModels);
  const advertisingModels = createProviderAdvertisingModels(connection);
  const advertisingWorkflow = createAdSettingsService({
    requestRepository: createMongooseAdRequestRepository(connection, advertisingModels),
    quoteRepository: createMongooseAdQuoteRepository(connection, advertisingModels),
    ...(authorization ? { authorization } : {}),
    hasActivePlacement: async (placementKey) => Boolean(
      await connection.collection('ad_placements').findOne(
        { key: placementKey, active: true },
        { projection: { _id: 1 } }
      )
    )
  });
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
    advertisingProjection: createProviderAdvertisingProjectionService({
      source: createMongooseProviderAdvertisingSource(
        connection,
        advertisingModels
      )
    }),
    commissionProjection: createProviderCommissionProjectionService({
      source: createMongooseProviderCommissionSource(connection)
    }),
    advertisingWorkflow,
    accessTokens,
    cookie
  };
}
