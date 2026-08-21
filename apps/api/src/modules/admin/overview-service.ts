import type { AccessTokenClaims } from '../auth/crypto.js';
import {
  adminOverviewDataSchema,
  adminOverviewQuerySchema,
  type AdminOverviewData,
  type AdminOverviewMetrics,
  type AdminOverviewQuery
} from '@sadat-real-estate/contracts';

export interface AdminOverviewAuthorization {
  authorize(adminId: string, permission: 'admin:overview.view'): Promise<boolean>;
}

export interface AdminOverviewAggregationSource {
  aggregate(range: AdminOverviewQuery): Promise<AdminOverviewMetrics>;
}

export interface AdminOverviewService {
  get(claims: AccessTokenClaims, input: unknown): Promise<AdminOverviewData>;
  getOverview(claims: AccessTokenClaims, input: unknown): Promise<AdminOverviewData>;
  read(claims: AccessTokenClaims, input: unknown): Promise<AdminOverviewData>;
}

export interface AdminOverviewServiceDependencies {
  authorization: AdminOverviewAuthorization;
  source: AdminOverviewAggregationSource;
  now?: () => Date;
}

export type AdminOverviewServiceErrorCode = 'ADMIN_OVERVIEW_FORBIDDEN' | 'ADMIN_OVERVIEW_SOURCE_INVALID';

export class AdminOverviewServiceError extends Error {
  constructor(readonly code: AdminOverviewServiceErrorCode) {
    super(code);
    this.name = 'AdminOverviewServiceError';
  }
}

function verifiedAdmin(claims: AccessTokenClaims): void {
  if (claims.role !== 'admin' || claims.status !== 'verified') {
    throw new AdminOverviewServiceError('ADMIN_OVERVIEW_FORBIDDEN');
  }
}

export function createAdminOverviewService(dependencies: AdminOverviewServiceDependencies) {
  const clock = dependencies.now ?? (() => new Date());
  const get = async (claims: AccessTokenClaims, input: unknown): Promise<AdminOverviewData> => {
    verifiedAdmin(claims);
    const range = adminOverviewQuerySchema.parse(input);
    if (!await dependencies.authorization.authorize(claims.sub, 'admin:overview.view')) {
      throw new AdminOverviewServiceError('ADMIN_OVERVIEW_FORBIDDEN');
    }
    let metrics: AdminOverviewMetrics;
    try {
      metrics = adminOverviewDataSchema.shape.metrics.parse(await dependencies.source.aggregate(range));
    } catch {
      throw new AdminOverviewServiceError('ADMIN_OVERVIEW_SOURCE_INVALID');
    }
    return adminOverviewDataSchema.parse({ range, metrics, generatedAt: clock().toISOString() });
  };
  return { get, getOverview: get, read: get };
}
