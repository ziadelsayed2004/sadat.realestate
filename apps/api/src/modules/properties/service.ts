import {
  propertyCoreStepSchema,
  propertyCreateSchema,
  propertyDataSchema,
  propertyDetailsStepSchema,
  propertyDraftStepSchema,
  propertyFeaturesServicesStepSchema,
  propertyLocationStepSchema,
  propertyObjectIdSchema,
  propertyPricingStepSchema,
  propertyContactStepSchema,
  propertySubmitSchema,
  propertyReviewSchema,
  propertyVisibilitySchema,
  propertyListQuerySchema,
  propertyAdminListQuerySchema,
  propertyDuplicateQuerySchema,
  propertyDuplicateDataSchema,
  type PropertyDuplicateData,
  type PropertyAdminListQuery,
  type PropertyListData,
  type PropertyListQuery,
  propertyValidationDataSchema,
  type PropertyCoreStep,
  type PropertyData,
  type PropertyDetailsStep,
  type PropertyDraftCreate,
  type PropertyFeaturesServicesStep,
  type PropertyLocationStep,
  type PropertyPricingStep,
  type PropertyContactStep
  ,type PropertySubmit, type PropertyReview, type PropertyVisibility
} from '@sadat-real-estate/contracts';
import type { AccessTokenClaims } from '../auth/crypto.js';
import type { PropertyMutationMetadata, PropertyRepository, StoredProperty } from './repository.js';

export type PropertyServiceErrorCode =
  | 'PROPERTY_FORBIDDEN'
  | 'PROPERTY_NOT_FOUND'
  | 'PROPERTY_SLUG_EXISTS'
  | 'PROPERTY_VERSION_CONFLICT'
  | 'PROPERTY_LOCATION_NOT_FOUND'
  | 'PROPERTY_VALIDATION_FAILED'
  | 'PROPERTY_INVALID_STATE';

export class PropertyServiceError extends Error {
  readonly code: PropertyServiceErrorCode;
  readonly details: ReturnType<typeof propertyValidationDataSchema.parse> | undefined;
  constructor(code: PropertyServiceErrorCode, details?: ReturnType<typeof propertyValidationDataSchema.parse>) { super(code); this.name = 'PropertyServiceError'; this.code = code; this.details = details; }
}

export interface PropertyMutationContext { requestId: string; traceId: string }
export interface PropertyAuthorization { authorize(adminId: string, permission: 'admin:properties.view' | 'admin:properties.review' | 'admin:properties.manage'): Promise<boolean>; }
export interface PropertyService {
  list(claims: AccessTokenClaims, query: unknown): Promise<{ data: PropertyListData; page: number; limit: number; total: number }>;
  adminList(adminId: string, query: unknown): Promise<{ data: PropertyListData; page: number; limit: number; total: number }>;
  duplicates(adminId: string, query: unknown): Promise<PropertyDuplicateData>;
  create(claims: AccessTokenClaims, input: PropertyDraftCreate, context: PropertyMutationContext): Promise<PropertyData>;
  get(claims: AccessTokenClaims, id: string): Promise<PropertyData>;
  saveStep(claims: AccessTokenClaims, id: string, step: string, input: unknown, context: PropertyMutationContext): Promise<PropertyData>;
  validate(claims: AccessTokenClaims, id: string): Promise<ReturnType<typeof propertyValidationDataSchema.parse>>;
  submit(claims: AccessTokenClaims, id: string, input: unknown, context: PropertyMutationContext): Promise<PropertyData>;
  review(adminId: string, id: string, input: unknown, context: PropertyMutationContext): Promise<PropertyData>;
  visibility(adminId: string, id: string, input: unknown, context: PropertyMutationContext): Promise<PropertyData>;
}

function provider(claims: AccessTokenClaims): void {
  if (claims.role !== 'provider' || claims.status !== 'verified') throw new PropertyServiceError('PROPERTY_FORBIDDEN');
}

function actions(record: StoredProperty, actor: 'provider' | 'admin'): PropertyData['availableActions'] {
  if (actor === 'provider') return record.status === 'draft' || record.status === 'needs_changes' ? ['update', 'submit'] : [];
  if (record.status === 'pending_review') return ['needs_changes', 'approve', 'reject'];
  if (record.status === 'approved') return ['publish', 'archive'];
  if (record.status === 'published') return ['hide', 'archive'];
  if (record.status === 'hidden') return ['restore', 'archive'];
  if (record.status !== 'archived') return ['archive'];
  return [];
}

function data(record: StoredProperty, actor: 'provider' | 'admin' = 'provider'): PropertyData {
  return propertyDataSchema.parse({
    id: record.id,
    kind: record.kind,
    name: record.name,
    slug: record.slug,
    transactionType: record.transactionType,
    source: record.source,
    ...(record.projectId ? { projectId: record.projectId } : {}),
    ...(record.parentPropertyId ? { parentPropertyId: record.parentPropertyId } : {}),
    ...(record.locationId ? { locationId: record.locationId } : {}),
    ...(record.coordinates ? { coordinates: record.coordinates } : {}),
    ...(record.description ? { description: record.description } : {}),
    ...(record.propertyTypeId ? { propertyTypeId: record.propertyTypeId } : {}),
    ...(record.area ? { area: record.area } : {}),
    ...(record.layout ? { layout: record.layout } : {}),
    ...(record.price ? { price: record.price } : {}),
    ...(record.paymentPlans ? { paymentPlans: record.paymentPlans } : {}),
    ...(record.featureIds ? { featureIds: record.featureIds } : {}),
    ...(record.serviceIds ? { serviceIds: record.serviceIds } : {}),
    ...(record.contact ? { contact: record.contact } : {}),
    ...(record.submittedAt ? { submittedAt: record.submittedAt.toISOString() } : {}),
    ...(record.reviewedBy ? { reviewedBy: record.reviewedBy } : {}),
    ...(record.reviewedAt ? { reviewedAt: record.reviewedAt.toISOString() } : {}),
    ...(record.reviewReason ? { reviewReason: record.reviewReason } : {}),
    ...(record.publishedAt ? { publishedAt: record.publishedAt.toISOString() } : {}),
    status: record.status,
    active: record.active,
    version: record.version,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    availableActions: actions(record, actor)
  });
}

  function metadata(claims: AccessTokenClaims, reason: string, context: PropertyMutationContext, changedAt: Date): PropertyMutationMetadata {
  return { actorId: claims.sub, reason, requestId: context.requestId, traceId: context.traceId, changedAt };
}

function write(result: Awaited<ReturnType<PropertyRepository['create']>> | Awaited<ReturnType<PropertyRepository['updateCore']>> | Awaited<ReturnType<PropertyRepository['review']>> | Awaited<ReturnType<PropertyRepository['visibility']>>): StoredProperty {
  if (result.kind === 'slug_conflict') throw new PropertyServiceError('PROPERTY_SLUG_EXISTS');
  if (result.kind === 'version_conflict') throw new PropertyServiceError('PROPERTY_VERSION_CONFLICT');
  if (result.kind === 'location_not_found') throw new PropertyServiceError('PROPERTY_LOCATION_NOT_FOUND');
  if (result.kind === 'not_found') throw new PropertyServiceError('PROPERTY_NOT_FOUND');
  if (result.kind === 'invalid_state') throw new PropertyServiceError('PROPERTY_INVALID_STATE');
  if (result.kind === 'already_submitted') return result.property;
  return result.property;
}

function validation(record: StoredProperty): ReturnType<typeof propertyValidationDataSchema.parse> {
  const issues: ReturnType<typeof propertyValidationDataSchema.parse>['issues'] = [];
  if (!record.locationId) issues.push({ path: 'locationId', code: 'required', messageKey: 'errors.properties.locationRequired' });
  if (!record.price) issues.push({ path: 'price', code: 'required', messageKey: 'errors.properties.priceRequired' });
  if (!record.contact || (!record.contact.phone && !record.contact.whatsappNumber && !record.contact.email)) issues.push({ path: 'contact', code: 'required', messageKey: 'errors.properties.contactRequired' });
  if (!record.active || !['draft', 'needs_changes'].includes(record.status)) issues.push({ path: 'status', code: 'invalid_state', messageKey: 'errors.properties.notSubmittable' });
  return propertyValidationDataSchema.parse({ valid: issues.length === 0, issues });
}

export function createPropertyService(dependencies: { repository: PropertyRepository; authorization?: PropertyAuthorization; now?: () => Date }): PropertyService {
  const now = dependencies.now ?? (() => new Date());
  async function adminPermission(adminId: string, permission: 'admin:properties.review' | 'admin:properties.manage'): Promise<void> {
    if (!dependencies.authorization || !await dependencies.authorization.authorize(adminId, permission)) throw new PropertyServiceError('PROPERTY_FORBIDDEN');
  }
  async function adminViewPermission(adminId: string): Promise<void> {
    if (!dependencies.authorization || !await dependencies.authorization.authorize(adminId, 'admin:properties.view')) throw new PropertyServiceError('PROPERTY_FORBIDDEN');
  }
  return {
    async list(claims, unparsedQuery) {
      provider(claims);
      const query = propertyListQuerySchema.parse(unparsedQuery) as PropertyListQuery;
      const result = await dependencies.repository.listOwned(claims.sub, query);
      return { data: { items: result.items.map(item => data(item)) }, page: query.page, limit: query.limit, total: result.total };
    },
    async adminList(adminId, unparsedQuery) {
      await adminViewPermission(adminId);
      const query = propertyAdminListQuerySchema.parse(unparsedQuery) as PropertyAdminListQuery;
      const result = await dependencies.repository.listAdmin(query);
      return { data: { items: result.items.map(item => data(item, 'admin')) }, page: query.page, limit: query.limit, total: result.total };
    },
    async duplicates(adminId, unparsedQuery) {
      await adminPermission(adminId, 'admin:properties.review');
      const query = propertyDuplicateQuerySchema.parse(unparsedQuery);
      const result = await dependencies.repository.findPotentialDuplicates(query.propertyId, query.limit);
      if (!result) throw new PropertyServiceError('PROPERTY_NOT_FOUND');
      return propertyDuplicateDataSchema.parse(result);
    },
    async create(claims, unparsedInput, context) {
      provider(claims);
      const input = propertyCreateSchema.parse(unparsedInput);
      if (input.source.providerId !== claims.sub) throw new PropertyServiceError('PROPERTY_FORBIDDEN');
      const result = await dependencies.repository.create({
        property: {
          providerId: claims.sub,
          source: input.source,
          kind: input.kind,
          name: input.name,
          slug: input.slug,
          transactionType: input.transactionType,
          ...(input.projectId ? { projectId: input.projectId } : {}),
          ...(input.parentPropertyId ? { parentPropertyId: input.parentPropertyId } : {}),
          status: 'draft',
          active: true
        },
        metadata: metadata(claims, input.reason, context, now())
      });
      return data(write(result));
    },
    async get(claims, id) {
      provider(claims);
      propertyObjectIdSchema.parse(id);
      const result = await dependencies.repository.findOwned(claims.sub, id);
      if (!result) throw new PropertyServiceError('PROPERTY_NOT_FOUND');
      return data(result);
    },
    async saveStep(claims, id, unparsedStep, unparsedInput, context) {
      provider(claims);
      propertyObjectIdSchema.parse(id);
      const step = propertyDraftStepSchema.parse(unparsedStep);
      const before = await dependencies.repository.findOwned(claims.sub, id);
      if (!before) throw new PropertyServiceError('PROPERTY_NOT_FOUND');
      if (!['draft', 'needs_changes'].includes(before.status)) throw new PropertyServiceError('PROPERTY_INVALID_STATE');
      if (step === 'basic') {
        const input = propertyCoreStepSchema.parse(unparsedInput) as PropertyCoreStep;
        return data(write(await dependencies.repository.updateCore({ providerId: claims.sub, id, expectedVersion: input.version, changes: input, before, metadata: metadata(claims, input.reason, context, now()) })));
      }
      if (step === 'details') {
        const input = propertyDetailsStepSchema.parse(unparsedInput) as PropertyDetailsStep;
        return data(write(await dependencies.repository.updateDetails({ providerId: claims.sub, id, expectedVersion: input.version, changes: input, before, metadata: metadata(claims, input.reason, context, now()) })));
      }
      if (step === 'price-payment') {
        const input = propertyPricingStepSchema.parse(unparsedInput) as PropertyPricingStep;
        return data(write(await dependencies.repository.updatePricing({ providerId: claims.sub, id, expectedVersion: input.version, changes: input, before, metadata: metadata(claims, input.reason, context, now()) })));
      }
      if (step === 'features-services') {
        const input = propertyFeaturesServicesStepSchema.parse(unparsedInput) as PropertyFeaturesServicesStep;
        return data(write(await dependencies.repository.updateFeaturesServices({ providerId: claims.sub, id, expectedVersion: input.version, changes: input, before, metadata: metadata(claims, input.reason, context, now()) })));
      }
      if (step === 'contact') {
        const input = propertyContactStepSchema.parse(unparsedInput) as PropertyContactStep;
        return data(write(await dependencies.repository.updateContact({ providerId: claims.sub, id, expectedVersion: input.version, changes: input, before, metadata: metadata(claims, input.reason, context, now()) })));
      }
      const input = propertyLocationStepSchema.parse(unparsedInput) as PropertyLocationStep;
      return data(write(await dependencies.repository.updateLocation({ providerId: claims.sub, id, expectedVersion: input.version, changes: input, before, metadata: metadata(claims, input.reason, context, now()) })));
    },
    async validate(claims, id) {
      provider(claims); propertyObjectIdSchema.parse(id); const result = await dependencies.repository.findOwned(claims.sub, id); if (!result) throw new PropertyServiceError('PROPERTY_NOT_FOUND'); return validation(result);
    },
    async submit(claims, id, unparsedInput, context) {
      provider(claims); propertyObjectIdSchema.parse(id); const input = propertySubmitSchema.parse(unparsedInput) as PropertySubmit; const before = await dependencies.repository.findOwned(claims.sub, id); if (!before) throw new PropertyServiceError('PROPERTY_NOT_FOUND'); const result = validation(before); if (!result.valid) throw new PropertyServiceError('PROPERTY_VALIDATION_FAILED', result); const submitted = await dependencies.repository.submit({ providerId: claims.sub, id, expectedVersion: input.version, before, metadata: metadata(claims, input.reason, context, now()) }); if (submitted.kind === 'invalid_state') throw new PropertyServiceError('PROPERTY_INVALID_STATE'); if (submitted.kind === 'version_conflict') throw new PropertyServiceError('PROPERTY_VERSION_CONFLICT'); if (submitted.kind === 'not_found') throw new PropertyServiceError('PROPERTY_NOT_FOUND'); if (submitted.kind === 'written' || submitted.kind === 'already_submitted') return data(submitted.property); throw new PropertyServiceError('PROPERTY_INVALID_STATE');
    },
    async review(adminId, id, unparsedInput, context) {
      await adminPermission(adminId, 'admin:properties.review');
      propertyObjectIdSchema.parse(id);
      const input = propertyReviewSchema.parse(unparsedInput) as PropertyReview;
      const before = await dependencies.repository.findByIdAny(id);
      if (!before) throw new PropertyServiceError('PROPERTY_NOT_FOUND');
      const toStatus = input.action === 'needs_changes' ? 'needs_changes' : input.action === 'approve' ? 'approved' : input.action === 'reject' ? 'rejected' : 'published';
      return data(write(await dependencies.repository.review({ id, expectedVersion: input.version, toStatus, reviewerId: adminId, before, metadata: { actorId: adminId, reason: input.reason, requestId: context.requestId, traceId: context.traceId, changedAt: now() } })));
    },
    async visibility(adminId, id, unparsedInput, context) {
      await adminPermission(adminId, 'admin:properties.manage');
      propertyObjectIdSchema.parse(id);
      const input = propertyVisibilitySchema.parse(unparsedInput) as PropertyVisibility;
      const before = await dependencies.repository.findByIdAny(id);
      if (!before) throw new PropertyServiceError('PROPERTY_NOT_FOUND');
      return data(write(await dependencies.repository.visibility({ id, expectedVersion: input.version, action: input.action, before, metadata: { actorId: adminId, reason: input.reason, requestId: context.requestId, traceId: context.traceId, changedAt: now() } })));
    }
  };
}
