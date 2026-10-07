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
import { createBannerManagement } from './banner-management.js';
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
        const rows = await connection.collection('ad_placements').find({ active: true, ...(policy.supportedPlacements.length ? { key: { $in: policy.supportedPlacements } } : {}) }, { projection: { key: 1, label: 1 } }).sort({ sortOrder: 1, key: 1 }).limit(100).toArray();
        return { placements: rows.map(row => ({ key: String(row.key), label: row.label ?? { ar: String(row.key), en: String(row.key) } })), adTypes: policy.supportedAdTypes };
      }
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
      bannerAuthorization: authorization,
      runtimeSettings: createMongooseAdvertisingSettingsReader(connection)
    })
  };
}
