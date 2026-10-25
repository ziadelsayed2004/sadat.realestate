import { createFeaturedPropertyManager } from './featured.js';
import type { Connection } from 'mongoose';
import type { AccessTokenService } from '../auth/crypto.js';
import type { AuditWriter } from '../audit/writer.js';
import type { RbacService } from '../rbac/service.js';
import { createPropertyModels } from './models.js';
import { createMongoosePropertyRepository } from './repository.js';
import { createPropertyService } from './service.js';
import type { PropertyRouterDependencies } from './router.js';
import { createMongoosePropertySettingsReader } from '../settings/property-policy.js';
import { createProviderPropertySourceResolver } from './provider-source.js';
import { createPropertyReviewContextReader } from './review-context.js';

export function createPropertyRuntime(connection: Connection, accessTokens: AccessTokenService, audit: AuditWriter, rbac?: Pick<RbacService, 'authorize'>): PropertyRouterDependencies {
  const models = createPropertyModels(connection);
  return { accessTokens, featured: createFeaturedPropertyManager(connection, rbac, audit), service: createPropertyService({ repository: createMongoosePropertyRepository(connection, models, audit), resolveSource: createProviderPropertySourceResolver(connection), reviewContext: createPropertyReviewContextReader(connection), settings: createMongoosePropertySettingsReader(connection), ...(rbac ? { authorization: rbac } : {}) }) };
}
