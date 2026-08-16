import {
  publicHomepageSuccessEnvelopeSchema,
  type PublicHomepageData
} from '@sadat-real-estate/contracts';
import { ApiClient, type ApiClientOptions } from '../contracts/index.ts';

export const PUBLIC_HOMEPAGE_ROUTE = '/public/home' as const;

export interface PublicHomepageLoadOptions {
  readonly apiClient?: ApiClient | undefined;
  readonly apiOrigin?: string | undefined;
  readonly signal?: AbortSignal | undefined;
}

export type PublicHomepageLoader = (signal?: AbortSignal) => Promise<PublicHomepageData>;

export async function loadPublicHomepage(options: PublicHomepageLoadOptions = {}): Promise<PublicHomepageData> {
  let client = options.apiClient;
  if (client === undefined) {
    const clientOptions: ApiClientOptions = options.apiOrigin === undefined ? {} : { baseUrl: options.apiOrigin };
    client = new ApiClient(clientOptions);
  }

  const requestOptions = options.signal === undefined
    ? { responseSchema: publicHomepageSuccessEnvelopeSchema }
    : { responseSchema: publicHomepageSuccessEnvelopeSchema, signal: options.signal };
  const response = await client.request(PUBLIC_HOMEPAGE_ROUTE, requestOptions);
  return response.data.data;
}

export function createPublicHomepageLoader(
  options: Omit<PublicHomepageLoadOptions, 'signal'> = {}
): PublicHomepageLoader {
  return (signal) => loadPublicHomepage({ ...options, signal });
}

export const defaultPublicHomepageLoader = createPublicHomepageLoader();
