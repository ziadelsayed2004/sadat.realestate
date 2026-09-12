import type { Connection } from 'mongoose';
import type { AccessTokenService } from '../auth/crypto.js';
import type { RbacService } from '../rbac/service.js';
import type { CommissionPolicyRouterDependencies } from './policy-router.js';
import { createCommissionPolicyService } from './policy-service.js';
import { createMongooseCommissionPolicyRepository } from './policy-repository.js';
import type { AuditWriter } from '../audit/writer.js';

export function createCommissionPolicyRuntime(
  connection: Connection,
  accessTokens: AccessTokenService,
  authorization: Pick<RbacService, 'authorize'>,
  audit: AuditWriter
): CommissionPolicyRouterDependencies {
  return {
    accessTokens,
    authorization,
    service: createCommissionPolicyService({
      repository: createMongooseCommissionPolicyRepository(connection, audit)
    })
  };
}
