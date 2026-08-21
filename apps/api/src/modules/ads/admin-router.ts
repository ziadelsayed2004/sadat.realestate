import { Router, type Request, type Response } from 'express';
import { adAdminRequestListQuerySchema, adCalendarQuerySchema, adRequestIdParamsSchema } from '@sadat-real-estate/contracts';
import type { AccessTokenClaims, AccessTokenService } from '../auth/crypto.js';
import { ApiContractError, toApiErrorResponse } from '../contracts/error-boundary.js';
import { toSuccessResponse } from '../contracts/response.js';
import { getRequestContext } from '../observability/context.js';
import { createAdminRbacAuthMiddleware } from '../rbac/auth.js';
import { AdSettingsServiceError, type AdAdminRequestService, type AdCalendarService } from './service.js';

export const ADMIN_ADS_ROUTE_DEFINITIONS = [
  { method: 'GET', path: '/api/v1/admin/ad-requests', operationId: 'listAdminAdRequests' },
  { method: 'GET', path: '/api/v1/admin/ad-requests/:adRequestId', operationId: 'getAdminAdRequest' },
  { method: 'GET', path: '/api/v1/admin/ad-calendar', operationId: 'listAdminAdCalendar' },
  { method: 'POST', path: '/api/v1/admin/ad-requests/:adRequestId/schedule', operationId: 'scheduleAdminAdRequest' }
] as const;

export interface AdminAdsRouterDependencies {
  service: AdAdminRequestService;
  calendar: AdCalendarService;
  accessTokens: AccessTokenService;
}

const ERROR_MAP = Object.freeze({
  AD_FORBIDDEN: { statusCode: 403, messageKey: 'errors.forbidden' },
  AD_NOT_FOUND: { statusCode: 404, messageKey: 'errors.notFound' },
  AD_VERSION_CONFLICT: { statusCode: 409, messageKey: 'errors.conflict' },
  AD_PLACEMENT_CONFLICT: { statusCode: 409, messageKey: 'errors.conflict' }
});

function requestId(request: Request): string {
  return getRequestContext()?.requestId ?? request.get('x-request-id') ?? 'unknown-request';
}

function claims(response: Response): AccessTokenClaims {
  return response.locals.adminRbacClaims as AccessTokenClaims;
}

function sendError(request: Request, response: Response, error: unknown): void {
  const adError = error instanceof AdSettingsServiceError ? error : undefined;
  const definition = adError ? ERROR_MAP[`AD_${adError.code}` as keyof typeof ERROR_MAP] : undefined;
  const mapped = toApiErrorResponse(
    definition && adError
      ? new ApiContractError(`AD_${adError.code}`, definition.messageKey, definition.statusCode)
      : error,
    requestId(request)
  );
  response.status(mapped.statusCode).json(mapped.body);
}

export function createAdminAdsRouter(dependencies: AdminAdsRouterDependencies): Router {
  const router = Router();
  router.use((_request, response, next) => {
    response.setHeader('Cache-Control', 'no-store');
    next();
  });
  router.use('/admin/ad-requests', createAdminRbacAuthMiddleware(dependencies.accessTokens));
  router.use('/admin/ad-calendar', createAdminRbacAuthMiddleware(dependencies.accessTokens));

  router.get('/admin/ad-requests', async (request, response) => {
    try {
      const data = await dependencies.service.list(claims(response), adAdminRequestListQuerySchema.parse(request.query));
      response.status(200).json(toSuccessResponse(data, requestId(request), { page: data.page, limit: data.limit, total: data.total }));
    } catch (error) {
      sendError(request, response, error);
    }
  });

  router.get('/admin/ad-requests/:adRequestId', async (request, response) => {
    try {
      const { adRequestId } = adRequestIdParamsSchema.parse(request.params);
      response.status(200).json(toSuccessResponse(
        await dependencies.service.get(claims(response), adRequestId),
        requestId(request)
      ));
    } catch (error) {
      sendError(request, response, error);
    }
  });

  router.get('/admin/ad-calendar', async (request, response) => {
    try {
      const data = await dependencies.calendar.list(claims(response), adCalendarQuerySchema.parse(request.query));
      response.status(200).json(toSuccessResponse(data, requestId(request), { page: data.page, limit: data.limit, total: data.total }));
    } catch (error) {
      sendError(request, response, error);
    }
  });

  router.post('/admin/ad-requests/:adRequestId/schedule', async (request, response) => {
    try {
      const { adRequestId } = adRequestIdParamsSchema.parse(request.params);
      response.status(200).json(toSuccessResponse(
        await dependencies.calendar.schedule(claims(response), adRequestId, request.body ?? {}),
        requestId(request)
      ));
    } catch (error) {
      sendError(request, response, error);
    }
  });

  return router;
}
