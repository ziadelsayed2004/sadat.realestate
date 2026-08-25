import type { Connection } from 'mongoose';
import type { AccessTokenService } from '../auth/crypto.js';
import type { AuditWriter } from '../audit/writer.js';
import {
  createDeterministicMalwareScanner,
  createClamAvMalwareScanner,
  createInMemoryStorageAdapter,
  createLocalFilesystemStorageAdapter,
  createPrivateDownloadSigner,
  createUnavailableMalwareScanner,
  createUnavailableStorageAdapter
} from './adapters.js';
import type { UploadEnvironment } from './environment.js';
import { createUploadModels } from './models.js';
import { createMongooseProviderDocumentRepository } from './repository.js';
import type { UploadRouterDependencies } from './router.js';
import { createProviderDocumentService, type AdminDocumentAuthorization } from './service.js';

export interface UploadRuntime extends UploadRouterDependencies {
  readiness: { isReady(): Promise<boolean> };
}

export function createUploadRuntime(
  connection: Connection,
  accessTokens: AccessTokenService,
  environment: UploadEnvironment,
  auditWriter: AuditWriter,
  authorization: AdminDocumentAuthorization
): UploadRuntime {
  const storage = environment.mode === 'memory'
    ? createInMemoryStorageAdapter()
    : environment.mode === 'local-filesystem'
      ? createLocalFilesystemStorageAdapter(environment.localRoot!)
      : createUnavailableStorageAdapter();
  const scanner = environment.scannerMode === 'clamav' && environment.clamav
    ? createClamAvMalwareScanner(environment.clamav)
    : environment.scannerMode === 'deterministic-fake'
      ? createDeterministicMalwareScanner('clean')
      : createUnavailableMalwareScanner();
  const service = createProviderDocumentService({
    repository: createMongooseProviderDocumentRepository(connection, createUploadModels(connection)),
    storage,
    scanner,
    signer: createPrivateDownloadSigner(environment.downloadSigningSecret),
    authorization,
    audit: {
      async record(event) {
        if (!event.traceId) throw new Error('AUDIT_TRACE_REQUIRED');
        await auditWriter.record({
          actorType: event.actorType,
          actorId: event.actorId,
          targetType: 'provider_document',
          targetId: event.documentId,
          action: 'private_document.download_granted',
          reason: event.purpose,
          before: { securityState: 'clean', access: 'not_granted' },
          after: { securityState: 'clean', access: 'granted', expiresInSeconds: 300 },
          requestId: event.requestId,
          traceId: event.traceId,
          occurredAt: event.occurredAt
        });
      }
    }
  });
  return { service, accessTokens, readiness: { isReady: () => service.isReady() } };
}
