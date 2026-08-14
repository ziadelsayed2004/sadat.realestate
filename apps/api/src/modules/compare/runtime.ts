import type { Connection } from 'mongoose';
import { createMongoosePublicPropertyComparisonRepository, createPublicPropertyComparisonService } from './properties.js';
import type { PublicCompareRouterDependencies } from './router.js';

export function createPublicCompareRuntime(connection: Connection): PublicCompareRouterDependencies {
  return { service: createPublicPropertyComparisonService({ repository: createMongoosePublicPropertyComparisonRepository(connection) }) };
}
