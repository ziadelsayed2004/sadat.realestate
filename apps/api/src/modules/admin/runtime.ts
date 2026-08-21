import type { Connection } from 'mongoose';
import { createArgon2PasswordHasher } from '../auth/crypto.js';
import type { AccessTokenService } from '../auth/crypto.js';
import type { AuditWriter } from '../audit/writer.js';
import { createAuthModels } from '../auth/models.js';
import { createIdentityModels } from '../identity/models.js';
import { createAdminModels } from './models.js';
import { createMongooseAdminOverviewSource } from './overview-repository.js';
import type { AdminOverviewAuthorization } from './overview-service.js';
import type { AdminOverviewRouterDependencies } from './overview-router.js';
import { createAdminOverviewService } from './overview-service.js';
import { createMongooseAdminRepository } from './repository.js';
import { createMongooseAdministratorRepository } from './administrator-repository.js';
import type { AdministratorRouterDependencies } from './administrator-router.js';
import { createAdministratorService } from './administrator-service.js';
import type { RbacService } from '../rbac/service.js';
import { createAdminBootstrapService, type AdminBootstrapService } from './service.js';

export function createAdminBootstrapRuntime(connection: Connection): AdminBootstrapService {
  const identityModels = createIdentityModels(connection);
  const authModels = createAuthModels(connection);
  const adminModels = createAdminModels(connection);
  return createAdminBootstrapService({
    repository: createMongooseAdminRepository(connection, identityModels, authModels, adminModels),
    passwordHasher: createArgon2PasswordHasher()
  });
}

export function createAdminOverviewRuntime(
  connection: Connection,
  accessTokens: AccessTokenService,
  authorization: AdminOverviewAuthorization
): AdminOverviewRouterDependencies {
  return {
    accessTokens,
    service: createAdminOverviewService({
      authorization,
      source: createMongooseAdminOverviewSource(connection)
    })
  };
}

export function createAdministratorRuntime(
  connection: Connection,
  accessTokens: AccessTokenService,
  authorization: Pick<RbacService, 'authorize'>,
  auditWriter: AuditWriter
): AdministratorRouterDependencies {
  const identityModels = createIdentityModels(connection);
  const adminModels = createAdminModels(connection);
  return {
    accessTokens,
    service: createAdministratorService({
      authorization,
      repository: createMongooseAdministratorRepository({
        connection,
        identityModels,
        adminModels,
        auditWriter
      })
    })
  };
}
