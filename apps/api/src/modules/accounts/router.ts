import { Router, type Request, type RequestHandler, type Response } from 'express';
import {
  accountTransitionRequestSchema,
  accountUserIdParamsSchema,
  adminAccountUserListQuerySchema,
  adminProviderListQuerySchema,
  providerReviewIdParamsSchema,
  providerReviewRequestSchema
} from '@sadat-real-estate/contracts';
import type { AccessTokenClaims, AccessTokenService } from '../auth/crypto.js';
import { ApiContractError, toApiErrorResponse } from '../contracts/error-boundary.js';
import { toSuccessResponse } from '../contracts/response.js';
import { getRequestContext } from '../observability/context.js';
import { createAdminRbacAuthMiddleware } from '../rbac/auth.js';
import { AccountServiceError, type AccountService } from './service.js';

export const ACCOUNT_ROUTE_DEFINITIONS = [
  {
    method: 'GET',
    path: '/api/v1/admin/users',
    operationId: 'listAdminUsers'
  },
  {
    method: 'GET',
    path: '/api/v1/admin/users/:userId',
    operationId: 'getAdminUser'
  },
  {
    method: 'GET',
    path: '/api/v1/admin/providers',
    operationId: 'listAdminProviders'
  },
  {
    method: 'GET',
    path: '/api/v1/admin/providers/:providerId',
    operationId: 'getAdminProvider'
  },
  {
    method: 'POST',
    path: '/api/v1/admin/users/:userId/transitions',
    operationId: 'transitionAdminUserAccount'
  },
  {
    method: 'POST',
    path: '/api/v1/admin/providers/:providerId/review',
    operationId: 'reviewAdminProviderAccount'
  }
] as const;

export interface AccountRouterDependencies {
  service: AccountService;
  accessTokens: AccessTokenService;
  accessGuard?: RequestHandler;
}

const ACCOUNT_ERROR_MAP = Object.freeze({
  ACCOUNT_FORBIDDEN: { statusCode: 403, messageKey: 'errors.accounts.forbidden' },
  ACCOUNT_NOT_FOUND: { statusCode: 404, messageKey: 'errors.accounts.notFound' },
  ACCOUNT_SELF_TRANSITION_FORBIDDEN: {
    statusCode: 403,
    messageKey: 'errors.accounts.selfTransitionForbidden'
  },
  ACCOUNT_ADMIN_TARGET_FORBIDDEN: {
    statusCode: 403,
    messageKey: 'errors.accounts.adminTargetForbidden'
  },
  ACCOUNT_PROVIDER_REVIEW_REQUIRED: {
    statusCode: 409,
    messageKey: 'errors.accounts.providerReviewRequired'
  },
  ACCOUNT_TRANSITION_INVALID: {
    statusCode: 409,
    messageKey: 'errors.accounts.transitionInvalid'
  },
  ACCOUNT_STATE_INCONSISTENT: {
    statusCode: 409,
    messageKey: 'errors.accounts.stateInconsistent'
  },
  ACCOUNT_TRANSITION_CONFLICT: {
    statusCode: 409,
    messageKey: 'errors.accounts.transitionConflict'
  }
});

function requestContext(request: Request): { requestId: string; traceId: string } {
  const context = getRequestContext();
  return {
    requestId: context?.requestId ?? request.get('x-request-id') ?? 'unknown-request',
    traceId: context?.traceId ?? 'unknown-trace'
  };
}

function sendError(request: Request, response: Response, error: unknown): void {
  const accountError = error instanceof AccountServiceError ? error : undefined;
  const definition = accountError ? ACCOUNT_ERROR_MAP[accountError.code] : undefined;
  const context = requestContext(request);
  const mapped = toApiErrorResponse(
    definition
      ? new ApiContractError(
          accountError!.code,
          definition.messageKey,
          definition.statusCode
        )
      : error,
    context.requestId
  );
  response.status(mapped.statusCode).json(mapped.body);
}

function principal(response: Response): { userId: string } {
  const claims = response.locals.adminRbacClaims as AccessTokenClaims;
  return { userId: claims.sub };
}

export function createAccountRouter(dependencies: AccountRouterDependencies): Router {
  const router = Router();
  router.use((_request, response, next) => {
    response.setHeader('Cache-Control', 'no-store');
    next();
  });
  const authenticate = createAdminRbacAuthMiddleware(dependencies.accessTokens);
  router.use('/admin/users', authenticate);
  router.use('/admin/providers', authenticate);

  router.get('/admin/users', async (request, response) => {
    try {
      const context = requestContext(request);
      response.status(200).json(toSuccessResponse(
        await dependencies.service.listUsers(principal(response), adminAccountUserListQuerySchema.parse(request.query)),
        context.requestId
      ));
    } catch (error) {
      sendError(request, response, error);
    }
  });

  router.get('/admin/users/:userId', async (request, response) => {
    try {
      const context = requestContext(request);
      const { userId } = accountUserIdParamsSchema.parse(request.params);
      response.status(200).json(toSuccessResponse(
        await dependencies.service.getUser(principal(response), userId),
        context.requestId
      ));
    } catch (error) {
      sendError(request, response, error);
    }
  });

  router.get('/admin/providers', async (request, response) => {
    try {
      const context = requestContext(request);
      response.status(200).json(toSuccessResponse(
        await dependencies.service.listProviders(principal(response), adminProviderListQuerySchema.parse(request.query)),
        context.requestId
      ));
    } catch (error) {
      sendError(request, response, error);
    }
  });

  router.get('/admin/providers/:providerId', async (request, response) => {
    try {
      const context = requestContext(request);
      const { providerId } = providerReviewIdParamsSchema.parse(request.params);
      response.status(200).json(toSuccessResponse(
        await dependencies.service.getProvider(principal(response), providerId),
        context.requestId
      ));
    } catch (error) {
      sendError(request, response, error);
    }
  });

  router.post('/admin/users/:userId/transitions', async (request, response) => {
    try {
      const { userId } = accountUserIdParamsSchema.parse(request.params);
      const input = accountTransitionRequestSchema.parse(request.body ?? {});
      const context = requestContext(request);
      response.status(200).json(toSuccessResponse(
        await dependencies.service.transitionAccount(
          principal(response),
          userId,
          input,
          context
        ),
        context.requestId
      ));
    } catch (error) {
      sendError(request, response, error);
    }
  });

  router.post('/admin/providers/:providerId/review', async (request, response) => {
    try {
      const { providerId } = providerReviewIdParamsSchema.parse(request.params);
      const input = providerReviewRequestSchema.parse(request.body ?? {});
      const context = requestContext(request);
      response.status(200).json(toSuccessResponse(
        await dependencies.service.reviewProvider(
          principal(response),
          providerId,
          input,
          context
        ),
        context.requestId
      ));
    } catch (error) {
      sendError(request, response, error);
    }
  });

  return router;
}
