import {
  accountObjectIdSchema,
  accountReportDataSchema,
  accountReportListDataSchema,
  accountReportListQuerySchema,
  accountReportResolveSchema,
  accountTransitionRequestSchema,
  accountTransitionSuccessEnvelopeSchema,
  adminAccountUserListQuerySchema,
  adminAccountUserListSuccessEnvelopeSchema,
  adminProviderListQuerySchema,
  adminProviderListSuccessEnvelopeSchema,
  adminProviderSuccessEnvelopeSchema,
  adminAccountUserSuccessEnvelopeSchema,
  providerDocumentAccessRequestSchema,
  providerDocumentAccessSuccessEnvelopeSchema,
  successEnvelopeSchema,
  type AccountReportData,
  type AccountReportListData,
  type AccountReportListQuery,
  type AccountReportResolve,
  type AccountTransitionData,
  type AccountTransitionRequest,
  type AdminAccountUserData,
  type AdminAccountUserListData,
  type AdminAccountUserListQuery,
  type AdminProviderData,
  type AdminProviderListData,
  type AdminProviderListQuery,
  type ProviderDocumentAccessData
} from '@sadat-real-estate/contracts';
import { ApiClient, type ApiClientOptions } from '../contracts/index.ts';

export const ADMIN_USERS_ROUTE = '/admin/users' as const;
export const ADMIN_PROVIDERS_ROUTE = '/admin/providers' as const;
export const ADMIN_PROVIDER_DOCUMENT_ACCESS_ROUTE = '/admin/provider-documents' as const;
export const ADMIN_ACCOUNT_REPORTS_ROUTE = '/admin/account-reports' as const;

const accountReportListSuccessEnvelopeSchema = successEnvelopeSchema(accountReportListDataSchema);
const accountReportSuccessEnvelopeSchema = successEnvelopeSchema(accountReportDataSchema);

export interface AdminAccountsAuthorizationSource {
  readonly getAuthorizationHeader: () => string | undefined;
}

interface CommonLoadOptions {
  readonly apiClient?: ApiClient | undefined;
  readonly apiOrigin?: string | undefined;
  readonly authorization?: AdminAccountsAuthorizationSource | undefined;
  readonly signal?: AbortSignal | undefined;
}

export interface AdminUsersLoadOptions extends CommonLoadOptions {
  readonly query?: Partial<AdminAccountUserListQuery> | undefined;
}

export interface AdminProvidersLoadOptions extends CommonLoadOptions {
  readonly query?: Partial<AdminProviderListQuery> | undefined;
}

export interface AdminAccountReportsLoadOptions extends CommonLoadOptions {
  readonly query?: Partial<AccountReportListQuery> | undefined;
}

export type AdminUsersLoader = (query: AdminAccountUserListQuery, signal?: AbortSignal) => Promise<AdminAccountUserListData>;
export type AdminUserLoader = (userId: string, signal?: AbortSignal) => Promise<AdminAccountUserData>;
export type AdminProvidersLoader = (query: AdminProviderListQuery, signal?: AbortSignal) => Promise<AdminProviderListData>;
export type AdminProviderLoader = (providerId: string, signal?: AbortSignal) => Promise<AdminProviderData>;
export type AdminDocumentAccessLoader = (documentId: string, purpose: string, signal?: AbortSignal) => Promise<ProviderDocumentAccessData>;
export type AdminAccountReportsLoader = (query: AccountReportListQuery, signal?: AbortSignal) => Promise<AccountReportListData>;
export type AdminAccountReportResolver = (reportId: string, input: AccountReportResolve, signal?: AbortSignal) => Promise<AccountReportData>;
export type AdminAccountTransitionLoader = (userId: string, input: AccountTransitionRequest, signal?: AbortSignal) => Promise<AccountTransitionData>;

function clientFor(options: Pick<CommonLoadOptions, 'apiClient' | 'apiOrigin'>): ApiClient {
  if (options.apiClient !== undefined) return options.apiClient;
  const clientOptions: ApiClientOptions = options.apiOrigin === undefined ? {} : { baseUrl: options.apiOrigin };
  return new ApiClient(clientOptions);
}

function headersFor(source: AdminAccountsAuthorizationSource | undefined): HeadersInit | undefined {
  const authorization = source?.getAuthorizationHeader();
  return authorization === undefined ? undefined : { authorization };
}

export async function loadAdminUsers(options: AdminUsersLoadOptions = {}): Promise<AdminAccountUserListData> {
  const client = clientFor(options);
  const headers = headersFor(options.authorization);
  const query = adminAccountUserListQuerySchema.parse({ page: 1, limit: 20, ...options.query });
  const response = await client.request(ADMIN_USERS_ROUTE, { responseSchema: adminAccountUserListSuccessEnvelopeSchema, query, ...(headers === undefined ? {} : { headers }), ...(options.signal === undefined ? {} : { signal: options.signal }) });
  return response.data.data;
}

export async function loadAdminUser(userId: string, options: CommonLoadOptions = {}): Promise<AdminAccountUserData> {
  const id = accountObjectIdSchema.parse(userId);
  const client = clientFor(options);
  const headers = headersFor(options.authorization);
  const response = await client.request(`${ADMIN_USERS_ROUTE}/${id}`, { responseSchema: adminAccountUserSuccessEnvelopeSchema, ...(headers === undefined ? {} : { headers }), ...(options.signal === undefined ? {} : { signal: options.signal }) });
  return response.data.data;
}

export async function loadAdminProviders(options: AdminProvidersLoadOptions = {}): Promise<AdminProviderListData> {
  const client = clientFor(options);
  const headers = headersFor(options.authorization);
  const query = adminProviderListQuerySchema.parse({ page: 1, limit: 20, ...options.query });
  const response = await client.request(ADMIN_PROVIDERS_ROUTE, { responseSchema: adminProviderListSuccessEnvelopeSchema, query, ...(headers === undefined ? {} : { headers }), ...(options.signal === undefined ? {} : { signal: options.signal }) });
  return response.data.data;
}

export async function loadAdminProvider(providerId: string, options: CommonLoadOptions = {}): Promise<AdminProviderData> {
  const id = accountObjectIdSchema.parse(providerId);
  const client = clientFor(options);
  const headers = headersFor(options.authorization);
  const response = await client.request(`${ADMIN_PROVIDERS_ROUTE}/${id}`, { responseSchema: adminProviderSuccessEnvelopeSchema, ...(headers === undefined ? {} : { headers }), ...(options.signal === undefined ? {} : { signal: options.signal }) });
  return response.data.data;
}

export async function loadAdminDocumentAccess(documentId: string, purpose: string, options: CommonLoadOptions = {}): Promise<ProviderDocumentAccessData> {
  const id = accountObjectIdSchema.parse(documentId);
  const request = providerDocumentAccessRequestSchema.parse({ purpose });
  const client = clientFor(options);
  const headers = headersFor(options.authorization);
  const response = await client.request(`${ADMIN_PROVIDER_DOCUMENT_ACCESS_ROUTE}/${id}/access`, { responseSchema: providerDocumentAccessSuccessEnvelopeSchema, query: request, ...(headers === undefined ? {} : { headers }), ...(options.signal === undefined ? {} : { signal: options.signal }) });
  return response.data.data;
}

export async function loadAdminAccountReports(options: AdminAccountReportsLoadOptions = {}): Promise<AccountReportListData> {
  const client = clientFor(options);
  const headers = headersFor(options.authorization);
  const query = accountReportListQuerySchema.parse({ page: 1, limit: 20, ...options.query });
  const response = await client.request(ADMIN_ACCOUNT_REPORTS_ROUTE, { responseSchema: accountReportListSuccessEnvelopeSchema, query, ...(headers === undefined ? {} : { headers }), ...(options.signal === undefined ? {} : { signal: options.signal }) });
  return response.data.data;
}

export async function resolveAdminAccountReport(reportId: string, input: AccountReportResolve, options: CommonLoadOptions = {}): Promise<AccountReportData> {
  const id = accountObjectIdSchema.parse(reportId);
  const body = accountReportResolveSchema.parse(input);
  const client = clientFor(options);
  const headers = headersFor(options.authorization);
  const response = await client.request(`${ADMIN_ACCOUNT_REPORTS_ROUTE}/${id}/resolve`, { method: 'POST', responseSchema: accountReportSuccessEnvelopeSchema, json: body, ...(headers === undefined ? {} : { headers }), ...(options.signal === undefined ? {} : { signal: options.signal }) });
  return response.data.data;
}

export async function transitionAdminAccount(userId: string, input: AccountTransitionRequest, options: CommonLoadOptions = {}): Promise<AccountTransitionData> {
  const id = accountObjectIdSchema.parse(userId);
  const body = accountTransitionRequestSchema.parse(input);
  const client = clientFor(options);
  const headers = headersFor(options.authorization);
  const response = await client.request(`${ADMIN_USERS_ROUTE}/${id}/transitions`, { method: 'POST', responseSchema: accountTransitionSuccessEnvelopeSchema, json: body, ...(headers === undefined ? {} : { headers }), ...(options.signal === undefined ? {} : { signal: options.signal }) });
  return response.data.data;
}

export function createAdminUsersLoader(options: Omit<AdminUsersLoadOptions, 'query' | 'signal'> = {}): AdminUsersLoader {
  return (query, signal) => loadAdminUsers({ ...options, query, ...(signal === undefined ? {} : { signal }) });
}

export function createAdminUserLoader(options: Omit<CommonLoadOptions, 'signal'> = {}): AdminUserLoader {
  return (userId, signal) => loadAdminUser(userId, { ...options, ...(signal === undefined ? {} : { signal }) });
}

export function createAdminProvidersLoader(options: Omit<AdminProvidersLoadOptions, 'query' | 'signal'> = {}): AdminProvidersLoader {
  return (query, signal) => loadAdminProviders({ ...options, query, ...(signal === undefined ? {} : { signal }) });
}

export function createAdminProviderLoader(options: Omit<CommonLoadOptions, 'signal'> = {}): AdminProviderLoader {
  return (providerId, signal) => loadAdminProvider(providerId, { ...options, ...(signal === undefined ? {} : { signal }) });
}

export function createAdminDocumentAccessLoader(options: Omit<CommonLoadOptions, 'signal'> = {}): AdminDocumentAccessLoader {
  return (documentId, purpose, signal) => loadAdminDocumentAccess(documentId, purpose, { ...options, ...(signal === undefined ? {} : { signal }) });
}

export function createAdminAccountReportsLoader(options: Omit<AdminAccountReportsLoadOptions, 'query' | 'signal'> = {}): AdminAccountReportsLoader {
  return (query, signal) => loadAdminAccountReports({ ...options, query, ...(signal === undefined ? {} : { signal }) });
}

export function createAdminAccountReportResolver(options: Omit<CommonLoadOptions, 'signal'> = {}): AdminAccountReportResolver {
  return (reportId, input, signal) => resolveAdminAccountReport(reportId, input, { ...options, ...(signal === undefined ? {} : { signal }) });
}

export function createAdminAccountTransitionLoader(options: Omit<CommonLoadOptions, 'signal'> = {}): AdminAccountTransitionLoader {
  return (userId, input, signal) => transitionAdminAccount(userId, input, { ...options, ...(signal === undefined ? {} : { signal }) });
}
