import { Types, type Connection } from 'mongoose';
import { notificationAudienceSchema, notificationPermissionSchema, notificationDataSchema } from '@sadat-real-estate/contracts';
import type { NotificationRepository, NotificationSource } from './service.js';

type Row = Record<string, unknown>;
const projection = { _id: 1, type: 1, title: 1, message: 1, link: 1, readAt: 1, createdAt: 1, audience: 1, requiredPermission: 1 };

function id(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && typeof (value as { toHexString?: () => string }).toHexString === 'function') {
    return (value as { toHexString: () => string }).toHexString();
  }
  return undefined;
}

function source(row: Row): NotificationSource | undefined {
  const rowId = id(row._id);
  const createdAt = row.createdAt instanceof Date ? row.createdAt : undefined;
  const readAt = row.readAt instanceof Date ? row.readAt : row.readAt === null || row.readAt === undefined ? null : undefined;
  if (!rowId || typeof row.type !== 'string' || row.title === undefined || !createdAt || readAt === undefined) return undefined;
  const rowAudience = row.audience === undefined ? undefined : notificationAudienceSchema.safeParse(row.audience);
  const rowPermission = row.requiredPermission === undefined ? undefined : notificationPermissionSchema.safeParse(row.requiredPermission);
  if (rowAudience && !rowAudience.success) return undefined;
  if (rowPermission && !rowPermission.success) return undefined;
  const localized = (value: unknown) => typeof value === 'string' ? { ar: value } : value;
  if (!notificationDataSchema.safeParse({ id: rowId, type: row.type, title: localized(row.title),
    ...(row.message !== undefined ? { message: localized(row.message) } : {}), ...(row.link !== undefined ? { link: row.link } : {}),
    readAt: readAt?.toISOString() ?? null, createdAt: createdAt.toISOString() }).success) return undefined;
  return {
    id: rowId,
    type: row.type,
    title: localized(row.title),
    ...(row.message !== undefined ? { message: localized(row.message) } : {}),
    ...(typeof row.link === 'string' ? { link: row.link } : {}),
    readAt,
    createdAt,
    ...(rowAudience?.success ? { audience: rowAudience.data } : {}),
    ...(rowPermission?.success ? { requiredPermission: rowPermission.data } : {})
  };
}

function unreadFilter(): { $or: [{ readAt: null }, { readAt: { $exists: false } }] } {
  return { $or: [{ readAt: null }, { readAt: { $exists: false } }] };
}

function audienceFilter(audience: NotificationSource['audience']): Record<string, unknown> {
  if (!audience) return {};
  // Older seeker records predate the explicit audience field. They remain
  // readable only through the seeker projection; admin records must opt in
  // explicitly so a recipient-owned record cannot cross an audience boundary.
  return audience === 'seeker' || audience === 'provider'
    ? { $and: [{ $or: [{ audience }, { audience: { $exists: false } }] }] }
    : { audience };
}

function permissionFilter(permittedPermissions?: readonly string[]): Record<string, unknown> {
  if (permittedPermissions === undefined) return {};
  return { $or: [{ requiredPermission: { $exists: false } }, { requiredPermission: { $in: permittedPermissions } }] };
}

export function createMongooseNotificationRepository(connection: Connection): NotificationRepository {
  const notifications = connection.collection('notifications');
  let indexesReady: Promise<unknown> | undefined;
  function ensureIndexes(): Promise<unknown> {
    indexesReady ??= Promise.all([
      notifications.createIndex({ recipientId: 1, createdAt: -1, _id: -1 }, { name: 'notifications_recipient_created' }),
      notifications.createIndex({ recipientId: 1, readAt: 1, createdAt: -1 }, { name: 'notifications_recipient_read' })
    ]);
    return indexesReady;
  }

  return {
    async list(recipientId, query, audience, permittedPermissions) {
      await ensureIndexes();
      const filter = { recipientId: { $in: [new Types.ObjectId(recipientId), recipientId] }, ...audienceFilter(audience), ...permissionFilter(permittedPermissions) };
      // Count the same validated projection we display. Legacy/broken rows must
      // never produce a red badge with an empty inbox. Stream per-recipient rows
      // without retaining the entire inbox in memory.
      const items: NotificationSource[] = []; let total = 0; let unreadCount = 0;
      for await (const row of notifications.find(filter, { projection }).sort({ createdAt: -1, _id: -1 })) {
        const value = source(row as Row); if (!value) continue;
        if (value.readAt === null) unreadCount += 1;
        if ((query.unreadOnly && value.readAt !== null) || (query.type && value.type !== query.type)) continue;
        if (total >= (query.page - 1) * query.limit && items.length < query.limit) items.push(value);
        total += 1;
      }
      return { items, total, unreadCount };
    },

    async findById(recipientId, notificationId, audience, permittedPermissions) {
      await ensureIndexes();
      const row = await notifications.findOne(
        { _id: new Types.ObjectId(notificationId), recipientId: { $in: [new Types.ObjectId(recipientId), recipientId] }, ...audienceFilter(audience), ...permissionFilter(permittedPermissions) },
        { projection }
      );
      return row ? source(row as Row) : undefined;
    },

    async markRead(recipientId, notificationId, now, audience, permittedPermissions) {
      await ensureIndexes();
      const identity = { _id: new Types.ObjectId(notificationId), recipientId: { $in: [new Types.ObjectId(recipientId), recipientId] }, ...audienceFilter(audience), ...permissionFilter(permittedPermissions) };
      const row = await notifications.findOneAndUpdate(
        { ...identity, ...unreadFilter() },
        { $set: { readAt: now } },
        { returnDocument: 'after', projection }
      );
      if (row) return source(row as Row);
      const existing = await notifications.findOne(identity, { projection });
      return existing ? source(existing as Row) : undefined;
    },

    async markRelatedRead(recipientId, itemId, now, permittedPermissions) {
      await ensureIndexes();
      const result = await notifications.updateMany({
        recipientId: { $in: [new Types.ObjectId(recipientId), recipientId] }, audience: 'admin',
        ...permissionFilter(permittedPermissions), ...unreadFilter(),
        link: { $regex: `(?:/|=)${itemId}(?:[/?&#]|$)` }
      }, { $set: { readAt: now } });
      return result.modifiedCount;
    },

    async markAllRead(recipientId, now, audience, permittedPermissions) {
      await ensureIndexes();
      const result = await notifications.updateMany(
        { recipientId: { $in: [new Types.ObjectId(recipientId), recipientId] }, ...audienceFilter(audience), ...permissionFilter(permittedPermissions), ...unreadFilter() },
        { $set: { readAt: now } }
      );
      return result.modifiedCount;
    }
  };
}
