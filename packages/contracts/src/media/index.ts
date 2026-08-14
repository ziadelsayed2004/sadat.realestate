import { z } from 'zod';
import { successEnvelopeSchema } from '../contracts/envelopes.js';

export const PROPERTY_MEDIA_KINDS = ['image', 'floor_plan'] as const;
export const propertyMediaKindSchema = z.enum(PROPERTY_MEDIA_KINDS);
export const PROPERTY_MEDIA_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'] as const;
export const propertyMediaMimeSchema = z.enum(PROPERTY_MEDIA_MIME_TYPES);
export const PROPERTY_MEDIA_PROCESSING_STATES = ['processing', 'ready', 'failed', 'deleted'] as const;
export const propertyMediaProcessingStateSchema = z.enum(PROPERTY_MEDIA_PROCESSING_STATES);
export const propertyMediaObjectIdSchema = z.string().regex(/^[a-f0-9]{24}$/);
export const propertyMediaUploadHeadersSchema = z.object({
  kind: propertyMediaKindSchema,
  filename: z.string().trim().min(1).max(120),
  contentType: propertyMediaMimeSchema,
  contentLength: z.number().int().positive().max(10 * 1024 * 1024).optional()
}).strict().superRefine((value, context) => {
  if (value.kind === 'image' && value.contentType === 'application/pdf') context.addIssue({ code: 'custom', path: ['contentType'], message: 'Images must use JPEG or PNG' });
});
export const propertyMediaUpdateSchema = z.object({
  version: z.number().int().nonnegative(),
  sortOrder: z.number().int().nonnegative().max(1_000).optional(),
  isCover: z.boolean().optional(),
  reason: z.string().trim().min(5).max(500).regex(/^[^\u0000-\u001f\u007f]+$/u)
}).strict().refine(value => Object.keys(value).some(key => !['version', 'reason'].includes(key)), { message: 'A media change is required' });
export const propertyMediaOrderSchema = z.object({
  version: z.number().int().nonnegative(),
  items: z.array(z.object({ mediaId: propertyMediaObjectIdSchema, sortOrder: z.number().int().nonnegative().max(1_000), isCover: z.boolean().optional() }).strict()).min(1).max(50).superRefine((items, context) => { if (new Set(items.map(item => item.mediaId)).size !== items.length) context.addIssue({ code: 'custom', message: 'Media IDs must be unique' }); }),
  reason: z.string().trim().min(5).max(500).regex(/^[^\u0000-\u001f\u007f]+$/u)
}).strict();
export const propertyMediaDataSchema = z.object({
  id: propertyMediaObjectIdSchema,
  propertyId: propertyMediaObjectIdSchema,
  kind: propertyMediaKindSchema,
  originalFilename: z.string().min(1).max(120),
  detectedMime: propertyMediaMimeSchema,
  byteSize: z.number().int().positive().max(10 * 1024 * 1024),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  sortOrder: z.number().int().nonnegative().max(1_000),
  isCover: z.boolean(),
  processingState: propertyMediaProcessingStateSchema,
  failureCode: z.string().regex(/^[A-Z][A-Z0-9_]{2,79}$/).optional(),
  active: z.boolean(),
  version: z.number().int().nonnegative(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true })
}).strict();
export const propertyMediaListDataSchema = z.object({ items: z.array(propertyMediaDataSchema).max(50) }).strict();
export const propertyMediaSuccessEnvelopeSchema = successEnvelopeSchema(propertyMediaDataSchema);
export const propertyMediaListSuccessEnvelopeSchema = successEnvelopeSchema(propertyMediaListDataSchema);
export type PropertyMediaKind = z.infer<typeof propertyMediaKindSchema>;
export type PropertyMediaMime = z.infer<typeof propertyMediaMimeSchema>;
export type PropertyMediaProcessingState = z.infer<typeof propertyMediaProcessingStateSchema>;
export type PropertyMediaUploadHeaders = z.infer<typeof propertyMediaUploadHeadersSchema>;
export type PropertyMediaUpdate = z.infer<typeof propertyMediaUpdateSchema>;
export type PropertyMediaOrder = z.infer<typeof propertyMediaOrderSchema>;
export type PropertyMediaData = z.infer<typeof propertyMediaDataSchema>;
