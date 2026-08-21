import { Router, type Request, type Response } from 'express';
import type { AccessTokenClaims, AccessTokenService } from '../auth/crypto.js';
import { ApiContractError, toApiErrorResponse } from '../contracts/error-boundary.js';
import { toSuccessResponse } from '../contracts/response.js';
import { getRequestContext } from '../observability/context.js';
import { createAdminRbacAuthMiddleware } from '../rbac/auth.js';
import { AdvertisingLedgerServiceError, type AdvertisingLedgerService } from './advertising-ledger.js';

export const ADMIN_ADVERTISING_REPORT_ROUTE_DEFINITIONS = [
  { method: 'GET', path: '/api/v1/admin/ad-financial-review', operationId: 'listAdminAdvertisingFinancialReview' },
  { method: 'GET', path: '/api/v1/admin/ad-financial-review/:requestId', operationId: 'getAdminAdvertisingFinancialReview' },
  { method: 'GET', path: '/api/v1/admin/ad-ledger', operationId: 'listAdminAdvertisingLedger' }
] as const;

export interface AdvertisingLedgerRouterDependencies {
  service: AdvertisingLedgerService;
  accessTokens: AccessTokenService;
}

const ADVERTISING_LEDGER_ERROR_MAP = Object.freeze({
  AD_REPORT_FORBIDDEN: { statusCode: 403, messageKey: 'errors.forbidden' },
  AD_REPORT_NOT_FOUND: { statusCode: 404, messageKey: 'errors.notFound' },
  AD_REPORT_SOURCE_INVALID: { statusCode: 503, messageKey: 'errors.advertisingFinancialReview.unavailable' }
});

function requestId(request: Request): string {
  return getRequestContext()?.requestId ?? request.get('x-request-id') ?? 'unknown-request';
}

function claims(response: Response): AccessTokenClaims {
  return response.locals.adminRbacClaims as AccessTokenClaims;
}

function sendError(request: Request, response: Response, error: unknown): void {
  const reportError = error instanceof AdvertisingLedgerServiceError ? error : undefined;
  const definition = reportError ? ADVERTISING_LEDGER_ERROR_MAP[reportError.code] : undefined;
  const mapped = toApiErrorResponse(
    definition && reportError
      ? new ApiContractError(reportError.code, definition.messageKey, definition.statusCode)
      : error,
    requestId(request)
  );
  response.status(mapped.statusCode).json(mapped.body);
}

export function createAdvertisingLedgerRouter(
  dependencies: AdvertisingLedgerRouterDependencies
): Router {
  const router = Router();
  const adminAuth = createAdminRbacAuthMiddleware(dependencies.accessTokens);
  router.use((_request, response, next) => {
    response.setHeader('Cache-Control', 'no-store');
    next();
  });
  router.use('/admin/ad-financial-review', adminAuth);
  router.use('/admin/ad-ledger', adminAuth);

  router.get('/admin/ad-financial-review', async (request, response) => {
    try {
      const result = await dependencies.service.listFinancialReview(claims(response), request.query);
      response.status(200).json(toSuccessResponse(result, requestId(request)));
    } catch (error) {
      sendError(request, response, error);
    }
  });

  router.get('/admin/ad-financial-review/:requestId', async (request, response) => {
    try {
      const result = await dependencies.service.getFinancialReview(claims(response), request.params.requestId);
      response.status(200).json(toSuccessResponse(result, requestId(request)));
    } catch (error) {
      sendError(request, response, error);
    }
  });

  router.get('/admin/ad-ledger', async (request, response) => {
    try {
      const result = await dependencies.service.listLedger(claims(response), request.query);
      response.status(200).json(toSuccessResponse(result, requestId(request)));
    } catch (error) {
      sendError(request, response, error);
    }
  });

  return router;
}
