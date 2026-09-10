import { Router, type Request, type RequestHandler, type Response } from 'express';
import type { AccessTokenClaims, AccessTokenService } from './crypto.js';
import { ApiContractError, toApiErrorResponse } from '../contracts/error-boundary.js';
import { toSuccessResponse } from '../contracts/response.js';
import { getRequestContext } from '../observability/context.js';
import { SessionManagementError, type SessionManagementService } from './session-service.js';

export const SESSION_MANAGEMENT_ROUTE_DEFINITIONS = [
  { method: 'GET', path: '/api/v1/me/sessions', operationId: 'listOwnSessions' },
  { method: 'DELETE', path: '/api/v1/me/sessions/:sessionId', operationId: 'revokeOwnSession' }
] as const;

export interface SessionManagementRouterDependencies {
  service: SessionManagementService;
  accessTokens: AccessTokenService;
}

function requestContext(request: Request): { requestId: string; traceId: string } {
  const context = getRequestContext();
  return {
    requestId: context?.requestId ?? request.get('x-request-id') ?? 'unknown-request',
    traceId: context?.traceId ?? '00000000000000000000000000000000'
  };
}

function bearer(request: Request): string | undefined {
  const header = request.get('authorization')?.trim();
  if (!header || !/^Bearer\s+/iu.test(header)) return undefined;
  return header.replace(/^Bearer\s+/iu, '').trim() || undefined;
}

function authenticate(accessTokens: AccessTokenService): RequestHandler {
  return (request, response, next) => {
    const token = bearer(request);
    if (!token) return sendError(request, response, new ApiContractError('AUTHENTICATION_REQUIRED', 'errors.authenticationRequired', 401));
    try {
      const claims = accessTokens.verify(token);
      if (claims.status === 'rejected' || claims.status === 'restricted' || claims.status === 'suspended') {
        return sendError(request, response, new ApiContractError('FORBIDDEN', 'errors.forbidden', 403));
      }
      response.locals.sessionClaims = claims;
      next();
    } catch {
      sendError(request, response, new ApiContractError('AUTHENTICATION_REQUIRED', 'errors.authenticationRequired', 401));
    }
  };
}

function sendError(request: Request, response: Response, error: unknown): void {
  const mappedError = error instanceof SessionManagementError
    ? error.code === 'SESSION_NOT_FOUND'
      ? new ApiContractError(error.code, 'errors.auth.sessionNotFound', 404)
      : new ApiContractError(error.code, 'errors.auth.currentSessionLogoutRequired', 409)
    : error;
  const mapped = toApiErrorResponse(mappedError, requestContext(request).requestId);
  response.status(mapped.statusCode).json(mapped.body);
}

function principal(response: Response) {
  const claims = response.locals.sessionClaims as AccessTokenClaims;
  return { userId: claims.sub, sessionId: claims.sid, roleType: claims.role };
}

export function createSessionManagementRouter(dependencies: SessionManagementRouterDependencies): Router {
  const router = Router();
  router.use('/me/sessions', (_request, response, next) => { response.setHeader('Cache-Control', 'no-store'); next(); });
  router.use('/me/sessions', authenticate(dependencies.accessTokens));
  router.get('/me/sessions', async (request, response) => {
    try {
      response.status(200).json(toSuccessResponse(await dependencies.service.list(principal(response)), requestContext(request).requestId));
    } catch (error) { sendError(request, response, error); }
  });
  router.delete('/me/sessions/:sessionId', async (request, response) => {
    try {
      const context = requestContext(request);
      response.status(200).json(toSuccessResponse(
        await dependencies.service.revoke(principal(response), request.params.sessionId, context),
        context.requestId
      ));
    } catch (error) { sendError(request, response, error); }
  });
  return router;
}
