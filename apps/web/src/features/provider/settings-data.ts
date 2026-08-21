import {
  providerSettingsPatchSchema,
  providerSettingsSuccessEnvelopeSchema,
  type ProviderSettingsData,
  type ProviderSettingsPatch
} from '@sadat-real-estate/contracts';
import { ApiClient, type ApiClientOptions } from '../contracts/index.ts';
import type { ProviderAuthorizationSource } from './data.ts';

export const PROVIDER_SETTINGS_ROUTE = '/provider/settings' as const;

export interface ProviderSettingsLoadOptions {
  readonly apiClient?: ApiClient | undefined;
  readonly apiOrigin?: string | undefined;
  readonly authorization?: ProviderAuthorizationSource | undefined;
  readonly signal?: AbortSignal | undefined;
}

export type ProviderSettingsLoader = (signal?: AbortSignal) => Promise<ProviderSettingsData>;

export interface ProviderSettingsActions {
  update(input: ProviderSettingsPatch, signal?: AbortSignal): Promise<ProviderSettingsData>;
}

function clientFor(options: Pick<ProviderSettingsLoadOptions, 'apiClient' | 'apiOrigin'>): ApiClient {
  if (options.apiClient !== undefined) return options.apiClient;
  const clientOptions: ApiClientOptions = options.apiOrigin === undefined ? {} : { baseUrl: options.apiOrigin };
  return new ApiClient(clientOptions);
}

function authorizationHeaders(source: ProviderAuthorizationSource | undefined): HeadersInit | undefined {
  const authorization = source?.getAuthorizationHeader();
  return authorization === undefined ? undefined : { authorization };
}

export async function loadProviderSettings(options: ProviderSettingsLoadOptions = {}): Promise<ProviderSettingsData> {
  const client = clientFor(options);
  const headers = authorizationHeaders(options.authorization);
  const response = await client.request(PROVIDER_SETTINGS_ROUTE, {
    responseSchema: providerSettingsSuccessEnvelopeSchema,
    ...(headers === undefined ? {} : { headers }),
    ...(options.signal === undefined ? {} : { signal: options.signal })
  });
  return response.data.data;
}

export function createProviderSettingsLoader(options: Omit<ProviderSettingsLoadOptions, 'signal'> = {}): ProviderSettingsLoader {
  return signal => loadProviderSettings({ ...options, ...(signal === undefined ? {} : { signal }) });
}

export const defaultProviderSettingsLoader = createProviderSettingsLoader();

export function createProviderSettingsActions(options: ProviderSettingsLoadOptions = {}): ProviderSettingsActions {
  const client = clientFor(options);
  const headers = authorizationHeaders(options.authorization);
  return {
    async update(input, signal) {
      const patch = providerSettingsPatchSchema.parse(input);
      const response = await client.request(PROVIDER_SETTINGS_ROUTE, {
        method: 'PATCH',
        responseSchema: providerSettingsSuccessEnvelopeSchema,
        ...(headers === undefined ? {} : { headers }),
        json: patch,
        ...(signal === undefined ? {} : { signal })
      });
      return response.data.data;
    }
  };
}

export const defaultProviderSettingsActions = createProviderSettingsActions();
