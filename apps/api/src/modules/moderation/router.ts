import { Router, type Request, type Response } from 'express';
import { propertyReportCreateSchema, propertyReportIdParamsSchema, propertyReportListQuerySchema, propertyReportPropertyParamsSchema, propertyReportResolveSchema } from '@sadat-real-estate/contracts';
import type { AccessTokenClaims, AccessTokenService } from '../auth/crypto.js';
import { ApiContractError, toApiErrorResponse } from '../contracts/error-boundary.js';
import { toSuccessResponse } from '../contracts/response.js';
import { getRequestContext } from '../observability/context.js';
import { createAdminRbacAuthMiddleware } from '../rbac/auth.js';
import { ModerationServiceError, type ModerationContext, type ModerationService } from './service.js';

export const MODERATION_ROUTE_DEFINITIONS = [
  { method: 'POST', path: '/api/v1/provider/properties/:propertyId/reports', operationId: 'createProviderPropertyReport' },
  { method: 'GET', path: '/api/v1/admin/property-reports', operationId: 'listAdminPropertyReports' },
  { method: 'POST', path: '/api/v1/admin/property-reports/:reportId/resolve', operationId: 'resolveAdminPropertyReport' }
] as const;
export interface ModerationRouterDependencies { service: ModerationService; accessTokens: AccessTokenService; }
const errors: Record<string, { statusCode: number; messageKey: string }> = { REPORT_FORBIDDEN: { statusCode: 403, messageKey: 'errors.propertyReports.forbidden' }, REPORT_NOT_FOUND: { statusCode: 404, messageKey: 'errors.propertyReports.notFound' }, REPORT_DUPLICATE: { statusCode: 409, messageKey: 'errors.propertyReports.duplicate' }, REPORT_VERSION_CONFLICT: { statusCode: 409, messageKey: 'errors.propertyReports.versionConflict' }, REPORT_INVALID_STATE: { statusCode: 409, messageKey: 'errors.propertyReports.invalidState' } };
function context(request: Request): ModerationContext { const current = getRequestContext(); return { requestId: current?.requestId ?? request.get('x-request-id') ?? 'unknown-request', traceId: current?.traceId ?? 'f'.repeat(32) }; }
function claims(response: Response): AccessTokenClaims { return response.locals.reportClaims as AccessTokenClaims; }
function adminId(response: Response): string { return (response.locals.adminRbacClaims as AccessTokenClaims).sub; }
function sendError(request: Request, response: Response, error: unknown): void { const reportError = error instanceof ModerationServiceError ? error : undefined; const definition = reportError ? errors[reportError.code] : undefined; const mapped = toApiErrorResponse(definition ? new ApiContractError(reportError!.code, definition.messageKey, definition.statusCode) : error, context(request).requestId); response.status(mapped.statusCode).json(mapped.body); }
function reportAuth(accessTokens: AccessTokenService) { return (request: Request, response: Response, next: () => void): void => { const value = request.get('authorization')?.replace(/^Bearer\s+/i, '').trim(); if (!value) { sendError(request, response, new ApiContractError('AUTHENTICATION_REQUIRED', 'errors.authenticationRequired', 401)); return; } try { const current = accessTokens.verify(value); if (current.status !== 'verified' || !['seeker', 'provider', 'admin'].includes(current.role)) throw new Error('forbidden'); response.locals.reportClaims = current; next(); } catch { sendError(request, response, new ApiContractError('AUTHENTICATION_REQUIRED', 'errors.authenticationRequired', 401)); } }; }
export function createModerationRouter(dependencies: ModerationRouterDependencies): Router {
  const router = Router(); router.use((_request, response, next) => { response.setHeader('Cache-Control', 'no-store'); next(); });
  router.use('/provider/properties/:propertyId/reports', reportAuth(dependencies.accessTokens));
  router.use('/admin/property-reports', createAdminRbacAuthMiddleware(dependencies.accessTokens));
  router.post('/provider/properties/:propertyId/reports', async (request, response) => { try { const { propertyId } = propertyReportPropertyParamsSchema.parse(request.params); const current = context(request); response.status(201).json(toSuccessResponse(await dependencies.service.create(claims(response), propertyId, propertyReportCreateSchema.parse(request.body ?? {}), current), current.requestId)); } catch (error) { sendError(request, response, error); } });
  router.get('/admin/property-reports', async (request, response) => { try { const current = context(request); response.status(200).json(toSuccessResponse(await dependencies.service.list(adminId(response), propertyReportListQuerySchema.parse(request.query)), current.requestId)); } catch (error) { sendError(request, response, error); } });
  router.post('/admin/property-reports/:reportId/resolve', async (request, response) => { try { const { reportId } = propertyReportIdParamsSchema.parse(request.params); const current = context(request); response.status(200).json(toSuccessResponse(await dependencies.service.resolve(adminId(response), reportId, propertyReportResolveSchema.parse(request.body ?? {}), current), current.requestId)); } catch (error) { sendError(request, response, error); } });
  return router;
}
