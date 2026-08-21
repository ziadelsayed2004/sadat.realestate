import type { Connection } from 'mongoose';
import type { AccessTokenService } from '../auth/crypto.js';
import type { RbacService } from '../rbac/service.js';
import { createMongooseAdAdminRequestRepository, createMongooseAdCalendarRepository } from './repository.js';
import { createMongooseAdBannerRepository } from './banner-repository.js';
import { createAdSettingsService } from './service.js';
import { createAdAdminRequestService, createAdCalendarService } from './service.js';
import type { AdminAdsRouterDependencies } from './admin-router.js';
import type { AdminBannerRouterDependencies } from './banner-router.js';

export function createAdminAdsRuntime(
  connection: Connection,
  accessTokens: AccessTokenService,
  authorization: Pick<RbacService, 'authorize'>
): AdminAdsRouterDependencies {
  return {
    accessTokens,
    service: createAdAdminRequestService({
      repository: createMongooseAdAdminRequestRepository(connection),
      authorization
    }),
    calendar: createAdCalendarService({
      repository: createMongooseAdCalendarRepository(connection),
      authorization
    })
  };
}

export function createAdminBannersRuntime(
  connection: Connection,
  accessTokens: AccessTokenService,
  authorization: Pick<RbacService, 'authorize'>
): AdminBannerRouterDependencies {
  return {
    accessTokens,
    service: createAdSettingsService({
      bannerRepository: createMongooseAdBannerRepository(connection),
      bannerAuthorization: authorization
    })
  };
}
