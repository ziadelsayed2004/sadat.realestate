import type { Connection } from 'mongoose';
import type { AccessTokenService } from '../auth/crypto.js';
import type { AuditWriter } from '../audit/writer.js';
import type { RbacService } from '../rbac/service.js';
import { createLocationModels } from './models.js';
import { createMongooseLocationRepository } from './repository.js';
import type { LocationRouterDependencies } from './router.js';
import { createLocationService } from './service.js';

export function createLocationRuntime(
  connection: Connection,
  accessTokens: AccessTokenService,
  auditWriter: AuditWriter,
  authorization: RbacService
): LocationRouterDependencies {
  const models = createLocationModels(connection);
  return {
    accessTokens,
    service: createLocationService({
      repository: createMongooseLocationRepository(connection, models, auditWriter),
      authorization
    })
  };
}
