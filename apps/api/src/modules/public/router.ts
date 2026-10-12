import { Router, type Request } from 'express';
import { randomUUID } from 'node:crypto';
import { toApiErrorResponse } from '../contracts/error-boundary.js';
import { toSuccessResponse } from '../contracts/response.js';
import { getRequestContext } from '../observability/context.js';
import type { PublicHomepageData } from '@sadat-real-estate/contracts';
import { propertySlugSchema, type PublicPropertyDetails } from '@sadat-real-estate/contracts';
import { ApiContractError } from '../contracts/error-boundary.js';
import type { AccessTokenClaims, AccessTokenService } from '../auth/crypto.js';
import type { PublicBootstrapService } from './bootstrap.js';
import type { PublicSitemapService } from './sitemap.js';

export const PUBLIC_ROUTE_DEFINITIONS = [
  { method: 'GET', path: '/api/v1/public/bootstrap', operationId: 'getPublicBootstrap' },
  { method: 'GET', path: '/api/v1/public/sitemap', operationId: 'getPublicSitemap' },
  { method: 'GET', path: '/api/v1/public/home', operationId: 'getPublicHomepage' },
  { method: 'GET', path: '/api/v1/public/properties/:slug', operationId: 'getPublicPropertyDetails' },
  { method: 'POST', path: '/api/v1/public/properties/:slug/views', operationId: 'recordPublicPropertyView' }
] as const;

export interface PublicRouterDependencies {
  service: { read(): Promise<PublicHomepageData> };
  details?: { get(slug: string, viewer?: AccessTokenClaims): Promise<PublicPropertyDetails | null> };
  accessTokens?: AccessTokenService;
  bootstrap?: PublicBootstrapService;
  sitemap?: PublicSitemapService;
  views?: { record(slug: string, visitor: string, viewer?: AccessTokenClaims): Promise<boolean> };
}

function requestId(request: Request): string { return getRequestContext()?.requestId ?? request.get('x-request-id') ?? 'unknown-request'; }

function optionalViewer(request: Request, accessTokens: AccessTokenService | undefined): AccessTokenClaims | undefined {
  const header = request.get('authorization')?.trim();
  if (!header || !/^Bearer\s+/iu.test(header) || !accessTokens) return undefined;
  try {
    const claims = accessTokens.verify(header.replace(/^Bearer\s+/iu, '').trim());
    return claims.status === 'verified' ? claims : undefined;
  } catch {
    return undefined;
  }
}

export function createPublicRouter(dependencies: PublicRouterDependencies): Router {
  const router = Router();
  router.post('/public/properties/:slug/views', async (request, response) => {
    try {
      response.setHeader('Cache-Control', 'no-store');
      const slug = propertySlugSchema.parse(request.params.slug);
      if (!dependencies.views) throw new ApiContractError('PROPERTY_VIEWS_UNAVAILABLE', 'errors.internal', 503);
      // Exclude obvious crawlers and cross-site requests; never retain IP addresses or user agents.
      if (/bot|crawler|spider|headless/iu.test(request.get('user-agent') ?? '') || request.get('sec-fetch-site') === 'cross-site') {
        response.status(200).json(toSuccessResponse({ recorded: false }, requestId(request)));
        return;
      }
      const cookie = request.get('cookie')?.split(';').map(value => value.trim()).find(value => value.startsWith('property_visitor='))?.slice('property_visitor='.length);
      const visitor = cookie && /^[a-f0-9-]{36}$/u.test(cookie) ? cookie : randomUUID();
      response.cookie('property_visitor', visitor, { httpOnly: true, sameSite: 'lax', secure: request.secure, path: '/api/v1/public/properties', maxAge: 40 * 86_400_000 });
      response.status(200).json(toSuccessResponse({ recorded: await dependencies.views.record(slug, visitor, optionalViewer(request, dependencies.accessTokens)) }, requestId(request)));
    } catch (error) {
      const mapped = toApiErrorResponse(error, requestId(request));
      response.status(mapped.statusCode).json(mapped.body);
    }
  });
  router.get('/public/bootstrap', async (request, response) => {
    try {
      if (!dependencies.bootstrap) throw new ApiContractError('PUBLIC_BOOTSTRAP_UNAVAILABLE', 'errors.internal', 503);
      response.setHeader('Cache-Control', 'no-store');
      response.status(200).json(toSuccessResponse(await dependencies.bootstrap.read(), requestId(request)));
    } catch (error) {
      const mapped = toApiErrorResponse(error, requestId(request));
      response.status(mapped.statusCode).json(mapped.body);
    }
  });
  router.get('/public/sitemap', async (request, response) => {
    try {
      if (!dependencies.sitemap) throw new ApiContractError('PUBLIC_SITEMAP_UNAVAILABLE', 'errors.internal', 503);
      response.setHeader('Cache-Control', 'no-store');
      response.status(200).json(toSuccessResponse(await dependencies.sitemap.read(), requestId(request)));
    } catch (error) {
      const mapped = toApiErrorResponse(error, requestId(request));
      response.status(mapped.statusCode).json(mapped.body);
    }
  });
  router.get('/public/home', async (request, response) => {
    try {
      // Scheduled or disabled banners must not remain visible in cached homepage responses.
      response.setHeader('Cache-Control', 'no-store');
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
      const viewer = optionalViewer(request, dependencies.accessTokens);
      const details = await dependencies.details.get(slug, viewer);
      if (!details) throw new ApiContractError('PROPERTY_NOT_FOUND', 'errors.properties.notFound', 404);
      response.setHeader('Cache-Control', viewer ? 'private, no-store' : 'no-store');
      response.status(200).json(toSuccessResponse(details, currentRequestId));
    } catch (error) {
      const mapped = toApiErrorResponse(error, currentRequestId);
      response.status(mapped.statusCode).json(mapped.body);
    }
  });
  return router;
}
