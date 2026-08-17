import type { Connection } from 'mongoose';
import type { AccessTokenService } from '../auth/crypto.js';
import type { AuditWriter } from '../audit/writer.js';
import type { RbacService } from '../rbac/service.js';
import { createArticleModels } from './models.js';
import { createMongooseArticleRepository } from './repository.js';
import type { ArticleRouterDependencies } from './router.js';
import { createArticleService } from './service.js';

export function createArticleRuntime(
  connection: Connection,
  accessTokens: AccessTokenService,
  audit: AuditWriter,
  authorization: Pick<RbacService, 'authorize'>
): ArticleRouterDependencies {
  const models = createArticleModels(connection);
  return {
    accessTokens,
    service: createArticleService({
      repository: createMongooseArticleRepository(models),
      authorization,
      audit
    })
  };
}
