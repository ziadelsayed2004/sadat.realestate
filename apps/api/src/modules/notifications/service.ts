import type { AccessTokenClaims } from '../auth/crypto.js';
import {
  adminNotificationListDataSchema,
  adminNotificationListQuerySchema,
  adminNotificationReadAllDataSchema,
  adminNotificationReadDataSchema,
  notificationDataSchema,
  notificationIdSchema,
  notificationListDataSchema,
  notificationListQuerySchema,
  notificationReadAllDataSchema,
  notificationReadDataSchema,
  type NotificationData,
  type NotificationAudience,
  type NotificationListData,
  type NotificationListQuery,
  type NotificationPermission,
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
  audience?: NotificationAudience;
  requiredPermission?: NotificationPermission;
}

export interface NotificationRepository {
  list(recipientId: string, query: NotificationListQuery, audience?: NotificationAudience, permittedPermissions?: readonly string[]): Promise<{ items: NotificationSource[]; total: number; unreadCount: number }>;
  findById(recipientId: string, notificationId: string, audience?: NotificationAudience, permittedPermissions?: readonly string[]): Promise<NotificationSource | undefined>;
  markRead(recipientId: string, notificationId: string, now: Date, audience?: NotificationAudience, permittedPermissions?: readonly string[]): Promise<NotificationSource | undefined>;
  markAllRead(recipientId: string, now: Date, audience?: NotificationAudience, permittedPermissions?: readonly string[]): Promise<number>;
}

export interface NotificationAuthorization {
  authorize(adminId: string, permission: string): Promise<boolean>;
  permissions?(adminId: string): Promise<readonly string[]>;
}

export interface NotificationServiceDependencies {
  repository: NotificationRepository;
  authorization?: NotificationAuthorization;
  now?: () => Date;
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

function activeAdmin(claims: AccessTokenClaims): boolean {
  return claims.role === 'admin' && claims.status === 'verified';
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

export function createNotificationService(dependencies: NotificationServiceDependencies) {
  const now = dependencies.now ?? (() => new Date());
  const authorizeAdmin = async (claims: AccessTokenClaims): Promise<void> => {
    if (!activeAdmin(claims)) throw new NotificationServiceError('NOTIFICATION_FORBIDDEN');
  };
  const projectAdmin = async (
    claims: AccessTokenClaims,
    item: NotificationSource
  ): Promise<NotificationData | undefined> => {
    const required = item.requiredPermission;
    if (required && !await dependencies.authorization?.authorize(claims.sub, required)) {
      return undefined;
    }
    return project(item);
  };
  return {
    async list(claims: AccessTokenClaims, unparsedQuery: unknown): Promise<NotificationListData> {
      authorize(claims);
      const query = notificationListQuerySchema.parse(unparsedQuery);
      const result = await dependencies.repository.list(claims.sub, query, 'seeker');
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
      const source = await dependencies.repository.markRead(claims.sub, id, changedAt, 'seeker');
      if (!source) throw new NotificationServiceError('NOTIFICATION_NOT_FOUND');
      return notificationReadDataSchema.parse({ id, readAt: source.readAt?.toISOString() ?? changedAt.toISOString() });
    },

    async markAllRead(claims: AccessTokenClaims): Promise<NotificationReadAllData> {
      authorize(claims);
      return notificationReadAllDataSchema.parse({ updatedCount: await dependencies.repository.markAllRead(claims.sub, now(), 'seeker') });
    },

    async listAdmin(claims: AccessTokenClaims, unparsedQuery: unknown): Promise<NotificationListData> {
      await authorizeAdmin(claims);
      const query = adminNotificationListQuerySchema.parse(unparsedQuery) as NotificationListQuery;
      const permittedPermissions = await dependencies.authorization?.permissions?.(claims.sub);
      const result = await dependencies.repository.list(claims.sub, query, 'admin', permittedPermissions);
      const items = (await Promise.all(result.items.map(item => projectAdmin(claims, item))))
        .filter((item): item is NotificationData => item !== undefined);
      return adminNotificationListDataSchema.parse({
        items,
        unreadCount: result.unreadCount,
        page: query.page,
        limit: query.limit,
        total: result.total
      });
    },

    async markAdminRead(claims: AccessTokenClaims, unparsedId: unknown): Promise<NotificationReadData> {
      await authorizeAdmin(claims);
      const id = notificationIdSchema.parse(unparsedId);
      const changedAt = now();
      const permittedPermissions = await dependencies.authorization?.permissions?.(claims.sub);
      const existing = await dependencies.repository.findById(claims.sub, id, 'admin', permittedPermissions);
      if (!existing) throw new NotificationServiceError('NOTIFICATION_NOT_FOUND');
      if (existing.requiredPermission && !await dependencies.authorization?.authorize(claims.sub, existing.requiredPermission)) {
        throw new NotificationServiceError('NOTIFICATION_NOT_FOUND');
      }
      const source = await dependencies.repository.markRead(claims.sub, id, changedAt, 'admin', permittedPermissions);
      if (!source) throw new NotificationServiceError('NOTIFICATION_NOT_FOUND');
      return adminNotificationReadDataSchema.parse({ id, readAt: source.readAt?.toISOString() ?? changedAt.toISOString() });
    },

    async markAllAdminRead(claims: AccessTokenClaims): Promise<NotificationReadAllData> {
      await authorizeAdmin(claims);
      const permittedPermissions = await dependencies.authorization?.permissions?.(claims.sub);
      return adminNotificationReadAllDataSchema.parse({ updatedCount: await dependencies.repository.markAllRead(claims.sub, now(), 'admin', permittedPermissions ?? []) });
    }
  };
}

export const createAdminNotificationService = createNotificationService;
