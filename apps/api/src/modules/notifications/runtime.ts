import { Types, type Connection } from 'mongoose';
import type { AccessTokenService } from '../auth/crypto.js';
import type { NotificationRouterDependencies } from './router.js';
import { createMongooseNotificationRepository } from './repository.js';
import { createNotificationService } from './service.js';

export function createNotificationRuntime(connection: Connection, accessTokens: AccessTokenService): NotificationRouterDependencies {
  return {
    service: createNotificationService({
      repository: createMongooseNotificationRepository(connection),
      async isActiveAccount(claims) {
        if (!Types.ObjectId.isValid(claims.sub) || !Types.ObjectId.isValid(claims.sid)) return false;
        const now = new Date();
        const [account, session] = await Promise.all([
          connection.collection('users').findOne(
            { _id: new Types.ObjectId(claims.sub), roleType: claims.role, status: claims.status },
            { projection: { _id: 1 } }
          ),
          connection.collection('sessions').findOne(
            {
              _id: new Types.ObjectId(claims.sid),
              userId: new Types.ObjectId(claims.sub),
              revokedAt: { $exists: false },
              expiresAt: { $gt: now }
            },
            { projection: { _id: 1 } }
          )
        ]);
        return account !== null && session !== null;
      }
    }),
    accessTokens
  };
}
