import assert from 'node:assert/strict';
import test from 'node:test';
import type { AuditLogListQuery } from '@sadat-real-estate/contracts';
import type { AuditRepository, StoredAuditLog } from '../../src/modules/audit/repository.js';
import { AuditServiceError, createAuditService } from '../../src/modules/audit/service.js';

const viewerId = '0123456789abcdef01234567';
const forbiddenId = '1123456789abcdef01234567';
const auditId = '2123456789abcdef01234567';
const stored: StoredAuditLog = {
  id: auditId,
  actorType: 'admin',
  actorId: viewerId,
  targetType: 'user',
  targetId: '3123456789abcdef01234567',
  action: 'account.suspend',
  reason: 'Confirmed temporary suspension',
  before: { status: 'verified' },
  after: { status: 'suspended' },
  requestId: 'audit-service-1',
  traceId: 'd'.repeat(32),
  createdAt: new Date('2026-08-14T00:00:00.000Z')
};

class MemoryAuditRepository implements AuditRepository {
  lastQuery?: AuditLogListQuery;
  async list(query: AuditLogListQuery) {
    this.lastQuery = query;
    return { items: [stored], total: 1 };
  }
  async findById(id: string) { return id === auditId ? stored : undefined; }
}

test('requires audit.view and returns explicit paginated projections', async () => {
  const repository = new MemoryAuditRepository();
  const service = createAuditService({
    repository,
    authorization: { async authorize(id) { return id === viewerId; } }
  });
  const result = await service.list({ userId: viewerId }, { page: 2, limit: 10 });
  assert.equal(result.page, 2);
  assert.equal(result.limit, 10);
  assert.equal(result.total, 1);
  assert.equal(result.data.items[0]?.id, auditId);
  assert.equal('storageKey' in result.data.items[0]!, false);
  assert.deepEqual(repository.lastQuery, { page: 2, limit: 10 });

  await assert.rejects(
    service.list({ userId: forbiddenId }, { page: 1, limit: 25 }),
    (error) => error instanceof AuditServiceError && error.code === 'AUDIT_FORBIDDEN'
  );
});

test('returns details only after permission and uses a non-enumerating not-found result', async () => {
  const service = createAuditService({
    repository: new MemoryAuditRepository(),
    authorization: { async authorize(id) { return id === viewerId; } }
  });
  assert.equal((await service.findById({ userId: viewerId }, auditId)).action, 'account.suspend');
  await assert.rejects(
    service.findById({ userId: viewerId }, '4123456789abcdef01234567'),
    (error) => error instanceof AuditServiceError && error.code === 'AUDIT_LOG_NOT_FOUND'
  );
  await assert.rejects(
    service.findById({ userId: forbiddenId }, auditId),
    (error) => error instanceof AuditServiceError && error.code === 'AUDIT_FORBIDDEN'
  );
});

test('resolves the current stored employee name for historical records only after audit authorization', async () => {
  let name = 'Tarek';
  const resolved: string[][] = [];
  const service = createAuditService({
    repository: { async list() { return { items: [stored, { ...stored, id: '5123456789abcdef01234567' }], total: 2 }; }, async findById() { return stored; } },
    authorization: { async authorize(id) { return id === viewerId; } },
    resolveActorNames: async ids => { resolved.push([...ids]); return new Map([[viewerId, name]]); }
  });
  const result = await service.list({ userId: viewerId }, { page: 1, limit: 25 });
  assert.deepEqual(resolved, [[viewerId]]);
  assert.ok(result.data.items.every(item => item.actorDisplayName === 'Tarek'));
  name = 'Tarek updated';
  assert.equal((await service.findById({ userId: viewerId }, auditId)).actorDisplayName, name);
  assert.equal(stored.before.status, 'verified');
  resolved.length = 0;
  await assert.rejects(service.findById({ userId: forbiddenId }, auditId), AuditServiceError);
  assert.deepEqual(resolved, []);
});

test('keeps absent names honest and never resolves names for provider or seeker actors', async () => {
  let lookedUp = false;
  const service = createAuditService({
    repository: { async list() { return { items: [{ ...stored, actorType: 'provider' as const }], total: 1 }; }, async findById() { return stored; } },
    authorization: { async authorize() { return true; } },
    resolveActorNames: async () => { lookedUp = true; return new Map(); }
  });
  assert.equal((await service.list({ userId: viewerId }, { page: 1, limit: 25 })).data.items[0]?.actorDisplayName, undefined);
  assert.equal(lookedUp, false);
  assert.equal((await service.findById({ userId: viewerId }, auditId)).actorDisplayName, undefined);
});

test('does not attach an administrator name to another actor type sharing an identifier', async () => {
  const service = createAuditService({
    repository: { async list() { return { items: [stored, { ...stored, actorType: 'seeker' as const }], total: 2 }; }, async findById() { return undefined; } },
    authorization: { async authorize() { return true; } },
    resolveActorNames: async () => new Map([[viewerId, 'Tarek']])
  });
  const result = await service.list({ userId: viewerId }, { page: 1, limit: 25 });
  assert.equal(result.data.items[0]?.actorDisplayName, 'Tarek');
  assert.equal(result.data.items[1]?.actorDisplayName, undefined);
});
