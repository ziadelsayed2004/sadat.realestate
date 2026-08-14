import { Schema, type Connection, type HydratedDocument, type Model, type Types } from 'mongoose';
import {
  AUDIT_ACTOR_TYPES,
  type AuditActorType
} from '@sadat-real-estate/contracts';
import { redactAuditSnapshot, redactAuditText } from './redaction.js';

export interface AuditLogRecord {
  actorType: AuditActorType;
  actorId: Types.ObjectId;
  targetType: string;
  targetId: string;
  action: string;
  reason: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  requestId: string;
  traceId: string;
  createdAt: Date;
}

export type AuditLogDocument = HydratedDocument<AuditLogRecord>;

export interface AuditModels {
  AuditLog: Model<AuditLogRecord>;
}

const auditLogSchema = new Schema<AuditLogRecord>({
  actorType: { type: String, enum: AUDIT_ACTOR_TYPES, required: true, immutable: true },
  actorId: {
    type: Schema.Types.ObjectId,
    required: true,
    immutable: true,
    ref: 'User'
  },
  targetType: {
    type: String,
    required: true,
    immutable: true,
    minlength: 2,
    maxlength: 64,
    match: /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/
  },
  targetId: {
    type: String,
    required: true,
    immutable: true,
    minlength: 1,
    maxlength: 128,
    match: /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/
  },
  action: {
    type: String,
    required: true,
    immutable: true,
    minlength: 3,
    maxlength: 96,
    match: /^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+$/
  },
  reason: {
    type: String,
    required: true,
    immutable: true,
    trim: true,
    minlength: 3,
    maxlength: 1_000,
    validate: {
      validator: (value: string) => !/[\u0000-\u001f\u007f]/.test(value),
      message: 'Audit reason must not contain control characters'
    }
  },
  before: { type: Schema.Types.Mixed, required: true, immutable: true },
  after: { type: Schema.Types.Mixed, required: true, immutable: true },
  requestId: {
    type: String,
    required: true,
    immutable: true,
    maxlength: 128,
    match: /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/
  },
  traceId: {
    type: String,
    required: true,
    immutable: true,
    match: /^[0-9a-f]{32}$/
  }
}, {
  collection: 'audit_logs',
  strict: 'throw',
  timestamps: { createdAt: true, updatedAt: false },
  versionKey: false
});

auditLogSchema.pre('validate', function sanitizeAuditPayload() {
  this.reason = redactAuditText(this.reason);
  this.before = redactAuditSnapshot(this.before);
  this.after = redactAuditSnapshot(this.after);
});

function rejectMutation(): never {
  throw new Error('AUDIT_LOG_APPEND_ONLY');
}

auditLogSchema.pre('save', function enforceInsertOnlySave() {
  if (!this.isNew) rejectMutation();
});
auditLogSchema.pre('updateOne', rejectMutation);
auditLogSchema.pre('updateMany', rejectMutation);
auditLogSchema.pre('findOneAndUpdate', rejectMutation);
auditLogSchema.pre('replaceOne', rejectMutation);
auditLogSchema.pre('findOneAndReplace', rejectMutation);
auditLogSchema.pre('deleteOne', rejectMutation);
auditLogSchema.pre('deleteOne', { document: true, query: false }, rejectMutation);
auditLogSchema.pre('deleteMany', rejectMutation);
auditLogSchema.pre('findOneAndDelete', rejectMutation);
auditLogSchema.pre('bulkWrite', rejectMutation);

auditLogSchema.index(
  { actorId: 1, createdAt: -1, _id: -1 },
  { name: 'audit_logs_actor_created' }
);
auditLogSchema.index(
  { targetType: 1, targetId: 1, createdAt: -1, _id: -1 },
  { name: 'audit_logs_target_created' }
);
auditLogSchema.index(
  { action: 1, createdAt: -1, _id: -1 },
  { name: 'audit_logs_action_created' }
);
auditLogSchema.index(
  { traceId: 1, createdAt: -1 },
  { name: 'audit_logs_trace_created' }
);
auditLogSchema.index(
  { createdAt: -1, _id: -1 },
  { name: 'audit_logs_created' }
);

export function createAuditModels(connection: Connection): AuditModels {
  return {
    AuditLog: (connection.models.AuditLog as Model<AuditLogRecord> | undefined)
      ?? connection.model<AuditLogRecord>('AuditLog', auditLogSchema)
  };
}
