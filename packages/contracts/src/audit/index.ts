import { z } from 'zod';
import { successEnvelopeSchema } from '../contracts/envelopes.js';

export const AUDIT_ACTOR_TYPES = ['admin', 'provider', 'seeker'] as const;

// Match the last segment of recorded actions; clients never supply a regex.
export const AUDIT_ACTION_GROUP_SUFFIXES = {
  create: ['create', 'created', 'administrator_created', 'role_created', 'upload'],
  update: ['update', 'updated', 'administrator_updated', 'role_updated', 'write', 'reorder', 'banner_display'],
  delete: ['delete', 'deleted'],
  review: ['review', 'submit', 'start_review', 'needs_information', 'request_information', 'provide_information', 'transition', 'transitioned', 'start_progress', 'resolve', 'close', 'reopen'],
  approve: ['approve', 'approved', 'verify', 'accept', 'accepted', 'complete'],
  reject: ['reject', 'rejected', 'cancel', 'cancelled'],
  visibility: ['visibility', 'publish', 'unpublish', 'hide', 'restore', 'archive', 'schedule', 'schedule_payment_waived'],
  access: ['restrict', 'suspend', 'reactivate', 'revoke', 'roles_assigned', 'download_granted'],
  communication: ['admin_message', 'assigned', 'assign', 'overdue', 'send_message', 'contact']
} as const;
export const auditActionGroupSchema = z.enum(Object.keys(AUDIT_ACTION_GROUP_SUFFIXES) as [keyof typeof AUDIT_ACTION_GROUP_SUFFIXES, ...Array<keyof typeof AUDIT_ACTION_GROUP_SUFFIXES>]);

export const auditObjectIdSchema = z.string().regex(/^[a-f0-9]{24}$/);
export const auditActorTypeSchema = z.enum(AUDIT_ACTOR_TYPES);
export const auditTargetTypeSchema = z
  .string()
  .min(2)
  .max(64)
  .regex(/^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/);
export const auditTargetIdSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/);
export const auditActionSchema = z
  .string()
  .min(3)
  .max(96)
  .regex(/^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+$/);
export const auditReasonSchema = z
  .string()
  .trim()
  .min(3)
  .max(1_000)
  .refine((value) => !/[\u0000-\u001f\u007f]/.test(value), {
    message: 'Audit reason must not contain control characters'
  });
export const auditRequestIdSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/);
export const auditTraceIdSchema = z.string().regex(/^[0-9a-f]{32}$/);

export type AuditJsonValue =
  | null
  | boolean
  | number
  | string
  | AuditJsonValue[]
  | { [key: string]: AuditJsonValue };

export const auditJsonValueSchema: z.ZodType<AuditJsonValue> = z.lazy(() => z.union([
  z.null(),
  z.boolean(),
  z.number().finite(),
  z.string().max(2_048),
  z.array(auditJsonValueSchema).max(100),
  z.record(
    z.string().min(1).max(128).regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/),
    auditJsonValueSchema
  ).refine((value) => Object.keys(value).length <= 100, {
    message: 'Audit objects may contain at most 100 fields'
  })
]));

export const auditSnapshotSchema = z.record(
  z.string().min(1).max(128).regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/),
  auditJsonValueSchema
).refine((value) => Object.keys(value).length <= 100, {
  message: 'Audit snapshots may contain at most 100 fields'
});

const positiveQueryInteger = (maximum: number, fallback: number) => z.preprocess(
  (value) => typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value,
  z.number().int().min(1).max(maximum)
).default(fallback);

export const auditLogListQuerySchema = z.object({
  page: positiveQueryInteger(1_000_000, 1),
  limit: positiveQueryInteger(100, 25),
  actorId: auditObjectIdSchema.optional(),
  targetType: auditTargetTypeSchema.optional(),
  targetId: auditTargetIdSchema.optional(),
  action: auditActionSchema.optional(),
  actionGroup: auditActionGroupSchema.optional(),
  traceId: auditTraceIdSchema.optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional()
}).strict().superRefine((value, context) => {
  if (value.from && value.to && Date.parse(value.from) > Date.parse(value.to)) {
    context.addIssue({ code: 'custom', path: ['from'], message: 'Audit from must not exceed to' });
  }
  if (value.targetId && !value.targetType) {
    context.addIssue({
      code: 'custom',
      path: ['targetType'],
      message: 'Audit targetType is required when targetId is supplied'
    });
  }
});

export const auditLogIdParamsSchema = z.object({ auditId: auditObjectIdSchema }).strict();

export const auditLogDataSchema = z.object({
  id: auditObjectIdSchema,
  actorType: auditActorTypeSchema,
  actorId: auditObjectIdSchema,
  targetType: auditTargetTypeSchema,
  targetId: auditTargetIdSchema,
  action: auditActionSchema,
  reason: auditReasonSchema,
  before: auditSnapshotSchema,
  after: auditSnapshotSchema,
  requestId: auditRequestIdSchema,
  traceId: auditTraceIdSchema,
  createdAt: z.string().datetime({ offset: true })
}).strict();

export const auditLogListDataSchema = z.object({ items: z.array(auditLogDataSchema) }).strict();

export const auditLogSuccessEnvelopeSchema = successEnvelopeSchema(auditLogDataSchema);
export const auditLogListSuccessEnvelopeSchema = successEnvelopeSchema(auditLogListDataSchema)
  .superRefine((value, context) => {
    for (const key of ['page', 'limit', 'total'] as const) {
      if (value.meta[key] === undefined) {
        context.addIssue({ code: 'custom', path: ['meta', key], message: `${key} is required` });
      }
    }
  });

export type AuditActorType = z.infer<typeof auditActorTypeSchema>;
export type AuditTargetType = z.infer<typeof auditTargetTypeSchema>;
export type AuditAction = z.infer<typeof auditActionSchema>;
export type AuditReason = z.infer<typeof auditReasonSchema>;
export type AuditSnapshot = z.infer<typeof auditSnapshotSchema>;
export type AuditLogListQuery = z.infer<typeof auditLogListQuerySchema>;
export type AuditLogData = z.infer<typeof auditLogDataSchema>;
export type AuditLogListData = z.infer<typeof auditLogListDataSchema>;
