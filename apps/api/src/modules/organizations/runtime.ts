import type { Connection } from 'mongoose';
import type { PublicOrganizationRouterDependencies } from './router.js';
import { createMongoosePublicOrganizationRepository, createPublicOrganizationService } from './public.js';
export function createPublicOrganizationRuntime(connection: Connection): PublicOrganizationRouterDependencies { return { service: createPublicOrganizationService({ repository: createMongoosePublicOrganizationRepository(connection) }) }; }
