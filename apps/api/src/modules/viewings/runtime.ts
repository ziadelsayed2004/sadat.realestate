import type { Connection } from 'mongoose';
import type { AccessTokenService } from '../auth/crypto.js';
import type { ViewingRouterDependencies } from './router.js';
import { createMongooseViewingRepository } from './repository.js';
import { createViewingService } from './service.js';
export function createViewingRuntime(connection: Connection, accessTokens: AccessTokenService): ViewingRouterDependencies { return { accessTokens, service: createViewingService({ repository: createMongooseViewingRepository(connection) }) }; }
