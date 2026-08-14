import type { Connection } from 'mongoose';
import type { AccessTokenService } from '../auth/crypto.js';
import type { NotificationRouterDependencies } from './router.js';
import { createMongooseNotificationRepository } from './repository.js';
import { createNotificationService } from './service.js';

export function createNotificationRuntime(connection: Connection, accessTokens: AccessTokenService): NotificationRouterDependencies {
  return { service: createNotificationService({ repository: createMongooseNotificationRepository(connection) }), accessTokens };
}
