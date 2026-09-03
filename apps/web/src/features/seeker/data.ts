import {
  favoriteListDataSchema,
  favoriteRemoveDataSchema,
  favoriteSaveDataSchema,
  favoritePropertyParamsSchema,
  notificationIdSchema,
  notificationListSuccessEnvelopeSchema,
  notificationReadAllSuccessEnvelopeSchema,
  notificationReadSuccessEnvelopeSchema,
  passwordChangeRequestSchema,
  passwordChangeSuccessEnvelopeSchema,
  requestDataSchema,
  requestListDataSchema,
  requestTransitionRequestSchema,
  seekerPreferencesPatchSchema,
  seekerPreferencesSuccessEnvelopeSchema,
  seekerOverviewSuccessEnvelopeSchema,
  seekerProfilePatchSchema,
  seekerProfileSuccessEnvelopeSchema,
  successEnvelopeSchema,
  viewingCreateSchema,
  viewingDataSchema,
  viewingListDataSchema,
  viewingPatchSchema,
  type RequestData,
  type RequestListData,
  type RequestListQuery,
  type RequestTransitionRequest,
  type FavoriteListData,
  type FavoriteListQuery,
  type FavoriteRemoveData,
  type FavoriteSaveData,
  type NotificationListData,
  type NotificationListQuery,
  type NotificationReadAllData,
  type NotificationReadData,
  type PasswordChangeRequest,
  type SeekerPreferencesData,
  type SeekerPreferencesPatch,
  type SeekerOverviewData,
  type SeekerProfileData,
  type SeekerProfilePatch,
  type SupportedLocale,
  type ViewingCreate,
  type ViewingData,
  type ViewingListData,
  type ViewingListQuery,
  type ViewingPatch
} from '@sadat-real-estate/contracts';
import { ApiClient, type ApiClientOptions } from '../contracts/index.ts';
import type { RouteSession } from '../routing/index.ts';

export const SEEKER_OVERVIEW_ROUTE = '/seeker/overview' as const;
export const SEEKER_REQUESTS_ROUTE = '/seeker/requests' as const;
export const SEEKER_VIEWINGS_ROUTE = '/seeker/viewings' as const;
export const SEEKER_FAVORITES_ROUTE = '/seeker/favorites' as const;
export const SEEKER_NOTIFICATIONS_ROUTE = '/seeker/notifications' as const;
export const SEEKER_PROFILE_ROUTE = '/me' as const;
export const SEEKER_PREFERENCES_ROUTE = '/me/preferences' as const;

export interface SeekerAuthorizationSource {
  readonly getAuthorizationHeader: () => string | undefined;
}

export function isAuthenticatedSeekerSession(session: RouteSession): boolean {
  return session.status === 'authenticated' && session.role === 'seeker';
}

export interface SeekerOverviewLoadOptions {
  readonly apiClient?: ApiClient | undefined;
  readonly apiOrigin?: string | undefined;
  readonly authorization?: SeekerAuthorizationSource | undefined;
  readonly signal?: AbortSignal | undefined;
}

export type SeekerOverviewLoader = (signal?: AbortSignal) => Promise<SeekerOverviewData>;
export type SeekerRequestsLoader = (signal?: AbortSignal) => Promise<RequestListData>;
export type SeekerRequestLoader = (signal?: AbortSignal) => Promise<RequestData>;
export type SeekerRequestTransition = (requestId: string, input: RequestTransitionRequest, signal?: AbortSignal) => Promise<RequestData>;
export type SeekerViewingsLoader = (query?: ViewingListQuery, signal?: AbortSignal) => Promise<ViewingListData>;
export type SeekerFavoritesLoader = (query?: FavoriteListQuery, signal?: AbortSignal) => Promise<FavoriteListData>;
export type SeekerNotificationsLoader = (query?: NotificationListQuery, signal?: AbortSignal) => Promise<NotificationListData>;
export type SeekerProfileLoader = (signal?: AbortSignal) => Promise<SeekerProfileData>;
export type SeekerPreferencesLoader = (signal?: AbortSignal) => Promise<SeekerPreferencesData>;

export interface SeekerViewingActions {
  create(input: ViewingCreate, signal?: AbortSignal): Promise<ViewingData>;
  reschedule(viewingId: string, input: ViewingPatch, signal?: AbortSignal): Promise<ViewingData>;
  cancel(viewingId: string, expectedVersion: number, signal?: AbortSignal): Promise<ViewingData>;
}

export interface SeekerFavoriteActions {
  save(propertyId: string, signal?: AbortSignal): Promise<FavoriteSaveData>;
  remove(propertyId: string, signal?: AbortSignal): Promise<FavoriteRemoveData>;
}

export interface SeekerNotificationActions {
  markRead(notificationId: string, signal?: AbortSignal): Promise<NotificationReadData>;
  markAllRead(signal?: AbortSignal): Promise<NotificationReadAllData>;
}

export interface SeekerProfileActions {
  updateProfile(input: SeekerProfilePatch, signal?: AbortSignal): Promise<SeekerProfileData>;
  updatePreferences(input: SeekerPreferencesPatch, signal?: AbortSignal): Promise<SeekerPreferencesData>;
  changePassword(input: PasswordChangeRequest, signal?: AbortSignal): Promise<void>;
}

function clientFor(options: Pick<SeekerOverviewLoadOptions, 'apiClient' | 'apiOrigin'>): ApiClient {
  if (options.apiClient !== undefined) return options.apiClient;
  const clientOptions: ApiClientOptions = options.apiOrigin === undefined ? {} : { baseUrl: options.apiOrigin };
  return new ApiClient(clientOptions);
}

function authorizationHeaders(source: SeekerAuthorizationSource | undefined): HeadersInit | undefined {
  const authorization = source?.getAuthorizationHeader();
  return authorization === undefined ? undefined : { authorization };
}

export function loadSeekerOverview(options: SeekerOverviewLoadOptions = {}): Promise<SeekerOverviewData> {
  const client = clientFor(options);
  const headers = authorizationHeaders(options.authorization);
  const requestOptions = {
    responseSchema: seekerOverviewSuccessEnvelopeSchema,
    ...(headers === undefined ? {} : { headers }),
    ...(options.signal === undefined ? {} : { signal: options.signal })
  };
  return client.request(SEEKER_OVERVIEW_ROUTE, requestOptions).then(response => response.data.data);
}

export function createSeekerOverviewLoader(
  options: Omit<SeekerOverviewLoadOptions, 'signal'> = {}
): SeekerOverviewLoader {
  return signal => loadSeekerOverview({ ...options, ...(signal === undefined ? {} : { signal }) });
}

export const defaultSeekerOverviewLoader = createSeekerOverviewLoader();

function requestQuery(query: RequestListQuery | undefined): Readonly<Record<string, string | number | undefined>> | undefined {
  if (query === undefined) return undefined;
  return {
    ...(query.status === undefined ? {} : { status: query.status }),
    ...(query.type === undefined ? {} : { type: query.type }),
    ...(query.source === undefined ? {} : { source: query.source }),
    ...(query.page === undefined ? {} : { page: query.page }),
    ...(query.limit === undefined ? {} : { limit: query.limit }),
    ...(query.search === undefined ? {} : { search: query.search })
  };
}

export interface SeekerRequestsLoadOptions extends SeekerOverviewLoadOptions {
  readonly query?: RequestListQuery | undefined;
}

export function loadSeekerRequests(options: SeekerRequestsLoadOptions = {}): Promise<RequestListData> {
  const client = clientFor(options);
  const headers = authorizationHeaders(options.authorization);
  const query = requestQuery(options.query);
  const requestOptions = {
    responseSchema: successEnvelopeSchema(requestListDataSchema),
    ...(headers === undefined ? {} : { headers }),
    ...(query === undefined ? {} : { query }),
    ...(options.signal === undefined ? {} : { signal: options.signal })
  };
  return client.request(SEEKER_REQUESTS_ROUTE, requestOptions).then(response => response.data.data);
}

export function createSeekerRequestsLoader(
  options: Omit<SeekerRequestsLoadOptions, 'signal'> = {}
): SeekerRequestsLoader {
  return signal => loadSeekerRequests({ ...options, ...(signal === undefined ? {} : { signal }) });
}

export function loadSeekerRequest(requestId: string, options: Omit<SeekerOverviewLoadOptions, 'signal'> & { readonly signal?: AbortSignal } = {}): Promise<RequestData> {
  const client = clientFor(options);
  const headers = authorizationHeaders(options.authorization);
  const requestOptions = {
    responseSchema: successEnvelopeSchema(requestDataSchema),
    ...(headers === undefined ? {} : { headers }),
    ...(options.signal === undefined ? {} : { signal: options.signal })
  };
  return client.request(`${SEEKER_REQUESTS_ROUTE}/${encodeURIComponent(requestId)}`, requestOptions).then(response => response.data.data);
}

export function createSeekerRequestLoader(
  requestId: string,
  options: Omit<SeekerOverviewLoadOptions, 'signal'> = {}
): SeekerRequestLoader {
  return signal => loadSeekerRequest(requestId, { ...options, ...(signal === undefined ? {} : { signal }) });
}

export function createSeekerRequestTransition(options: SeekerOverviewLoadOptions = {}): SeekerRequestTransition {
  const client = clientFor(options);
  const headers = authorizationHeaders(options.authorization);
  return async (requestId, input, signal) => {
    const response = await client.request(`${SEEKER_REQUESTS_ROUTE}/${encodeURIComponent(requestId)}/transitions`, {
      method: 'POST',
      responseSchema: successEnvelopeSchema(requestDataSchema),
      ...(headers === undefined ? {} : { headers }),
      json: requestTransitionRequestSchema.parse(input),
      ...(signal === undefined ? {} : { signal })
    });
    return response.data.data;
  };
}

function viewingQuery(query: ViewingListQuery | undefined): Readonly<Record<string, string | number | undefined>> | undefined {
  if (query === undefined) return undefined;
  return {
    ...(query.status === undefined ? {} : { status: query.status }),
    ...(query.page === undefined ? {} : { page: query.page }),
    ...(query.limit === undefined ? {} : { limit: query.limit })
  };
}

export interface SeekerViewingsLoadOptions extends SeekerOverviewLoadOptions {
  readonly query?: ViewingListQuery | undefined;
}

export function loadSeekerViewings(options: SeekerViewingsLoadOptions = {}): Promise<ViewingListData> {
  const client = clientFor(options);
  const headers = authorizationHeaders(options.authorization);
  const query = viewingQuery(options.query);
  const requestOptions = {
    responseSchema: successEnvelopeSchema(viewingListDataSchema),
    ...(headers === undefined ? {} : { headers }),
    ...(query === undefined ? {} : { query }),
    ...(options.signal === undefined ? {} : { signal: options.signal })
  };
  return client.request(SEEKER_VIEWINGS_ROUTE, requestOptions).then(response => response.data.data);
}

export function createSeekerViewingsLoader(
  options: Omit<SeekerViewingsLoadOptions, 'signal' | 'query'> = {}
): SeekerViewingsLoader {
  return (query, signal) => loadSeekerViewings({ ...options, ...(query === undefined ? {} : { query }), ...(signal === undefined ? {} : { signal }) });
}

export function createSeekerViewingActions(options: SeekerOverviewLoadOptions = {}): SeekerViewingActions {
  const client = clientFor(options);
  const headers = authorizationHeaders(options.authorization);
  const responseSchema = successEnvelopeSchema(viewingDataSchema);
  const requestOptions = (method: 'POST' | 'PATCH', json: unknown, signal?: AbortSignal) => ({
    method,
    responseSchema,
    ...(headers === undefined ? {} : { headers }),
    json,
    ...(signal === undefined ? {} : { signal })
  });
  return {
    async create(input, signal) {
      const response = await client.request(SEEKER_VIEWINGS_ROUTE, requestOptions('POST', viewingCreateSchema.parse(input), signal));
      return response.data.data;
    },
    async reschedule(viewingId, input, signal) {
      const response = await client.request(`${SEEKER_VIEWINGS_ROUTE}/${encodeURIComponent(viewingId)}`, requestOptions('PATCH', viewingPatchSchema.parse(input), signal));
      return response.data.data;
    },
    async cancel(viewingId, expectedVersion, signal) {
      const response = await client.request(`${SEEKER_VIEWINGS_ROUTE}/${encodeURIComponent(viewingId)}/cancel`, requestOptions('POST', { expectedVersion }, signal));
      return response.data.data;
    }
  };
}

function favoriteQuery(query: FavoriteListQuery | undefined): Readonly<Record<string, string | number | undefined>> | undefined {
  if (query === undefined) return undefined;
  return { page: query.page, limit: query.limit };
}

export interface SeekerFavoritesLoadOptions extends SeekerOverviewLoadOptions {
  readonly query?: FavoriteListQuery | undefined;
}

export function loadSeekerFavorites(options: SeekerFavoritesLoadOptions = {}): Promise<FavoriteListData> {
  const client = clientFor(options);
  const headers = authorizationHeaders(options.authorization);
  const query = favoriteQuery(options.query);
  const requestOptions = {
    responseSchema: successEnvelopeSchema(favoriteListDataSchema),
    ...(headers === undefined ? {} : { headers }),
    ...(query === undefined ? {} : { query }),
    ...(options.signal === undefined ? {} : { signal: options.signal })
  };
  return client.request(SEEKER_FAVORITES_ROUTE, requestOptions).then(response => response.data.data);
}

export function createSeekerFavoritesLoader(
  options: Omit<SeekerFavoritesLoadOptions, 'signal' | 'query'> = {}
): SeekerFavoritesLoader {
  return (query, signal) => loadSeekerFavorites({ ...options, ...(query === undefined ? {} : { query }), ...(signal === undefined ? {} : { signal }) });
}

export function createSeekerFavoriteActions(options: SeekerOverviewLoadOptions = {}): SeekerFavoriteActions {
  const client = clientFor(options);
  const headers = authorizationHeaders(options.authorization);
  const requestOptions = (method: 'PUT' | 'DELETE', signal?: AbortSignal) => ({
    method,
    ...(headers === undefined ? {} : { headers }),
    ...(signal === undefined ? {} : { signal })
  });
  return {
    async save(propertyId, signal) {
      const id = favoritePropertyParamsSchema.parse({ propertyId }).propertyId;
      const response = await client.request(`${SEEKER_FAVORITES_ROUTE}/${encodeURIComponent(id)}`, {
        ...requestOptions('PUT', signal),
        responseSchema: successEnvelopeSchema(favoriteSaveDataSchema)
      });
      return response.data.data;
    },
    async remove(propertyId, signal) {
      const id = favoritePropertyParamsSchema.parse({ propertyId }).propertyId;
      const response = await client.request(`${SEEKER_FAVORITES_ROUTE}/${encodeURIComponent(id)}`, {
        ...requestOptions('DELETE', signal),
        responseSchema: successEnvelopeSchema(favoriteRemoveDataSchema)
      });
      return response.data.data;
    }
  };
}

function notificationQuery(query: NotificationListQuery | undefined): Readonly<Record<string, string | number | boolean | undefined>> | undefined {
  if (query === undefined) return undefined;
  return {
    ...(query.page === undefined ? {} : { page: query.page }),
    ...(query.limit === undefined ? {} : { limit: query.limit }),
    ...(query.unreadOnly === undefined ? {} : { unreadOnly: query.unreadOnly }),
    ...(query.type === undefined ? {} : { type: query.type })
  };
}

export interface SeekerNotificationsLoadOptions extends SeekerOverviewLoadOptions {
  readonly query?: NotificationListQuery | undefined;
}

export function loadSeekerNotifications(options: SeekerNotificationsLoadOptions = {}): Promise<NotificationListData> {
  const client = clientFor(options);
  const headers = authorizationHeaders(options.authorization);
  const query = notificationQuery(options.query);
  const requestOptions = {
    responseSchema: notificationListSuccessEnvelopeSchema,
    ...(headers === undefined ? {} : { headers }),
    ...(query === undefined ? {} : { query }),
    ...(options.signal === undefined ? {} : { signal: options.signal })
  };
  return client.request(SEEKER_NOTIFICATIONS_ROUTE, requestOptions).then(response => response.data.data);
}

export function createSeekerNotificationsLoader(
  options: Omit<SeekerNotificationsLoadOptions, 'signal' | 'query'> = {}
): SeekerNotificationsLoader {
  return (query, signal) => loadSeekerNotifications({ ...options, ...(query === undefined ? {} : { query }), ...(signal === undefined ? {} : { signal }) });
}

export function createSeekerNotificationActions(options: SeekerOverviewLoadOptions = {}): SeekerNotificationActions {
  const client = clientFor(options);
  const headers = authorizationHeaders(options.authorization);
  const requestOptions = (signal?: AbortSignal) => ({
    method: 'POST' as const,
    responseSchema: notificationReadSuccessEnvelopeSchema,
    ...(headers === undefined ? {} : { headers }),
    ...(signal === undefined ? {} : { signal })
  });
  return {
    async markRead(notificationId, signal) {
      const id = notificationIdSchema.parse(notificationId);
      const response = await client.request(`${SEEKER_NOTIFICATIONS_ROUTE}/${encodeURIComponent(id)}/read`, requestOptions(signal));
      return response.data.data;
    },
    async markAllRead(signal) {
      const response = await client.request(`${SEEKER_NOTIFICATIONS_ROUTE}/read-all`, {
        ...requestOptions(signal),
        responseSchema: notificationReadAllSuccessEnvelopeSchema
      });
      return response.data.data;
    }
  };
}

export function loadSeekerProfile(options: SeekerOverviewLoadOptions = {}): Promise<SeekerProfileData> {
  const client = clientFor(options);
  const headers = authorizationHeaders(options.authorization);
  const requestOptions = {
    responseSchema: seekerProfileSuccessEnvelopeSchema,
    ...(headers === undefined ? {} : { headers }),
    ...(options.signal === undefined ? {} : { signal: options.signal })
  };
  return client.request(SEEKER_PROFILE_ROUTE, requestOptions).then(response => response.data.data);
}

export function createSeekerProfileLoader(
  options: Omit<SeekerOverviewLoadOptions, 'signal'> = {}
): SeekerProfileLoader {
  return signal => loadSeekerProfile({ ...options, ...(signal === undefined ? {} : { signal }) });
}

export function loadSeekerPreferences(options: SeekerOverviewLoadOptions = {}): Promise<SeekerPreferencesData> {
  const client = clientFor(options);
  const headers = authorizationHeaders(options.authorization);
  const requestOptions = {
    responseSchema: seekerPreferencesSuccessEnvelopeSchema,
    ...(headers === undefined ? {} : { headers }),
    ...(options.signal === undefined ? {} : { signal: options.signal })
  };
  return client.request(SEEKER_PREFERENCES_ROUTE, requestOptions).then(response => response.data.data);
}

export function createSeekerPreferencesLoader(
  options: Omit<SeekerOverviewLoadOptions, 'signal'> = {}
): SeekerPreferencesLoader {
  return signal => loadSeekerPreferences({ ...options, ...(signal === undefined ? {} : { signal }) });
}

export function createSeekerProfileActions(options: SeekerOverviewLoadOptions = {}): SeekerProfileActions {
  const client = clientFor(options);
  const headers = authorizationHeaders(options.authorization);
  return {
    async updateProfile(input, signal) {
      const response = await client.request(SEEKER_PROFILE_ROUTE, {
        method: 'PATCH',
        responseSchema: seekerProfileSuccessEnvelopeSchema,
        ...(headers === undefined ? {} : { headers }),
        json: seekerProfilePatchSchema.parse(input),
        ...(signal === undefined ? {} : { signal })
      });
      return response.data.data;
    },
    async updatePreferences(input, signal) {
      const response = await client.request(SEEKER_PREFERENCES_ROUTE, {
        method: 'PATCH',
        responseSchema: seekerPreferencesSuccessEnvelopeSchema,
        ...(headers === undefined ? {} : { headers }),
        json: seekerPreferencesPatchSchema.parse(input),
        ...(signal === undefined ? {} : { signal })
      });
      return response.data.data;
    },
    async changePassword(input, signal) {
      await client.request('/auth/account-access/change', {
        method: 'POST',
        responseSchema: passwordChangeSuccessEnvelopeSchema,
        ...(headers === undefined ? {} : { headers }),
        json: passwordChangeRequestSchema.parse(input),
        ...(signal === undefined ? {} : { signal })
      });
    }
  };
}

export function localeForSeekerPath(locale: SupportedLocale, path: string): string {
  const url = new URL(path, 'http://sadat-real-estate.local');
  url.searchParams.set('lang', locale);
  return `${url.pathname}${url.search}${url.hash}`;
}
