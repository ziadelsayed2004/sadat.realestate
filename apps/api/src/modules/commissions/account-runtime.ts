import type { Connection } from 'mongoose';
import type { AccessTokenService } from '../auth/crypto.js';
import type { RbacService } from '../rbac/service.js';
import { createMongooseCommissionAccountOverrideRepository } from './account-repository.js';
import { createCommissionAccountService } from './account-service.js';
import type { CommissionAccountRouterDependencies } from './account-router.js';
import { createMongooseCommissionPolicyRepository } from './policy-repository.js';
import type { AuditWriter } from '../audit/writer.js';

export function createCommissionAccountRuntime(
  connection: Connection,
  accessTokens: AccessTokenService,
  authorization: Pick<RbacService, 'authorize'>,
  audit: AuditWriter
): CommissionAccountRouterDependencies {
  return {
    accessTokens,
    authorization,
    service: createCommissionAccountService({
      repository: createMongooseCommissionAccountOverrideRepository(connection, audit),
      policyRepository: createMongooseCommissionPolicyRepository(connection)
    })
  };
}
