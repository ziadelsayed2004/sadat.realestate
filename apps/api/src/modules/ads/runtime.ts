import type { Connection } from 'mongoose';
import type { AccessTokenService } from '../auth/crypto.js';
import type { RbacService } from '../rbac/service.js';
import type { AuditWriter } from '../audit/writer.js';
import { createMongooseAdAdminRequestRepository, createMongooseAdCalendarRepository } from './repository.js';
import { createMongooseAdBannerRepository } from './banner-repository.js';
import { createAdSettingsService } from './service.js';
import { createAdAdminRequestService, createAdCalendarService } from './service.js';
import type { AdminAdsRouterDependencies } from './admin-router.js';
import type { AdminBannerRouterDependencies } from './banner-router.js';
import { createMongooseAdvertisingSettingsReader } from '../settings/advertising-policy.js';

export function createAdminAdsRuntime(
  connection: Connection,
  accessTokens: AccessTokenService,
  authorization: Pick<RbacService, 'authorize'>,
  audit: AuditWriter
): AdminAdsRouterDependencies {
  return {
    accessTokens,
    service: createAdAdminRequestService({
      repository: createMongooseAdAdminRequestRepository(connection, undefined, audit),
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
  authorization: Pick<RbacService, 'authorize'>,
  audit: AuditWriter
): AdminBannerRouterDependencies {
  return {
    accessTokens,
    service: createAdSettingsService({
      bannerRepository: createMongooseAdBannerRepository(connection, audit),
      bannerAuthorization: authorization,
      runtimeSettings: createMongooseAdvertisingSettingsReader(connection)
    })
  };
}
