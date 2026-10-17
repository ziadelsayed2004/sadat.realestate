import { createRoleDeleter } from './deletion.js';
import type { Connection } from 'mongoose';
import type { AccessTokenService } from '../auth/crypto.js';
import type { AuditWriter } from '../audit/writer.js';
import { createAdminModels } from '../admin/models.js';
import { createIdentityModels } from '../identity/models.js';
import { createRbacModels } from './models.js';
import { createMongooseRbacRepository } from './repository.js';
import type { RbacRouterDependencies } from './router.js';
import { createRbacService } from './service.js';

export function createRbacRuntime(
  connection: Connection,
  accessTokens: AccessTokenService,
  auditWriter: AuditWriter
): RbacRouterDependencies {
  const identityModels = createIdentityModels(connection);
  const adminModels = createAdminModels(connection);
  const rbacModels = createRbacModels(connection);
  const service = createRbacService({
      repository: createMongooseRbacRepository(
        connection,
        identityModels,
        adminModels,
        rbacModels,
        auditWriter
      )
    });
  return { accessTokens, service, deleteRole: createRoleDeleter(connection, service, auditWriter) };
}
