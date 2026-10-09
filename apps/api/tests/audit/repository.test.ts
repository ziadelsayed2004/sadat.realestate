import assert from 'node:assert/strict';
import test from 'node:test';
import { Types } from 'mongoose';
import { AUDIT_ACTION_GROUP_SUFFIXES, auditLogListQuerySchema } from '@sadat-real-estate/contracts';
import type { AuditModels } from '../../src/modules/audit/models.js';
import { createMongooseAuditRepository } from '../../src/modules/audit/repository.js';

const auditId = '0123456789abcdef01234567';
const actorId = '1123456789abcdef01234567';
const createdAt = new Date('2026-08-14T08:00:00.000Z');

function row() {
  return {
    _id: new Types.ObjectId(auditId),
    actorType: 'admin',
    actorId: new Types.ObjectId(actorId),
    targetType: 'role',
    targetId: '2123456789abcdef01234567',
    action: 'rbac.role_updated',
    reason: 'Remove unnecessary write access',
    before: { active: true, accessToken: 'must-not-leak' },
    after: { active: false },
    requestId: 'audit-repository-1',
    traceId: 'a'.repeat(32),
    createdAt
  };
}

test('applies allowlisted filters, bounded pagination, and an explicit redacted projection', async () => {
  const calls: Record<string, unknown> = {};
  const listQuery = {
    select(projection: unknown) { calls.projection = projection; return this; },
    sort(sort: unknown) { calls.sort = sort; return this; },
    skip(skip: number) { calls.skip = skip; return this; },
    limit(limit: number) { calls.limit = limit; return this; },
    async lean() { return [row()]; }
  };
  const AuditLog = {
    find(filter: unknown) { calls.filter = filter; return listQuery; },
    countDocuments(filter: unknown) {
      calls.countFilter = filter;
      return { async exec() { return 1; } };
    },
    findById() { throw new Error('not used'); }
  };
  const repository = createMongooseAuditRepository({ AuditLog } as unknown as AuditModels);
  const result = await repository.list({
    page: 2,
    limit: 10,
    actorId,
    targetType: 'role',
    targetId: '2123456789abcdef01234567',
    action: 'rbac.role_updated',
    traceId: 'a'.repeat(32),
    from: '2026-08-14T00:00:00.000Z',
    to: '2026-08-14T23:59:59.000Z'
  });

  assert.equal(calls.skip, 10);
  assert.equal(calls.limit, 10);
  assert.deepEqual(calls.sort, { createdAt: -1, _id: -1 });
  assert.equal((calls.filter as { actorId: Types.ObjectId }).actorId.toHexString(), actorId);
  assert.deepEqual(calls.countFilter, calls.filter);
  assert.deepEqual(Object.keys(calls.projection as object).sort(), [
    'action', 'actorId', 'actorType', 'after', 'before', 'createdAt', 'reason',
    'requestId', 'targetId', 'targetType', 'traceId'
  ]);
  assert.equal(result.total, 1);
  assert.equal(result.items[0]?.id, auditId);
  assert.equal(result.items[0]?.before.accessToken, '[REDACTED]');
});

test('returns a projected detail and preserves not-found without a second query', async () => {
  let projection: unknown;
  let calls = 0;
  const AuditLog = {
    find() { throw new Error('not used'); },
    countDocuments() { throw new Error('not used'); },
    findById(id: string) {
      calls += 1;
      return {
        select(value: unknown) {
          projection = value;
          return { async lean() { return id === auditId ? row() : null; } };
        }
      };
    }
  };
  const repository = createMongooseAuditRepository({ AuditLog } as unknown as AuditModels);
  assert.equal((await repository.findById(auditId))?.action, 'rbac.role_updated');
  assert.equal(await repository.findById('3123456789abcdef01234567'), undefined);
  assert.equal(calls, 2);
  assert.equal('storageKey' in (projection as object), false);
});

test('filters full audit queries by fixed action groups and intersects exact action filters', async () => {
  let filter: Record<string, unknown> = {};
  let counted: unknown;
  const chain = { select() { return this; }, sort() { return this; }, skip() { return this; }, limit() { return this; }, async lean() { return []; } };
  const repository = createMongooseAuditRepository({ AuditLog: {
    find(value: Record<string, unknown>) { filter = value; return chain; },
    countDocuments(value: unknown) { counted = value; return { async exec() { return 0; } }; }
  } } as unknown as AuditModels);
  for (const [group, suffixes] of Object.entries(AUDIT_ACTION_GROUP_SUFFIXES)) {
    await repository.list(auditLogListQuerySchema.parse({ targetType: 'property', actionGroup: group, page: 3 }));
    assert.equal(filter.targetType, 'property');
    assert.deepEqual(counted, filter);
    const pattern = (filter.action as { $regex: RegExp }).$regex;
    for (const suffix of suffixes) assert.ok(pattern.test(`any_section.${suffix}`), `${group}: ${suffix}`);
    assert.equal(pattern.test('property.unknown_action'), false);
    assert.equal(pattern.test(`property.${suffixes[0]}_extra`), false);
  }
  await repository.list({ page: 1, limit: 25, actionGroup: 'update', action: 'settings.update' });
  assert.equal(filter.action, 'settings.update');
  const groupPattern = (filter.$and as Array<{ action: { $regex: RegExp } }>)[0]!.action.$regex;
  assert.ok(groupPattern.test('settings.update'));
  assert.equal(groupPattern.test('settings.create'), false);
});
