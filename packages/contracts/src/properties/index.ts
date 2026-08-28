import { z } from 'zod';
import { normalizedPhoneSchema } from '../auth/index.js';
import { localizedTextSchema, supportedLocaleSchema } from '../localization/index.js';
import { sourceIdentitySchema } from '../organizations/index.js';

export const PROPERTY_KINDS = ['property', 'unit'] as const;
export const propertyKindSchema = z.enum(PROPERTY_KINDS);

export const PROPERTY_TRANSACTION_TYPES = ['sale', 'rent'] as const;
export const propertyTransactionTypeSchema = z.enum(PROPERTY_TRANSACTION_TYPES);
export const PROPERTY_DELIVERY_STATUSES = ['ready_to_move', 'under_construction', 'future_delivery'] as const;
export const propertyDeliveryStatusSchema = z.enum(PROPERTY_DELIVERY_STATUSES);

export const PROPERTY_STATUSES = [
  'draft',
  'pending_review',
  'needs_changes',
  'approved',
  'published',
  'rejected',
  'hidden',
  'archived'
] as const;
export const propertyStatusSchema = z.enum(PROPERTY_STATUSES);

export const propertyObjectIdSchema = z.string().regex(/^[a-f0-9]{24}$/);
export const propertySlugSchema = z.string().trim().min(2).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const propertyReasonSchema = z.string().trim().min(5).max(500).regex(/^[^\u0000-\u001f\u007f]+$/u);
export const propertyCoordinatesSchema = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180)
}).strict();
export const propertyMapUrlSchema = z.string().trim().max(2_048).url().refine(
  value => new URL(value).protocol === 'https:',
  { message: 'Map URL must use HTTPS' }
);
export const PROPERTY_DRAFT_STEPS = ['basic', 'location', 'details', 'price-payment', 'features-services', 'contact'] as const;
export const propertyDraftStepSchema = z.enum(PROPERTY_DRAFT_STEPS);
export const propertyIdParamsSchema = z.object({ propertyId: propertyObjectIdSchema }).strict();
export const propertyStepParamsSchema = z.object({ propertyId: propertyObjectIdSchema, step: propertyDraftStepSchema }).strict();
export const propertySubmitSchema = z.object({ version: z.number().int().nonnegative(), reason: propertyReasonSchema }).strict();
export const PROPERTY_REVIEW_ACTIONS = ['needs_changes', 'approve', 'reject', 'publish'] as const;
export const propertyReviewActionSchema = z.enum(PROPERTY_REVIEW_ACTIONS);
export const propertyReviewSchema = z.object({ version: z.number().int().nonnegative(), action: propertyReviewActionSchema, reason: propertyReasonSchema }).strict();
export const PROPERTY_VISIBILITY_ACTIONS = ['hide', 'restore', 'archive'] as const;
export const propertyVisibilityActionSchema = z.enum(PROPERTY_VISIBILITY_ACTIONS);
export const propertyVisibilitySchema = z.object({ version: z.number().int().nonnegative(), action: propertyVisibilityActionSchema, reason: propertyReasonSchema }).strict();
export const PROPERTY_AVAILABLE_ACTIONS = ['update', 'submit', 'needs_changes', 'approve', 'reject', 'publish', 'hide', 'restore', 'archive'] as const;
export const propertyAvailableActionSchema = z.enum(PROPERTY_AVAILABLE_ACTIONS);
const positiveQuery = (fallback: number, max: number) => z.preprocess(value => value === undefined ? fallback : Number(value), z.number().int().positive().max(max));
export const propertyListQuerySchema = z.object({
  status: propertyStatusSchema.optional(),
  search: z.string().trim().min(1).max(80).optional(),
  sort: z.enum(['updatedAt', 'name', 'slug']).default('updatedAt'),
  direction: z.enum(['asc', 'desc']).default('desc'),
  page: positiveQuery(1, 100000),
  limit: positiveQuery(20, 100)
}).strict();
export const propertyAdminListQuerySchema = z.object({
  status: propertyStatusSchema.optional(),
  providerId: propertyObjectIdSchema.optional(),
  locationId: propertyObjectIdSchema.optional(),
  projectId: propertyObjectIdSchema.optional(),
  active: z.preprocess(value => value === undefined ? undefined : value === true || value === 'true', z.boolean()).optional(),
  search: z.string().trim().min(1).max(80).optional(),
  sort: z.enum(['updatedAt', 'name', 'slug', 'status']).default('updatedAt'),
  direction: z.enum(['asc', 'desc']).default('desc'),
  page: positiveQuery(1, 100000),
  limit: positiveQuery(20, 100)
}).strict();
export const propertyDuplicateQuerySchema = z.object({ propertyId: propertyObjectIdSchema, limit: positiveQuery(20, 100) }).strict();
export const PROPERTY_DUPLICATE_SIGNALS = ['same_slug', 'same_location_transaction', 'same_localized_name'] as const;
export const propertyDuplicateSignalSchema = z.enum(PROPERTY_DUPLICATE_SIGNALS);
export const propertyDuplicateCandidateSchema = z.object({ candidateId: propertyObjectIdSchema, signals: z.array(propertyDuplicateSignalSchema).min(1).max(3), explanation: z.string().trim().min(5).max(500) }).strict();
export const propertyDuplicateDataSchema = z.object({ propertyId: propertyObjectIdSchema, items: z.array(propertyDuplicateCandidateSchema).max(100), total: z.number().int().nonnegative() }).strict();
export const propertyValidationIssueSchema = z.object({ path: z.string().regex(/^[a-z][a-zA-Z0-9]*(?:\.[a-z][a-zA-Z0-9]*)*$/), code: z.enum(['required', 'invalid_state']), messageKey: z.string().regex(/^errors\.properties\.[a-zA-Z0-9_.]+$/) }).strict();
export const propertyValidationDataSchema = z.object({ valid: z.boolean(), issues: z.array(propertyValidationIssueSchema).max(20) }).strict();

/**
 * The persisted source is a relationship, not a user-editable verification
 * badge. The public, derived identity uses the shared source identity
 * projection and can therefore only report genuine provider/organization
 * approval.
 */
export const propertySourceSchema = z.object({
  providerId: propertyObjectIdSchema,
  sourceType: z.enum(['individual_broker', 'brokerage_office', 'developer_company']),
  organizationId: propertyObjectIdSchema.optional()
}).strict().superRefine((value, context) => {
  if (value.sourceType === 'individual_broker' && value.organizationId) {
    context.addIssue({ code: 'custom', path: ['organizationId'], message: 'Individual brokers cannot link an organization' });
  }
  if (value.sourceType !== 'individual_broker' && !value.organizationId) {
    context.addIssue({ code: 'custom', path: ['organizationId'], message: 'An organization is required for office and developer sources' });
  }
});

export const propertyUnitSchema = z.object({
  id: propertyObjectIdSchema,
  name: localizedTextSchema,
  slug: propertySlugSchema,
  kind: z.literal('unit'),
  status: propertyStatusSchema,
  transactionType: propertyTransactionTypeSchema,
  projectId: propertyObjectIdSchema.optional(),
  parentPropertyId: propertyObjectIdSchema.optional()
}).strict();

export const propertyCreateSchema = z.object({
  kind: propertyKindSchema.default('property'),
  name: localizedTextSchema,
  slug: propertySlugSchema,
  transactionType: propertyTransactionTypeSchema,
  projectId: propertyObjectIdSchema.optional(),
  parentPropertyId: propertyObjectIdSchema.optional(),
  source: propertySourceSchema,
  reason: propertyReasonSchema
}).strict().superRefine((value, context) => {
  if (value.kind === 'property' && value.parentPropertyId) {
    context.addIssue({ code: 'custom', path: ['parentPropertyId'], message: 'Only units can have a parent property' });
  }
  if (value.kind === 'unit' && !value.parentPropertyId && !value.projectId) {
    context.addIssue({ code: 'custom', path: ['parentPropertyId'], message: 'Units require a parent property or project' });
  }
});

export const propertyDraftCreateSchema = propertyCreateSchema;

const draftPatch = <T extends z.ZodRawShape>(shape: T) => z.object({
  version: z.number().int().nonnegative(),
  ...shape,
  reason: propertyReasonSchema
}).strict().refine((value) => Object.keys(value).some((key) => !['version', 'reason'].includes(key)), {
  message: 'At least one property draft field is required'
});

export const propertyCoreStepSchema = draftPatch({
  kind: propertyKindSchema.optional(),
  name: localizedTextSchema.optional(),
  slug: propertySlugSchema.optional(),
  transactionType: propertyTransactionTypeSchema.optional(),
  projectId: propertyObjectIdSchema.nullable().optional(),
  parentPropertyId: propertyObjectIdSchema.nullable().optional()
});

export const propertyLocationStepSchema = draftPatch({
  locationId: propertyObjectIdSchema.nullable().optional(),
  coordinates: propertyCoordinatesSchema.nullable().optional(),
  mapUrl: propertyMapUrlSchema.nullable().optional()
});

export const propertyDescriptionSchema = localizedTextSchema;
export const propertyAreaSchema = z.object({
  value: z.number().finite().positive().max(1_000_000),
  unit: z.literal('sqm')
}).strict();
export const propertyLayoutSchema = z.object({
  bedrooms: z.number().int().nonnegative().max(100).optional(),
  bathrooms: z.number().int().nonnegative().max(100).optional(),
  floor: z.number().int().nonnegative().max(1_000).optional(),
  totalFloors: z.number().int().positive().max(1_000).optional()
}).strict().superRefine((value, context) => {
  if (value.floor !== undefined && value.totalFloors !== undefined && value.floor > value.totalFloors) {
    context.addIssue({ code: 'custom', path: ['floor'], message: 'Floor cannot exceed total floors' });
  }
});
export const propertyDetailsStepSchema = draftPatch({
  description: propertyDescriptionSchema.nullable().optional(),
  propertyTypeId: propertyObjectIdSchema.nullable().optional(),
  deliveryStatus: propertyDeliveryStatusSchema.nullable().optional(),
  area: propertyAreaSchema.nullable().optional(),
  layout: propertyLayoutSchema.optional()
});

export const propertyMoneySchema = z.object({
  amount: z.number().finite().positive().max(1_000_000_000_000_000),
  currency: z.string().regex(/^[A-Z]{3}$/)
}).strict();
export const propertyPaymentPlanSchema = z.object({
  name: localizedTextSchema,
  installments: z.number().int().positive().max(120),
  frequency: z.enum(['monthly', 'quarterly', 'annually']),
  downPayment: propertyMoneySchema.optional(),
  installmentAmount: propertyMoneySchema
}).strict();
export const propertyPricingStepSchema = draftPatch({
  transactionType: propertyTransactionTypeSchema.optional(),
  price: propertyMoneySchema.optional(),
  paymentPlans: z.array(propertyPaymentPlanSchema).max(20).optional()
}).superRefine((value, context) => {
  if (value.paymentPlans && value.paymentPlans.length > 0 && !value.price) {
    context.addIssue({ code: 'custom', path: ['price'], message: 'A price is required when payment plans are supplied' });
  }
  if (value.price && value.paymentPlans) {
    const currencies = new Set([value.price.currency, ...value.paymentPlans.flatMap(plan => [plan.downPayment?.currency, plan.installmentAmount.currency]).filter((currency): currency is string => Boolean(currency))]);
    if (currencies.size > 1) context.addIssue({ code: 'custom', path: ['paymentPlans'], message: 'Payment plan currencies must match the property price currency' });
  }
});

const propertyReferenceIdsSchema = z.array(propertyObjectIdSchema).max(50).refine(
  (values) => new Set(values).size === values.length,
  { message: 'Property references must be unique' }
);

export const propertyFeaturesServicesStepSchema = draftPatch({
  featureIds: propertyReferenceIdsSchema.optional(),
  serviceIds: propertyReferenceIdsSchema.optional()
}).superRefine((value, context) => {
  const serviceIds = new Set(value.serviceIds ?? []);
  if ((value.featureIds ?? []).some((id) => serviceIds.has(id))) context.addIssue({ code: 'custom', path: ['serviceIds'], message: 'A reference cannot be both a feature and a service' });
});

const propertyContactNameSchema = z.string().trim().min(1).max(160).regex(/^[^\u0000-\u001f\u007f]+$/u);
const propertyContactEmailSchema = z.string().trim().toLowerCase().email().max(254);
export const propertyContactSchema = z.object({
  contactName: propertyContactNameSchema.optional(),
  phone: normalizedPhoneSchema.optional(),
  whatsappNumber: normalizedPhoneSchema.optional(),
  email: propertyContactEmailSchema.optional(),
  preferredLocale: supportedLocaleSchema.optional()
}).strict().refine((value) => Object.keys(value).length > 0, { message: 'Contact data cannot be empty' });
export const propertyContactStepSchema = draftPatch({
  contact: propertyContactSchema.nullable().optional()
});

export const propertyStepSchema = z.union([propertyCoreStepSchema, propertyLocationStepSchema, propertyDetailsStepSchema, propertyPricingStepSchema, propertyFeaturesServicesStepSchema, propertyContactStepSchema]);

export const propertyDataSchema = z.object({
  id: propertyObjectIdSchema,
  kind: propertyKindSchema,
  name: localizedTextSchema,
  slug: propertySlugSchema,
  transactionType: propertyTransactionTypeSchema,
  source: propertySourceSchema,
  projectId: propertyObjectIdSchema.optional(),
  parentPropertyId: propertyObjectIdSchema.optional(),
  locationId: propertyObjectIdSchema.optional(),
  coordinates: propertyCoordinatesSchema.optional(),
  mapUrl: propertyMapUrlSchema.optional(),
  description: propertyDescriptionSchema.optional(),
  propertyTypeId: propertyObjectIdSchema.optional(),
  deliveryStatus: propertyDeliveryStatusSchema.optional(),
  area: propertyAreaSchema.optional(),
  layout: propertyLayoutSchema.optional(),
  price: propertyMoneySchema.optional(),
  paymentPlans: z.array(propertyPaymentPlanSchema).max(20).optional(),
  featureIds: propertyReferenceIdsSchema.optional(),
  serviceIds: propertyReferenceIdsSchema.optional(),
  contact: propertyContactSchema.optional(),
  status: propertyStatusSchema,
  submittedAt: z.string().datetime({ offset: true }).optional(),
  reviewedBy: propertyObjectIdSchema.optional(),
  reviewedAt: z.string().datetime({ offset: true }).optional(),
  reviewReason: propertyReasonSchema.optional(),
  publishedAt: z.string().datetime({ offset: true }).optional(),
  active: z.boolean(),
  version: z.number().int().nonnegative(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
  availableActions: z.array(propertyAvailableActionSchema).max(9)
}).strict();
export const propertyListDataSchema = z.object({ items: z.array(propertyDataSchema) }).strict();

export const propertySourceIdentitySchema = sourceIdentitySchema;
export const propertyLocaleSchema = supportedLocaleSchema;

export type PropertyKind = z.infer<typeof propertyKindSchema>;
export type PropertyTransactionType = z.infer<typeof propertyTransactionTypeSchema>;
export type PropertyDeliveryStatus = z.infer<typeof propertyDeliveryStatusSchema>;
export type PropertyStatus = z.infer<typeof propertyStatusSchema>;
export type PropertySource = z.infer<typeof propertySourceSchema>;
export type PropertyUnit = z.infer<typeof propertyUnitSchema>;
export type PropertyCreate = z.infer<typeof propertyCreateSchema>;
export type PropertyDraftCreate = z.infer<typeof propertyDraftCreateSchema>;
export type PropertyDraftStep = z.infer<typeof propertyDraftStepSchema>;
export type PropertyCoreStep = z.infer<typeof propertyCoreStepSchema>;
export type PropertyLocationStep = z.infer<typeof propertyLocationStepSchema>;
export type PropertyDescription = z.infer<typeof propertyDescriptionSchema>;
export type PropertyArea = z.infer<typeof propertyAreaSchema>;
export type PropertyLayout = z.infer<typeof propertyLayoutSchema>;
export type PropertyDetailsStep = z.infer<typeof propertyDetailsStepSchema>;
export type PropertyMoney = z.infer<typeof propertyMoneySchema>;
export type PropertyPaymentPlan = z.infer<typeof propertyPaymentPlanSchema>;
export type PropertyPricingStep = z.infer<typeof propertyPricingStepSchema>;
export type PropertyFeaturesServicesStep = z.infer<typeof propertyFeaturesServicesStepSchema>;
export type PropertyContact = z.infer<typeof propertyContactSchema>;
export type PropertyContactStep = z.infer<typeof propertyContactStepSchema>;
export type PropertyStep = z.infer<typeof propertyStepSchema>;
export type PropertyCoordinates = z.infer<typeof propertyCoordinatesSchema>;
export type PropertyMapUrl = z.infer<typeof propertyMapUrlSchema>;
export type PropertyIdParams = z.infer<typeof propertyIdParamsSchema>;
export type PropertyStepParams = z.infer<typeof propertyStepParamsSchema>;
export type PropertySubmit = z.infer<typeof propertySubmitSchema>;
export type PropertyReviewAction = z.infer<typeof propertyReviewActionSchema>;
export type PropertyReview = z.infer<typeof propertyReviewSchema>;
export type PropertyVisibilityAction = z.infer<typeof propertyVisibilityActionSchema>;
export type PropertyVisibility = z.infer<typeof propertyVisibilitySchema>;
export type PropertyAvailableAction = z.infer<typeof propertyAvailableActionSchema>;
export type PropertyListQuery = z.infer<typeof propertyListQuerySchema>;
export type PropertyListData = z.infer<typeof propertyListDataSchema>;
export type PropertyAdminListQuery = z.infer<typeof propertyAdminListQuerySchema>;
export type PropertyDuplicateQuery = z.infer<typeof propertyDuplicateQuerySchema>;
export type PropertyDuplicateCandidate = z.infer<typeof propertyDuplicateCandidateSchema>;
export type PropertyDuplicateData = z.infer<typeof propertyDuplicateDataSchema>;
export type PropertyValidationIssue = z.infer<typeof propertyValidationIssueSchema>;
export type PropertyValidationData = z.infer<typeof propertyValidationDataSchema>;
export type PropertyData = z.infer<typeof propertyDataSchema>;
export type PropertySourceIdentity = z.infer<typeof propertySourceIdentitySchema>;
