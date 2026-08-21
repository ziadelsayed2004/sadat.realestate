import type { Connection } from 'mongoose';
import type { AdminOverviewMetrics, AdminOverviewQuery } from '@sadat-real-estate/contracts';
import type { AdminOverviewAggregationSource } from './overview-service.js';

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
  return createAdminOverviewSource({
    count(collection, filter) {
      return connection.collection(collection).countDocuments(filter);
    }
  });
}
