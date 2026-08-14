import { Router, type Request, type Response } from 'express';
import { propertyMediaObjectIdSchema, propertyMediaOrderSchema, propertyMediaUploadHeadersSchema } from '@sadat-real-estate/contracts';
import type { AccessTokenClaims, AccessTokenService } from '../auth/crypto.js';
import { ApiContractError, toApiErrorResponse } from '../contracts/error-boundary.js';
import { toSuccessResponse } from '../contracts/response.js';
import { getRequestContext } from '../observability/context.js';
import { createProviderAuthMiddleware } from '../provider/auth.js';
import { PropertyMediaServiceError, type MediaMutationContext, type PropertyMediaService } from './service.js';

export const PROPERTY_MEDIA_ROUTE_DEFINITIONS = [
  { method: 'POST', path: '/api/v1/provider/properties/:propertyId/media', operationId: 'uploadProviderPropertyMedia' },
  { method: 'PATCH', path: '/api/v1/provider/properties/:propertyId/media/order', operationId: 'reorderProviderPropertyMedia' },
  { method: 'DELETE', path: '/api/v1/provider/properties/:propertyId/media/:assetId', operationId: 'deleteProviderPropertyMedia' }
] as const;
export interface PropertyMediaRouterDependencies { service: PropertyMediaService; accessTokens: AccessTokenService; }
const ERROR_MAP: Record<string, { statusCode: number; messageKey: string }> = {
  MEDIA_FORBIDDEN: { statusCode: 403, messageKey: 'errors.media.forbidden' }, MEDIA_PROPERTY_NOT_FOUND: { statusCode: 404, messageKey: 'errors.media.propertyNotFound' }, MEDIA_PROPERTY_NOT_EDITABLE: { statusCode: 409, messageKey: 'errors.media.propertyNotEditable' }, MEDIA_NOT_FOUND: { statusCode: 404, messageKey: 'errors.media.notFound' }, MEDIA_VERSION_CONFLICT: { statusCode: 409, messageKey: 'errors.media.versionConflict' }, MEDIA_CAPACITY: { statusCode: 409, messageKey: 'errors.media.capacity' }, MEDIA_PROCESSING_FAILED: { statusCode: 422, messageKey: 'errors.media.processingFailed' }, MEDIA_INVALID_UPLOAD: { statusCode: 400, messageKey: 'errors.media.invalidUpload' }, MEDIA_STORAGE_UNAVAILABLE: { statusCode: 503, messageKey: 'errors.media.storageUnavailable' }
};
function context(request: Request): MediaMutationContext { const current = getRequestContext(); return { requestId: current?.requestId ?? request.get('x-request-id') ?? 'unknown-request', traceId: current?.traceId ?? 'f'.repeat(32) }; }
function claims(response: Response): AccessTokenClaims { return response.locals.providerClaims as AccessTokenClaims; }
function sendError(request: Request, response: Response, error: unknown): void { const mediaError = error instanceof PropertyMediaServiceError ? ERROR_MAP[error.code] : undefined; const mapped = toApiErrorResponse(mediaError ? new ApiContractError((error as PropertyMediaServiceError).code, mediaError.messageKey, mediaError.statusCode) : error, context(request).requestId); response.status(mapped.statusCode).json(mapped.body); }
function id(value: string | string[] | undefined): string { return typeof value === 'string' ? value : ''; }
function contentLength(request: Request): number | undefined { const raw = request.get('content-length'); if (!raw) return undefined; return /^\d+$/.test(raw) ? Number(raw) : Number.NaN; }

export function createPropertyMediaRouter(dependencies: PropertyMediaRouterDependencies): Router {
  const router = Router(); router.use('/provider/properties/:propertyId/media', createProviderAuthMiddleware(dependencies.accessTokens)); router.use((_request, response, next) => { response.setHeader('Cache-Control', 'no-store'); next(); });
  router.post('/provider/properties/:propertyId/media', async (request, response) => { try { const propertyId = propertyMediaObjectIdSchema.parse(id(request.params.propertyId)); const length = contentLength(request); const headers = propertyMediaUploadHeadersSchema.parse({ kind: request.get('x-media-kind'), filename: request.get('x-file-name'), contentType: request.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase(), ...(length !== undefined ? { contentLength: length } : {}) }); response.status(201).json(toSuccessResponse(await dependencies.service.upload(claims(response), propertyId, headers, request, context(request)), context(request).requestId)); } catch (error) { sendError(request, response, error); } });
  router.patch('/provider/properties/:propertyId/media/order', async (request, response) => { try { const propertyId = propertyMediaObjectIdSchema.parse(id(request.params.propertyId)); const current = context(request); response.status(200).json(toSuccessResponse({ items: await dependencies.service.reorder(claims(response), propertyId, propertyMediaOrderSchema.parse(request.body ?? {}), current) }, current.requestId)); } catch (error) { sendError(request, response, error); } });
  router.delete('/provider/properties/:propertyId/media/:assetId', async (request, response) => { try { const propertyId = propertyMediaObjectIdSchema.parse(id(request.params.propertyId)); const mediaId = propertyMediaObjectIdSchema.parse(id(request.params.assetId)); const current = context(request); response.status(200).json(toSuccessResponse(await dependencies.service.remove(claims(response), propertyId, mediaId, current), current.requestId)); } catch (error) { sendError(request, response, error); } });
  return router;
}
