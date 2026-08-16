import {
  errorEnvelopeSchema,
  requestIdSchema,
  type ApiError,
  type RequestId
} from '@sadat-real-estate/contracts';

export const API_V1_BASE_PATH = '/api/v1' as const;

export type HttpMethod = 'GET' | 'HEAD' | 'OPTIONS' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type ContractSchema<T> = { parse: (value: unknown) => T };
export type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export type QueryValue = string | number | boolean | null | undefined | readonly (string | number | boolean)[];
export type QueryValues = Readonly<Record<string, QueryValue>>;

export type ApiClientErrorCode =
  | 'ABORTED'
  | 'CONFIGURATION_ERROR'
  | 'HTTP_ERROR'
  | 'INVALID_RESPONSE'
  | 'NETWORK_ERROR';

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  retryUnsafeMethods?: boolean;
}

export interface ApiClientOptions {
  baseUrl?: string;
  fetcher?: Fetcher;
  requestIdFactory?: () => string;
  headers?: HeadersInit;
  credentials?: RequestCredentials;
  retry?: RetryOptions;
}

export interface ApiRequestOptions<TResponse> {
  responseSchema: ContractSchema<TResponse>;
  method?: HttpMethod;
  query?: QueryValues;
  headers?: HeadersInit;
  body?: BodyInit | null;
  json?: unknown;
  signal?: AbortSignal;
  retry?: RetryOptions;
}

export interface ApiClientResponse<TResponse> {
  data: TResponse;
  requestId: RequestId;
  status: number;
  headers: Headers;
}

interface ResolvedRetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryUnsafeMethods: boolean;
}

interface ApiClientErrorOptions {
  code: ApiClientErrorCode;
  status?: number;
  requestId?: RequestId;
  apiError?: ApiError;
  cause?: unknown;
}

interface PayloadReadResult {
  payload: unknown;
  parseError: unknown;
}

const SAFE_RETRY_METHODS = new Set<HttpMethod>(['GET', 'HEAD', 'OPTIONS']);
const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);
const DEFAULT_RETRY: ResolvedRetryOptions = {
  maxAttempts: 1,
  baseDelayMs: 250,
  maxDelayMs: 2_000,
  retryUnsafeMethods: false
};

export class ApiClientError extends Error {
  readonly code: ApiClientErrorCode;
  readonly status: number | undefined;
  readonly requestId: RequestId | undefined;
  readonly apiError: ApiError | undefined;

  constructor(message: string, options: ApiClientErrorOptions) {
    super(message);
    this.name = 'ApiClientError';
    this.code = options.code;
    this.status = options.status;
    this.requestId = options.requestId;
    this.apiError = options.apiError;
    if (options.cause !== undefined) this.cause = options.cause;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isAbortError(value: unknown): boolean {
  return isRecord(value) && value.name === 'AbortError';
}

function abortError(signal?: AbortSignal): ApiClientError {
  const cause = signal?.reason;
  return cause === undefined
    ? new ApiClientError('The API request was cancelled.', { code: 'ABORTED' })
    : new ApiClientError('The API request was cancelled.', { code: 'ABORTED', cause });
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw abortError(signal);
}

function defaultRequestId(): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return uuid;
  return `request-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function normalizedBaseUrl(baseUrl?: string): string {
  const value = (baseUrl ?? API_V1_BASE_PATH).trim().replace(/\/+$/, '');
  if (!value || value === API_V1_BASE_PATH || value.endsWith(API_V1_BASE_PATH)) return value || API_V1_BASE_PATH;
  if (value.startsWith('//')) throw new TypeError('API base URL must not be protocol-relative');
  return `${value}${API_V1_BASE_PATH}`;
}

function normalizedRoutePath(path: string): string {
  const value = path.trim();
  if (!value) throw new TypeError('API route path is required');
  if (/^[a-z][a-z\d+.-]*:\/\//iu.test(value) || value.startsWith('//')) {
    throw new TypeError('API route path must be relative to /api/v1');
  }
  const routePath = value.startsWith('/') ? value : `/${value}`;
  if (routePath === API_V1_BASE_PATH || routePath.startsWith(`${API_V1_BASE_PATH}/`)) {
    throw new TypeError('API route path must omit the /api/v1 prefix');
  }
  return routePath;
}

function appendQuery(url: URL, query?: QueryValues): void {
  if (!query) return;
  for (const [key, value] of Object.entries(query)) {
    if (!key || value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      for (const item of value) url.searchParams.append(key, String(item));
      continue;
    }
    url.searchParams.set(key, String(value));
  }
}

export function buildApiUrl(baseUrl: string | undefined, path: string, query?: QueryValues): string {
  const base = normalizedBaseUrl(baseUrl);
  const routePath = normalizedRoutePath(path);
  const input = `${base}${routePath}`;
  const absolute = /^[a-z][a-z\d+.-]*:\/\//iu.test(base);
  const url = absolute ? new URL(input) : new URL(input, 'http://sadat-real-estate.local');
  appendQuery(url, query);
  return absolute ? url.toString() : `${url.pathname}${url.search}`;
}

function resolveRetryOptions(options?: RetryOptions): ResolvedRetryOptions {
  const resolved = {
    maxAttempts: options?.maxAttempts ?? DEFAULT_RETRY.maxAttempts,
    baseDelayMs: options?.baseDelayMs ?? DEFAULT_RETRY.baseDelayMs,
    maxDelayMs: options?.maxDelayMs ?? DEFAULT_RETRY.maxDelayMs,
    retryUnsafeMethods: options?.retryUnsafeMethods ?? DEFAULT_RETRY.retryUnsafeMethods
  };
  if (!Number.isSafeInteger(resolved.maxAttempts) || resolved.maxAttempts < 1 || resolved.maxAttempts > 5) {
    throw new ApiClientError('API retry attempts must be between 1 and 5.', { code: 'CONFIGURATION_ERROR' });
  }
  if (!Number.isFinite(resolved.baseDelayMs) || resolved.baseDelayMs < 0 || resolved.baseDelayMs > 60_000) {
    throw new ApiClientError('API retry delay is invalid.', { code: 'CONFIGURATION_ERROR' });
  }
  if (!Number.isFinite(resolved.maxDelayMs) || resolved.maxDelayMs < resolved.baseDelayMs || resolved.maxDelayMs > 120_000) {
    throw new ApiClientError('API maximum retry delay is invalid.', { code: 'CONFIGURATION_ERROR' });
  }
  return resolved;
}

function retryDelay(attempt: number, options: ResolvedRetryOptions): number {
  return Math.min(options.maxDelayMs, options.baseDelayMs * 2 ** Math.max(0, attempt - 1));
}

function waitForRetry(delayMs: number, signal?: AbortSignal): Promise<void> {
  throwIfAborted(signal);
  if (delayMs === 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      reject(abortError(signal));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, delayMs);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

function safeRequestId(value: unknown, fallback: RequestId): RequestId {
  const parsed = requestIdSchema.safeParse(value);
  return parsed.success ? parsed.data : fallback;
}

function responseRequestId(payload: unknown, response: Response, fallback: RequestId): RequestId {
  if (isRecord(payload)) {
    const meta = payload.meta;
    if (isRecord(meta)) {
      const requestId = safeRequestId(meta.requestId, fallback);
      if (requestId !== fallback || meta.requestId === fallback) return requestId;
    }
    const error = payload.error;
    if (isRecord(error)) {
      const requestId = safeRequestId(error.requestId, fallback);
      if (requestId !== fallback || error.requestId === fallback) return requestId;
    }
  }
  return safeRequestId(response.headers.get('x-request-id'), fallback);
}

async function readResponsePayload(response: Response): Promise<PayloadReadResult> {
  let text: string;
  try {
    text = await response.text();
  } catch (error) {
    return { payload: undefined, parseError: error };
  }
  if (!text.trim()) return { payload: undefined, parseError: undefined };
  try {
    return { payload: JSON.parse(text) as unknown, parseError: undefined };
  } catch (error) {
    return { payload: undefined, parseError: error };
  }
}

function httpError(response: Response, payload: unknown, parseError: unknown, fallback: RequestId): ApiClientError {
  const parsed = errorEnvelopeSchema.safeParse(payload);
  const requestId = responseRequestId(payload, response, fallback);
  const options: ApiClientErrorOptions = {
    code: 'HTTP_ERROR',
    status: response.status,
    requestId
  };
  if (parsed.success) options.apiError = parsed.data.error;
  if (parseError !== undefined) options.cause = parseError;
  const message = parsed.success ? parsed.data.error.messageKey : `API request failed with status ${response.status}.`;
  return new ApiClientError(message, options);
}

function invalidResponseError(requestId: RequestId, cause: unknown): ApiClientError {
  const options: ApiClientErrorOptions = { code: 'INVALID_RESPONSE', requestId };
  if (cause !== undefined) options.cause = cause;
  return new ApiClientError('The API response did not match its generated contract.', options);
}

function normalizeThrownError(error: unknown, signal: AbortSignal | undefined, requestId: RequestId): ApiClientError {
  if (error instanceof ApiClientError) return error;
  if (signal?.aborted || isAbortError(error)) return abortError(signal);
  const options: ApiClientErrorOptions = { code: 'NETWORK_ERROR', requestId };
  if (error !== undefined) options.cause = error;
  return new ApiClientError('The API request could not be completed.', options);
}

function canRetry(error: ApiClientError, method: HttpMethod, options: ResolvedRetryOptions): boolean {
  if (error.code === 'ABORTED' || error.code === 'INVALID_RESPONSE' || error.code === 'CONFIGURATION_ERROR') return false;
  if (!options.retryUnsafeMethods && !SAFE_RETRY_METHODS.has(method)) return false;
  if (error.code === 'NETWORK_ERROR') return true;
  return error.code === 'HTTP_ERROR' && error.status !== undefined && RETRYABLE_STATUS_CODES.has(error.status);
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly fetcher: Fetcher;
  private readonly requestIdFactory: () => string;
  private readonly defaultHeaders: Headers;
  private readonly credentials: RequestCredentials;
  private readonly defaultRetry: ResolvedRetryOptions;

  constructor(options: ApiClientOptions = {}) {
    this.baseUrl = normalizedBaseUrl(options.baseUrl);
    this.fetcher = options.fetcher ?? ((input, init) => fetch(input, init));
    this.requestIdFactory = options.requestIdFactory ?? defaultRequestId;
    this.defaultHeaders = new Headers(options.headers);
    this.credentials = options.credentials ?? 'include';
    this.defaultRetry = resolveRetryOptions(options.retry);
  }

  async request<TResponse>(path: string, options: ApiRequestOptions<TResponse>): Promise<ApiClientResponse<TResponse>> {
    if (!options.responseSchema || typeof options.responseSchema.parse !== 'function') {
      throw new ApiClientError('A generated response schema is required.', { code: 'CONFIGURATION_ERROR' });
    }
    if (options.json !== undefined && options.body !== undefined) {
      throw new ApiClientError('Use either json or body for an API request.', { code: 'CONFIGURATION_ERROR' });
    }

    let url: string;
    try {
      url = buildApiUrl(this.baseUrl, path, options.query);
    } catch (error) {
      if (error instanceof ApiClientError) throw error;
      const configOptions: ApiClientErrorOptions = { code: 'CONFIGURATION_ERROR' };
      if (error !== undefined) configOptions.cause = error;
      throw new ApiClientError('The API route configuration is invalid.', configOptions);
    }

    let requestId: RequestId;
    try {
      requestId = requestIdSchema.parse(this.requestIdFactory());
    } catch (error) {
      const configOptions: ApiClientErrorOptions = { code: 'CONFIGURATION_ERROR' };
      if (error !== undefined) configOptions.cause = error;
      throw new ApiClientError('The API request ID is invalid.', configOptions);
    }

    const method = (options.method ?? 'GET').toUpperCase() as HttpMethod;
    const headers = new Headers(this.defaultHeaders);
    for (const [key, value] of new Headers(options.headers)) headers.set(key, value);
    headers.set('accept', 'application/json');
    headers.set('x-request-id', requestId);

    const init: RequestInit = { method, headers, credentials: this.credentials };
    if (options.signal) init.signal = options.signal;
    if (options.json !== undefined) {
      init.body = JSON.stringify(options.json);
      if (!headers.has('content-type')) headers.set('content-type', 'application/json');
    } else if (options.body !== undefined) {
      init.body = options.body;
    }

    const retry = resolveRetryOptions({ ...this.defaultRetry, ...(options.retry ?? {}) });
    for (let attempt = 1; attempt <= retry.maxAttempts; attempt += 1) {
      throwIfAborted(options.signal);
      try {
        const response = await this.fetcher(url, init);
        const read = await readResponsePayload(response);
        if (!response.ok) {
          const error = httpError(response, read.payload, read.parseError, requestId);
          if (attempt < retry.maxAttempts && canRetry(error, method, retry)) {
            await waitForRetry(retryDelay(attempt, retry), options.signal);
            continue;
          }
          throw error;
        }
        if (read.parseError !== undefined) throw invalidResponseError(requestId, read.parseError);

        let data: TResponse;
        try {
          data = options.responseSchema.parse(read.payload);
        } catch (error) {
          throw invalidResponseError(requestId, error);
        }
        return {
          data,
          requestId: responseRequestId(data, response, requestId),
          status: response.status,
          headers: response.headers
        };
      } catch (error) {
        const clientError = normalizeThrownError(error, options.signal, requestId);
        if (attempt < retry.maxAttempts && canRetry(clientError, method, retry)) {
          await waitForRetry(retryDelay(attempt, retry), options.signal);
          continue;
        }
        throw clientError;
      }
    }
    throw new ApiClientError('The API request could not be completed.', { code: 'NETWORK_ERROR', requestId });
  }
}
