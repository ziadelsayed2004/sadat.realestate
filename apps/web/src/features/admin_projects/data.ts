import {
  projectIdParamsSchema,
  projectListQuerySchema,
  projectListSuccessEnvelopeSchema,
  projectReviewRequestSchema,
  projectSuccessEnvelopeSchema,
  type ProjectData,
  type ProjectListData,
  type ProjectListQuery,
  type ProjectReviewRequest
} from '@sadat-real-estate/contracts';
import { ApiClient, type ApiClientOptions } from '../contracts/index.ts';

export const ADMIN_PROJECTS_ROUTE = '/admin/projects' as const;
export const ADMIN_PROJECT_REVIEW_ROUTE = '/admin/projects/review' as const;

export interface AdminProjectsAuthorizationSource {
  readonly getAuthorizationHeader: () => string | undefined;
}

interface CommonOptions {
  readonly apiClient?: ApiClient | undefined;
  readonly apiOrigin?: string | undefined;
  readonly authorization?: AdminProjectsAuthorizationSource | undefined;
  readonly signal?: AbortSignal | undefined;
}

export interface AdminProjectsLoadOptions extends CommonOptions {
  readonly query?: Partial<ProjectListQuery> | undefined;
}

export type AdminProjectListData = ProjectListData & { readonly page: number; readonly limit: number; readonly total: number };
export type AdminProjectsLoader = (query: ProjectListQuery, signal?: AbortSignal) => Promise<AdminProjectListData>;
export type AdminProjectReviewMutation = (projectId: string, input: ProjectReviewRequest, signal?: AbortSignal) => Promise<ProjectData>;

function clientFor(options: Pick<CommonOptions, 'apiClient' | 'apiOrigin'>): ApiClient {
  if (options.apiClient !== undefined) return options.apiClient;
  const clientOptions: ApiClientOptions = options.apiOrigin === undefined ? {} : { baseUrl: options.apiOrigin };
  return new ApiClient(clientOptions);
}

function headersFor(source: AdminProjectsAuthorizationSource | undefined): HeadersInit | undefined {
  const authorization = source?.getAuthorizationHeader();
  return authorization === undefined ? undefined : { authorization };
}

export async function loadAdminProjects(options: AdminProjectsLoadOptions = {}): Promise<AdminProjectListData> {
  const query = projectListQuerySchema.parse({ page: 1, limit: 20, sort: 'updatedAt', direction: 'desc', ...options.query });
  const headers = headersFor(options.authorization);
  const response = await clientFor(options).request(ADMIN_PROJECTS_ROUTE, {
    responseSchema: projectListSuccessEnvelopeSchema,
    query,
    ...(headers === undefined ? {} : { headers }),
    ...(options.signal === undefined ? {} : { signal: options.signal })
  });
  return {
    ...response.data.data,
    page: response.data.meta.page ?? query.page,
    limit: response.data.meta.limit ?? query.limit,
    total: response.data.meta.total ?? response.data.data.items.length
  };
}

export async function reviewAdminProject(projectId: string, input: unknown, options: CommonOptions = {}): Promise<ProjectData> {
  const id = projectIdParamsSchema.parse({ projectId }).projectId;
  const body = projectReviewRequestSchema.parse(input);
  const headers = headersFor(options.authorization);
  const response = await clientFor(options).request(`${ADMIN_PROJECTS_ROUTE}/${id}/review`, {
    method: 'POST',
    responseSchema: projectSuccessEnvelopeSchema,
    json: body,
    ...(headers === undefined ? {} : { headers }),
    ...(options.signal === undefined ? {} : { signal: options.signal })
  });
  return response.data.data;
}

export function createAdminProjectsLoader(options: Omit<AdminProjectsLoadOptions, 'query' | 'signal'> = {}): AdminProjectsLoader {
  return (query, signal) => loadAdminProjects({ ...options, query, ...(signal === undefined ? {} : { signal }) });
}

export function createAdminProjectReviewMutation(options: Omit<CommonOptions, 'signal'> = {}): AdminProjectReviewMutation {
  return (projectId, input, signal) => reviewAdminProject(projectId, input, { ...options, ...(signal === undefined ? {} : { signal }) });
}

export function createAdminProjectsSource(options: Omit<CommonOptions, 'signal'> = {}) {
  return {
    load: createAdminProjectsLoader(options),
    review: createAdminProjectReviewMutation(options)
  };
}

export type AdminProjectsSource = ReturnType<typeof createAdminProjectsSource>;
