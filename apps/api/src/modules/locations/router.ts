import { Router, type Request, type Response } from 'express';
import {
  locationCreateRequestSchema,
  locationDeleteRequestSchema,
  locationIdParamsSchema,
  locationListQuerySchema,
  locationPatchRequestSchema
} from '@sadat-real-estate/contracts';
import type { AccessTokenClaims, AccessTokenService } from '../auth/crypto.js';
import { ApiContractError, toApiErrorResponse } from '../contracts/error-boundary.js';
import { toSuccessResponse } from '../contracts/response.js';
import { getRequestContext } from '../observability/context.js';
import { createAdminRbacAuthMiddleware } from '../rbac/auth.js';
import { LocationServiceError, type LocationService } from './service.js';

export const LOCATION_ROUTE_DEFINITIONS = [
  { method: 'GET', path: '/api/v1/admin/locations', operationId: 'listAdminLocations' },
  { method: 'POST', path: '/api/v1/admin/locations', operationId: 'createAdminLocation' },
  { method: 'PATCH', path: '/api/v1/admin/locations/:locationId', operationId: 'updateAdminLocation' },
  { method: 'DELETE', path: '/api/v1/admin/locations/:locationId', operationId: 'deleteAdminLocation' }
] as const;

export interface LocationRouterDependencies {
  service: LocationService;
  accessTokens: AccessTokenService;
}

const ERROR_MAP = Object.freeze({
  LOCATION_FORBIDDEN: { statusCode: 403, messageKey: 'errors.locations.forbidden' },
  LOCATION_NOT_FOUND: { statusCode: 404, messageKey: 'errors.locations.notFound' },
  LOCATION_PARENT_NOT_FOUND: { statusCode: 409, messageKey: 'errors.locations.parentNotFound' },
  LOCATION_PARENT_INVALID: { statusCode: 409, messageKey: 'errors.locations.parentInvalid' },
  LOCATION_SLUG_EXISTS: { statusCode: 409, messageKey: 'errors.locations.slugExists' },
  LOCATION_VERSION_CONFLICT: { statusCode: 409, messageKey: 'errors.locations.versionConflict' },
  LOCATION_IN_USE: { statusCode: 409, messageKey: 'errors.locations.inUse' }
});

function context(request: Request): { requestId: string; traceId: string } {
  const current = getRequestContext();
  return {
    requestId: current?.requestId ?? request.get('x-request-id') ?? 'unknown-request',
    traceId: current?.traceId ?? 'unknown-trace'
  };
}

function principal(response: Response): { userId: string } {
  return { userId: (response.locals.adminRbacClaims as AccessTokenClaims).sub };
}

function sendError(request: Request, response: Response, error: unknown): void {
  const serviceError = error instanceof LocationServiceError ? error : undefined;
  const definition = serviceError ? ERROR_MAP[serviceError.code] : undefined;
  const requestContext = context(request);
  const mapped = toApiErrorResponse(
    definition
      ? new ApiContractError(serviceError!.code, definition.messageKey, definition.statusCode)
      : error,
    requestContext.requestId
  );
  response.status(mapped.statusCode).json(mapped.body);
}

export function createLocationRouter(dependencies: LocationRouterDependencies): Router {
  const router = Router();
  router.use('/admin/locations', (_request, response, next) => {
    response.setHeader('Cache-Control', 'no-store');
    next();
  });
  router.use('/admin/locations', createAdminRbacAuthMiddleware(dependencies.accessTokens));

  router.get('/admin/locations', async (request, response) => {
    try {
      const query = locationListQuerySchema.parse(request.query);
      const result = await dependencies.service.list(principal(response), query);
      response.status(200).json(toSuccessResponse(result.data, context(request).requestId, {
        page: result.page, limit: result.limit, total: result.total
      }));
    } catch (error) { sendError(request, response, error); }
  });

  router.post('/admin/locations', async (request, response) => {
    try {
      const input = locationCreateRequestSchema.parse(request.body ?? {});
      const requestContext = context(request);
      response.status(201).json(toSuccessResponse(
        await dependencies.service.create(principal(response), input, requestContext),
        requestContext.requestId
      ));
    } catch (error) { sendError(request, response, error); }
  });

  router.patch('/admin/locations/:locationId', async (request, response) => {
    try {
      const { locationId } = locationIdParamsSchema.parse(request.params);
      const input = locationPatchRequestSchema.parse(request.body ?? {});
      const requestContext = context(request);
      response.status(200).json(toSuccessResponse(
        await dependencies.service.update(principal(response), locationId, input, requestContext),
        requestContext.requestId
      ));
    } catch (error) { sendError(request, response, error); }
  });

  router.delete('/admin/locations/:locationId', async (request, response) => {
    try {
      const { locationId } = locationIdParamsSchema.parse(request.params);
      const input = locationDeleteRequestSchema.parse(request.body ?? {});
      const requestContext = context(request);
      response.status(200).json(toSuccessResponse(
        await dependencies.service.delete(principal(response), locationId, input, requestContext),
        requestContext.requestId
      ));
    } catch (error) { sendError(request, response, error); }
  });

  return router;
}
