import { Router, type Request, type Response } from 'express';
import {
  commissionConfirmationListQuerySchema,
  type RbacPermission
} from '@sadat-real-estate/contracts';
import type { AccessTokenClaims, AccessTokenService } from '../auth/crypto.js';
import { ApiContractError, toApiErrorResponse } from '../contracts/error-boundary.js';
import { toSuccessResponse } from '../contracts/response.js';
import { getRequestContext } from '../observability/context.js';
import { createAdminRbacAuthMiddleware } from '../rbac/auth.js';
import type { RbacService } from '../rbac/service.js';
import { CommissionConfirmationServiceError, type CommissionConfirmationService } from './confirmation-service.js';

export const ADMIN_COMMISSION_CONFIRMATION_ROUTE_DEFINITIONS = [
  { method: 'GET', path: '/api/v1/admin/commission-confirmations', operationId: 'listAdminCommissionConfirmations' }
] as const;

export interface CommissionConfirmationRouterDependencies {
  service: CommissionConfirmationService;
  accessTokens: AccessTokenService;
  authorization: Pick<RbacService, 'authorize'>;
}

const ERROR_MAP = Object.freeze({
  COMMISSION_CONFIRMATION_FORBIDDEN: { statusCode: 403, messageKey: 'errors.forbidden' },
  COMMISSION_CONFIRMATION_NOT_FOUND: { statusCode: 404, messageKey: 'errors.notFound' },
  COMMISSION_CONFIRMATION_DUPLICATE: { statusCode: 409, messageKey: 'errors.conflict' },
  COMMISSION_CONFIRMATION_VERSION_CONFLICT: { statusCode: 409, messageKey: 'errors.conflict' },
  COMMISSION_CONFIRMATION_INVALID_STATE: { statusCode: 409, messageKey: 'errors.conflict' },
  COMMISSION_CONFIRMATION_CONFLICT: { statusCode: 409, messageKey: 'errors.conflict' }
});

function requestId(request: Request): string {
  return getRequestContext()?.requestId ?? request.get('x-request-id') ?? 'unknown-request';
}

function claims(response: Response): AccessTokenClaims {
  return response.locals.adminRbacClaims as AccessTokenClaims;
}

function sendError(request: Request, response: Response, error: unknown): void {
  const confirmationError = error instanceof CommissionConfirmationServiceError ? error : undefined;
  const definition = confirmationError ? ERROR_MAP[confirmationError.code] : undefined;
  const mapped = toApiErrorResponse(
    definition && confirmationError
      ? new ApiContractError(confirmationError.code, definition.messageKey, definition.statusCode)
      : error,
    requestId(request)
  );
  response.status(mapped.statusCode).json(mapped.body);
}

async function requirePermission(
  dependencies: CommissionConfirmationRouterDependencies,
  response: Response,
  permission: RbacPermission
): Promise<void> {
  if (!await dependencies.authorization.authorize(claims(response).sub, permission)) {
    throw new CommissionConfirmationServiceError('COMMISSION_CONFIRMATION_FORBIDDEN');
  }
}

export function createCommissionConfirmationRouter(
  dependencies: CommissionConfirmationRouterDependencies
): Router {
  const router = Router();
  router.use((_request, response, next) => {
    response.setHeader('Cache-Control', 'no-store');
    next();
  });
  router.use(
    '/admin/commission-confirmations',
    createAdminRbacAuthMiddleware(dependencies.accessTokens)
  );

  router.get('/admin/commission-confirmations', async (request, response) => {
    try {
      await requirePermission(dependencies, response, 'admin:commissions.view');
      const query = commissionConfirmationListQuerySchema.parse(request.query);
      const data = await dependencies.service.listConfirmations(claims(response), query);
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
