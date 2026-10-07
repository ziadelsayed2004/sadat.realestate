import { Types, type Connection } from 'mongoose';
import { accountCommunicationRequestSchema, accountObjectIdSchema } from '@sadat-real-estate/contracts';
import type { AuditWriter } from '../audit/writer.js';
import { AccountServiceError, type AccountAuthorization, type AccountPrincipal, type AccountRequestContext } from './service.js';

export function createAccountCommunicator(connection: Connection, authorization: AccountAuthorization, audit: AuditWriter) {
  return async (principal: AccountPrincipal, userId: string, input: unknown, context: AccountRequestContext) => {
    accountObjectIdSchema.parse(userId);
    const request = accountCommunicationRequestSchema.parse(input);
    if (!await authorization.authorize(principal.userId, 'admin:users.manage')) throw new AccountServiceError('ACCOUNT_FORBIDDEN');
    if (userId === principal.userId) throw new AccountServiceError('ACCOUNT_SELF_TRANSITION_FORBIDDEN');
    const target = await connection.collection('users').findOne({ _id: new Types.ObjectId(userId) });
    if (!target) throw new AccountServiceError('ACCOUNT_NOT_FOUND');
    if (target.roleType !== 'seeker' && target.roleType !== 'provider') throw new AccountServiceError('ACCOUNT_ADMIN_TARGET_FORBIDDEN');
    let link = target.roleType === 'provider' ? '/provider' : '/seeker';
    if (request.propertyCode) {
      const property = await connection.collection('properties').findOne({ publicCode: request.propertyCode, status: 'published' }, { projection: { slug: 1 } });
      if (!property || typeof property.slug !== 'string') throw new AccountServiceError('ACCOUNT_NOT_FOUND');
      link = `/properties/${encodeURIComponent(property.slug)}`;
    }
    const stamp = new Date();
    const id = new Types.ObjectId();
    await connection.transaction(async session => {
      if (request.action === 'logout') {
        await connection.collection('sessions').updateMany({ userId: target._id, revokedAt: { $exists: false } }, { $set: { revokedAt: stamp, lastUsedAt: stamp } }, { session });
      } else {
        await connection.collection('notifications').insertOne({ _id: id, recipientId: target._id, audience: target.roleType, type: 'account.admin_message',
          title: { ar: request.title ?? 'رسالة من إدارة عقارات السادات', en: request.title ?? 'Message from Sadat Real Estate' },
          message: { ar: request.reason, en: request.reason }, link, readAt: null, createdAt: stamp }, { session });
      }
      await audit.record({ actorType: 'admin', actorId: principal.userId, targetType: 'user', targetId: userId,
        action: `account.${request.action}`, reason: request.reason, before: { status: target.status }, after: { communicationId: id.toHexString(), link },
        requestId: context.requestId, traceId: context.traceId, occurredAt: stamp }, session);
    });
    return { id: id.toHexString(), action: request.action };
  };
}
