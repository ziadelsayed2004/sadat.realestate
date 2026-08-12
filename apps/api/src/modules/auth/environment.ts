import type { AppEnvironment } from '../config/environment.js';

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;
const BASE64URL_SECRET_PATTERN = /^[A-Za-z0-9_-]{43,128}$/;
const DOCUMENTED_LOCAL_SECRET = 'bG9jYWwtZGV2ZWxvcG1lbnQtb25seS1rZXktMzItYnl0ZXM';

export interface AuthCookiePolicy {
  name: 'sadat_refresh';
  path: '/api/v1/auth';
  httpOnly: true;
  sameSite: 'Strict';
  secure: boolean;
  maxAgeSeconds: number;
}

export interface AuthEnvironment {
  accessTokenSecret: Uint8Array;
  accessTokenTtlSeconds: number;
  refreshTokenTtlSeconds: number;
  otpProviderMode: 'deterministic-fake' | 'unconfigured';
  cookie: AuthCookiePolicy;
}

export interface SafeAuthEnvironmentSummary {
  accessTokenTtlSeconds: number;
  refreshTokenTtlSeconds: number;
  otpProviderMode: AuthEnvironment['otpProviderMode'];
  refreshCookie: Omit<AuthCookiePolicy, 'name'> & { name: string };
}

export class AuthEnvironmentValidationError extends Error {
  readonly code = 'AUTH_ENVIRONMENT_INVALID';

  constructor() {
    super('Invalid authentication configuration: AUTH_ACCESS_TOKEN_SECRET (REQUIRED_BASE64URL_32_BYTES)');
    this.name = 'AuthEnvironmentValidationError';
  }
}

function parseSecret(source: Record<string, string | undefined>): Uint8Array {
  const encoded = source.AUTH_ACCESS_TOKEN_SECRET?.trim();
  if (!encoded || !BASE64URL_SECRET_PATTERN.test(encoded)) {
    throw new AuthEnvironmentValidationError();
  }
  const decoded = Buffer.from(encoded, 'base64url');
  if (decoded.byteLength < 32 || decoded.toString('base64url') !== encoded) {
    throw new AuthEnvironmentValidationError();
  }
  return new Uint8Array(decoded);
}

export function parseAuthEnvironment(
  source: Record<string, string | undefined>,
  appEnvironment: AppEnvironment
): AuthEnvironment {
  if (
    (appEnvironment === 'preview' || appEnvironment === 'uat' || appEnvironment === 'production')
    && source.AUTH_ACCESS_TOKEN_SECRET?.trim() === DOCUMENTED_LOCAL_SECRET
  ) {
    throw new AuthEnvironmentValidationError();
  }
  const secure = appEnvironment === 'preview' || appEnvironment === 'uat' || appEnvironment === 'production';
  return Object.freeze({
    accessTokenSecret: parseSecret(source),
    accessTokenTtlSeconds: ACCESS_TOKEN_TTL_SECONDS,
    refreshTokenTtlSeconds: REFRESH_TOKEN_TTL_SECONDS,
    otpProviderMode: appEnvironment === 'local' || appEnvironment === 'test'
      ? 'deterministic-fake' as const
      : 'unconfigured' as const,
    cookie: Object.freeze({
      name: 'sadat_refresh' as const,
      path: '/api/v1/auth' as const,
      httpOnly: true as const,
      sameSite: 'Strict' as const,
      secure,
      maxAgeSeconds: REFRESH_TOKEN_TTL_SECONDS
    })
  });
}

export function toSafeAuthEnvironmentSummary(
  environment: AuthEnvironment
): SafeAuthEnvironmentSummary {
  return {
    accessTokenTtlSeconds: environment.accessTokenTtlSeconds,
    refreshTokenTtlSeconds: environment.refreshTokenTtlSeconds,
    otpProviderMode: environment.otpProviderMode,
    refreshCookie: { ...environment.cookie }
  };
}
