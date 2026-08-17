import { Router, type Request, type Response } from 'express';
import {
  articleAdminListQuerySchema,
  articleCategoryCreateSchema,
  articleCategoryDeleteSchema,
  articleCategoryListQuerySchema,
  articleCategoryParamsSchema,
  articleCategoryPatchSchema,
  articleCreateSchema,
  articleListQuerySchema,
  articleParamsSchema,
  articlePatchSchema,
  articlePublicCategoryListQuerySchema,
  articleSlugSchema,
  articleTransitionRequestSchema,
  supportedLocaleSchema,
  type ArticleAdminListQuery,
  type ArticleCategoryCreate,
  type ArticleCategoryDelete,
  type ArticleCategoryListQuery,
  type ArticleCategoryPatch,
  type ArticleCreate,
  type ArticleListQuery,
  type ArticlePatch,
  type ArticlePublicCategoryListQuery,
  type ArticleTransitionRequest
} from '@sadat-real-estate/contracts';
import type { AccessTokenClaims, AccessTokenService } from '../auth/crypto.js';
import { ApiContractError, toApiErrorResponse } from '../contracts/error-boundary.js';
import { toSuccessResponse } from '../contracts/response.js';
import { getRequestContext } from '../observability/context.js';
import { createAdminRbacAuthMiddleware } from '../rbac/auth.js';
import {
  ArticleServiceError,
  type ArticleMutationContext,
  type ArticlePrincipal,
  type ArticleService
} from './service.js';

export const ARTICLE_ROUTE_DEFINITIONS = [
  { method: 'GET', path: '/api/v1/admin/article-categories', operationId: 'listAdminArticleCategories' },
  { method: 'POST', path: '/api/v1/admin/article-categories', operationId: 'createAdminArticleCategory' },
  { method: 'PATCH', path: '/api/v1/admin/article-categories/:categoryId', operationId: 'updateAdminArticleCategory' },
  { method: 'DELETE', path: '/api/v1/admin/article-categories/:categoryId', operationId: 'deleteAdminArticleCategory' },
  { method: 'GET', path: '/api/v1/admin/articles', operationId: 'listAdminArticles' },
  { method: 'POST', path: '/api/v1/admin/articles', operationId: 'createAdminArticle' },
  { method: 'PATCH', path: '/api/v1/admin/articles/:articleId', operationId: 'updateAdminArticle' },
  { method: 'POST', path: '/api/v1/admin/articles/:articleId/transitions', operationId: 'transitionAdminArticle' },
  { method: 'GET', path: '/api/v1/public/article-categories', operationId: 'listPublicArticleCategories' },
  { method: 'GET', path: '/api/v1/public/articles', operationId: 'listPublicArticles' },
  { method: 'GET', path: '/api/v1/public/articles/:slug', operationId: 'getPublicArticle' }
] as const;

export interface ArticleRouterDependencies {
  service: ArticleService;
  accessTokens: AccessTokenService;
}

const ERROR_MAP: Record<string, { statusCode: number; messageKey: string }> = {
  ARTICLE_FORBIDDEN: { statusCode: 403, messageKey: 'errors.articles.forbidden' },
  ARTICLE_CATEGORY_NOT_FOUND: { statusCode: 404, messageKey: 'errors.articles.categoryNotFound' },
  ARTICLE_CATEGORY_SLUG_EXISTS: { statusCode: 409, messageKey: 'errors.articles.categorySlugExists' },
  ARTICLE_CATEGORY_IN_USE: { statusCode: 409, messageKey: 'errors.articles.categoryInUse' },
  ARTICLE_CATEGORY_INACTIVE: { statusCode: 409, messageKey: 'errors.articles.categoryInactive' },
  ARTICLE_NOT_FOUND: { statusCode: 404, messageKey: 'errors.articles.notFound' },
  ARTICLE_SLUG_EXISTS: { statusCode: 409, messageKey: 'errors.articles.slugExists' },
  ARTICLE_VERSION_CONFLICT: { statusCode: 409, messageKey: 'errors.articles.versionConflict' },
  ARTICLE_TRANSITION_INVALID: { statusCode: 409, messageKey: 'errors.articles.transitionInvalid' }
};

function context(request: Request): ArticleMutationContext {
  const current = getRequestContext();
  return {
    requestId: current?.requestId ?? request.get('x-request-id') ?? 'unknown-request',
    traceId: current?.traceId ?? 'f'.repeat(32)
  };
}

function principal(response: Response): ArticlePrincipal {
  return { userId: (response.locals.adminRbacClaims as AccessTokenClaims).sub };
}

function sendError(request: Request, response: Response, error: unknown): void {
  const articleError = error instanceof ArticleServiceError ? error : undefined;
  const definition = articleError ? ERROR_MAP[articleError.code] : undefined;
  const current = context(request);
  const mapped = toApiErrorResponse(
    definition
      ? new ApiContractError(articleError!.code, definition.messageKey, definition.statusCode)
      : error,
    current.requestId
  );
  response.status(mapped.statusCode).json(mapped.body);
}

export function createArticleRouter(dependencies: ArticleRouterDependencies): Router {
  const router = Router();
  router.use(['/admin/article-categories', '/admin/articles'], (_request, response, next) => {
    response.setHeader('Cache-Control', 'no-store');
    next();
  });
  router.use('/admin/article-categories', createAdminRbacAuthMiddleware(dependencies.accessTokens));
  router.use('/admin/articles', createAdminRbacAuthMiddleware(dependencies.accessTokens));

  router.get('/admin/article-categories', async (request, response) => {
    try {
      const query: ArticleCategoryListQuery = articleCategoryListQuerySchema.parse(request.query);
      const result = await dependencies.service.listCategories(principal(response), query);
      response.status(200).json(toSuccessResponse(result.data, context(request).requestId, {
        page: result.page,
        limit: result.limit,
        total: result.total
      }));
    } catch (error) { sendError(request, response, error); }
  });

  router.post('/admin/article-categories', async (request, response) => {
    try {
      const input: ArticleCategoryCreate = articleCategoryCreateSchema.parse(request.body ?? {});
      const current = context(request);
      response.status(201).json(toSuccessResponse(
        await dependencies.service.createCategory(principal(response), input, current),
        current.requestId
      ));
    } catch (error) { sendError(request, response, error); }
  });

  router.patch('/admin/article-categories/:categoryId', async (request, response) => {
    try {
      const { categoryId } = articleCategoryParamsSchema.parse(request.params);
      const input: ArticleCategoryPatch = articleCategoryPatchSchema.parse(request.body ?? {});
      const current = context(request);
      response.status(200).json(toSuccessResponse(
        await dependencies.service.updateCategory(principal(response), categoryId, input, current),
        current.requestId
      ));
    } catch (error) { sendError(request, response, error); }
  });

  router.delete('/admin/article-categories/:categoryId', async (request, response) => {
    try {
      const { categoryId } = articleCategoryParamsSchema.parse(request.params);
      const input: ArticleCategoryDelete = articleCategoryDeleteSchema.parse(request.body ?? {});
      const current = context(request);
      response.status(200).json(toSuccessResponse(
        await dependencies.service.deleteCategory(principal(response), categoryId, input, current),
        current.requestId
      ));
    } catch (error) { sendError(request, response, error); }
  });

  router.get('/admin/articles', async (request, response) => {
    try {
      const query: ArticleAdminListQuery = articleAdminListQuerySchema.parse(request.query);
      const result = await dependencies.service.listArticles(principal(response), query);
      response.status(200).json(toSuccessResponse(result.data, context(request).requestId, {
        page: result.page,
        limit: result.limit,
        total: result.total
      }));
    } catch (error) { sendError(request, response, error); }
  });

  router.post('/admin/articles', async (request, response) => {
    try {
      const input: ArticleCreate = articleCreateSchema.parse(request.body ?? {});
      const current = context(request);
      response.status(201).json(toSuccessResponse(
        await dependencies.service.createArticle(principal(response), input, current),
        current.requestId
      ));
    } catch (error) { sendError(request, response, error); }
  });

  router.patch('/admin/articles/:articleId', async (request, response) => {
    try {
      const { articleId } = articleParamsSchema.parse(request.params);
      const input: ArticlePatch = articlePatchSchema.parse(request.body ?? {});
      const current = context(request);
      response.status(200).json(toSuccessResponse(
        await dependencies.service.updateArticle(principal(response), articleId, input, current),
        current.requestId
      ));
    } catch (error) { sendError(request, response, error); }
  });

  router.post('/admin/articles/:articleId/transitions', async (request, response) => {
    try {
      const { articleId } = articleParamsSchema.parse(request.params);
      const input: ArticleTransitionRequest = articleTransitionRequestSchema.parse(request.body ?? {});
      const current = context(request);
      response.status(200).json(toSuccessResponse(
        await dependencies.service.transitionArticle(principal(response), articleId, input, current),
        current.requestId
      ));
    } catch (error) { sendError(request, response, error); }
  });

  router.get('/public/article-categories', async (request, response) => {
    try {
      const query: ArticlePublicCategoryListQuery = articlePublicCategoryListQuerySchema.parse(request.query);
      const data = await dependencies.service.listPublicCategories(query);
      response.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
      response.status(200).json(toSuccessResponse(
        data,
        context(request).requestId
      ));
    } catch (error) { sendError(request, response, error); }
  });

  router.get('/public/articles', async (request, response) => {
    try {
      const query: ArticleListQuery = articleListQuerySchema.parse(request.query);
      const result = await dependencies.service.listPublic(query);
      response.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
      response.status(200).json(toSuccessResponse(result.data, context(request).requestId, {
        page: result.page,
        limit: result.limit,
        total: result.total
      }));
    } catch (error) { sendError(request, response, error); }
  });

  router.get('/public/articles/:slug', async (request, response) => {
    try {
      const slug = articleSlugSchema.parse(request.params.slug);
      const locale = supportedLocaleSchema.parse(request.query.locale ?? 'ar');
      const data = await dependencies.service.getPublicBySlug(slug, locale);
      response.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
      response.status(200).json(toSuccessResponse(
        data,
        context(request).requestId
      ));
    } catch (error) { sendError(request, response, error); }
  });

  return router;
}
