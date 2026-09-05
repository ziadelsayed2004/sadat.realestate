import { Types, type Connection } from 'mongoose';
import {
  seekerOverviewDataSchema,
  seekerOverviewNotificationSchema,
  seekerOverviewRequestSchema,
  seekerOverviewViewingSchema,
  type SeekerOverviewData,
  type SeekerOverviewNotification,
  type SeekerOverviewRequest,
  type SeekerOverviewViewing
} from '@sadat-real-estate/contracts';
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

type Row = Record<string, unknown>;

function id(value: unknown): string | undefined {
  if (typeof value === 'string' && /^[a-f0-9]{24}$/u.test(value)) return value;
  if (value && typeof value === 'object' && typeof (value as { toHexString?: () => string }).toHexString === 'function') {
    const result = (value as { toHexString: () => string }).toHexString();
    return /^[a-f0-9]{24}$/u.test(result) ? result : undefined;
  }
  return undefined;
}

function date(value: unknown): string | undefined {
  return value instanceof Date && Number.isFinite(value.getTime()) ? value.toISOString() : undefined;
}

function requestProjection(row: Row): SeekerOverviewRequest | undefined {
  const requestId = id(row._id);
  const createdAt = date(row.createdAt);
  const updatedAt = date(row.updatedAt);
  if (!requestId || typeof row.type !== 'string' || typeof row.status !== 'string' || !createdAt || !updatedAt) return undefined;
  const propertyId = id(row.propertyId);
  const payload = row.payload && typeof row.payload === 'object' && !Array.isArray(row.payload)
    ? row.payload as Record<string, unknown>
    : {};
  const parsed = seekerOverviewRequestSchema.safeParse({
    id: requestId,
    type: row.type,
    status: row.status,
    ...(propertyId === undefined ? {} : { propertyId }),
    payload,
    createdAt,
    updatedAt
  });
  return parsed.success ? parsed.data : undefined;
}

function viewingProjection(row: Row): SeekerOverviewViewing | undefined {
  const viewingId = id(row._id);
  const propertyId = id(row.propertyId);
  const requestedAt = date(row.requestedAt);
  if (!viewingId || !propertyId || !requestedAt || typeof row.status !== 'string' || typeof row.timezone !== 'string') return undefined;
  const parsed = seekerOverviewViewingSchema.safeParse({
    id: viewingId,
    propertyId,
    status: row.status,
    requestedAt,
    timezone: row.timezone,
    ...(typeof row.note === 'string' ? { note: row.note } : {})
  });
  return parsed.success ? parsed.data : undefined;
}

function notificationProjection(row: Row): SeekerOverviewNotification | undefined {
  const notificationId = id(row._id);
  const createdAt = date(row.createdAt);
  if (!notificationId || !createdAt || typeof row.type !== 'string' || row.title === undefined) return undefined;
  const readAt = row.readAt === null || row.readAt === undefined ? null : date(row.readAt);
  if (readAt === undefined) return undefined;
  const parsed = seekerOverviewNotificationSchema.safeParse({
    id: notificationId,
    type: row.type,
    title: row.title,
    ...(row.message === undefined ? {} : { message: row.message }),
    ...(typeof row.link === 'string' ? { link: row.link } : {}),
    readAt,
    createdAt
  });
  return parsed.success ? parsed.data : undefined;
}

const activeRequestStatuses = ['new', 'under_review', 'contacted', 'scheduled', 'needs_information', 'in_progress'] as const;

export function createMongooseSeekerOverviewRepository(connection: Connection): SeekerOverviewRepository {
  return { async summary(seekerId) {
    // All seeker-owned collections persist references as ObjectIds.  Using the
    // string claim here silently returned zeroes in production even when the
    // account had real requests, viewings or saved properties.
    const seekerObjectId = new Types.ObjectId(seekerId);
    const owner = { seekerId: seekerObjectId };
    const recipient = { recipientId: seekerObjectId };
    const requestsCollection = connection.collection('requests');
    const viewingsCollection = connection.collection('viewings');
    const notificationsCollection = connection.collection('notifications');
    const [requests, activeRequests, viewings, savedProperties, notifications, unreadNotifications] = await Promise.all([
      requestsCollection.countDocuments(owner),
      requestsCollection.countDocuments({ ...owner, status: { $in: activeRequestStatuses } }),
      viewingsCollection.countDocuments(owner),
      connection.collection('favorites').countDocuments(owner),
      notificationsCollection.countDocuments(recipient),
      notificationsCollection.countDocuments({
        ...recipient,
        $or: [{ readAt: null }, { readAt: { $exists: false } }]
      })
    ]);
    const [requestRows, viewingRows, notificationRows] = await Promise.all([
      requestsCollection.find(owner, { projection: { _id: 1, type: 1, status: 1, propertyId: 1, payload: 1, createdAt: 1, updatedAt: 1 } }).sort({ updatedAt: -1, _id: -1 }).limit(3).toArray(),
      viewingsCollection.find({ ...owner, status: { $in: ['requested', 'confirmed', 'rescheduled'] } }, { projection: { _id: 1, propertyId: 1, status: 1, requestedAt: 1, timezone: 1, note: 1 } }).sort({ requestedAt: 1, _id: 1 }).limit(3).toArray(),
      notificationsCollection.find(recipient, { projection: { _id: 1, type: 1, title: 1, message: 1, link: 1, readAt: 1, createdAt: 1 } }).sort({ createdAt: -1, _id: -1 }).limit(3).toArray()
    ]);
    return seekerOverviewDataSchema.parse({
      requests,
      activeRequests,
      viewings,
      savedProperties,
      notifications,
      unreadNotifications,
      recentRequests: requestRows.flatMap(row => { const value = requestProjection(row as Row); return value ? [value] : []; }),
      upcomingViewings: viewingRows.flatMap(row => { const value = viewingProjection(row as Row); return value ? [value] : []; }),
      recentNotifications: notificationRows.flatMap(row => { const value = notificationProjection(row as Row); return value ? [value] : []; })
    });
  } };
}
