import {
  cmsPublicContentListSuccessEnvelopeSchema,
  type CmsPublicContentListData
} from '@sadat-real-estate/contracts';
import { ApiClient, type ApiClientOptions } from '../contracts/index.ts';

export const PUBLIC_ABOUT_ROUTE = '/public/about' as const;
export const PUBLIC_TEAM_ROUTE = '/public/team' as const;

export interface PublicContentListLoadOptions {
  readonly apiClient?: ApiClient | undefined;
  readonly apiOrigin?: string | undefined;
  readonly signal?: AbortSignal | undefined;
}

export type PublicContentListLoader = (signal?: AbortSignal) => Promise<CmsPublicContentListData>;

function clientFor(options: PublicContentListLoadOptions): ApiClient {
  if (options.apiClient !== undefined) return options.apiClient;
  const clientOptions: ApiClientOptions = options.apiOrigin === undefined ? {} : { baseUrl: options.apiOrigin };
  return new ApiClient(clientOptions);
}

async function loadPublicContent(
  path: string,
  options: PublicContentListLoadOptions
): Promise<CmsPublicContentListData> {
  const client = clientFor(options);
  const requestOptions = options.signal === undefined
    ? { responseSchema: cmsPublicContentListSuccessEnvelopeSchema }
    : { responseSchema: cmsPublicContentListSuccessEnvelopeSchema, signal: options.signal };
  const response = await client.request(path, requestOptions);
  return response.data.data;
}

export function loadPublicAbout(options: PublicContentListLoadOptions = {}): Promise<CmsPublicContentListData> {
  return loadPublicContent(PUBLIC_ABOUT_ROUTE, options);
}

export function loadPublicTeam(options: PublicContentListLoadOptions = {}): Promise<CmsPublicContentListData> {
  return loadPublicContent(PUBLIC_TEAM_ROUTE, options);
}

export function createPublicAboutLoader(
  options: Omit<PublicContentListLoadOptions, 'signal'> = {}
): PublicContentListLoader {
  return signal => loadPublicAbout({ ...options, ...(signal === undefined ? {} : { signal }) });
}

export function createPublicTeamLoader(
  options: Omit<PublicContentListLoadOptions, 'signal'> = {}
): PublicContentListLoader {
  return signal => loadPublicTeam({ ...options, ...(signal === undefined ? {} : { signal }) });
}

export const defaultPublicAboutLoader = createPublicAboutLoader();
export const defaultPublicTeamLoader = createPublicTeamLoader();
