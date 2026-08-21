import { Router, type Request, type Response } from 'express';
import type { RbacPermission } from '@sadat-real-estate/contracts';
import type { AccessTokenClaims, AccessTokenService } from '../auth/crypto.js';
import { ApiContractError, toApiErrorResponse } from '../contracts/error-boundary.js';
import { toSuccessResponse } from '../contracts/response.js';
import { getRequestContext } from '../observability/context.js';
import { createAdminRbacAuthMiddleware } from '../rbac/auth.js';
import type { RbacService } from '../rbac/service.js';
import { CommissionChangeLogServiceError, type CommissionChangeLogService } from './change-log-service.js';

export const ADMIN_COMMISSION_CHANGE_LOG_ROUTE_DEFINITIONS = [
  { method: 'GET', path: '/api/v1/admin/commission-change-log', operationId: 'listAdminCommissionChangeLog' }
] as const;

export interface CommissionChangeLogRouterDependencies {
  service: CommissionChangeLogService;
  accessTokens: AccessTokenService;
  authorization: Pick<RbacService, 'authorize'>;
}

const ERROR_MAP = Object.freeze({
  COMMISSION_CHANGE_LOG_FORBIDDEN: { statusCode: 403, messageKey: 'errors.forbidden' },
  COMMISSION_CHANGE_LOG_NOT_FOUND: { statusCode: 404, messageKey: 'errors.notFound' },
  COMMISSION_CHANGE_LOG_INVALID_SOURCE: { statusCode: 500, messageKey: 'errors.internal' }
});

function requestId(request: Request): string {
  return getRequestContext()?.requestId ?? request.get('x-request-id') ?? 'unknown-request';
}

function claims(response: Response): AccessTokenClaims {
  return response.locals.adminRbacClaims as AccessTokenClaims;
}

function sendError(request: Request, response: Response, error: unknown): void {
  const changeLogError = error instanceof CommissionChangeLogServiceError ? error : undefined;
  const definition = changeLogError ? ERROR_MAP[changeLogError.code] : undefined;
  const mapped = toApiErrorResponse(
    definition && changeLogError
      ? new ApiContractError(changeLogError.code, definition.messageKey, definition.statusCode)
      : error,
    requestId(request)
  );
  response.status(mapped.statusCode).json(mapped.body);
}

async function requirePermission(
  dependencies: CommissionChangeLogRouterDependencies,
  response: Response,
  permission: RbacPermission
): Promise<void> {
  if (!await dependencies.authorization.authorize(claims(response).sub, permission)) {
    throw new CommissionChangeLogServiceError('COMMISSION_CHANGE_LOG_FORBIDDEN');
  }
}

export function createCommissionChangeLogRouter(
  dependencies: CommissionChangeLogRouterDependencies
): Router {
  const router = Router();
  router.use((_request, response, next) => {
    response.setHeader('Cache-Control', 'no-store');
    next();
  });
  router.use(
    '/admin/commission-change-log',
    createAdminRbacAuthMiddleware(dependencies.accessTokens)
  );

  router.get('/admin/commission-change-log', async (request, response) => {
    try {
      await requirePermission(dependencies, response, 'admin:commissions.view');
      const data = await dependencies.service.list(claims(response), request.query);
      response.status(200).json(toSuccessResponse(data, requestId(request), {
        page: data.page,
        limit: data.limit,
        total: data.total
      }));
    } catch (error) {
      sendError(request, response, error);
    }
  });

  return router;
}
