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
import type { TeamPhotos } from './team-photos.js';
import type { TeamCategories } from './team-categories.js';

export const CMS_ADMIN_ROUTE_DEFINITIONS = [
  { method: 'GET', path: '/api/v1/admin/content/:namespace', operationId: 'getAdminCmsContent' },
  { method: 'PUT', path: '/api/v1/admin/content/:namespace', operationId: 'putAdminCmsContent' },
  { method: 'DELETE', path: '/api/v1/admin/content/team', operationId: 'deleteAdminCmsTeamMember' },
  { method: 'POST', path: '/api/v1/admin/content/team/photos', operationId: 'uploadAdminTeamPhoto' },
  { method: 'GET', path: '/api/v1/admin/content/team/photos/:assetId', operationId: 'previewAdminTeamPhoto' },
  { method: 'GET', path: '/api/v1/public/team-photos/:assetId', operationId: 'downloadPublicTeamPhoto' },
  { method: 'GET', path: '/api/v1/admin/content/team/categories', operationId: 'listAdminTeamCategories' },
  { method: 'PUT', path: '/api/v1/admin/content/team/categories', operationId: 'saveAdminTeamCategory' }
] as const;

export interface CmsAdminContentRouterDependencies {
  service: CmsAdminContentService;
  accessTokens: AccessTokenService;
  photos?: TeamPhotos;
  categories?: TeamCategories;
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

  if (dependencies.categories) {
    const categories = dependencies.categories;
    router.get('/admin/content/team/categories', async (request, response) => {
      try { response.json(toSuccessResponse(await categories.adminList(response.locals.adminRbacClaims as AccessTokenClaims), requestId(request))); }
      catch (error) { sendError(request, response, error); }
    });
    router.put('/admin/content/team/categories', async (request, response) => {
      try { response.json(toSuccessResponse(await categories.put(response.locals.adminRbacClaims as AccessTokenClaims, request.body ?? {}, context(request)), requestId(request))); }
      catch (error) { sendError(request, response, error); }
    });
  }

  if (dependencies.photos) {
    const photos = dependencies.photos;
    router.post('/admin/content/team/photos', async (request, response) => {
      try {
        const photo = await photos.upload(response.locals.adminRbacClaims as AccessTokenClaims, request, request.get('content-type') ?? '', context(request));
        response.status(201).json(toSuccessResponse(photo, requestId(request)));
      } catch (error) { sendError(request, response, error); }
    });
    for (const path of ['/admin/content/team/photos/:assetId', '/public/team-photos/:assetId']) {
      router.get(path, async (request, response) => {
        try {
          const photo = await photos.open(String(request.params.assetId), path.startsWith('/admin/') ? response.locals.adminRbacClaims as AccessTokenClaims : undefined);
          response.setHeader('Cache-Control', 'no-store');
          response.setHeader('Content-Type', photo.mime);
          response.setHeader('X-Content-Type-Options', 'nosniff');
          photo.stream.on('error', () => response.destroy());
          photo.stream.pipe(response);
        } catch (error) { sendError(request, response, error); }
      });
    }
  }

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

  router.delete('/admin/content/team', async (request, response) => {
    try {
      response.status(200).json(toSuccessResponse(
        await dependencies.service.deleteTeam(principal(response), request.body ?? {}, context(request)),
        requestId(request)
      ));
    } catch (error) { sendError(request, response, error); }
  });

  return router;
}
