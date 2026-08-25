import { Router, type Request, type Response } from 'express';
import {
  adQuoteIssueSchema,
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
import { createAdminRbacAuthMiddleware } from '../rbac/auth.js';
import { AdSettingsServiceError, type AdRequestWorkflowService } from '../ads/service.js';
import {
  ProviderAdvertisingProjectionError,
  type ProviderAdvertisingProjectionService
} from './advertising.js';
import {
  ProviderCommissionProjectionError,
  type ProviderCommissionProjectionService
} from './commission.js';
import { ProviderServiceError, type ProviderService } from './service.js';

export const PROVIDER_ROUTE_DEFINITIONS = [
  { method: 'POST', path: '/api/v1/provider/application', operationId: 'createProviderApplication' },
  { method: 'GET', path: '/api/v1/provider/application', operationId: 'getProviderApplication' },
  { method: 'PATCH', path: '/api/v1/provider/application/account', operationId: 'updateProviderAccountStep' },
  { method: 'PATCH', path: '/api/v1/provider/application/business', operationId: 'updateProviderBusinessStep' },
  { method: 'PATCH', path: '/api/v1/provider/application/company', operationId: 'updateProviderCompanyStep' },
  { method: 'POST', path: '/api/v1/provider/application/submit', operationId: 'submitProviderApplication' },
  { method: 'GET', path: '/api/v1/provider/application/status', operationId: 'getProviderApplicationStatus' },
  { method: 'GET', path: '/api/v1/provider/ads', operationId: 'listProviderAds' },
  { method: 'POST', path: '/api/v1/provider/ads', operationId: 'createProviderAdRequest' },
  { method: 'GET', path: '/api/v1/provider/ads/:adRequestId', operationId: 'getProviderAd' },
  { method: 'POST', path: '/api/v1/provider/ads/:adRequestId/accept-quote', operationId: 'acceptProviderAdQuote' },
  { method: 'GET', path: '/api/v1/provider/commission', operationId: 'getProviderCommission' },
  { method: 'POST', path: '/api/v1/admin/ad-requests/:adRequestId/quote', operationId: 'issueAdminAdQuote' }
] as const;

export interface ProviderRouterDependencies {
  service: ProviderService;
  accessTokens: AccessTokenService;
  cookie: AuthCookiePolicy;
  advertisingProjection?: ProviderAdvertisingProjectionService;
  advertisingWorkflow?: AdRequestWorkflowService;
  commissionProjection?: ProviderCommissionProjectionService;
}

const PROVIDER_ERROR_MAP = Object.freeze({
  INVALID_REGISTRATION_TOKEN: { statusCode: 401, messageKey: 'errors.provider.invalidRegistrationToken' },
  PROVIDER_ALREADY_EXISTS: { statusCode: 409, messageKey: 'errors.provider.alreadyExists' },
  PROVIDER_APPLICATION_NOT_FOUND: { statusCode: 404, messageKey: 'errors.provider.applicationNotFound' },
  PROVIDER_APPLICATION_NOT_EDITABLE: { statusCode: 409, messageKey: 'errors.provider.applicationNotEditable' },
  PROVIDER_APPLICATION_VERSION_CONFLICT: { statusCode: 409, messageKey: 'errors.provider.applicationVersionConflict' },
  PROVIDER_STEP_NOT_APPLICABLE: { statusCode: 409, messageKey: 'errors.provider.stepNotApplicable' },
  PROVIDER_APPLICATION_INCOMPLETE: { statusCode: 409, messageKey: 'errors.provider.applicationIncomplete' },
  PROVIDER_AD_FORBIDDEN: { statusCode: 403, messageKey: 'errors.forbidden' },
  PROVIDER_AD_NOT_FOUND: { statusCode: 404, messageKey: 'errors.notFound' },
  PROVIDER_AD_SOURCE_INVALID: { statusCode: 500, messageKey: 'errors.internal' },
  PROVIDER_COMMISSION_FORBIDDEN: { statusCode: 403, messageKey: 'errors.forbidden' },
  PROVIDER_COMMISSION_NOT_FOUND: { statusCode: 404, messageKey: 'errors.notFound' },
  PROVIDER_COMMISSION_SOURCE_INVALID: { statusCode: 500, messageKey: 'errors.internal' },
  AD_FORBIDDEN: { statusCode: 403, messageKey: 'errors.forbidden' },
  AD_NOT_FOUND: { statusCode: 404, messageKey: 'errors.notFound' },
  AD_DUPLICATE: { statusCode: 409, messageKey: 'errors.conflict' },
  AD_VERSION_CONFLICT: { statusCode: 409, messageKey: 'errors.conflict' },
  AD_PLACEMENT_CONFLICT: { statusCode: 409, messageKey: 'errors.conflict' }
});

function requestId(request: Request): string {
  return getRequestContext()?.requestId ?? request.get('x-request-id') ?? 'unknown-request';
}

function sendError(request: Request, response: Response, error: unknown): void {
  const providerError = error instanceof ProviderServiceError ? error : undefined;
  const advertisingError = error instanceof ProviderAdvertisingProjectionError ? error : undefined;
  const commissionError = error instanceof ProviderCommissionProjectionError ? error : undefined;
  const adWorkflowError = error instanceof AdSettingsServiceError ? error : undefined;
  const mapped = providerError
    ? PROVIDER_ERROR_MAP[providerError.code]
    : advertisingError
      ? PROVIDER_ERROR_MAP[advertisingError.code]
      : commissionError
        ? PROVIDER_ERROR_MAP[commissionError.code]
      : adWorkflowError
        ? PROVIDER_ERROR_MAP[`AD_${adWorkflowError.code}` as keyof typeof PROVIDER_ERROR_MAP]
      : undefined;
  const body = toApiErrorResponse(
    mapped
      ? new ApiContractError(
          providerError?.code ?? advertisingError?.code ?? commissionError?.code ?? `AD_${adWorkflowError!.code}`,
          mapped.messageKey,
          mapped.statusCode,
          providerError?.details
        )
      : error,
    requestId(request)
  );
  response.status(body.statusCode).json(body.body);
}

function claims(response: Response): AccessTokenClaims {
  return response.locals.providerClaims as AccessTokenClaims;
}

function adminClaims(response: Response): AccessTokenClaims {
  return response.locals.adminRbacClaims as AccessTokenClaims;
}

function objectIdPath(value: string): string {
  if (!/^[a-f0-9]{24}$/.test(value)) {
    throw new ApiContractError('VALIDATION_FAILED', 'errors.invalidInput', 400);
  }
  return value;
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

  router.use('/admin/ad-requests', createAdminRbacAuthMiddleware(dependencies.accessTokens));

  router.post('/admin/ad-requests/:adRequestId/quote', async (request, response) => {
    try {
      if (!dependencies.advertisingWorkflow) {
        throw new ApiContractError('PROVIDER_AD_UNAVAILABLE', 'errors.internal', 503);
      }
      const requestIdValue = objectIdPath(request.params.adRequestId);
      const body = adQuoteIssueSchema.omit({ requestId: true }).parse(request.body ?? {});
      response.status(201).json(toSuccessResponse(
        await dependencies.advertisingWorkflow.issueQuote(adminClaims(response), { requestId: requestIdValue, ...body }),
        requestId(request)
      ));
    } catch (error) {
      sendError(request, response, error);
    }
  });

  router.use('/provider', createProviderAuthMiddleware(dependencies.accessTokens));

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

  router.get('/provider/commission', async (request, response) => {
    try {
      if (!dependencies.commissionProjection) {
        throw new ProviderCommissionProjectionError('PROVIDER_COMMISSION_SOURCE_INVALID');
      }
      response.status(200).json(toSuccessResponse(
        await dependencies.commissionProjection.get(claims(response)),
        requestId(request)
      ));
    } catch (error) {
      sendError(request, response, error);
    }
  });

  router.get('/provider/ads', async (request, response) => {
    try {
      if (!dependencies.advertisingProjection) {
        throw new ProviderAdvertisingProjectionError('PROVIDER_AD_SOURCE_INVALID');
      }
      response.status(200).json(toSuccessResponse(
        await dependencies.advertisingProjection.list(claims(response), request.query),
        requestId(request)
      ));
    } catch (error) {
      sendError(request, response, error);
    }
  });

  router.post('/provider/ads', async (request, response) => {
    try {
      if (!dependencies.advertisingWorkflow) {
        throw new ApiContractError('PROVIDER_AD_UNAVAILABLE', 'errors.internal', 503);
      }
      response.status(201).json(toSuccessResponse(
        await dependencies.advertisingWorkflow.createRequest(claims(response), request.body ?? {}),
        requestId(request)
      ));
    } catch (error) {
      sendError(request, response, error);
    }
  });

  router.post('/provider/ads/:adRequestId/accept-quote', async (request, response) => {
    try {
      if (!dependencies.advertisingWorkflow) {
        throw new ApiContractError('PROVIDER_AD_UNAVAILABLE', 'errors.internal', 503);
      }
      response.status(200).json(toSuccessResponse(
        await dependencies.advertisingWorkflow.acceptQuote(
          claims(response),
          objectIdPath(request.params.adRequestId),
          request.body ?? {}
        ),
        requestId(request)
      ));
    } catch (error) {
      sendError(request, response, error);
    }
  });

  router.get('/provider/ads/:adRequestId', async (request, response) => {
    try {
      if (!dependencies.advertisingProjection) {
        throw new ProviderAdvertisingProjectionError('PROVIDER_AD_SOURCE_INVALID');
      }
      response.status(200).json(toSuccessResponse(
        await dependencies.advertisingProjection.get(claims(response), request.params.adRequestId),
        requestId(request)
      ));
    } catch (error) {
      sendError(request, response, error);
    }
  });

  return router;
}
