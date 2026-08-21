import {
  commissionAccountCommissionSuccessEnvelopeSchema,
  commissionAccountOverrideCreateSchema,
  commissionAccountOverrideSuccessEnvelopeSchema,
  commissionAccountReadQuerySchema,
  commissionChangeLogListQuerySchema,
  commissionChangeLogListSuccessEnvelopeSchema,
  commissionConfirmationListQuerySchema,
  commissionConfirmationListSuccessEnvelopeSchema,
  commissionExceptionCreateSchema,
  commissionExceptionSuccessEnvelopeSchema,
  commissionExceptionListQuerySchema,
  commissionExceptionListSuccessEnvelopeSchema,
  commissionPolicyCreateSchema,
  commissionPolicySuccessEnvelopeSchema,
  commissionPolicyListQuerySchema,
  commissionPolicyListSuccessEnvelopeSchema,
  type CommissionAccountCommission,
  type CommissionAccountOverride,
  type CommissionAccountOverrideCreate,
  type CommissionChangeLogListData,
  type CommissionChangeLogListQuery,
  type CommissionConfirmationListData,
  type CommissionConfirmationListQuery,
  type CommissionException,
  type CommissionExceptionCreate,
  type CommissionExceptionListData,
  type CommissionExceptionListQuery,
  type CommissionPolicy,
  type CommissionPolicyCreate,
  type CommissionPolicyListData,
  type CommissionPolicyListQuery
} from '@sadat-real-estate/contracts';
import { ApiClient, type ApiClientOptions } from '../contracts/index.ts';

export const ADMIN_COMMISSIONS_ROUTE = '/admin/commissions' as const;
export const ADMIN_COMMISSIONS_NEW_ROUTE = '/admin/commissions/new' as const;
export const ADMIN_COMMISSIONS_HISTORY_ROUTE = '/admin/commissions/history' as const;
export const ADMIN_COMMISSIONS_ACCOUNT_ROUTE = '/admin/commissions/account' as const;
export const ADMIN_COMMISSIONS_EXCEPTIONS_ROUTE = '/admin/commissions/exceptions' as const;
export const ADMIN_COMMISSIONS_EXCEPTIONS_NEW_ROUTE = '/admin/commissions/exceptions/new' as const;
export const ADMIN_COMMISSIONS_CONFIRMATIONS_ROUTE = '/admin/commissions/confirmations' as const;

const ADMIN_COMMISSION_POLICIES_API_ROUTE = '/admin/commission-policies' as const;
const ADMIN_COMMISSION_ACCOUNT_API_ROUTE = '/admin/account-commissions' as const;
const ADMIN_COMMISSION_EXCEPTIONS_API_ROUTE = '/admin/commission-exceptions' as const;
const ADMIN_COMMISSION_CONFIRMATIONS_API_ROUTE = '/admin/commission-confirmations' as const;
const ADMIN_COMMISSION_CHANGE_LOG_API_ROUTE = '/admin/commission-change-log' as const;

export interface AdminCommissionAuthorizationSource {
  readonly getAuthorizationHeader: () => string | undefined;
}

interface CommonOptions {
  readonly apiClient?: ApiClient | undefined;
  readonly apiOrigin?: string | undefined;
  readonly authorization?: AdminCommissionAuthorizationSource | undefined;
  readonly signal?: AbortSignal | undefined;
}

export interface AdminCommissionPolicyLoadOptions extends CommonOptions {
  readonly query?: Partial<CommissionPolicyListQuery> | undefined;
}

export interface AdminCommissionExceptionLoadOptions extends CommonOptions {
  readonly query?: Partial<CommissionExceptionListQuery> | undefined;
}

export interface AdminCommissionConfirmationLoadOptions extends CommonOptions {
  readonly query?: Partial<CommissionConfirmationListQuery> | undefined;
}

export interface AdminCommissionChangeLogLoadOptions extends CommonOptions {
  readonly query?: Partial<CommissionChangeLogListQuery> | undefined;
}

export interface AdminCommissionAccountLoadOptions extends CommonOptions {
  readonly query?: Partial<{ at: string }> | undefined;
}

export type AdminCommissionPolicyLoader = (query: CommissionPolicyListQuery, signal?: AbortSignal) => Promise<CommissionPolicyListData>;
export type AdminCommissionPolicyMutation = (input: CommissionPolicyCreate, signal?: AbortSignal) => Promise<CommissionPolicy>;
export type AdminCommissionExceptionLoader = (query: CommissionExceptionListQuery, signal?: AbortSignal) => Promise<CommissionExceptionListData>;
export type AdminCommissionExceptionMutation = (input: CommissionExceptionCreate, signal?: AbortSignal) => Promise<CommissionException>;
export type AdminCommissionAccountLoader = (accountId: string, query?: { readonly at?: string }, signal?: AbortSignal) => Promise<CommissionAccountCommission>;
export type AdminCommissionAccountMutation = (accountId: string, input: CommissionAccountOverrideCreate, signal?: AbortSignal) => Promise<CommissionAccountOverride>;
export type AdminCommissionConfirmationLoader = (query: CommissionConfirmationListQuery, signal?: AbortSignal) => Promise<CommissionConfirmationListData>;
export type AdminCommissionChangeLogLoader = (query: CommissionChangeLogListQuery, signal?: AbortSignal) => Promise<CommissionChangeLogListData>;

function clientFor(options: Pick<CommonOptions, 'apiClient' | 'apiOrigin'>): ApiClient {
  if (options.apiClient !== undefined) return options.apiClient;
  const clientOptions: ApiClientOptions = options.apiOrigin === undefined ? {} : { baseUrl: options.apiOrigin };
  return new ApiClient(clientOptions);
}

function requestOptions(options: CommonOptions): { readonly headers?: HeadersInit; readonly signal?: AbortSignal } {
  const authorization = options.authorization?.getAuthorizationHeader();
  return {
    ...(authorization === undefined ? {} : { headers: { authorization } }),
    ...(options.signal === undefined ? {} : { signal: options.signal })
  };
}

function pageData<T extends { page: number; limit: number; total: number }>(
  data: T,
  meta: { page?: number | undefined; limit?: number | undefined; total?: number | undefined },
  fallback: { page?: number | undefined; limit?: number | undefined; total?: number | undefined }
): T {
  return {
    ...data,
    page: meta.page ?? fallback.page ?? data.page,
    limit: meta.limit ?? fallback.limit ?? data.limit,
    total: meta.total ?? fallback.total ?? data.total
  };
}

function accountIdForPath(accountId: string): string {
  const parsed = commissionAccountReadQuerySchema.extend({ accountId: commissionExceptionListQuerySchema.shape.accountId }).parse({ accountId }).accountId;
  if (parsed === undefined) throw new TypeError('accountId is required');
  return parsed;
}

export async function loadAdminCommissionPolicies(options: AdminCommissionPolicyLoadOptions = {}): Promise<CommissionPolicyListData> {
  const query = commissionPolicyListQuerySchema.parse({ page: 1, limit: 20, ...options.query });
  const response = await clientFor(options).request(ADMIN_COMMISSION_POLICIES_API_ROUTE, {
    responseSchema: commissionPolicyListSuccessEnvelopeSchema,
    query,
    ...requestOptions(options)
  });
  return pageData(response.data.data, response.data.meta, query);
}

export async function createAdminCommissionPolicy(input: unknown, options: Omit<CommonOptions, 'signal'> & { readonly signal?: AbortSignal } = {}): Promise<CommissionPolicy> {
  const body = commissionPolicyCreateSchema.parse(input);
  const response = await clientFor(options).request(ADMIN_COMMISSION_POLICIES_API_ROUTE, {
    method: 'POST',
    responseSchema: commissionPolicySuccessEnvelopeSchema,
    json: body,
    ...requestOptions(options)
  });
  return response.data.data;
}

export async function loadAdminAccountCommission(accountId: string, options: AdminCommissionAccountLoadOptions = {}): Promise<CommissionAccountCommission> {
  const id = accountIdForPath(accountId);
  const query = commissionAccountReadQuerySchema.parse(options.query ?? {});
  const response = await clientFor(options).request(`${ADMIN_COMMISSION_ACCOUNT_API_ROUTE}/${id}`, {
    responseSchema: commissionAccountCommissionSuccessEnvelopeSchema,
    query,
    ...requestOptions(options)
  });
  return response.data.data;
}

export async function createAdminAccountCommissionOverride(accountId: string, input: unknown, options: Omit<CommonOptions, 'signal'> & { readonly signal?: AbortSignal } = {}): Promise<CommissionAccountOverride> {
  const id = accountIdForPath(accountId);
  const body = commissionAccountOverrideCreateSchema.parse(input);
  const response = await clientFor(options).request(`${ADMIN_COMMISSION_ACCOUNT_API_ROUTE}/${id}`, {
    method: 'PUT',
    responseSchema: commissionAccountOverrideSuccessEnvelopeSchema,
    json: body,
    ...requestOptions(options)
  });
  return response.data.data;
}

export async function loadAdminCommissionExceptions(options: AdminCommissionExceptionLoadOptions = {}): Promise<CommissionExceptionListData> {
  const query = commissionExceptionListQuerySchema.parse({ page: 1, limit: 20, ...options.query });
  const response = await clientFor(options).request(ADMIN_COMMISSION_EXCEPTIONS_API_ROUTE, {
    responseSchema: commissionExceptionListSuccessEnvelopeSchema,
    query,
    ...requestOptions(options)
  });
  return pageData(response.data.data, response.data.meta, query);
}

export async function createAdminCommissionException(input: unknown, options: Omit<CommonOptions, 'signal'> & { readonly signal?: AbortSignal } = {}): Promise<CommissionException> {
  const body = commissionExceptionCreateSchema.parse(input);
  const response = await clientFor(options).request(ADMIN_COMMISSION_EXCEPTIONS_API_ROUTE, {
    method: 'POST',
    responseSchema: commissionExceptionSuccessEnvelopeSchema,
    json: body,
    ...requestOptions(options)
  });
  return response.data.data;
}

export async function loadAdminCommissionConfirmations(options: AdminCommissionConfirmationLoadOptions = {}): Promise<CommissionConfirmationListData> {
  const query = commissionConfirmationListQuerySchema.parse({ page: 1, limit: 20, ...options.query });
  const response = await clientFor(options).request(ADMIN_COMMISSION_CONFIRMATIONS_API_ROUTE, {
    responseSchema: commissionConfirmationListSuccessEnvelopeSchema,
    query,
    ...requestOptions(options)
  });
  return pageData(response.data.data, response.data.meta, query);
}

export async function loadAdminCommissionChangeLog(options: AdminCommissionChangeLogLoadOptions = {}): Promise<CommissionChangeLogListData> {
  const query = commissionChangeLogListQuerySchema.parse({ page: 1, limit: 25, ...options.query });
  const response = await clientFor(options).request(ADMIN_COMMISSION_CHANGE_LOG_API_ROUTE, {
    responseSchema: commissionChangeLogListSuccessEnvelopeSchema,
    query,
    ...requestOptions(options)
  });
  return pageData(response.data.data, response.data.meta, query);
}

export function createAdminCommissionsSource(options: Omit<CommonOptions, 'signal'> = {}) {
  return {
    loadPolicies: (query: CommissionPolicyListQuery, signal?: AbortSignal) => loadAdminCommissionPolicies({ ...options, query, ...(signal === undefined ? {} : { signal }) }),
    createPolicy: (input: CommissionPolicyCreate, signal?: AbortSignal) => createAdminCommissionPolicy(input, { ...options, ...(signal === undefined ? {} : { signal }) }),
    loadAccount: (accountId: string, query?: { readonly at?: string }, signal?: AbortSignal) => loadAdminAccountCommission(accountId, { ...options, query, ...(signal === undefined ? {} : { signal }) }),
    createAccountOverride: (accountId: string, input: CommissionAccountOverrideCreate, signal?: AbortSignal) => createAdminAccountCommissionOverride(accountId, input, { ...options, ...(signal === undefined ? {} : { signal }) }),
    loadExceptions: (query: CommissionExceptionListQuery, signal?: AbortSignal) => loadAdminCommissionExceptions({ ...options, query, ...(signal === undefined ? {} : { signal }) }),
    createException: (input: CommissionExceptionCreate, signal?: AbortSignal) => createAdminCommissionException(input, { ...options, ...(signal === undefined ? {} : { signal }) }),
    loadConfirmations: (query: CommissionConfirmationListQuery, signal?: AbortSignal) => loadAdminCommissionConfirmations({ ...options, query, ...(signal === undefined ? {} : { signal }) }),
    loadChangeLog: (query: CommissionChangeLogListQuery, signal?: AbortSignal) => loadAdminCommissionChangeLog({ ...options, query, ...(signal === undefined ? {} : { signal }) })
  };
}

export type AdminCommissionsSource = ReturnType<typeof createAdminCommissionsSource>;
