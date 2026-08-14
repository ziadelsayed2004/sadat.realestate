import { Router, type Request, type Response } from 'express';
import { propertyAdminListQuerySchema, propertyContactStepSchema, propertyCoreStepSchema, propertyCreateSchema, propertyDetailsStepSchema, propertyDuplicateQuerySchema, propertyFeaturesServicesStepSchema, propertyIdParamsSchema, propertyListQuerySchema, propertyLocationStepSchema, propertyPricingStepSchema, propertyReviewSchema, propertyStepParamsSchema, propertySubmitSchema, propertyVisibilitySchema } from '@sadat-real-estate/contracts';
import type { AccessTokenClaims, AccessTokenService } from '../auth/crypto.js';
import { ApiContractError, toApiErrorResponse } from '../contracts/error-boundary.js';
import { toSuccessResponse } from '../contracts/response.js';
import { getRequestContext } from '../observability/context.js';
import { createProviderAuthMiddleware } from '../provider/auth.js';
import { createAdminRbacAuthMiddleware } from '../rbac/auth.js';
import { PropertyServiceError, type PropertyMutationContext, type PropertyService } from './service.js';

export const PROPERTY_ROUTE_DEFINITIONS = [
  { method: 'GET', path: '/api/v1/provider/properties/:propertyId', operationId: 'getProviderProperty' },
  { method: 'GET', path: '/api/v1/provider/properties', operationId: 'listProviderProperties' },
  { method: 'POST', path: '/api/v1/provider/properties', operationId: 'createProviderProperty' },
  { method: 'PATCH', path: '/api/v1/provider/properties/:propertyId/steps/:step', operationId: 'saveProviderPropertyStep' }
  ,{ method: 'POST', path: '/api/v1/provider/properties/:propertyId/submit', operationId: 'submitProviderProperty' }
  ,{ method: 'POST', path: '/api/v1/admin/properties/:propertyId/review', operationId: 'reviewAdminProperty' }
  ,{ method: 'POST', path: '/api/v1/admin/properties/:propertyId/visibility', operationId: 'changeAdminPropertyVisibility' }
  ,{ method: 'GET', path: '/api/v1/admin/properties', operationId: 'listAdminProperties' }
  ,{ method: 'GET', path: '/api/v1/admin/properties/possible-duplicates', operationId: 'listPossiblePropertyDuplicates' }
] as const;

export interface PropertyRouterDependencies { service: PropertyService; accessTokens: AccessTokenService; }

const ERROR_MAP: Record<string, { statusCode: number; messageKey: string }> = {
  PROPERTY_FORBIDDEN: { statusCode: 403, messageKey: 'errors.properties.forbidden' },
  PROPERTY_NOT_FOUND: { statusCode: 404, messageKey: 'errors.properties.notFound' },
  PROPERTY_SLUG_EXISTS: { statusCode: 409, messageKey: 'errors.properties.slugExists' },
  PROPERTY_VERSION_CONFLICT: { statusCode: 409, messageKey: 'errors.properties.versionConflict' },
  PROPERTY_LOCATION_NOT_FOUND: { statusCode: 422, messageKey: 'errors.properties.locationNotFound' },
  PROPERTY_VALIDATION_FAILED: { statusCode: 422, messageKey: 'errors.properties.validationFailed' },
  PROPERTY_INVALID_STATE: { statusCode: 409, messageKey: 'errors.properties.invalidState' }
};

function context(request: Request): PropertyMutationContext {
  const current = getRequestContext();
  return { requestId: current?.requestId ?? request.get('x-request-id') ?? 'unknown-request', traceId: current?.traceId ?? 'f'.repeat(32) };
}
function claims(response: Response): AccessTokenClaims { return response.locals.providerClaims as AccessTokenClaims; }
function adminId(response: Response): string { return (response.locals.adminRbacClaims as AccessTokenClaims).sub; }
function sendError(request: Request, response: Response, error: unknown): void {
  const propertyError = error instanceof PropertyServiceError ? error : undefined;
  const definition = propertyError ? ERROR_MAP[propertyError.code] : undefined;
  const details = propertyError?.details?.issues.map(issue => ({ path: [issue.path], code: issue.code.toUpperCase(), messageKey: issue.messageKey })) ?? [];
  const mapped = toApiErrorResponse(definition ? new ApiContractError(propertyError!.code, definition.messageKey, definition.statusCode, details) : error, context(request).requestId);
  response.status(mapped.statusCode).json(mapped.body);
}

export function createPropertyRouter(dependencies: PropertyRouterDependencies): Router {
  const router = Router();
  router.use((_request, response, next) => { response.setHeader('Cache-Control', 'no-store'); next(); });
  router.use('/provider/properties', createProviderAuthMiddleware(dependencies.accessTokens));
  router.use('/provider/properties', (request, response, next) => {
    const current = claims(response);
    if (current.status !== 'verified') { sendError(request, response, new ApiContractError('FORBIDDEN', 'errors.forbidden', 403)); return; }
    next();
  });
  router.use('/admin/properties', createAdminRbacAuthMiddleware(dependencies.accessTokens));
  router.post('/provider/properties', async (request, response) => {
    try { const current = context(request); response.status(201).json(toSuccessResponse(await dependencies.service.create(claims(response), propertyCreateSchema.parse(request.body ?? {}), current), current.requestId)); }
    catch (error) { sendError(request, response, error); }
  });
  router.get('/provider/properties', async (request, response) => {
    try { const query = propertyListQuerySchema.parse(request.query); const result = await dependencies.service.list(claims(response), query); response.status(200).json(toSuccessResponse(result.data, context(request).requestId, { page: result.page, limit: result.limit, total: result.total })); }
    catch (error) { sendError(request, response, error); }
  });
  router.get('/provider/properties/:propertyId', async (request, response) => {
    try { const { propertyId } = propertyIdParamsSchema.parse(request.params); const current = context(request); response.status(200).json(toSuccessResponse(await dependencies.service.get(claims(response), propertyId), current.requestId)); }
    catch (error) { sendError(request, response, error); }
  });
  router.patch('/provider/properties/:propertyId/steps/:step', async (request, response) => {
    try { const { propertyId, step } = propertyStepParamsSchema.parse(request.params); const current = context(request); const input = step === 'basic' ? propertyCoreStepSchema.parse(request.body ?? {}) : step === 'location' ? propertyLocationStepSchema.parse(request.body ?? {}) : step === 'details' ? propertyDetailsStepSchema.parse(request.body ?? {}) : step === 'price-payment' ? propertyPricingStepSchema.parse(request.body ?? {}) : step === 'features-services' ? propertyFeaturesServicesStepSchema.parse(request.body ?? {}) : propertyContactStepSchema.parse(request.body ?? {}); response.status(200).json(toSuccessResponse(await dependencies.service.saveStep(claims(response), propertyId, step, input, current), current.requestId)); }
    catch (error) { sendError(request, response, error); }
  });
  router.post('/provider/properties/:propertyId/submit', async (request, response) => {
    try { const { propertyId } = propertyIdParamsSchema.parse(request.params); const current = context(request); response.status(200).json(toSuccessResponse(await dependencies.service.submit(claims(response), propertyId, propertySubmitSchema.parse(request.body ?? {}), current), current.requestId)); }
    catch (error) { sendError(request, response, error); }
  });
  router.post('/admin/properties/:propertyId/review', async (request, response) => {
    try { const { propertyId } = propertyIdParamsSchema.parse(request.params); const current = context(request); response.status(200).json(toSuccessResponse(await dependencies.service.review(adminId(response), propertyId, propertyReviewSchema.parse(request.body ?? {}), current), current.requestId)); }
    catch (error) { sendError(request, response, error); }
  });
  router.get('/admin/properties', async (request, response) => {
    try { const query = propertyAdminListQuerySchema.parse(request.query); const result = await dependencies.service.adminList(adminId(response), query); response.status(200).json(toSuccessResponse(result.data, context(request).requestId, { page: result.page, limit: result.limit, total: result.total })); }
    catch (error) { sendError(request, response, error); }
  });
  router.get('/admin/properties/possible-duplicates', async (request, response) => {
    try { const query = propertyDuplicateQuerySchema.parse(request.query); const current = context(request); response.status(200).json(toSuccessResponse(await dependencies.service.duplicates(adminId(response), query), current.requestId)); }
    catch (error) { sendError(request, response, error); }
  });
  router.post('/admin/properties/:propertyId/visibility', async (request, response) => {
    try { const { propertyId } = propertyIdParamsSchema.parse(request.params); const current = context(request); response.status(200).json(toSuccessResponse(await dependencies.service.visibility(adminId(response), propertyId, propertyVisibilitySchema.parse(request.body ?? {}), current), current.requestId)); }
    catch (error) { sendError(request, response, error); }
  });
  return router;
}
