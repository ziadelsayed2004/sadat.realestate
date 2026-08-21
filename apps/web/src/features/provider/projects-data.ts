import {
  projectCreateSchema,
  projectIdParamsSchema,
  projectListDataSchema,
  projectSuccessEnvelopeSchema,
  projectPatchSchema,
  projectSubmitRequestSchema,
  successEnvelopeSchema,
  type ProjectCreate,
  type ProjectData,
  type ProjectListData,
  type ProjectListQuery,
  type ProjectPatch,
  type ProjectSubmitRequest,
  type ProjectStatus
} from '@sadat-real-estate/contracts';
import { ApiClient, type ApiClientOptions } from '../contracts/index.ts';
import type { ProviderAuthorizationSource } from './data.ts';

export const PROVIDER_PROJECTS_ROUTE = '/provider/projects' as const;

export interface ProviderProjectsQuery {
  readonly status?: ProjectStatus | undefined;
  readonly search?: string | undefined;
  readonly page?: number | undefined;
  readonly limit?: number | undefined;
}

export interface ProviderProjectsData {
  readonly items: readonly ProjectData[];
  readonly page: number;
  readonly limit: number;
  readonly total: number;
}

export interface ProviderProjectsLoadOptions {
  readonly apiClient?: ApiClient | undefined;
  readonly apiOrigin?: string | undefined;
  readonly authorization?: ProviderAuthorizationSource | undefined;
  readonly query?: ProviderProjectsQuery | undefined;
  readonly signal?: AbortSignal | undefined;
}

export type ProviderProjectsLoader = (query: ProviderProjectsQuery, signal?: AbortSignal) => Promise<ProviderProjectsData>;

export interface ProviderProjectMutationOptions {
  readonly apiClient?: ApiClient | undefined;
  readonly apiOrigin?: string | undefined;
  readonly authorization?: ProviderAuthorizationSource | undefined;
}

export interface ProviderProjectMutationApi {
  create(input: ProjectCreate): Promise<ProjectData>;
  update(projectId: string, input: ProjectPatch): Promise<ProjectData>;
  submit(projectId: string, input: ProjectSubmitRequest): Promise<ProjectData>;
}

function clientFor(options: Pick<ProviderProjectsLoadOptions, 'apiClient' | 'apiOrigin'>): ApiClient {
  if (options.apiClient !== undefined) return options.apiClient;
  const clientOptions: ApiClientOptions = options.apiOrigin === undefined ? {} : { baseUrl: options.apiOrigin };
  return new ApiClient(clientOptions);
}

function authorizationHeaders(source: ProviderAuthorizationSource | undefined): HeadersInit | undefined {
  const authorization = source?.getAuthorizationHeader();
  return authorization === undefined ? undefined : { authorization };
}

export async function loadProviderProjects(options: ProviderProjectsLoadOptions = {}): Promise<ProviderProjectsData> {
  const client = clientFor(options);
  const headers = authorizationHeaders(options.authorization);
  const page = options.query?.page ?? 1;
  const limit = options.query?.limit ?? 5;
  const search = options.query?.search?.trim();
  const query: ProjectListQuery = {
    page,
    limit,
    sort: 'updatedAt',
    direction: 'desc',
    ...(options.query?.status === undefined ? {} : { status: options.query.status }),
    ...(search === undefined || search === '' ? {} : { search })
  };
  const response = await client.request(PROVIDER_PROJECTS_ROUTE, {
    responseSchema: successEnvelopeSchema(projectListDataSchema),
    ...(headers === undefined ? {} : { headers }),
    query,
    ...(options.signal === undefined ? {} : { signal: options.signal })
  });
  return {
    items: response.data.data.items,
    page: response.data.meta.page ?? page,
    limit: response.data.meta.limit ?? limit,
    total: response.data.meta.total ?? response.data.data.items.length
  };
}

export function createProviderProjectsLoader(
  options: Omit<ProviderProjectsLoadOptions, 'query' | 'signal'> = {}
): ProviderProjectsLoader {
  return (query, signal) => loadProviderProjects({ ...options, query, ...(signal === undefined ? {} : { signal }) });
}

export const defaultProviderProjectsLoader = createProviderProjectsLoader();

export function createProviderProjectMutationApi(options: ProviderProjectMutationOptions = {}): ProviderProjectMutationApi {
  const client = clientFor(options);
  const headers = () => authorizationHeaders(options.authorization);
  const requestOptions = (requestHeaders: HeadersInit | undefined) => requestHeaders === undefined ? {} : { headers: requestHeaders };

  return {
    async create(input) {
      const request = projectCreateSchema.parse(input);
      const response = await client.request(PROVIDER_PROJECTS_ROUTE, {
        method: 'POST',
        json: request,
        ...requestOptions(headers()),
        responseSchema: projectSuccessEnvelopeSchema
      });
      return response.data.data;
    },
    async update(projectId, input) {
      const params = projectIdParamsSchema.parse({ projectId });
      const request = projectPatchSchema.parse(input);
      const response = await client.request(`${PROVIDER_PROJECTS_ROUTE}/${encodeURIComponent(params.projectId)}`, {
        method: 'PATCH',
        json: request,
        ...requestOptions(headers()),
        responseSchema: projectSuccessEnvelopeSchema
      });
      return response.data.data;
    },
    async submit(projectId, input) {
      const params = projectIdParamsSchema.parse({ projectId });
      const request = projectSubmitRequestSchema.parse(input);
      const response = await client.request(`${PROVIDER_PROJECTS_ROUTE}/${encodeURIComponent(params.projectId)}/submit`, {
        method: 'POST',
        json: request,
        ...requestOptions(headers()),
        responseSchema: projectSuccessEnvelopeSchema
      });
      return response.data.data;
    }
  };
}

export const defaultProviderProjectMutationApi = createProviderProjectMutationApi();

export type { ProjectListData };
