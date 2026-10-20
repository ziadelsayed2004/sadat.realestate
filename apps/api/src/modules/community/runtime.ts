import { createCommunityCategories } from './categories.js';
import type { Connection } from 'mongoose';
import type { AccessTokenService } from '../auth/crypto.js';
import type { AuditWriter } from '../audit/writer.js';
import { createCommunityModels } from './models.js';
import { createMongooseCommunityReportService } from './report-service.js';
import { createMongooseCommunityRepository } from './repository.js';
import type { CommunityRouterDependencies } from './router.js';
import { createCommunityService, type CommunityAuthorization } from './service.js';
import { createMongooseCommunitySettingsReader } from '../settings/community-policy.js';
import { createCommunityAccountCheck } from './account-state.js';

export function createCommunityRuntime(connection: Connection, accessTokens: AccessTokenService, authorization?: CommunityAuthorization, audit?: AuditWriter): CommunityRouterDependencies {
  const models = createCommunityModels(connection);
  const categories = createCommunityCategories(connection, authorization, audit);
  return {
    accessTokens,
    categories,
    service: createCommunityService([], createMongooseCommunityRepository(models, audit), authorization, createMongooseCommunitySettingsReader(connection), createCommunityAccountCheck(connection), categories),
    reports: createMongooseCommunityReportService(connection, authorization, audit)
  };
}
