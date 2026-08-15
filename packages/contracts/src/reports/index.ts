import { z } from 'zod';
import { adCalendarStatusSchema, adRequestStatusSchema, adQuoteStatusSchema } from '../ads/index.js';
import { paymentProofSecurityStateSchema, paymentProofStatusSchema } from '../payments/index.js';
import { successEnvelopeSchema } from '../contracts/envelopes.js';

const objectIdSchema = z.string().regex(/^[a-f0-9]{24}$/);
const placementKeySchema = z.string().trim().min(2).max(80).regex(/^[a-z][a-z0-9_.-]*$/);
const dateSchema = z.string().datetime({ offset: true });
const moneyMinorSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);

export const AD_FINANCIAL_REVIEW_STATUSES = ['all', 'quote_only', 'payment_pending_review', 'payment_approved', 'payment_rejected', 'scheduled', 'active', 'ended'] as const;
export const adFinancialReviewStatusSchema = z.enum(AD_FINANCIAL_REVIEW_STATUSES);
export const adFinancialStateSchema = z.enum(['not_submitted', 'quote_only', 'payment_proof_pending_review', 'payment_proof_approved', 'payment_proof_rejected']);
export const adFinancialReviewQuerySchema = z.object({
  status: adFinancialReviewStatusSchema.optional(),
  placementKey: placementKeySchema.optional(),
  providerId: objectIdSchema.optional(),
  from: dateSchema.optional(),
  to: dateSchema.optional(),
  page: z.preprocess(value => value === undefined ? 1 : Number(value), z.number().int().positive().max(100_000)),
  limit: z.preprocess(value => value === undefined ? 20 : Number(value), z.number().int().positive().max(100))
}).strict().superRefine((value, ctx) => {
  if (value.from && value.to && new Date(value.to) <= new Date(value.from)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['to'], message: 'to must be after from' });
});
export const adFinancialReviewRowSchema = z.object({
  requestId: objectIdSchema,
  providerId: objectIdSchema,
  placementKey: placementKeySchema,
  requestStatus: adRequestStatusSchema,
  intervalStart: dateSchema,
  intervalEnd: dateSchema,
  quoteStatus: adQuoteStatusSchema.optional(),
  quotedTotalMinor: moneyMinorSchema.optional(),
  quoteCurrency: z.string().regex(/^[A-Z]{3}$/).optional(),
  paymentProofStatus: paymentProofStatusSchema.optional(),
  paymentProofSecurityState: paymentProofSecurityStateSchema.optional(),
  paymentProofCount: z.number().int().nonnegative().max(20),
  financialState: adFinancialStateSchema,
  scheduleStatus: adCalendarStatusSchema.optional(),
  createdAt: dateSchema,
  updatedAt: dateSchema
}).strict();
export const adFinancialReviewListDataSchema = z.object({
  items: z.array(adFinancialReviewRowSchema).max(100),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  total: z.number().int().nonnegative()
}).strict();
export const adFinancialReviewSuccessEnvelopeSchema = successEnvelopeSchema(adFinancialReviewRowSchema);
export const adFinancialReviewListSuccessEnvelopeSchema = successEnvelopeSchema(adFinancialReviewListDataSchema);

export const AD_LEDGER_ENTRY_KINDS = ['quote_issued', 'quote_accepted', 'quote_rejected', 'quote_cancelled', 'payment_proof_uploaded', 'payment_proof_approved', 'payment_proof_rejected', 'scheduled', 'active', 'ended'] as const;
export const adLedgerEntryKindSchema = z.enum(AD_LEDGER_ENTRY_KINDS);
export const adLedgerSourceSchema = z.enum(['quote', 'payment_proof', 'schedule']);
export const adLedgerEntrySchema = z.object({
  id: objectIdSchema,
  requestId: objectIdSchema,
  providerId: objectIdSchema,
  placementKey: placementKeySchema,
  kind: adLedgerEntryKindSchema,
  source: adLedgerSourceSchema,
  occurredAt: dateSchema,
  amountMinor: moneyMinorSchema.optional(),
  currency: z.string().regex(/^[A-Z]{3}$/).optional(),
  accountingTreatment: z.literal('not_realized')
}).strict();
export const adLedgerQuerySchema = z.object({
  kind: adLedgerEntryKindSchema.optional(),
  source: adLedgerSourceSchema.optional(),
  placementKey: placementKeySchema.optional(),
  providerId: objectIdSchema.optional(),
  from: dateSchema.optional(),
  to: dateSchema.optional(),
  page: z.preprocess(value => value === undefined ? 1 : Number(value), z.number().int().positive().max(100_000)),
  limit: z.preprocess(value => value === undefined ? 20 : Number(value), z.number().int().positive().max(100))
}).strict().superRefine((value, ctx) => {
  if (value.from && value.to && new Date(value.to) <= new Date(value.from)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['to'], message: 'to must be after from' });
});
export const adLedgerListDataSchema = z.object({
  items: z.array(adLedgerEntrySchema).max(100),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  total: z.number().int().nonnegative()
}).strict();
export const adLedgerListSuccessEnvelopeSchema = successEnvelopeSchema(adLedgerListDataSchema);

export const advertisingFinancialReviewQuerySchema = adFinancialReviewQuerySchema;
export const advertisingFinancialReviewRowSchema = adFinancialReviewRowSchema;
export const advertisingLedgerEntrySchema = adLedgerEntrySchema;
export const advertisingLedgerQuerySchema = adLedgerQuerySchema;
export type AdFinancialReviewStatus = z.infer<typeof adFinancialReviewStatusSchema>;
export type AdFinancialState = z.infer<typeof adFinancialStateSchema>;
export type AdFinancialReviewQuery = z.infer<typeof adFinancialReviewQuerySchema>;
export type AdFinancialReviewRow = z.infer<typeof adFinancialReviewRowSchema>;
export type AdFinancialReviewListData = z.infer<typeof adFinancialReviewListDataSchema>;
export type AdLedgerEntryKind = z.infer<typeof adLedgerEntryKindSchema>;
export type AdLedgerEntry = z.infer<typeof adLedgerEntrySchema>;
export type AdLedgerQuery = z.infer<typeof adLedgerQuerySchema>;
export type AdLedgerListData = z.infer<typeof adLedgerListDataSchema>;
