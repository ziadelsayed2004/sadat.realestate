import { Router, type Request, type Response } from 'express';
import { notificationListQuerySchema, type NotificationListData, type NotificationReadAllData, type NotificationReadData } from '@sadat-real-estate/contracts';
import type { AccessTokenClaims, AccessTokenService } from '../auth/crypto.js';
import { ApiContractError, toApiErrorResponse } from '../contracts/error-boundary.js';
import { toSuccessResponse } from '../contracts/response.js';
import { getRequestContext } from '../observability/context.js';
import { createSeekerAuthMiddleware } from '../seeker/auth.js';
import { NotificationServiceError } from './service.js';

export const NOTIFICATION_ROUTE_DEFINITIONS = [
  { method: 'GET', path: '/api/v1/seeker/notifications', operationId: 'listSeekerNotifications' },
  { method: 'POST', path: '/api/v1/seeker/notifications/:notificationId/read', operationId: 'markSeekerNotificationRead' },
  { method: 'POST', path: '/api/v1/seeker/notifications/read-all', operationId: 'markAllSeekerNotificationsRead' }
] as const;

export interface NotificationRouterDependencies {
  service: {
    list(claims: AccessTokenClaims, query: unknown): Promise<NotificationListData>;
    markRead(claims: AccessTokenClaims, id: unknown): Promise<NotificationReadData>;
    markAllRead(claims: AccessTokenClaims): Promise<NotificationReadAllData>;
  };
  accessTokens: AccessTokenService;
}

const errors = {
  NOTIFICATION_FORBIDDEN: { status: 403, key: 'errors.forbidden' },
  NOTIFICATION_NOT_FOUND: { status: 404, key: 'errors.notifications.notFound' }
} as const;

function requestId(request: Request): string { return getRequestContext()?.requestId ?? request.get('x-request-id') ?? 'unknown-request'; }
function claims(response: Response): AccessTokenClaims { return response.locals.seekerClaims as AccessTokenClaims; }
function sendError(request: Request, response: Response, error: unknown): void {
  const mapped = error instanceof NotificationServiceError ? errors[error.code] : undefined;
  const body = toApiErrorResponse(mapped ? new ApiContractError(error instanceof NotificationServiceError ? error.code : 'INTERNAL_ERROR', mapped.key, mapped.status) : error, requestId(request));
  response.status(body.statusCode).json(body.body);
}

export function createNotificationRouter(dependencies: NotificationRouterDependencies): Router {
  const router = Router();
  router.use((_request, response, next) => { response.setHeader('Cache-Control', 'no-store'); next(); });
  router.use(createSeekerAuthMiddleware(dependencies.accessTokens));
  router.get('/seeker/notifications', async (request, response) => {
    try {
      const result = await dependencies.service.list(claims(response), notificationListQuerySchema.parse(request.query));
      response.status(200).json(toSuccessResponse(result, requestId(request), { page: result.page, limit: result.limit, total: result.total }));
    } catch (error) { sendError(request, response, error); }
  });
  router.post('/seeker/notifications/:notificationId/read', async (request, response) => {
    try {
      const result = await dependencies.service.markRead(claims(response), request.params.notificationId);
      response.status(200).json(toSuccessResponse(result, requestId(request)));
    } catch (error) { sendError(request, response, error); }
  });
  router.post('/seeker/notifications/read-all', async (request, response) => {
    try {
      const result = await dependencies.service.markAllRead(claims(response));
      response.status(200).json(toSuccessResponse(result, requestId(request)));
    } catch (error) { sendError(request, response, error); }
  });
  return router;
}
