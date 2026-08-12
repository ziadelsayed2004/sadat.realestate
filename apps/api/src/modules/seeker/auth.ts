import type { Request, RequestHandler, Response } from 'express';
import type { AccessTokenService } from '../auth/crypto.js';
import { ApiContractError, toApiErrorResponse } from '../contracts/error-boundary.js';
import { getRequestContext } from '../observability/context.js';

export interface SeekerAuthContext {
  userId: string;
  sessionId: string;
  role: 'seeker';
  status: 'draft' | 'unverified' | 'pending_review' | 'needs_information' | 'verified' | 'restricted';
}

function requestId(request: Request): string {
  return getRequestContext()?.requestId ?? request.get('x-request-id') ?? 'unknown-request';
}

function sendError(request: Request, response: Response, code: string, messageKey: string, statusCode: number): void {
  const mapped = toApiErrorResponse(new ApiContractError(code, messageKey, statusCode), requestId(request));
  response.status(mapped.statusCode).json(mapped.body);
}

function bearer(request: Request): string | undefined {
  const header = request.get('authorization')?.trim();
  if (!header || !/^Bearer\s+/i.test(header)) return undefined;
  const token = header.replace(/^Bearer\s+/i, '').trim();
  return token || undefined;
}

export function createSeekerAuthMiddleware(accessTokens: AccessTokenService): RequestHandler {
  return (request, response, next) => {
    const token = bearer(request);
    if (!token) {
      sendError(request, response, 'AUTHENTICATION_REQUIRED', 'errors.authenticationRequired', 401);
      return;
    }
    try {
      const claims = accessTokens.verify(token);
      if (claims.role !== 'seeker') {
        sendError(request, response, 'FORBIDDEN', 'errors.forbidden', 403);
        return;
      }
      response.locals.seekerClaims = claims;
      next();
    } catch {
      sendError(request, response, 'AUTHENTICATION_REQUIRED', 'errors.authenticationRequired', 401);
    }
  };
}
