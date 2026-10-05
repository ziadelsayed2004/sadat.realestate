import type { Connection } from 'mongoose';
import { adminAttentionSchema, type AdminAttention, type AdminAttentionKey, type RbacPermission } from '@sadat-real-estate/contracts';

// Count the actual review queues, including submissions made before notifications
// existed. Each queue uses the permission of its destination page.
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
  count: (collection: string, filter: Record<string, unknown>) => Promise<number>,
  authorize: (adminId: string, permission: RbacPermission) => Promise<boolean>
): { read(adminId: string, permissions?: readonly string[]): Promise<AdminAttention> } {
  return {
    async read(adminId, permissions) {
      const entries = await Promise.all(queues.map(async queue => {
        if (!(permissions ? permissions.includes(queue.permission) : await authorize(adminId, queue.permission))) return undefined;
        return [queue.key, await count(queue.collection, queue.filter)] as const;
      }));
      const counts = Object.fromEntries(entries.filter(entry => entry !== undefined));
      return adminAttentionSchema.parse({ counts, total: Object.values(counts).reduce((sum, value) => sum + value, 0) });
    }
  };
}

export function createMongooseAdminAttentionSource(connection: Connection, authorize: (adminId: string, permission: RbacPermission) => Promise<boolean>) {
  return createAdminAttentionSource((collection, filter) => connection.collection(collection).countDocuments(filter), authorize);
}
