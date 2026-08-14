import { Types, type ClientSession } from 'mongoose';
import {
  auditActionSchema,
  auditActorTypeSchema,
  auditObjectIdSchema,
  auditReasonSchema,
  auditRequestIdSchema,
  auditSnapshotSchema,
  auditTargetIdSchema,
  auditTargetTypeSchema,
  auditTraceIdSchema,
  type AuditActorType
} from '@sadat-real-estate/contracts';
import type { AuditModels } from './models.js';
import { redactAuditSnapshot, redactAuditText } from './redaction.js';

export interface AuditRecordInput {
  actorType: AuditActorType;
  actorId: string;
  targetType: string;
  targetId: string;
  action: string;
  reason: string;
  before: unknown;
  after: unknown;
  requestId: string;
  traceId: string;
  occurredAt: Date;
}

export interface AuditWriter {
  record(input: AuditRecordInput, session?: ClientSession): Promise<string>;
}

export function createMongooseAuditWriter(models: AuditModels): AuditWriter {
  return {
    async record(input, session) {
      const payload = {
        actorType: auditActorTypeSchema.parse(input.actorType),
        actorId: new Types.ObjectId(auditObjectIdSchema.parse(input.actorId)),
        targetType: auditTargetTypeSchema.parse(input.targetType),
        targetId: auditTargetIdSchema.parse(input.targetId),
        action: auditActionSchema.parse(input.action),
        reason: auditReasonSchema.parse(redactAuditText(input.reason)),
        before: auditSnapshotSchema.parse(redactAuditSnapshot(input.before)),
        after: auditSnapshotSchema.parse(redactAuditSnapshot(input.after)),
        requestId: auditRequestIdSchema.parse(input.requestId),
        traceId: auditTraceIdSchema.parse(input.traceId),
        createdAt: input.occurredAt
      };
      if (Number.isNaN(input.occurredAt.getTime())) throw new Error('AUDIT_OCCURRED_AT_INVALID');
      const [created] = await models.AuditLog.create([payload], session ? { session } : {});
      if (!created) throw new Error('AUDIT_LOG_NOT_CREATED');
      return created._id.toHexString();
    }
  };
}
