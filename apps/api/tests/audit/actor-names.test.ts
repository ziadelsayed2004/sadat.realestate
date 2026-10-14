import assert from 'node:assert/strict';
import test from 'node:test';
import { Types } from 'mongoose';
import type { AdminModels } from '../../src/modules/admin/models.js';
import { createAuditActorNameResolver, createAuditActorEmailResolver } from '../../src/modules/audit/actor-names.js';
import type { IdentityModels } from '../../src/modules/identity/models.js';

test('resolves only administrative emails in bounded explicit projections, including retained accounts', async () => {
  const id = '1123456789abcdef01234567';
  let filter: unknown;
  let projection: unknown;
  let calls = 0;
  const resolve = createAuditActorEmailResolver({ User: {
    find(value: unknown) { calls++; filter = value; return { select(value: unknown) { projection = value; return { async lean() { return [
      { _id: new Types.ObjectId(id), normalizedEmail: 'staff@example.invalid', password: 'never return' },
      { _id: new Types.ObjectId('2123456789abcdef01234567'), normalizedEmail: 'bad-email' }
    ]; } }; } }; }
  } } as unknown as Pick<IdentityModels, 'User'>);
  assert.deepEqual(await resolve([]), new Map());
  assert.equal(calls, 0);
  assert.deepEqual(await resolve([id, id]), new Map([[id, 'staff@example.invalid']]));
  assert.deepEqual(filter, { _id: { $in: [new Types.ObjectId(id)] }, roleType: 'admin' });
  assert.deepEqual(projection, { _id: 1, normalizedEmail: 1 });
});

test('loads employee names in one bounded query with an explicit name-only projection', async () => {
  const id = '1123456789abcdef01234567';
  const calls: unknown[] = [];
  let projection: unknown;
  const resolve = createAuditActorNameResolver({ AdminAccount: {
    find(filter: unknown) { calls.push(filter); return { select(value: unknown) { projection = value; return { async lean() { return [
      { userId: new Types.ObjectId(id), displayName: '  Tarek  ', password: 'private' },
      { userId: new Types.ObjectId('2123456789abcdef01234567'), displayName: 'Bad\nname' }
    ]; } }; } }; }
  } } as unknown as Pick<AdminModels, 'AdminAccount'>);
  assert.deepEqual(await resolve([]), new Map());
  assert.equal(calls.length, 0);
  const names = await resolve([id, id, '2123456789abcdef01234567']);
  assert.equal(calls.length, 1);
  assert.deepEqual(projection, { _id: 0, userId: 1, displayName: 1 });
  assert.equal((calls[0] as { userId: { $in: Types.ObjectId[] } }).userId.$in.length, 2);
  assert.deepEqual(names, new Map([[id, 'Tarek']]));
  await assert.rejects(resolve(['bad-id']));
});
