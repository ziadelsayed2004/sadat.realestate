import { Types, type QueryFilter } from 'mongoose';
import type {
  AuditActorType,
  AuditLogListQuery,
  AuditSnapshot
} from '@sadat-real-estate/contracts';
import type { AuditLogRecord, AuditModels } from './models.js';
import { redactAuditSnapshot, redactAuditText } from './redaction.js';

export interface StoredAuditLog {
  id: string;
  actorType: AuditActorType;
  actorId: string;
  targetType: string;
  targetId: string;
  action: string;
  reason: string;
  before: AuditSnapshot;
  after: AuditSnapshot;
  requestId: string;
  traceId: string;
  createdAt: Date;
}

export interface AuditLogPage {
  items: StoredAuditLog[];
  total: number;
}

export interface AuditRepository {
  list(query: AuditLogListQuery): Promise<AuditLogPage>;
  findById(auditId: string): Promise<StoredAuditLog | undefined>;
}

interface LeanAuditLog extends Omit<AuditLogRecord, 'actorId'> {
  _id: Types.ObjectId;
  actorId: Types.ObjectId;
}

function storedAuditLog(record: LeanAuditLog): StoredAuditLog {
  return {
    id: record._id.toHexString(),
    actorType: record.actorType,
    actorId: record.actorId.toHexString(),
    targetType: record.targetType,
    targetId: record.targetId,
    action: record.action,
    reason: redactAuditText(record.reason),
    before: redactAuditSnapshot(record.before),
    after: redactAuditSnapshot(record.after),
    requestId: record.requestId,
    traceId: record.traceId,
    createdAt: record.createdAt
  };
}

export function createMongooseAuditRepository(models: AuditModels): AuditRepository {
  return {
    async list(query) {
      const filter: QueryFilter<AuditLogRecord> = {};
      if (query.actorId) filter.actorId = new Types.ObjectId(query.actorId);
      if (query.targetType) filter.targetType = query.targetType;
      if (query.targetId) filter.targetId = query.targetId;
      if (query.action) filter.action = query.action;
      if (query.traceId) filter.traceId = query.traceId;
      if (query.from || query.to) {
        filter.createdAt = {
          ...(query.from ? { $gte: new Date(query.from) } : {}),
          ...(query.to ? { $lte: new Date(query.to) } : {})
        };
      }
      const projection = {
        actorType: 1,
        actorId: 1,
        targetType: 1,
        targetId: 1,
        action: 1,
        reason: 1,
        before: 1,
        after: 1,
        requestId: 1,
        traceId: 1,
        createdAt: 1
      };
      const [rows, total] = await Promise.all([
        models.AuditLog.find(filter).select(projection)
          .sort({ createdAt: -1, _id: -1 })
          .skip((query.page - 1) * query.limit)
          .limit(query.limit)
          .lean<LeanAuditLog[]>(),
        models.AuditLog.countDocuments(filter).exec()
      ]);
      return { items: rows.map(storedAuditLog), total };
    },

    async findById(auditId) {
      const row = await models.AuditLog.findById(auditId).select({
        actorType: 1,
        actorId: 1,
        targetType: 1,
        targetId: 1,
        action: 1,
        reason: 1,
        before: 1,
        after: 1,
        requestId: 1,
        traceId: 1,
        createdAt: 1
      }).lean<LeanAuditLog | null>();
      return row ? storedAuditLog(row) : undefined;
    }
  };
}
