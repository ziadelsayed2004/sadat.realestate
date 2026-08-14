import type { AccessTokenClaims } from '../auth/crypto.js';
import {
  notificationDataSchema,
  notificationIdSchema,
  notificationListDataSchema,
  notificationListQuerySchema,
  notificationReadAllDataSchema,
  notificationReadDataSchema,
  type NotificationData,
  type NotificationListData,
  type NotificationListQuery,
  type NotificationReadAllData,
  type NotificationReadData
} from '@sadat-real-estate/contracts';

export interface NotificationSource {
  id: string;
  type: string;
  title: unknown;
  message?: unknown;
  link?: string;
  readAt: Date | null;
  createdAt: Date;
}

export interface NotificationRepository {
  list(recipientId: string, query: NotificationListQuery): Promise<{ items: NotificationSource[]; total: number; unreadCount: number }>;
  markRead(recipientId: string, notificationId: string, now: Date): Promise<NotificationSource | undefined>;
  markAllRead(recipientId: string, now: Date): Promise<number>;
}

export type NotificationServiceErrorCode = 'NOTIFICATION_FORBIDDEN' | 'NOTIFICATION_NOT_FOUND';

export class NotificationServiceError extends Error {
  constructor(readonly code: NotificationServiceErrorCode) {
    super(code);
    this.name = 'NotificationServiceError';
  }
}

function activeSeeker(claims: AccessTokenClaims): boolean {
  return claims.role === 'seeker' && !['rejected', 'suspended'].includes(claims.status);
}

function project(source: NotificationSource): NotificationData | undefined {
  const parsed = notificationDataSchema.safeParse({
    id: source.id,
    type: source.type,
    title: source.title,
    ...(source.message !== undefined ? { message: source.message } : {}),
    ...(source.link !== undefined ? { link: source.link } : {}),
    readAt: source.readAt?.toISOString() ?? null,
    createdAt: source.createdAt.toISOString()
  });
  return parsed.success ? parsed.data : undefined;
}

function authorize(claims: AccessTokenClaims): void {
  if (!activeSeeker(claims)) throw new NotificationServiceError('NOTIFICATION_FORBIDDEN');
}

export function createNotificationService(dependencies: { repository: NotificationRepository; now?: () => Date }) {
  const now = dependencies.now ?? (() => new Date());
  return {
    async list(claims: AccessTokenClaims, unparsedQuery: unknown): Promise<NotificationListData> {
      authorize(claims);
      const query = notificationListQuerySchema.parse(unparsedQuery);
      const result = await dependencies.repository.list(claims.sub, query);
      const items = result.items.flatMap(item => {
        const value = project(item);
        return value ? [value] : [];
      });
      return notificationListDataSchema.parse({ items, unreadCount: result.unreadCount, page: query.page, limit: query.limit, total: result.total });
    },

    async markRead(claims: AccessTokenClaims, unparsedId: unknown): Promise<NotificationReadData> {
      authorize(claims);
      const id = notificationIdSchema.parse(unparsedId);
      const changedAt = now();
      const source = await dependencies.repository.markRead(claims.sub, id, changedAt);
      if (!source) throw new NotificationServiceError('NOTIFICATION_NOT_FOUND');
      return notificationReadDataSchema.parse({ id, readAt: source.readAt?.toISOString() ?? changedAt.toISOString() });
    },

    async markAllRead(claims: AccessTokenClaims): Promise<NotificationReadAllData> {
      authorize(claims);
      return notificationReadAllDataSchema.parse({ updatedCount: await dependencies.repository.markAllRead(claims.sub, now()) });
    }
  };
}
