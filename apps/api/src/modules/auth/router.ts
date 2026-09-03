import { randomUUID } from 'node:crypto';
import { Router, type Request, type Response } from 'express';
import {
  adminLoginRequestSchema,
  emptyAuthRequestSchema,
  otpSendRequestSchema,
  otpVerifyRequestSchema,
  passwordResetOtpSendRequestSchema,
  passwordResetOtpVerifyRequestSchema,
  passwordResetRequestSchema,
  passwordChangeRequestSchema
} from '@sadat-real-estate/contracts';
import { ApiContractError, toApiErrorResponse } from '../contracts/error-boundary.js';
import { toSuccessResponse } from '../contracts/response.js';
import { getRequestContext } from '../observability/context.js';
import type { AuthCookiePolicy } from './environment.js';
import { AuthServiceError, type AuthService } from './service.js';
import { OtpServiceError, type OtpService } from './otp-service.js';
import type { AccessTokenService } from './crypto.js';

export const AUTH_ROUTE_DEFINITIONS = [
  { method: 'POST', path: '/api/v1/auth/login', operationId: 'loginAdmin' },
  { method: 'POST', path: '/api/v1/auth/otp/send', operationId: 'sendEmailOtp' },
  { method: 'POST', path: '/api/v1/auth/otp/verify', operationId: 'verifyEmailOtp' },
  { method: 'POST', path: '/api/v1/auth/account-recovery/otp/send', operationId: 'sendAdminAccountRecoveryOtp' },
  { method: 'POST', path: '/api/v1/auth/account-recovery/otp/verify', operationId: 'verifyAdminAccountRecoveryOtp' },
  { method: 'POST', path: '/api/v1/auth/account-recovery/complete', operationId: 'completeAdminAccountRecovery' },
  { method: 'POST', path: '/api/v1/auth/password/change', operationId: 'changeAccountPassword' },
  { method: 'POST', path: '/api/v1/auth/refresh', operationId: 'refreshSession' },
  { method: 'POST', path: '/api/v1/auth/logout', operationId: 'logoutSession' }
] as const;

export interface AuthRouterDependencies {
  service: AuthService;
  otpService: OtpService;
  cookie: AuthCookiePolicy;
  accessTokens?: AccessTokenService;
}

const AUTH_ERROR_MAP = Object.freeze({
  INVALID_CREDENTIALS: {
    statusCode: 401,
    messageKey: 'errors.auth.invalidCredentials'
  },
  ACCOUNT_NOT_ACTIVE: {
    statusCode: 403,
    messageKey: 'errors.auth.accountNotActive'
  },
  INVALID_REFRESH_TOKEN: {
    statusCode: 401,
    messageKey: 'errors.auth.invalidRefreshToken'
  },
  REFRESH_TOKEN_REUSED: {
    statusCode: 401,
    messageKey: 'errors.auth.refreshTokenReused'
  },
  INVALID_OTP: {
    statusCode: 401,
    messageKey: 'errors.auth.invalidOtp'
  },
  OTP_ATTEMPTS_EXCEEDED: {
    statusCode: 429,
    messageKey: 'errors.auth.otpAttemptsExceeded'
  },
  OTP_SEND_RATE_LIMITED: {
    statusCode: 429,
    messageKey: 'errors.auth.otpSendRateLimited'
  },
  OTP_PROVIDER_UNAVAILABLE: {
    statusCode: 503,
    messageKey: 'errors.auth.otpProviderUnavailable'
  }
});

function requestId(request: Request): string {
  return getRequestContext()?.requestId ?? request.get('x-request-id') ?? randomUUID();
}

function refreshCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  const matches = header.split(';').map((part) => part.trim()).filter((part) => {
    const separator = part.indexOf('=');
    return separator > 0 && part.slice(0, separator) === name;
  });
  if (matches.length !== 1) return undefined;
  return matches[0]!.slice(matches[0]!.indexOf('=') + 1);
}

export function serializeRefreshCookie(
  token: string,
  policy: AuthCookiePolicy,
  maxAgeSeconds = policy.maxAgeSeconds
): string {
  const attributes = [
    `${policy.name}=${token}`,
    `Max-Age=${maxAgeSeconds}`,
    `Path=${policy.path}`,
    'HttpOnly',
    `SameSite=${policy.sameSite}`
  ];
  if (policy.secure) attributes.push('Secure');
  return attributes.join('; ');
}

function clearRefreshCookie(response: Response, policy: AuthCookiePolicy): void {
  response.setHeader('Set-Cookie', serializeRefreshCookie('', policy, 0));
}

function setRefreshCookie(response: Response, token: string, policy: AuthCookiePolicy): void {
  response.setHeader('Set-Cookie', serializeRefreshCookie(token, policy));
}

function mappedAuthError(error: AuthServiceError | OtpServiceError): ApiContractError {
  const definition = AUTH_ERROR_MAP[error.code];
  return new ApiContractError(
    error.code,
    definition.messageKey,
    definition.statusCode
  );
}

function sendError(
  request: Request,
  response: Response,
  error: unknown,
  clearCookie: boolean,
  policy: AuthCookiePolicy
): void {
  if (clearCookie) clearRefreshCookie(response, policy);
  const mapped = toApiErrorResponse(
    error instanceof AuthServiceError || error instanceof OtpServiceError
      ? mappedAuthError(error)
      : error,
    requestId(request)
  );
  response.status(mapped.statusCode).json(mapped.body);
}

export function createAuthRouter(dependencies: AuthRouterDependencies): Router {
  const router = Router();
  router.use((_request, response, next) => {
    response.setHeader('Cache-Control', 'no-store');
    next();
  });

  router.post('/login', async (request, response) => {
    try {
      const input = adminLoginRequestSchema.parse(request.body ?? {});
      const session = await dependencies.service.loginAdmin(input);
      setRefreshCookie(response, session.refreshToken, dependencies.cookie);
      response.status(200).json(toSuccessResponse(session.data, requestId(request)));
    } catch (error) {
      sendError(request, response, error, false, dependencies.cookie);
    }
  });

  router.post('/otp/send', async (request, response) => {
    try {
      const input = otpSendRequestSchema.parse(request.body ?? {});
      const result = await dependencies.otpService.send(input);
      response.status(202).json(toSuccessResponse(result, requestId(request)));
    } catch (error) {
      sendError(request, response, error, false, dependencies.cookie);
    }
  });

  router.post('/otp/verify', async (request, response) => {
    try {
      const input = otpVerifyRequestSchema.parse(request.body ?? {});
      const result = await dependencies.otpService.verify(input);
      if (result.data.outcome === 'authenticated' && 'refreshToken' in result) {
        setRefreshCookie(response, result.refreshToken, dependencies.cookie);
      }
      response.status(200).json(toSuccessResponse(result.data, requestId(request)));
    } catch (error) {
      sendError(request, response, error, false, dependencies.cookie);
    }
  });

  router.post('/account-recovery/otp/send', async (request, response) => {
    try {
      const input = passwordResetOtpSendRequestSchema.parse(request.body ?? {});
      const result = await dependencies.otpService.send(input);
      response.status(202).json(toSuccessResponse(result, requestId(request)));
    } catch (error) {
      sendError(request, response, error, false, dependencies.cookie);
    }
  });

  router.post('/account-recovery/otp/verify', async (request, response) => {
    try {
      const input = passwordResetOtpVerifyRequestSchema.parse(request.body ?? {});
      const result = await dependencies.otpService.verify(input);
      response.status(200).json(toSuccessResponse(result.data, requestId(request)));
    } catch (error) {
      sendError(request, response, error, false, dependencies.cookie);
    }
  });

  router.post('/account-recovery/complete', async (request, response) => {
    try {
      const input = passwordResetRequestSchema.parse(request.body ?? {});
      await dependencies.otpService.resetPassword(input);
      clearRefreshCookie(response, dependencies.cookie);
      response.status(200).json(toSuccessResponse({ reset: true as const }, requestId(request)));
    } catch (error) {
      sendError(request, response, error, true, dependencies.cookie);
    }
  });

  router.post('/password/change', async (request, response) => {
    try {
      if (!dependencies.accessTokens) throw new ApiContractError('AUTHENTICATION_REQUIRED', 'errors.authenticationRequired', 401);
      const token = request.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
      if (!token) throw new ApiContractError('AUTHENTICATION_REQUIRED', 'errors.authenticationRequired', 401);
      const claims = dependencies.accessTokens.verify(token);
      if (claims.status !== 'verified') throw new ApiContractError('FORBIDDEN', 'errors.forbidden', 403);
      const input = passwordChangeRequestSchema.parse(request.body ?? {});
      await dependencies.service.changeAccountPassword(claims.sub, input);
      clearRefreshCookie(response, dependencies.cookie);
      response.status(200).json(toSuccessResponse({ changed: true as const }, requestId(request)));
    } catch (error) {
      sendError(request, response, error, true, dependencies.cookie);
    }
  });

  router.post('/refresh', async (request, response) => {
    try {
      emptyAuthRequestSchema.parse(request.body ?? {});
      const token = refreshCookie(request.get('cookie'), dependencies.cookie.name);
      if (!token) throw new AuthServiceError('INVALID_REFRESH_TOKEN');
      const session = await dependencies.service.refresh(token);
      setRefreshCookie(response, session.refreshToken, dependencies.cookie);
      response.status(200).json(toSuccessResponse(session.data, requestId(request)));
    } catch (error) {
      sendError(request, response, error, true, dependencies.cookie);
    }
  });

  router.post('/logout', async (request, response) => {
    try {
      emptyAuthRequestSchema.parse(request.body ?? {});
      const token = refreshCookie(request.get('cookie'), dependencies.cookie.name);
      if (!token) throw new AuthServiceError('INVALID_REFRESH_TOKEN');
      await dependencies.service.logout(token);
      clearRefreshCookie(response, dependencies.cookie);
      response.status(200).json(toSuccessResponse({ loggedOut: true as const }, requestId(request)));
    } catch (error) {
      sendError(request, response, error, true, dependencies.cookie);
    }
  });

  return router;
}
