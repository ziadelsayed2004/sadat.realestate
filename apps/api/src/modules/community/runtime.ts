import type { Connection } from 'mongoose';
import type { AccessTokenService } from '../auth/crypto.js';
import type { AuditWriter } from '../audit/writer.js';
import { createCommunityModels } from './models.js';
import { createMongooseCommunityReportService } from './report-service.js';
import { createMongooseCommunityRepository } from './repository.js';
import type { CommunityRouterDependencies } from './router.js';
import { createCommunityService, type CommunityAuthorization } from './service.js';

export function createCommunityRuntime(connection: Connection, accessTokens: AccessTokenService, authorization?: CommunityAuthorization, audit?: AuditWriter): CommunityRouterDependencies {
  const models = createCommunityModels(connection);
  return {
    accessTokens,
    service: createCommunityService([], createMongooseCommunityRepository(models), authorization),
    reports: createMongooseCommunityReportService(connection, authorization, audit)
  };
}
