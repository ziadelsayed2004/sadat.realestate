import { Types } from 'mongoose';
import { auditLogDataSchema, auditObjectIdSchema } from '@sadat-real-estate/contracts';
import type { AdminModels } from '../admin/models.js';
import type { IdentityModels } from '../identity/models.js';

export function createAuditActorEmailResolver(models: Pick<IdentityModels, 'User'>) {
  return async (actorIds: readonly string[]): Promise<ReadonlyMap<string, string>> => {
    const ids = [...new Set(actorIds)].slice(0, 100).map(id => new Types.ObjectId(auditObjectIdSchema.parse(id)));
    if (!ids.length) return new Map();
    const rows = await models.User.find({ _id: { $in: ids }, roleType: 'admin' })
      .select({ _id: 1, normalizedEmail: 1 }).lean<Array<{ _id: Types.ObjectId; normalizedEmail?: string }>>();
    return new Map(rows.flatMap(row => {
      const email = auditLogDataSchema.shape.actorEmail.safeParse(row.normalizedEmail);
      return email.success && email.data ? [[row._id.toHexString(), email.data] as const] : [];
    }));
  };
}

export function createAuditActorNameResolver(models: Pick<AdminModels, 'AdminAccount'>) {
  return async (actorIds: readonly string[]): Promise<ReadonlyMap<string, string>> => {
    const ids = [...new Set(actorIds)].slice(0, 100).map(id => new Types.ObjectId(auditObjectIdSchema.parse(id)));
    if (!ids.length) return new Map();
    const rows = await models.AdminAccount.find({ userId: { $in: ids } })
      .select({ _id: 0, userId: 1, displayName: 1 })
      .lean<Array<{ userId: Types.ObjectId; displayName: string }>>();
    const names = new Map<string, string>();
    for (const row of rows) {
      const name = auditLogDataSchema.shape.actorDisplayName.safeParse(row.displayName);
      if (name.success && name.data) names.set(row.userId.toHexString(), name.data);
    }
    return names;
  };
}
