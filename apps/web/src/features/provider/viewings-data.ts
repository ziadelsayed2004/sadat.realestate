import {
  successEnvelopeSchema,
  viewingDataSchema,
  viewingIdParamsSchema,
  viewingListDataSchema,
  viewingListQuerySchema,
  viewingTransitionSchema,
  type ViewingData,
  type ViewingListData,
  type ViewingListQuery,
  type ViewingTransition
} from '@sadat-real-estate/contracts';
import { ApiClient, type ApiClientOptions } from '../contracts/index.ts';
import type { ProviderAuthorizationSource } from './data.ts';

export const PROVIDER_VIEWINGS_ROUTE = '/provider/viewings' as const;

export interface ProviderViewingsLoadOptions {
  readonly apiClient?: ApiClient | undefined;
  readonly apiOrigin?: string | undefined;
  readonly authorization?: ProviderAuthorizationSource | undefined;
  readonly query?: ViewingListQuery | undefined;
  readonly signal?: AbortSignal | undefined;
}

export type ProviderViewingsLoader = (query?: ViewingListQuery, signal?: AbortSignal) => Promise<ViewingListData>;
export type ProviderViewingsData = ViewingListData;

export interface ProviderViewingMutationOptions {
  readonly apiClient?: ApiClient | undefined;
  readonly apiOrigin?: string | undefined;
  readonly authorization?: ProviderAuthorizationSource | undefined;
}

export interface ProviderViewingMutationApi {
  transition(viewingId: string, input: ViewingTransition, signal?: AbortSignal): Promise<ViewingData>;
}

function clientFor(options: Pick<ProviderViewingsLoadOptions, 'apiClient' | 'apiOrigin'>): ApiClient {
  if (options.apiClient !== undefined) return options.apiClient;
  const clientOptions: ApiClientOptions = options.apiOrigin === undefined ? {} : { baseUrl: options.apiOrigin };
  return new ApiClient(clientOptions);
}

function authorizationHeaders(source: ProviderAuthorizationSource | undefined): HeadersInit | undefined {
  const authorization = source?.getAuthorizationHeader();
  return authorization === undefined ? undefined : { authorization };
}

function viewingQuery(query: ViewingListQuery): Readonly<Record<string, string | number>> {
  return {
    ...(query.status === undefined ? {} : { status: query.status }),
    page: query.page,
    limit: query.limit
  };
}

export async function loadProviderViewings(options: ProviderViewingsLoadOptions = {}): Promise<ViewingListData> {
  const client = clientFor(options);
  const headers = authorizationHeaders(options.authorization);
  const query = viewingListQuerySchema.parse({
    page: options.query?.page ?? 1,
    limit: options.query?.limit ?? 5,
    ...(options.query?.status === undefined ? {} : { status: options.query.status })
  });
  const response = await client.request(PROVIDER_VIEWINGS_ROUTE, {
    responseSchema: successEnvelopeSchema(viewingListDataSchema),
    ...(headers === undefined ? {} : { headers }),
    query: viewingQuery(query),
    ...(options.signal === undefined ? {} : { signal: options.signal })
  });
  return response.data.data;
}

export function createProviderViewingsLoader(
  options: Omit<ProviderViewingsLoadOptions, 'query' | 'signal'> = {}
): ProviderViewingsLoader {
  return (query, signal) => loadProviderViewings({ ...options, ...(query === undefined ? {} : { query }), ...(signal === undefined ? {} : { signal }) });
}

export const defaultProviderViewingsLoader = createProviderViewingsLoader();

export function createProviderViewingMutationApi(options: ProviderViewingMutationOptions = {}): ProviderViewingMutationApi {
  const client = clientFor(options);
  const headers = authorizationHeaders(options.authorization);
  return {
    async transition(viewingId, input, signal) {
      const params = viewingIdParamsSchema.parse({ viewingId });
      const request = viewingTransitionSchema.parse(input);
      const response = await client.request(`${PROVIDER_VIEWINGS_ROUTE}/${encodeURIComponent(params.viewingId)}/transitions`, {
        method: 'POST',
        responseSchema: successEnvelopeSchema(viewingDataSchema),
        ...(headers === undefined ? {} : { headers }),
        json: request,
        ...(signal === undefined ? {} : { signal })
      });
      return response.data.data;
    }
  };
}

export const defaultProviderViewingMutationApi = createProviderViewingMutationApi();
