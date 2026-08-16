import {
  AUTH_ERROR_CODES,
  adminLoginRequestSchema,
  authSessionSuccessEnvelopeSchema,
  emptyAuthRequestSchema,
  logoutSuccessEnvelopeSchema,
  otpSendRequestSchema,
  otpSendSuccessEnvelopeSchema,
  otpVerifyRequestSchema,
  otpVerifySuccessEnvelopeSchema,
  type AdminLoginRequest,
  type AuthRoleType,
  type LogoutData,
  type OtpSendData,
  type OtpSendRequest,
  type OtpVerifiedData,
  type OtpVerifyData,
  type OtpVerifyRequest
} from '@sadat-real-estate/contracts';
import {
  ApiClient,
  ApiClientError,
  type ApiClientResponse,
  type ApiRequestOptions
} from '../contracts/index.ts';
import { AuthStore, type AuthRouteSession, type AuthSnapshot } from './store.ts';

export interface AuthApiClient {
  request<TResponse>(path: string, options: ApiRequestOptions<TResponse>): Promise<ApiClientResponse<TResponse>>;
}

export interface AuthClientOptions {
  apiClient?: AuthApiClient;
  store?: AuthStore;
}

export type AuthenticatedOtpResult = {
  readonly outcome: 'authenticated';
  readonly snapshot: AuthSnapshot;
};

export type AuthOtpVerifyResult = AuthenticatedOtpResult | OtpVerifiedData;

function isInvalidRefreshError(error: unknown): boolean {
  if (!(error instanceof ApiClientError)) return false;
  return error.status === 401
    || error.apiError?.code === AUTH_ERROR_CODES.INVALID_REFRESH_TOKEN
    || error.apiError?.code === AUTH_ERROR_CODES.REFRESH_TOKEN_REUSED;
}

export class AuthClient {
  readonly store: AuthStore;
  private readonly apiClient: AuthApiClient;
  private refreshPromise: Promise<AuthSnapshot> | undefined;

  constructor(options: AuthClientOptions = {}) {
    this.apiClient = options.apiClient ?? new ApiClient();
    this.store = options.store ?? new AuthStore();
  }

  getSnapshot(): AuthSnapshot {
    return this.store.getSnapshot();
  }

  subscribe(listener: (snapshot: AuthSnapshot) => void): () => void {
    return this.store.subscribe(listener);
  }

  getAccessToken(): string | undefined {
    return this.store.getAccessToken();
  }

  getAuthorizationHeader(): string | undefined {
    return this.store.getAuthorizationHeader();
  }

  getRouteSession(): AuthRouteSession {
    return this.store.getRouteSession();
  }

  hasRole(role: AuthRoleType): boolean {
    return this.store.hasRole(role);
  }

  hasAvailableAction(action: string): boolean {
    return this.store.hasAvailableAction(action);
  }

  setAvailableActions(availableActions: unknown): AuthSnapshot {
    return this.store.setAvailableActions(availableActions);
  }

  async loginAdmin(input: AdminLoginRequest): Promise<AuthSnapshot> {
    const request = adminLoginRequestSchema.parse(input);
    const response = await this.apiClient.request('/auth/login', {
      method: 'POST',
      json: request,
      responseSchema: authSessionSuccessEnvelopeSchema
    });
    return this.store.setSession(response.data.data);
  }

  async sendOtp(input: OtpSendRequest): Promise<OtpSendData> {
    const request = otpSendRequestSchema.parse(input);
    const response = await this.apiClient.request('/auth/otp/send', {
      method: 'POST',
      json: request,
      responseSchema: otpSendSuccessEnvelopeSchema
    });
    return response.data.data;
  }

  async verifyOtp(input: OtpVerifyRequest): Promise<AuthOtpVerifyResult> {
    const request = otpVerifyRequestSchema.parse(input);
    const response = await this.apiClient.request('/auth/otp/verify', {
      method: 'POST',
      json: request,
      responseSchema: otpVerifySuccessEnvelopeSchema
    });
    const result: OtpVerifyData = response.data.data;
    if (result.outcome === 'authenticated') {
      return {
        outcome: 'authenticated',
        snapshot: this.store.setSession({
          accessToken: result.accessToken,
          tokenType: result.tokenType,
          expiresInSeconds: result.expiresInSeconds,
          user: result.user
        })
      };
    }
    return result;
  }

  refresh(): Promise<AuthSnapshot> {
    if (this.refreshPromise !== undefined) return this.refreshPromise;
    this.store.beginRefresh();
    const pending = this.performRefresh();
    const settled = pending.then(
      (snapshot) => {
        if (this.refreshPromise === settled) this.refreshPromise = undefined;
        return snapshot;
      },
      (error: unknown) => {
        if (this.refreshPromise === settled) this.refreshPromise = undefined;
        throw error;
      }
    );
    this.refreshPromise = settled;
    return settled;
  }

  async logout(): Promise<LogoutData> {
    try {
      emptyAuthRequestSchema.parse({});
      const response = await this.apiClient.request('/auth/logout', {
        method: 'POST',
        json: {},
        responseSchema: logoutSuccessEnvelopeSchema
      });
      return response.data.data;
    } finally {
      this.store.clear();
    }
  }

  dispose(): void {
    this.store.dispose();
  }

  private async performRefresh(): Promise<AuthSnapshot> {
    try {
      emptyAuthRequestSchema.parse({});
      const response = await this.apiClient.request('/auth/refresh', {
        method: 'POST',
        json: {},
        responseSchema: authSessionSuccessEnvelopeSchema
      });
      return this.store.setSession(response.data.data);
    } catch (error: unknown) {
      if (isInvalidRefreshError(error)) return this.store.clear();
      const requestId = error instanceof ApiClientError ? error.requestId : undefined;
      this.store.setError(requestId);
      throw error;
    }
  }
}
