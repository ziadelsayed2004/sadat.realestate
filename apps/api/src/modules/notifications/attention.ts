import type { Connection } from 'mongoose';
import { adminAttentionSchema, type AdminAttentionKey, type AdminAttentionReadRequest, type RbacPermission } from '@sadat-real-estate/contracts';

// Read receipts are separate from workflow status and scoped to each administrator.
const queues: ReadonlyArray<{ key: AdminAttentionKey; collection: string; permission: RbacPermission; filter: Record<string, unknown> }> = [
  { key: 'verification', collection: 'provider_applications', permission: 'admin:providers.review', filter: { status: 'pending_review' } },
  { key: 'property-review', collection: 'properties', permission: 'admin:properties.review', filter: { status: 'pending_review' } },
  { key: 'project-review', collection: 'projects', permission: 'admin:projects.review', filter: { status: 'pending_review' } },
  { key: 'account-reports', collection: 'account_reports', permission: 'admin:account-reports.view', filter: { status: { $in: ['open', 'in_review'] } } },
  { key: 'property-reports', collection: 'property_reports', permission: 'admin:property-reports.view', filter: { status: { $in: ['open', 'in_review'] } } },
  { key: 'request-issues', collection: 'request_issues', permission: 'admin:request-issues.view', filter: { status: 'open' } },
  { key: 'community', collection: 'community_posts', permission: 'admin:community.moderate', filter: { status: 'draft' } },
  { key: 'community-reports', collection: 'community_reports', permission: 'admin:community.moderate', filter: { status: { $in: ['open', 'in_review'] } } },
  { key: 'contact-requests', collection: 'requests', permission: 'admin:requests.view', filter: { status: 'new', type: 'contact' } },
  { key: 'viewing-requests', collection: 'requests', permission: 'admin:viewings.view', filter: { status: 'new', type: 'viewing' } },
  { key: 'search-requests', collection: 'requests', permission: 'admin:requests.view', filter: { status: 'new', type: 'property_search' } },
  { key: 'customer-requests', collection: 'requests', permission: 'admin:requests.view', filter: { status: 'new', type: 'provider_customer' } },
  { key: 'advertising', collection: 'ad_requests', permission: 'admin:ads.view', filter: { status: { $in: ['review', 'waiting_pricing'] } } },
  { key: 'payment-review', collection: 'payment_proofs', permission: 'admin:payments.review', filter: { status: 'pending_review', active: true } }
];

export function createAdminAttentionSource(
  count: (collection: string, filter: Record<string, unknown>, adminId: string, key: AdminAttentionKey) => Promise<number>,
  authorize: (adminId: string, permission: RbacPermission) => Promise<boolean>,
  acknowledge?: (collection: string, filter: Record<string, unknown>, adminId: string, key: AdminAttentionKey, itemId?: string) => Promise<number>
) {
  return {
    async read(adminId: string, permissions?: readonly string[]) {
      const entries = await Promise.all(queues.map(async queue => {
        if (!(permissions ? permissions.includes(queue.permission) : await authorize(adminId, queue.permission))) return undefined;
        return [queue.key, await count(queue.collection, queue.filter, adminId, queue.key)] as const;
      }));
      const counts = Object.fromEntries(entries.filter(entry => entry !== undefined));
      return adminAttentionSchema.parse({ counts, total: Object.values(counts).reduce((sum, value) => sum + value, 0) });
    },
    async markRead(adminId: string, input: AdminAttentionReadRequest, permissions?: readonly string[]): Promise<number> {
      const changes = await Promise.all(queues.map(async queue => {
        if (input.queueKey && queue.key !== input.queueKey) return 0;
        if (!(permissions ? permissions.includes(queue.permission) : await authorize(adminId, queue.permission))) return 0;
        return await acknowledge?.(queue.collection, queue.filter, adminId, queue.key, input.itemId) ?? 0;
      }));
      return changes.reduce((sum, value) => sum + value, 0);
    }
  };
}

export function createMongooseAdminAttentionSource(connection: Connection, authorize: (adminId: string, permission: RbacPermission) => Promise<boolean>) {
  if (!connection.db) throw new Error('Administrator read receipts require a connected database');
  const receipts = connection.db.collection<{ _id: string; revision: unknown; readAt: Date }>('admin_attention_reads');
  const projection = {
    _id: 0,
    itemId: { $toString: { $ifNull: ['$id', '$_id'] } },
    revision: { $ifNull: ['$updatedAt', { $ifNull: ['$createdAt', null] }] }
  };
  const receiptId = (adminId: string, key: AdminAttentionKey, itemId: string) => `${adminId}:${key}:${itemId}`;
  return createAdminAttentionSource(async (collection, filter, adminId, key) => {
    const result = await connection.collection(collection).aggregate([
      { $match: filter }, { $project: projection },
      { $lookup: { from: 'admin_attention_reads', let: { receiptId: { $concat: [`${adminId}:${key}:`, '$itemId'] }, revision: '$revision' }, pipeline: [
        { $match: { $expr: { $and: [{ $eq: ['$_id', '$$receiptId'] }, { $eq: ['$revision', '$$revision'] }] } } },
        { $project: { _id: 1 } }
      ], as: 'readReceipts' } },
      { $match: { 'readReceipts.0': { $exists: false } } }, { $count: 'total' }
    ]).toArray();
    return (result[0]?.total as number | undefined) ?? 0;
  }, authorize, async (collection, filter, adminId, key, itemId) => {
    // Snapshot the actual records, so new arrivals during/after this action stay unread.
    const rows = await connection.collection(collection).aggregate<{ itemId: string; revision: unknown }>([
      { $match: filter }, { $project: projection }, ...(itemId ? [{ $match: { itemId } }] : [])
    ]).toArray();
    if (!rows.length) return 0;
    const result = await receipts.bulkWrite(rows.map(row => ({ updateOne: {
      filter: { _id: receiptId(adminId, key, row.itemId) },
      update: { $set: { revision: row.revision, readAt: new Date() } }, upsert: true
    } })));
    return result.modifiedCount + result.upsertedCount;
  });
}
