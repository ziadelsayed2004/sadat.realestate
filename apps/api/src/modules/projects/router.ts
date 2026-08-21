import { Router, type Request, type Response } from 'express';
import { projectCreateSchema, projectIdParamsSchema, projectListQuerySchema, projectPatchSchema, projectReviewRequestSchema, projectSubmitRequestSchema, type ProjectCreate, type ProjectData, type ProjectListData, type ProjectListQuery, type ProjectPatch, type ProjectReviewRequest, type ProjectSubmitRequest } from '@sadat-real-estate/contracts';
import type { AccessTokenClaims, AccessTokenService } from '../auth/crypto.js';
import { ApiContractError, toApiErrorResponse } from '../contracts/error-boundary.js';
import { toSuccessResponse } from '../contracts/response.js';
import { getRequestContext } from '../observability/context.js';
import { createAdminRbacAuthMiddleware } from '../rbac/auth.js';
import { createProviderAuthMiddleware } from '../provider/auth.js';
import { ProjectServiceError, type ProjectMutationContext } from './service.js';

export const PROJECT_ROUTE_DEFINITIONS = [
  { method: 'GET', path: '/api/v1/provider/projects', operationId: 'listProviderProjects' },
  { method: 'POST', path: '/api/v1/provider/projects', operationId: 'createProviderProject' },
  { method: 'PATCH', path: '/api/v1/provider/projects/:projectId', operationId: 'updateProviderProject' },
  { method: 'POST', path: '/api/v1/provider/projects/:projectId/submit', operationId: 'submitProviderProject' },
  { method: 'GET', path: '/api/v1/admin/projects', operationId: 'listAdminProjects' },
  { method: 'POST', path: '/api/v1/admin/projects/:projectId/review', operationId: 'reviewAdminProject' }
] as const;

export interface ProjectRouterDependencies {
  service: {
    list(claims: AccessTokenClaims, query: ProjectListQuery): Promise<{ data: ProjectListData; page: number; limit: number; total: number }>;
    listAdmin(claims: AccessTokenClaims, query: ProjectListQuery): Promise<{ data: ProjectListData; page: number; limit: number; total: number }>;
    create(claims: AccessTokenClaims, input: ProjectCreate, context: ProjectMutationContext): Promise<ProjectData>;
    update(claims: AccessTokenClaims, id: string, input: ProjectPatch, context: ProjectMutationContext): Promise<ProjectData>;
    submit(claims: AccessTokenClaims, id: string, input: ProjectSubmitRequest, context: ProjectMutationContext): Promise<ProjectData>;
    review(adminId: string, id: string, input: ProjectReviewRequest, context: ProjectMutationContext): Promise<ProjectData>;
  };
  accessTokens: AccessTokenService;
}

const ERROR_MAP: Record<string, { statusCode: number; messageKey: string }> = {
  PROJECT_FORBIDDEN: { statusCode: 403, messageKey: 'errors.projects.forbidden' },
  PROJECT_NOT_FOUND: { statusCode: 404, messageKey: 'errors.projects.notFound' },
  PROJECT_SLUG_EXISTS: { statusCode: 409, messageKey: 'errors.projects.slugExists' },
  PROJECT_VERSION_CONFLICT: { statusCode: 409, messageKey: 'errors.projects.versionConflict' },
  PROJECT_TRANSITION_INVALID: { statusCode: 409, messageKey: 'errors.projects.transitionInvalid' }
};

function context(request: Request): ProjectMutationContext {
  const current = getRequestContext();
  return { requestId: current?.requestId ?? request.get('x-request-id') ?? 'unknown-request', traceId: current?.traceId ?? 'f'.repeat(32) };
}
function providerClaims(response: Response): AccessTokenClaims { return response.locals.providerClaims as AccessTokenClaims; }
function adminClaims(response: Response): AccessTokenClaims { return response.locals.adminRbacClaims as AccessTokenClaims; }
function adminId(response: Response): string { return (response.locals.adminRbacClaims as AccessTokenClaims).sub; }
function sendError(request: Request, response: Response, error: unknown): void {
  const projectError = error instanceof ProjectServiceError ? error : undefined;
  const definition = projectError ? ERROR_MAP[projectError.code] : undefined;
  const mapped = toApiErrorResponse(definition ? new ApiContractError(projectError!.code, definition.messageKey, definition.statusCode) : error, context(request).requestId);
  response.status(mapped.statusCode).json(mapped.body);
}

export function createProjectRouter(dependencies: ProjectRouterDependencies): Router {
  const router = Router();
  router.use((_request, response, next) => { response.setHeader('Cache-Control', 'no-store'); next(); });
  router.use('/provider/projects', createProviderAuthMiddleware(dependencies.accessTokens));
  router.use('/provider/projects', (request, response, next) => {
    const claims = response.locals.providerClaims as AccessTokenClaims;
    if (claims.status !== 'verified') { sendError(request, response, new ApiContractError('FORBIDDEN', 'errors.forbidden', 403)); return; }
    next();
  });
  router.use('/admin/projects', createAdminRbacAuthMiddleware(dependencies.accessTokens));

  router.get('/provider/projects', async (request, response) => {
    try {
      const query = projectListQuerySchema.parse(request.query);
      const result = await dependencies.service.list(providerClaims(response), query);
      response.status(200).json(toSuccessResponse(result.data, context(request).requestId, { page: result.page, limit: result.limit, total: result.total }));
    } catch (error) { sendError(request, response, error); }
  });
  router.post('/provider/projects', async (request, response) => {
    try { const current = context(request); response.status(201).json(toSuccessResponse(await dependencies.service.create(providerClaims(response), projectCreateSchema.parse(request.body ?? {}), current), current.requestId)); }
    catch (error) { sendError(request, response, error); }
  });
  router.patch('/provider/projects/:projectId', async (request, response) => {
    try { const { projectId } = projectIdParamsSchema.parse(request.params); const current = context(request); response.status(200).json(toSuccessResponse(await dependencies.service.update(providerClaims(response), projectId, projectPatchSchema.parse(request.body ?? {}), current), current.requestId)); }
    catch (error) { sendError(request, response, error); }
  });
  router.post('/provider/projects/:projectId/submit', async (request, response) => {
    try { const { projectId } = projectIdParamsSchema.parse(request.params); const current = context(request); response.status(200).json(toSuccessResponse(await dependencies.service.submit(providerClaims(response), projectId, projectSubmitRequestSchema.parse(request.body ?? {}), current), current.requestId)); }
    catch (error) { sendError(request, response, error); }
  });
  router.get('/admin/projects', async (request, response) => {
    try {
      const query = projectListQuerySchema.parse(request.query);
      const result = await dependencies.service.listAdmin(adminClaims(response), query);
      response.status(200).json(toSuccessResponse(result.data, context(request).requestId, { page: result.page, limit: result.limit, total: result.total }));
    } catch (error) { sendError(request, response, error); }
  });
  router.post('/admin/projects/:projectId/review', async (request, response) => {
    try { const { projectId } = projectIdParamsSchema.parse(request.params); const current = context(request); response.status(200).json(toSuccessResponse(await dependencies.service.review(adminId(response), projectId, projectReviewRequestSchema.parse(request.body ?? {}), current), current.requestId)); }
    catch (error) { sendError(request, response, error); }
  });
  return router;
}
