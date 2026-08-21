import { Router, type Request, type Response } from 'express';
import {
  adminSettingsNamespaceParamsSchema,
  adminSettingsUpdateSchema,
  providerSettingsPatchSchema,
  type AdminSettingsData,
  type ProviderSettingsData
} from '@sadat-real-estate/contracts';
import type { AccessTokenClaims, AccessTokenService } from '../auth/crypto.js';
import { ApiContractError, toApiErrorResponse } from '../contracts/error-boundary.js';
import { toSuccessResponse } from '../contracts/response.js';
import { getRequestContext } from '../observability/context.js';
import { createProviderAuthMiddleware } from '../provider/auth.js';
import { createAdminRbacAuthMiddleware } from '../rbac/auth.js';
import { ProviderSettingsServiceError } from './provider-service.js';
import { SettingsServiceError } from './service.js';

export const SETTINGS_ROUTE_DEFINITIONS = [
  { method: 'GET', path: '/api/v1/admin/settings/:namespace', operationId: 'getAdminSettings' },
  { method: 'PUT', path: '/api/v1/admin/settings/:namespace', operationId: 'updateAdminSettings' },
  { method: 'GET', path: '/api/v1/provider/settings', operationId: 'getProviderSettings' },
  { method: 'PATCH', path: '/api/v1/provider/settings', operationId: 'updateProviderSettings' }
] as const;

export interface SettingsRouterDependencies {
  service: {
    get(claims: AccessTokenClaims, namespace: unknown): Promise<AdminSettingsData>;
    update(claims: AccessTokenClaims, namespace: unknown, input: unknown, context: { requestId: string; traceId: string }): Promise<AdminSettingsData>;
  };
  provider?: {
    get(claims: AccessTokenClaims): Promise<ProviderSettingsData>;
    update(claims: AccessTokenClaims, input: unknown): Promise<ProviderSettingsData>;
  };
  accessTokens: AccessTokenService;
}

const SETTINGS_ERROR_MAP = Object.freeze({
  SETTINGS_FORBIDDEN: { statusCode: 403, messageKey: 'errors.forbidden' },
  SETTINGS_NOT_FOUND: { statusCode: 404, messageKey: 'errors.settings.notFound' },
  SETTINGS_VERSION_CONFLICT: { statusCode: 409, messageKey: 'errors.settings.versionConflict' },
  SETTINGS_SCHEMA_VERSION_CONFLICT: { statusCode: 409, messageKey: 'errors.settings.schemaVersionConflict' },
  PROVIDER_SETTINGS_FORBIDDEN: { statusCode: 403, messageKey: 'errors.forbidden' },
  PROVIDER_SETTINGS_NOT_FOUND: { statusCode: 404, messageKey: 'errors.settings.notFound' },
  PROVIDER_SETTINGS_VERSION_CONFLICT: { statusCode: 409, messageKey: 'errors.settings.versionConflict' }
});

function requestId(request: Request): string { return getRequestContext()?.requestId ?? request.get('x-request-id') ?? 'unknown-request'; }
function traceId(): string { return getRequestContext()?.traceId ?? '11111111111111111111111111111111'; }
function claims(response: Response): AccessTokenClaims { return response.locals.adminRbacClaims as AccessTokenClaims; }
function providerClaims(response: Response): AccessTokenClaims { return response.locals.providerClaims as AccessTokenClaims; }
function sendError(request: Request, response: Response, error: unknown): void {
  const settingsError = error instanceof SettingsServiceError || error instanceof ProviderSettingsServiceError ? error : undefined;
  const definition = settingsError ? SETTINGS_ERROR_MAP[settingsError.code] : undefined;
  const body = toApiErrorResponse(
    definition && settingsError ? new ApiContractError(settingsError.code, definition.messageKey, definition.statusCode) : error,
    requestId(request)
  );
  response.status(body.statusCode).json(body.body);
}

export function createSettingsRouter(dependencies: SettingsRouterDependencies): Router {
  const router = Router();
  router.use((_request, response, next) => { response.setHeader('Cache-Control', 'no-store'); next(); });
  router.use('/admin/settings', createAdminRbacAuthMiddleware(dependencies.accessTokens));

  router.get('/admin/settings/:namespace', async (request, response) => {
    try {
      const namespace = adminSettingsNamespaceParamsSchema.parse(request.params).namespace;
      response.status(200).json(toSuccessResponse(await dependencies.service.get(claims(response), namespace), requestId(request)));
    } catch (error) { sendError(request, response, error); }
  });

  router.put('/admin/settings/:namespace', async (request, response) => {
    try {
      const namespace = adminSettingsNamespaceParamsSchema.parse(request.params).namespace;
      const input = adminSettingsUpdateSchema.parse(request.body ?? {});
      const result = await dependencies.service.update(claims(response), namespace, input, { requestId: requestId(request), traceId: traceId() });
      response.status(200).json(toSuccessResponse(result, requestId(request)));
    } catch (error) { sendError(request, response, error); }
  });

  if (dependencies.provider) {
    router.use('/provider/settings', createProviderAuthMiddleware(dependencies.accessTokens));

    router.get('/provider/settings', async (request, response) => {
      try {
        response.status(200).json(toSuccessResponse(await dependencies.provider!.get(providerClaims(response)), requestId(request)));
      } catch (error) { sendError(request, response, error); }
    });

    router.patch('/provider/settings', async (request, response) => {
      try {
        const input = providerSettingsPatchSchema.parse(request.body ?? {});
        response.status(200).json(toSuccessResponse(await dependencies.provider!.update(providerClaims(response), input), requestId(request)));
      } catch (error) { sendError(request, response, error); }
    });
  }
  return router;
}
