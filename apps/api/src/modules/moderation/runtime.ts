import type { Connection } from 'mongoose';
import type { AccessTokenService } from '../auth/crypto.js';
import type { AuditWriter } from '../audit/writer.js';
import type { RbacService } from '../rbac/service.js';
import { createModerationModels } from './models.js';
import { createMongooseModerationRepository } from './repository.js';
import type { ModerationRouterDependencies } from './router.js';
import { createModerationService } from './service.js';
export function createModerationRuntime(connection: Connection, accessTokens: AccessTokenService, audit: AuditWriter, rbac?: Pick<RbacService, 'authorize'>): ModerationRouterDependencies { const models = createModerationModels(connection); return { accessTokens, service: createModerationService({ repository: createMongooseModerationRepository(connection, models, audit), ...(rbac ? { authorization: rbac } : {}) }) }; }
