import {
  communityAdminCommentListQuerySchema,
  communityAdminCommentListSuccessEnvelopeSchema,
  communityAdminPostListQuerySchema,
  communityAdminPostListSuccessEnvelopeSchema,
  communityAdminReportListQuerySchema,
  communityAdminReportListSuccessEnvelopeSchema,
  communityAdminReportResolveSuccessEnvelopeSchema,
  communityReportIdParamsSchema,
  communityReportResolveSchema,
  type CommunityAdminCommentListData,
  type CommunityAdminCommentListQuery,
  type CommunityAdminPostListData,
  type CommunityAdminPostListQuery,
  type CommunityAdminReport,
  type CommunityAdminReportListData,
  type CommunityAdminReportListQuery,
  type CommunityReportResolve
} from '@sadat-real-estate/contracts';
import { ApiClient, type ApiClientOptions } from '../contracts/index.ts';

export const ADMIN_COMMUNITY_POSTS_ROUTE = '/admin/community/posts' as const;
export const ADMIN_COMMUNITY_POSTS_SCREEN_ROUTE = '/admin/community' as const;
export const ADMIN_COMMUNITY_COMMENTS_ROUTE = '/admin/community/comments' as const;
export const ADMIN_COMMUNITY_REPORTS_ROUTE = '/admin/community/moderation' as const;
export const ADMIN_COMMUNITY_REPORTS_API_ROUTE = '/admin/community/reports' as const;

export interface AdminCommunityAuthorizationSource {
  readonly getAuthorizationHeader: () => string | undefined;
}

interface CommonOptions {
  readonly apiClient?: ApiClient | undefined;
  readonly apiOrigin?: string | undefined;
  readonly authorization?: AdminCommunityAuthorizationSource | undefined;
  readonly signal?: AbortSignal | undefined;
}

export interface AdminCommunityPostLoadOptions extends CommonOptions {
  readonly query?: Partial<CommunityAdminPostListQuery> | undefined;
}

export interface AdminCommunityCommentLoadOptions extends CommonOptions {
  readonly query?: Partial<CommunityAdminCommentListQuery> | undefined;
}

export interface AdminCommunityReportLoadOptions extends CommonOptions {
  readonly query?: Partial<CommunityAdminReportListQuery> | undefined;
}

export type AdminCommunityPostsLoader = (query: CommunityAdminPostListQuery, signal?: AbortSignal) => Promise<CommunityAdminPostListData>;
export type AdminCommunityCommentsLoader = (query: CommunityAdminCommentListQuery, signal?: AbortSignal) => Promise<CommunityAdminCommentListData>;
export type AdminCommunityReportsLoader = (query: CommunityAdminReportListQuery, signal?: AbortSignal) => Promise<CommunityAdminReportListData>;
export type AdminCommunityReportResolver = (reportId: string, input: CommunityReportResolve, signal?: AbortSignal) => Promise<CommunityAdminReport>;

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

export async function loadAdminCommunityPosts(options: AdminCommunityPostLoadOptions = {}): Promise<CommunityAdminPostListData> {
  const query = communityAdminPostListQuerySchema.parse({ page: 1, limit: 20, ...options.query });
  const response = await clientFor(options).request(ADMIN_COMMUNITY_POSTS_ROUTE, {
    responseSchema: communityAdminPostListSuccessEnvelopeSchema,
    query,
    ...requestOptions(options)
  });
  return {
    ...response.data.data,
    page: response.data.meta.page ?? query.page,
    limit: response.data.meta.limit ?? query.limit,
    total: response.data.meta.total ?? response.data.data.items.length
  };
}

export async function loadAdminCommunityComments(options: AdminCommunityCommentLoadOptions = {}): Promise<CommunityAdminCommentListData> {
  const query = communityAdminCommentListQuerySchema.parse({ page: 1, limit: 20, ...options.query });
  const response = await clientFor(options).request(ADMIN_COMMUNITY_COMMENTS_ROUTE, {
    responseSchema: communityAdminCommentListSuccessEnvelopeSchema,
    query,
    ...requestOptions(options)
  });
  return {
    ...response.data.data,
    page: response.data.meta.page ?? query.page,
    limit: response.data.meta.limit ?? query.limit,
    total: response.data.meta.total ?? response.data.data.items.length
  };
}

export async function loadAdminCommunityReports(options: AdminCommunityReportLoadOptions = {}): Promise<CommunityAdminReportListData> {
  const query = communityAdminReportListQuerySchema.parse({ page: 1, limit: 20, ...options.query });
  const response = await clientFor(options).request(ADMIN_COMMUNITY_REPORTS_API_ROUTE, {
    responseSchema: communityAdminReportListSuccessEnvelopeSchema,
    query,
    ...requestOptions(options)
  });
  return {
    ...response.data.data,
    page: response.data.meta.page ?? query.page,
    limit: response.data.meta.limit ?? query.limit,
    total: response.data.meta.total ?? response.data.data.items.length
  };
}

export async function resolveAdminCommunityReport(reportId: string, input: unknown, options: CommonOptions = {}): Promise<CommunityAdminReport> {
  const id = communityReportIdParamsSchema.parse({ reportId }).reportId;
  const body = communityReportResolveSchema.parse(input);
  const response = await clientFor(options).request(`${ADMIN_COMMUNITY_REPORTS_API_ROUTE}/${id}/resolve`, {
    method: 'POST',
    responseSchema: communityAdminReportResolveSuccessEnvelopeSchema,
    json: body,
    ...requestOptions(options)
  });
  return response.data.data;
}

export function createAdminCommunitySource(options: Omit<CommonOptions, 'signal'> = {}) {
  return {
    loadPosts: (query: CommunityAdminPostListQuery, signal?: AbortSignal) => loadAdminCommunityPosts({ ...options, query, ...(signal === undefined ? {} : { signal }) }),
    loadComments: (query: CommunityAdminCommentListQuery, signal?: AbortSignal) => loadAdminCommunityComments({ ...options, query, ...(signal === undefined ? {} : { signal }) }),
    loadReports: (query: CommunityAdminReportListQuery, signal?: AbortSignal) => loadAdminCommunityReports({ ...options, query, ...(signal === undefined ? {} : { signal }) }),
    resolveReport: (reportId: string, input: CommunityReportResolve, signal?: AbortSignal) => resolveAdminCommunityReport(reportId, input, { ...options, ...(signal === undefined ? {} : { signal }) })
  };
}

export type AdminCommunitySource = ReturnType<typeof createAdminCommunitySource>;
