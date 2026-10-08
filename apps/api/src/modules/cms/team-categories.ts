import { randomBytes } from 'node:crypto';
import type { Connection } from 'mongoose';
import { DEFAULT_TEAM_CATEGORIES, teamCategoryPutSchema, teamCategorySchema, type TeamCategory } from '@sadat-real-estate/contracts';
import type { AuditWriter } from '../audit/writer.js';
import type { AccessTokenClaims } from '../auth/crypto.js';
import type { RbacService } from '../rbac/service.js';
import { ApiContractError } from '../contracts/error-boundary.js';

export function createTeamCategories(connection: Connection, authorization?: Pick<RbacService, 'authorize'>, audit?: AuditWriter) {
  const collection = connection.collection('cms_team_categories');
  async function list(): Promise<TeamCategory[]> {
    const rows = await collection.find({}, { projection: { _id: 0, key: 1, label: 1, order: 1, active: 1, version: 1 } }).limit(100).toArray();
    const merged = new Map(DEFAULT_TEAM_CATEGORIES.map(item => [item.key, item]));
    rows.forEach(row => { const parsed = teamCategorySchema.safeParse(row); if (parsed.success) merged.set(parsed.data.key, parsed.data); });
    return [...merged.values()].sort((a, b) => a.order - b.order || a.key.localeCompare(b.key));
  }
  const authorize = async (claims: AccessTokenClaims, permission: 'admin:content.view' | 'admin:content.manage') => {
    if (claims.role !== 'admin' || claims.status !== 'verified' || !await authorization?.authorize(claims.sub, permission)) throw new ApiContractError('FORBIDDEN', 'errors.forbidden', 403);
  };
  return {
    list,
    async validate(key: string) { if (!(await list()).some(item => item.key === key && item.active)) throw new ApiContractError('TEAM_CATEGORY_INVALID', 'errors.validation', 400); },
    async adminList(claims: AccessTokenClaims) { await authorize(claims, 'admin:content.view'); return { items: await list() }; },
    async put(claims: AccessTokenClaims, unparsed: unknown, context: { requestId: string; traceId: string }) {
      await authorize(claims, 'admin:content.manage');
      const input = teamCategoryPutSchema.parse(unparsed);
      const key = input.key ?? `dept_${randomBytes(6).toString('hex')}`;
      const current = (await list()).find(item => item.key === key);
      if (input.key && !current) throw new ApiContractError('TEAM_CATEGORY_NOT_FOUND', 'errors.notFound', 404);
      if (current && current.version !== input.version) throw new ApiContractError('TEAM_CATEGORY_VERSION_CONFLICT', 'errors.conflict', 409);
      if (!current && (await list()).length >= 100) throw new ApiContractError('TEAM_CATEGORY_LIMIT', 'errors.validation', 400);
      const next = teamCategorySchema.parse({ key, label: input.label, order: input.order, active: input.active, version: (current?.version ?? 0) + 1 });
      const session = await connection.startSession();
      try { await session.withTransaction(async () => {
        const stored = await collection.findOne({ key }, { session });
        if (stored) {
          const result = await collection.replaceOne({ key, version: input.version }, { ...next }, { session });
          if (result.matchedCount !== 1) throw new ApiContractError('TEAM_CATEGORY_VERSION_CONFLICT', 'errors.conflict', 409);
        } else {
          // Stable string _id makes concurrent default edits/create attempts conflict.
          await collection.insertOne({ _id: key as never, ...next }, { session });
        }
        if (!audit) throw new Error('TEAM_CATEGORY_AUDIT_UNAVAILABLE');
        await audit.record({ actorType: 'admin', actorId: claims.sub, targetType: 'team_category', targetId: key, action: 'cms.team.category.write', reason: input.reason, before: current ?? {}, after: next, ...context, occurredAt: new Date() }, session);
      }); } finally { await session.endSession(); }
      return { items: await list() };
    }
  };
}
export type TeamCategories = ReturnType<typeof createTeamCategories>;
