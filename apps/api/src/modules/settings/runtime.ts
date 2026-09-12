import type { Connection } from 'mongoose';
import type { AccessTokenService } from '../auth/crypto.js';
import type { AuditWriter } from '../audit/writer.js';
import type { RbacService } from '../rbac/service.js';
import type { SettingsRouterDependencies } from './router.js';
import { createMongooseProviderSettingsRepository } from './provider-repository.js';
import { createProviderSettingsService } from './provider-service.js';
import { createMongooseSettingsRepository } from './repository.js';
import { createSettingsService } from './service.js';

export function createSettingsRuntime(
  connection: Connection,
  accessTokens: AccessTokenService,
  audit: AuditWriter,
  authorization: Pick<RbacService, 'authorize'>
): SettingsRouterDependencies {
  connection.base.set('transactionAsyncLocalStorage', true);
  return {
    accessTokens,
    service: createSettingsService({
      repository: createMongooseSettingsRepository(connection, audit),
      authorization,
      audit
    }),
    provider: createProviderSettingsService({
      repository: createMongooseProviderSettingsRepository(connection),
      audit,
      transaction: async operation => {
        const session = await connection.startSession();
        try { return await session.withTransaction(() => operation(session)); }
        finally { await session.endSession(); }
      }
    })
  };
}
