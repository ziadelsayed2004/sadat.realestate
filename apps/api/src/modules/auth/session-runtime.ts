import type { Connection } from 'mongoose';
import type { AuditWriter } from '../audit/writer.js';
import { createIdentityModels } from '../identity/models.js';
import type { AccessTokenService } from './crypto.js';
import { createMongooseSessionManagementRepository } from './session-repository.js';
import type { SessionManagementRouterDependencies } from './session-router.js';
import { createSessionManagementService } from './session-service.js';

export function createSessionManagementRuntime(
  connection: Connection,
  accessTokens: AccessTokenService,
  audit: AuditWriter
): SessionManagementRouterDependencies {
  return {
    accessTokens,
    service: createSessionManagementService(
      createMongooseSessionManagementRepository(connection, createIdentityModels(connection), audit)
    )
  };
}
