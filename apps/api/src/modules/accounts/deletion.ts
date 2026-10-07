import { Types, type Connection } from 'mongoose';
import { accountDeleteRequestSchema, accountObjectIdSchema } from '@sadat-real-estate/contracts';
import type { AuditWriter } from '../audit/writer.js';
import { AccountServiceError, type AccountAuthorization, type AccountPrincipal, type AccountRequestContext } from './service.js';

// Keep financial records and customer requests linked to their original owner.
// Deletion removes operating access and visibility without orphaning history.
export function createAccountDeleter(connection: Connection, authorization: AccountAuthorization, audit: AuditWriter) {
  return async (principal: AccountPrincipal, userId: string, input: unknown, context: AccountRequestContext) => {
    accountObjectIdSchema.parse(userId);
    const request = accountDeleteRequestSchema.parse(input);
    if (!await authorization.authorize(principal.userId, 'admin:users.manage')) throw new AccountServiceError('ACCOUNT_FORBIDDEN');
    if (userId === principal.userId) throw new AccountServiceError('ACCOUNT_SELF_TRANSITION_FORBIDDEN');
    const id = new Types.ObjectId(userId);
    return connection.transaction(async session => {
      const target = await connection.collection('users').findOne({ _id: id, deletedAt: null }, { session });
      if (!target) throw new AccountServiceError('ACCOUNT_NOT_FOUND');
      if (target.roleType !== 'seeker' && target.roleType !== 'provider') throw new AccountServiceError('ACCOUNT_ADMIN_TARGET_FORBIDDEN');
      if ((target.version ?? 0) !== request.version) throw new AccountServiceError('ACCOUNT_TRANSITION_CONFLICT');
      const stamp = new Date();
      const versionFilter = request.version === 0 ? { $or: [{ version: 0 }, { version: { $exists: false } }] } : { version: request.version };
      const updated = await connection.collection('users').updateOne({ _id: id, deletedAt: null, ...versionFilter }, {
        $set: { status: 'suspended', deletedAt: stamp, deletedBy: new Types.ObjectId(principal.userId), statusChangedAt: stamp, updatedAt: stamp }, $inc: { version: 1 }
      }, { session });
      if (updated.modifiedCount !== 1) throw new AccountServiceError('ACCOUNT_TRANSITION_CONFLICT');
      await connection.collection('sessions').updateMany({ userId: id, revokedAt: { $exists: false } }, { $set: { revokedAt: stamp, lastUsedAt: stamp } }, { session });
      if (target.roleType === 'provider') {
        for (const collection of ['provider_profiles', 'provider_applications']) {
          await connection.collection(collection).updateMany({ userId: id }, { $set: { status: 'suspended', updatedAt: stamp }, $inc: { version: 1 } }, { session });
        }
        await connection.collection('organizations').updateMany({ providerId: id }, { $set: { status: 'inactive', updatedAt: stamp }, $inc: { version: 1 } }, { session });
        for (const collection of ['properties', 'projects']) {
          await connection.collection(collection).updateMany({ providerId: id, status: 'published' }, { $set: { status: 'hidden', updatedAt: stamp }, $inc: { version: 1 } }, { session });
        }
      }
      await audit.record({ actorType: 'admin', actorId: principal.userId, targetType: 'user', targetId: userId, action: 'account.delete', reason: request.reason,
        before: { status: target.status, version: target.version ?? 0 }, after: { status: 'suspended', deletedAt: stamp.toISOString(), version: request.version + 1 },
        requestId: context.requestId, traceId: context.traceId, occurredAt: stamp }, session);
      return { id: userId, deleted: true as const };
    });
  };
}
