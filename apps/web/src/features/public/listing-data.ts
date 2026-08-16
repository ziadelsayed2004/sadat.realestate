import {
  publicPropertyListSuccessEnvelopeSchema,
  publicPropertySearchQuerySchema,
  type PublicPropertyListData,
  type PublicPropertySearchQuery
} from '@sadat-real-estate/contracts';
import { ApiClient, type ApiClientOptions } from '../contracts/index.ts';

export const PUBLIC_PROPERTY_LIST_ROUTE = '/public/properties' as const;
export const PUBLIC_PROPERTIES_PATH = '/properties' as const;

const QUERY_KEYS = [
  'kind',
  'transactionType',
  'projectId',
  'locationId',
  'search',
  'minPrice',
  'maxPrice',
  'bedrooms',
  'sort',
  'direction',
  'page',
  'limit'
] as const;

const DEFAULT_QUERY = publicPropertySearchQuerySchema.parse({});

export interface PublicPropertyListLoadOptions {
  readonly query: PublicPropertySearchQuery;
  readonly apiClient?: ApiClient | undefined;
  readonly apiOrigin?: string | undefined;
  readonly signal?: AbortSignal | undefined;
}

export type PublicPropertyListLoader = (
  query: PublicPropertySearchQuery,
  signal?: AbortSignal
) => Promise<PublicPropertyListData>;

function paramsForSource(source: URLSearchParams | URL | string): URLSearchParams {
  if (source instanceof URLSearchParams) return source;
  if (source instanceof URL) return source.searchParams;
  return new URL(source, 'http://sadat-real-estate.local').searchParams;
}

export function defaultPublicPropertySearchQuery(): PublicPropertySearchQuery {
  return { ...DEFAULT_QUERY };
}

export function parsePublicPropertySearchQuery(source: URLSearchParams | URL | string): PublicPropertySearchQuery {
  const params = paramsForSource(source);
  const raw: Record<string, string> = {};
  for (const key of QUERY_KEYS) {
    const value = params.get(key);
    if (value !== null && value.trim().length > 0) raw[key] = value;
  }
  const parsed = publicPropertySearchQuerySchema.safeParse(raw);
  return parsed.success ? parsed.data : defaultPublicPropertySearchQuery();
}

function setIfPresent(params: URLSearchParams, key: string, value: string | number | undefined): void {
  if (value !== undefined && String(value).length > 0) params.set(key, String(value));
}

export function publicPropertySearchParams(query: PublicPropertySearchQuery): URLSearchParams {
  const params = new URLSearchParams();
  setIfPresent(params, 'kind', query.kind);
  setIfPresent(params, 'transactionType', query.transactionType);
  setIfPresent(params, 'projectId', query.projectId);
  setIfPresent(params, 'locationId', query.locationId);
  setIfPresent(params, 'search', query.search);
  setIfPresent(params, 'minPrice', query.minPrice);
  setIfPresent(params, 'maxPrice', query.maxPrice);
  setIfPresent(params, 'bedrooms', query.bedrooms);
  if (query.sort !== DEFAULT_QUERY.sort) setIfPresent(params, 'sort', query.sort);
  if (query.direction !== DEFAULT_QUERY.direction) setIfPresent(params, 'direction', query.direction);
  if (query.page !== DEFAULT_QUERY.page) setIfPresent(params, 'page', query.page);
  if (query.limit !== DEFAULT_QUERY.limit) setIfPresent(params, 'limit', query.limit);
  return params;
}

export function publicPropertySearchUrl(query: PublicPropertySearchQuery): string {
  const queryString = publicPropertySearchParams(query).toString();
  return queryString.length === 0 ? PUBLIC_PROPERTIES_PATH : `${PUBLIC_PROPERTIES_PATH}?${queryString}`;
}

export async function loadPublicPropertyList(options: PublicPropertyListLoadOptions): Promise<PublicPropertyListData> {
  let client = options.apiClient;
  if (client === undefined) {
    const clientOptions: ApiClientOptions = options.apiOrigin === undefined ? {} : { baseUrl: options.apiOrigin };
    client = new ApiClient(clientOptions);
  }

  const requestOptions = options.signal === undefined
    ? { responseSchema: publicPropertyListSuccessEnvelopeSchema, query: options.query }
    : { responseSchema: publicPropertyListSuccessEnvelopeSchema, query: options.query, signal: options.signal };
  const response = await client.request(PUBLIC_PROPERTY_LIST_ROUTE, requestOptions);
  return response.data.data;
}

export function createPublicPropertyListLoader(
  options: Omit<PublicPropertyListLoadOptions, 'query' | 'signal'> = {}
): PublicPropertyListLoader {
  return (query, signal) => loadPublicPropertyList({ ...options, query, ...(signal === undefined ? {} : { signal }) });
}

export const defaultPublicPropertyListLoader = createPublicPropertyListLoader();

