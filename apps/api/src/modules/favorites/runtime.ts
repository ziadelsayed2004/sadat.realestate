import { Types, type Connection } from 'mongoose';
import type { AccessTokenService } from '../auth/crypto.js';
import type { FavoriteRouterDependencies } from './router.js';
import { createMongooseFavoriteRepository } from './repository.js';
import { createFavoriteService } from './service.js';
export function createFavoriteRuntime(connection: Connection, accessTokens: AccessTokenService): FavoriteRouterDependencies { return { service: createFavoriteService({ repository: createMongooseFavoriteRepository(connection), async isActiveSeeker(userId) { return await connection.collection('users').findOne({ _id: new Types.ObjectId(userId), roleType: 'seeker', status: 'verified' }, { projection: { _id: 1 } }) !== null; } }), accessTokens }; }
