import {
  organizationSlugSchema,
  publicOrganizationDirectoryQuerySchema,
  publicOrganizationListSuccessEnvelopeSchema,
  publicOrganizationProfileSuccessEnvelopeSchema,
  type PublicOrganizationDirectoryQuery,
  type PublicOrganizationListData,
  type PublicOrganizationProfile
} from '@sadat-real-estate/contracts';
import { ApiClient, type ApiClientOptions } from '../contracts/index.ts';

export const PUBLIC_DEVELOPERS_ROUTE = '/public/developers' as const;
export const PUBLIC_DEVELOPERS_PATH = '/developers' as const;

const QUERY_KEYS = ['kind', 'search', 'sort', 'direction', 'page', 'limit'] as const;
const DEFAULT_QUERY = publicOrganizationDirectoryQuerySchema.parse({});

export interface PublicDeveloperDirectoryLoadOptions {
  readonly query: PublicOrganizationDirectoryQuery;
  readonly apiClient?: ApiClient | undefined;
  readonly apiOrigin?: string | undefined;
  readonly signal?: AbortSignal | undefined;
}

export interface PublicDeveloperProfileLoadOptions {
  readonly slug: string;
  readonly apiClient?: ApiClient | undefined;
  readonly apiOrigin?: string | undefined;
  readonly signal?: AbortSignal | undefined;
}

export type PublicDeveloperDirectoryLoader = (
  query: PublicOrganizationDirectoryQuery,
  signal?: AbortSignal
) => Promise<PublicOrganizationListData>;

export type PublicDeveloperProfileLoader = (
  slug: string,
  signal?: AbortSignal
) => Promise<PublicOrganizationProfile>;

function clientFor(options: { readonly apiClient?: ApiClient | undefined; readonly apiOrigin?: string | undefined }): ApiClient {
  if (options.apiClient !== undefined) return options.apiClient;
  const clientOptions: ApiClientOptions = options.apiOrigin === undefined ? {} : { baseUrl: options.apiOrigin };
  return new ApiClient(clientOptions);
}

function paramsForSource(source: URLSearchParams | URL | string): URLSearchParams {
  if (source instanceof URLSearchParams) return source;
  if (source instanceof URL) return source.searchParams;
  try {
    return new URL(source, 'http://sadat-real-estate.local').searchParams;
  } catch {
    return new URLSearchParams();
  }
}

export function defaultPublicDeveloperDirectoryQuery(): PublicOrganizationDirectoryQuery {
  return { ...DEFAULT_QUERY };
}

export function parsePublicDeveloperDirectoryQuery(source: URLSearchParams | URL | string): PublicOrganizationDirectoryQuery {
  const params = paramsForSource(source);
  const raw: Record<string, string> = {};
  for (const key of QUERY_KEYS) {
    const value = params.get(key);
    if (value !== null && value.trim().length > 0) raw[key] = value;
  }
  const parsed = publicOrganizationDirectoryQuerySchema.safeParse(raw);
  return parsed.success ? parsed.data : defaultPublicDeveloperDirectoryQuery();
}

function setIfPresent(params: URLSearchParams, key: string, value: string | number | undefined): void {
  if (value !== undefined && String(value).length > 0) params.set(key, String(value));
}

export function publicDeveloperDirectoryParams(query: PublicOrganizationDirectoryQuery): URLSearchParams {
  const params = new URLSearchParams();
  setIfPresent(params, 'kind', query.kind);
  setIfPresent(params, 'search', query.search);
  if (query.sort !== DEFAULT_QUERY.sort) setIfPresent(params, 'sort', query.sort);
  if (query.direction !== DEFAULT_QUERY.direction) setIfPresent(params, 'direction', query.direction);
  if (query.page !== DEFAULT_QUERY.page) setIfPresent(params, 'page', query.page);
  if (query.limit !== DEFAULT_QUERY.limit) setIfPresent(params, 'limit', query.limit);
  return params;
}

export function publicDeveloperDirectoryUrl(query: PublicOrganizationDirectoryQuery): string {
  const queryString = publicDeveloperDirectoryParams(query).toString();
  return queryString.length === 0 ? PUBLIC_DEVELOPERS_PATH : `${PUBLIC_DEVELOPERS_PATH}?${queryString}`;
}

export function publicDeveloperProfileSlugFromUrl(source: URL | string): string | undefined {
  let url: URL;
  try {
    url = source instanceof URL ? source : new URL(source, 'http://sadat-real-estate.local');
  } catch {
    return undefined;
  }
  const segments = url.pathname.split('/').filter(Boolean);
  if (segments.length !== 2 || segments[0] !== PUBLIC_DEVELOPERS_PATH.slice(1)) return undefined;
  try {
    const parsed = organizationSlugSchema.safeParse(decodeURIComponent(segments[1] ?? ''));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

export function publicDeveloperProfileUrl(slug: string): string {
  const parsedSlug = organizationSlugSchema.parse(slug);
  return `${PUBLIC_DEVELOPERS_PATH}/${encodeURIComponent(parsedSlug)}`;
}

export async function loadPublicDeveloperDirectory(options: PublicDeveloperDirectoryLoadOptions): Promise<PublicOrganizationListData> {
  const client = clientFor(options);
  const requestOptions = options.signal === undefined
    ? { responseSchema: publicOrganizationListSuccessEnvelopeSchema, query: options.query }
    : { responseSchema: publicOrganizationListSuccessEnvelopeSchema, query: options.query, signal: options.signal };
  const response = await client.request(PUBLIC_DEVELOPERS_ROUTE, requestOptions);
  return response.data.data;
}

export function createPublicDeveloperDirectoryLoader(
  options: Omit<PublicDeveloperDirectoryLoadOptions, 'query' | 'signal'> = {}
): PublicDeveloperDirectoryLoader {
  return (query, signal) => loadPublicDeveloperDirectory({ ...options, query, ...(signal === undefined ? {} : { signal }) });
}

export const defaultPublicDeveloperDirectoryLoader = createPublicDeveloperDirectoryLoader();

export async function loadPublicDeveloperProfile(options: PublicDeveloperProfileLoadOptions): Promise<PublicOrganizationProfile> {
  const slug = organizationSlugSchema.parse(options.slug);
  const client = clientFor(options);
  const requestOptions = options.signal === undefined
    ? { responseSchema: publicOrganizationProfileSuccessEnvelopeSchema }
    : { responseSchema: publicOrganizationProfileSuccessEnvelopeSchema, signal: options.signal };
  const response = await client.request(`${PUBLIC_DEVELOPERS_ROUTE}/${encodeURIComponent(slug)}`, requestOptions);
  return response.data.data;
}

export function createPublicDeveloperProfileLoader(
  options: Omit<PublicDeveloperProfileLoadOptions, 'slug' | 'signal'> = {}
): PublicDeveloperProfileLoader {
  return (slug, signal) => loadPublicDeveloperProfile({ ...options, slug, ...(signal === undefined ? {} : { signal }) });
}

export const defaultPublicDeveloperProfileLoader = createPublicDeveloperProfileLoader();
