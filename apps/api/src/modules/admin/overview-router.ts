import { Router, type Request, type Response } from 'express';
import { adminOverviewQuerySchema } from '@sadat-real-estate/contracts';
import type { AccessTokenClaims, AccessTokenService } from '../auth/crypto.js';
import { ApiContractError, toApiErrorResponse } from '../contracts/error-boundary.js';
import { toSuccessResponse } from '../contracts/response.js';
import { getRequestContext } from '../observability/context.js';
import { createAdminRbacAuthMiddleware } from '../rbac/auth.js';
import { AdminOverviewServiceError, type AdminOverviewService } from './overview-service.js';

export const ADMIN_OVERVIEW_ROUTE_DEFINITIONS = [
  { method: 'GET', path: '/api/v1/admin/overview', operationId: 'getAdminOverview' }
] as const;

export interface AdminOverviewRouterDependencies {
  service: AdminOverviewService;
  accessTokens: AccessTokenService;
}

const ADMIN_OVERVIEW_ERROR_MAP = Object.freeze({
  ADMIN_OVERVIEW_FORBIDDEN: { statusCode: 403, messageKey: 'errors.forbidden' },
  ADMIN_OVERVIEW_SOURCE_INVALID: { statusCode: 503, messageKey: 'errors.adminOverview.unavailable' }
});

function requestId(request: Request): string {
  return getRequestContext()?.requestId ?? request.get('x-request-id') ?? 'unknown-request';
}

function claims(response: Response): AccessTokenClaims {
  return response.locals.adminRbacClaims as AccessTokenClaims;
}

function sendError(request: Request, response: Response, error: unknown): void {
  const overviewError = error instanceof AdminOverviewServiceError ? error : undefined;
  const definition = overviewError ? ADMIN_OVERVIEW_ERROR_MAP[overviewError.code] : undefined;
  const mapped = toApiErrorResponse(
    definition && overviewError
      ? new ApiContractError(overviewError.code, definition.messageKey, definition.statusCode)
      : error,
    requestId(request)
  );
  response.status(mapped.statusCode).json(mapped.body);
}

export function createAdminOverviewRouter(
  dependencies: AdminOverviewRouterDependencies
): Router {
  const router = Router();
  router.use((_request, response, next) => {
    response.setHeader('Cache-Control', 'no-store');
    next();
  });
  router.use('/admin/overview', createAdminRbacAuthMiddleware(dependencies.accessTokens));

  router.get('/admin/overview', async (request, response) => {
    try {
      const query = adminOverviewQuerySchema.parse(request.query);
      const result = await dependencies.service.get(claims(response), query);
      response.status(200).json(toSuccessResponse(result, requestId(request)));
    } catch (error) {
      sendError(request, response, error);
    }
  });

  return router;
}
