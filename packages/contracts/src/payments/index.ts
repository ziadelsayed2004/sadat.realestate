import { z } from 'zod';
import { successEnvelopeSchema } from '../contracts/envelopes.js';

const objectIdSchema = z.string().regex(/^[a-f0-9]{24}$/);
const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);

export const PAYMENT_PROOF_MAX_BYTES = 10 * 1024 * 1024;
export const PAYMENT_PROOF_ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'] as const;
export const paymentProofMimeSchema = z.enum(PAYMENT_PROOF_ALLOWED_MIME_TYPES);
export const paymentProofStatusSchema = z.enum(['uploaded', 'pending_review', 'approved', 'rejected']);
export const paymentProofSecurityStateSchema = z.enum(['quarantined', 'scan_pending', 'clean', 'infected', 'scan_failed', 'deleted']);
export const paymentProofReviewActionSchema = z.enum(['approve', 'reject']);
export const paymentProofReviewHistorySchema = z.object({
  action: paymentProofReviewActionSchema,
  actorId: objectIdSchema,
  reason: z.string().trim().min(2).max(500),
  version: z.number().int().positive(),
  createdAt: z.string().datetime()
}).strict();
export const paymentProofReviewSchema = z.object({
  action: paymentProofReviewActionSchema,
  expectedVersion: z.number().int().positive(),
  reason: z.string().trim().min(2).max(500)
}).strict();

export const paymentProofUploadHeadersSchema = z.object({
  filename: z.string().trim().min(1).max(512),
  contentType: paymentProofMimeSchema,
  contentLength: z.number().int().min(1).max(PAYMENT_PROOF_MAX_BYTES).optional()
}).strict();

export const paymentProofDataSchema = z.object({
  id: objectIdSchema,
  adRequestId: objectIdSchema,
  providerId: objectIdSchema,
  originalFilename: z.string().min(1).max(120),
  normalizedExtension: z.enum(['.pdf', '.jpg', '.jpeg', '.png']),
  detectedMime: paymentProofMimeSchema,
  byteSize: z.number().int().min(1).max(PAYMENT_PROOF_MAX_BYTES),
  sha256: sha256Schema,
  version: z.number().int().positive(),
  securityState: paymentProofSecurityStateSchema,
  status: paymentProofStatusSchema,
  reviewHistory: z.array(paymentProofReviewHistorySchema).max(100),
  uploadedAt: z.string().datetime(),
  active: z.boolean(),
  idempotentReplay: z.boolean()
}).strict();

const paymentProofAdminListPage = z.preprocess(value => value === undefined ? 1 : Number(value), z.number().int().positive().max(100_000));
const paymentProofAdminListLimit = z.preprocess(value => value === undefined ? 20 : Number(value), z.number().int().positive().max(100));
export const paymentProofAdminListQuerySchema = z.object({
  status: paymentProofStatusSchema.optional(),
  page: paymentProofAdminListPage,
  limit: paymentProofAdminListLimit
}).strict();
export const paymentProofAdminListDataSchema = z.object({
  items: z.array(paymentProofDataSchema).max(100),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  total: z.number().int().nonnegative()
}).strict();
export const paymentProofSuccessEnvelopeSchema = successEnvelopeSchema(paymentProofDataSchema);
export const paymentProofAdminListSuccessEnvelopeSchema = successEnvelopeSchema(paymentProofAdminListDataSchema);

export type PaymentProofMime = z.infer<typeof paymentProofMimeSchema>;
export type PaymentProofUploadHeaders = z.infer<typeof paymentProofUploadHeadersSchema>;
export type PaymentProofData = z.infer<typeof paymentProofDataSchema>;
export type PaymentProofAdminListQuery = z.infer<typeof paymentProofAdminListQuerySchema>;
export type PaymentProofAdminListData = z.infer<typeof paymentProofAdminListDataSchema>;
export type PaymentProofReviewAction = z.infer<typeof paymentProofReviewActionSchema>;
export type PaymentProofReviewHistory = z.infer<typeof paymentProofReviewHistorySchema>;
export type PaymentProofReview = z.infer<typeof paymentProofReviewSchema>;
export type PaymentProofStatus = z.infer<typeof paymentProofStatusSchema>;
export type PaymentProofSecurityState = z.infer<typeof paymentProofSecurityStateSchema>;
