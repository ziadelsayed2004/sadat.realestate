import {
  adAdminRequestListQuerySchema,
  adAdminRequestListSuccessEnvelopeSchema,
  adAdminRequestSuccessEnvelopeSchema,
  adCalendarListSuccessEnvelopeSchema,
  adCalendarQuerySchema,
  adFinancialReviewListSuccessEnvelopeSchema,
  adFinancialReviewQuerySchema,
  adFinancialReviewSuccessEnvelopeSchema,
  adLedgerListSuccessEnvelopeSchema,
  adLedgerQuerySchema,
  adRequestIdParamsSchema,
  paymentProofAdminListQuerySchema,
  paymentProofAdminListSuccessEnvelopeSchema,
  paymentProofReviewSchema,
  paymentProofSuccessEnvelopeSchema,
  type AdAdminRequest,
  type AdAdminRequestListData,
  type AdAdminRequestListQuery,
  type AdCalendarListData,
  type AdCalendarQuery,
  type AdFinancialReviewListData,
  type AdFinancialReviewQuery,
  type AdFinancialReviewRow,
  type AdLedgerListData,
  type AdLedgerQuery,
  type PaymentProofAdminListData,
  type PaymentProofAdminListQuery,
  type PaymentProofData,
  type PaymentProofReview
} from '@sadat-real-estate/contracts';
import { ApiClient, type ApiClientOptions } from '../contracts/index.ts';

export const ADMIN_ADS_REQUESTS_ROUTE = '/admin/ads/requests' as const;
export const ADMIN_ADS_PENDING_PROOFS_ROUTE = '/admin/ads/payment-proofs/pending' as const;
export const ADMIN_ADS_APPROVED_PROOFS_ROUTE = '/admin/ads/payment-proofs/approved' as const;
export const ADMIN_ADS_CALENDAR_ROUTE = '/admin/ads/calendar' as const;
export const ADMIN_ADS_PENDING_REVIEW_ROUTE = '/admin/ads/payments/pending-review' as const;
export const ADMIN_ADS_FINANCIAL_REVIEW_ROUTE = '/admin/ads/financial-review' as const;

const ADMIN_AD_REQUESTS_API_ROUTE = '/admin/ad-requests' as const;
const ADMIN_PAYMENT_PROOFS_API_ROUTE = '/admin/payment-proofs' as const;
const ADMIN_AD_CALENDAR_API_ROUTE = '/admin/ad-calendar' as const;
const ADMIN_FINANCIAL_REVIEW_API_ROUTE = '/admin/ad-financial-review' as const;
const ADMIN_LEDGER_API_ROUTE = '/admin/ad-ledger' as const;

export type AdminAdsAuthorizationSource = {
  readonly getAuthorizationHeader: () => string | undefined;
};

interface CommonOptions {
  readonly apiClient?: ApiClient | undefined;
  readonly apiOrigin?: string | undefined;
  readonly authorization?: AdminAdsAuthorizationSource | undefined;
  readonly signal?: AbortSignal | undefined;
}

export interface AdminAdsRequestLoadOptions extends CommonOptions {
  readonly query?: Partial<AdAdminRequestListQuery> | undefined;
}

export interface AdminAdsPaymentProofLoadOptions extends CommonOptions {
  readonly query?: Partial<PaymentProofAdminListQuery> | undefined;
}

export interface AdminAdsCalendarLoadOptions extends CommonOptions {
  readonly query?: Partial<AdCalendarQuery> | undefined;
}

export interface AdminAdsFinancialReviewLoadOptions extends CommonOptions {
  readonly query?: Partial<AdFinancialReviewQuery> | undefined;
}

export interface AdminAdsLedgerLoadOptions extends CommonOptions {
  readonly query?: Partial<AdLedgerQuery> | undefined;
}

export type AdminAdsRequestListData = AdAdminRequestListData & { readonly page: number; readonly limit: number; readonly total: number };
export type AdminAdsPaymentProofListData = PaymentProofAdminListData & { readonly page: number; readonly limit: number; readonly total: number };
export type AdminAdsCalendarData = AdCalendarListData & { readonly page: number; readonly limit: number; readonly total: number };
export type AdminAdsFinancialReviewData = AdFinancialReviewListData & { readonly page: number; readonly limit: number; readonly total: number };
export type AdminAdsLedgerData = AdLedgerListData & { readonly page: number; readonly limit: number; readonly total: number };

export type AdminAdsRequestLoader = (query: AdAdminRequestListQuery, signal?: AbortSignal) => Promise<AdminAdsRequestListData>;
export type AdminAdsRequestDetailLoader = (requestId: string, signal?: AbortSignal) => Promise<AdAdminRequest>;
export type AdminAdsPaymentProofLoader = (query: PaymentProofAdminListQuery, signal?: AbortSignal) => Promise<AdminAdsPaymentProofListData>;
export type AdminAdsPaymentProofReviewMutation = (proofId: string, input: PaymentProofReview, signal?: AbortSignal) => Promise<PaymentProofData>;
export type AdminAdsCalendarLoader = (query: AdCalendarQuery, signal?: AbortSignal) => Promise<AdminAdsCalendarData>;
export type AdminAdsFinancialReviewLoader = (query: AdFinancialReviewQuery, signal?: AbortSignal) => Promise<AdminAdsFinancialReviewData>;
export type AdminAdsFinancialDetailLoader = (requestId: string, signal?: AbortSignal) => Promise<AdFinancialReviewRow>;
export type AdminAdsLedgerLoader = (query: AdLedgerQuery, signal?: AbortSignal) => Promise<AdminAdsLedgerData>;

function clientFor(options: Pick<CommonOptions, 'apiClient' | 'apiOrigin'>): ApiClient {
  if (options.apiClient !== undefined) return options.apiClient;
  const clientOptions: ApiClientOptions = options.apiOrigin === undefined ? {} : { baseUrl: options.apiOrigin };
  return new ApiClient(clientOptions);
}

function headersFor(source: AdminAdsAuthorizationSource | undefined): HeadersInit | undefined {
  const authorization = source?.getAuthorizationHeader();
  return authorization === undefined ? undefined : { authorization };
}

function requestOptions(options: CommonOptions): { readonly headers?: HeadersInit; readonly signal?: AbortSignal } {
  const headers = headersFor(options.authorization);
  return {
    ...(headers === undefined ? {} : { headers }),
    ...(options.signal === undefined ? {} : { signal: options.signal })
  };
}

function pageData<T extends { page: number; limit: number; total: number }>(data: T, meta: { page?: number | undefined; limit?: number | undefined; total?: number | undefined }, fallback: { page?: number | undefined; limit?: number | undefined; total?: number | undefined }): T {
  return {
    ...data,
    page: meta.page ?? fallback.page ?? data.page,
    limit: meta.limit ?? fallback.limit ?? data.limit,
    total: meta.total ?? fallback.total ?? data.total
  };
}

export async function loadAdminAdRequests(options: AdminAdsRequestLoadOptions = {}): Promise<AdminAdsRequestListData> {
  const query = adAdminRequestListQuerySchema.parse({ page: 1, limit: 20, ...options.query });
  const response = await clientFor(options).request(ADMIN_AD_REQUESTS_API_ROUTE, {
    responseSchema: adAdminRequestListSuccessEnvelopeSchema,
    query,
    ...requestOptions(options)
  });
  return pageData(response.data.data, response.data.meta, query);
}

export async function loadAdminAdRequest(requestId: string, options: CommonOptions = {}): Promise<AdAdminRequest> {
  const id = adRequestIdParamsSchema.parse({ adRequestId: requestId }).adRequestId;
  const response = await clientFor(options).request(`${ADMIN_AD_REQUESTS_API_ROUTE}/${id}`, {
    responseSchema: adAdminRequestSuccessEnvelopeSchema,
    ...requestOptions(options)
  });
  return response.data.data;
}

export async function loadAdminPaymentProofs(options: AdminAdsPaymentProofLoadOptions = {}): Promise<AdminAdsPaymentProofListData> {
  const query = paymentProofAdminListQuerySchema.parse({ page: 1, limit: 20, ...options.query });
  const response = await clientFor(options).request(ADMIN_PAYMENT_PROOFS_API_ROUTE, {
    responseSchema: paymentProofAdminListSuccessEnvelopeSchema,
    query,
    ...requestOptions(options)
  });
  return pageData(response.data.data, response.data.meta, query);
}

export async function reviewAdminPaymentProof(proofId: string, input: unknown, options: CommonOptions = {}): Promise<PaymentProofData> {
  const id = adRequestIdParamsSchema.parse({ adRequestId: proofId }).adRequestId;
  const body = paymentProofReviewSchema.parse(input);
  const response = await clientFor(options).request(`${ADMIN_PAYMENT_PROOFS_API_ROUTE}/${id}/review`, {
    method: 'POST',
    responseSchema: paymentProofSuccessEnvelopeSchema,
    json: body,
    ...requestOptions(options)
  });
  return response.data.data;
}

export async function loadAdminAdCalendar(options: AdminAdsCalendarLoadOptions = {}): Promise<AdminAdsCalendarData> {
  const query = adCalendarQuerySchema.parse({ page: 1, limit: 50, ...options.query });
  const response = await clientFor(options).request(ADMIN_AD_CALENDAR_API_ROUTE, {
    responseSchema: adCalendarListSuccessEnvelopeSchema,
    query,
    ...requestOptions(options)
  });
  return pageData(response.data.data, response.data.meta, query);
}

export async function loadAdminFinancialReview(options: AdminAdsFinancialReviewLoadOptions = {}): Promise<AdminAdsFinancialReviewData> {
  const query = adFinancialReviewQuerySchema.parse({ status: 'all', page: 1, limit: 20, ...options.query });
  const response = await clientFor(options).request(ADMIN_FINANCIAL_REVIEW_API_ROUTE, {
    responseSchema: adFinancialReviewListSuccessEnvelopeSchema,
    query,
    ...requestOptions(options)
  });
  return pageData(response.data.data, response.data.meta, query);
}

export async function loadAdminFinancialDetail(requestId: string, options: CommonOptions = {}): Promise<AdFinancialReviewRow> {
  const id = adRequestIdParamsSchema.parse({ adRequestId: requestId }).adRequestId;
  const response = await clientFor(options).request(`${ADMIN_FINANCIAL_REVIEW_API_ROUTE}/${id}`, {
    responseSchema: adFinancialReviewSuccessEnvelopeSchema,
    ...requestOptions(options)
  });
  return response.data.data;
}

export async function loadAdminLedger(options: AdminAdsLedgerLoadOptions = {}): Promise<AdminAdsLedgerData> {
  const query = adLedgerQuerySchema.parse({ page: 1, limit: 20, ...options.query });
  const response = await clientFor(options).request(ADMIN_LEDGER_API_ROUTE, {
    responseSchema: adLedgerListSuccessEnvelopeSchema,
    query,
    ...requestOptions(options)
  });
  return pageData(response.data.data, response.data.meta, query);
}

export function createAdminAdsRequestLoader(options: Omit<AdminAdsRequestLoadOptions, 'query' | 'signal'> = {}): AdminAdsRequestLoader {
  return (query, signal) => loadAdminAdRequests({ ...options, query, ...(signal === undefined ? {} : { signal }) });
}

export function createAdminAdsRequestDetailLoader(options: Omit<CommonOptions, 'signal'> = {}): AdminAdsRequestDetailLoader {
  return (requestId, signal) => loadAdminAdRequest(requestId, { ...options, ...(signal === undefined ? {} : { signal }) });
}

export function createAdminAdsPaymentProofLoader(options: Omit<AdminAdsPaymentProofLoadOptions, 'query' | 'signal'> = {}): AdminAdsPaymentProofLoader {
  return (query, signal) => loadAdminPaymentProofs({ ...options, query, ...(signal === undefined ? {} : { signal }) });
}

export function createAdminAdsPaymentProofReviewMutation(options: Omit<CommonOptions, 'signal'> = {}): AdminAdsPaymentProofReviewMutation {
  return (proofId, input, signal) => reviewAdminPaymentProof(proofId, input, { ...options, ...(signal === undefined ? {} : { signal }) });
}

export function createAdminAdsCalendarLoader(options: Omit<AdminAdsCalendarLoadOptions, 'query' | 'signal'> = {}): AdminAdsCalendarLoader {
  return (query, signal) => loadAdminAdCalendar({ ...options, query, ...(signal === undefined ? {} : { signal }) });
}

export function createAdminAdsFinancialReviewLoader(options: Omit<AdminAdsFinancialReviewLoadOptions, 'query' | 'signal'> = {}): AdminAdsFinancialReviewLoader {
  return (query, signal) => loadAdminFinancialReview({ ...options, query, ...(signal === undefined ? {} : { signal }) });
}

export function createAdminAdsFinancialDetailLoader(options: Omit<CommonOptions, 'signal'> = {}): AdminAdsFinancialDetailLoader {
  return (requestId, signal) => loadAdminFinancialDetail(requestId, { ...options, ...(signal === undefined ? {} : { signal }) });
}

export function createAdminAdsLedgerLoader(options: Omit<AdminAdsLedgerLoadOptions, 'query' | 'signal'> = {}): AdminAdsLedgerLoader {
  return (query, signal) => loadAdminLedger({ ...options, query, ...(signal === undefined ? {} : { signal }) });
}

export function createAdminAdsSource(options: Omit<CommonOptions, 'signal'> = {}) {
  return {
    loadRequests: createAdminAdsRequestLoader(options),
    loadRequestDetail: createAdminAdsRequestDetailLoader(options),
    loadPaymentProofs: createAdminAdsPaymentProofLoader(options),
    reviewPaymentProof: createAdminAdsPaymentProofReviewMutation(options),
    loadCalendar: createAdminAdsCalendarLoader(options),
    loadFinancialReview: createAdminAdsFinancialReviewLoader(options),
    loadFinancialDetail: createAdminAdsFinancialDetailLoader(options),
    loadLedger: createAdminAdsLedgerLoader(options)
  };
}

export type AdminAdsSource = ReturnType<typeof createAdminAdsSource>;
