import {
  adminOverviewQuerySchema,
  adminOverviewSuccessEnvelopeSchema,
  type AdminOverviewData,
  type AdminOverviewQuery
} from '@sadat-real-estate/contracts';
import { ApiClient, type ApiClientOptions } from '../contracts/index.ts';

export const ADMIN_OVERVIEW_ROUTE = '/admin/overview' as const;

export interface AdminAuthorizationSource {
  readonly getAuthorizationHeader: () => string | undefined;
}

export interface AdminOverviewLoadOptions {
  readonly apiClient?: ApiClient | undefined;
  readonly apiOrigin?: string | undefined;
  readonly authorization?: AdminAuthorizationSource | undefined;
  readonly signal?: AbortSignal | undefined;
  readonly clock?: (() => Date) | undefined;
}

export type AdminOverviewLoader = (signal?: AbortSignal) => Promise<AdminOverviewData>;

const OVERVIEW_RANGE_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1_000;

function clientFor(options: Pick<AdminOverviewLoadOptions, 'apiClient' | 'apiOrigin'>): ApiClient {
  if (options.apiClient !== undefined) return options.apiClient;
  const clientOptions: ApiClientOptions = options.apiOrigin === undefined ? {} : { baseUrl: options.apiOrigin };
  return new ApiClient(clientOptions);
}

function authorizationHeaders(source: AdminAuthorizationSource | undefined): HeadersInit | undefined {
  const authorization = source?.getAuthorizationHeader();
  return authorization === undefined ? undefined : { authorization };
}

export function adminOverviewRange(clock: () => Date = () => new Date()): AdminOverviewQuery {
  const to = clock();
  const from = new Date(to.getTime() - OVERVIEW_RANGE_DAYS * DAY_MS);
  return adminOverviewQuerySchema.parse({ from: from.toISOString(), to: to.toISOString() });
}

export async function loadAdminOverview(options: AdminOverviewLoadOptions = {}): Promise<AdminOverviewData> {
  const client = clientFor(options);
  const headers = authorizationHeaders(options.authorization);
  const query = adminOverviewRange(options.clock);
  const response = await client.request(ADMIN_OVERVIEW_ROUTE, {
    responseSchema: adminOverviewSuccessEnvelopeSchema,
    query,
    ...(headers === undefined ? {} : { headers }),
    ...(options.signal === undefined ? {} : { signal: options.signal })
  });
  return response.data.data;
}

export function createAdminOverviewLoader(
  options: Omit<AdminOverviewLoadOptions, 'signal'> = {}
): AdminOverviewLoader {
  return signal => loadAdminOverview({ ...options, ...(signal === undefined ? {} : { signal }) });
}

export const defaultAdminOverviewLoader = createAdminOverviewLoader();
