import { Types, type Connection } from 'mongoose';
import type { AccessTokenService } from '../auth/crypto.js';
import type { AuditWriter } from '../audit/writer.js';
import type { RbacService } from '../rbac/service.js';
import { createArticleModels } from './models.js';
import { createMongooseArticleRepository } from './repository.js';
import type { ArticleRouterDependencies } from './router.js';
import { createArticleService } from './service.js';
import { createTeamPhotos } from '../cms/team-photos.js';
import type { UploadEnvironment } from '../uploads/environment.js';
import { createInMemoryStorageAdapter, createLocalFilesystemStorageAdapter, createUnavailableStorageAdapter, createClamAvMalwareScanner, createDeterministicMalwareScanner, createUnavailableMalwareScanner } from '../uploads/adapters.js';

export function createArticleRuntime(
  connection: Connection,
  accessTokens: AccessTokenService,
  audit: AuditWriter,
  authorization: Pick<RbacService, 'authorize' | 'authorizationFor'>,
  environment?: UploadEnvironment
): ArticleRouterDependencies {
  connection.base.set('transactionAsyncLocalStorage', true);
  const models = createArticleModels(connection);
  const photos = createTeamPhotos({ connection, authorization, audit, kind: 'article',
    storage: environment?.mode === 'memory' ? createInMemoryStorageAdapter() : environment?.mode === 'local-filesystem' ? createLocalFilesystemStorageAdapter(environment.localRoot!) : createUnavailableStorageAdapter(),
    scanner: environment?.scannerMode === 'clamav' && environment.clamav ? createClamAvMalwareScanner(environment.clamav) : environment?.scannerMode === 'deterministic-fake' ? createDeterministicMalwareScanner('clean') : createUnavailableMalwareScanner() });
  return {
    accessTokens,
    photos,
    service: createArticleService({
      repository: createMongooseArticleRepository(models),
      authorization,
      audit,
      validateImage: photos.validateAttach,
      transaction: operation => connection.transaction(operation),
      async resolveAuthorName(authorId) {
        if (!Types.ObjectId.isValid(authorId)) return undefined;
        const account = await connection.collection<{ displayName?: string }>('admin_accounts').findOne(
          { userId: new Types.ObjectId(authorId) },
          { projection: { _id: 0, displayName: 1 } }
        );
        return account?.displayName?.trim() || undefined;
      }
    })
  };
}
