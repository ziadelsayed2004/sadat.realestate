import {
  auditLogListQuerySchema,
  auditObjectIdSchema,
  type AuditLogData,
  type AuditLogListQuery,
  type RbacPermission
} from '@sadat-real-estate/contracts';
import type { AuditRepository, StoredAuditLog } from './repository.js';

export type AuditServiceErrorCode = 'AUDIT_FORBIDDEN' | 'AUDIT_LOG_NOT_FOUND';

export class AuditServiceError extends Error {
  constructor(readonly code: AuditServiceErrorCode) {
    super(code);
    this.name = 'AuditServiceError';
  }
}

export interface AuditPrincipal {
  userId: string;
}

export interface AuditAuthorization {
  authorize(adminId: string, permission: RbacPermission): Promise<boolean>;
}

export interface AuditServiceDependencies {
  repository: AuditRepository;
  authorization: AuditAuthorization;
  resolveActorNames?: (actorIds: readonly string[]) => Promise<ReadonlyMap<string, string>>;
  resolveActorEmails?: (actorIds: readonly string[]) => Promise<ReadonlyMap<string, string>>;
}

export interface AuditListResult {
  data: { items: AuditLogData[] };
  page: number;
  limit: number;
  total: number;
}

export interface AuditService {
  list(principal: AuditPrincipal, query: AuditLogListQuery): Promise<AuditListResult>;
  findById(principal: AuditPrincipal, auditId: string): Promise<AuditLogData>;
}

function data(record: StoredAuditLog, actorDisplayName?: string, actorEmail?: string): AuditLogData {
  return {
    id: record.id,
    actorType: record.actorType,
    actorId: record.actorId,
    ...(record.actorType === 'admin' && actorDisplayName ? { actorDisplayName } : {}),
    ...(record.actorType === 'admin' && actorEmail ? { actorEmail } : {}),
    targetType: record.targetType,
    targetId: record.targetId,
    action: record.action,
    reason: record.reason,
    before: record.before,
    after: record.after,
    requestId: record.requestId,
    traceId: record.traceId,
    createdAt: record.createdAt.toISOString()
  };
}

export function createAuditService(dependencies: AuditServiceDependencies): AuditService {
  async function actors(records: readonly StoredAuditLog[]) {
    const ids = [...new Set(records.filter(record => record.actorType === 'admin').map(record => record.actorId))];
    return Promise.all([
      ids.length && dependencies.resolveActorNames ? dependencies.resolveActorNames(ids) : new Map<string, string>(),
      ids.length && dependencies.resolveActorEmails ? dependencies.resolveActorEmails(ids) : new Map<string, string>()
    ]);
  }
  async function requireView(adminId: string): Promise<void> {
    if (!await dependencies.authorization.authorize(adminId, 'admin:audit.view')) {
      throw new AuditServiceError('AUDIT_FORBIDDEN');
    }
  }

  return {
    async list(principal, unparsedQuery) {
      await requireView(principal.userId);
      const query = auditLogListQuerySchema.parse(unparsedQuery);
      const result = await dependencies.repository.list(query);
      const [names, emails] = await actors(result.items);
      return {
        data: { items: result.items.map(record => data(record, names.get(record.actorId), emails.get(record.actorId))) },
        page: query.page,
        limit: query.limit,
        total: result.total
      };
    },

    async findById(principal, unparsedAuditId) {
      await requireView(principal.userId);
      const auditId = auditObjectIdSchema.parse(unparsedAuditId);
      const result = await dependencies.repository.findById(auditId);
      if (!result) throw new AuditServiceError('AUDIT_LOG_NOT_FOUND');
      const [names, emails] = await actors([result]);
      return data(result, names.get(result.actorId), emails.get(result.actorId));
    }
  };
}
