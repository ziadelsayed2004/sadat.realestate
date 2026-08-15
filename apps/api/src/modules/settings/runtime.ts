import type { Connection } from 'mongoose';
import type { AccessTokenService } from '../auth/crypto.js';
import type { AuditWriter } from '../audit/writer.js';
import type { RbacService } from '../rbac/service.js';
import type { SettingsRouterDependencies } from './router.js';
import { createMongooseSettingsRepository } from './repository.js';
import { createSettingsService } from './service.js';

export function createSettingsRuntime(
  connection: Connection,
  accessTokens: AccessTokenService,
  audit: AuditWriter,
  authorization: Pick<RbacService, 'authorize'>
): SettingsRouterDependencies {
  return {
    accessTokens,
    service: createSettingsService({
      repository: createMongooseSettingsRepository(connection),
      authorization,
      audit
    })
  };
}
