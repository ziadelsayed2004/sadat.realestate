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

export const PROPERTY_MEDIA_ROUTE_DEFINITIONS = [
  { method: 'GET', path: '/api/v1/public/properties/:propertyId/media/:assetId/content', operationId: 'getPublicPropertyMediaContent' },
  { method: 'GET', path: '/api/v1/provider/properties/:propertyId/media', operationId: 'listProviderPropertyMedia' },
  { method: 'POST', path: '/api/v1/provider/properties/:propertyId/media', operationId: 'uploadProviderPropertyMedia' },
  { method: 'PATCH', path: '/api/v1/provider/properties/:propertyId/media/order', operationId: 'reorderProviderPropertyMedia' },
  { method: 'DELETE', path: '/api/v1/provider/properties/:propertyId/media/:assetId', operationId: 'deleteProviderPropertyMedia' }
] as const;
export interface PropertyMediaRouterDependencies { service: PropertyMediaService; accessTokens: AccessTokenService; content?: PropertyMediaContentReader; }
const ERROR_MAP: Record<string, { statusCode: number; messageKey: string }> = {
  MEDIA_FORBIDDEN: { statusCode: 403, messageKey: 'errors.media.forbidden' }, MEDIA_PROPERTY_NOT_FOUND: { statusCode: 404, messageKey: 'errors.media.propertyNotFound' }, MEDIA_PROPERTY_NOT_EDITABLE: { statusCode: 409, messageKey: 'errors.media.propertyNotEditable' }, MEDIA_NOT_FOUND: { statusCode: 404, messageKey: 'errors.media.notFound' }, MEDIA_VERSION_CONFLICT: { statusCode: 409, messageKey: 'errors.media.versionConflict' }, MEDIA_CAPACITY: { statusCode: 409, messageKey: 'errors.media.capacity' }, MEDIA_PROCESSING_FAILED: { statusCode: 422, messageKey: 'errors.media.processingFailed' }, MEDIA_INVALID_UPLOAD: { statusCode: 400, messageKey: 'errors.media.invalidUpload' }, MEDIA_STORAGE_UNAVAILABLE: { statusCode: 503, messageKey: 'errors.media.storageUnavailable' }
};
function context(request: Request): MediaMutationContext { const current = getRequestContext(); return { requestId: current?.requestId ?? request.get('x-request-id') ?? 'unknown-request', traceId: current?.traceId ?? 'f'.repeat(32) }; }
function claims(response: Response): AccessTokenClaims { return response.locals.providerClaims as AccessTokenClaims; }
function sendError(request: Request, response: Response, error: unknown): void { const mediaError = error instanceof PropertyMediaServiceError ? ERROR_MAP[error.code] : undefined; const mapped = toApiErrorResponse(mediaError ? new ApiContractError((error as PropertyMediaServiceError).code, mediaError.messageKey, mediaError.statusCode) : error, context(request).requestId); response.status(mapped.statusCode).json(mapped.body); }
function id(value: string | string[] | undefined): string { return typeof value === 'string' ? value : ''; }
function contentLength(request: Request): number | undefined { const raw = request.get('content-length'); if (!raw) return undefined; return /^\d+$/.test(raw) ? Number(raw) : Number.NaN; }
function filename(request: Request): string | undefined { const raw = request.get('x-file-name'); try { return raw === undefined ? undefined : decodeURIComponent(raw); } catch { throw new ApiContractError('MEDIA_INVALID_UPLOAD', 'errors.media.invalidUpload', 400); } }

export function createPropertyMediaRouter(dependencies: PropertyMediaRouterDependencies): Router {
  const router = Router(); router.use('/provider/properties/:propertyId/media', createProviderAuthMiddleware(dependencies.accessTokens)); router.use((_request, response, next) => { response.setHeader('Cache-Control', 'no-store'); next(); });
  router.get('/public/properties/:propertyId/media/:assetId/content', async (request, response) => {
    try {
      const propertyId = propertyMediaObjectIdSchema.parse(id(request.params.propertyId));
      const mediaId = propertyMediaObjectIdSchema.parse(id(request.params.assetId));
      const media = await dependencies.content?.(propertyId, mediaId);
      if (!media) throw new PropertyMediaServiceError('MEDIA_NOT_FOUND');
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
  router.get('/provider/properties/:propertyId/media', async (request, response) => {
    try { const propertyId = propertyMediaObjectIdSchema.parse(id(request.params.propertyId)); response.json(toSuccessResponse({ items: await dependencies.service.list(claims(response), propertyId) }, context(request).requestId)); }
    catch (error) { sendError(request, response, error); }
  });
  router.post('/provider/properties/:propertyId/media', async (request, response) => { try { const propertyId = propertyMediaObjectIdSchema.parse(id(request.params.propertyId)); const length = contentLength(request); const headers = propertyMediaUploadHeadersSchema.parse({ kind: request.get('x-media-kind'), filename: filename(request), contentType: request.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase(), ...(length !== undefined ? { contentLength: length } : {}) }); response.status(201).json(toSuccessResponse(await dependencies.service.upload(claims(response), propertyId, headers, request, context(request)), context(request).requestId)); } catch (error) { sendError(request, response, error); } });
  router.patch('/provider/properties/:propertyId/media/order', async (request, response) => { try { const propertyId = propertyMediaObjectIdSchema.parse(id(request.params.propertyId)); const current = context(request); response.status(200).json(toSuccessResponse({ items: await dependencies.service.reorder(claims(response), propertyId, propertyMediaOrderSchema.parse(request.body ?? {}), current) }, current.requestId)); } catch (error) { sendError(request, response, error); } });
  router.delete('/provider/properties/:propertyId/media/:assetId', async (request, response) => { try { const propertyId = propertyMediaObjectIdSchema.parse(id(request.params.propertyId)); const mediaId = propertyMediaObjectIdSchema.parse(id(request.params.assetId)); const current = context(request); response.status(200).json(toSuccessResponse(await dependencies.service.remove(claims(response), propertyId, mediaId, current), current.requestId)); } catch (error) { sendError(request, response, error); } });
  return router;
}
