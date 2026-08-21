import type { AuditLogData } from '@sadat-real-estate/contracts';
import { auditLogDataSchema } from '@sadat-real-estate/contracts';
import type { AccessTokenService } from '../auth/crypto.js';
import type { AuditRepository, StoredAuditLog } from '../audit/repository.js';
import type { RbacService } from '../rbac/service.js';
import type { CommissionChangeLogRouterDependencies } from './change-log-router.js';
import type { CommissionAuditSource, CommissionAuditSourceQuery } from './change-log-service.js';
import { createCommissionChangeLogService } from './change-log-service.js';

function data(record: StoredAuditLog): AuditLogData {
  return auditLogDataSchema.parse({
    id: record.id,
    actorType: record.actorType,
    actorId: record.actorId,
    targetType: record.targetType,
    targetId: record.targetId,
    action: record.action,
    reason: record.reason,
    before: record.before,
    after: record.after,
    requestId: record.requestId,
    traceId: record.traceId,
    createdAt: record.createdAt.toISOString()
  });
}

export function createCommissionAuditSource(repository: AuditRepository): CommissionAuditSource {
  return {
    async list(query: CommissionAuditSourceQuery) {
      const required = Math.min(query.page * query.limit, 100_000);
      const loadTarget = async (targetType: CommissionAuditSourceQuery['targetTypes'][number]) => {
        const baseQuery = {
          targetType,
          ...(query.targetId ? { targetId: query.targetId } : {}),
          ...(query.actorId ? { actorId: query.actorId } : {}),
          ...(query.action ? { action: query.action } : {}),
          ...(query.from ? { from: query.from } : {}),
          ...(query.to ? { to: query.to } : {})
        };
        const first = await repository.list({
          ...baseQuery,
          page: 1,
          limit: Math.min(100, required)
        });
        const items = [...first.items];
        let page = 2;
        while (items.length < Math.min(first.total, required)) {
          const next = await repository.list({
            ...baseQuery,
            page,
            limit: Math.min(100, required - items.length)
          });
          items.push(...next.items);
          if (next.items.length === 0) break;
          page += 1;
        }
        return { items, total: first.total };
      };

      const results = await Promise.all(query.targetTypes.map(loadTarget));
      return {
        items: results.flatMap(result => result.items).map(data),
        total: results.reduce((total, result) => total + result.total, 0)
      };
    },

    async findById(auditId) {
      const record = await repository.findById(auditId);
      return record ? data(record) : undefined;
    }
  };
}

export function createCommissionChangeLogRuntime(
  repository: AuditRepository,
  accessTokens: AccessTokenService,
  authorization: Pick<RbacService, 'authorize'>
): CommissionChangeLogRouterDependencies {
  return {
    accessTokens,
    authorization,
    service: createCommissionChangeLogService({
      source: createCommissionAuditSource(repository)
    })
  };
}
