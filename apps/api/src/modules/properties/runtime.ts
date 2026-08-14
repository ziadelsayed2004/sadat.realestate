import type { Connection } from 'mongoose';
import type { AccessTokenService } from '../auth/crypto.js';
import type { AuditWriter } from '../audit/writer.js';
import type { RbacService } from '../rbac/service.js';
import { createPropertyModels } from './models.js';
import { createMongoosePropertyRepository } from './repository.js';
import { createPropertyService } from './service.js';
import type { PropertyRouterDependencies } from './router.js';

export function createPropertyRuntime(connection: Connection, accessTokens: AccessTokenService, audit: AuditWriter, rbac?: Pick<RbacService, 'authorize'>): PropertyRouterDependencies {
  const models = createPropertyModels(connection);
  return { accessTokens, service: createPropertyService({ repository: createMongoosePropertyRepository(connection, models, audit), ...(rbac ? { authorization: rbac } : {}) }) };
}
