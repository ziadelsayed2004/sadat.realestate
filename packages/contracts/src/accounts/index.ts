import { z } from 'zod';
import {
  AUTH_ACCOUNT_STATES,
  AUTH_ROLE_TYPES
} from '../auth/index.js';
import {
  PROVIDER_APPLICATION_STATES,
  PROVIDER_TYPES
} from '../provider/index.js';
import { successEnvelopeSchema } from '../contracts/envelopes.js';

export const ACCOUNT_TRANSITION_ACTIONS = [
  'verify',
  'reject',
  'needs_information',
  'suspend',
  'restrict'
] as const;

export const PROVIDER_REVIEW_ACTIONS = [
  'verify',
  'reject',
  'needs_information',
  'suspend'
] as const;

export const accountObjectIdSchema = z.string().regex(/^[a-f0-9]{24}$/);
export const accountTransitionActionSchema = z.enum(ACCOUNT_TRANSITION_ACTIONS);
export const providerReviewActionSchema = z.enum(PROVIDER_REVIEW_ACTIONS);

const transitionReasonSchema = z
  .string()
  .trim()
  .min(3)
  .max(1_000)
  .refine((value) => !/[\u0000-\u001f\u007f]/.test(value), {
    message: 'Transition reason must not contain control characters'
  });

export const accountTransitionRequestSchema = z.object({
  action: accountTransitionActionSchema,
  reason: transitionReasonSchema
}).strict();

export const providerReviewRequestSchema = z.object({
  action: providerReviewActionSchema,
  reason: transitionReasonSchema
}).strict();

export const accountUserIdParamsSchema = z.object({
  userId: accountObjectIdSchema
}).strict();

export const providerReviewIdParamsSchema = z.object({
  providerId: accountObjectIdSchema
}).strict();

const accountStateSchema = z.enum(AUTH_ACCOUNT_STATES);
const accountRoleSchema = z.enum(AUTH_ROLE_TYPES);
const providerApplicationStateSchema = z.enum(PROVIDER_APPLICATION_STATES);
const providerTypeSchema = z.enum(PROVIDER_TYPES);

export const accountTransitionDataSchema = z.object({
  transitionId: accountObjectIdSchema,
  userId: accountObjectIdSchema,
  roleType: accountRoleSchema,
  action: accountTransitionActionSchema,
  fromStatus: accountStateSchema,
  status: accountStateSchema,
  reason: transitionReasonSchema,
  version: z.number().int().min(1),
  changedAt: z.string().datetime({ offset: true }),
  availableActions: z.array(accountTransitionActionSchema)
}).strict();

export const providerReviewDataSchema = z.object({
  transitionId: accountObjectIdSchema,
  providerApplicationId: accountObjectIdSchema,
  userId: accountObjectIdSchema,
  providerType: providerTypeSchema,
  action: providerReviewActionSchema,
  fromAccountStatus: accountStateSchema,
  accountStatus: accountStateSchema,
  fromApplicationStatus: providerApplicationStateSchema,
  applicationStatus: providerApplicationStateSchema,
  reason: transitionReasonSchema,
  accountVersion: z.number().int().min(1),
  applicationVersion: z.number().int().min(1),
  changedAt: z.string().datetime({ offset: true }),
  availableActions: z.array(providerReviewActionSchema)
}).strict();

export const accountTransitionSuccessEnvelopeSchema = successEnvelopeSchema(
  accountTransitionDataSchema
);
export const providerReviewSuccessEnvelopeSchema = successEnvelopeSchema(
  providerReviewDataSchema
);

const adminAccountDateSchema = z.string().datetime({ offset: true });

export const adminAccountUserListQuerySchema = z.object({
  roleType: z.enum(['seeker', 'provider']).optional(),
  status: accountStateSchema.optional(),
  page: z.preprocess((value) => value === undefined ? 1 : Number(value), z.number().int().positive().max(100_000)),
  limit: z.preprocess((value) => value === undefined ? 20 : Number(value), z.number().int().positive().max(100))
}).strict();

export const adminAccountUserDataSchema = z.object({
  id: accountObjectIdSchema,
  roleType: z.enum(['seeker', 'provider']),
  status: accountStateSchema,
  email: z.string().email().max(254).optional(),
  phone: z.string().regex(/^\+[1-9]\d{7,14}$/).optional(),
  locale: z.enum(['ar', 'en', 'zh-CN']),
  displayName: z.string().trim().min(1).max(160).optional(),
  version: z.number().int().nonnegative(),
  statusChangedAt: adminAccountDateSchema,
  createdAt: adminAccountDateSchema,
  updatedAt: adminAccountDateSchema,
  availableActions: z.array(accountTransitionActionSchema).max(5)
}).strict();

export const adminAccountUserListDataSchema = z.object({
  items: z.array(adminAccountUserDataSchema).max(100),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  total: z.number().int().nonnegative()
}).strict();

export const adminAccountUserSuccessEnvelopeSchema = successEnvelopeSchema(adminAccountUserDataSchema);
export const adminAccountUserListSuccessEnvelopeSchema = successEnvelopeSchema(adminAccountUserListDataSchema);

export const adminProviderListQuerySchema = z.object({
  status: providerApplicationStateSchema.optional(),
  providerType: providerTypeSchema.optional(),
  page: z.preprocess((value) => value === undefined ? 1 : Number(value), z.number().int().positive().max(100_000)),
  limit: z.preprocess((value) => value === undefined ? 20 : Number(value), z.number().int().positive().max(100))
}).strict();

export const adminProviderDocumentDataSchema = z.object({
  id: accountObjectIdSchema,
  applicationId: accountObjectIdSchema,
  category: z.enum([
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
  ]),
  originalFilename: z.string().min(1).max(120),
  detectedMime: z.enum(['application/pdf', 'image/jpeg', 'image/png']),
  byteSize: z.number().int().positive().max(10 * 1024 * 1024),
  version: z.number().int().positive(),
  securityState: z.enum(['quarantined', 'scan_pending', 'clean', 'infected', 'scan_failed', 'deleted']),
  reviewState: z.enum(['uploaded', 'pending_review', 'needs_replacement', 'approved', 'rejected']),
  uploadedAt: adminAccountDateSchema,
  active: z.boolean()
}).strict();

export const adminProviderDataSchema = z.object({
  id: accountObjectIdSchema,
  userId: accountObjectIdSchema,
  providerType: providerTypeSchema,
  applicationStatus: providerApplicationStateSchema,
  accountStatus: accountStateSchema,
  accountVersion: z.number().int().nonnegative(),
  applicationVersion: z.number().int().nonnegative(),
  phone: z.string().regex(/^\+[1-9]\d{7,14}$/).optional(),
  email: z.string().email().max(254).optional(),
  accountOwnerFullName: z.string().trim().min(1).max(160).optional(),
  displayName: z.string().trim().min(1).max(160).optional(),
  legalBusinessName: z.string().trim().min(1).max(200).optional(),
  tradeName: z.string().trim().min(1).max(200).optional(),
  legalCompanyName: z.string().trim().min(1).max(200).optional(),
  brandName: z.string().trim().min(1).max(200).optional(),
  reviewReason: z.string().trim().min(1).max(1_000).optional(),
  submittedAt: adminAccountDateSchema.optional(),
  createdAt: adminAccountDateSchema,
  updatedAt: adminAccountDateSchema,
  documents: z.array(adminProviderDocumentDataSchema).max(20),
  availableActions: z.array(providerReviewActionSchema).max(4)
}).strict();

export const adminProviderListDataSchema = z.object({
  items: z.array(adminProviderDataSchema).max(100),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  total: z.number().int().nonnegative()
}).strict();

export const adminProviderSuccessEnvelopeSchema = successEnvelopeSchema(adminProviderDataSchema);
export const adminProviderListSuccessEnvelopeSchema = successEnvelopeSchema(adminProviderListDataSchema);

export type AccountTransitionAction = z.infer<typeof accountTransitionActionSchema>;
export type ProviderReviewAction = z.infer<typeof providerReviewActionSchema>;
export type AccountTransitionRequest = z.infer<typeof accountTransitionRequestSchema>;
export type ProviderReviewRequest = z.infer<typeof providerReviewRequestSchema>;
export type AccountTransitionData = z.infer<typeof accountTransitionDataSchema>;
export type ProviderReviewData = z.infer<typeof providerReviewDataSchema>;
export type AdminAccountUserListQuery = z.infer<typeof adminAccountUserListQuerySchema>;
export type AdminAccountUserData = z.infer<typeof adminAccountUserDataSchema>;
export type AdminAccountUserListData = z.infer<typeof adminAccountUserListDataSchema>;
export type AdminProviderListQuery = z.infer<typeof adminProviderListQuerySchema>;
export type AdminProviderDocumentData = z.infer<typeof adminProviderDocumentDataSchema>;
export type AdminProviderData = z.infer<typeof adminProviderDataSchema>;
export type AdminProviderListData = z.infer<typeof adminProviderListDataSchema>;
