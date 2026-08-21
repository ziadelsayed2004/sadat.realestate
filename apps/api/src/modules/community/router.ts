import { Router, type Request, type RequestHandler, type Response } from 'express';
import {
  communityCommentCreateRequestSchema,
  communityCommentMutationDataSchema,
  communityCommentMutationSuccessEnvelopeSchema,
  communityAdminPostListQuerySchema,
  communityAdminPostListSuccessEnvelopeSchema,
  communityAdminCommentListQuerySchema,
  communityAdminCommentListSuccessEnvelopeSchema,
  communityAdminReportListQuerySchema,
  communityAdminReportListSuccessEnvelopeSchema,
  communityAdminReportResolveSuccessEnvelopeSchema,
  communityPostCreateSchema,
  communityPostIdParamsSchema,
  communityPostMutationDataSchema,
  communityPostMutationSuccessEnvelopeSchema,
  communityPublicListQuerySchema,
  communityPublicPostDetailSuccessEnvelopeSchema,
  communityPublicPostListSuccessEnvelopeSchema,
  communityReportCreateRequestSchema,
  communityReportDataSchema,
  communityReportIdParamsSchema,
  communityReportResolveSchema,
  communityReportSuccessEnvelopeSchema
} from '@sadat-real-estate/contracts';
import type { AccessTokenClaims, AccessTokenService } from '../auth/crypto.js';
import { ApiContractError, toApiErrorResponse } from '../contracts/error-boundary.js';
import { toSuccessResponse } from '../contracts/response.js';
import { getRequestContext } from '../observability/context.js';
import { createAdminRbacAuthMiddleware } from '../rbac/auth.js';
import type { CommunityReportService } from './report-service.js';
import type { CommunityService } from './service.js';

export const COMMUNITY_ROUTE_DEFINITIONS = [
  { method: 'GET', path: '/api/v1/public/community/posts', operationId: 'listPublicCommunityPosts' },
  { method: 'GET', path: '/api/v1/public/community/posts/:postId', operationId: 'getPublicCommunityPost' },
  { method: 'POST', path: '/api/v1/public/community/posts', operationId: 'createCommunityPost' },
  { method: 'POST', path: '/api/v1/public/community/posts/:postId/comments', operationId: 'createCommunityComment' },
  { method: 'POST', path: '/api/v1/public/community/posts/:postId/reports', operationId: 'createCommunityReport' },
  { method: 'GET', path: '/api/v1/admin/community/posts', operationId: 'listAdminCommunityPosts' },
  { method: 'GET', path: '/api/v1/admin/community/comments', operationId: 'listAdminCommunityComments' },
  { method: 'GET', path: '/api/v1/admin/community/reports', operationId: 'listAdminCommunityReports' },
  { method: 'POST', path: '/api/v1/admin/community/reports/:reportId/resolve', operationId: 'resolveAdminCommunityReport' }
] as const;

export interface CommunityRouterDependencies {
  service: CommunityService;
  reports: CommunityReportService;
  accessTokens: AccessTokenService;
}

function requestId(request: Request): string {
  return getRequestContext()?.requestId ?? request.get('x-request-id') ?? 'unknown-request';
}

function claims(response: Response): AccessTokenClaims {
  return response.locals.communityClaims as AccessTokenClaims;
}

function adminClaims(response: Response): AccessTokenClaims {
  return response.locals.adminRbacClaims as AccessTokenClaims;
}

function bearer(request: Request): string | undefined {
  const header = request.get('authorization')?.trim();
  if (!header || !/^Bearer\s+/iu.test(header)) return undefined;
  const token = header.replace(/^Bearer\s+/iu, '').trim();
  return token || undefined;
}

function authenticated(accessTokens: AccessTokenService): RequestHandler {
  return (request, response, next) => {
    const token = bearer(request);
    if (!token) {
      const mapped = toApiErrorResponse(new ApiContractError('AUTHENTICATION_REQUIRED', 'errors.authenticationRequired', 401), requestId(request));
      response.status(mapped.statusCode).json(mapped.body);
      return;
    }
    try {
      const current = accessTokens.verify(token);
      if (current.status !== 'verified' || !['seeker', 'provider', 'admin'].includes(current.role)) throw new Error('forbidden');
      response.locals.communityClaims = current;
      next();
    } catch {
      const mapped = toApiErrorResponse(new ApiContractError('FORBIDDEN', 'errors.forbidden', 403), requestId(request));
      response.status(mapped.statusCode).json(mapped.body);
    }
  };
}

function sendError(request: Request, response: Response, error: unknown): void {
  const code = error instanceof Error ? error.message : '';
  const known: Record<string, { statusCode: number; messageKey: string }> = {
    FORBIDDEN: { statusCode: 403, messageKey: 'errors.forbidden' },
    NOT_FOUND: { statusCode: 404, messageKey: 'errors.communityNotFound' },
    INVALID_STATE: { statusCode: 409, messageKey: 'errors.communityInvalidState' },
    DUPLICATE: { statusCode: 409, messageKey: 'errors.communityReportDuplicate' }
    ,VERSION_CONFLICT: { statusCode: 409, messageKey: 'errors.communityReportVersionConflict' }
  };
  const definition = known[code];
  const mapped = toApiErrorResponse(
    definition ? new ApiContractError(code, definition.messageKey, definition.statusCode) : error,
    requestId(request)
  );
  response.status(mapped.statusCode).json(mapped.body);
}

function postMutationData(post: Awaited<ReturnType<CommunityService['create']>>) {
  return {
    id: post.id,
    status: post.status,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt
  };
}

function commentMutationData(comment: Awaited<ReturnType<CommunityService['createComment']>>) {
  return {
    id: comment.id,
    postId: comment.postId,
    depth: comment.depth,
    createdAt: comment.createdAt
  };
}

export function createCommunityRouter(dependencies: CommunityRouterDependencies): Router {
  const router = Router();
  const auth = authenticated(dependencies.accessTokens);
  router.use('/admin/community/posts', createAdminRbacAuthMiddleware(dependencies.accessTokens));
  router.use('/admin/community/comments', createAdminRbacAuthMiddleware(dependencies.accessTokens));

  router.get('/public/community/posts', async (request, response) => {
    try {
      const query = communityPublicListQuerySchema.parse(request.query);
      const data = await dependencies.service.publicPage(query);
      communityPublicPostListSuccessEnvelopeSchema.parse(toSuccessResponse(data, requestId(request), {
        page: data.page,
        limit: data.limit,
        total: data.total
      }));
      response.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=120');
      response.status(200).json(toSuccessResponse(data, requestId(request), { page: data.page, limit: data.limit, total: data.total }));
    } catch (error) { sendError(request, response, error); }
  });

  router.get('/public/community/posts/:postId', async (request, response) => {
    try {
      const { postId } = communityPostIdParamsSchema.parse(request.params);
      const data = await dependencies.service.publicDetail(postId);
      if (!data) throw new Error('NOT_FOUND');
      communityPublicPostDetailSuccessEnvelopeSchema.parse(toSuccessResponse(data, requestId(request)));
      response.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=120');
      response.status(200).json(toSuccessResponse(data, requestId(request)));
    } catch (error) { sendError(request, response, error); }
  });

  router.post('/public/community/posts', auth, async (request, response) => {
    try {
      const post = await dependencies.service.create(claims(response), communityPostCreateSchema.parse(request.body ?? {}));
      const data = communityPostMutationDataSchema.parse(postMutationData(post));
      communityPostMutationSuccessEnvelopeSchema.parse(toSuccessResponse(data, requestId(request)));
      response.setHeader('Cache-Control', 'no-store');
      response.status(201).json(toSuccessResponse(data, requestId(request)));
    } catch (error) { sendError(request, response, error); }
  });

  router.post('/public/community/posts/:postId/comments', auth, async (request, response) => {
    try {
      const { postId } = communityPostIdParamsSchema.parse(request.params);
      const input = communityCommentCreateRequestSchema.parse(request.body ?? {});
      const comment = await dependencies.service.createComment(claims(response), { ...input, postId });
      const data = communityCommentMutationDataSchema.parse(commentMutationData(comment));
      communityCommentMutationSuccessEnvelopeSchema.parse(toSuccessResponse(data, requestId(request)));
      response.setHeader('Cache-Control', 'no-store');
      response.status(201).json(toSuccessResponse(data, requestId(request)));
    } catch (error) { sendError(request, response, error); }
  });

  router.post('/public/community/posts/:postId/reports', auth, async (request, response) => {
    try {
      const { postId } = communityPostIdParamsSchema.parse(request.params);
      const input = communityReportCreateRequestSchema.parse(request.body ?? {});
      const context = getRequestContext();
      const data = communityReportDataSchema.parse(await dependencies.reports.create(claims(response), { ...input, postId }, context === undefined ? undefined : { requestId: requestId(request), traceId: context.traceId }));
      communityReportSuccessEnvelopeSchema.parse(toSuccessResponse(data, requestId(request)));
      response.setHeader('Cache-Control', 'no-store');
      response.status(201).json(toSuccessResponse(data, requestId(request)));
    } catch (error) { sendError(request, response, error); }
  });

  router.get('/admin/community/posts', async (request, response) => {
    try {
      const query = communityAdminPostListQuerySchema.parse(request.query);
      const data = await dependencies.service.adminPage(adminClaims(response), query);
      const body = toSuccessResponse(data, requestId(request), { page: data.page, limit: data.limit, total: data.total });
      communityAdminPostListSuccessEnvelopeSchema.parse(body);
      response.setHeader('Cache-Control', 'no-store');
      response.status(200).json(body);
    } catch (error) { sendError(request, response, error); }
  });

  router.get('/admin/community/comments', async (request, response) => {
    try {
      const query = communityAdminCommentListQuerySchema.parse(request.query);
      const data = await dependencies.service.adminCommentsPage(adminClaims(response), query);
      const body = toSuccessResponse(data, requestId(request), { page: data.page, limit: data.limit, total: data.total });
      communityAdminCommentListSuccessEnvelopeSchema.parse(body);
      response.setHeader('Cache-Control', 'no-store');
      response.status(200).json(body);
    } catch (error) { sendError(request, response, error); }
  });

  router.use('/admin/community/reports', createAdminRbacAuthMiddleware(dependencies.accessTokens));

  router.get('/admin/community/reports', async (request, response) => {
    try {
      const query = communityAdminReportListQuerySchema.parse(request.query);
      const data = await dependencies.reports.adminList(adminClaims(response), query);
      const body = toSuccessResponse(data, requestId(request), { page: data.page, limit: data.limit, total: data.total });
      communityAdminReportListSuccessEnvelopeSchema.parse(body);
      response.setHeader('Cache-Control', 'no-store');
      response.status(200).json(body);
    } catch (error) { sendError(request, response, error); }
  });

  router.post('/admin/community/reports/:reportId/resolve', async (request, response) => {
    try {
      const { reportId } = communityReportIdParamsSchema.parse(request.params);
      const input = communityReportResolveSchema.parse(request.body ?? {});
      const context = getRequestContext();
      const data = await dependencies.reports.resolve(adminClaims(response), reportId, input, context === undefined ? undefined : { requestId: requestId(request), traceId: context.traceId });
      const body = toSuccessResponse(data, requestId(request));
      communityAdminReportResolveSuccessEnvelopeSchema.parse(body);
      response.setHeader('Cache-Control', 'no-store');
      response.status(200).json(body);
    } catch (error) { sendError(request, response, error); }
  });

  return router;
}
