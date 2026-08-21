import type { Connection } from 'mongoose';
import type { AccessTokenService } from '../auth/crypto.js';
import type { RbacService } from '../rbac/service.js';
import { createMongooseCommissionConfirmationRepository } from './confirmation-repository.js';
import { createCommissionConfirmationService } from './confirmation-service.js';
import type { CommissionConfirmationRouterDependencies } from './confirmation-router.js';

export function createCommissionConfirmationRuntime(
  connection: Connection,
  accessTokens: AccessTokenService,
  authorization: Pick<RbacService, 'authorize'>
): CommissionConfirmationRouterDependencies {
  return {
    accessTokens,
    authorization,
    service: createCommissionConfirmationService({
      repository: createMongooseCommissionConfirmationRepository(connection)
    })
  };
}
