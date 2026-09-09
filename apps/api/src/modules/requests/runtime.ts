import type { AuditWriter } from '../audit/writer.js';
import type { RbacService } from '../rbac/service.js';
import type { Connection } from 'mongoose';
import type { AccessTokenService } from '../auth/crypto.js';
import type { RequestRouterDependencies } from './router.js';
import { createMongooseRequestRepository } from './repository.js';
import { createRequestService } from './service.js';
export function createRequestRuntime(connection: Connection, accessTokens: AccessTokenService, authorization: Pick<RbacService, 'authorize'>, audit: AuditWriter): RequestRouterDependencies { return { accessTokens, service: createRequestService({ authorization, repository: createMongooseRequestRepository(connection, audit) }) }; }
