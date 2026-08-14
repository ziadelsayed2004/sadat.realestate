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

export type AccountTransitionAction = z.infer<typeof accountTransitionActionSchema>;
export type ProviderReviewAction = z.infer<typeof providerReviewActionSchema>;
export type AccountTransitionRequest = z.infer<typeof accountTransitionRequestSchema>;
export type ProviderReviewRequest = z.infer<typeof providerReviewRequestSchema>;
export type AccountTransitionData = z.infer<typeof accountTransitionDataSchema>;
export type ProviderReviewData = z.infer<typeof providerReviewDataSchema>;
