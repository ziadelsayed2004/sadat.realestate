import { Router, type Request, type Response } from 'express';
import {
  providerAccountPatchSchema,
  providerApplicationCreateRequestSchema,
  providerBusinessPatchSchema,
  providerCompanyPatchSchema,
  providerSubmitRequestSchema
} from '@sadat-real-estate/contracts';
import type { AccessTokenClaims, AccessTokenService } from '../auth/crypto.js';
import type { AuthCookiePolicy } from '../auth/environment.js';
import { serializeRefreshCookie } from '../auth/router.js';
import { ApiContractError, toApiErrorResponse } from '../contracts/error-boundary.js';
import { toSuccessResponse } from '../contracts/response.js';
import { getRequestContext } from '../observability/context.js';
import { createProviderAuthMiddleware } from './auth.js';
import { ProviderServiceError, type ProviderService } from './service.js';

export const PROVIDER_ROUTE_DEFINITIONS = [
  { method: 'POST', path: '/api/v1/provider/application', operationId: 'createProviderApplication' },
  { method: 'GET', path: '/api/v1/provider/application', operationId: 'getProviderApplication' },
  { method: 'PATCH', path: '/api/v1/provider/application/account', operationId: 'updateProviderAccountStep' },
  { method: 'PATCH', path: '/api/v1/provider/application/business', operationId: 'updateProviderBusinessStep' },
  { method: 'PATCH', path: '/api/v1/provider/application/company', operationId: 'updateProviderCompanyStep' },
  { method: 'POST', path: '/api/v1/provider/application/submit', operationId: 'submitProviderApplication' },
  { method: 'GET', path: '/api/v1/provider/application/status', operationId: 'getProviderApplicationStatus' }
] as const;

export interface ProviderRouterDependencies {
  service: ProviderService;
  accessTokens: AccessTokenService;
  cookie: AuthCookiePolicy;
}

const PROVIDER_ERROR_MAP = Object.freeze({
  INVALID_REGISTRATION_TOKEN: { statusCode: 401, messageKey: 'errors.provider.invalidRegistrationToken' },
  PROVIDER_ALREADY_EXISTS: { statusCode: 409, messageKey: 'errors.provider.alreadyExists' },
  PROVIDER_APPLICATION_NOT_FOUND: { statusCode: 404, messageKey: 'errors.provider.applicationNotFound' },
  PROVIDER_APPLICATION_NOT_EDITABLE: { statusCode: 409, messageKey: 'errors.provider.applicationNotEditable' },
  PROVIDER_APPLICATION_VERSION_CONFLICT: { statusCode: 409, messageKey: 'errors.provider.applicationVersionConflict' },
  PROVIDER_STEP_NOT_APPLICABLE: { statusCode: 409, messageKey: 'errors.provider.stepNotApplicable' },
  PROVIDER_APPLICATION_INCOMPLETE: { statusCode: 409, messageKey: 'errors.provider.applicationIncomplete' }
});

function requestId(request: Request): string {
  return getRequestContext()?.requestId ?? request.get('x-request-id') ?? 'unknown-request';
}

function sendError(request: Request, response: Response, error: unknown): void {
  const providerError = error instanceof ProviderServiceError ? error : undefined;
  const mapped = providerError ? PROVIDER_ERROR_MAP[providerError.code] : undefined;
  const body = toApiErrorResponse(
    mapped
      ? new ApiContractError(
          providerError!.code,
          mapped.messageKey,
          mapped.statusCode,
          providerError!.details
        )
      : error,
    requestId(request)
  );
  response.status(body.statusCode).json(body.body);
}

function claims(response: Response): AccessTokenClaims {
  return response.locals.providerClaims as AccessTokenClaims;
}

export function createProviderRouter(dependencies: ProviderRouterDependencies): Router {
  const router = Router();
  router.use((_request, response, next) => {
    response.setHeader('Cache-Control', 'no-store');
    next();
  });

  router.post('/provider/application', async (request, response) => {
    try {
      const input = providerApplicationCreateRequestSchema.parse(request.body ?? {});
      const registration = await dependencies.service.registerDraft(input);
      response.setHeader('Set-Cookie', serializeRefreshCookie(
        registration.refreshToken,
        dependencies.cookie
      ));
      response.status(201).json(toSuccessResponse(registration.data, requestId(request)));
    } catch (error) {
      sendError(request, response, error);
    }
  });

  router.use(createProviderAuthMiddleware(dependencies.accessTokens));

  router.get('/provider/application', async (request, response) => {
    try {
      response.status(200).json(toSuccessResponse(
        await dependencies.service.getApplication(claims(response)),
        requestId(request)
      ));
    } catch (error) {
      sendError(request, response, error);
    }
  });

  router.patch('/provider/application/account', async (request, response) => {
    try {
      const patch = providerAccountPatchSchema.parse(request.body ?? {});
      response.status(200).json(toSuccessResponse(
        await dependencies.service.updateAccount(claims(response), patch),
        requestId(request)
      ));
    } catch (error) {
      sendError(request, response, error);
    }
  });

  router.patch('/provider/application/business', async (request, response) => {
    try {
      const patch = providerBusinessPatchSchema.parse(request.body ?? {});
      response.status(200).json(toSuccessResponse(
        await dependencies.service.updateBusiness(claims(response), patch),
        requestId(request)
      ));
    } catch (error) {
      sendError(request, response, error);
    }
  });

  router.patch('/provider/application/company', async (request, response) => {
    try {
      const patch = providerCompanyPatchSchema.parse(request.body ?? {});
      response.status(200).json(toSuccessResponse(
        await dependencies.service.updateCompany(claims(response), patch),
        requestId(request)
      ));
    } catch (error) {
      sendError(request, response, error);
    }
  });

  router.post('/provider/application/submit', async (request, response) => {
    try {
      const input = providerSubmitRequestSchema.parse(request.body ?? {});
      response.status(200).json(toSuccessResponse(
        await dependencies.service.submit(claims(response), input),
        requestId(request)
      ));
    } catch (error) {
      sendError(request, response, error);
    }
  });

  router.get('/provider/application/status', async (request, response) => {
    try {
      response.status(200).json(toSuccessResponse(
        await dependencies.service.getStatus(claims(response)),
        requestId(request)
      ));
    } catch (error) {
      sendError(request, response, error);
    }
  });

  return router;
}
