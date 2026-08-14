import { Router, type Request } from 'express';
import { publicPropertyCompareRequestSchema, type PublicPropertyComparisonData } from '@sadat-real-estate/contracts';
import { ApiContractError, toApiErrorResponse } from '../contracts/error-boundary.js';
import { toSuccessResponse } from '../contracts/response.js';
import { getRequestContext } from '../observability/context.js';
import { PublicPropertyComparisonError } from './properties.js';

export const COMPARE_ROUTE_DEFINITIONS = [
  { method: 'POST', path: '/api/v1/public/properties/compare', operationId: 'comparePublicProperties' }
] as const;
export interface PublicCompareRouterDependencies { service: { compare(input: unknown): Promise<PublicPropertyComparisonData> } }
function requestId(request: Request): string { return getRequestContext()?.requestId ?? request.get('x-request-id') ?? 'unknown-request'; }

export function createPublicCompareRouter(dependencies: PublicCompareRouterDependencies): Router {
  const router = Router();
  router.post('/public/properties/compare', async (request, response) => {
    const currentRequestId = requestId(request);
    try {
      const result = await dependencies.service.compare(publicPropertyCompareRequestSchema.parse(request.body ?? {}));
      response.setHeader('Cache-Control', 'no-store');
      response.status(200).json(toSuccessResponse(result, currentRequestId));
    } catch (error) {
      const mappedError = error instanceof PublicPropertyComparisonError ? new ApiContractError('PROPERTY_UNAVAILABLE', 'errors.properties.notFound', 404) : error;
      const mapped = toApiErrorResponse(mappedError, currentRequestId);
      response.status(mapped.statusCode).json(mapped.body);
    }
  });
  return router;
}
