import type { Connection } from 'mongoose';
import type { AccessTokenService } from '../auth/crypto.js';
import type { FavoriteRouterDependencies } from './router.js';
import { createMongooseFavoriteRepository } from './repository.js';
import { createFavoriteService } from './service.js';
export function createFavoriteRuntime(connection: Connection, accessTokens: AccessTokenService): FavoriteRouterDependencies { return { service: createFavoriteService({ repository: createMongooseFavoriteRepository(connection) }), accessTokens }; }
