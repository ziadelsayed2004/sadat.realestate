import { ApiClient, ApiClientError, type ApiClientOptions } from './api-client.ts';

export interface SessionAuthorization {
  readonly getAuthorizationHeader: () => string | undefined;
  readonly refresh?: (() => Promise<unknown>) | undefined;
}

export async function fetchWithSession(url: string, source: SessionAuthorization | undefined, init: RequestInit = {}): Promise<Response> {
  const token = source?.getAuthorizationHeader();
  const headers = new Headers(init.headers);
  if (token) headers.set('authorization', token);
  const response = await fetch(url, { ...init, headers });
  if (response.status !== 401 || !token || !source?.refresh || init.signal?.aborted) return response;
  await response.body?.cancel();
  if (source.getAuthorizationHeader() === token) await source.refresh();
  const renewed = source.getAuthorizationHeader();
  if (!renewed || init.signal?.aborted) return response;
  headers.set('authorization', renewed);
  return fetch(url, { ...init, headers });
}

export function createSessionClient(options: { apiClient?: ApiClient | undefined; apiOrigin?: string | undefined; authorization?: SessionAuthorization | undefined }): Pick<ApiClient, 'request'> {
  const config: ApiClientOptions = options.apiOrigin ? { baseUrl: options.apiOrigin } : {};
  const client = options.apiClient ?? new ApiClient(config);
  return { async request(path, request) {
    const token = options.authorization?.getAuthorizationHeader();
    const headers = new Headers(request.headers);
    if (token) headers.set('authorization', token);
    try { return await client.request(path, { ...request, headers }); }
    catch (error) {
      const source = options.authorization;
      if (!(error instanceof ApiClientError) || error.status !== 401 || !source?.refresh || !token || request.signal?.aborted) throw error;
      if (source.getAuthorizationHeader() === token) await source.refresh();
      const renewed = source.getAuthorizationHeader();
      if (!renewed || request.signal?.aborted) throw error;
      headers.set('authorization', renewed);
      return client.request(path, { ...request, headers });
    }
  } };
}
