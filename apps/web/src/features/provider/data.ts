import {
  providerApplicationStatusSuccessEnvelopeSchema,
  propertyListDataSchema,
  requestListDataSchema,
  successEnvelopeSchema,
  viewingListDataSchema,
  type PropertyData,
  type PropertyStatus,
  type ProviderApplicationStatusData
} from '@sadat-real-estate/contracts';
import { ApiClient, type ApiClientOptions } from '../contracts/index.ts';

export const PROVIDER_APPLICATION_STATUS_ROUTE = '/provider/application/status' as const;
export const PROVIDER_PROPERTIES_ROUTE = '/provider/properties' as const;
export const PROVIDER_CUSTOMER_REQUESTS_ROUTE = '/provider/customer-requests' as const;
export const PROVIDER_VIEWINGS_ROUTE = '/provider/viewings' as const;

export interface ProviderAuthorizationSource {
  readonly getAuthorizationHeader: () => string | undefined;
}

export interface ProviderOverviewProperties {
  readonly total: number;
  readonly published: number;
  readonly pendingReview: number;
  readonly needsChanges: number;
  readonly drafts: number;
  readonly recent: readonly PropertyData[];
}

export interface ProviderOverviewData {
  readonly application: ProviderApplicationStatusData;
  readonly properties: ProviderOverviewProperties;
  readonly activity: {
    readonly customerRequests: number;
    readonly bookedViewings: number;
  };
}

export interface ProviderOverviewLoadOptions {
  readonly apiClient?: ApiClient | undefined;
  readonly apiOrigin?: string | undefined;
  readonly authorization?: ProviderAuthorizationSource | undefined;
  readonly signal?: AbortSignal | undefined;
}

export interface ProviderPropertiesQuery {
  readonly status?: PropertyStatus | undefined;
  readonly search?: string | undefined;
  readonly page?: number | undefined;
  readonly limit?: number | undefined;
}

export interface ProviderPropertiesData {
  readonly items: readonly PropertyData[];
  readonly page: number;
  readonly limit: number;
  readonly total: number;
}

export interface ProviderPropertiesLoadOptions {
  readonly apiClient?: ApiClient | undefined;
  readonly apiOrigin?: string | undefined;
  readonly authorization?: ProviderAuthorizationSource | undefined;
  readonly query?: ProviderPropertiesQuery | undefined;
  readonly signal?: AbortSignal | undefined;
}

export type ProviderPropertiesLoader = (query: ProviderPropertiesQuery, signal?: AbortSignal) => Promise<ProviderPropertiesData>;

export type ProviderOverviewLoader = (signal?: AbortSignal) => Promise<ProviderOverviewData>;

function clientFor(options: Pick<ProviderOverviewLoadOptions, 'apiClient' | 'apiOrigin'>): ApiClient {
  if (options.apiClient !== undefined) return options.apiClient;
  const clientOptions: ApiClientOptions = options.apiOrigin === undefined ? {} : { baseUrl: options.apiOrigin };
  return new ApiClient(clientOptions);
}

function authorizationHeaders(source: ProviderAuthorizationSource | undefined): HeadersInit | undefined {
  const authorization = source?.getAuthorizationHeader();
  return authorization === undefined ? undefined : { authorization };
}

interface PropertyQueryResult {
  readonly items: readonly PropertyData[];
  readonly total: number;
}

async function loadProperties(
  client: ApiClient,
  headers: HeadersInit | undefined,
  status: PropertyStatus | undefined,
  signal: AbortSignal | undefined
): Promise<PropertyQueryResult> {
  const response = await client.request(PROVIDER_PROPERTIES_ROUTE, {
    responseSchema: successEnvelopeSchema(propertyListDataSchema),
    ...(headers === undefined ? {} : { headers }),
    query: {
      page: 1,
      limit: status === undefined ? 5 : 1,
      sort: 'updatedAt',
      direction: 'desc',
      ...(status === undefined ? {} : { status })
    },
    ...(signal === undefined ? {} : { signal })
  });
  return {
    items: response.data.data.items,
    total: response.data.meta.total ?? response.data.data.items.length
  };
}

const emptyProperties: ProviderOverviewProperties = Object.freeze({
  total: 0,
  published: 0,
  pendingReview: 0,
  needsChanges: 0,
  drafts: 0,
  recent: Object.freeze([])
});

export async function loadProviderOverview(options: ProviderOverviewLoadOptions = {}): Promise<ProviderOverviewData> {
  const client = clientFor(options);
  const headers = authorizationHeaders(options.authorization);
  const applicationResponse = await client.request(PROVIDER_APPLICATION_STATUS_ROUTE, {
    responseSchema: providerApplicationStatusSuccessEnvelopeSchema,
    ...(headers === undefined ? {} : { headers }),
    ...(options.signal === undefined ? {} : { signal: options.signal })
  });
  const application = applicationResponse.data.data;
  if (application.status !== 'approved') return { application, properties: emptyProperties, activity: { customerRequests: 0, bookedViewings: 0 } };

  const [all, published, pendingReview, needsChanges, drafts, customerRequestsResponse, bookedViewingsResponse] = await Promise.all([
    loadProperties(client, headers, undefined, options.signal),
    loadProperties(client, headers, 'published', options.signal),
    loadProperties(client, headers, 'pending_review', options.signal),
    loadProperties(client, headers, 'needs_changes', options.signal),
    loadProperties(client, headers, 'draft', options.signal),
    client.request(PROVIDER_CUSTOMER_REQUESTS_ROUTE, {
      responseSchema: successEnvelopeSchema(requestListDataSchema),
      ...(headers === undefined ? {} : { headers }),
      query: { page: 1, limit: 1, source: 'provider', type: 'provider_customer' },
      ...(options.signal === undefined ? {} : { signal: options.signal })
    }),
    client.request(PROVIDER_VIEWINGS_ROUTE, {
      responseSchema: successEnvelopeSchema(viewingListDataSchema),
      ...(headers === undefined ? {} : { headers }),
      query: { page: 1, limit: 1, status: 'confirmed' },
      ...(options.signal === undefined ? {} : { signal: options.signal })
    })
  ]);

  return {
    application,
    properties: {
      total: all.total,
      published: published.total,
      pendingReview: pendingReview.total,
      needsChanges: needsChanges.total,
      drafts: drafts.total,
      recent: all.items
    },
    activity: {
      customerRequests: customerRequestsResponse.data.data.total,
      bookedViewings: bookedViewingsResponse.data.data.total
    }
  };
}

export function createProviderOverviewLoader(
  options: Omit<ProviderOverviewLoadOptions, 'signal'> = {}
): ProviderOverviewLoader {
  return signal => loadProviderOverview({ ...options, ...(signal === undefined ? {} : { signal }) });
}

export const defaultProviderOverviewLoader = createProviderOverviewLoader();

export async function loadProviderProperties(options: ProviderPropertiesLoadOptions = {}): Promise<ProviderPropertiesData> {
  const client = clientFor(options);
  const headers = authorizationHeaders(options.authorization);
  const page = options.query?.page ?? 1;
  const limit = options.query?.limit ?? 20;
  const search = options.query?.search?.trim();
  const response = await client.request(PROVIDER_PROPERTIES_ROUTE, {
    responseSchema: successEnvelopeSchema(propertyListDataSchema),
    ...(headers === undefined ? {} : { headers }),
    query: {
      page,
      limit,
      sort: 'updatedAt',
      direction: 'desc',
      ...(options.query?.status === undefined ? {} : { status: options.query.status }),
      ...(search === undefined || search === '' ? {} : { search })
    },
    ...(options.signal === undefined ? {} : { signal: options.signal })
  });
  return {
    items: response.data.data.items,
    page: response.data.meta.page ?? page,
    limit: response.data.meta.limit ?? limit,
    total: response.data.meta.total ?? response.data.data.items.length
  };
}

export function createProviderPropertiesLoader(
  options: Omit<ProviderPropertiesLoadOptions, 'query' | 'signal'> = {}
): ProviderPropertiesLoader {
  return (query, signal) => loadProviderProperties({ ...options, query, ...(signal === undefined ? {} : { signal }) });
}

export const defaultProviderPropertiesLoader = createProviderPropertiesLoader();
