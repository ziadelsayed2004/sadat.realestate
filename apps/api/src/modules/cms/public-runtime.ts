import type { Connection } from 'mongoose';
import { createMongoosePublicAboutTeamService } from './public-content.js';
import type { PublicAboutTeamRouterDependencies } from './public-router.js';

export function createPublicAboutTeamRuntime(connection: Connection): PublicAboutTeamRouterDependencies {
  return { service: createMongoosePublicAboutTeamService(connection) };
}
