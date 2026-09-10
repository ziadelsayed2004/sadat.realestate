import {
  providerDashboardDataSchema,
  type ProviderDashboardData
} from '@sadat-real-estate/contracts';
import type { AccessTokenClaims } from '../auth/crypto.js';
import type { PropertyService } from '../properties/service.js';
import type { createRequestService } from '../requests/service.js';
import type { createViewingService } from '../viewings/service.js';
import type { ProviderService } from './service.js';

export interface ProviderDashboardDependencies {
  application: Pick<ProviderService, 'getStatus'>;
  properties: Pick<PropertyService, 'list'>;
  requests: Pick<ReturnType<typeof createRequestService>, 'list'>;
  viewings: Pick<ReturnType<typeof createViewingService>, 'list'>;
}

const emptyProperties = Object.freeze({ total: 0, published: 0, pendingReview: 0, needsChanges: 0, drafts: 0, recent: [] });

export function createProviderDashboardService(dependencies: ProviderDashboardDependencies) {
  return {
    async read(claims: AccessTokenClaims): Promise<ProviderDashboardData> {
      const application = await dependencies.application.getStatus(claims);
      if (claims.role !== 'provider' || claims.status !== 'verified' || application.status !== 'approved') {
        return providerDashboardDataSchema.parse({ application, properties: emptyProperties, activity: { customerRequests: 0, bookedViewings: 0 } });
      }
      const query = (status?: 'published' | 'pending_review' | 'needs_changes' | 'draft', limit = 1) => ({
        page: 1, limit, sort: 'updatedAt' as const, direction: 'desc' as const, ...(status ? { status } : {})
      });
      const [all, published, pendingReview, needsChanges, drafts, customerRequests, bookedViewings] = await Promise.all([
        dependencies.properties.list(claims, query(undefined, 5)),
        dependencies.properties.list(claims, query('published')),
        dependencies.properties.list(claims, query('pending_review')),
        dependencies.properties.list(claims, query('needs_changes')),
        dependencies.properties.list(claims, query('draft')),
        dependencies.requests.list(claims, { page: 1, limit: 1, source: 'provider', type: 'provider_customer' }),
        dependencies.viewings.list(claims, { page: 1, limit: 1, status: 'confirmed' })
      ]);
      return providerDashboardDataSchema.parse({
        application,
        properties: {
          total: all.total,
          published: published.total,
          pendingReview: pendingReview.total,
          needsChanges: needsChanges.total,
          drafts: drafts.total,
          recent: all.data.items
        },
        activity: { customerRequests: customerRequests.total, bookedViewings: bookedViewings.total }
      });
    }
  };
}

export type ProviderDashboardService = ReturnType<typeof createProviderDashboardService>;
