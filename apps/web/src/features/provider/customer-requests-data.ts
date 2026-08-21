import {
  requestCreateSchema,
  requestDataSchema,
  requestIdSchema,
  requestListDataSchema,
  requestTransitionRequestSchema,
  successEnvelopeSchema,
  type RequestCreate,
  type RequestData,
  type RequestListData,
  type RequestListQuery,
  type RequestStatus,
  type RequestTransition
} from '@sadat-real-estate/contracts';
import { ApiClient, type ApiClientOptions } from '../contracts/index.ts';
import type { ProviderAuthorizationSource } from './data.ts';

export const PROVIDER_CUSTOMER_REQUESTS_ROUTE = '/provider/customer-requests' as const;

export interface ProviderCustomerRequestsQuery {
  readonly status?: RequestStatus | undefined;
  readonly search?: string | undefined;
  readonly page?: number | undefined;
  readonly limit?: number | undefined;
}

export interface ProviderCustomerRequestsLoadOptions {
  readonly apiClient?: ApiClient | undefined;
  readonly apiOrigin?: string | undefined;
  readonly authorization?: ProviderAuthorizationSource | undefined;
  readonly query?: ProviderCustomerRequestsQuery | undefined;
  readonly signal?: AbortSignal | undefined;
}

export type ProviderCustomerRequestsLoader = (query: ProviderCustomerRequestsQuery, signal?: AbortSignal) => Promise<RequestListData>;
export type ProviderCustomerRequestsData = RequestListData;
export type ProviderCustomerRequestPayload = Extract<RequestCreate, { type: 'provider_customer' }>['payload'];

export interface ProviderCustomerRequestMutationOptions {
  readonly apiClient?: ApiClient | undefined;
  readonly apiOrigin?: string | undefined;
  readonly authorization?: ProviderAuthorizationSource | undefined;
}

export interface ProviderCustomerRequestMutationApi {
  create(input: ProviderCustomerRequestPayload): Promise<RequestData>;
  transition(requestId: string, input: { transition: RequestTransition; reason?: string; expectedVersion: number }): Promise<RequestData>;
}

function clientFor(options: Pick<ProviderCustomerRequestsLoadOptions, 'apiClient' | 'apiOrigin'>): ApiClient {
  if (options.apiClient !== undefined) return options.apiClient;
  const clientOptions: ApiClientOptions = options.apiOrigin === undefined ? {} : { baseUrl: options.apiOrigin };
  return new ApiClient(clientOptions);
}

function authorizationHeaders(source: ProviderAuthorizationSource | undefined): HeadersInit | undefined {
  const authorization = source?.getAuthorizationHeader();
  return authorization === undefined ? undefined : { authorization };
}

export async function loadProviderCustomerRequests(options: ProviderCustomerRequestsLoadOptions = {}): Promise<RequestListData> {
  const client = clientFor(options);
  const headers = authorizationHeaders(options.authorization);
  const page = options.query?.page ?? 1;
  const limit = options.query?.limit ?? 5;
  const search = options.query?.search?.trim();
  const query: RequestListQuery = {
    page,
    limit,
    source: 'provider',
    type: 'provider_customer',
    ...(options.query?.status === undefined ? {} : { status: options.query.status }),
    ...(search === undefined || search === '' ? {} : { search })
  };
  const response = await client.request(PROVIDER_CUSTOMER_REQUESTS_ROUTE, {
    responseSchema: successEnvelopeSchema(requestListDataSchema),
    ...(headers === undefined ? {} : { headers }),
    query,
    ...(options.signal === undefined ? {} : { signal: options.signal })
  });
  return response.data.data;
}

export function createProviderCustomerRequestsLoader(
  options: Omit<ProviderCustomerRequestsLoadOptions, 'query' | 'signal'> = {}
): ProviderCustomerRequestsLoader {
  return (query, signal) => loadProviderCustomerRequests({ ...options, query, ...(signal === undefined ? {} : { signal }) });
}

export const defaultProviderCustomerRequestsLoader = createProviderCustomerRequestsLoader();

export function createProviderCustomerRequestMutationApi(options: ProviderCustomerRequestMutationOptions = {}): ProviderCustomerRequestMutationApi {
  const client = clientFor(options);
  const headers = () => authorizationHeaders(options.authorization);
  const requestOptions = (requestHeaders: HeadersInit | undefined) => requestHeaders === undefined ? {} : { headers: requestHeaders };

  return {
    async create(input) {
      const parsed = requestCreateSchema.parse({ type: 'provider_customer', payload: input });
      const response = await client.request(PROVIDER_CUSTOMER_REQUESTS_ROUTE, {
        method: 'POST',
        json: parsed.payload,
        ...requestOptions(headers()),
        responseSchema: successEnvelopeSchema(requestDataSchema)
      });
      return response.data.data;
    },
    async transition(requestId, input) {
      const id = requestIdSchema.parse(requestId);
      const request = requestTransitionRequestSchema.parse(input);
      const response = await client.request(`${PROVIDER_CUSTOMER_REQUESTS_ROUTE}/${encodeURIComponent(id)}/transitions`, {
        method: 'POST',
        json: request,
        ...requestOptions(headers()),
        responseSchema: successEnvelopeSchema(requestDataSchema)
      });
      return response.data.data;
    }
  };
}

export const defaultProviderCustomerRequestMutationApi = createProviderCustomerRequestMutationApi();
