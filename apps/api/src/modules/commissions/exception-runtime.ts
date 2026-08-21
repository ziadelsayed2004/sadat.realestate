import type { Connection } from 'mongoose';
import type { AccessTokenService } from '../auth/crypto.js';
import type { RbacService } from '../rbac/service.js';
import { createMongooseCommissionExceptionRepository } from './exception-repository.js';
import { createCommissionExceptionService } from './exception-service.js';
import type { CommissionExceptionRouterDependencies } from './exception-router.js';

export function createCommissionExceptionRuntime(
  connection: Connection,
  accessTokens: AccessTokenService,
  authorization: Pick<RbacService, 'authorize'>
): CommissionExceptionRouterDependencies {
  return {
    accessTokens,
    authorization,
    service: createCommissionExceptionService({
      repository: createMongooseCommissionExceptionRepository(connection)
    })
  };
}
