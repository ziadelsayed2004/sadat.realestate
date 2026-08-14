import type { Connection } from 'mongoose';
import { createMongoosePublicPropertySearchRepository, createPublicPropertySearchService } from './properties.js';
import type { PublicSearchRouterDependencies } from './router.js';

export function createPublicSearchRuntime(connection: Connection): PublicSearchRouterDependencies {
  return { service: createPublicPropertySearchService({ repository: createMongoosePublicPropertySearchRepository(connection) }) };
}
