import { Router, type Request, type Response } from 'express';
import {
  rbacRoleCreateRequestSchema,
  rbacRoleIdParamsSchema,
  rbacRolePatchRequestSchema
} from '@sadat-real-estate/contracts';
import type { AccessTokenClaims, AccessTokenService } from '../auth/crypto.js';
import { ApiContractError, toApiErrorResponse } from '../contracts/error-boundary.js';
import { toSuccessResponse } from '../contracts/response.js';
import { getRequestContext } from '../observability/context.js';
import { createAdminRbacAuthMiddleware } from './auth.js';
import { RbacServiceError, type RbacService } from './service.js';

export const RBAC_ROUTE_DEFINITIONS = [
  { method: 'GET', path: '/api/v1/admin/roles', operationId: 'listAdminRoles' },
  { method: 'POST', path: '/api/v1/admin/roles', operationId: 'createAdminRole' },
  { method: 'PATCH', path: '/api/v1/admin/roles/:roleId', operationId: 'updateAdminRole' }
] as const;

export interface RbacRouterDependencies {
  service: RbacService;
  accessTokens: AccessTokenService;
}

const RBAC_ERROR_MAP = Object.freeze({
  RBAC_FORBIDDEN: { statusCode: 403, messageKey: 'errors.rbac.forbidden' },
  RBAC_ROLE_NOT_FOUND: { statusCode: 404, messageKey: 'errors.rbac.roleNotFound' },
  RBAC_ROLE_NAME_EXISTS: { statusCode: 409, messageKey: 'errors.rbac.roleNameExists' },
  RBAC_ROLE_VERSION_CONFLICT: { statusCode: 409, messageKey: 'errors.rbac.versionConflict' },
  RBAC_VIEW_ONLY_PERMISSION_INVALID: {
    statusCode: 400,
    messageKey: 'errors.rbac.viewOnlyPermissionInvalid'
  },
  RBAC_ASSIGNMENT_TARGET_NOT_ADMIN: {
    statusCode: 404,
    messageKey: 'errors.rbac.assignmentTargetNotAdmin'
  },
  RBAC_ASSIGNMENT_ROLE_INVALID: {
    statusCode: 409,
    messageKey: 'errors.rbac.assignmentRoleInvalid'
  },
  RBAC_ASSIGNMENT_VERSION_CONFLICT: {
    statusCode: 409,
    messageKey: 'errors.rbac.assignmentVersionConflict'
  }
});

function requestId(request: Request): string {
  return getRequestContext()?.requestId ?? request.get('x-request-id') ?? 'unknown-request';
}

function sendError(request: Request, response: Response, error: unknown): void {
  const rbacError = error instanceof RbacServiceError ? error : undefined;
  const definition = rbacError ? RBAC_ERROR_MAP[rbacError.code] : undefined;
  const mapped = toApiErrorResponse(
    definition
      ? new ApiContractError(rbacError!.code, definition.messageKey, definition.statusCode)
      : error,
    requestId(request)
  );
  response.status(mapped.statusCode).json(mapped.body);
}

function principal(response: Response): { userId: string } {
  const claims = response.locals.adminRbacClaims as AccessTokenClaims;
  return { userId: claims.sub };
}

function mutationContext(request: Request): { requestId: string; traceId: string } {
  const context = getRequestContext();
  return {
    requestId: context?.requestId ?? request.get('x-request-id') ?? 'unknown-request',
    traceId: context?.traceId ?? 'f'.repeat(32)
  };
}

export function createRbacRouter(dependencies: RbacRouterDependencies): Router {
  const router = Router();
  router.use((_request, response, next) => {
    response.setHeader('Cache-Control', 'no-store');
    next();
  });
  router.use('/admin/roles', createAdminRbacAuthMiddleware(dependencies.accessTokens));

  router.get('/admin/roles', async (request, response) => {
    try {
      response.status(200).json(toSuccessResponse(
        await dependencies.service.listRoles(principal(response)),
        requestId(request)
      ));
    } catch (error) {
      sendError(request, response, error);
    }
  });

  router.post('/admin/roles', async (request, response) => {
    try {
      const input = rbacRoleCreateRequestSchema.parse(request.body ?? {});
      response.status(201).json(toSuccessResponse(
        await dependencies.service.createRole(principal(response), input, mutationContext(request)),
        requestId(request)
      ));
    } catch (error) {
      sendError(request, response, error);
    }
  });

  router.patch('/admin/roles/:roleId', async (request, response) => {
    try {
      const { roleId } = rbacRoleIdParamsSchema.parse(request.params);
      const input = rbacRolePatchRequestSchema.parse(request.body ?? {});
      response.status(200).json(toSuccessResponse(
        await dependencies.service.updateRole(
          principal(response),
          roleId,
          input,
          mutationContext(request)
        ),
        requestId(request)
      ));
    } catch (error) {
      sendError(request, response, error);
    }
  });

  return router;
}
