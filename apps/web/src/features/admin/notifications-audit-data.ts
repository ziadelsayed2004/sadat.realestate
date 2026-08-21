import {
  adminNotificationListQuerySchema,
  adminNotificationListSuccessEnvelopeSchema,
  adminNotificationReadAllSuccessEnvelopeSchema,
  adminNotificationReadSuccessEnvelopeSchema,
  auditLogIdParamsSchema,
  auditLogListQuerySchema,
  auditLogListSuccessEnvelopeSchema,
  auditLogSuccessEnvelopeSchema,
  notificationIdSchema,
  type AuditLogData,
  type AuditLogListData,
  type AuditLogListQuery,
  type NotificationListData,
  type NotificationListQuery,
  type NotificationReadAllData,
  type NotificationReadData
} from '@sadat-real-estate/contracts';
import { ApiClient, type ApiClientOptions } from '../contracts/index.ts';
import type { AdminAuthorizationSource } from './data.ts';

export const ADMIN_NOTIFICATIONS_ROUTE = '/admin/notifications' as const;
export const ADMIN_AUDIT_LOGS_ROUTE = '/admin/audit-logs' as const;
export const ADMIN_NOTIFICATIONS_PAGE_LIMIT = 20 as const;
export const ADMIN_AUDIT_LOGS_PAGE_LIMIT = 25 as const;

export interface AdminNotificationsLoadOptions {
  readonly apiClient?: ApiClient | undefined;
  readonly apiOrigin?: string | undefined;
  readonly authorization?: AdminAuthorizationSource | undefined;
  readonly query?: NotificationListQuery | undefined;
  readonly signal?: AbortSignal | undefined;
}

export interface AdminAuditLogsLoadOptions {
  readonly apiClient?: ApiClient | undefined;
  readonly apiOrigin?: string | undefined;
  readonly authorization?: AdminAuthorizationSource | undefined;
  readonly query?: AuditLogListQuery | undefined;
  readonly signal?: AbortSignal | undefined;
}

export interface AdminAuditLogDetailLoadOptions {
  readonly apiClient?: ApiClient | undefined;
  readonly apiOrigin?: string | undefined;
  readonly authorization?: AdminAuthorizationSource | undefined;
  readonly signal?: AbortSignal | undefined;
}

export type AdminNotificationsLoader = (query: NotificationListQuery, signal?: AbortSignal) => Promise<NotificationListData>;
export type AdminAuditLogsLoader = (query: AuditLogListQuery, signal?: AbortSignal) => Promise<AdminAuditLogPage>;
export type AdminAuditLogLoader = (auditId: string, signal?: AbortSignal) => Promise<AuditLogData>;

export interface AdminAuditLogPage extends AuditLogListData {
  readonly page: number;
  readonly limit: number;
  readonly total: number;
}

export interface AdminNotificationActions {
  markRead(notificationId: string, signal?: AbortSignal): Promise<NotificationReadData>;
  markAllRead(signal?: AbortSignal): Promise<NotificationReadAllData>;
}

interface CommonOptions {
  readonly apiClient?: ApiClient | undefined;
  readonly apiOrigin?: string | undefined;
  readonly authorization?: AdminAuthorizationSource | undefined;
}

function clientFor(options: Pick<CommonOptions, 'apiClient' | 'apiOrigin'>): ApiClient {
  if (options.apiClient !== undefined) return options.apiClient;
  const clientOptions: ApiClientOptions = options.apiOrigin === undefined ? {} : { baseUrl: options.apiOrigin };
  return new ApiClient(clientOptions);
}

function authorizationHeaders(source: AdminAuthorizationSource | undefined): HeadersInit | undefined {
  const authorization = source?.getAuthorizationHeader();
  return authorization === undefined ? undefined : { authorization };
}

function requestOptions(options: CommonOptions & { readonly signal?: AbortSignal | undefined }): { readonly headers?: HeadersInit; readonly signal?: AbortSignal } {
  const headers = authorizationHeaders(options.authorization);
  return {
    ...(headers === undefined ? {} : { headers }),
    ...(options.signal === undefined ? {} : { signal: options.signal })
  };
}

export async function loadAdminNotifications(options: AdminNotificationsLoadOptions = {}): Promise<NotificationListData> {
  const query = adminNotificationListQuerySchema.parse({
    page: 1,
    limit: ADMIN_NOTIFICATIONS_PAGE_LIMIT,
    unreadOnly: false,
    ...(options.query ?? {})
  });
  const response = await clientFor(options).request(ADMIN_NOTIFICATIONS_ROUTE, {
    responseSchema: adminNotificationListSuccessEnvelopeSchema,
    query,
    ...requestOptions(options)
  });
  return response.data.data;
}

export function createAdminNotificationsLoader(options: Omit<AdminNotificationsLoadOptions, 'query' | 'signal'> = {}): AdminNotificationsLoader {
  return (query, signal) => loadAdminNotifications({ ...options, query, ...(signal === undefined ? {} : { signal }) });
}

export async function loadAdminAuditLogs(options: AdminAuditLogsLoadOptions = {}): Promise<AdminAuditLogPage> {
  const query = auditLogListQuerySchema.parse({
    page: 1,
    limit: ADMIN_AUDIT_LOGS_PAGE_LIMIT,
    ...(options.query ?? {})
  });
  const response = await clientFor(options).request(ADMIN_AUDIT_LOGS_ROUTE, {
    responseSchema: auditLogListSuccessEnvelopeSchema,
    query,
    ...requestOptions(options)
  });
  return {
    ...response.data.data,
    page: response.data.meta.page ?? query.page,
    limit: response.data.meta.limit ?? query.limit,
    total: response.data.meta.total ?? response.data.data.items.length
  };
}

export function createAdminAuditLogsLoader(options: Omit<AdminAuditLogsLoadOptions, 'query' | 'signal'> = {}): AdminAuditLogsLoader {
  return (query, signal) => loadAdminAuditLogs({ ...options, query, ...(signal === undefined ? {} : { signal }) });
}

export async function loadAdminAuditLog(auditId: string, options: AdminAuditLogDetailLoadOptions = {}): Promise<AuditLogData> {
  const id = auditLogIdParamsSchema.parse({ auditId }).auditId;
  const response = await clientFor(options).request(`${ADMIN_AUDIT_LOGS_ROUTE}/${encodeURIComponent(id)}`, {
    responseSchema: auditLogSuccessEnvelopeSchema,
    ...requestOptions(options)
  });
  return response.data.data;
}

export function createAdminAuditLogLoader(options: Omit<AdminAuditLogDetailLoadOptions, 'signal'> = {}): AdminAuditLogLoader {
  return (auditId, signal) => loadAdminAuditLog(auditId, { ...options, ...(signal === undefined ? {} : { signal }) });
}

export function createAdminNotificationActions(options: CommonOptions = {}): AdminNotificationActions {
  const client = clientFor(options);
  const headers = authorizationHeaders(options.authorization);
  return {
    async markRead(notificationId, signal) {
      const id = notificationIdSchema.parse(notificationId);
      const response = await client.request(`${ADMIN_NOTIFICATIONS_ROUTE}/${encodeURIComponent(id)}/read`, {
        method: 'POST',
        responseSchema: adminNotificationReadSuccessEnvelopeSchema,
        ...(headers === undefined ? {} : { headers }),
        ...(signal === undefined ? {} : { signal })
      });
      return response.data.data;
    },
    async markAllRead(signal) {
      const response = await client.request(`${ADMIN_NOTIFICATIONS_ROUTE}/read-all`, {
        method: 'POST',
        responseSchema: adminNotificationReadAllSuccessEnvelopeSchema,
        ...(headers === undefined ? {} : { headers }),
        ...(signal === undefined ? {} : { signal })
      });
      return response.data.data;
    }
  };
}

export const defaultAdminNotificationsLoader = createAdminNotificationsLoader();
export const defaultAdminAuditLogsLoader = createAdminAuditLogsLoader();
export const defaultAdminAuditLogLoader = createAdminAuditLogLoader();
export const defaultAdminNotificationActions = createAdminNotificationActions();
