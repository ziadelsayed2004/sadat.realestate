import {
  communityCommentMutationSuccessEnvelopeSchema,
  communityCommentCreateRequestSchema,
  communityPostIdParamsSchema,
  communityPostCreateSchema,
  communityPostMutationSuccessEnvelopeSchema,
  communityPublicListQuerySchema,
  communityPublicPostDetailSuccessEnvelopeSchema,
  communityPublicPostListSuccessEnvelopeSchema,
  communityReportCreateRequestSchema,
  communityReportSuccessEnvelopeSchema,
  type CommunityCommentCreate,
  type CommunityPublicPostDetailData,
  type CommunityPublicPostListData,
  type CommunityPublicListQuery,
  type CommunityPostCreate,
  type CommunityReportCreate
} from '@sadat-real-estate/contracts';
import { ApiClient, type ApiClientOptions } from '../contracts/index.ts';

export const PUBLIC_COMMUNITY_ROUTE = '/public/community/posts' as const;
export const PUBLIC_COMMUNITY_PATH = '/community' as const;

const DEFAULT_QUERY = communityPublicListQuerySchema.parse({});

export interface CommunityListLoadOptions {
  readonly query: CommunityPublicListQuery;
  readonly apiClient?: ApiClient | undefined;
  readonly apiOrigin?: string | undefined;
  readonly signal?: AbortSignal | undefined;
}

export interface CommunityDetailLoadOptions {
  readonly postId: string;
  readonly apiClient?: ApiClient | undefined;
  readonly apiOrigin?: string | undefined;
  readonly signal?: AbortSignal | undefined;
}

export interface CommunityMutationOptions {
  readonly apiClient?: ApiClient | undefined;
  readonly apiOrigin?: string | undefined;
  readonly getAuthorizationHeader?: (() => string | undefined) | undefined;
}

export type CommunityListLoader = (
  query: CommunityPublicListQuery,
  signal?: AbortSignal
) => Promise<CommunityPublicPostListData>;

export type CommunityDetailLoader = (
  postId: string,
  signal?: AbortSignal
) => Promise<CommunityPublicPostDetailData>;

export interface CommunityMutationApi {
  readonly createPost: (input: CommunityPostCreate) => Promise<void>;
  readonly createComment: (postId: string, input: Omit<CommunityCommentCreate, 'postId'>) => Promise<void>;
  readonly reportPost: (postId: string, input: Omit<CommunityReportCreate, 'postId'>) => Promise<void>;
}

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

export function defaultCommunityListQuery(): CommunityPublicListQuery {
  return communityPublicListQuerySchema.parse(DEFAULT_QUERY);
}

export function parseCommunityListQuery(source: URLSearchParams | URL | string): CommunityPublicListQuery {
  const params = paramsForSource(source);
  const raw: Record<string, string | number> = {};
  const page = params.get('page');
  const limit = params.get('limit');
  if (page !== null && page.trim().length > 0) raw.page = Number(page);
  if (limit !== null && limit.trim().length > 0) raw.limit = Number(limit);
  const parsed = communityPublicListQuerySchema.safeParse(raw);
  return parsed.success ? parsed.data : defaultCommunityListQuery();
}

export function loadPublicCommunity(options: CommunityListLoadOptions): Promise<CommunityPublicPostListData> {
  const client = clientFor(options);
  const requestOptions = options.signal === undefined
    ? { responseSchema: communityPublicPostListSuccessEnvelopeSchema, query: options.query }
    : { responseSchema: communityPublicPostListSuccessEnvelopeSchema, query: options.query, signal: options.signal };
  return client.request(PUBLIC_COMMUNITY_ROUTE, requestOptions).then(response => response.data.data);
}

export function createPublicCommunityListLoader(
  options: Omit<CommunityListLoadOptions, 'query' | 'signal'> = {}
): CommunityListLoader {
  return (query, signal) => loadPublicCommunity({ ...options, query, ...(signal === undefined ? {} : { signal }) });
}

export const defaultPublicCommunityListLoader = createPublicCommunityListLoader();

export function loadPublicCommunityDetail(options: CommunityDetailLoadOptions): Promise<CommunityPublicPostDetailData> {
  const client = clientFor(options);
  const requestOptions = options.signal === undefined
    ? { responseSchema: communityPublicPostDetailSuccessEnvelopeSchema }
    : { responseSchema: communityPublicPostDetailSuccessEnvelopeSchema, signal: options.signal };
  return client.request(`${PUBLIC_COMMUNITY_ROUTE}/${encodeURIComponent(options.postId)}`, requestOptions)
    .then(response => response.data.data);
}

export function createPublicCommunityDetailLoader(
  options: Omit<CommunityDetailLoadOptions, 'postId' | 'signal'> = {}
): CommunityDetailLoader {
  return (postId, signal) => loadPublicCommunityDetail({ ...options, postId, ...(signal === undefined ? {} : { signal }) });
}

export const defaultPublicCommunityDetailLoader = createPublicCommunityDetailLoader();

function authorizationHeaders(getAuthorizationHeader: (() => string | undefined) | undefined): HeadersInit | undefined {
  const authorization = getAuthorizationHeader?.();
  return authorization === undefined ? undefined : { authorization };
}

export function createCommunityMutationApi(options: CommunityMutationOptions = {}): CommunityMutationApi {
  const client = clientFor(options);
  const headers = () => authorizationHeaders(options.getAuthorizationHeader);

  return {
    async createPost(input) {
      const request = communityPostCreateSchema.parse(input);
      const requestHeaders = headers();
      await client.request(PUBLIC_COMMUNITY_ROUTE, {
        method: 'POST',
        json: request,
        ...(requestHeaders === undefined ? {} : { headers: requestHeaders }),
        responseSchema: communityPostMutationSuccessEnvelopeSchema
      });
    },
    async createComment(postId, input) {
      communityPostIdParamsSchema.parse({ postId });
      const request = communityCommentCreateRequestSchema.parse(input);
      const requestHeaders = headers();
      await client.request(`${PUBLIC_COMMUNITY_ROUTE}/${encodeURIComponent(postId)}/comments`, {
        method: 'POST',
        json: request,
        ...(requestHeaders === undefined ? {} : { headers: requestHeaders }),
        responseSchema: communityCommentMutationSuccessEnvelopeSchema
      });
    },
    async reportPost(postId, input) {
      const request = communityReportCreateRequestSchema.parse(input);
      const requestHeaders = headers();
      await client.request(`${PUBLIC_COMMUNITY_ROUTE}/${encodeURIComponent(postId)}/reports`, {
        method: 'POST',
        json: request,
        ...(requestHeaders === undefined ? {} : { headers: requestHeaders }),
        responseSchema: communityReportSuccessEnvelopeSchema
      });
    }
  };
}
