import { Router, type Request, type Response } from 'express';
import {
  commissionExceptionListQuerySchema,
  type RbacPermission
} from '@sadat-real-estate/contracts';
import type { AccessTokenClaims, AccessTokenService } from '../auth/crypto.js';
import { ApiContractError, toApiErrorResponse } from '../contracts/error-boundary.js';
import { toSuccessResponse } from '../contracts/response.js';
import { getRequestContext } from '../observability/context.js';
import { createAdminRbacAuthMiddleware } from '../rbac/auth.js';
import type { RbacService } from '../rbac/service.js';
import { CommissionExceptionServiceError, type CommissionExceptionService } from './exception-service.js';

export const ADMIN_COMMISSION_EXCEPTION_ROUTE_DEFINITIONS = [
  { method: 'GET', path: '/api/v1/admin/commission-exceptions', operationId: 'listAdminCommissionExceptions' },
  { method: 'POST', path: '/api/v1/admin/commission-exceptions', operationId: 'createAdminCommissionException' }
] as const;

export interface CommissionExceptionRouterDependencies {
  service: CommissionExceptionService;
  accessTokens: AccessTokenService;
  authorization: Pick<RbacService, 'authorize'>;
}

const ERROR_MAP = Object.freeze({
  COMMISSION_EXCEPTION_FORBIDDEN: { statusCode: 403, messageKey: 'errors.forbidden' },
  COMMISSION_EXCEPTION_NOT_FOUND: { statusCode: 404, messageKey: 'errors.notFound' },
  COMMISSION_EXCEPTION_DUPLICATE: { statusCode: 409, messageKey: 'errors.conflict' },
  COMMISSION_EXCEPTION_VERSION_CONFLICT: { statusCode: 409, messageKey: 'errors.conflict' },
  COMMISSION_EXCEPTION_INVALID_STATE: { statusCode: 409, messageKey: 'errors.conflict' },
  COMMISSION_EXCEPTION_OVERLAP: { statusCode: 409, messageKey: 'errors.conflict' }
});

function requestId(request: Request): string {
  return getRequestContext()?.requestId ?? request.get('x-request-id') ?? 'unknown-request';
}

function claims(response: Response): AccessTokenClaims {
  return response.locals.adminRbacClaims as AccessTokenClaims;
}

function sendError(request: Request, response: Response, error: unknown): void {
  const exceptionError = error instanceof CommissionExceptionServiceError ? error : undefined;
  const definition = exceptionError ? ERROR_MAP[exceptionError.code] : undefined;
  const mapped = toApiErrorResponse(
    definition && exceptionError
      ? new ApiContractError(exceptionError.code, definition.messageKey, definition.statusCode)
      : error,
    requestId(request)
  );
  response.status(mapped.statusCode).json(mapped.body);
}

async function requirePermission(
  dependencies: CommissionExceptionRouterDependencies,
  response: Response,
  permission: RbacPermission
): Promise<void> {
  if (!await dependencies.authorization.authorize(claims(response).sub, permission)) {
    throw new CommissionExceptionServiceError('COMMISSION_EXCEPTION_FORBIDDEN');
  }
}

export function createCommissionExceptionRouter(
  dependencies: CommissionExceptionRouterDependencies
): Router {
  const router = Router();
  router.use((_request, response, next) => {
    response.setHeader('Cache-Control', 'no-store');
    next();
  });
  router.use(
    '/admin/commission-exceptions',
    createAdminRbacAuthMiddleware(dependencies.accessTokens)
  );

  router.get('/admin/commission-exceptions', async (request, response) => {
    try {
      await requirePermission(dependencies, response, 'admin:commissions.view');
      const query = commissionExceptionListQuerySchema.parse(request.query);
      const data = await dependencies.service.listExceptions(claims(response), query);
      response.status(200).json(toSuccessResponse(data, requestId(request), {
        page: data.page,
        limit: data.limit,
        total: data.total
      }));
    } catch (error) {
      sendError(request, response, error);
    }
  });

  router.post('/admin/commission-exceptions', async (request, response) => {
    try {
      await requirePermission(dependencies, response, 'admin:commissions.manage');
      const data = await dependencies.service.createException(claims(response), request.body ?? {});
      response.status(201).json(toSuccessResponse(data, requestId(request)));
    } catch (error) {
      sendError(request, response, error);
    }
  });

  return router;
}
