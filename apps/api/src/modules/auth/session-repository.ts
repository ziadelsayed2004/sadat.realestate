import { Types, type Connection } from 'mongoose';
import type { AuditWriter } from '../audit/writer.js';
import type { IdentityModels } from '../identity/models.js';
import type { ManagedSessionRecord, SessionManagementRepository } from './session-service.js';

interface LeanManagedSession {
  _id: Types.ObjectId;
  authenticationMethod: 'password' | 'otp' | 'mfa';
  createdAt: Date;
  lastUsedAt?: Date;
  expiresAt: Date;
}

export function createMongooseSessionManagementRepository(
  connection: Connection,
  identityModels: IdentityModels,
  audit: AuditWriter
): SessionManagementRepository {
  const { Session } = identityModels;
  return {
    async listActive(userId, now) {
      if (!Types.ObjectId.isValid(userId)) return [];
      const rows = await Session.find({
        userId: new Types.ObjectId(userId),
        revokedAt: { $exists: false },
        expiresAt: { $gt: now }
      })
        .select('_id authenticationMethod createdAt lastUsedAt expiresAt')
        .sort({ createdAt: -1, _id: 1 })
        .lean<LeanManagedSession[]>()
        .exec();
      return rows.map((row): ManagedSessionRecord => ({
        id: row._id.toHexString(),
        authenticationMethod: row.authenticationMethod ?? 'password',
        createdAt: row.createdAt,
        ...(row.lastUsedAt ? { lastUsedAt: row.lastUsedAt } : {}),
        expiresAt: row.expiresAt
      }));
    },

    async revokeOwned(input) {
      if (!Types.ObjectId.isValid(input.userId) || !Types.ObjectId.isValid(input.sessionId)) return 'not_found';
      const userId = new Types.ObjectId(input.userId);
      const sessionId = new Types.ObjectId(input.sessionId);
      const mongoSession = await connection.startSession();
      try {
        return await mongoSession.withTransaction(async () => {
          const before = await Session.findOne({
            _id: sessionId,
            userId,
            revokedAt: { $exists: false },
            expiresAt: { $gt: input.now }
          }).select('_id authenticationMethod createdAt lastUsedAt expiresAt').session(mongoSession).lean<LeanManagedSession | null>().exec();
          if (!before) return 'not_found' as const;
          const write = await Session.updateOne(
            { _id: sessionId, userId, revokedAt: { $exists: false }, expiresAt: { $gt: input.now } },
            { $set: { revokedAt: input.now, lastUsedAt: input.now } },
            { session: mongoSession }
          ).exec();
          if (write.modifiedCount !== 1) return 'not_found' as const;
          await audit.record({
            actorType: input.roleType,
            actorId: input.userId,
            targetType: 'auth_session',
            targetId: input.sessionId,
            action: 'auth_session.revoke',
            reason: 'Account owner revoked an active session',
            before: { active: true, authenticationMethod: before.authenticationMethod, expiresAt: before.expiresAt.toISOString() },
            after: { active: false, revokedAt: input.now.toISOString() },
            requestId: input.requestId,
            traceId: input.traceId,
            occurredAt: input.now
          }, mongoSession);
          return 'revoked' as const;
        });
      } finally {
        await mongoSession.endSession();
      }
    }
  };
}
