import type { Connection } from 'mongoose';
import { seekerOverviewDataSchema, type SeekerOverviewData } from '@sadat-real-estate/contracts';
import type { AccessTokenClaims } from '../auth/crypto.js';

export interface SeekerOverviewRepository { summary(seekerId: string): Promise<SeekerOverviewData> }
export interface SeekerOverviewService { get(claims: AccessTokenClaims): Promise<SeekerOverviewData> }
export class SeekerOverviewServiceError extends Error {
  readonly code = 'SEEKER_OVERVIEW_FORBIDDEN' as const;

  constructor() {
    super('SEEKER_OVERVIEW_FORBIDDEN');
    this.name = 'SeekerOverviewServiceError';
  }
}
function authorized(claims: AccessTokenClaims): boolean { return claims.role === 'seeker' && !['rejected', 'suspended'].includes(claims.status); }
export function createSeekerOverviewService(dependencies: { repository: SeekerOverviewRepository }): SeekerOverviewService {
  return { async get(claims) { if (!authorized(claims)) throw new SeekerOverviewServiceError(); return seekerOverviewDataSchema.parse(await dependencies.repository.summary(claims.sub)); } };
}
export function createMongooseSeekerOverviewRepository(connection: Connection): SeekerOverviewRepository {
  return { async summary(seekerId) {
    const owner = { seekerId };
    const recipient = { recipientId: seekerId };
    const [requests, viewings, savedProperties, notifications, unreadNotifications] = await Promise.all([
      connection.collection('requests').countDocuments(owner),
      connection.collection('viewings').countDocuments(owner),
      connection.collection('favorites').countDocuments(owner),
      connection.collection('notifications').countDocuments(recipient),
      connection.collection('notifications').countDocuments({
        ...recipient,
        $or: [{ readAt: null }, { readAt: { $exists: false } }]
      })
    ]);
    return seekerOverviewDataSchema.parse({ requests, viewings, savedProperties, notifications, unreadNotifications });
  } };
}
