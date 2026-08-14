import type { Connection } from 'mongoose';
import { createMongoosePublicHomepageRepository, createPublicHomepageService } from './homepage.js';
import { createMongoosePublicPropertyDetailsRepository, createPublicPropertyDetailsService } from './properties.js';
import type { PublicRouterDependencies } from './router.js';

export function createPublicRuntime(connection: Connection): PublicRouterDependencies {
  return { service: createPublicHomepageService({ repository: createMongoosePublicHomepageRepository(connection) }), details: createPublicPropertyDetailsService({ repository: createMongoosePublicPropertyDetailsRepository(connection) }) };
}
