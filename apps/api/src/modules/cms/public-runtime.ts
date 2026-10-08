import type { Connection } from 'mongoose';
import { createMongoosePublicAboutTeamService } from './public-content.js';
import type { PublicAboutTeamRouterDependencies } from './public-router.js';
import { createTeamCategories } from './team-categories.js';

export function createPublicAboutTeamRuntime(connection: Connection): PublicAboutTeamRouterDependencies {
  return { service: createMongoosePublicAboutTeamService(connection), categories: createTeamCategories(connection) };
}
