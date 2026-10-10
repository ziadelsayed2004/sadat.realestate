import { Types, type Connection } from 'mongoose';
import { publicIdentitySubscriptionPutSchema, publicIdentitySubscriptionSchema, type RbacPermission } from '@sadat-real-estate/contracts';
import type { AuditWriter } from '../audit/writer.js';
import { ApiContractError } from '../contracts/error-boundary.js';
import { createProviderVisibilityReader, identitySubscriptionActive } from './visibility.js';

export function createIdentitySubscriptionService(connection: Connection, authorization: { authorize(id: string, permission: RbacPermission): Promise<boolean> }, audit: AuditWriter) {
  const collection = connection.collection('provider_identity_subscriptions');
  const visibility = createProviderVisibilityReader(connection);
  const denied = () => new ApiContractError('FORBIDDEN', 'errors.forbidden', 403);
  async function account(providerId: string) {
    const value = await visibility.read(providerId);
    if (!value.accountId || value.providerType !== 'brokerage_office') throw new ApiContractError('NOT_FOUND', 'errors.notFound', 404);
    return new Types.ObjectId(value.accountId);
  }
  async function read(actorId: string, providerId: string) {
    if (!await authorization.authorize(actorId, 'admin:providers.view')) throw denied();
    const key = await account(providerId); const row = await collection.findOne({ _id: key });
    return publicIdentitySubscriptionSchema.parse({ providerId, status: row?.status ?? 'inactive', paymentConfirmed: row?.paymentConfirmed ?? false,
      ...(row?.startAt instanceof Date ? { startAt: row.startAt.toISOString() } : {}), ...(row?.endAt instanceof Date ? { endAt: row.endAt.toISOString() } : {}),
      version: row?.version ?? 0, visible: identitySubscriptionActive(row, new Date()) && (await visibility.read(providerId)).approved,
      canManage: await authorization.authorize(actorId, 'admin:providers.visibility.manage') });
  }
  return { read, async put(actorId: string, providerId: string, input: unknown, context: { requestId: string; traceId: string }) {
    if (!await authorization.authorize(actorId, 'admin:providers.visibility.manage') || !await authorization.authorize(actorId, 'admin:providers.view')) throw denied();
    const parsed = publicIdentitySubscriptionPutSchema.parse(input); const key = await account(providerId); const stamp = new Date();
    if (parsed.status === 'active' && (!parsed.endAt || new Date(parsed.endAt) <= stamp || !(await visibility.read(providerId)).approved)) throw new ApiContractError('INVALID_STATE', 'errors.validation', 400);
    await connection.transaction(async session => {
      const before = await collection.findOne({ _id: key }, { session });
      if ((before?.version ?? 0) !== parsed.expectedVersion) throw new ApiContractError('VERSION_CONFLICT', 'errors.conflict', 409);
      const next = { status: parsed.status, paymentConfirmed: parsed.paymentConfirmed,
        ...(parsed.startAt ? { startAt: new Date(parsed.startAt) } : before?.startAt ? { startAt: before.startAt } : {}),
        ...(parsed.endAt ? { endAt: new Date(parsed.endAt) } : before?.endAt ? { endAt: before.endAt } : {}),
        version: parsed.expectedVersion + 1, updatedAt: stamp, updatedBy: actorId };
      if (before) {
        const result = await collection.updateOne({ _id: key, version: parsed.expectedVersion }, { $set: next }, { session });
        if (result.matchedCount !== 1) throw new ApiContractError('VERSION_CONFLICT', 'errors.conflict', 409);
      } else await collection.insertOne({ _id: key, ...next, createdAt: stamp }, { session });
      const snapshot = (value: typeof before) => ({ status: value?.status ?? 'inactive', startAt: value?.startAt instanceof Date ? value.startAt.toISOString() : null, endAt: value?.endAt instanceof Date ? value.endAt.toISOString() : null, paymentConfirmed: value?.paymentConfirmed ?? false, version: value?.version ?? 0 });
      await audit.record({ actorType: 'admin', actorId, targetType: 'provider', targetId: providerId, action: 'provider.identity_subscription_updated',
        reason: parsed.status === 'active' ? 'Confirm external payment and set office identity display period' : 'Stop office identity display', before: snapshot(before), after: snapshot({ _id: key, ...next }), ...context, occurredAt: stamp }, session);
    }).catch(error => {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) throw new ApiContractError('VERSION_CONFLICT', 'errors.conflict', 409);
      throw error;
    });
    return read(actorId, providerId);
  } };
}
