import type { AuditWriter } from '../audit/writer.js';
import type { RbacService } from '../rbac/service.js';
import type { Connection } from 'mongoose';
import type { AccessTokenService } from '../auth/crypto.js';
import type { ViewingRouterDependencies } from './router.js';
import { createMongooseViewingRepository } from './repository.js';
import { createViewingService } from './service.js';
export function createViewingRuntime(connection: Connection, accessTokens: AccessTokenService, authorization: Pick<RbacService, 'authorize'>, audit: AuditWriter): ViewingRouterDependencies { return { accessTokens, service: createViewingService({ authorization, repository: createMongooseViewingRepository(connection, audit) }) }; }
