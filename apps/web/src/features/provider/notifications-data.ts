import {
  notificationIdSchema,
  notificationListSuccessEnvelopeSchema,
  notificationReadAllSuccessEnvelopeSchema,
  notificationReadSuccessEnvelopeSchema,
  type NotificationListData,
  type NotificationListQuery,
  type NotificationReadAllData,
  type NotificationReadData
} from '@sadat-real-estate/contracts';
import { ApiClient, ApiClientError, type ApiClientOptions, type ApiRequestOptions } from '../contracts/index.ts';
import type { ProviderAuthorizationSource } from './data.ts';

export const PROVIDER_NOTIFICATIONS_ROUTE = '/provider/notifications' as const;
export const PROVIDER_NOTIFICATIONS_PAGE_LIMIT = 20 as const;

export interface ProviderNotificationsLoadOptions {
  readonly apiClient?: ApiClient | undefined;
  readonly apiOrigin?: string | undefined;
  readonly authorization?: ProviderAuthorizationSource | undefined;
  readonly query?: NotificationListQuery | undefined;
  readonly signal?: AbortSignal | undefined;
}

export type ProviderNotificationsLoader = (query: NotificationListQuery, signal?: AbortSignal) => Promise<NotificationListData>;

export interface ProviderNotificationActions {
  markRead(notificationId: string, signal?: AbortSignal): Promise<NotificationReadData>;
  markAllRead(signal?: AbortSignal): Promise<NotificationReadAllData>;
}

export interface ProviderNotificationsMutationOptions {
  readonly apiClient?: ApiClient | undefined;
  readonly apiOrigin?: string | undefined;
  readonly authorization?: ProviderAuthorizationSource | undefined;
}

function clientFor(options: Pick<ProviderNotificationsLoadOptions, 'apiClient' | 'apiOrigin'>): ApiClient {
  if (options.apiClient !== undefined) return options.apiClient;
  const clientOptions: ApiClientOptions = options.apiOrigin === undefined ? {} : { baseUrl: options.apiOrigin };
  return new ApiClient(clientOptions);
}

function authorizationHeaders(source: ProviderAuthorizationSource | undefined): HeadersInit | undefined {
  const authorization = source?.getAuthorizationHeader();
  return authorization === undefined ? undefined : { authorization };
}

async function requestWithSession<T>(options: ProviderNotificationsMutationOptions, path: string, request: ApiRequestOptions<T>) {
  const run = () => clientFor(options).request(path, { ...request, headers: { ...request.headers, ...authorizationHeaders(options.authorization) } });
  try { return await run(); } catch (error) {
    if (!(error instanceof ApiClientError) || ![401, 403].includes(error.status ?? 0) || !options.authorization?.refresh || request.signal?.aborted) throw error;
    await options.authorization.refresh();
    if (!options.authorization.getAuthorizationHeader() || request.signal?.aborted) throw error;
    return run();
  }
}

function notificationQuery(query: NotificationListQuery | undefined): Readonly<Record<string, string | number | boolean | undefined>> | undefined {
  if (query === undefined) return undefined;
  return {
    page: query.page,
    limit: query.limit,
    unreadOnly: query.unreadOnly,
    ...(query.type === undefined ? {} : { type: query.type })
  };
}

export async function loadProviderNotifications(options: ProviderNotificationsLoadOptions = {}): Promise<NotificationListData> {
  const query = notificationQuery(options.query);
  const response = await requestWithSession(options, PROVIDER_NOTIFICATIONS_ROUTE, {
    responseSchema: notificationListSuccessEnvelopeSchema,
    ...(query === undefined ? {} : { query }),
    ...(options.signal === undefined ? {} : { signal: options.signal })
  });
  return response.data.data;
}

export function createProviderNotificationsLoader(
  options: Omit<ProviderNotificationsLoadOptions, 'query' | 'signal'> = {}
): ProviderNotificationsLoader {
  return (query, signal) => loadProviderNotifications({ ...options, query, ...(signal === undefined ? {} : { signal }) });
}

export const defaultProviderNotificationsLoader = createProviderNotificationsLoader();

export function createProviderNotificationActions(options: ProviderNotificationsMutationOptions = {}): ProviderNotificationActions {
  const requestOptions = (signal?: AbortSignal) => ({
    method: 'POST' as const,
    responseSchema: notificationReadSuccessEnvelopeSchema,
    ...(signal === undefined ? {} : { signal })
  });
  return {
    async markRead(notificationId, signal) {
      const id = notificationIdSchema.parse(notificationId);
      const response = await requestWithSession(options, `${PROVIDER_NOTIFICATIONS_ROUTE}/${encodeURIComponent(id)}/read`, requestOptions(signal));
      return response.data.data;
    },
    async markAllRead(signal) {
      const response = await requestWithSession(options, `${PROVIDER_NOTIFICATIONS_ROUTE}/read-all`, {
        ...requestOptions(signal),
        responseSchema: notificationReadAllSuccessEnvelopeSchema
      });
      return response.data.data;
    }
  };
}

export const defaultProviderNotificationActions = createProviderNotificationActions();
