import { Router, type Request, type Response } from 'express';
import {
  commissionAccountReadQuerySchema,
  type RbacPermission
} from '@sadat-real-estate/contracts';
import type { AccessTokenClaims, AccessTokenService } from '../auth/crypto.js';
import { ApiContractError, toApiErrorResponse } from '../contracts/error-boundary.js';
import { toSuccessResponse } from '../contracts/response.js';
import { getRequestContext } from '../observability/context.js';
import { createAdminRbacAuthMiddleware } from '../rbac/auth.js';
import type { RbacService } from '../rbac/service.js';
import { CommissionAccountServiceError, type CommissionAccountService } from './account-service.js';

export const ADMIN_COMMISSION_ACCOUNT_ROUTE_DEFINITIONS = [
  { method: 'GET', path: '/api/v1/admin/account-commissions/:accountId', operationId: 'getAdminAccountCommission' },
  { method: 'PUT', path: '/api/v1/admin/account-commissions/:accountId', operationId: 'setAdminAccountCommission' }
] as const;

export interface CommissionAccountRouterDependencies {
  service: CommissionAccountService;
  accessTokens: AccessTokenService;
  authorization: Pick<RbacService, 'authorize'>;
}

const ERROR_MAP = Object.freeze({
  COMMISSION_FORBIDDEN: { statusCode: 403, messageKey: 'errors.forbidden' },
  COMMISSION_ACCOUNT_NOT_FOUND: { statusCode: 404, messageKey: 'errors.notFound' },
  COMMISSION_ACCOUNT_DUPLICATE: { statusCode: 409, messageKey: 'errors.conflict' },
  COMMISSION_ACCOUNT_VERSION_CONFLICT: { statusCode: 409, messageKey: 'errors.conflict' },
  COMMISSION_ACCOUNT_INVALID_STATE: { statusCode: 409, messageKey: 'errors.conflict' },
  COMMISSION_ACCOUNT_OVERLAP: { statusCode: 409, messageKey: 'errors.conflict' }
});

function requestId(request: Request): string {
  return getRequestContext()?.requestId ?? request.get('x-request-id') ?? 'unknown-request';
}

function claims(response: Response): AccessTokenClaims {
  return response.locals.adminRbacClaims as AccessTokenClaims;
}

function sendError(request: Request, response: Response, error: unknown): void {
  const accountError = error instanceof CommissionAccountServiceError ? error : undefined;
  const definition = accountError ? ERROR_MAP[accountError.code] : undefined;
  const mapped = toApiErrorResponse(
    definition && accountError
      ? new ApiContractError(accountError.code, definition.messageKey, definition.statusCode)
      : error,
    requestId(request)
  );
  response.status(mapped.statusCode).json(mapped.body);
}

async function requirePermission(
  dependencies: CommissionAccountRouterDependencies,
  response: Response,
  permission: RbacPermission
): Promise<void> {
  if (!await dependencies.authorization.authorize(claims(response).sub, permission)) {
    throw new CommissionAccountServiceError('COMMISSION_FORBIDDEN');
  }
}

function accountId(value: string): string {
  if (!/^[a-f0-9]{24}$/.test(value)) throw new CommissionAccountServiceError('COMMISSION_ACCOUNT_NOT_FOUND');
  return value;
}

export function createCommissionAccountRouter(
  dependencies: CommissionAccountRouterDependencies
): Router {
  const router = Router();
  router.use((_request, response, next) => {
    response.setHeader('Cache-Control', 'no-store');
    next();
  });
  router.use(
    '/admin/account-commissions',
    createAdminRbacAuthMiddleware(dependencies.accessTokens)
  );

  router.get('/admin/account-commissions/:accountId', async (request, response) => {
    try {
      await requirePermission(dependencies, response, 'admin:commissions.view');
      const query = commissionAccountReadQuerySchema.parse(request.query);
      const data = await dependencies.service.getAccountCommission(
        claims(response),
        accountId(request.params.accountId),
        query.at ? new Date(query.at) : undefined
      );
      response.status(200).json(toSuccessResponse(data, requestId(request)));
    } catch (error) {
      sendError(request, response, error);
    }
  });

  router.put('/admin/account-commissions/:accountId', async (request, response) => {
    try {
      await requirePermission(dependencies, response, 'admin:commissions.manage');
      const data = await dependencies.service.createOverride(
        claims(response),
        accountId(request.params.accountId),
        request.body ?? {}
      );
      response.status(201).json(toSuccessResponse(data, requestId(request)));
    } catch (error) {
      sendError(request, response, error);
    }
  });

  return router;
}
