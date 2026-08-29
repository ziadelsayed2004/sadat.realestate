import { z } from 'zod';
import {
  adQuoteDecisionSchema,
  adQuoteSchema,
  adRequestCreateSchema,
  adRequestSchema,
  adRequestStatusSchema,
  paymentProofSuccessEnvelopeSchema,
  paymentProofUploadHeadersSchema,
  providerAdRequestListQuerySchema,
  providerAdRequestListSuccessEnvelopeSchema,
  providerAdRequestSuccessEnvelopeSchema,
  providerCommissionSuccessEnvelopeSchema,
  successEnvelopeSchema,
  type AdQuote,
  type AdQuoteDecision,
  type AdRequest,
  type AdRequestCreate,
  type PaymentProofData,
  type ProviderAdRequestListData,
  type ProviderAdRequestProjection,
  type ProviderCommissionProjection
} from '@sadat-real-estate/contracts';
import { ApiClient, type ApiClientOptions } from '../contracts/index.ts';
import type { ProviderAuthorizationSource } from './data.ts';

export const PROVIDER_ADVERTISING_ROUTE = '/provider/ads' as const;
export const PROVIDER_COMMISSION_ROUTE = '/provider/commission' as const;
export const PROVIDER_ADVERTISING_PAGE_LIMIT = 5 as const;

export type ProviderAdvertisingStatus = z.infer<typeof adRequestStatusSchema>;

const providerAdRequestIdSchema = z.string().regex(/^[a-f0-9]{24}$/);
const PAYMENT_PROOF_EXTENSIONS = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png']
} as const;

export interface ProviderAdvertisingQuery {
  readonly status?: ProviderAdvertisingStatus | undefined;
  readonly page?: number | undefined;
  readonly limit?: number | undefined;
}

export interface ProviderAdvertisingLoadOptions {
  readonly apiClient?: ApiClient | undefined;
  readonly apiOrigin?: string | undefined;
  readonly authorization?: ProviderAuthorizationSource | undefined;
  readonly query?: ProviderAdvertisingQuery | undefined;
  readonly signal?: AbortSignal | undefined;
}

export interface ProviderAdvertisingDetailLoadOptions {
  readonly apiClient?: ApiClient | undefined;
  readonly apiOrigin?: string | undefined;
  readonly authorization?: ProviderAuthorizationSource | undefined;
  readonly signal?: AbortSignal | undefined;
}

export type ProviderAdvertisingLoader = (query: ProviderAdvertisingQuery, signal?: AbortSignal) => Promise<ProviderAdRequestListData>;
export type ProviderAdvertisingDetailLoader = (requestId: string, signal?: AbortSignal) => Promise<ProviderAdRequestProjection>;
export type ProviderCommissionLoader = (signal?: AbortSignal) => Promise<ProviderCommissionProjection>;

export interface ProviderAdvertisingMutationOptions {
  readonly apiClient?: ApiClient | undefined;
  readonly apiOrigin?: string | undefined;
  readonly authorization?: ProviderAuthorizationSource | undefined;
}

export interface ProviderAdvertisingMutationApi {
  createRequest(input: AdRequestCreate, signal?: AbortSignal): Promise<AdRequest>;
  acceptQuote(requestId: string, input: AdQuoteDecision, signal?: AbortSignal): Promise<AdQuote>;
  uploadPaymentProof(requestId: string, file: Blob, filename: string, signal?: AbortSignal): Promise<PaymentProofData>;
}

function clientFor(options: Pick<ProviderAdvertisingLoadOptions, 'apiClient' | 'apiOrigin'>): ApiClient {
  if (options.apiClient !== undefined) return options.apiClient;
  const clientOptions: ApiClientOptions = options.apiOrigin === undefined ? {} : { baseUrl: options.apiOrigin };
  return new ApiClient(clientOptions);
}

function authorizationHeaders(source: ProviderAuthorizationSource | undefined): HeadersInit | undefined {
  const authorization = source?.getAuthorizationHeader();
  return authorization === undefined ? undefined : { authorization };
}

function requestId(value: string): string {
  return providerAdRequestIdSchema.parse(value);
}

export async function loadProviderAdvertisingRequests(options: ProviderAdvertisingLoadOptions = {}): Promise<ProviderAdRequestListData> {
  const client = clientFor(options);
  const headers = authorizationHeaders(options.authorization);
  const query = providerAdRequestListQuerySchema.parse({
    page: options.query?.page ?? 1,
    limit: options.query?.limit ?? PROVIDER_ADVERTISING_PAGE_LIMIT,
    ...(options.query?.status === undefined ? {} : { status: options.query.status })
  });
  const response = await client.request(PROVIDER_ADVERTISING_ROUTE, {
    responseSchema: providerAdRequestListSuccessEnvelopeSchema,
    ...(headers === undefined ? {} : { headers }),
    query,
    ...(options.signal === undefined ? {} : { signal: options.signal })
  });
  return response.data.data;
}

export function createProviderAdvertisingLoader(
  options: Omit<ProviderAdvertisingLoadOptions, 'query' | 'signal'> = {}
): ProviderAdvertisingLoader {
  return (query, signal) => loadProviderAdvertisingRequests({ ...options, query, ...(signal === undefined ? {} : { signal }) });
}

export const defaultProviderAdvertisingLoader = createProviderAdvertisingLoader();

export async function loadProviderAdvertisingRequest(
  id: string,
  options: ProviderAdvertisingDetailLoadOptions = {}
): Promise<ProviderAdRequestProjection> {
  const client = clientFor(options);
  const headers = authorizationHeaders(options.authorization);
  const response = await client.request(`${PROVIDER_ADVERTISING_ROUTE}/${encodeURIComponent(requestId(id))}`, {
    responseSchema: providerAdRequestSuccessEnvelopeSchema,
    ...(headers === undefined ? {} : { headers }),
    ...(options.signal === undefined ? {} : { signal: options.signal })
  });
  return response.data.data;
}

export function createProviderAdvertisingDetailLoader(
  options: Omit<ProviderAdvertisingDetailLoadOptions, 'signal'> = {}
): ProviderAdvertisingDetailLoader {
  return (id, signal) => loadProviderAdvertisingRequest(id, { ...options, ...(signal === undefined ? {} : { signal }) });
}

export const defaultProviderAdvertisingDetailLoader = createProviderAdvertisingDetailLoader();

export async function loadProviderCommission(options: ProviderAdvertisingDetailLoadOptions = {}): Promise<ProviderCommissionProjection> {
  const client = clientFor(options);
  const headers = authorizationHeaders(options.authorization);
  const response = await client.request(PROVIDER_COMMISSION_ROUTE, {
    responseSchema: providerCommissionSuccessEnvelopeSchema,
    ...(headers === undefined ? {} : { headers }),
    ...(options.signal === undefined ? {} : { signal: options.signal })
  });
  return response.data.data;
}

export function createProviderCommissionLoader(
  options: Omit<ProviderAdvertisingDetailLoadOptions, 'signal'> = {}
): ProviderCommissionLoader {
  return signal => loadProviderCommission({ ...options, ...(signal === undefined ? {} : { signal }) });
}

export const defaultProviderCommissionLoader = createProviderCommissionLoader();

export function createProviderAdvertisingMutationApi(options: ProviderAdvertisingMutationOptions = {}): ProviderAdvertisingMutationApi {
  const client = clientFor(options);
  const headers = () => authorizationHeaders(options.authorization);
  const requestOptions = (signal: AbortSignal | undefined) => signal === undefined ? {} : { signal };

  return {
    async createRequest(input, signal) {
      const request = adRequestCreateSchema.parse(input);
      const requestHeaders = headers();
      const response = await client.request(PROVIDER_ADVERTISING_ROUTE, {
        method: 'POST',
        responseSchema: successEnvelopeSchema(adRequestSchema),
        ...(requestHeaders === undefined ? {} : { headers: requestHeaders }),
        json: request,
        ...requestOptions(signal)
      });
      return response.data.data;
    },
    async acceptQuote(id, input, signal) {
      const request = adQuoteDecisionSchema.parse(input);
      const requestHeaders = headers();
      const response = await client.request(`${PROVIDER_ADVERTISING_ROUTE}/${encodeURIComponent(requestId(id))}/accept-quote`, {
        method: 'POST',
        responseSchema: successEnvelopeSchema(adQuoteSchema),
        ...(requestHeaders === undefined ? {} : { headers: requestHeaders }),
        json: request,
        ...requestOptions(signal)
      });
      return response.data.data;
    },
    async uploadPaymentProof(id, file, filename, signal) {
      const normalizedFilename = filename.trim();
      if (/[/\\\u0000-\u001f\u007f]/u.test(normalizedFilename)) throw new Error('Payment proof filename contains unsafe characters');
      const upload = paymentProofUploadHeadersSchema.parse({
        filename: normalizedFilename,
        contentType: file.type.toLowerCase(),
        contentLength: file.size
      });
      const extensionStart = upload.filename.lastIndexOf('.');
      const extension = extensionStart > 0 ? upload.filename.slice(extensionStart).toLowerCase() : '';
      const allowedExtensions: readonly string[] = PAYMENT_PROOF_EXTENSIONS[upload.contentType];
      if (!allowedExtensions.includes(extension)) throw new Error('Payment proof filename extension does not match content type');
      const requestHeaders = headers();
      const response = await client.request(`${PROVIDER_ADVERTISING_ROUTE}/${encodeURIComponent(requestId(id))}/payment-proof`, {
        method: 'POST',
        responseSchema: paymentProofSuccessEnvelopeSchema,
        headers: {
          ...(requestHeaders ?? {}),
          'content-type': upload.contentType,
          'x-file-name': upload.filename
        },
        body: file,
        ...requestOptions(signal)
      });
      return response.data.data;
    }
  };
}

export const defaultProviderAdvertisingMutationApi = createProviderAdvertisingMutationApi();
