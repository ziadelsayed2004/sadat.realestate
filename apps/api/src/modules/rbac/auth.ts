import type { Request, RequestHandler, Response } from 'express';
import type { AccessTokenService } from '../auth/crypto.js';
import { ApiContractError, toApiErrorResponse } from '../contracts/error-boundary.js';
import { getRequestContext } from '../observability/context.js';
import type { PrivacySecuritySettingsReader } from '../settings/privacy-security-policy.js';

const privacyPolicies = new WeakMap<AccessTokenService, PrivacySecuritySettingsReader>();

export function registerAdminPrivacySecurityPolicy(
  accessTokens: AccessTokenService,
  reader: PrivacySecuritySettingsReader
): void {
  privacyPolicies.set(accessTokens, reader);
}

function requestId(request: Request): string {
  return getRequestContext()?.requestId ?? request.get('x-request-id') ?? 'unknown-request';
}

function sendError(
  request: Request,
  response: Response,
  code: string,
  messageKey: string,
  statusCode: number
): void {
  const mapped = toApiErrorResponse(
    new ApiContractError(code, messageKey, statusCode),
    requestId(request)
  );
  response.status(mapped.statusCode).json(mapped.body);
}

function bearer(request: Request): string | undefined {
  const header = request.get('authorization')?.trim();
  if (!header || !/^Bearer\s+/i.test(header)) return undefined;
  return header.replace(/^Bearer\s+/i, '').trim() || undefined;
}

export function createAdminRbacAuthMiddleware(accessTokens: AccessTokenService): RequestHandler {
  return async (request, response, next) => {
    const token = bearer(request);
    if (!token) {
      sendError(request, response, 'AUTHENTICATION_REQUIRED', 'errors.authenticationRequired', 401);
      return;
    }
    try {
      const claims = accessTokens.verify(token);
      if (claims.role !== 'admin' || claims.status !== 'verified') {
        sendError(request, response, 'FORBIDDEN', 'errors.forbidden', 403);
        return;
      }
      const reader = privacyPolicies.get(accessTokens);
      if (reader) {
        const policy = await reader.read();
        const nowSeconds = Math.floor(Date.now() / 1_000);
        if (
          (policy.adminSessionTimeoutMinutes !== undefined
            && nowSeconds - claims.iat >= policy.adminSessionTimeoutMinutes * 60)
          || (policy.twoFactorAuthentication && claims.amr !== 'mfa')
        ) {
          sendError(request, response, 'AUTHENTICATION_REQUIRED', 'errors.authenticationRequired', 401);
          return;
        }
      }
      response.locals.adminRbacClaims = claims;
      next();
    } catch {
      sendError(request, response, 'AUTHENTICATION_REQUIRED', 'errors.authenticationRequired', 401);
    }
  };
}
