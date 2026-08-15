import { Router, type Request, type Response } from 'express';
import { notificationListQuerySchema, type NotificationListData, type NotificationReadAllData, type NotificationReadData } from '@sadat-real-estate/contracts';
import type { AccessTokenClaims, AccessTokenService } from '../auth/crypto.js';
import { ApiContractError, toApiErrorResponse } from '../contracts/error-boundary.js';
import { toSuccessResponse } from '../contracts/response.js';
import { getRequestContext } from '../observability/context.js';
import { createAdminRbacAuthMiddleware } from '../rbac/auth.js';
import { createSeekerAuthMiddleware } from '../seeker/auth.js';
import { NotificationServiceError } from './service.js';

export const NOTIFICATION_ROUTE_DEFINITIONS = [
  { method: 'GET', path: '/api/v1/seeker/notifications', operationId: 'listSeekerNotifications' },
  { method: 'POST', path: '/api/v1/seeker/notifications/:notificationId/read', operationId: 'markSeekerNotificationRead' },
  { method: 'POST', path: '/api/v1/seeker/notifications/read-all', operationId: 'markAllSeekerNotificationsRead' },
  { method: 'GET', path: '/api/v1/admin/notifications', operationId: 'listAdminNotifications' },
  { method: 'POST', path: '/api/v1/admin/notifications/:notificationId/read', operationId: 'markAdminNotificationRead' },
  { method: 'POST', path: '/api/v1/admin/notifications/read-all', operationId: 'markAllAdminNotificationsRead' }
] as const;

export interface NotificationRouterDependencies {
  service: {
    list(claims: AccessTokenClaims, query: unknown): Promise<NotificationListData>;
    markRead(claims: AccessTokenClaims, id: unknown): Promise<NotificationReadData>;
    markAllRead(claims: AccessTokenClaims): Promise<NotificationReadAllData>;
    listAdmin(claims: AccessTokenClaims, query: unknown): Promise<NotificationListData>;
    markAdminRead(claims: AccessTokenClaims, id: unknown): Promise<NotificationReadData>;
    markAllAdminRead(claims: AccessTokenClaims): Promise<NotificationReadAllData>;
  };
  accessTokens: AccessTokenService;
}

const errors = {
  NOTIFICATION_FORBIDDEN: { status: 403, key: 'errors.forbidden' },
  NOTIFICATION_NOT_FOUND: { status: 404, key: 'errors.notifications.notFound' }
} as const;

function requestId(request: Request): string { return getRequestContext()?.requestId ?? request.get('x-request-id') ?? 'unknown-request'; }
function seekerClaims(response: Response): AccessTokenClaims { return response.locals.seekerClaims as AccessTokenClaims; }
function adminClaims(response: Response): AccessTokenClaims { return response.locals.adminRbacClaims as AccessTokenClaims; }
function sendError(request: Request, response: Response, error: unknown): void {
  const mapped = error instanceof NotificationServiceError ? errors[error.code] : undefined;
  const body = toApiErrorResponse(mapped ? new ApiContractError(error instanceof NotificationServiceError ? error.code : 'INTERNAL_ERROR', mapped.key, mapped.status) : error, requestId(request));
  response.status(body.statusCode).json(body.body);
}

export function createNotificationRouter(dependencies: NotificationRouterDependencies): Router {
  const router = Router();
  router.use((_request, response, next) => { response.setHeader('Cache-Control', 'no-store'); next(); });
  router.get('/seeker/notifications', createSeekerAuthMiddleware(dependencies.accessTokens), async (request, response) => {
    try {
      const result = await dependencies.service.list(seekerClaims(response), notificationListQuerySchema.parse(request.query));
      response.status(200).json(toSuccessResponse(result, requestId(request), { page: result.page, limit: result.limit, total: result.total }));
    } catch (error) { sendError(request, response, error); }
  });
  router.post('/seeker/notifications/:notificationId/read', createSeekerAuthMiddleware(dependencies.accessTokens), async (request, response) => {
    try {
      const result = await dependencies.service.markRead(seekerClaims(response), request.params.notificationId);
      response.status(200).json(toSuccessResponse(result, requestId(request)));
    } catch (error) { sendError(request, response, error); }
  });
  router.post('/seeker/notifications/read-all', createSeekerAuthMiddleware(dependencies.accessTokens), async (request, response) => {
    try {
      const result = await dependencies.service.markAllRead(seekerClaims(response));
      response.status(200).json(toSuccessResponse(result, requestId(request)));
    } catch (error) { sendError(request, response, error); }
  });

  router.get('/admin/notifications', createAdminRbacAuthMiddleware(dependencies.accessTokens), async (request, response) => {
    try {
      const result = await dependencies.service.listAdmin(adminClaims(response), notificationListQuerySchema.parse(request.query));
      response.status(200).json(toSuccessResponse(result, requestId(request), { page: result.page, limit: result.limit, total: result.total }));
    } catch (error) { sendError(request, response, error); }
  });
  router.post('/admin/notifications/:notificationId/read', createAdminRbacAuthMiddleware(dependencies.accessTokens), async (request, response) => {
    try {
      const result = await dependencies.service.markAdminRead(adminClaims(response), request.params.notificationId);
      response.status(200).json(toSuccessResponse(result, requestId(request)));
    } catch (error) { sendError(request, response, error); }
  });
  router.post('/admin/notifications/read-all', createAdminRbacAuthMiddleware(dependencies.accessTokens), async (request, response) => {
    try {
      const result = await dependencies.service.markAllAdminRead(adminClaims(response));
      response.status(200).json(toSuccessResponse(result, requestId(request)));
    } catch (error) { sendError(request, response, error); }
  });
  return router;
}
