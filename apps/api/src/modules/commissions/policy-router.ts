import { Router, type Request, type Response } from 'express';
import {
  commissionPolicyListQuerySchema,
  type RbacPermission
} from '@sadat-real-estate/contracts';
import type { AccessTokenClaims, AccessTokenService } from '../auth/crypto.js';
import { ApiContractError, toApiErrorResponse } from '../contracts/error-boundary.js';
import { toSuccessResponse } from '../contracts/response.js';
import { getRequestContext } from '../observability/context.js';
import { createAdminRbacAuthMiddleware } from '../rbac/auth.js';
import type { RbacService } from '../rbac/service.js';
import { CommissionPolicyServiceError, type CommissionPolicyService } from './policy-service.js';

export const ADMIN_COMMISSION_POLICY_ROUTE_DEFINITIONS = [
  { method: 'GET', path: '/api/v1/admin/commission-policies', operationId: 'listAdminCommissionPolicies' },
  { method: 'POST', path: '/api/v1/admin/commission-policies', operationId: 'createAdminCommissionPolicy' }
] as const;

export interface CommissionPolicyRouterDependencies {
  service: CommissionPolicyService;
  accessTokens: AccessTokenService;
  authorization: Pick<RbacService, 'authorize'>;
}

const ERROR_MAP = Object.freeze({
  COMMISSION_FORBIDDEN: { statusCode: 403, messageKey: 'errors.forbidden' },
  COMMISSION_NOT_FOUND: { statusCode: 404, messageKey: 'errors.notFound' },
  COMMISSION_DUPLICATE: { statusCode: 409, messageKey: 'errors.conflict' },
  COMMISSION_VERSION_CONFLICT: { statusCode: 409, messageKey: 'errors.conflict' },
  COMMISSION_INVALID_STATE: { statusCode: 409, messageKey: 'errors.conflict' },
  COMMISSION_OVERLAP: { statusCode: 409, messageKey: 'errors.conflict' }
});

function requestId(request: Request): string {
  return getRequestContext()?.requestId ?? request.get('x-request-id') ?? 'unknown-request';
}

function claims(response: Response): AccessTokenClaims {
  return response.locals.adminRbacClaims as AccessTokenClaims;
}

function sendError(request: Request, response: Response, error: unknown): void {
  const commissionError = error instanceof CommissionPolicyServiceError ? error : undefined;
  const definition = commissionError ? ERROR_MAP[commissionError.code] : undefined;
  const mapped = toApiErrorResponse(
    definition && commissionError
      ? new ApiContractError(commissionError.code, definition.messageKey, definition.statusCode)
      : error,
    requestId(request)
  );
  response.status(mapped.statusCode).json(mapped.body);
}

async function requirePermission(
  dependencies: CommissionPolicyRouterDependencies,
  response: Response,
  permission: RbacPermission
): Promise<void> {
  if (!await dependencies.authorization.authorize(claims(response).sub, permission)) {
    throw new CommissionPolicyServiceError('COMMISSION_FORBIDDEN');
  }
}

export function createCommissionPolicyRouter(
  dependencies: CommissionPolicyRouterDependencies
): Router {
  const router = Router();
  router.use((_request, response, next) => {
    response.setHeader('Cache-Control', 'no-store');
    next();
  });
  router.use(
    '/admin/commission-policies',
    createAdminRbacAuthMiddleware(dependencies.accessTokens)
  );

  router.get('/admin/commission-policies', async (request, response) => {
    try {
      await requirePermission(dependencies, response, 'admin:commissions.view');
      const query = commissionPolicyListQuerySchema.parse(request.query);
      const data = await dependencies.service.listPolicies(claims(response), query);
      response.status(200).json(toSuccessResponse(data, requestId(request), {
        page: data.page,
        limit: data.limit,
        total: data.total
      }));
    } catch (error) {
      sendError(request, response, error);
    }
  });

  router.post('/admin/commission-policies', async (request, response) => {
    try {
      await requirePermission(dependencies, response, 'admin:commissions.manage');
      const data = await dependencies.service.createPolicy(claims(response), request.body ?? {});
      response.status(201).json(toSuccessResponse(data, requestId(request)));
    } catch (error) {
      sendError(request, response, error);
    }
  });

  return router;
}
