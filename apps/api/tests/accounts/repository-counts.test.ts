import assert from 'node:assert/strict';
import test from 'node:test';
import { Types, type Connection } from 'mongoose';
import { adminAccountUserListQuerySchema } from '@sadat-real-estate/contracts';
import type { IdentityModels } from '../../src/modules/identity/models.js';
import type { ProviderModels } from '../../src/modules/provider/models.js';
import type { AccountModels } from '../../src/modules/accounts/models.js';
import type { AuditWriter } from '../../src/modules/audit/writer.js';
import { createMongooseAccountRepository } from '../../src/modules/accounts/repository.js';

test('account summaries include pending accounts outside the visible page and survive empty status filters', async () => {
  const at = new Date('2026-10-10T08:00:00Z');
  const users = Array.from({ length: 48 }, (_, i) => ({
    _id: new Types.ObjectId(i.toString(16).padStart(24, '0')),
    roleType: i === 47 ? 'admin' : i < 30 ? 'seeker' : 'provider',
    status: i < 40 ? 'verified' : i < 43 ? 'pending_review' : i < 45 ? 'restricted' : 'pending_review',
    deletedAt: i === 45 || i === 46 ? at : null,
    locale: 'ar', statusChangedAt: at, createdAt: at, updatedAt: at, version: 0
  }));
  function selected(filter: Record<string, unknown>) {
    const roles = typeof filter.roleType === 'string' ? [filter.roleType] : (filter.roleType as { $in: string[] }).$in;
    return users.filter(user => user.deletedAt === filter.deletedAt && roles.includes(user.roleType) && (!filter.status || user.status === filter.status));
  }
  function query<T>(rows: T[]) {
    let start = 0, limit = rows.length;
    const chain = { sort: () => chain, skip: (value: number) => { start = value; return chain; }, limit: (value: number) => { limit = value; return chain; }, select: () => chain, lean: () => chain, exec: async () => rows.slice(start, start + limit) };
    return chain;
  }
  const identity = { User: {
    find: (filter: Record<string, unknown>) => query(selected(filter)),
    countDocuments: (filter: Record<string, unknown>) => ({ exec: async () => selected(filter).length }),
    aggregate: (pipeline: Array<Record<string, unknown>>) => {
      assert.equal(pipeline.some(stage => '$skip' in stage || '$limit' in stage), false);
      const match = pipeline[0]?.$match as Record<string, unknown>;
      assert.equal(match.status, undefined);
      const group = pipeline[1]?.$group as Record<string, { $sum: { $cond: unknown[] } }>;
      assert.deepEqual(group.pending?.$sum.$cond[0], { $eq: ['$status', 'pending_review'] });
      const rows = selected(match);
      const count = (key: 'roleType' | 'status', value: string) => rows.filter(row => row[key] === value).length;
      return { exec: async () => [{ total: rows.length, seekers: count('roleType', 'seeker'), providers: count('roleType', 'provider'), verified: count('status', 'verified'), pending: count('status', 'pending_review'), restricted: count('status', 'restricted') }] };
    }
  }, SeekerProfile: { find: () => query([]) } } as unknown as IdentityModels;
  const repository = createMongooseAccountRepository({} as Connection, identity, { ProviderApplication: { find: () => query([]) } } as unknown as ProviderModels, {} as AccountModels, {} as AuditWriter);
  const all = await repository.listUsers(adminAccountUserListQuerySchema.parse({}));
  assert.equal(all.items.length, 20);
  assert.equal(all.items.some(user => user.status === 'pending_review'), false);
  assert.deepEqual(all.summary, { total: 45, seekers: 30, providers: 15, verified: 40, pending: 3, restricted: 2 });
  const pending = await repository.listUsers(adminAccountUserListQuerySchema.parse({ status: 'pending_review' }));
  assert.equal(pending.total, 3);
  assert.equal(pending.items.length, 3);
  assert.deepEqual(pending.summary, all.summary);
  const empty = await repository.listUsers(adminAccountUserListQuerySchema.parse({ status: 'needs_information' }));
  assert.equal(empty.total, 0);
  assert.deepEqual(empty.summary, all.summary);
  const seekers = await repository.listUsers(adminAccountUserListQuerySchema.parse({ roleType: 'seeker' }));
  assert.equal(seekers.summary?.total, 30);
  assert.equal(seekers.summary?.pending, 0);
});
