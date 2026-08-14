import { Router, type Request } from 'express';
import { toApiErrorResponse } from '../contracts/error-boundary.js';
import { toSuccessResponse } from '../contracts/response.js';
import { getRequestContext } from '../observability/context.js';
import type { PublicHomepageData } from '@sadat-real-estate/contracts';
import { propertySlugSchema, type PublicPropertyDetails } from '@sadat-real-estate/contracts';
import { ApiContractError } from '../contracts/error-boundary.js';

export const PUBLIC_ROUTE_DEFINITIONS = [
  { method: 'GET', path: '/api/v1/public/home', operationId: 'getPublicHomepage' },
  { method: 'GET', path: '/api/v1/public/properties/:slug', operationId: 'getPublicPropertyDetails' }
] as const;

export interface PublicRouterDependencies { service: { read(): Promise<PublicHomepageData> }; details?: { get(slug: string): Promise<PublicPropertyDetails | null> } }

function requestId(request: Request): string { return getRequestContext()?.requestId ?? request.get('x-request-id') ?? 'unknown-request'; }

export function createPublicRouter(dependencies: PublicRouterDependencies): Router {
  const router = Router();
  router.get('/public/home', async (request, response) => {
    try {
      response.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
      response.status(200).json(toSuccessResponse(await dependencies.service.read(), requestId(request)));
    } catch (error) {
      const mapped = toApiErrorResponse(error, requestId(request));
      response.status(mapped.statusCode).json(mapped.body);
    }
  });
  router.get('/public/properties/:slug', async (request, response) => {
    const currentRequestId = requestId(request);
    try {
      if (!dependencies.details) throw new ApiContractError('NOT_IMPLEMENTED', 'errors.notFound', 404);
      const slug = propertySlugSchema.parse(request.params.slug);
      const details = await dependencies.details.get(slug);
      if (!details) throw new ApiContractError('PROPERTY_NOT_FOUND', 'errors.properties.notFound', 404);
      response.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
      response.status(200).json(toSuccessResponse(details, currentRequestId));
    } catch (error) {
      const mapped = toApiErrorResponse(error, currentRequestId);
      response.status(mapped.statusCode).json(mapped.body);
    }
  });
  return router;
}
