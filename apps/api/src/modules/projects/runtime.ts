import { Types, type Connection } from 'mongoose';
import type { AccessTokenService } from '../auth/crypto.js';
import type { AuditWriter } from '../audit/writer.js';
import type { RbacService } from '../rbac/service.js';
import { createProviderModels } from '../provider/models.js';
import { createProjectModels } from './models.js';
import { createMongooseProjectRepository } from './repository.js';
import { createProjectService } from './service.js';
import type { ProjectRouterDependencies } from './router.js';

export function createProjectRuntime(connection: Connection, accessTokens: AccessTokenService, audit: AuditWriter, rbac?: Pick<RbacService, 'authorize'>): ProjectRouterDependencies {
  const models = createProjectModels(connection);
  const providers = createProviderModels(connection);
  return {
    accessTokens,
    service: createProjectService({
      repository: createMongooseProjectRepository(connection, models, audit),
      providerPolicy: {
        async canManageProjects(providerId) {
          if (!Types.ObjectId.isValid(providerId)) return false;
          return await providers.ProviderApplication.exists({
            userId: new Types.ObjectId(providerId),
            providerType: 'developer_company',
            status: 'approved'
          }) !== null;
        }
      },
      ...(rbac ? { authorization: rbac } : {})
    })
  };
}
