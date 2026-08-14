import { Router, type Request } from 'express';
import { organizationSlugSchema, publicOrganizationDirectoryQuerySchema } from '@sadat-real-estate/contracts';
import { toApiErrorResponse } from '../contracts/error-boundary.js';
import { toSuccessResponse } from '../contracts/response.js';
import { getRequestContext } from '../observability/context.js';
import { ApiContractError } from '../contracts/error-boundary.js';
import type { PublicOrganizationListData, PublicOrganizationProfile } from '@sadat-real-estate/contracts';

export const ORGANIZATION_ROUTE_DEFINITIONS = [
  { method: 'GET', path: '/api/v1/public/developers', operationId: 'listPublicDevelopers' },
  { method: 'GET', path: '/api/v1/public/developers/:slug', operationId: 'getPublicDeveloper' }
] as const;
export interface PublicOrganizationRouterDependencies { service: { list(query: unknown): Promise<PublicOrganizationListData>; get(slug: unknown): Promise<PublicOrganizationProfile | null> } }
function requestId(request: Request): string { return getRequestContext()?.requestId ?? request.get('x-request-id') ?? 'unknown-request'; }
export function createPublicOrganizationRouter(dependencies: PublicOrganizationRouterDependencies): Router { const router = Router(); router.get('/public/developers', async (request, response) => { const currentRequestId = requestId(request); try { const query = publicOrganizationDirectoryQuerySchema.parse(request.query); response.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300'); response.status(200).json(toSuccessResponse(await dependencies.service.list(query), currentRequestId)); } catch (error) { const mapped = toApiErrorResponse(error, currentRequestId); response.status(mapped.statusCode).json(mapped.body); } }); router.get('/public/developers/:slug', async (request, response) => { const currentRequestId = requestId(request); try { const slug = organizationSlugSchema.parse(request.params.slug); const profile = await dependencies.service.get(slug); if (!profile) throw new ApiContractError('ORGANIZATION_NOT_FOUND', 'errors.notFound', 404); response.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300'); response.status(200).json(toSuccessResponse(profile, currentRequestId)); } catch (error) { const mapped = toApiErrorResponse(error, currentRequestId); response.status(mapped.statusCode).json(mapped.body); } }); return router; }
