import { z } from 'zod';
import { successEnvelopeSchema } from '../contracts/envelopes.js';
import { providerDocumentCategorySchema, providerDocumentReviewStateSchema } from '../provider/index.js';

export const PROVIDER_DOCUMENT_SECURITY_STATES = [
  'quarantined',
  'scan_pending',
  'clean',
  'infected',
  'scan_failed',
  'deleted'
] as const;
export const providerDocumentSecurityStateSchema = z.enum(PROVIDER_DOCUMENT_SECURITY_STATES);

export const PROVIDER_DOCUMENT_ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png'
] as const;
export const providerDocumentMimeSchema = z.enum(PROVIDER_DOCUMENT_ALLOWED_MIME_TYPES);

export const providerDocumentUploadHeadersSchema = z.object({
  category: providerDocumentCategorySchema,
  filename: z.string().trim().min(1).max(512),
  contentType: providerDocumentMimeSchema,
  contentLength: z.number().int().min(1).max(10 * 1024 * 1024).optional()
}).strict();

const objectIdSchema = z.string().regex(/^[a-f0-9]{24}$/);
const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);

export const providerDocumentDataSchema = z.object({
  id: objectIdSchema,
  applicationId: objectIdSchema,
  category: providerDocumentCategorySchema,
  requirementVersion: z.string().regex(/^\d{4}-\d{2}-\d{2}\.\d+$/),
  originalFilename: z.string().min(1).max(120),
  normalizedExtension: z.enum(['.pdf', '.jpg', '.jpeg', '.png']),
  detectedMime: providerDocumentMimeSchema,
  byteSize: z.number().int().min(1).max(10 * 1024 * 1024),
  sha256: sha256Schema,
  version: z.number().int().positive(),
  securityState: providerDocumentSecurityStateSchema,
  reviewState: providerDocumentReviewStateSchema,
  uploadedAt: z.string().datetime(),
  active: z.boolean(),
  idempotentReplay: z.boolean()
}).strict();

export const providerDocumentAccessRequestSchema = z.object({
  purpose: z.string().trim().regex(/^[a-z][a-z0-9_]{2,63}$/)
}).strict();

export const providerDocumentAccessDataSchema = z.object({
  url: z.string().max(4_096).refine(
    (value) => value.startsWith('/api/v1/private/provider-documents/') || z.url().safeParse(value).success,
    { message: 'Expected a private relative or absolute download URL' }
  ),
  expiresAt: z.string().datetime(),
  method: z.literal('GET')
}).strict();

export const providerDocumentDeleteDataSchema = z.object({
  documentId: objectIdSchema,
  deleted: z.literal(true)
}).strict();

export const providerDocumentSuccessEnvelopeSchema = successEnvelopeSchema(providerDocumentDataSchema);
export const providerDocumentAccessSuccessEnvelopeSchema = successEnvelopeSchema(providerDocumentAccessDataSchema);
export const providerDocumentDeleteSuccessEnvelopeSchema = successEnvelopeSchema(providerDocumentDeleteDataSchema);

export type ProviderDocumentSecurityState = z.infer<typeof providerDocumentSecurityStateSchema>;
export type ProviderDocumentMime = z.infer<typeof providerDocumentMimeSchema>;
export type ProviderDocumentUploadHeaders = z.infer<typeof providerDocumentUploadHeadersSchema>;
export type ProviderDocumentData = z.infer<typeof providerDocumentDataSchema>;
export type ProviderDocumentAccessRequest = z.infer<typeof providerDocumentAccessRequestSchema>;
export type ProviderDocumentAccessData = z.infer<typeof providerDocumentAccessDataSchema>;
export type ProviderDocumentDeleteData = z.infer<typeof providerDocumentDeleteDataSchema>;
