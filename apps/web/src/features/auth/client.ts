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
  passwordResetRequestSchema,
  passwordResetOtpSendRequestSchema,
  passwordResetOtpVerifyRequestSchema,
  passwordResetSuccessEnvelopeSchema,
  providerAccountPatchSchema,
  providerApplicationCreateRequestSchema,
  providerApplicationSuccessEnvelopeSchema,
  providerApplicationStatusSuccessEnvelopeSchema,
  providerBusinessPatchSchema,
  providerCompanyPatchSchema,
  providerDocumentDeleteSuccessEnvelopeSchema,
  providerDocumentSuccessEnvelopeSchema,
  providerDocumentListSuccessEnvelopeSchema,
  providerDocumentUploadHeadersSchema,
  providerRegistrationSuccessEnvelopeSchema,
  providerSubmitRequestSchema,
  seekerRegistrationRequestSchema,
  seekerRegistrationSuccessEnvelopeSchema,
  type AdminLoginRequest,
  type AuthRoleType,
  type LogoutData,
  type OtpSendData,
  type OtpSendRequest,
  type OtpVerifiedData,
  type OtpVerifyData,
  type OtpVerifyRequest,
  type PasswordResetRequest,
  type PasswordResetOtpSendRequest,
  type PasswordResetOtpVerifyRequest,
  type ProviderAccountPatch,
  type ProviderApplicationCreateRequest,
  type ProviderApplicationData,
  type ProviderApplicationStatusData,
  type ProviderBusinessPatch,
  type ProviderCompanyPatch,
  type ProviderDocumentCategory,
  type ProviderDocumentData,
  type ProviderDocumentDeleteData,
  type ProviderRegistrationData,
  type ProviderSubmitRequest,
  type SeekerRegistrationRequest
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
  sessionHintStorage?: AuthSessionHintStorage | undefined;
}

export interface AuthSessionHintStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const AUTH_SESSION_HINT_KEY = 'sadat-real-estate.auth.session-hint' as const;

function browserSessionHintStorage(): AuthSessionHintStorage | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
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
  private readonly sessionHintStorage: AuthSessionHintStorage | undefined;
  private refreshPromise: Promise<AuthSnapshot> | undefined;

  constructor(options: AuthClientOptions = {}) {
    this.apiClient = options.apiClient ?? new ApiClient();
    this.store = options.store ?? new AuthStore();
    this.sessionHintStorage = options.sessionHintStorage ?? browserSessionHintStorage();
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

  hasSessionHint(): boolean | undefined {
    try {
      const hint = this.sessionHintStorage?.getItem(AUTH_SESSION_HINT_KEY);
      if (hint === 'authenticated') return true;
      if (hint === 'anonymous') return false;
    } catch {
      // Storage access is optional; an unknown hint safely falls back to refresh.
    }
    return undefined;
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
    return this.setSession(response.data.data);
  }

  async sendOtp(input: OtpSendRequest | PasswordResetOtpSendRequest): Promise<OtpSendData> {
    const reset = input.purpose === 'password_reset';
    const request = reset ? passwordResetOtpSendRequestSchema.parse(input) : otpSendRequestSchema.parse(input);
    const response = await this.apiClient.request(reset ? '/auth/account-recovery/otp/send' : '/auth/otp/send', {
      method: 'POST',
      json: request,
      responseSchema: otpSendSuccessEnvelopeSchema
    });
    return response.data.data;
  }

  async verifyOtp(input: OtpVerifyRequest | PasswordResetOtpVerifyRequest): Promise<AuthOtpVerifyResult> {
    const reset = input.purpose === 'password_reset';
    const request = reset ? passwordResetOtpVerifyRequestSchema.parse(input) : otpVerifyRequestSchema.parse(input);
    const response = await this.apiClient.request(reset ? '/auth/account-recovery/otp/verify' : '/auth/otp/verify', {
      method: 'POST',
      json: request,
      responseSchema: otpVerifySuccessEnvelopeSchema
    });
    const result: OtpVerifyData = response.data.data;
    if (result.outcome === 'authenticated') {
      return {
        outcome: 'authenticated',
        snapshot: this.setSession({
          accessToken: result.accessToken,
          tokenType: result.tokenType,
          expiresInSeconds: result.expiresInSeconds,
          user: result.user
        })
      };
    }
    return result;
  }

  async resetPassword(input: PasswordResetRequest): Promise<void> {
    const request = passwordResetRequestSchema.parse(input);
    await this.apiClient.request('/auth/account-recovery/complete', {
      method: 'POST',
      json: request,
      responseSchema: passwordResetSuccessEnvelopeSchema
    });
    this.markSessionHint(false);
    this.store.clear();
  }

  async registerSeeker(input: SeekerRegistrationRequest): Promise<AuthSnapshot> {
    const request = seekerRegistrationRequestSchema.parse(input);
    const response = await this.apiClient.request('/auth/register/seeker', {
      method: 'POST',
      json: request,
      responseSchema: seekerRegistrationSuccessEnvelopeSchema
    });
    return this.setSession(response.data.data.session);
  }

  async registerProvider(input: ProviderApplicationCreateRequest): Promise<ProviderRegistrationData> {
    const request = providerApplicationCreateRequestSchema.parse(input);
    const response = await this.apiClient.request('/provider/application', {
      method: 'POST',
      json: request,
      responseSchema: providerRegistrationSuccessEnvelopeSchema
    });
    const registration = response.data.data;
    this.setSession(registration.session, registration.application.availableActions);
    return registration;
  }

  async getProviderApplication(): Promise<ProviderApplicationData> {
    const headers = this.authorizationHeaders();
    const response = await this.apiClient.request('/provider/application', {
      method: 'GET',
      ...(headers === undefined ? {} : { headers }),
      responseSchema: providerApplicationSuccessEnvelopeSchema
    });
    return response.data.data;
  }

  async updateProviderAccount(input: ProviderAccountPatch): Promise<ProviderApplicationData> {
    const request = providerAccountPatchSchema.parse(input);
    const headers = this.authorizationHeaders();
    const response = await this.apiClient.request('/provider/application/account', {
      method: 'PATCH',
      ...(headers === undefined ? {} : { headers }),
      json: request,
      responseSchema: providerApplicationSuccessEnvelopeSchema
    });
    return response.data.data;
  }

  async updateProviderBusiness(input: ProviderBusinessPatch): Promise<ProviderApplicationData> {
    const request = providerBusinessPatchSchema.parse(input);
    const headers = this.authorizationHeaders();
    const response = await this.apiClient.request('/provider/application/business', {
      method: 'PATCH',
      ...(headers === undefined ? {} : { headers }),
      json: request,
      responseSchema: providerApplicationSuccessEnvelopeSchema
    });
    return response.data.data;
  }

  async updateProviderCompany(input: ProviderCompanyPatch): Promise<ProviderApplicationData> {
    const request = providerCompanyPatchSchema.parse(input);
    const headers = this.authorizationHeaders();
    const response = await this.apiClient.request('/provider/application/company', {
      method: 'PATCH',
      ...(headers === undefined ? {} : { headers }),
      json: request,
      responseSchema: providerApplicationSuccessEnvelopeSchema
    });
    return response.data.data;
  }

  async submitProviderApplication(input: ProviderSubmitRequest): Promise<ProviderApplicationData> {
    const request = providerSubmitRequestSchema.parse(input);
    const headers = this.authorizationHeaders();
    const response = await this.apiClient.request('/provider/application/submit', {
      method: 'POST',
      ...(headers === undefined ? {} : { headers }),
      json: request,
      responseSchema: providerApplicationSuccessEnvelopeSchema
    });
    return response.data.data;
  }

  async getProviderApplicationStatus(): Promise<ProviderApplicationStatusData> {
    const headers = this.authorizationHeaders();
    const response = await this.apiClient.request('/provider/application/status', {
      method: 'GET',
      ...(headers === undefined ? {} : { headers }),
      responseSchema: providerApplicationStatusSuccessEnvelopeSchema
    });
    return response.data.data;
  }

  async listProviderDocuments(): Promise<readonly ProviderDocumentData[]> {
    const headers = this.authorizationHeaders();
    const response = await this.apiClient.request('/provider/application/documents', {
      method: 'GET', ...(headers === undefined ? {} : { headers }),
      responseSchema: providerDocumentListSuccessEnvelopeSchema
    });
    return response.data.data.items;
  }

  async uploadProviderDocument(category: ProviderDocumentCategory, file: File): Promise<ProviderDocumentData> {
    const contentType = file.type || documentMimeType(file.name);
    providerDocumentUploadHeadersSchema.parse({
      category,
      filename: file.name,
      contentType,
      contentLength: file.size
    });
    const authorization = this.authorizationHeaders();
    const response = await this.apiClient.request('/provider/application/documents', {
      method: 'POST',
      headers: {
        ...(authorization ?? {}),
        'content-type': contentType,
        'x-document-category': category,
        'x-file-name': file.name
      },
      body: file,
      responseSchema: providerDocumentSuccessEnvelopeSchema
    });
    return response.data.data;
  }

  async deleteProviderDocument(documentId: string): Promise<ProviderDocumentDeleteData> {
    const authorization = this.authorizationHeaders();
    const response = await this.apiClient.request(`/provider/application/documents/${encodeURIComponent(documentId)}`, {
      method: 'DELETE',
      ...(authorization === undefined ? {} : { headers: authorization }),
      responseSchema: providerDocumentDeleteSuccessEnvelopeSchema
    });
    return response.data.data;
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
      this.markSessionHint(false);
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
      return this.setSession(response.data.data);
    } catch (error: unknown) {
      if (isInvalidRefreshError(error)) {
        this.markSessionHint(false);
        return this.store.clear();
      }
      const requestId = error instanceof ApiClientError ? error.requestId : undefined;
      this.store.setError(requestId);
      throw error;
    }
  }

  private authorizationHeaders(): HeadersInit | undefined {
    const authorization = this.getAuthorizationHeader();
    return authorization === undefined ? undefined : { authorization };
  }

  private setSession(session: unknown, availableActions?: unknown): AuthSnapshot {
    const snapshot = this.store.setSession(session, availableActions);
    this.markSessionHint(true);
    return snapshot;
  }

  private markSessionHint(authenticated: boolean): void {
    try {
      this.sessionHintStorage?.setItem(AUTH_SESSION_HINT_KEY, authenticated ? 'authenticated' : 'anonymous');
    } catch {
      // A blocked storage API must not affect authentication correctness.
    }
  }
}

function documentMimeType(filename: string): 'application/pdf' | 'image/jpeg' | 'image/png' {
  const extension = filename.slice(filename.lastIndexOf('.')).toLowerCase();
  if (extension === '.pdf') return 'application/pdf';
  if (extension === '.png') return 'image/png';
  if (extension === '.jpg' || extension === '.jpeg') return 'image/jpeg';
  throw new TypeError('Provider document MIME type is required.');
}
