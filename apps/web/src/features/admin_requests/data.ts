import {
  overdueRequestListDataSchema,
  requestAssignmentSchema,
  requestDataSchema,
  requestIdParamsSchema,
  requestIssueListDataSchema,
  requestIssueResolveSchema,
  requestIssueSchema,
  requestListDataSchema,
  requestListQuerySchema,
  requestNoteSchema,
  requestTransitionRequestSchema,
  successEnvelopeSchema,
  viewingListDataSchema,
  viewingListQuerySchema,
  type OverdueRequestListData,
  type RequestAssignment,
  type RequestData,
  type RequestIssue,
  type RequestIssueListData,
  type RequestIssueResolve,
  type RequestListData,
  type RequestListQuery,
  type RequestNote,
  type RequestTransitionRequest,
  type ViewingListData,
  type ViewingListQuery
} from '@sadat-real-estate/contracts';
import { ApiClient, type ApiClientOptions } from '../contracts/index.ts';

export const ADMIN_REQUESTS_ROUTE = '/admin/requests' as const;
export const ADMIN_OVERDUE_REQUESTS_ROUTE = '/admin/requests/overdue' as const;
export const ADMIN_VIEWINGS_ROUTE = '/admin/viewings' as const;
export const ADMIN_REQUEST_ISSUES_ROUTE = '/admin/request-issues' as const;

export interface AdminRequestsAuthorizationSource {
  readonly getAuthorizationHeader: () => string | undefined;
}

interface CommonOptions {
  readonly apiClient?: ApiClient | undefined;
  readonly apiOrigin?: string | undefined;
  readonly authorization?: AdminRequestsAuthorizationSource | undefined;
  readonly signal?: AbortSignal | undefined;
}

export interface AdminRequestsLoadOptions extends CommonOptions {
  readonly query?: Partial<RequestListQuery> | undefined;
}

export interface AdminViewingsLoadOptions extends CommonOptions {
  readonly query?: Partial<ViewingListQuery> | undefined;
}

export interface AdminRequestIssuesLoadOptions extends CommonOptions {
  readonly page?: number | undefined;
  readonly limit?: number | undefined;
}

export type AdminRequestsLoader = (query: RequestListQuery, signal?: AbortSignal) => Promise<RequestListData>;
export type AdminOverdueRequestsLoader = (query: RequestListQuery, signal?: AbortSignal) => Promise<OverdueRequestListData>;
export type AdminViewingsLoader = (query: ViewingListQuery, signal?: AbortSignal) => Promise<ViewingListData>;
export type AdminRequestIssuesLoader = (page: number, limit: number, signal?: AbortSignal) => Promise<RequestIssueListData>;
export type AdminRequestLoader = (requestId: string, signal?: AbortSignal) => Promise<RequestData>;
export type AdminRequestMutation = (requestId: string, input: unknown, signal?: AbortSignal) => Promise<RequestData>;
export type AdminIssueMutation = (issueId: string, input: unknown, signal?: AbortSignal) => Promise<RequestIssue>;

function clientFor(options: Pick<CommonOptions, 'apiClient' | 'apiOrigin'>): ApiClient {
  if (options.apiClient !== undefined) return options.apiClient;
  const clientOptions: ApiClientOptions = options.apiOrigin === undefined ? {} : { baseUrl: options.apiOrigin };
  return new ApiClient(clientOptions);
}

function headersFor(source: AdminRequestsAuthorizationSource | undefined): HeadersInit | undefined {
  const authorization = source?.getAuthorizationHeader();
  return authorization === undefined ? undefined : { authorization };
}

function requestQuery(query: Partial<RequestListQuery> | undefined): RequestListQuery {
  return requestListQuerySchema.parse({ page: 1, limit: 20, ...query });
}

function requestQueryValues(query: RequestListQuery): Readonly<Record<string, string | number | undefined>> {
  return {
    ...(query.status === undefined ? {} : { status: query.status }),
    ...(query.type === undefined ? {} : { type: query.type }),
    ...(query.source === undefined ? {} : { source: query.source }),
    ...(query.assignedTo === undefined ? {} : { assignedTo: query.assignedTo }),
    page: query.page,
    limit: query.limit,
    ...(query.search === undefined ? {} : { search: query.search })
  };
}

function viewingQuery(query: Partial<ViewingListQuery> | undefined): ViewingListQuery {
  return viewingListQuerySchema.parse({ page: 1, limit: 20, ...query });
}

function viewingQueryValues(query: ViewingListQuery): Readonly<Record<string, string | number | undefined>> {
  return {
    ...(query.status === undefined ? {} : { status: query.status }),
    page: query.page,
    limit: query.limit
  };
}

export async function loadAdminRequests(options: AdminRequestsLoadOptions = {}): Promise<RequestListData> {
  const query = requestQuery(options.query);
  const headers = headersFor(options.authorization);
  const response = await clientFor(options).request(ADMIN_REQUESTS_ROUTE, {
    responseSchema: successEnvelopeSchema(requestListDataSchema),
    query: requestQueryValues(query),
    ...(headers === undefined ? {} : { headers }),
    ...(options.signal === undefined ? {} : { signal: options.signal })
  });
  return response.data.data;
}

export async function loadAdminOverdueRequests(options: AdminRequestsLoadOptions = {}): Promise<OverdueRequestListData> {
  const query = requestQuery(options.query);
  const headers = headersFor(options.authorization);
  const response = await clientFor(options).request(ADMIN_OVERDUE_REQUESTS_ROUTE, {
    responseSchema: successEnvelopeSchema(overdueRequestListDataSchema),
    query: requestQueryValues(query),
    ...(headers === undefined ? {} : { headers }),
    ...(options.signal === undefined ? {} : { signal: options.signal })
  });
  return response.data.data;
}

export async function loadAdminRequest(requestId: string, options: CommonOptions = {}): Promise<RequestData> {
  const id = requestIdParamsSchema.parse({ requestId }).requestId;
  const headers = headersFor(options.authorization);
  const response = await clientFor(options).request(`${ADMIN_REQUESTS_ROUTE}/${id}`, {
    responseSchema: successEnvelopeSchema(requestDataSchema),
    ...(headers === undefined ? {} : { headers }),
    ...(options.signal === undefined ? {} : { signal: options.signal })
  });
  return response.data.data;
}

export async function loadAdminViewings(options: AdminViewingsLoadOptions = {}): Promise<ViewingListData> {
  const query = viewingQuery(options.query);
  const headers = headersFor(options.authorization);
  const response = await clientFor(options).request(ADMIN_VIEWINGS_ROUTE, {
    responseSchema: successEnvelopeSchema(viewingListDataSchema),
    query: viewingQueryValues(query),
    ...(headers === undefined ? {} : { headers }),
    ...(options.signal === undefined ? {} : { signal: options.signal })
  });
  return response.data.data;
}

export async function loadAdminRequestIssues(options: AdminRequestIssuesLoadOptions = {}): Promise<RequestIssueListData> {
  const query = requestQuery({ page: options.page ?? 1, limit: options.limit ?? 20 });
  const headers = headersFor(options.authorization);
  const response = await clientFor(options).request(ADMIN_REQUEST_ISSUES_ROUTE, {
    responseSchema: successEnvelopeSchema(requestIssueListDataSchema),
    query: requestQueryValues(query),
    ...(headers === undefined ? {} : { headers }),
    ...(options.signal === undefined ? {} : { signal: options.signal })
  });
  return response.data.data;
}

export async function assignAdminRequest(requestId: string, input: unknown, options: CommonOptions = {}): Promise<RequestData> {
  const id = requestIdParamsSchema.parse({ requestId }).requestId;
  const body: RequestAssignment = requestAssignmentSchema.parse(input);
  const headers = headersFor(options.authorization);
  const response = await clientFor(options).request(`${ADMIN_REQUESTS_ROUTE}/${id}/assign`, {
    method: 'POST',
    responseSchema: successEnvelopeSchema(requestDataSchema),
    json: body,
    ...(headers === undefined ? {} : { headers }),
    ...(options.signal === undefined ? {} : { signal: options.signal })
  });
  return response.data.data;
}

export async function addAdminRequestNote(requestId: string, input: unknown, options: CommonOptions = {}): Promise<RequestData> {
  const id = requestIdParamsSchema.parse({ requestId }).requestId;
  const body: RequestNote = requestNoteSchema.parse(input);
  const headers = headersFor(options.authorization);
  const response = await clientFor(options).request(`${ADMIN_REQUESTS_ROUTE}/${id}/notes`, {
    method: 'POST',
    responseSchema: successEnvelopeSchema(requestDataSchema),
    json: body,
    ...(headers === undefined ? {} : { headers }),
    ...(options.signal === undefined ? {} : { signal: options.signal })
  });
  return response.data.data;
}

export async function transitionAdminRequest(requestId: string, input: unknown, options: CommonOptions = {}): Promise<RequestData> {
  const id = requestIdParamsSchema.parse({ requestId }).requestId;
  const body: RequestTransitionRequest = requestTransitionRequestSchema.parse(input);
  const headers = headersFor(options.authorization);
  const response = await clientFor(options).request(`${ADMIN_REQUESTS_ROUTE}/${id}/transitions`, {
    method: 'POST',
    responseSchema: successEnvelopeSchema(requestDataSchema),
    json: body,
    ...(headers === undefined ? {} : { headers }),
    ...(options.signal === undefined ? {} : { signal: options.signal })
  });
  return response.data.data;
}

export async function resolveAdminRequestIssue(issueId: string, input: unknown, options: CommonOptions = {}): Promise<RequestIssue> {
  const id = requestIdParamsSchema.parse({ requestId: issueId }).requestId;
  const body: RequestIssueResolve = requestIssueResolveSchema.parse(input);
  const headers = headersFor(options.authorization);
  const response = await clientFor(options).request(`${ADMIN_REQUEST_ISSUES_ROUTE}/${id}/resolve`, {
    method: 'POST',
    responseSchema: successEnvelopeSchema(requestIssueSchema),
    json: body,
    ...(headers === undefined ? {} : { headers }),
    ...(options.signal === undefined ? {} : { signal: options.signal })
  });
  return response.data.data;
}

export function createAdminRequestsSource(options: Omit<CommonOptions, 'signal'> = {}) {
  return {
    load: (query: RequestListQuery, signal?: AbortSignal) => loadAdminRequests({ ...options, query, ...(signal === undefined ? {} : { signal }) }),
    overdue: (query: RequestListQuery, signal?: AbortSignal) => loadAdminOverdueRequests({ ...options, query, ...(signal === undefined ? {} : { signal }) }),
    loadOne: (requestId: string, signal?: AbortSignal) => loadAdminRequest(requestId, { ...options, ...(signal === undefined ? {} : { signal }) }),
    viewings: (query: ViewingListQuery, signal?: AbortSignal) => loadAdminViewings({ ...options, query, ...(signal === undefined ? {} : { signal }) }),
    issues: (page: number, limit: number, signal?: AbortSignal) => loadAdminRequestIssues({ ...options, page, limit, ...(signal === undefined ? {} : { signal }) }),
    assign: (requestId: string, input: unknown, signal?: AbortSignal) => assignAdminRequest(requestId, input, { ...options, ...(signal === undefined ? {} : { signal }) }),
    note: (requestId: string, input: unknown, signal?: AbortSignal) => addAdminRequestNote(requestId, input, { ...options, ...(signal === undefined ? {} : { signal }) }),
    transition: (requestId: string, input: unknown, signal?: AbortSignal) => transitionAdminRequest(requestId, input, { ...options, ...(signal === undefined ? {} : { signal }) }),
    resolveIssue: (issueId: string, input: unknown, signal?: AbortSignal) => resolveAdminRequestIssue(issueId, input, { ...options, ...(signal === undefined ? {} : { signal }) })
  };
}

export type AdminRequestsSource = ReturnType<typeof createAdminRequestsSource>;
