import { z } from 'zod';

const objectIdSchema = z.string().regex(/^[a-f0-9]{24}$/);
const safeKey = z.string().trim().min(1).max(160).regex(/^[a-zA-Z0-9][a-zA-Z0-9_.:-]*$/);
const safeError = z.string().trim().min(1).max(500).regex(/^[^\u0000-\u001f\u007f]+$/u);

export const OUTBOX_EVENT_DOMAINS = ['notifications', 'sla', 'ads'] as const;
export const OUTBOX_EVENT_STATUSES = ['pending', 'processing', 'retry_wait', 'delivered', 'dead_letter'] as const;
export const OUTBOX_MAX_ATTEMPTS = 12;
export const OUTBOX_DEFAULT_MAX_ATTEMPTS = 5;

export const outboxEventDomainSchema = z.enum(OUTBOX_EVENT_DOMAINS);
export const outboxEventStatusSchema = z.enum(OUTBOX_EVENT_STATUSES);
export const outboxEventIdSchema = objectIdSchema;
export const outboxEventTypeSchema = safeKey.max(96);
export const outboxDedupeKeySchema = safeKey.max(240);
export const outboxAggregateTypeSchema = safeKey.max(80);
export const outboxAggregateIdSchema = safeKey.max(160);
export const outboxWorkerIdSchema = safeKey.max(80);

const sensitivePayloadKey = /(?:password|passphrase|token|secret|credential|authorization|private.?key|signed.?url|access.?key)/i;

function validateJsonPayload(value: unknown, path: (string | number)[], ctx: z.RefinementCtx, depth = 0): void {
  if (depth > 6) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path, message: 'event payload nesting is too deep' });
    return;
  }
  if (typeof value === 'string') {
    if (value.length > 10_000) ctx.addIssue({ code: z.ZodIssueCode.custom, path, message: 'event payload text is too large' });
    if (/[\u0000-\u001f\u007f]/u.test(value)) ctx.addIssue({ code: z.ZodIssueCode.custom, path, message: 'event payload contains control characters' });
    return;
  }
  if (value === null || typeof value === 'number' || typeof value === 'boolean') return;
  if (Array.isArray(value)) {
    if (value.length > 100) ctx.addIssue({ code: z.ZodIssueCode.custom, path, message: 'event payload array is too large' });
    value.forEach((item, index) => validateJsonPayload(item, [...path, index], ctx, depth + 1));
    return;
  }
  if (typeof value !== 'object') {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path, message: 'event payload must contain JSON values' });
    return;
  }
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (sensitivePayloadKey.test(key)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [...path, key], message: 'sensitive values do not belong in outbox payloads' });
    validateJsonPayload(item, [...path, key], ctx, depth + 1);
  }
}

export const outboxPayloadSchema = z.record(z.string().trim().min(1).max(120), z.unknown()).superRefine((value, ctx) => {
  validateJsonPayload(value, [], ctx);
});

const outboxDate = z.string().datetime({ offset: true });

export const outboxEventCreateSchema = z.object({
  domain: outboxEventDomainSchema,
  type: outboxEventTypeSchema,
  dedupeKey: outboxDedupeKeySchema,
  aggregateType: outboxAggregateTypeSchema,
  aggregateId: outboxAggregateIdSchema,
  payload: outboxPayloadSchema,
  availableAt: outboxDate.optional(),
  maxAttempts: z.number().int().positive().max(OUTBOX_MAX_ATTEMPTS).optional()
}).strict();

export const outboxEnqueueSchema = outboxEventCreateSchema;
export const outboxEventSchema = z.object({
  id: outboxEventIdSchema,
  domain: outboxEventDomainSchema,
  type: outboxEventTypeSchema,
  dedupeKey: outboxDedupeKeySchema,
  aggregateType: outboxAggregateTypeSchema,
  aggregateId: outboxAggregateIdSchema,
  payload: outboxPayloadSchema,
  status: outboxEventStatusSchema,
  attempts: z.number().int().nonnegative().max(OUTBOX_MAX_ATTEMPTS),
  maxAttempts: z.number().int().positive().max(OUTBOX_MAX_ATTEMPTS),
  availableAt: outboxDate,
  createdAt: outboxDate,
  updatedAt: outboxDate,
  lockedBy: outboxWorkerIdSchema.optional(),
  lockedUntil: outboxDate.optional(),
  lastErrorCode: safeKey.max(96).optional(),
  lastErrorMessage: safeError.optional(),
  deliveredAt: outboxDate.optional(),
  deadLetteredAt: outboxDate.optional()
}).strict();

export const outboxLeaseSchema = z.object({
  workerId: outboxWorkerIdSchema,
  leaseMs: z.number().int().positive().max(15 * 60 * 1_000),
  limit: z.number().int().positive().max(100)
}).strict();

export const outboxFailureSchema = z.object({
  code: safeKey.max(96),
  message: safeError,
  availableAt: outboxDate.optional()
}).strict();

export type OutboxEventDomain = z.infer<typeof outboxEventDomainSchema>;
export type OutboxEventStatus = z.infer<typeof outboxEventStatusSchema>;
export type OutboxEventCreate = z.infer<typeof outboxEventCreateSchema>;
export type OutboxEvent = z.infer<typeof outboxEventSchema>;
export type OutboxLease = z.infer<typeof outboxLeaseSchema>;
export type OutboxFailure = z.infer<typeof outboxFailureSchema>;
