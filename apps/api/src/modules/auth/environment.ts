import type { AppEnvironment } from '../config/environment.js';

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;
const BASE64URL_SECRET_PATTERN = /^[A-Za-z0-9_-]{43,128}$/;
const DOCUMENTED_LOCAL_SECRET = 'bG9jYWwtZGV2ZWxvcG1lbnQtb25seS1rZXktMzItYnl0ZXM';
const SMTP_MODES = ['deterministic-fake', 'smtp', 'unconfigured'] as const;
const SMTP_TLS_MODES = ['implicit', 'starttls', 'none'] as const;

export interface AuthCookiePolicy {
  name: 'sadat_refresh';
  path: '/api/v1/auth';
  httpOnly: true;
  sameSite: 'Strict';
  secure: boolean;
  maxAgeSeconds: number;
}

export interface SmtpAuthEnvironment {
  host: string;
  port: number;
  tls: 'implicit' | 'starttls' | 'none';
  user?: string;
  password?: string;
  from: string;
  productName: string;
}

export interface AuthEnvironment {
  accessTokenSecret: Uint8Array;
  accessTokenTtlSeconds: number;
  refreshTokenTtlSeconds: number;
  otpProviderMode: (typeof SMTP_MODES)[number];
  smtp?: SmtpAuthEnvironment;
  cookie: AuthCookiePolicy;
}

export interface SafeAuthEnvironmentSummary {
  accessTokenTtlSeconds: number;
  refreshTokenTtlSeconds: number;
  otpProviderMode: AuthEnvironment['otpProviderMode'];
  smtp?: Omit<SmtpAuthEnvironment, 'user' | 'password'> & { authenticated: boolean };
  refreshCookie: Omit<AuthCookiePolicy, 'name'> & { name: string };
}

export class AuthEnvironmentValidationError extends Error {
  readonly code = 'AUTH_ENVIRONMENT_INVALID';

  constructor(issue = 'AUTH_ACCESS_TOKEN_SECRET (REQUIRED_BASE64URL_32_BYTES)') {
    super(`Invalid authentication configuration: ${issue}`);
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

function parsePort(value: string | undefined): number {
  if (!value || !/^\d+$/.test(value)) {
    throw new AuthEnvironmentValidationError('SMTP_PORT (INTEGER_1_TO_65535)');
  }
  const port = Number(value);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
    throw new AuthEnvironmentValidationError('SMTP_PORT (INTEGER_1_TO_65535)');
  }
  return port;
}

function validHost(value: string): boolean {
  return value.length <= 253
    && !/[\s/?#]/u.test(value)
    && /^(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)*[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/.test(value);
}

function validMailbox(value: string): boolean {
  const angleMatch = value.match(/<([^<>]+)>\s*$/u);
  const mailbox = (angleMatch?.[1] ?? value).trim().toLowerCase();
  return mailbox.length <= 254 && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/u.test(mailbox);
}

function parseSmtpEnvironment(
  source: Record<string, string | undefined>,
  appEnvironment: AppEnvironment
): SmtpAuthEnvironment {
  const host = source.SMTP_HOST?.trim();
  const tlsValue = source.SMTP_TLS?.trim().toLowerCase();
  const from = source.SMTP_FROM?.trim();
  const productName = source.SMTP_PRODUCT_NAME?.trim() || 'Elsadat Real Estate';
  const user = source.SMTP_USER?.trim();
  const password = source.SMTP_PASSWORD;

  if (!host || !validHost(host)) {
    throw new AuthEnvironmentValidationError('SMTP_HOST (VALID_HOST_REQUIRED)');
  }
  if (!tlsValue || !(SMTP_TLS_MODES as readonly string[]).includes(tlsValue)) {
    throw new AuthEnvironmentValidationError('SMTP_TLS (implicit|starttls|none)');
  }
  if (!from || !validMailbox(from)) {
    throw new AuthEnvironmentValidationError('SMTP_FROM (VALID_MAILBOX_REQUIRED)');
  }
  if (productName.length > 100) {
    throw new AuthEnvironmentValidationError('SMTP_PRODUCT_NAME (MAX_100_CHARACTERS)');
  }
  if ((user === undefined) !== (password === undefined)) {
    throw new AuthEnvironmentValidationError('SMTP_USER_AND_SMTP_PASSWORD (BOTH_OR_NEITHER)');
  }
  const protectedEnvironment = appEnvironment === 'preview'
    || appEnvironment === 'uat'
    || appEnvironment === 'production';
  if (protectedEnvironment && (!user || !password)) {
    throw new AuthEnvironmentValidationError('SMTP_USER_AND_SMTP_PASSWORD (REQUIRED)');
  }
  if (protectedEnvironment && tlsValue === 'none') {
    throw new AuthEnvironmentValidationError('SMTP_TLS (TLS_REQUIRED)');
  }

  return Object.freeze({
    host,
    port: parsePort(source.SMTP_PORT?.trim()),
    tls: tlsValue as SmtpAuthEnvironment['tls'],
    ...(user === undefined ? {} : { user }),
    ...(password === undefined ? {} : { password }),
    from,
    productName
  });
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

  const configuredMode = source.OTP_PROVIDER?.trim().toLowerCase();
  const defaultMode = appEnvironment === 'local' || appEnvironment === 'test'
    ? 'deterministic-fake'
    : 'unconfigured';
  const otpProviderMode = configuredMode || defaultMode;
  if (!(SMTP_MODES as readonly string[]).includes(otpProviderMode)) {
    throw new AuthEnvironmentValidationError('OTP_PROVIDER (deterministic-fake|smtp|unconfigured)');
  }
  if (
    otpProviderMode === 'deterministic-fake'
    && appEnvironment !== 'local'
    && appEnvironment !== 'test'
  ) {
    throw new AuthEnvironmentValidationError('OTP_PROVIDER (DETERMINISTIC_FAKE_NOT_ALLOWED)');
  }

  const secure = appEnvironment === 'preview' || appEnvironment === 'uat' || appEnvironment === 'production';
  const smtp = otpProviderMode === 'smtp'
    ? parseSmtpEnvironment(source, appEnvironment)
    : undefined;
  return Object.freeze({
    accessTokenSecret: parseSecret(source),
    accessTokenTtlSeconds: ACCESS_TOKEN_TTL_SECONDS,
    refreshTokenTtlSeconds: REFRESH_TOKEN_TTL_SECONDS,
    otpProviderMode: otpProviderMode as AuthEnvironment['otpProviderMode'],
    ...(smtp === undefined ? {} : { smtp }),
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
    ...(environment.smtp === undefined
      ? {}
      : {
          smtp: {
            host: environment.smtp.host,
            port: environment.smtp.port,
            tls: environment.smtp.tls,
            from: environment.smtp.from,
            productName: environment.smtp.productName,
            authenticated: environment.smtp.user !== undefined
          }
        }),
    refreshCookie: { ...environment.cookie }
  };
}
