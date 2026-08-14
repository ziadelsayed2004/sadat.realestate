import type { Connection } from 'mongoose';
import type { AccessTokenService } from '../auth/crypto.js';
import type { AuditWriter } from '../audit/writer.js';
import { createDeterministicMalwareScanner, createInMemoryStorageAdapter, createLocalFilesystemStorageAdapter, createUnavailableMalwareScanner, createUnavailableStorageAdapter } from '../uploads/adapters.js';
import type { UploadEnvironment } from '../uploads/environment.js';
import { createPropertyMediaModels } from './models.js';
import { createMongoosePropertyMediaRepository } from './repository.js';
import type { PropertyMediaRouterDependencies } from './router.js';
import { createPropertyMediaService } from './service.js';

export function createPropertyMediaRuntime(connection: Connection, accessTokens: AccessTokenService, environment: UploadEnvironment, audit: AuditWriter): PropertyMediaRouterDependencies {
  const storage = environment.mode === 'memory' ? createInMemoryStorageAdapter() : environment.mode === 'local-filesystem' ? createLocalFilesystemStorageAdapter(environment.localRoot!) : createUnavailableStorageAdapter();
  const scanner = environment.mode === 's3-compatible-unavailable' ? createUnavailableMalwareScanner() : createDeterministicMalwareScanner('clean');
  return { accessTokens, service: createPropertyMediaService({ repository: createMongoosePropertyMediaRepository(connection, createPropertyMediaModels(connection), audit), storage, scanner }) };
}
