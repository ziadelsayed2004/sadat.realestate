import type { Connection } from 'mongoose';
import { createMongoosePublicHomepageRepository, createPublicHomepageService } from './homepage.js';
import { createMongoosePublicPropertyDetailsRepository, createPublicPropertyDetailsService } from './properties.js';
import type { PublicRouterDependencies } from './router.js';
import { createMongoosePropertySettingsReader } from '../settings/property-policy.js';
import { createMongooseDisplaySettingsReader } from '../settings/display-policy.js';
import type { AccessTokenService } from '../auth/crypto.js';

export function createPublicRuntime(connection: Connection, accessTokens?: AccessTokenService): PublicRouterDependencies {
  return { service: createPublicHomepageService({ repository: createMongoosePublicHomepageRepository(connection), displaySettings: createMongooseDisplaySettingsReader(connection) }), details: createPublicPropertyDetailsService({ repository: createMongoosePublicPropertyDetailsRepository(connection), settings: createMongoosePropertySettingsReader(connection) }), ...(accessTokens ? { accessTokens } : {}) };
}
