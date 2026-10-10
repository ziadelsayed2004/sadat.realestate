import { createIdentitySubscriptionService } from '../provider/identity-subscription.js';
import type { Connection } from 'mongoose';
import type { AccessTokenService } from '../auth/crypto.js';
import type { AuditWriter } from '../audit/writer.js';
import { createIdentityModels } from '../identity/models.js';
import { createProviderModels } from '../provider/models.js';
import { createAccountModels } from './models.js';
import { createMongooseAccountRepository } from './repository.js';
import type { AccountRouterDependencies } from './router.js';
import { createAccountService, type AccountAuthorization } from './service.js';
import { createCurrentAccountAccessGuard } from './access-guard.js';
import { createAccountCommunicator } from './communication.js';
import { createAccountDeleter } from './deletion.js';

export function createAccountRuntime(
  connection: Connection,
  accessTokens: AccessTokenService,
  auditWriter: AuditWriter,
  authorization: AccountAuthorization
): AccountRouterDependencies {
  const identityModels = createIdentityModels(connection);
  const providerModels = createProviderModels(connection);
  const accountModels = createAccountModels(connection);
  const repository = createMongooseAccountRepository(
    connection,
    identityModels,
    providerModels,
    accountModels,
    auditWriter
  );
  return {
    identitySubscription: createIdentitySubscriptionService(connection, authorization, auditWriter),
    deleteUser: createAccountDeleter(connection, authorization, auditWriter),
    communicate: createAccountCommunicator(connection, authorization, auditWriter),
    accessTokens,
    accessGuard: createCurrentAccountAccessGuard(accessTokens, repository),
    service: createAccountService({
      repository,
      authorization
    })
  };
}
