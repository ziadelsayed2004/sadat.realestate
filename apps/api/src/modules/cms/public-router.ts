import { Router, type Request } from 'express';
import {
  cmsPublicContentListSuccessEnvelopeSchema,
  cmsPublicContentListDataSchema
} from '@sadat-real-estate/contracts';
import { toApiErrorResponse } from '../contracts/error-boundary.js';
import { toSuccessResponse } from '../contracts/response.js';
import { getRequestContext } from '../observability/context.js';
import type { PublicAboutTeamService } from './public-content.js';

export const CMS_PUBLIC_ROUTE_DEFINITIONS = [
  { method: 'GET', path: '/api/v1/public/about', operationId: 'getPublicAbout' },
  { method: 'GET', path: '/api/v1/public/team', operationId: 'getPublicTeam' }
] as const;

export interface PublicAboutTeamRouterDependencies {
  service: PublicAboutTeamService;
}

function requestId(request: Request): string {
  return getRequestContext()?.requestId ?? request.get('x-request-id') ?? 'unknown-request';
}

export function createPublicAboutTeamRouter(dependencies: PublicAboutTeamRouterDependencies): Router {
  const router = Router();

  router.get('/public/about', async (request, response) => {
    const currentRequestId = requestId(request);
    try {
      const data = cmsPublicContentListDataSchema.parse({ items: await dependencies.service.listAbout() });
      cmsPublicContentListSuccessEnvelopeSchema.parse(toSuccessResponse(data, currentRequestId));
      response.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
      response.status(200).json(toSuccessResponse(data, currentRequestId));
    } catch (error) {
      const mapped = toApiErrorResponse(error, currentRequestId);
      response.status(mapped.statusCode).json(mapped.body);
    }
  });

  router.get('/public/team', async (request, response) => {
    const currentRequestId = requestId(request);
    try {
      const data = cmsPublicContentListDataSchema.parse({ items: await dependencies.service.listTeam() });
      cmsPublicContentListSuccessEnvelopeSchema.parse(toSuccessResponse(data, currentRequestId));
      response.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
      response.status(200).json(toSuccessResponse(data, currentRequestId));
    } catch (error) {
      const mapped = toApiErrorResponse(error, currentRequestId);
      response.status(mapped.statusCode).json(mapped.body);
    }
  });

  return router;
}
