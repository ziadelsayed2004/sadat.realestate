import { Router, type Request, type Response } from 'express';
import {
  cmsAdminContentNamespaceSchema,
  type CmsAdminContentNamespace
} from '@sadat-real-estate/contracts';
import type { AccessTokenClaims, AccessTokenService } from '../auth/crypto.js';
import { ApiContractError, toApiErrorResponse } from '../contracts/error-boundary.js';
import { toSuccessResponse } from '../contracts/response.js';
import { getRequestContext } from '../observability/context.js';
import { createAdminRbacAuthMiddleware } from '../rbac/auth.js';
import { CmsAdminContentServiceError, type CmsAdminContentService } from './admin-content-service.js';

export const CMS_ADMIN_ROUTE_DEFINITIONS = [
  { method: 'GET', path: '/api/v1/admin/content/:namespace', operationId: 'getAdminCmsContent' },
  { method: 'PUT', path: '/api/v1/admin/content/:namespace', operationId: 'putAdminCmsContent' }
] as const;

export interface CmsAdminContentRouterDependencies {
  service: CmsAdminContentService;
  accessTokens: AccessTokenService;
}

const ERROR_MAP: Record<string, { statusCode: number; messageKey: string }> = {
  CMS_CONTENT_FORBIDDEN: { statusCode: 403, messageKey: 'errors.forbidden' },
  CMS_CONTENT_PUBLISH_FORBIDDEN: { statusCode: 403, messageKey: 'errors.forbidden' },
  CMS_CONTENT_NOT_FOUND: { statusCode: 404, messageKey: 'errors.cmsContent.notFound' },
  CMS_CONTENT_KEY_EXISTS: { statusCode: 409, messageKey: 'errors.cmsContent.keyExists' },
  CMS_CONTENT_VERSION_CONFLICT: { statusCode: 409, messageKey: 'errors.cmsContent.versionConflict' }
};

function requestId(request: Request): string {
  return getRequestContext()?.requestId ?? request.get('x-request-id') ?? 'unknown-request';
}

function context(request: Request): { requestId: string; traceId: string } {
  const current = getRequestContext();
  return { requestId: requestId(request), traceId: current?.traceId ?? 'f'.repeat(32) };
}

function principal(response: Response): { userId: string } {
  return { userId: (response.locals.adminRbacClaims as AccessTokenClaims).sub };
}

function namespace(request: Request): CmsAdminContentNamespace {
  return cmsAdminContentNamespaceSchema.parse(request.params.namespace);
}

function sendError(request: Request, response: Response, error: unknown): void {
  const cmsError = error instanceof CmsAdminContentServiceError ? error : undefined;
  const definition = cmsError ? ERROR_MAP[cmsError.code] : undefined;
  const mapped = toApiErrorResponse(
    definition && cmsError
      ? new ApiContractError(cmsError.code, definition.messageKey, definition.statusCode)
      : error,
    requestId(request)
  );
  response.status(mapped.statusCode).json(mapped.body);
}

export function createCmsAdminContentRouter(dependencies: CmsAdminContentRouterDependencies): Router {
  const router = Router();
  router.use('/admin/content', (_request, response, next) => {
    response.setHeader('Cache-Control', 'no-store');
    next();
  });
  router.use('/admin/content', createAdminRbacAuthMiddleware(dependencies.accessTokens));

  router.get('/admin/content/:namespace', async (request, response) => {
    try {
      response.status(200).json(toSuccessResponse(
        await dependencies.service.get(principal(response), namespace(request)),
        requestId(request)
      ));
    } catch (error) {
      sendError(request, response, error);
    }
  });

  router.put('/admin/content/:namespace', async (request, response) => {
    try {
      response.status(200).json(toSuccessResponse(
        await dependencies.service.put(principal(response), namespace(request), request.body ?? {}, context(request)),
        requestId(request)
      ));
    } catch (error) {
      sendError(request, response, error);
    }
  });

  return router;
}
