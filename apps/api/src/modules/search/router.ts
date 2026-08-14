import { Router, type Request } from 'express';
import { publicPropertySearchQuerySchema, type PublicPropertyListData } from '@sadat-real-estate/contracts';
import { toApiErrorResponse } from '../contracts/error-boundary.js';
import { toSuccessResponse } from '../contracts/response.js';
import { getRequestContext } from '../observability/context.js';

export const SEARCH_ROUTE_DEFINITIONS = [
  { method: 'GET', path: '/api/v1/public/properties', operationId: 'listPublicProperties' }
] as const;

export interface PublicSearchRouterDependencies { service: { list(query: unknown): Promise<PublicPropertyListData> } }
function requestId(request: Request): string { return getRequestContext()?.requestId ?? request.get('x-request-id') ?? 'unknown-request'; }

export function createPublicSearchRouter(dependencies: PublicSearchRouterDependencies): Router {
  const router = Router();
  router.get('/public/properties', async (request, response) => {
    const currentRequestId = requestId(request);
    try {
      const query = publicPropertySearchQuerySchema.parse(request.query);
      const result = await dependencies.service.list(query);
      response.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=120');
      response.status(200).json(toSuccessResponse(result, currentRequestId, { page: result.page, limit: result.limit, total: result.total }));
    } catch (error) {
      const mapped = toApiErrorResponse(error, currentRequestId);
      response.status(mapped.statusCode).json(mapped.body);
    }
  });
  return router;
}
