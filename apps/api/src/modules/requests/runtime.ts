import type { Connection } from 'mongoose';
import type { AccessTokenService } from '../auth/crypto.js';
import type { RequestRouterDependencies } from './router.js';
import { createMongooseRequestRepository } from './repository.js';
import { createRequestService } from './service.js';
export function createRequestRuntime(connection: Connection, accessTokens: AccessTokenService): RequestRouterDependencies { return { accessTokens, service: createRequestService({ repository: createMongooseRequestRepository(connection) }) }; }
