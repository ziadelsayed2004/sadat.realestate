import type { Connection } from 'mongoose';
import type { AdminOverviewMetrics, AdminOverviewQuery } from '@sadat-real-estate/contracts';
import type { AdminOverviewAggregationSource } from './overview-service.js';
import { createMongooseAdvertisingFinancialSource } from '../reports/advertising-ledger-repository.js';
import { advertisingSummary } from '../reports/advertising-summary.js';

type MongoCollection = ReturnType<Connection['collection']>;
export type AdminOverviewFilter = NonNullable<Parameters<MongoCollection['countDocuments']>[0]>;

export type AdminOverviewCollectionName =
  | 'users'
  | 'properties'
  | 'requests'
  | 'provider_applications'
  | 'projects';

export interface AdminOverviewCountStore {
  count(collection: AdminOverviewCollectionName, filter: AdminOverviewFilter): Promise<number>;
}

function dateRange(field: string, range: AdminOverviewQuery): AdminOverviewFilter {
  return {
    [field]: {
      $gte: new Date(range.from),
      $lt: new Date(range.to)
    }
  };
}

export function createAdminOverviewSource(
  store: AdminOverviewCountStore
): AdminOverviewAggregationSource {
  return {
    async aggregate(range): Promise<AdminOverviewMetrics> {
      const userCreated = dateRange('createdAt', range);
      const updated = dateRange('updatedAt', range);
      const published = dateRange('publishedAt', range);

      const [
        users,
        seekers,
        providers,
        verifiedProviders,
        publishedProperties,
        openRequests,
        pendingProviderApplications,
        pendingProjects,
        pendingProperties
      ] = await Promise.all([
        store.count('users', userCreated),
        store.count('users', { ...userCreated, roleType: 'seeker' }),
        store.count('users', { ...userCreated, roleType: 'provider' }),
        store.count('users', { ...userCreated, roleType: 'provider', status: 'verified' }),
        store.count('properties', { ...published, status: 'published', active: true }),
        store.count('requests', {
          ...dateRange('createdAt', range),
          status: { $nin: ['resolved', 'cancelled', 'closed'] }
        }),
        store.count('provider_applications', { ...updated, status: 'pending_review' }),
        store.count('projects', { ...updated, status: 'pending_review' }),
        store.count('properties', { ...updated, status: 'pending_review' })
      ]);

      return {
        users,
        seekers,
        providers,
        verifiedProviders,
        publishedProperties,
        openRequests,
        pendingReviews: pendingProviderApplications + pendingProjects + pendingProperties
      };
    }
  };
}

export function createMongooseAdminOverviewSource(
  connection: Connection
): AdminOverviewAggregationSource {
  const base = createAdminOverviewSource({
    count(collection, filter) {
      return connection.collection(collection).countDocuments(filter);
    }
  });
  const financial = createMongooseAdvertisingFinancialSource(connection);
  return { async aggregate(range) {
    const [metrics, records, adRequests, paymentProofs, activeAds, publishedArticles, communityPosts, communityComments, contentReports] = await Promise.all([
      base.aggregate(range), financial.list(),
      connection.collection('ad_requests').countDocuments(dateRange('createdAt', range)),
      connection.collection('payment_proofs').countDocuments({ ...dateRange('uploadedAt', range), active: true }),
      connection.collection('ad_banners').countDocuments({ status: { $in: ['active', 'scheduled'] }, startAt: { $lte: new Date() }, endAt: { $gt: new Date() } }),
      connection.collection('articles').countDocuments({ ...dateRange('publishedAt', range), status: 'published' }),
      connection.collection('community_posts').countDocuments({ ...dateRange('createdAt', range), status: 'published' }),
      connection.collection('community_comments').countDocuments(dateRange('createdAt', range)),
      connection.collection('community_reports').countDocuments(dateRange('createdAt', range))
    ]);
    const summary = advertisingSummary(records, range);
    return { ...metrics, adRequests, paymentProofs, activeAds, publishedArticles, communityPosts, communityComments, contentReports, approvedAdPaymentsMinor: summary.totals.find(item => item.currency === 'EGP')?.amountMinor ?? 0 };
  } };
}
