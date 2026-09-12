import type { Connection } from 'mongoose';
import type { AccessTokenService } from '../auth/crypto.js';
import type { RbacService } from '../rbac/service.js';
import { createMongooseCommissionExceptionRepository } from './exception-repository.js';
import { createCommissionExceptionService } from './exception-service.js';
import type { CommissionExceptionRouterDependencies } from './exception-router.js';
import type { AuditWriter } from '../audit/writer.js';

export function createCommissionExceptionRuntime(
  connection: Connection,
  accessTokens: AccessTokenService,
  authorization: Pick<RbacService, 'authorize'>,
  audit: AuditWriter
): CommissionExceptionRouterDependencies {
  return {
    accessTokens,
    authorization,
    service: createCommissionExceptionService({
      repository: createMongooseCommissionExceptionRepository(connection, audit)
    })
  };
}
