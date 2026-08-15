import { z } from 'zod';
import { adCalendarStatusSchema, adQuoteLineItemSchema, adRequestStatusSchema } from '../ads/index.js';
import { authSessionDataSchema, normalizedPhoneSchema } from '../auth/index.js';
import { commissionPolicyKindSchema, commissionResolutionSourceSchema } from '../commissions/index.js';
import { successEnvelopeSchema } from '../contracts/envelopes.js';

export const PROVIDER_TYPES = [
  'individual_broker',
  'brokerage_office',
  'developer_company'
] as const;
export const providerTypeSchema = z.enum(PROVIDER_TYPES);

export const PROVIDER_APPLICATION_STATES = [
  'draft',
  'pending_review',
  'needs_information',
  'approved',
  'rejected',
  'suspended'
] as const;
export const providerApplicationStateSchema = z.enum(PROVIDER_APPLICATION_STATES);

export const PROVIDER_DOCUMENT_REVIEW_STATES = [
  'uploaded',
  'pending_review',
  'needs_replacement',
  'approved',
  'rejected'
] as const;
export const providerDocumentReviewStateSchema = z.enum(PROVIDER_DOCUMENT_REVIEW_STATES);

export const PROVIDER_DOCUMENT_CATEGORIES = [
  'government_id_front',
  'government_id_back',
  'broker_license',
  'professional_membership',
  'commercial_registration',
  'tax_card',
  'authorized_representative_id_front',
  'authorized_representative_id_back',
  'authorization_letter',
  'brokerage_license',
  'company_profile',
  'developer_license',
  'additional_supporting_document'
] as const;
export const providerDocumentCategorySchema = z.enum(PROVIDER_DOCUMENT_CATEGORIES);

export const providerLocaleSchema = z.enum(['ar', 'en', 'zh-CN']);
export const providerApplicationVersionSchema = z.number().int().nonnegative();

const opaqueTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
const safeTextSchema = z.string().trim().min(1).max(200).regex(/^[^\u0000-\u001f\u007f]+$/);
const longTextSchema = z.string().trim().min(1).max(2_000).regex(/^[^\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]+$/);
const objectIdSchema = z.string().regex(/^[a-f0-9]{24}$/);
const emailSchema = z.string().trim().toLowerCase().email().max(254);
const urlSchema = z.url().max(2_048);
const acceptedAtSchema = z.string().datetime({ offset: true });

export const providerSocialLinkSchema = z.object({
  kind: z.string().trim().regex(/^[a-z][a-z0-9_]{1,39}$/),
  url: urlSchema
}).strict();

export const providerApplicationCreateRequestSchema = z.object({
  verificationToken: opaqueTokenSchema,
  providerType: providerTypeSchema
}).strict();

function draftPatch<T extends z.ZodRawShape>(shape: T) {
  return z.object({ version: providerApplicationVersionSchema, ...shape }).strict().refine(
    (value) => Object.keys(value).some((key) => key !== 'version'),
    { message: 'At least one draft field is required' }
  );
}

export const providerAccountPatchSchema = draftPatch({
  accountOwnerFullName: safeTextSchema.max(160).optional(),
  displayName: safeTextSchema.max(160).optional(),
  email: emailSchema.optional(),
  primaryLocationId: objectIdSchema.optional(),
  serviceAreaIds: z.array(objectIdSchema).max(50).optional(),
  preferredLocale: providerLocaleSchema.optional(),
  termsAcceptedAt: acceptedAtSchema.optional(),
  privacyAcceptedAt: acceptedAtSchema.optional(),
  secondaryPhone: normalizedPhoneSchema.optional(),
  whatsappNumber: normalizedPhoneSchema.optional(),
  profileAssetId: objectIdSchema.optional(),
  biography: longTextSchema.optional(),
  website: urlSchema.optional(),
  socialLinks: z.array(providerSocialLinkSchema).max(10).optional()
});

export const providerBusinessPatchSchema = draftPatch({
  legalBusinessName: safeTextSchema.max(200).optional(),
  tradeName: safeTextSchema.max(200).optional(),
  businessAddress: safeTextSchema.max(500).optional(),
  commercialRegistrationNumber: safeTextSchema.max(100).optional(),
  taxRegistrationNumber: safeTextSchema.max(100).optional(),
  authorizedRepresentativeFullName: safeTextSchema.max(160).optional(),
  authorizedRepresentativeTitle: safeTextSchema.max(120).optional(),
  accountOwnerHasRegisteredAuthority: z.boolean().optional()
});

export const providerCompanyPatchSchema = draftPatch({
  legalCompanyName: safeTextSchema.max(200).optional(),
  brandName: safeTextSchema.max(200).optional(),
  headOfficeAddress: safeTextSchema.max(500).optional(),
  commercialRegistrationNumber: safeTextSchema.max(100).optional(),
  taxRegistrationNumber: safeTextSchema.max(100).optional(),
  authorizedRepresentativeFullName: safeTextSchema.max(160).optional(),
  authorizedRepresentativeTitle: safeTextSchema.max(120).optional(),
  accountOwnerHasRegisteredAuthority: z.boolean().optional()
});

export const providerSubmitRequestSchema = z.object({
  version: providerApplicationVersionSchema
}).strict();

export const documentRequirementConditionSchema = z.object({
  key: z.literal('account_owner_lacks_registered_authority'),
  field: z.literal('accountOwnerHasRegisteredAuthority'),
  operator: z.literal('equals'),
  value: z.literal(false)
}).strict();

export const providerDocumentRequirementSchema = z.object({
  key: providerDocumentCategorySchema,
  labelKey: z.string().regex(/^provider\.documents\.[a-z][a-zA-Z0-9]*$/),
  classification: z.enum(['required', 'optional', 'conditional']),
  condition: documentRequirementConditionSchema.optional()
}).strict().superRefine((value, context) => {
  if (value.classification === 'conditional' && !value.condition) {
    context.addIssue({ code: 'custom', path: ['condition'], message: 'Conditional requirements need a condition' });
  }
  if (value.classification !== 'conditional' && value.condition) {
    context.addIssue({ code: 'custom', path: ['condition'], message: 'Only conditional requirements can define a condition' });
  }
});

export const providerRequirementSnapshotItemSchema = providerDocumentRequirementSchema.extend({
  applies: z.boolean()
}).strict();

export const providerRequirementSnapshotSchema = z.object({
  version: z.string().regex(/^\d{4}-\d{2}-\d{2}\.\d+$/),
  providerType: providerTypeSchema,
  requirements: z.array(providerRequirementSnapshotItemSchema).min(1).max(20)
}).strict();

export const providerApplicationDataSchema = z.object({
  id: objectIdSchema,
  providerType: providerTypeSchema,
  status: providerApplicationStateSchema,
  version: providerApplicationVersionSchema,
  phone: normalizedPhoneSchema,
  requirementVersion: z.string().regex(/^\d{4}-\d{2}-\d{2}\.\d+$/),
  accountOwnerFullName: safeTextSchema.max(160).optional(),
  displayName: safeTextSchema.max(160).optional(),
  email: emailSchema.optional(),
  primaryLocationId: objectIdSchema.optional(),
  serviceAreaIds: z.array(objectIdSchema).max(50).optional(),
  preferredLocale: providerLocaleSchema.optional(),
  termsAcceptedAt: z.string().datetime().optional(),
  privacyAcceptedAt: z.string().datetime().optional(),
  secondaryPhone: normalizedPhoneSchema.optional(),
  whatsappNumber: normalizedPhoneSchema.optional(),
  profileAssetId: objectIdSchema.optional(),
  biography: longTextSchema.optional(),
  website: urlSchema.optional(),
  socialLinks: z.array(providerSocialLinkSchema).max(10).optional(),
  legalBusinessName: safeTextSchema.max(200).optional(),
  tradeName: safeTextSchema.max(200).optional(),
  businessAddress: safeTextSchema.max(500).optional(),
  legalCompanyName: safeTextSchema.max(200).optional(),
  brandName: safeTextSchema.max(200).optional(),
  headOfficeAddress: safeTextSchema.max(500).optional(),
  commercialRegistrationNumber: safeTextSchema.max(100).optional(),
  taxRegistrationNumber: safeTextSchema.max(100).optional(),
  authorizedRepresentativeFullName: safeTextSchema.max(160).optional(),
  authorizedRepresentativeTitle: safeTextSchema.max(120).optional(),
  accountOwnerHasRegisteredAuthority: z.boolean().optional(),
  requirementsSnapshot: providerRequirementSnapshotSchema.optional(),
  missingFields: z.array(z.string().regex(/^[a-z][a-zA-Z0-9]*$/)),
  missingDocuments: z.array(providerDocumentCategorySchema),
  availableActions: z.array(z.enum(['edit_account', 'edit_business', 'edit_company', 'submit', 'view_status', 'open_dashboard'])),
  submittedAt: z.string().datetime().optional(),
  reviewReason: safeTextSchema.max(1_000).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
}).strict();

export const providerApplicationStatusDataSchema = z.object({
  applicationId: objectIdSchema,
  providerType: providerTypeSchema,
  status: providerApplicationStateSchema,
  version: providerApplicationVersionSchema,
  submittedAt: z.string().datetime().optional(),
  reviewReason: safeTextSchema.max(1_000).optional(),
  availableActions: providerApplicationDataSchema.shape.availableActions
}).strict();

export const providerRegistrationDataSchema = z.object({
  outcome: z.literal('registered_draft'),
  session: authSessionDataSchema,
  application: providerApplicationDataSchema
}).strict();

export const providerRegistrationSuccessEnvelopeSchema = successEnvelopeSchema(providerRegistrationDataSchema);
export const providerApplicationSuccessEnvelopeSchema = successEnvelopeSchema(providerApplicationDataSchema);
export const providerApplicationStatusSuccessEnvelopeSchema = successEnvelopeSchema(providerApplicationStatusDataSchema);

const providerAdvertisingObjectIdSchema = z.string().regex(/^[a-f0-9]{24}$/);
const providerAdvertisingDateSchema = z.string().datetime({ offset: true });
export const providerAdRequestHistoryEntrySchema = z.object({
  status: adRequestStatusSchema,
  version: z.number().int().nonnegative(),
  reason: safeTextSchema.max(500).optional(),
  changedAt: providerAdvertisingDateSchema
}).strict();
export const providerAdQuoteDecisionHistorySchema = z.object({
  action: z.enum(['issued', 'accepted', 'rejected', 'cancelled', 'expired']),
  reason: safeTextSchema.max(500).optional(),
  version: z.number().int().nonnegative(),
  createdAt: providerAdvertisingDateSchema
}).strict();
export const providerAdQuoteProjectionSchema = z.object({
  id: providerAdvertisingObjectIdSchema,
  requestId: providerAdvertisingObjectIdSchema,
  currency: z.string().regex(/^[A-Z]{3}$/),
  lineItems: z.array(adQuoteLineItemSchema).min(1).max(50),
  totalMinor: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  validUntil: providerAdvertisingDateSchema,
  terms: safeTextSchema.max(2_000),
  notes: safeTextSchema.max(2_000).optional(),
  status: z.enum(['issued', 'accepted', 'rejected', 'cancelled', 'expired']),
  version: z.number().int().nonnegative(),
  decisionHistory: z.array(providerAdQuoteDecisionHistorySchema).min(1).max(100)
}).strict();
export const providerAdPaymentHistoryEntrySchema = z.object({
  action: z.enum(['approve', 'reject']),
  reason: safeTextSchema.max(500),
  version: z.number().int().positive(),
  createdAt: providerAdvertisingDateSchema
}).strict();
export const providerAdPaymentProjectionSchema = z.object({
  id: providerAdvertisingObjectIdSchema,
  adRequestId: providerAdvertisingObjectIdSchema,
  status: z.enum(['uploaded', 'pending_review', 'approved', 'rejected']),
  securityState: z.enum(['quarantined', 'scan_pending', 'clean', 'infected', 'scan_failed', 'deleted']),
  version: z.number().int().positive(),
  reviewHistory: z.array(providerAdPaymentHistoryEntrySchema).max(100),
  uploadedAt: providerAdvertisingDateSchema,
  active: z.boolean()
}).strict();
export const providerAdScheduleProjectionSchema = z.object({
  status: adCalendarStatusSchema,
  startsAt: providerAdvertisingDateSchema,
  endsAt: providerAdvertisingDateSchema,
  timezone: z.literal('Africa/Cairo'),
  localStart: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/),
  localEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/),
  version: z.number().int().nonnegative()
}).strict();
export const providerAdRequestProjectionSchema = z.object({
  id: providerAdvertisingObjectIdSchema,
  placementKey: z.string().trim().min(2).max(80).regex(/^[a-z][a-z0-9_.-]*$/),
  purpose: safeTextSchema.max(500),
  intervalStart: providerAdvertisingDateSchema,
  intervalEnd: providerAdvertisingDateSchema,
  status: adRequestStatusSchema,
  version: z.number().int().nonnegative(),
  createdAt: providerAdvertisingDateSchema,
  updatedAt: providerAdvertisingDateSchema,
  history: z.array(providerAdRequestHistoryEntrySchema).max(100),
  quote: providerAdQuoteProjectionSchema.optional(),
  paymentProofs: z.array(providerAdPaymentProjectionSchema).max(20),
  schedule: providerAdScheduleProjectionSchema.optional()
}).strict();
export const providerAdRequestListQuerySchema = z.object({
  status: adRequestStatusSchema.optional(),
  page: z.preprocess(value => value === undefined ? 1 : Number(value), z.number().int().positive().max(100_000)),
  limit: z.preprocess(value => value === undefined ? 20 : Number(value), z.number().int().positive().max(100))
}).strict();
export const providerAdRequestListDataSchema = z.object({
  items: z.array(providerAdRequestProjectionSchema).max(100),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  total: z.number().int().nonnegative()
}).strict();
export const providerAdRequestSuccessEnvelopeSchema = successEnvelopeSchema(providerAdRequestProjectionSchema);
export const providerAdRequestListSuccessEnvelopeSchema = successEnvelopeSchema(providerAdRequestListDataSchema);
export const providerAdvertisingRequestSchema = providerAdRequestProjectionSchema;
export const providerAdvertisingRequestListQuerySchema = providerAdRequestListQuerySchema;
export const providerAdvertisingRequestListDataSchema = providerAdRequestListDataSchema;

/** Provider-facing data deliberately omits resolver and administrative internals. */
export const providerCommissionProjectionSchema = z.object({
  accountId: providerAdvertisingObjectIdSchema,
  source: commissionResolutionSourceSchema,
  effectiveAt: providerAdvertisingDateSchema,
  policyVersion: z.number().int().nonnegative().optional(),
  kind: commissionPolicyKindSchema.optional(),
  percentageBps: z.number().int().nonnegative().max(10_000).optional(),
  fixedAmountMinor: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(),
  currency: z.string().regex(/^[A-Z]{3}$/).optional(),
  readOnly: z.literal(true)
}).strict().superRefine((value, context) => {
  if (value.source === 'none') {
    if (value.policyVersion !== undefined || value.kind !== undefined || value.percentageBps !== undefined || value.fixedAmountMinor !== undefined || value.currency !== undefined) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['source'], message: 'An unavailable commission cannot contain policy values' });
    }
    return;
  }
  if (value.policyVersion === undefined || value.kind === undefined) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['policyVersion'], message: 'An applied commission requires a source version and kind' });
  }
  if (value.kind === 'percentage' && value.percentageBps === undefined) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['percentageBps'], message: 'Percentage commissions require percentageBps' });
  }
  if (value.kind !== 'percentage' && value.percentageBps !== undefined) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['percentageBps'], message: 'Only percentage commissions define percentageBps' });
  }
  if (value.kind === 'fixed' && (value.fixedAmountMinor === undefined || value.currency === undefined)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['fixedAmountMinor'], message: 'Fixed commissions require amount and currency' });
  }
  if (value.kind !== 'fixed' && (value.fixedAmountMinor !== undefined || value.currency !== undefined)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['fixedAmountMinor'], message: 'Only fixed commissions define amount and currency' });
  }
});
export const providerCommissionSuccessEnvelopeSchema = successEnvelopeSchema(providerCommissionProjectionSchema);

export type ProviderType = z.infer<typeof providerTypeSchema>;
export type ProviderApplicationState = z.infer<typeof providerApplicationStateSchema>;
export type ProviderDocumentReviewState = z.infer<typeof providerDocumentReviewStateSchema>;
export type ProviderDocumentCategory = z.infer<typeof providerDocumentCategorySchema>;
export type ProviderLocale = z.infer<typeof providerLocaleSchema>;
export type ProviderSocialLink = z.infer<typeof providerSocialLinkSchema>;
export type ProviderApplicationCreateRequest = z.infer<typeof providerApplicationCreateRequestSchema>;
export type ProviderAccountPatch = z.infer<typeof providerAccountPatchSchema>;
export type ProviderBusinessPatch = z.infer<typeof providerBusinessPatchSchema>;
export type ProviderCompanyPatch = z.infer<typeof providerCompanyPatchSchema>;
export type ProviderSubmitRequest = z.infer<typeof providerSubmitRequestSchema>;
export type ProviderDocumentRequirement = z.infer<typeof providerDocumentRequirementSchema>;
export type ProviderRequirementSnapshot = z.infer<typeof providerRequirementSnapshotSchema>;
export type ProviderApplicationData = z.infer<typeof providerApplicationDataSchema>;
export type ProviderApplicationStatusData = z.infer<typeof providerApplicationStatusDataSchema>;
export type ProviderRegistrationData = z.infer<typeof providerRegistrationDataSchema>;
export type ProviderAdRequestHistoryEntry = z.infer<typeof providerAdRequestHistoryEntrySchema>;
export type ProviderAdQuoteProjection = z.infer<typeof providerAdQuoteProjectionSchema>;
export type ProviderAdPaymentProjection = z.infer<typeof providerAdPaymentProjectionSchema>;
export type ProviderAdScheduleProjection = z.infer<typeof providerAdScheduleProjectionSchema>;
export type ProviderAdRequestProjection = z.infer<typeof providerAdRequestProjectionSchema>;
export type ProviderAdRequestListQuery = z.infer<typeof providerAdRequestListQuerySchema>;
export type ProviderAdRequestListData = z.infer<typeof providerAdRequestListDataSchema>;
export type ProviderAdvertisingRequest = ProviderAdRequestProjection;
export type ProviderCommissionProjection = z.infer<typeof providerCommissionProjectionSchema>;
