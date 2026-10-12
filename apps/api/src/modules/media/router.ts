import { createAdminRbacAuthMiddleware } from '../rbac/auth.js';
import { Router, type Request, type Response } from 'express';
import { propertyMediaObjectIdSchema, propertyMediaOrderSchema, propertyMediaUploadHeadersSchema } from '@sadat-real-estate/contracts';
import type { AccessTokenClaims, AccessTokenService } from '../auth/crypto.js';
import { ApiContractError, toApiErrorResponse } from '../contracts/error-boundary.js';
import { toSuccessResponse } from '../contracts/response.js';
import { getRequestContext } from '../observability/context.js';
import { createProviderAuthMiddleware } from '../provider/auth.js';
import { PropertyMediaServiceError, type MediaMutationContext, type PropertyMediaService } from './service.js';
import { pipeline } from 'node:stream/promises';
import { mediaByteRange, type PropertyMediaContentReader } from './content.js';
import { imagePreview, previewContentEtag, type ImagePreviewWidth } from './image-preview.js';

export const PROPERTY_MEDIA_ROUTE_DEFINITIONS = [
  { method: 'GET', path: '/api/v1/admin/properties/:propertyId/media/:assetId/content', operationId: 'getAdminPropertyMediaContent' },
  { method: 'GET', path: '/api/v1/public/properties/:propertyId/media/:assetId/content', operationId: 'getPublicPropertyMediaContent' },
  { method: 'GET', path: '/api/v1/provider/properties/:propertyId/media', operationId: 'listProviderPropertyMedia' },
  { method: 'POST', path: '/api/v1/provider/properties/:propertyId/media', operationId: 'uploadProviderPropertyMedia' },
  { method: 'PATCH', path: '/api/v1/provider/properties/:propertyId/media/order', operationId: 'reorderProviderPropertyMedia' },
  { method: 'DELETE', path: '/api/v1/provider/properties/:propertyId/media/:assetId', operationId: 'deleteProviderPropertyMedia' },
  { method: 'GET', path: '/api/v1/admin/properties/:propertyId/media', operationId: 'listAdminPropertyMedia' },
  { method: 'POST', path: '/api/v1/admin/properties/:propertyId/media', operationId: 'uploadAdminPropertyMedia' },
  { method: 'PATCH', path: '/api/v1/admin/properties/:propertyId/media/order', operationId: 'reorderAdminPropertyMedia' },
  { method: 'DELETE', path: '/api/v1/admin/properties/:propertyId/media/:assetId', operationId: 'deleteAdminPropertyMedia' }
] as const;
export interface PropertyMediaRouterDependencies { service: PropertyMediaService; accessTokens: AccessTokenService; content?: PropertyMediaContentReader; adminContent?: PropertyMediaContentReader; }
function previewWidth(request: Request, mime: string): ImagePreviewWidth | undefined {
  const value = request.query.width;
  if (value !== undefined && value !== '320' && value !== '960' && value !== '1600') throw new ApiContractError('VALIDATION_FAILED', 'errors.validation', 400);
  return value !== undefined && /^image\/(?:jpeg|png|webp)$/u.test(mime) ? Number(value) as ImagePreviewWidth : undefined;
}
function revalidateContent(request: Request, response: Response, etag: string | undefined): boolean {
  response.setHeader('Cache-Control', 'private, no-cache');
  if (etag !== undefined) response.setHeader('ETag', etag);
  if (etag !== undefined && request.get('range') === undefined && request.fresh) { response.status(304).end(); return true; }
  return false;
}
async function sendPreview(request: Request, response: Response, media: NonNullable<Awaited<ReturnType<PropertyMediaContentReader>>>, width: ImagePreviewWidth): Promise<void> {
  const bytes = await imagePreview(media.open, width, media.etag);
  response.type('image/webp').setHeader('Content-Length', bytes.length);
  response.setHeader('X-Content-Type-Options', 'nosniff');
  if (request.method === 'HEAD') response.end();
  else response.end(bytes);
}
const ERROR_MAP: Record<string, { statusCode: number; messageKey: string }> = {
  MEDIA_FORBIDDEN: { statusCode: 403, messageKey: 'errors.media.forbidden' }, MEDIA_PROPERTY_NOT_FOUND: { statusCode: 404, messageKey: 'errors.media.propertyNotFound' }, MEDIA_PROPERTY_NOT_EDITABLE: { statusCode: 409, messageKey: 'errors.media.propertyNotEditable' }, MEDIA_NOT_FOUND: { statusCode: 404, messageKey: 'errors.media.notFound' }, MEDIA_VERSION_CONFLICT: { statusCode: 409, messageKey: 'errors.media.versionConflict' }, MEDIA_CAPACITY: { statusCode: 409, messageKey: 'errors.media.capacity' }, MEDIA_PROCESSING_FAILED: { statusCode: 422, messageKey: 'errors.media.processingFailed' }, MEDIA_INVALID_UPLOAD: { statusCode: 400, messageKey: 'errors.media.invalidUpload' }, MEDIA_STORAGE_UNAVAILABLE: { statusCode: 503, messageKey: 'errors.media.storageUnavailable' }
};
function context(request: Request): MediaMutationContext { const current = getRequestContext(); let reason: string | undefined; try { reason = request.get('x-edit-reason') === undefined ? undefined : decodeURIComponent(request.get('x-edit-reason')!); } catch { throw new ApiContractError('INVALID_REASON', 'errors.validation', 400); } return { ...(reason === undefined ? {} : { reason }), requestId: current?.requestId ?? request.get('x-request-id') ?? 'unknown-request', traceId: current?.traceId ?? 'f'.repeat(32) }; }
function claims(response: Response): AccessTokenClaims { return (response.locals.adminRbacClaims ?? response.locals.providerClaims) as AccessTokenClaims; }
function sendError(request: Request, response: Response, error: unknown): void { response.removeHeader('ETag'); response.setHeader('Cache-Control', 'no-store'); const mediaError = error instanceof PropertyMediaServiceError ? ERROR_MAP[error.code] : undefined; const mapped = toApiErrorResponse(mediaError ? new ApiContractError((error as PropertyMediaServiceError).code, mediaError.messageKey, mediaError.statusCode) : error, getRequestContext()?.requestId ?? request.get('x-request-id') ?? 'unknown-request'); response.status(mapped.statusCode).json(mapped.body); }
function id(value: string | string[] | undefined): string { return typeof value === 'string' ? value : ''; }
function contentLength(request: Request): number | undefined { const raw = request.get('content-length'); if (!raw) return undefined; return /^\d+$/.test(raw) ? Number(raw) : Number.NaN; }
function filename(request: Request): string | undefined { const raw = request.get('x-file-name'); try { return raw === undefined ? undefined : decodeURIComponent(raw); } catch { throw new ApiContractError('MEDIA_INVALID_UPLOAD', 'errors.media.invalidUpload', 400); } }

export function createPropertyMediaRouter(dependencies: PropertyMediaRouterDependencies): Router {
  const router = Router(); router.use('/provider/properties/:propertyId/media', createProviderAuthMiddleware(dependencies.accessTokens)); router.use('/admin/properties/:propertyId/media', createAdminRbacAuthMiddleware(dependencies.accessTokens)); router.use((_request, response, next) => { response.setHeader('Cache-Control', 'no-store'); next(); });
  router.get('/admin/properties/:propertyId/media/:assetId/content', async (request, response) => {
    try {
      const propertyId = propertyMediaObjectIdSchema.parse(id(request.params.propertyId));
      const mediaId = propertyMediaObjectIdSchema.parse(id(request.params.assetId));
      const allowed = await dependencies.service.list(claims(response), propertyId);
      if (!allowed.some(media => media.id === mediaId && media.active && media.processingState === 'ready')) throw new PropertyMediaServiceError('MEDIA_NOT_FOUND');
      const media = await dependencies.adminContent?.(propertyId, mediaId);
      if (!media) throw new PropertyMediaServiceError('MEDIA_NOT_FOUND');
      const width = previewWidth(request, media.mime);
      // Authorization and active-media checks must run before a cache hit or a 304.
      if (revalidateContent(request, response, previewContentEtag(media.etag, width))) return;
      if (width !== undefined) { await sendPreview(request, response, media, width); return; }
      response.setHeader('X-Content-Type-Options', 'nosniff');
      response.type(media.mime).setHeader('Content-Length', media.size);
      if (request.method === 'HEAD') { response.end(); return; }
      await pipeline(await media.open(), response);
    } catch (error) { if (!response.headersSent) { response.removeHeader('Content-Length'); sendError(request, response, error); } else response.destroy(); }
  });
  router.get('/public/properties/:propertyId/media/:assetId/content', async (request, response) => {
    try {
      const propertyId = propertyMediaObjectIdSchema.parse(id(request.params.propertyId));
      const mediaId = propertyMediaObjectIdSchema.parse(id(request.params.assetId));
      const media = await dependencies.content?.(propertyId, mediaId);
      if (!media) throw new PropertyMediaServiceError('MEDIA_NOT_FOUND');
      const width = previewWidth(request, media.mime);
      // Publication must be rechecked before reusing derived bytes or returning a 304.
      if (revalidateContent(request, response, previewContentEtag(media.etag, width))) return;
      if (width !== undefined) { await sendPreview(request, response, media, width); return; }
      const range = mediaByteRange(request.get('range'), media.size);
      response.setHeader('Accept-Ranges', 'bytes');
      response.setHeader('X-Content-Type-Options', 'nosniff');
      if (range === null) { response.setHeader('Content-Range', `bytes */${media.size}`); response.sendStatus(416); return; }
      response.type(media.mime);
      response.setHeader('Content-Length', range ? range.end - range.start + 1 : media.size);
      if (range) response.setHeader('Content-Range', `bytes ${range.start}-${range.end}/${media.size}`);
      response.status(range ? 206 : 200);
      if (request.method === 'HEAD') { response.end(); return; }
      await pipeline(await media.open(range), response);
    } catch (error) { if (!response.headersSent) { response.removeHeader('Content-Length'); response.removeHeader('Content-Range'); sendError(request, response, error); } else response.destroy(); }
  });
  router.get(['/provider/properties/:propertyId/media', '/admin/properties/:propertyId/media'], async (request, response) => {
    try { const propertyId = propertyMediaObjectIdSchema.parse(id(request.params.propertyId)); response.json(toSuccessResponse({ items: await dependencies.service.list(claims(response), propertyId) }, context(request).requestId)); }
    catch (error) { sendError(request, response, error); }
  });
  router.post(['/provider/properties/:propertyId/media', '/admin/properties/:propertyId/media'], async (request, response) => { try { const propertyId = propertyMediaObjectIdSchema.parse(id(request.params.propertyId)); const length = contentLength(request); const headers = propertyMediaUploadHeadersSchema.parse({ kind: request.get('x-media-kind'), filename: filename(request), contentType: request.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase(), ...(length !== undefined ? { contentLength: length } : {}) }); response.status(201).json(toSuccessResponse(await dependencies.service.upload(claims(response), propertyId, headers, request, context(request)), context(request).requestId)); } catch (error) { sendError(request, response, error); } });
  router.patch(['/provider/properties/:propertyId/media/order', '/admin/properties/:propertyId/media/order'], async (request, response) => { try { const propertyId = propertyMediaObjectIdSchema.parse(id(request.params.propertyId)); const current = context(request); response.status(200).json(toSuccessResponse({ items: await dependencies.service.reorder(claims(response), propertyId, propertyMediaOrderSchema.parse(request.body ?? {}), current) }, current.requestId)); } catch (error) { sendError(request, response, error); } });
  router.delete(['/provider/properties/:propertyId/media/:assetId', '/admin/properties/:propertyId/media/:assetId'], async (request, response) => { try { const propertyId = propertyMediaObjectIdSchema.parse(id(request.params.propertyId)); const mediaId = propertyMediaObjectIdSchema.parse(id(request.params.assetId)); const current = context(request); response.status(200).json(toSuccessResponse(await dependencies.service.remove(claims(response), propertyId, mediaId, current), current.requestId)); } catch (error) { sendError(request, response, error); } });
  return router;
}
