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
import { createBannerManagement, readPublishedBannerRows } from './banner-management.js';
import type { UploadEnvironment } from '../uploads/environment.js';
import { createInMemoryStorageAdapter, createLocalFilesystemStorageAdapter, createUnavailableStorageAdapter, createClamAvMalwareScanner, createDeterministicMalwareScanner, createUnavailableMalwareScanner } from '../uploads/adapters.js';

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
      authorization,
      async pricingOptions() {
        const policy = await createMongooseAdvertisingSettingsReader(connection).read();
        const rows = await connection.collection('ad_placements').find(policy.supportedPlacements.length ? { key: { $in: policy.supportedPlacements } } : {}, { projection: { key: 1, label: 1, active: 1 } }).sort({ sortOrder: 1, key: 1 }).limit(98).toArray();
        const keys = [...new Set(['homepage.hero', 'homepage.featured', ...rows.map(row => String(row.key))])];
        return { placements: keys.map(key => {
          const row = rows.find(item => item.key === key);
          return { key, active: row?.active === true, label: row?.label ?? { ar: key, en: key } };
        }), adTypes: policy.supportedAdTypes.length ? policy.supportedAdTypes : ['banner', 'featured_card'] };
      }
    }),
    calendar: createAdCalendarService({
      repository: createMongooseAdCalendarRepository(connection, undefined, audit),
      authorization
    })
  };
}

export function createAdminBannersRuntime(
  connection: Connection,
  accessTokens: AccessTokenService,
  authorization: Pick<RbacService, 'authorize'>,
  audit: AuditWriter,
  environment: UploadEnvironment
): AdminBannerRouterDependencies {
  return {
    accessTokens,
    management: createBannerManagement({ connection, authorization, audit,
      storage: environment.mode === 'memory' ? createInMemoryStorageAdapter() : environment.mode === 'local-filesystem' ? createLocalFilesystemStorageAdapter(environment.localRoot!) : createUnavailableStorageAdapter(),
      scanner: environment.scannerMode === 'clamav' && environment.clamav ? createClamAvMalwareScanner(environment.clamav) : environment.scannerMode === 'deterministic-fake' ? createDeterministicMalwareScanner('clean') : createUnavailableMalwareScanner(),
      policy: createMongooseAdvertisingSettingsReader(connection) }),
    service: createAdSettingsService({
      bannerRepository: createMongooseAdBannerRepository(connection, audit),
      publishedBannerIds: async () => new Set((await readPublishedBannerRows(connection)).map(row => String(row._id))),
      bannerAuthorization: authorization,
      runtimeSettings: createMongooseAdvertisingSettingsReader(connection)
    })
  };
}
