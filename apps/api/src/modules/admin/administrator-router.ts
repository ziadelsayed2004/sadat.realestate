import { Router, type Request, type Response } from 'express';
import { adminUserIdParamsSchema } from '@sadat-real-estate/contracts';
import type { AccessTokenClaims, AccessTokenService } from '../auth/crypto.js';
import { ApiContractError, toApiErrorResponse } from '../contracts/error-boundary.js';
import { toSuccessResponse } from '../contracts/response.js';
import { getRequestContext } from '../observability/context.js';
import { createAdminRbacAuthMiddleware } from '../rbac/auth.js';
import {
  AdministratorServiceError,
  type AdministratorMutationContext,
  type AdministratorService
} from './administrator-service.js';

export const ADMINISTRATOR_ROUTE_DEFINITIONS = [
  { method: 'GET', path: '/api/v1/admin/admin-users', operationId: 'listAdminAdministrators' },
  { method: 'GET', path: '/api/v1/admin/admin-users/:adminId', operationId: 'getAdminAdministrator' },
  { method: 'POST', path: '/api/v1/admin/admin-users', operationId: 'createAdminAdministrator' },
  { method: 'PATCH', path: '/api/v1/admin/admin-users/:adminId', operationId: 'updateAdminAdministrator' }
] as const;

export interface AdministratorRouterDependencies {
  service: AdministratorService;
  accessTokens: AccessTokenService;
}

const ADMINISTRATOR_ERROR_MAP = Object.freeze({
  ADMINISTRATOR_FORBIDDEN: { statusCode: 403, messageKey: 'errors.forbidden' },
  ADMINISTRATOR_NOT_FOUND: { statusCode: 404, messageKey: 'errors.notFound' },
  ADMINISTRATOR_EMAIL_CONFLICT: { statusCode: 409, messageKey: 'errors.conflict' },
  ADMINISTRATOR_VERSION_CONFLICT: { statusCode: 409, messageKey: 'errors.conflict' },
  ADMINISTRATOR_SELF_LOCKOUT: { statusCode: 409, messageKey: 'errors.conflict' },
  ADMINISTRATOR_LAST_SUPER_ADMIN: { statusCode: 409, messageKey: 'errors.conflict' }
});

function requestId(request: Request): string {
  return getRequestContext()?.requestId ?? request.get('x-request-id') ?? 'unknown-request';
}

function claims(response: Response): AccessTokenClaims {
  return response.locals.adminRbacClaims as AccessTokenClaims;
}

function mutationContext(request: Request): AdministratorMutationContext {
  const context = getRequestContext();
  return {
    requestId: context?.requestId ?? request.get('x-request-id') ?? 'unknown-request',
    traceId: context?.traceId ?? '0'.repeat(32)
  };
}

function sendError(request: Request, response: Response, error: unknown): void {
  const administratorError = error instanceof AdministratorServiceError ? error : undefined;
  const definition = administratorError ? ADMINISTRATOR_ERROR_MAP[administratorError.code] : undefined;
  const mapped = toApiErrorResponse(
    definition && administratorError
      ? new ApiContractError(administratorError.code, definition.messageKey, definition.statusCode)
      : error,
    requestId(request)
  );
  response.status(mapped.statusCode).json(mapped.body);
}

export function createAdministratorRouter(
  dependencies: AdministratorRouterDependencies
): Router {
  const router = Router();
  router.use((_request, response, next) => {
    response.setHeader('Cache-Control', 'no-store');
    next();
  });
  router.use('/admin/admin-users', createAdminRbacAuthMiddleware(dependencies.accessTokens));

  router.get('/admin/admin-users', async (request, response) => {
    try {
      const data = await dependencies.service.list(claims(response).sub, request.query);
      response.status(200).json(toSuccessResponse(data, requestId(request), {
        page: data.page,
        limit: data.limit,
        total: data.total
      }));
    } catch (error) {
      sendError(request, response, error);
    }
  });

  router.get('/admin/admin-users/:adminId', async (request, response) => {
    try {
      const { adminId } = adminUserIdParamsSchema.parse(request.params);
      response.status(200).json(toSuccessResponse(
        await dependencies.service.get(claims(response).sub, adminId),
        requestId(request)
      ));
    } catch (error) {
      sendError(request, response, error);
    }
  });

  router.post('/admin/admin-users', async (request, response) => {
    try {
      response.status(201).json(toSuccessResponse(
        await dependencies.service.create(claims(response).sub, request.body ?? {}, mutationContext(request)),
        requestId(request)
      ));
    } catch (error) {
      sendError(request, response, error);
    }
  });

  router.patch('/admin/admin-users/:adminId', async (request, response) => {
    try {
      const { adminId } = adminUserIdParamsSchema.parse(request.params);
      response.status(200).json(toSuccessResponse(
        await dependencies.service.update(claims(response).sub, adminId, request.body ?? {}, mutationContext(request)),
        requestId(request)
      ));
    } catch (error) {
      sendError(request, response, error);
    }
  });

  return router;
}
