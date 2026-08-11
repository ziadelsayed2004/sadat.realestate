import { z } from 'zod';

const identifierPattern = /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$/;
const messageKeyPattern = /^[a-z][a-zA-Z0-9]*(?:[._-][a-zA-Z0-9]+)*$/;
const requestIdPattern = /^[^\s\u0000-\u001f\u007f]+$/;

export const errorCodeSchema = z.string().trim().min(1).max(64).regex(identifierPattern);
export const messageKeySchema = z.string().trim().min(1).max(160).regex(messageKeyPattern);
export const requestIdSchema = z.string().trim().min(1).max(128).regex(requestIdPattern);

export const responseMetaSchema = z.object({
  requestId: requestIdSchema,
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().optional(),
  total: z.number().int().nonnegative().optional()
}).strict();

export const errorDetailSchema = z.object({
  path: z.array(z.union([z.string().min(1).max(128), z.number().int().nonnegative()])).max(32),
  code: errorCodeSchema,
  messageKey: messageKeySchema
}).strict();

export const apiErrorSchema = z.object({
  code: errorCodeSchema,
  messageKey: messageKeySchema,
  details: z.array(errorDetailSchema).max(100),
  requestId: requestIdSchema
}).strict();

export const errorEnvelopeSchema = z.object({ error: apiErrorSchema }).strict();

export type ResponseMeta = z.infer<typeof responseMetaSchema>;
export type ErrorCode = z.infer<typeof errorCodeSchema>;
export type MessageKey = z.infer<typeof messageKeySchema>;
export type RequestId = z.infer<typeof requestIdSchema>;
export type ErrorDetail = z.infer<typeof errorDetailSchema>;
export type ApiError = z.infer<typeof apiErrorSchema>;
export type ErrorEnvelope = z.infer<typeof errorEnvelopeSchema>;

export function successEnvelopeSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    data: dataSchema,
    meta: responseMetaSchema
  }).strict();
}

export type SuccessEnvelope<TData> = {
  data: TData;
  meta: ResponseMeta;
};

export function createSuccessEnvelope<TData>(
  data: TData,
  requestId: string,
  meta: Omit<ResponseMeta, 'requestId'> = {}
): SuccessEnvelope<TData> {
  return successEnvelopeSchema(z.unknown()).parse({
    data,
    meta: { ...meta, requestId }
  }) as SuccessEnvelope<TData>;
}

export function createErrorEnvelope(error: ApiError): ErrorEnvelope {
  return errorEnvelopeSchema.parse({ error });
}
