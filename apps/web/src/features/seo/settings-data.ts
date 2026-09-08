import { publicSeoSettingsSuccessEnvelopeSchema, type PublicSeoSettings } from '@sadat-real-estate/contracts';
import { ApiClient, type ApiClientOptions } from '../contracts/index.ts';

export const PUBLIC_SEO_SETTINGS_ROUTE = '/public/settings/seo' as const;

export interface PublicSeoSettingsLoadOptions {
  readonly apiClient?: ApiClient;
  readonly apiOrigin?: string;
  readonly signal?: AbortSignal;
}

export async function loadPublicSeoSettings(options: PublicSeoSettingsLoadOptions = {}): Promise<PublicSeoSettings> {
  const client = options.apiClient ?? new ApiClient(options.apiOrigin === undefined ? {} : { baseUrl: options.apiOrigin } satisfies ApiClientOptions);
  const requestOptions = options.signal === undefined
    ? { responseSchema: publicSeoSettingsSuccessEnvelopeSchema }
    : { responseSchema: publicSeoSettingsSuccessEnvelopeSchema, signal: options.signal };
  const response = await client.request(PUBLIC_SEO_SETTINGS_ROUTE, requestOptions);
  return response.data.data;
}
