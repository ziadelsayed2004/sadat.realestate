import { Router, type Request, type Response } from 'express';
import {
  seekerPreferencesPatchSchema,
  seekerProfilePatchSchema,
  seekerRegistrationRequestSchema
} from '@sadat-real-estate/contracts';
import type { AccessTokenClaims, AccessTokenService } from '../auth/crypto.js';
import type { AuthCookiePolicy } from '../auth/environment.js';
import { serializeRefreshCookie } from '../auth/router.js';
import { ApiContractError, toApiErrorResponse } from '../contracts/error-boundary.js';
import { toSuccessResponse } from '../contracts/response.js';
import { getRequestContext } from '../observability/context.js';
import { createSeekerAuthMiddleware } from './auth.js';
import { SeekerServiceError, type SeekerService } from './service.js';

export const SEEKER_ROUTE_DEFINITIONS = [
  { method: 'POST', path: '/api/v1/auth/register/seeker', operationId: 'registerSeeker' },
  { method: 'GET', path: '/api/v1/me', operationId: 'getCurrentSeekerProfile' },
  { method: 'PATCH', path: '/api/v1/me', operationId: 'updateCurrentSeekerProfile' },
  { method: 'GET', path: '/api/v1/me/preferences', operationId: 'getCurrentSeekerPreferences' },
  { method: 'PATCH', path: '/api/v1/me/preferences', operationId: 'updateCurrentSeekerPreferences' }
] as const;

export interface SeekerRouterDependencies {
  service: SeekerService;
  accessTokens: AccessTokenService;
  cookie: AuthCookiePolicy;
}

const SEEKER_ERROR_MAP = Object.freeze({
  INVALID_REGISTRATION_TOKEN: { statusCode: 401, messageKey: 'errors.seeker.invalidRegistrationToken' },
  SEEKER_ALREADY_EXISTS: { statusCode: 409, messageKey: 'errors.seeker.alreadyExists' },
  SEEKER_NOT_FOUND: { statusCode: 404, messageKey: 'errors.seeker.notFound' },
  ACCOUNT_NOT_ACTIVE: { statusCode: 403, messageKey: 'errors.auth.accountNotActive' }
});

function requestId(request: Request): string {
  return getRequestContext()?.requestId ?? request.get('x-request-id') ?? 'unknown-request';
}

function sendError(request: Request, response: Response, error: unknown): void {
  const seekerError = error instanceof SeekerServiceError ? error : undefined;
  const mapped = seekerError ? SEEKER_ERROR_MAP[seekerError.code] : undefined;
  const body = toApiErrorResponse(
    mapped
      ? new ApiContractError(seekerError!.code, mapped.messageKey, mapped.statusCode)
      : error,
    requestId(request)
  );
  response.status(body.statusCode).json(body.body);
}

function claims(response: Response): AccessTokenClaims {
  return response.locals.seekerClaims as AccessTokenClaims;
}

export function createSeekerRouter(dependencies: SeekerRouterDependencies): Router {
  const router = Router();
  router.use((_request, response, next) => {
    response.setHeader('Cache-Control', 'no-store');
    next();
  });

  router.post('/auth/register/seeker', async (request, response) => {
    try {
      const input = seekerRegistrationRequestSchema.parse(request.body ?? {});
      const session = await dependencies.service.register(input);
      response.setHeader('Set-Cookie', serializeRefreshCookie(
        session.refreshToken,
        dependencies.cookie
      ));
      response.status(201).json(toSuccessResponse(session.data, requestId(request)));
    } catch (error) {
      sendError(request, response, error);
    }
  });

  router.use(createSeekerAuthMiddleware(dependencies.accessTokens));

  router.get('/me', async (request, response) => {
    try {
      const profile = await dependencies.service.getProfile(claims(response));
      response.status(200).json(toSuccessResponse(profile, requestId(request)));
    } catch (error) {
      sendError(request, response, error);
    }
  });

  router.patch('/me', async (request, response) => {
    try {
      const patch = seekerProfilePatchSchema.parse(request.body ?? {});
      const profile = await dependencies.service.updateProfile(claims(response), patch);
      response.status(200).json(toSuccessResponse(profile, requestId(request)));
    } catch (error) {
      sendError(request, response, error);
    }
  });

  router.get('/me/preferences', async (request, response) => {
    try {
      const result = await dependencies.service.getPreferences(claims(response));
      response.status(200).json(toSuccessResponse({
        preferences: result.data,
        updatedAt: result.updatedAt.toISOString()
      }, requestId(request)));
    } catch (error) {
      sendError(request, response, error);
    }
  });

  router.patch('/me/preferences', async (request, response) => {
    try {
      const patch = seekerPreferencesPatchSchema.parse(request.body ?? {});
      const result = await dependencies.service.updatePreferences(claims(response), patch);
      response.status(200).json(toSuccessResponse({
        preferences: result.data,
        updatedAt: result.updatedAt.toISOString()
      }, requestId(request)));
    } catch (error) {
      sendError(request, response, error);
    }
  });

  return router;
}
