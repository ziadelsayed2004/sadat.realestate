import { Router, type Request, type Response } from 'express';
import { paymentProofAdminListQuerySchema, paymentProofReviewSchema, paymentProofUploadHeadersSchema } from '@sadat-real-estate/contracts';
import type { AccessTokenClaims, AccessTokenService } from '../auth/crypto.js';
import { ApiContractError, toApiErrorResponse } from '../contracts/error-boundary.js';
import { toSuccessResponse } from '../contracts/response.js';
import { getRequestContext } from '../observability/context.js';
import { createAdminRbacAuthMiddleware } from '../rbac/auth.js';
import { createProviderAuthMiddleware } from '../provider/auth.js';
import { PaymentProofServiceError, type PaymentProofServiceDependencies, createPaymentProofService } from './service.js';

export const PAYMENT_ROUTE_DEFINITIONS = [
  { method: 'POST', path: '/api/v1/provider/ads/:adRequestId/payment-proof', operationId: 'uploadProviderPaymentProof' },
  { method: 'GET', path: '/api/v1/admin/payment-proofs', operationId: 'listAdminPaymentProofs' },
  { method: 'POST', path: '/api/v1/admin/payment-proofs/:proofId/review', operationId: 'reviewAdminPaymentProof' }
] as const;

type PaymentProofService = Pick<ReturnType<typeof createPaymentProofService>, 'upload' | 'listAdmin' | 'review'>;

export interface PaymentProofRouterDependencies {
  service: PaymentProofService;
  accessTokens: AccessTokenService;
  uploadRateLimit?: { windowMs: number; max: number };
}

const ERROR_MAP: Readonly<Record<string, { statusCode: number; messageKey: string }>> = Object.freeze({
  FORBIDDEN: { statusCode: 403, messageKey: 'errors.forbidden' },
  PAYMENT_PROOF_CAPABILITY_UNAVAILABLE: { statusCode: 503, messageKey: 'errors.upload.capabilityUnavailable' },
  AD_REQUEST_NOT_FOUND: { statusCode: 404, messageKey: 'errors.notFound' },
  AD_REQUEST_NOT_PAYABLE: { statusCode: 409, messageKey: 'errors.conflict' },
  DUPLICATE: { statusCode: 409, messageKey: 'errors.conflict' },
  NOT_FOUND: { statusCode: 404, messageKey: 'errors.notFound' },
  PAYMENT_PROOF_AUDIT_UNAVAILABLE: { statusCode: 503, messageKey: 'errors.auditUnavailable' },
  PAYMENT_PROOF_AUDIT_FAILED: { statusCode: 503, messageKey: 'errors.auditUnavailable' },
  MALWARE_SCAN_FAILED: { statusCode: 503, messageKey: 'errors.upload.scanFailed' },
  VERSION_CONFLICT: { statusCode: 409, messageKey: 'errors.conflict' },
  INVALID_STORAGE_KEY: { statusCode: 500, messageKey: 'errors.internal' },
  INVALID_FILENAME: { statusCode: 400, messageKey: 'errors.upload.invalidFilename' },
  DOUBLE_EXTENSION_REJECTED: { statusCode: 400, messageKey: 'errors.upload.doubleExtension' },
  FILE_TYPE_NOT_ALLOWED: { statusCode: 400, messageKey: 'errors.upload.fileTypeNotAllowed' },
  FILE_TOO_LARGE: { statusCode: 413, messageKey: 'errors.upload.fileTooLarge' },
  EMPTY_FILE: { statusCode: 400, messageKey: 'errors.upload.emptyFile' },
  ENCRYPTED_PDF_REJECTED: { statusCode: 400, messageKey: 'errors.upload.encryptedPdf' },
  INVALID_FILE_SIGNATURE: { statusCode: 400, messageKey: 'errors.upload.invalidSignature' }
});

function requestId(request: Request): string {
  return getRequestContext()?.requestId ?? request.get('x-request-id') ?? 'unknown-request';
}

function sendError(request: Request, response: Response, error: unknown): void {
  const serviceError = error instanceof PaymentProofServiceError ? error : undefined;
  const mapped = serviceError ? ERROR_MAP[serviceError.code] : undefined;
  const result = toApiErrorResponse(
    mapped
      ? new ApiContractError(serviceError!.code, mapped.messageKey, mapped.statusCode)
      : error,
    requestId(request)
  );
  response.status(result.statusCode).json(result.body);
}

function claims(response: Response): AccessTokenClaims {
  return response.locals.providerClaims as AccessTokenClaims;
}

function adminClaims(response: Response): AccessTokenClaims {
  return response.locals.adminRbacClaims as AccessTokenClaims;
}

function context(request: Request): { requestId: string; traceId: string } {
  const current = getRequestContext();
  return {
    requestId: requestId(request),
    traceId: current?.traceId ?? 'f'.repeat(32)
  };
}

function contentLength(request: Request): number | undefined {
  const value = request.get('content-length');
  if (!value) return undefined;
  if (!/^\d+$/.test(value)) return Number.NaN;
  return Number(value);
}

function objectIdPath(value: string | string[] | undefined): string {
  const normalized = typeof value === 'string' ? value : '';
  if (!/^[a-f0-9]{24}$/.test(normalized)) {
    throw new ApiContractError('VALIDATION_FAILED', 'errors.invalidInput', 400);
  }
  return normalized;
}

function createAuthenticatedRateLimit(options: { windowMs: number; max: number }) {
  const buckets = new Map<string, { count: number; resetAt: number }>();
  return (_request: Request, response: Response, next: () => void) => {
    const key = claims(response).sub;
    const now = Date.now();
    const current = buckets.get(key);
    const bucket = !current || current.resetAt <= now
      ? { count: 0, resetAt: now + options.windowMs }
      : current;
    bucket.count += 1;
    buckets.set(key, bucket);
    if (bucket.count > options.max) {
      response.setHeader('Retry-After', String(Math.ceil((bucket.resetAt - now) / 1_000)));
      const result = toApiErrorResponse(
        new ApiContractError('RATE_LIMITED', 'errors.rateLimited', 429),
        getRequestContext()?.requestId ?? 'unknown-request'
      );
      response.status(result.statusCode).json(result.body);
      return;
    }
    next();
  };
}

export function createPaymentProofRouter(dependencies: PaymentProofRouterDependencies): Router {
  const router = Router();
  const providerAuth = createProviderAuthMiddleware(dependencies.accessTokens);
  const adminAuth = createAdminRbacAuthMiddleware(dependencies.accessTokens);
  const uploadRateLimit = createAuthenticatedRateLimit(
    dependencies.uploadRateLimit ?? { windowMs: 60_000, max: 20 }
  );
  router.use((_request, response, next) => {
    response.setHeader('Cache-Control', 'no-store');
    next();
  });
  router.use('/admin/payment-proofs', adminAuth);

  router.get('/admin/payment-proofs', async (request, response) => {
    try {
      const data = await dependencies.service.listAdmin(
        adminClaims(response),
        paymentProofAdminListQuerySchema.parse(request.query)
      );
      response.status(200).json(toSuccessResponse(data, requestId(request), { page: data.page, limit: data.limit, total: data.total }));
    } catch (error) {
      sendError(request, response, error);
    }
  });

  router.post('/provider/ads/:adRequestId/payment-proof', providerAuth, uploadRateLimit, async (request, response) => {
    try {
      const headers = paymentProofUploadHeadersSchema.parse({
        filename: request.get('x-file-name'),
        contentType: request.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase(),
        contentLength: contentLength(request)
      });
      const result = await dependencies.service.upload(
        claims(response),
        objectIdPath(request.params.adRequestId),
        headers,
        request
      );
      response.status(result.idempotentReplay ? 200 : 201).json(toSuccessResponse(result, requestId(request)));
    } catch (error) {
      sendError(request, response, error);
    }
  });

  router.post('/admin/payment-proofs/:proofId/review', async (request, response) => {
    try {
      const proofId = objectIdPath(request.params.proofId);
      const current = context(request);
      const result = await dependencies.service.review(
        adminClaims(response),
        proofId,
        paymentProofReviewSchema.parse(request.body ?? {}),
        current
      );
      response.status(200).json(toSuccessResponse(result, current.requestId));
    } catch (error) {
      sendError(request, response, error);
    }
  });

  return router;
}

export type PaymentProofRuntimeDependencies = PaymentProofServiceDependencies;
