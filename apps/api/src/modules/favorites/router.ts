import { Router, type Request, type Response } from 'express';
import { favoriteListQuerySchema, favoritePropertyParamsSchema, type FavoriteListData, type FavoriteRemoveData, type FavoriteSaveData } from '@sadat-real-estate/contracts';
import type { AccessTokenClaims, AccessTokenService } from '../auth/crypto.js';
import { ApiContractError, toApiErrorResponse } from '../contracts/error-boundary.js';
import { toSuccessResponse } from '../contracts/response.js';
import { getRequestContext } from '../observability/context.js';
import { createSeekerAuthMiddleware } from '../seeker/auth.js';
import { FavoriteServiceError } from './service.js';

export const FAVORITE_ROUTE_DEFINITIONS = [
  { method: 'GET', path: '/api/v1/seeker/favorites', operationId: 'listSavedProperties' },
  { method: 'PUT', path: '/api/v1/seeker/favorites/:propertyId', operationId: 'saveProperty' },
  { method: 'DELETE', path: '/api/v1/seeker/favorites/:propertyId', operationId: 'removeSavedProperty' }
] as const;
export interface FavoriteRouterDependencies { service: { list(claims: AccessTokenClaims, query: unknown): Promise<FavoriteListData>; save(claims: AccessTokenClaims, propertyId: unknown): Promise<FavoriteSaveData>; remove(claims: AccessTokenClaims, propertyId: unknown): Promise<FavoriteRemoveData> }; accessTokens: AccessTokenService }
const errors = { FAVORITE_FORBIDDEN: { status: 403, key: 'errors.forbidden' }, FAVORITE_PROPERTY_UNAVAILABLE: { status: 404, key: 'errors.properties.notFound' } } as const;
function requestId(request: Request): string { return getRequestContext()?.requestId ?? request.get('x-request-id') ?? 'unknown-request'; }
function claims(response: Response): AccessTokenClaims { return response.locals.seekerClaims as AccessTokenClaims; }
function sendError(request: Request, response: Response, error: unknown): void { const favoriteError = error instanceof FavoriteServiceError ? errors[error.code] : undefined; const mapped = toApiErrorResponse(favoriteError ? new ApiContractError(error instanceof FavoriteServiceError ? error.code : 'INTERNAL_ERROR', favoriteError.key, favoriteError.status) : error, requestId(request)); response.status(mapped.statusCode).json(mapped.body); }
export function createFavoriteRouter(dependencies: FavoriteRouterDependencies): Router { const router = Router(); router.use((_request, response, next) => { response.setHeader('Cache-Control', 'no-store'); next(); }); router.use('/seeker/favorites', createSeekerAuthMiddleware(dependencies.accessTokens)); router.get('/seeker/favorites', async (request, response) => { try { response.status(200).json(toSuccessResponse(await dependencies.service.list(claims(response), favoriteListQuerySchema.parse(request.query)), requestId(request))); } catch (error) { sendError(request, response, error); } }); router.put('/seeker/favorites/:propertyId', async (request, response) => { try { const { propertyId } = favoritePropertyParamsSchema.parse(request.params); response.status(200).json(toSuccessResponse(await dependencies.service.save(claims(response), propertyId), requestId(request))); } catch (error) { sendError(request, response, error); } }); router.delete('/seeker/favorites/:propertyId', async (request, response) => { try { const { propertyId } = favoritePropertyParamsSchema.parse(request.params); response.status(200).json(toSuccessResponse(await dependencies.service.remove(claims(response), propertyId), requestId(request))); } catch (error) { sendError(request, response, error); } }); return router; }
