import { z } from 'zod';
import { successEnvelopeSchema } from '../contracts/envelopes.js';
import { auditActionSchema, auditActorTypeSchema, auditReasonSchema, auditRequestIdSchema, auditSnapshotSchema, auditTraceIdSchema } from '../audit/index.js';

const objectIdSchema = z.string().regex(/^[a-f0-9]{24}$/);
const dateSchema = z.string().datetime({ offset: true });
const policyKeySchema = z.string().trim().min(2).max(80).regex(/^[a-z][a-z0-9_.-]*$/);
const moneyMinorSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);

export const COMMISSION_POLICY_KINDS = ['percentage', 'fixed', 'exempt'] as const;
export const COMMISSION_POLICY_STATUSES = ['draft', 'active', 'inactive', 'archived'] as const;
export const COMMISSION_SCOPE_KINDS = ['default', 'provider_type', 'transaction_type', 'property_kind', 'organization', 'account'] as const;
export const commissionPolicyKindSchema = z.enum(COMMISSION_POLICY_KINDS);
export const commissionPolicyStatusSchema = z.enum(COMMISSION_POLICY_STATUSES);
export const commissionScopeKindSchema = z.enum(COMMISSION_SCOPE_KINDS);
export const commissionScopeSchema = z.object({ kind: commissionScopeKindSchema, key: policyKeySchema.optional() }).strict().superRefine((value, ctx) => {
  if (value.kind === 'default' && value.key) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['key'], message: 'Default scope cannot define a key' });
  if (value.kind !== 'default' && !value.key) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['key'], message: 'Scoped policy requires a key' });
});
export const commissionPolicySchema = z.object({
  id: objectIdSchema,
  key: policyKeySchema,
  label: z.string().trim().min(2).max(160),
  kind: commissionPolicyKindSchema,
  scope: commissionScopeSchema,
  percentageBps: z.number().int().nonnegative().max(10_000).optional(),
  fixedAmountMinor: moneyMinorSchema.optional(),
  currency: z.string().regex(/^[A-Z]{3}$/).optional(),
  effectiveFrom: dateSchema,
  effectiveTo: dateSchema.optional(),
  status: commissionPolicyStatusSchema,
  version: z.number().int().nonnegative(),
  createdBy: objectIdSchema,
  updatedBy: objectIdSchema,
  createdAt: dateSchema,
  updatedAt: dateSchema
}).strict().superRefine((value, ctx) => {
  if (value.effectiveTo && new Date(value.effectiveTo) <= new Date(value.effectiveFrom)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['effectiveTo'], message: 'effectiveTo must be after effectiveFrom' });
  if (value.kind === 'percentage' && value.percentageBps === undefined) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['percentageBps'], message: 'Percentage policy requires percentageBps' });
  if (value.kind !== 'percentage' && value.percentageBps !== undefined) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['percentageBps'], message: 'Only percentage policies define percentageBps' });
  if (value.kind === 'fixed' && (value.fixedAmountMinor === undefined || value.currency === undefined)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['fixedAmountMinor'], message: 'Fixed policy requires amount and currency' });
  if (value.kind !== 'fixed' && (value.fixedAmountMinor !== undefined || value.currency !== undefined)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['fixedAmountMinor'], message: 'Only fixed policies define amount and currency' });
});
export const commissionPolicyCreateSchema = z.object({
  key: policyKeySchema,
  label: z.string().trim().min(2).max(160),
  kind: commissionPolicyKindSchema,
  scope: commissionScopeSchema,
  percentageBps: z.number().int().nonnegative().max(10_000).optional(),
  fixedAmountMinor: moneyMinorSchema.optional(),
  currency: z.string().regex(/^[A-Z]{3}$/).optional(),
  effectiveFrom: dateSchema,
  effectiveTo: dateSchema.optional()
}).strict().superRefine((value, ctx) => {
  if (value.effectiveTo && new Date(value.effectiveTo) <= new Date(value.effectiveFrom)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['effectiveTo'], message: 'effectiveTo must be after effectiveFrom' });
  if (value.kind === 'percentage' && value.percentageBps === undefined) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['percentageBps'], message: 'Percentage policy requires percentageBps' });
  if (value.kind !== 'percentage' && value.percentageBps !== undefined) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['percentageBps'], message: 'Only percentage policies define percentageBps' });
  if (value.kind === 'fixed' && (value.fixedAmountMinor === undefined || value.currency === undefined)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['fixedAmountMinor'], message: 'Fixed policy requires amount and currency' });
  if (value.kind !== 'fixed' && (value.fixedAmountMinor !== undefined || value.currency !== undefined)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['fixedAmountMinor'], message: 'Only fixed policies define amount and currency' });
});
export const commissionPolicyPatchSchema = z.object({
  expectedVersion: z.number().int().nonnegative(),
  reason: z.string().trim().min(2).max(500),
  label: z.string().trim().min(2).max(160).optional(),
  kind: commissionPolicyKindSchema.optional(),
  scope: commissionScopeSchema.optional(),
  percentageBps: z.number().int().nonnegative().max(10_000).nullable().optional(),
  fixedAmountMinor: moneyMinorSchema.nullable().optional(),
  currency: z.string().regex(/^[A-Z]{3}$/).nullable().optional(),
  effectiveFrom: dateSchema.optional(),
  effectiveTo: dateSchema.nullable().optional(),
  status: commissionPolicyStatusSchema.optional()
}).strict().refine(value => Object.keys(value).some(key => !['expectedVersion', 'reason'].includes(key)), { message: 'At least one policy field must be changed' });
export const commissionPolicyListQuerySchema = z.object({
  status: commissionPolicyStatusSchema.optional(),
  scopeKind: commissionScopeKindSchema.optional(),
  at: dateSchema.optional(),
  page: z.preprocess(value => value === undefined ? 1 : Number(value), z.number().int().positive().max(100_000)),
  limit: z.preprocess(value => value === undefined ? 20 : Number(value), z.number().int().positive().max(100))
}).strict();
export const commissionPolicyListDataSchema = z.object({ items: z.array(commissionPolicySchema).max(100), page: z.number().int().positive(), limit: z.number().int().positive(), total: z.number().int().nonnegative() }).strict();
export const commissionPolicySuccessEnvelopeSchema = successEnvelopeSchema(commissionPolicySchema);
export const commissionPolicyListSuccessEnvelopeSchema = successEnvelopeSchema(commissionPolicyListDataSchema);
export const commissionAccountOverrideSchema = z.object({
  id: objectIdSchema,
  accountId: objectIdSchema,
  kind: commissionPolicyKindSchema,
  percentageBps: z.number().int().nonnegative().max(10_000).optional(),
  fixedAmountMinor: moneyMinorSchema.optional(),
  currency: z.string().regex(/^[A-Z]{3}$/).optional(),
  effectiveFrom: dateSchema,
  effectiveTo: dateSchema.optional(),
  status: z.enum(['draft', 'active', 'inactive', 'archived']),
  version: z.number().int().nonnegative(),
  source: z.literal('account_override'),
  createdBy: objectIdSchema,
  updatedBy: objectIdSchema,
  createdAt: dateSchema,
  updatedAt: dateSchema
}).strict().superRefine((value, ctx) => {
  if (value.effectiveTo && new Date(value.effectiveTo) <= new Date(value.effectiveFrom)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['effectiveTo'], message: 'effectiveTo must be after effectiveFrom' });
  if (value.kind === 'percentage' && value.percentageBps === undefined) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['percentageBps'], message: 'Percentage override requires percentageBps' });
  if (value.kind !== 'percentage' && value.percentageBps !== undefined) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['percentageBps'], message: 'Only percentage overrides define percentageBps' });
  if (value.kind === 'fixed' && (value.fixedAmountMinor === undefined || value.currency === undefined)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['fixedAmountMinor'], message: 'Fixed override requires amount and currency' });
  if (value.kind !== 'fixed' && (value.fixedAmountMinor !== undefined || value.currency !== undefined)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['fixedAmountMinor'], message: 'Only fixed overrides define amount and currency' });
});
export const commissionAccountOverrideCreateSchema = z.object({
  kind: commissionPolicyKindSchema,
  percentageBps: z.number().int().nonnegative().max(10_000).optional(),
  fixedAmountMinor: moneyMinorSchema.optional(),
  currency: z.string().regex(/^[A-Z]{3}$/).optional(),
  effectiveFrom: dateSchema,
  effectiveTo: dateSchema.optional()
}).strict().superRefine((value, ctx) => {
  if (value.effectiveTo && new Date(value.effectiveTo) <= new Date(value.effectiveFrom)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['effectiveTo'], message: 'effectiveTo must be after effectiveFrom' });
  if (value.kind === 'percentage' && value.percentageBps === undefined) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['percentageBps'], message: 'Percentage override requires percentageBps' });
  if (value.kind !== 'percentage' && value.percentageBps !== undefined) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['percentageBps'], message: 'Only percentage overrides define percentageBps' });
  if (value.kind === 'fixed' && (value.fixedAmountMinor === undefined || value.currency === undefined)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['fixedAmountMinor'], message: 'Fixed override requires amount and currency' });
  if (value.kind !== 'fixed' && (value.fixedAmountMinor !== undefined || value.currency !== undefined)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['fixedAmountMinor'], message: 'Only fixed overrides define amount and currency' });
});
export const commissionAccountOverridePatchSchema = z.object({
  expectedVersion: z.number().int().nonnegative(),
  reason: z.string().trim().min(2).max(500),
  kind: commissionPolicyKindSchema.optional(),
  percentageBps: z.number().int().nonnegative().max(10_000).nullable().optional(),
  fixedAmountMinor: moneyMinorSchema.nullable().optional(),
  currency: z.string().regex(/^[A-Z]{3}$/).nullable().optional(),
  effectiveFrom: dateSchema.optional(),
  effectiveTo: dateSchema.nullable().optional(),
  status: z.enum(['draft', 'active', 'inactive', 'archived']).optional()
}).strict().refine(value => Object.keys(value).some(key => !['expectedVersion', 'reason'].includes(key)), { message: 'At least one override field must be changed' });
export const commissionAccountOverrideListQuerySchema = z.object({ accountId: objectIdSchema.optional(), status: z.enum(['draft', 'active', 'inactive', 'archived']).optional(), at: dateSchema.optional(), page: z.preprocess(value => value === undefined ? 1 : Number(value), z.number().int().positive().max(100_000)), limit: z.preprocess(value => value === undefined ? 20 : Number(value), z.number().int().positive().max(100)) }).strict();
export const commissionAccountOverrideListDataSchema = z.object({ items: z.array(commissionAccountOverrideSchema).max(100), page: z.number().int().positive(), limit: z.number().int().positive(), total: z.number().int().nonnegative() }).strict();
export const commissionAccountCommissionSchema = z.object({
  accountId: objectIdSchema,
  source: z.enum(['account_override', 'policy', 'none']),
  effectiveAt: dateSchema,
  policyId: objectIdSchema.optional(),
  policyVersion: z.number().int().nonnegative().optional(),
  kind: commissionPolicyKindSchema.optional(),
  percentageBps: z.number().int().nonnegative().max(10_000).optional(),
  fixedAmountMinor: moneyMinorSchema.optional(),
  currency: z.string().regex(/^[A-Z]{3}$/).optional()
}).strict();
export const commissionAccountCommissionSuccessEnvelopeSchema = successEnvelopeSchema(commissionAccountCommissionSchema);
export const commissionAccountOverrideListSuccessEnvelopeSchema = successEnvelopeSchema(commissionAccountOverrideListDataSchema);
export type CommissionPolicyKind = z.infer<typeof commissionPolicyKindSchema>;
export type CommissionPolicyStatus = z.infer<typeof commissionPolicyStatusSchema>;
export type CommissionScope = z.infer<typeof commissionScopeSchema>;
export type CommissionPolicy = z.infer<typeof commissionPolicySchema>;
export type CommissionPolicyCreate = z.infer<typeof commissionPolicyCreateSchema>;
export type CommissionPolicyPatch = z.infer<typeof commissionPolicyPatchSchema>;
export type CommissionPolicyListQuery = z.infer<typeof commissionPolicyListQuerySchema>;
export type CommissionPolicyListData = z.infer<typeof commissionPolicyListDataSchema>;
export type CommissionAccountOverride = z.infer<typeof commissionAccountOverrideSchema>;
export type CommissionAccountOverrideCreate = z.infer<typeof commissionAccountOverrideCreateSchema>;
export type CommissionAccountOverridePatch = z.infer<typeof commissionAccountOverridePatchSchema>;
export type CommissionAccountOverrideListQuery = z.infer<typeof commissionAccountOverrideListQuerySchema>;
export type CommissionAccountOverrideListData = z.infer<typeof commissionAccountOverrideListDataSchema>;
export type CommissionAccountCommission = z.infer<typeof commissionAccountCommissionSchema>;

export const COMMISSION_EXCEPTION_STATUSES = COMMISSION_POLICY_STATUSES;
export const commissionExceptionStatusSchema = commissionPolicyStatusSchema;
export const commissionExceptionSchema = z.object({
  id: objectIdSchema,
  accountId: objectIdSchema,
  kind: commissionPolicyKindSchema,
  percentageBps: z.number().int().nonnegative().max(10_000).optional(),
  fixedAmountMinor: moneyMinorSchema.optional(),
  currency: z.string().regex(/^[A-Z]{3}$/).optional(),
  reason: z.string().trim().min(2).max(500),
  effectiveFrom: dateSchema,
  effectiveTo: dateSchema.optional(),
  status: commissionExceptionStatusSchema,
  source: z.literal('exception'),
  approvedBy: objectIdSchema.optional(),
  approvedAt: dateSchema.optional(),
  approvalReason: z.string().trim().min(2).max(500).optional(),
  lastMutationReason: z.string().trim().min(2).max(500).optional(),
  version: z.number().int().nonnegative(),
  createdBy: objectIdSchema,
  updatedBy: objectIdSchema,
  createdAt: dateSchema,
  updatedAt: dateSchema
}).strict().superRefine((value, ctx) => {
  if (value.effectiveTo && new Date(value.effectiveTo) <= new Date(value.effectiveFrom)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['effectiveTo'], message: 'effectiveTo must be after effectiveFrom' });
  if (value.kind === 'percentage' && value.percentageBps === undefined) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['percentageBps'], message: 'Percentage exception requires percentageBps' });
  if (value.kind !== 'percentage' && value.percentageBps !== undefined) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['percentageBps'], message: 'Only percentage exceptions define percentageBps' });
  if (value.kind === 'fixed' && (value.fixedAmountMinor === undefined || value.currency === undefined)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['fixedAmountMinor'], message: 'Fixed exception requires amount and currency' });
  if (value.kind !== 'fixed' && (value.fixedAmountMinor !== undefined || value.currency !== undefined)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['fixedAmountMinor'], message: 'Only fixed exceptions define amount and currency' });
  if (value.approvedBy === undefined && value.approvedAt !== undefined) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['approvedBy'], message: 'approvedBy is required with approvedAt' });
  if (value.approvedBy !== undefined && value.approvedAt === undefined) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['approvedAt'], message: 'approvedAt is required with approvedBy' });
  if (value.approvedBy !== undefined && value.approvalReason === undefined) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['approvalReason'], message: 'approvalReason is required for approved exceptions' });
  if (value.status === 'active' && (value.approvedBy === undefined || value.approvedAt === undefined || value.approvalReason === undefined)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['status'], message: 'Active exceptions require approval metadata' });
});
export const commissionExceptionCreateSchema = z.object({
  accountId: objectIdSchema,
  kind: commissionPolicyKindSchema,
  percentageBps: z.number().int().nonnegative().max(10_000).optional(),
  fixedAmountMinor: moneyMinorSchema.optional(),
  currency: z.string().regex(/^[A-Z]{3}$/).optional(),
  reason: z.string().trim().min(2).max(500),
  effectiveFrom: dateSchema,
  effectiveTo: dateSchema.optional()
}).strict().superRefine((value, ctx) => {
  if (value.effectiveTo && new Date(value.effectiveTo) <= new Date(value.effectiveFrom)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['effectiveTo'], message: 'effectiveTo must be after effectiveFrom' });
  if (value.kind === 'percentage' && value.percentageBps === undefined) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['percentageBps'], message: 'Percentage exception requires percentageBps' });
  if (value.kind !== 'percentage' && value.percentageBps !== undefined) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['percentageBps'], message: 'Only percentage exceptions define percentageBps' });
  if (value.kind === 'fixed' && (value.fixedAmountMinor === undefined || value.currency === undefined)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['fixedAmountMinor'], message: 'Fixed exception requires amount and currency' });
  if (value.kind !== 'fixed' && (value.fixedAmountMinor !== undefined || value.currency !== undefined)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['fixedAmountMinor'], message: 'Only fixed exceptions define amount and currency' });
});
export const commissionExceptionPatchSchema = z.object({
  expectedVersion: z.number().int().nonnegative(),
  reason: z.string().trim().min(2).max(500),
  exceptionReason: z.string().trim().min(2).max(500).optional(),
  kind: commissionPolicyKindSchema.optional(),
  percentageBps: z.number().int().nonnegative().max(10_000).nullable().optional(),
  fixedAmountMinor: moneyMinorSchema.nullable().optional(),
  currency: z.string().regex(/^[A-Z]{3}$/).nullable().optional(),
  effectiveFrom: dateSchema.optional(),
  effectiveTo: dateSchema.nullable().optional(),
  status: commissionExceptionStatusSchema.optional()
}).strict().refine(value => Object.keys(value).some(key => !['expectedVersion', 'reason'].includes(key)), { message: 'At least one exception field must be changed' });
export const commissionExceptionListQuerySchema = z.object({
  accountId: objectIdSchema.optional(),
  status: commissionExceptionStatusSchema.optional(),
  at: dateSchema.optional(),
  page: z.preprocess(value => value === undefined ? 1 : Number(value), z.number().int().positive().max(100_000)),
  limit: z.preprocess(value => value === undefined ? 20 : Number(value), z.number().int().positive().max(100))
}).strict();
export const commissionExceptionListDataSchema = z.object({ items: z.array(commissionExceptionSchema).max(100), page: z.number().int().positive(), limit: z.number().int().positive(), total: z.number().int().nonnegative() }).strict();
export const commissionExceptionSuccessEnvelopeSchema = successEnvelopeSchema(commissionExceptionSchema);
export const commissionExceptionListSuccessEnvelopeSchema = successEnvelopeSchema(commissionExceptionListDataSchema);
export type CommissionExceptionStatus = z.infer<typeof commissionExceptionStatusSchema>;
export type CommissionException = z.infer<typeof commissionExceptionSchema>;
export type CommissionExceptionCreate = z.infer<typeof commissionExceptionCreateSchema>;
export type CommissionExceptionPatch = z.infer<typeof commissionExceptionPatchSchema>;
export type CommissionExceptionListQuery = z.infer<typeof commissionExceptionListQuerySchema>;
export type CommissionExceptionListData = z.infer<typeof commissionExceptionListDataSchema>;

export const COMMISSION_RESOLUTION_SOURCES = ['exception', 'account_override', 'policy', 'none'] as const;
export const commissionResolutionSourceSchema = z.enum(COMMISSION_RESOLUTION_SOURCES);
const commercialEventIdSchema = z.string().trim().min(2).max(120).regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/);
export const commissionResolutionSchema = z.object({
  accountId: objectIdSchema,
  source: commissionResolutionSourceSchema,
  effectiveAt: dateSchema,
  sourceRecordId: objectIdSchema.optional(),
  sourceVersion: z.number().int().nonnegative().optional(),
  policyId: objectIdSchema.optional(),
  exceptionId: objectIdSchema.optional(),
  accountOverrideId: objectIdSchema.optional(),
  kind: commissionPolicyKindSchema.optional(),
  percentageBps: z.number().int().nonnegative().max(10_000).optional(),
  fixedAmountMinor: moneyMinorSchema.optional(),
  currency: z.string().regex(/^[A-Z]{3}$/).optional()
}).strict().superRefine((value, ctx) => {
  if (value.source === 'none') {
    if (value.sourceRecordId !== undefined || value.sourceVersion !== undefined || value.policyId !== undefined || value.exceptionId !== undefined || value.accountOverrideId !== undefined || value.kind !== undefined || value.percentageBps !== undefined || value.fixedAmountMinor !== undefined || value.currency !== undefined) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['source'], message: 'A none resolution cannot contain a source record or value' });
    return;
  }
  if (value.sourceRecordId === undefined || value.sourceVersion === undefined) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['sourceRecordId'], message: 'A selected resolution requires source identity and version' });
  if (value.source === 'policy' && value.policyId === undefined) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['policyId'], message: 'Policy resolutions require policyId' });
  if (value.source === 'exception' && value.exceptionId === undefined) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['exceptionId'], message: 'Exception resolutions require exceptionId' });
  if (value.source === 'account_override' && value.accountOverrideId === undefined) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['accountOverrideId'], message: 'Account override resolutions require accountOverrideId' });
  if (value.source !== 'policy' && value.policyId !== undefined) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['policyId'], message: 'Only policy resolutions define policyId' });
  if (value.source !== 'exception' && value.exceptionId !== undefined) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['exceptionId'], message: 'Only exception resolutions define exceptionId' });
  if (value.source !== 'account_override' && value.accountOverrideId !== undefined) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['accountOverrideId'], message: 'Only account override resolutions define accountOverrideId' });
  if (value.kind === 'percentage' && value.percentageBps === undefined) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['percentageBps'], message: 'Percentage resolutions require percentageBps' });
  if (value.kind !== 'percentage' && value.percentageBps !== undefined) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['percentageBps'], message: 'Only percentage resolutions define percentageBps' });
  if (value.kind === 'fixed' && (value.fixedAmountMinor === undefined || value.currency === undefined)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['fixedAmountMinor'], message: 'Fixed resolutions require amount and currency' });
  if (value.kind !== 'fixed' && (value.fixedAmountMinor !== undefined || value.currency !== undefined)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['fixedAmountMinor'], message: 'Only fixed resolutions define amount and currency' });
});
export const commissionSnapshotCreateSchema = z.object({
  commercialEventId: commercialEventIdSchema,
  commercialEventStatus: z.literal('approved'),
  accountId: objectIdSchema,
  approvedAt: dateSchema,
  resolution: commissionResolutionSchema
}).strict();
export const commissionApprovedEventSchema = commissionSnapshotCreateSchema.pick({ commercialEventId: true, commercialEventStatus: true, accountId: true, approvedAt: true });
export const commissionSnapshotSchema = z.object({
  id: objectIdSchema,
  commercialEventId: commercialEventIdSchema,
  commercialEventStatus: z.literal('approved'),
  accountId: objectIdSchema,
  approvedAt: dateSchema,
  capturedAt: dateSchema,
  resolution: commissionResolutionSchema,
  createdAt: dateSchema
}).strict();
export const commissionResolutionSuccessEnvelopeSchema = successEnvelopeSchema(commissionResolutionSchema);
export const commissionSnapshotSuccessEnvelopeSchema = successEnvelopeSchema(commissionSnapshotSchema);
export type CommissionResolutionSource = z.infer<typeof commissionResolutionSourceSchema>;
export type CommissionResolution = z.infer<typeof commissionResolutionSchema>;
export type CommissionSnapshotCreate = z.infer<typeof commissionSnapshotCreateSchema>;
export type CommissionSnapshot = z.infer<typeof commissionSnapshotSchema>;
export type CommissionApprovedEvent = z.infer<typeof commissionApprovedEventSchema>;

export const COMMISSION_CONFIRMATION_STATUSES = ['acknowledged', 'superseded', 'revoked'] as const;
export const commissionConfirmationStatusSchema = z.enum(COMMISSION_CONFIRMATION_STATUSES);
export const commissionConfirmationSourceSchema = z.enum(['exception', 'account_override', 'policy']);
const confirmationFields = {
  source: commissionConfirmationSourceSchema,
  sourceRecordId: objectIdSchema,
  policyVersion: z.number().int().nonnegative(),
  policyId: objectIdSchema.optional(),
  exceptionId: objectIdSchema.optional(),
  accountOverrideId: objectIdSchema.optional(),
  effectiveAt: dateSchema
};
export const commissionConfirmationSchema = z.object({
  id: objectIdSchema,
  accountId: objectIdSchema,
  ...confirmationFields,
  status: commissionConfirmationStatusSchema,
  acknowledgedAt: dateSchema,
  acknowledgedBy: objectIdSchema,
  revokedAt: dateSchema.optional(),
  revokedBy: objectIdSchema.optional(),
  revokeReason: z.string().trim().min(2).max(500).optional(),
  version: z.number().int().nonnegative(),
  createdAt: dateSchema,
  updatedAt: dateSchema
}).strict().superRefine((value, ctx) => {
  if (value.source === 'policy' && value.policyId === undefined) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['policyId'], message: 'Policy confirmations require policyId' });
  if (value.source === 'exception' && value.exceptionId === undefined) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['exceptionId'], message: 'Exception confirmations require exceptionId' });
  if (value.source === 'account_override' && value.accountOverrideId === undefined) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['accountOverrideId'], message: 'Account override confirmations require accountOverrideId' });
  if (value.source !== 'policy' && value.policyId !== undefined) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['policyId'], message: 'Only policy confirmations define policyId' });
  if (value.source !== 'exception' && value.exceptionId !== undefined) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['exceptionId'], message: 'Only exception confirmations define exceptionId' });
  if (value.source !== 'account_override' && value.accountOverrideId !== undefined) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['accountOverrideId'], message: 'Only account override confirmations define accountOverrideId' });
  if (value.status === 'revoked' && (value.revokedAt === undefined || value.revokedBy === undefined || value.revokeReason === undefined)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['status'], message: 'Revoked confirmations require revocation metadata' });
  if (value.status !== 'revoked' && (value.revokedAt !== undefined || value.revokedBy !== undefined || value.revokeReason !== undefined)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['status'], message: 'Only revoked confirmations define revocation metadata' });
});
export const commissionConfirmationCreateSchema = z.object({
  accountId: objectIdSchema,
  ...confirmationFields,
  acknowledge: z.literal(true)
}).strict();
export const commissionConfirmationRevokeSchema = z.object({
  expectedVersion: z.number().int().nonnegative(),
  reason: z.string().trim().min(2).max(500)
}).strict();
export const commissionConfirmationListQuerySchema = z.object({
  accountId: objectIdSchema.optional(),
  source: commissionConfirmationSourceSchema.optional(),
  status: commissionConfirmationStatusSchema.optional(),
  page: z.preprocess(value => value === undefined ? 1 : Number(value), z.number().int().positive().max(100_000)),
  limit: z.preprocess(value => value === undefined ? 20 : Number(value), z.number().int().positive().max(100))
}).strict();
export const commissionConfirmationListDataSchema = z.object({ items: z.array(commissionConfirmationSchema).max(100), page: z.number().int().positive(), limit: z.number().int().positive(), total: z.number().int().nonnegative() }).strict();
export const commissionConfirmationSuccessEnvelopeSchema = successEnvelopeSchema(commissionConfirmationSchema);
export const commissionConfirmationListSuccessEnvelopeSchema = successEnvelopeSchema(commissionConfirmationListDataSchema);
export type CommissionConfirmationStatus = z.infer<typeof commissionConfirmationStatusSchema>;
export type CommissionConfirmationSource = z.infer<typeof commissionConfirmationSourceSchema>;
export type CommissionConfirmation = z.infer<typeof commissionConfirmationSchema>;
export type CommissionConfirmationCreate = z.infer<typeof commissionConfirmationCreateSchema>;
export type CommissionConfirmationRevoke = z.infer<typeof commissionConfirmationRevokeSchema>;
export type CommissionConfirmationListQuery = z.infer<typeof commissionConfirmationListQuerySchema>;
export type CommissionConfirmationListData = z.infer<typeof commissionConfirmationListDataSchema>;

export const COMMISSION_CHANGE_LOG_TARGET_TYPES = ['commission_policy', 'commission_exception', 'commission_account_override', 'commission_confirmation'] as const;
export const commissionChangeLogTargetTypeSchema = z.enum(COMMISSION_CHANGE_LOG_TARGET_TYPES);
export const commissionChangeLogRowSchema = z.object({
  id: objectIdSchema,
  targetType: commissionChangeLogTargetTypeSchema,
  targetId: objectIdSchema,
  actorType: auditActorTypeSchema,
  actorId: objectIdSchema,
  action: auditActionSchema,
  reason: auditReasonSchema,
  before: auditSnapshotSchema,
  after: auditSnapshotSchema,
  effectiveFrom: dateSchema.optional(),
  effectiveTo: dateSchema.optional(),
  requestId: auditRequestIdSchema,
  traceId: auditTraceIdSchema,
  createdAt: dateSchema
}).strict().superRefine((value, ctx) => {
  if (value.effectiveFrom && value.effectiveTo && new Date(value.effectiveTo) <= new Date(value.effectiveFrom)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['effectiveTo'], message: 'effectiveTo must be after effectiveFrom' });
});
export const commissionChangeLogListQuerySchema = z.object({
  targetType: commissionChangeLogTargetTypeSchema.optional(),
  targetId: objectIdSchema.optional(),
  actorId: objectIdSchema.optional(),
  action: auditActionSchema.optional(),
  from: dateSchema.optional(),
  to: dateSchema.optional(),
  page: z.preprocess(value => value === undefined ? 1 : Number(value), z.number().int().positive().max(100_000)),
  limit: z.preprocess(value => value === undefined ? 25 : Number(value), z.number().int().positive().max(100))
}).strict().superRefine((value, ctx) => {
  if (value.targetId && !value.targetType) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['targetType'], message: 'targetType is required when targetId is supplied' });
  if (value.from && value.to && new Date(value.from) > new Date(value.to)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['from'], message: 'from must not exceed to' });
});
export const commissionChangeLogListDataSchema = z.object({ items: z.array(commissionChangeLogRowSchema).max(100), page: z.number().int().positive(), limit: z.number().int().positive(), total: z.number().int().nonnegative() }).strict();
export const commissionChangeLogSuccessEnvelopeSchema = successEnvelopeSchema(commissionChangeLogRowSchema);
export const commissionChangeLogListSuccessEnvelopeSchema = successEnvelopeSchema(commissionChangeLogListDataSchema);
export type CommissionChangeLogTargetType = z.infer<typeof commissionChangeLogTargetTypeSchema>;
export type CommissionChangeLogRow = z.infer<typeof commissionChangeLogRowSchema>;
export type CommissionChangeLogListQuery = z.infer<typeof commissionChangeLogListQuerySchema>;
export type CommissionChangeLogListData = z.infer<typeof commissionChangeLogListDataSchema>;
