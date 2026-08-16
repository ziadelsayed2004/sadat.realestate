import {
  propertyObjectIdSchema,
  publicPropertyCompareRequestSchema,
  publicPropertyComparisonSuccessEnvelopeSchema,
  type PublicPropertyCompareRequest,
  type PublicPropertyComparisonData
} from '@sadat-real-estate/contracts';
import { ApiClient, type ApiClientOptions } from '../contracts/index.ts';

export const PUBLIC_PROPERTY_COMPARISON_ROUTE = '/public/properties/compare' as const;
export const PUBLIC_PROPERTY_COMPARISON_PATH = '/compare' as const;
export const PUBLIC_PROPERTY_COMPARISON_QUERY_KEY = 'propertyIds' as const;

export interface PublicPropertyComparisonLoadOptions {
  readonly propertyIds: readonly string[];
  readonly apiClient?: ApiClient | undefined;
  readonly apiOrigin?: string | undefined;
  readonly signal?: AbortSignal | undefined;
}

export type PublicPropertyComparisonLoader = (
  propertyIds: readonly string[],
  signal?: AbortSignal
) => Promise<PublicPropertyComparisonData>;

function paramsForSource(source: URLSearchParams | URL | string): URLSearchParams {
  if (source instanceof URLSearchParams) return source;
  if (source instanceof URL) return source.searchParams;
  return new URL(source, 'http://sadat-real-estate.local').searchParams;
}

export function parsePublicPropertyComparisonIds(source: URLSearchParams | URL | string): string[] {
  const values = paramsForSource(source)
    .getAll(PUBLIC_PROPERTY_COMPARISON_QUERY_KEY)
    .map(value => value.trim());
  if (values.length < 1 || values.length > 2) return [];

  const parsed = values.map(value => propertyObjectIdSchema.safeParse(value));
  if (parsed.some(value => !value.success)) return [];

  const propertyIds: string[] = [];
  for (const value of parsed) {
    if (!value.success) return [];
    propertyIds.push(value.data);
  }
  return new Set(propertyIds).size === propertyIds.length ? propertyIds : [];
}

export function publicPropertyComparisonUrl(propertyIds: readonly string[], source: URL | string = PUBLIC_PROPERTY_COMPARISON_PATH): string {
  if (propertyIds.length > 2) throw new TypeError('A comparison cannot contain more than two properties.');
  const parsedIds = propertyIds.map(propertyId => propertyObjectIdSchema.parse(propertyId));
  if (new Set(parsedIds).size !== parsedIds.length) throw new TypeError('A comparison cannot contain duplicate properties.');

  const sourceParams = paramsForSource(source);
  const params = new URLSearchParams();
  const locale = sourceParams.get('lang');
  if (locale !== null && locale.trim().length > 0) params.set('lang', locale);
  for (const propertyId of parsedIds) params.append(PUBLIC_PROPERTY_COMPARISON_QUERY_KEY, propertyId);
  const query = params.toString();
  return query.length === 0 ? PUBLIC_PROPERTY_COMPARISON_PATH : PUBLIC_PROPERTY_COMPARISON_PATH + '?' + query;
}

function clientFor(options: { readonly apiClient?: ApiClient | undefined; readonly apiOrigin?: string | undefined }): ApiClient {
  if (options.apiClient !== undefined) return options.apiClient;
  const clientOptions: ApiClientOptions = options.apiOrigin === undefined ? {} : { baseUrl: options.apiOrigin };
  return new ApiClient(clientOptions);
}

export async function loadPublicPropertyComparison(options: PublicPropertyComparisonLoadOptions): Promise<PublicPropertyComparisonData> {
  const request: PublicPropertyCompareRequest = publicPropertyCompareRequestSchema.parse({
    propertyIds: [...options.propertyIds]
  });
  const client = clientFor(options);
  const requestOptions = options.signal === undefined
    ? { method: 'POST' as const, json: request, responseSchema: publicPropertyComparisonSuccessEnvelopeSchema }
    : { method: 'POST' as const, json: request, responseSchema: publicPropertyComparisonSuccessEnvelopeSchema, signal: options.signal };
  const response = await client.request(PUBLIC_PROPERTY_COMPARISON_ROUTE, requestOptions);
  return response.data.data;
}

export function createPublicPropertyComparisonLoader(
  options: Omit<PublicPropertyComparisonLoadOptions, 'propertyIds' | 'signal'> = {}
): PublicPropertyComparisonLoader {
  return (propertyIds, signal) => loadPublicPropertyComparison({ ...options, propertyIds, ...(signal === undefined ? {} : { signal }) });
}

export const defaultPublicPropertyComparisonLoader = createPublicPropertyComparisonLoader();
