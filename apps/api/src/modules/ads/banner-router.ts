import { Router, type Request, type Response } from 'express';
import {
  adBannerIdParamsSchema,
  adBannerListQuerySchema,
  adBannerMediaIdParamsSchema
} from '@sadat-real-estate/contracts';
import type { AccessTokenClaims, AccessTokenService } from '../auth/crypto.js';
import { ApiContractError, toApiErrorResponse } from '../contracts/error-boundary.js';
import { toSuccessResponse } from '../contracts/response.js';
import { getRequestContext } from '../observability/context.js';
import { createAdminRbacAuthMiddleware } from '../rbac/auth.js';
import { AdBannerServiceError, type AdBannerService } from './service.js';

export const ADMIN_BANNER_ROUTE_DEFINITIONS = [
  { method: 'GET', path: '/api/v1/admin/banners', operationId: 'listAdminBanners' },
  { method: 'POST', path: '/api/v1/admin/banners', operationId: 'createAdminBanner' },
  { method: 'PATCH', path: '/api/v1/admin/banners/:bannerId', operationId: 'updateAdminBanner' },
  { method: 'GET', path: '/api/v1/admin/banners/:bannerId/preview', operationId: 'previewAdminBanner' },
  { method: 'GET', path: '/api/v1/admin/banners/:bannerId/media', operationId: 'listAdminBannerMedia' },
  { method: 'POST', path: '/api/v1/admin/banners/:bannerId/media', operationId: 'createAdminBannerMedia' },
  { method: 'PATCH', path: '/api/v1/admin/banner-media/:mediaId', operationId: 'updateAdminBannerMedia' },
  { method: 'DELETE', path: '/api/v1/admin/banner-media/:mediaId', operationId: 'deleteAdminBannerMedia' },
  { method: 'POST', path: '/api/v1/admin/banners/order', operationId: 'reorderAdminBanners' }
] as const;

export interface AdminBannerRouterDependencies {
  service: AdBannerService;
  accessTokens: AccessTokenService;
}

const ERROR_MAP = Object.freeze({
  FORBIDDEN: { statusCode: 403, messageKey: 'errors.forbidden' },
  NOT_FOUND: { statusCode: 404, messageKey: 'errors.notFound' },
  DUPLICATE: { statusCode: 409, messageKey: 'errors.conflict' },
  VERSION_CONFLICT: { statusCode: 409, messageKey: 'errors.conflict' },
  PLACEMENT_CONFLICT: { statusCode: 409, messageKey: 'errors.conflict' },
  BANNER_INVALID_STATE: { statusCode: 409, messageKey: 'errors.conflict' },
  BANNER_TARGET_REQUIRED: { statusCode: 409, messageKey: 'errors.conflict' },
  BANNER_MEDIA_REQUIRED: { statusCode: 409, messageKey: 'errors.conflict' },
  BANNER_CAPACITY: { statusCode: 409, messageKey: 'errors.conflict' },
  MEDIA_IN_USE: { statusCode: 409, messageKey: 'errors.conflict' }
});

function requestId(request: Request): string {
  return getRequestContext()?.requestId ?? request.get('x-request-id') ?? 'unknown-request';
}

function claims(response: Response): AccessTokenClaims {
  return response.locals.adminRbacClaims as AccessTokenClaims;
}

function sendError(request: Request, response: Response, error: unknown): void {
  const bannerError = error instanceof AdBannerServiceError ? error : undefined;
  const definition = bannerError ? ERROR_MAP[bannerError.code] : undefined;
  const mapped = toApiErrorResponse(
    definition && bannerError
      ? new ApiContractError(bannerError.code, definition.messageKey, definition.statusCode)
      : error,
    requestId(request)
  );
  response.status(mapped.statusCode).json(mapped.body);
}

export function createAdminBannerRouter(dependencies: AdminBannerRouterDependencies): Router {
  const router = Router();
  router.use((_request, response, next) => {
    response.setHeader('Cache-Control', 'no-store');
    next();
  });
  router.use('/admin/banners', createAdminRbacAuthMiddleware(dependencies.accessTokens));
  router.use('/admin/banner-media', createAdminRbacAuthMiddleware(dependencies.accessTokens));

  router.get('/admin/banners', async (request, response) => {
    try {
      const query = adBannerListQuerySchema.parse(request.query);
      const data = await dependencies.service.listBanners(claims(response), query);
      response.status(200).json(toSuccessResponse(data, requestId(request), { page: data.page, limit: data.limit, total: data.total }));
    } catch (error) {
      sendError(request, response, error);
    }
  });

  router.post('/admin/banners', async (request, response) => {
    try {
      const data = await dependencies.service.createBanner(claims(response), request.body ?? {});
      response.status(201).json(toSuccessResponse(data, requestId(request)));
    } catch (error) {
      sendError(request, response, error);
    }
  });

  router.patch('/admin/banners/:bannerId', async (request, response) => {
    try {
      const { bannerId } = adBannerIdParamsSchema.parse(request.params);
      const data = await dependencies.service.updateBanner(claims(response), bannerId, request.body ?? {});
      response.status(200).json(toSuccessResponse(data, requestId(request)));
    } catch (error) {
      sendError(request, response, error);
    }
  });

  router.get('/admin/banners/:bannerId/preview', async (request, response) => {
    try {
      const { bannerId } = adBannerIdParamsSchema.parse(request.params);
      const data = await dependencies.service.previewBanner(claims(response), bannerId);
      response.status(200).json(toSuccessResponse(data, requestId(request)));
    } catch (error) {
      sendError(request, response, error);
    }
  });

  router.get('/admin/banners/:bannerId/media', async (request, response) => {
    try {
      const { bannerId } = adBannerIdParamsSchema.parse(request.params);
      const items = await dependencies.service.listBannerMedia(claims(response), bannerId);
      response.status(200).json(toSuccessResponse({ items }, requestId(request)));
    } catch (error) {
      sendError(request, response, error);
    }
  });

  router.post('/admin/banners/:bannerId/media', async (request, response) => {
    try {
      const { bannerId } = adBannerIdParamsSchema.parse(request.params);
      const data = await dependencies.service.createBannerMedia(claims(response), bannerId, request.body ?? {});
      response.status(201).json(toSuccessResponse(data, requestId(request)));
    } catch (error) {
      sendError(request, response, error);
    }
  });

  router.patch('/admin/banner-media/:mediaId', async (request, response) => {
    try {
      const { mediaId } = adBannerMediaIdParamsSchema.parse(request.params);
      const data = await dependencies.service.updateBannerMedia(claims(response), mediaId, request.body ?? {});
      response.status(200).json(toSuccessResponse(data, requestId(request)));
    } catch (error) {
      sendError(request, response, error);
    }
  });

  router.delete('/admin/banner-media/:mediaId', async (request, response) => {
    try {
      const { mediaId } = adBannerMediaIdParamsSchema.parse(request.params);
      const body = request.body && Object.keys(request.body).length > 0 ? request.body : undefined;
      const data = await dependencies.service.deleteBannerMedia(claims(response), mediaId, body);
      response.status(200).json(toSuccessResponse(data, requestId(request)));
    } catch (error) {
      sendError(request, response, error);
    }
  });

  router.post('/admin/banners/order', async (request, response) => {
    try {
      const data = await dependencies.service.reorderBanners(claims(response), request.body ?? {});
      response.status(200).json(toSuccessResponse(data, requestId(request)));
    } catch (error) {
      sendError(request, response, error);
    }
  });

  return router;
}
