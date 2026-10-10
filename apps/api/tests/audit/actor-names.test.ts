import assert from 'node:assert/strict';
import test from 'node:test';
import { Types } from 'mongoose';
import type { AdminModels } from '../../src/modules/admin/models.js';
import { createAuditActorNameResolver } from '../../src/modules/audit/actor-names.js';

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
