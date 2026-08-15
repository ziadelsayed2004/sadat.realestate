import type { AccessTokenClaims } from '../auth/crypto.js';
import {
  COMMISSION_CHANGE_LOG_TARGET_TYPES,
  auditLogDataSchema,
  commissionChangeLogListDataSchema,
  commissionChangeLogListQuerySchema,
  commissionChangeLogRowSchema,
  type AuditLogData,
  type CommissionChangeLogListData,
  type CommissionChangeLogListQuery,
  type CommissionChangeLogRow,
  type CommissionChangeLogTargetType
} from '@sadat-real-estate/contracts';

type CommissionChangeLogErrorCode =
  | 'COMMISSION_CHANGE_LOG_FORBIDDEN'
  | 'COMMISSION_CHANGE_LOG_NOT_FOUND'
  | 'COMMISSION_CHANGE_LOG_INVALID_SOURCE';

export class CommissionChangeLogServiceError extends Error {
  constructor(readonly code: CommissionChangeLogErrorCode) {
    super(code);
    this.name = 'CommissionChangeLogServiceError';
  }
}

export interface CommissionAuditSourceQuery {
  targetTypes: CommissionChangeLogTargetType[];
  targetId?: string;
  actorId?: string;
  action?: string;
  from?: string;
  to?: string;
  page: number;
  limit: number;
}

export interface CommissionAuditSource {
  list(query: CommissionAuditSourceQuery): Promise<{ items: AuditLogData[]; total: number }>;
  findById(auditId: string): Promise<AuditLogData | undefined>;
}

const admin = (claims: AccessTokenClaims) => {
  if (claims.role !== 'admin' || claims.status !== 'verified') throw new CommissionChangeLogServiceError('COMMISSION_CHANGE_LOG_FORBIDDEN');
};
const isCommissionTarget = (targetType: string): targetType is CommissionChangeLogTargetType => (COMMISSION_CHANGE_LOG_TARGET_TYPES as readonly string[]).includes(targetType);
const dateField = (before: AuditLogData['before'], after: AuditLogData['after'], key: 'effectiveFrom' | 'effectiveTo') => {
  const candidate = after[key] ?? before[key];
  if (candidate === undefined) return undefined;
  if (typeof candidate !== 'string') throw new CommissionChangeLogServiceError('COMMISSION_CHANGE_LOG_INVALID_SOURCE');
  return candidate;
};

export function createCommissionChangeLogService(dependencies: { source: CommissionAuditSource }) {
  const project = (record: AuditLogData): CommissionChangeLogRow => {
    const parsed = auditLogDataSchema.safeParse(record);
    if (!parsed.success || !isCommissionTarget(parsed.data.targetType)) throw new CommissionChangeLogServiceError('COMMISSION_CHANGE_LOG_INVALID_SOURCE');
    return commissionChangeLogRowSchema.parse({
      id: parsed.data.id,
      targetType: parsed.data.targetType,
      targetId: parsed.data.targetId,
      actorType: parsed.data.actorType,
      actorId: parsed.data.actorId,
      action: parsed.data.action,
      reason: parsed.data.reason,
      before: parsed.data.before,
      after: parsed.data.after,
      ...(dateField(parsed.data.before, parsed.data.after, 'effectiveFrom') ? { effectiveFrom: dateField(parsed.data.before, parsed.data.after, 'effectiveFrom') } : {}),
      ...(dateField(parsed.data.before, parsed.data.after, 'effectiveTo') ? { effectiveTo: dateField(parsed.data.before, parsed.data.after, 'effectiveTo') } : {}),
      requestId: parsed.data.requestId,
      traceId: parsed.data.traceId,
      createdAt: parsed.data.createdAt
    });
  };

  return {
    async list(claims: AccessTokenClaims, input: unknown): Promise<CommissionChangeLogListData> {
      admin(claims);
      const query = commissionChangeLogListQuerySchema.parse(input) as CommissionChangeLogListQuery;
      const result = await dependencies.source.list({
        targetTypes: query.targetType ? [query.targetType] : [...COMMISSION_CHANGE_LOG_TARGET_TYPES],
        ...(query.targetId ? { targetId: query.targetId } : {}),
        ...(query.actorId ? { actorId: query.actorId } : {}),
        ...(query.action ? { action: query.action } : {}),
        ...(query.from ? { from: query.from } : {}),
        ...(query.to ? { to: query.to } : {}),
        page: query.page,
        limit: query.limit
      });
      if (!Array.isArray(result.items) || !Number.isInteger(result.total) || result.total < 0) throw new CommissionChangeLogServiceError('COMMISSION_CHANGE_LOG_INVALID_SOURCE');
      const items = result.items.map(project).sort((left, right) => right.createdAt.localeCompare(left.createdAt) || right.id.localeCompare(left.id));
      return commissionChangeLogListDataSchema.parse({ items, page: query.page, limit: query.limit, total: result.total });
    },
    async findById(claims: AccessTokenClaims, auditId: string): Promise<CommissionChangeLogRow> {
      admin(claims);
      const record = await dependencies.source.findById(auditId);
      if (!record) throw new CommissionChangeLogServiceError('COMMISSION_CHANGE_LOG_NOT_FOUND');
      try {
        return project(record);
      } catch (error) {
        if (error instanceof CommissionChangeLogServiceError && error.code === 'COMMISSION_CHANGE_LOG_INVALID_SOURCE') throw new CommissionChangeLogServiceError('COMMISSION_CHANGE_LOG_NOT_FOUND');
        throw error;
      }
    }
  };
}

