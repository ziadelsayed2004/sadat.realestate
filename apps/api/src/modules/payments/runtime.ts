import type { Connection } from 'mongoose';
import type { AccessTokenService } from '../auth/crypto.js';
import type { AuditWriter } from '../audit/writer.js';
import type { RbacService } from '../rbac/service.js';
import type { UploadEnvironment } from '../uploads/environment.js';
import {
  createDeterministicMalwareScanner,
  createInMemoryStorageAdapter,
  createLocalFilesystemStorageAdapter,
  createUnavailableMalwareScanner,
  createUnavailableStorageAdapter
} from '../uploads/adapters.js';
import { createProviderAdvertisingModels } from '../provider/advertising-models.js';
import { createMongoosePaymentProofRepository } from './repository.js';
import {
  createPaymentProofService,
  type PaymentProofAuthorization,
  type PaymentProofServiceDependencies
} from './service.js';
import type { PaymentProofRouterDependencies } from './router.js';

export function createPaymentProofRuntime(
  connection: Connection,
  accessTokens: AccessTokenService,
  environment: UploadEnvironment,
  authorization?: Pick<RbacService, 'authorize'>,
  auditWriter?: AuditWriter
): PaymentProofRouterDependencies {
  const storage = environment.mode === 'memory'
    ? createInMemoryStorageAdapter()
    : environment.mode === 'local-filesystem'
      ? createLocalFilesystemStorageAdapter(environment.localRoot!)
      : createUnavailableStorageAdapter();
  const scanner = environment.mode === 's3-compatible-unavailable'
    ? createUnavailableMalwareScanner()
    : createDeterministicMalwareScanner('clean');
  return {
    accessTokens,
    service: createPaymentProofService({
      repository: createMongoosePaymentProofRepository(
        connection,
        createProviderAdvertisingModels(connection)
      ),
      ...(authorization ? { authorization: authorization as PaymentProofAuthorization } : {}),
      ...(auditWriter
        ? {
            audit: {
              record: async (event: Parameters<NonNullable<PaymentProofServiceDependencies['audit']>['record']>[0]) => {
                await auditWriter.record(event);
              }
            }
          }
        : {}),
      storage,
      scanner
    })
  };
}
