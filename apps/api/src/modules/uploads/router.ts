import { Router, type Request, type Response } from 'express';
import {
  providerDocumentAccessRequestSchema,
  providerDocumentUploadHeadersSchema
} from '@sadat-real-estate/contracts';
import type { AccessTokenClaims, AccessTokenService } from '../auth/crypto.js';
import { ApiContractError, toApiErrorResponse } from '../contracts/error-boundary.js';
import { toSuccessResponse } from '../contracts/response.js';
import { getRequestContext } from '../observability/context.js';
import { createProviderAuthMiddleware } from '../provider/auth.js';
import { createAdminRbacAuthMiddleware } from '../rbac/auth.js';
import { UploadServiceError, type ProviderDocumentService } from './service.js';
import { MAX_PROVIDER_DOCUMENT_BYTES } from './validation.js';

export const UPLOAD_ROUTE_DEFINITIONS = [
  { method: 'POST', path: '/api/v1/provider/application/documents', operationId: 'uploadProviderDocument' },
  { method: 'POST', path: '/api/v1/provider/application/documents/:documentId/access', operationId: 'createProviderDocumentAccess' },
  { method: 'GET', path: '/api/v1/admin/provider-documents/:documentId/access', operationId: 'createAdminProviderDocumentAccess' },
  { method: 'DELETE', path: '/api/v1/provider/application/documents/:documentId', operationId: 'deleteProviderDocument' },
  { method: 'GET', path: '/api/v1/private/provider-documents/:documentId', operationId: 'downloadPrivateProviderDocument' }
] as const;

export interface UploadRouterDependencies {
  service: ProviderDocumentService;
  accessTokens: AccessTokenService;
  uploadRateLimit?: { windowMs: number; max: number };
}

const ERROR_MAP: Readonly<Record<string, { statusCode: number; messageKey: string }>> = Object.freeze({
  UPLOAD_CAPABILITY_UNAVAILABLE: { statusCode: 503, messageKey: 'errors.upload.capabilityUnavailable' },
  PROVIDER_APPLICATION_NOT_FOUND: { statusCode: 404, messageKey: 'errors.provider.applicationNotFound' },
  PROVIDER_APPLICATION_NOT_EDITABLE: { statusCode: 409, messageKey: 'errors.provider.applicationNotEditable' },
  DOCUMENT_CATEGORY_NOT_APPLICABLE: { statusCode: 409, messageKey: 'errors.upload.categoryNotApplicable' },
  DOCUMENT_CATEGORY_LIMIT: { statusCode: 409, messageKey: 'errors.upload.categoryLimit' },
  DOCUMENT_REPLACEMENT_LIMIT: { statusCode: 429, messageKey: 'errors.upload.replacementLimit' },
  DOCUMENT_CONCURRENT_UPLOAD: { statusCode: 409, messageKey: 'errors.upload.concurrentUpload' },
  DOCUMENT_NOT_FOUND: { statusCode: 404, messageKey: 'errors.upload.documentNotFound' },
  DOCUMENT_NOT_CLEAN: { statusCode: 409, messageKey: 'errors.upload.documentNotClean' },
  DOCUMENT_REVIEW_FORBIDDEN: { statusCode: 403, messageKey: 'errors.upload.documentReviewForbidden' },
  INVALID_DOWNLOAD_GRANT: { statusCode: 401, messageKey: 'errors.upload.invalidDownloadGrant' },
  MALWARE_SCAN_FAILED: { statusCode: 503, messageKey: 'errors.upload.scanFailed' },
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
  const serviceError = error instanceof UploadServiceError ? error : undefined;
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

function contentLength(request: Request): number | undefined {
  const value = request.get('content-length');
  if (!value) return undefined;
  if (!/^\d+$/.test(value)) return Number.NaN;
  return Number(value);
}

function pathParameter(value: string | string[] | undefined): string {
  return typeof value === 'string' ? value : '';
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

export function createUploadRouter(dependencies: UploadRouterDependencies): Router {
  const router = Router();
  const providerAuth = createProviderAuthMiddleware(dependencies.accessTokens);
  const adminAuth = createAdminRbacAuthMiddleware(dependencies.accessTokens);
  const uploadRateLimit = createAuthenticatedRateLimit(
    dependencies.uploadRateLimit ?? { windowMs: 60_000, max: 100 }
  );
  router.use((_request, response, next) => {
    response.setHeader('Cache-Control', 'no-store');
    next();
  });

  router.post(
    '/provider/application/documents',
    providerAuth,
    uploadRateLimit,
    async (request, response) => {
      try {
        const type = request.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase();
        const length = contentLength(request);
        if (length !== undefined && length > MAX_PROVIDER_DOCUMENT_BYTES) {
          throw new UploadServiceError('FILE_TOO_LARGE');
        }
        const headers = providerDocumentUploadHeadersSchema.parse({
          category: request.get('x-document-category'),
          filename: request.get('x-file-name'),
          contentType: type,
          contentLength: length
        });
        const document = await dependencies.service.upload(claims(response), headers, request);
        response.status(document.idempotentReplay ? 200 : 201).json(
          toSuccessResponse(document, requestId(request))
        );
      } catch (error) {
        sendError(request, response, error);
      }
    }
  );

  router.post(
    '/provider/application/documents/:documentId/access',
    providerAuth,
    async (request, response) => {
      try {
        const input = providerDocumentAccessRequestSchema.parse(request.body ?? {});
        const context = getRequestContext();
        const result = await dependencies.service.createAccessGrant(
          claims(response),
          pathParameter(request.params.documentId),
          input.purpose,
          {
            requestId: context?.requestId ?? requestId(request),
            ...(context?.traceId ? { traceId: context.traceId } : {})
          }
        );
        response.status(200).json(toSuccessResponse(result, requestId(request)));
      } catch (error) {
        sendError(request, response, error);
      }
    }
  );

  router.get(
    '/admin/provider-documents/:documentId/access',
    adminAuth,
    async (request, response) => {
      try {
        const input = providerDocumentAccessRequestSchema.parse(request.query);
        const context = getRequestContext();
        const result = await dependencies.service.createAdminAccessGrant(
          adminClaims(response),
          pathParameter(request.params.documentId),
          input.purpose,
          {
            requestId: context?.requestId ?? requestId(request),
            ...(context?.traceId ? { traceId: context.traceId } : {})
          }
        );
        response.status(200).json(toSuccessResponse(result, requestId(request)));
      } catch (error) {
        sendError(request, response, error);
      }
    }
  );

  router.delete(
    '/provider/application/documents/:documentId',
    providerAuth,
    async (request, response) => {
      try {
        response.status(200).json(toSuccessResponse(
          await dependencies.service.delete(claims(response), pathParameter(request.params.documentId)),
          requestId(request)
        ));
      } catch (error) {
        sendError(request, response, error);
      }
    }
  );

  router.get('/private/provider-documents/:documentId', async (request, response) => {
    try {
      const expires = typeof request.query.expires === 'string' ? request.query.expires : '';
      const signature = typeof request.query.signature === 'string' ? request.query.signature : '';
      const document = await dependencies.service.resolveDownload(
        pathParameter(request.params.documentId),
        expires,
        signature
      );
      response.setHeader('Content-Type', document.mime);
      response.setHeader('Content-Disposition', `attachment; filename="document"; filename*=UTF-8''${encodeURIComponent(document.filename)}`);
      response.setHeader('Cache-Control', 'private, no-store, max-age=0');
      document.source.on('error', (error) => response.destroy(error));
      document.source.pipe(response);
    } catch (error) {
      sendError(request, response, error);
    }
  });

  return router;
}
