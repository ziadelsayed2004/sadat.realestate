import { Types, type Connection } from 'mongoose';
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
  authorization: Pick<RbacService, 'authorize'>,
  connection?: Connection
): CommissionChangeLogRouterDependencies {
  return {
    accessTokens,
    authorization,
    service: createCommissionChangeLogService({
      source: createCommissionAuditSource(repository),
      ...(connection ? { resolveAccount: async (record: AuditLogData) => {
        const collection = record.targetType === "commission_account_override" ? "commission_account_overrides" : record.targetType === "commission_exception" ? "commission_exceptions" : undefined;
        const stored = collection ? await connection.collection(collection).findOne({ _id: new Types.ObjectId(record.targetId) }, { projection: { accountId: 1 } }) : undefined;
        const raw = record.after.accountId ?? record.before.accountId ?? stored?.accountId;
        const accountId = raw instanceof Types.ObjectId ? raw.toHexString() : typeof raw === "string" && /^[a-f0-9]{24}$/.test(raw) ? raw : undefined;
        if (!accountId) return {};
        const userId = new Types.ObjectId(accountId);
        const [provider, seeker, admin] = await Promise.all([
          connection.collection("provider_applications").findOne({ userId }, { projection: { displayName: 1, brandName: 1, tradeName: 1, accountOwnerFullName: 1 } }),
          connection.collection("seeker_profiles").findOne({ userId }, { projection: { firstName: 1, lastName: 1 } }),
          connection.collection("admin_accounts").findOne({ userId }, { projection: { displayName: 1 } })
        ]);
        const name = [provider?.brandName, provider?.tradeName, provider?.displayName, provider?.accountOwnerFullName, admin?.displayName, [seeker?.firstName, seeker?.lastName].filter(Boolean).join(" ")].find(value => typeof value === "string" && value.trim());
        return { accountId, ...(typeof name === "string" ? { accountName: name.trim().slice(0, 320) } : {}) };
      } } : {})
    })
  };
}
