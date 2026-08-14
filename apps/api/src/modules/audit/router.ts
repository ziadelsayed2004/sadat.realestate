import { Router, type Request, type Response } from 'express';
import {
  auditLogIdParamsSchema,
  auditLogListQuerySchema
} from '@sadat-real-estate/contracts';
import type { AccessTokenClaims, AccessTokenService } from '../auth/crypto.js';
import { ApiContractError, toApiErrorResponse } from '../contracts/error-boundary.js';
import { toSuccessResponse } from '../contracts/response.js';
import { getRequestContext } from '../observability/context.js';
import { createAdminRbacAuthMiddleware } from '../rbac/auth.js';
import { AuditServiceError, type AuditService } from './service.js';

export const AUDIT_ROUTE_DEFINITIONS = [
  { method: 'GET', path: '/api/v1/admin/audit-logs', operationId: 'listAuditLogs' },
  { method: 'GET', path: '/api/v1/admin/audit-logs/:auditId', operationId: 'getAuditLog' }
] as const;

export interface AuditRouterDependencies {
  service: AuditService;
  accessTokens: AccessTokenService;
}

const AUDIT_ERROR_MAP = Object.freeze({
  AUDIT_FORBIDDEN: { statusCode: 403, messageKey: 'errors.audit.forbidden' },
  AUDIT_LOG_NOT_FOUND: { statusCode: 404, messageKey: 'errors.audit.notFound' }
});

function requestId(request: Request): string {
  return getRequestContext()?.requestId ?? request.get('x-request-id') ?? 'unknown-request';
}

function sendError(request: Request, response: Response, error: unknown): void {
  const auditError = error instanceof AuditServiceError ? error : undefined;
  const definition = auditError ? AUDIT_ERROR_MAP[auditError.code] : undefined;
  const mapped = toApiErrorResponse(
    definition
      ? new ApiContractError(auditError!.code, definition.messageKey, definition.statusCode)
      : error,
    requestId(request)
  );
  response.status(mapped.statusCode).json(mapped.body);
}

function principal(response: Response): { userId: string } {
  const claims = response.locals.adminRbacClaims as AccessTokenClaims;
  return { userId: claims.sub };
}

export function createAuditRouter(dependencies: AuditRouterDependencies): Router {
  const router = Router();
  router.use((_request, response, next) => {
    response.setHeader('Cache-Control', 'no-store');
    next();
  });
  router.use('/admin/audit-logs', createAdminRbacAuthMiddleware(dependencies.accessTokens));

  router.get('/admin/audit-logs', async (request, response) => {
    try {
      const query = auditLogListQuerySchema.parse(request.query);
      const result = await dependencies.service.list(principal(response), query);
      response.status(200).json(toSuccessResponse(result.data, requestId(request), {
        page: result.page,
        limit: result.limit,
        total: result.total
      }));
    } catch (error) {
      sendError(request, response, error);
    }
  });

  router.get('/admin/audit-logs/:auditId', async (request, response) => {
    try {
      const { auditId } = auditLogIdParamsSchema.parse(request.params);
      response.status(200).json(toSuccessResponse(
        await dependencies.service.findById(principal(response), auditId),
        requestId(request)
      ));
    } catch (error) {
      sendError(request, response, error);
    }
  });

  return router;
}
