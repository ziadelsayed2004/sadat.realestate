import assert from 'node:assert/strict';
import test from 'node:test';
import { Types, type Connection } from 'mongoose';
import { createMongooseViewingRepository } from '../../src/modules/viewings/repository.js';
import type { ViewingRecord } from '../../src/modules/viewings/service.js';

const owner = '2123456789abcdef01234567';
const stamp = new Date('2026-09-05T10:00:00Z');
const row: ViewingRecord = { id: '4123456789abcdef01234567', propertyId: '3123456789abcdef01234567', seekerId: '0123456789abcdef01234567', status: 'requested', requestedAt: stamp, timezone: 'UTC', version: 0, createdAt: stamp, updatedAt: stamp };

function fixture(property: Record<string, unknown> | null, profileUserId?: string) {
  const inserted: Record<string, unknown>[] = [];
  let lookup: Record<string, unknown> | undefined;
  const connection = { async transaction(work: (session: object) => Promise<unknown>) { return work({}); }, collection(_name: string) {
    return {
      async updateOne() {},
      async findOne(filter: Record<string, unknown>) { if (_name === 'provider_profiles' && profileUserId) return { userId: new Types.ObjectId(profileUserId) }; if (_name === 'users') return { _id: new Types.ObjectId(owner) }; if (_name !== 'properties') return null; lookup = filter; return property; },
      async createIndex() {},
      async insertOne(value: Record<string, unknown>) { inserted.push(value); },
      find() { return { async toArray() { return []; } }; }
    };
  } } as unknown as Connection;
  return { repository: createMongooseViewingRepository(connection), inserted, lookup: () => lookup };
}

test('persists the published property owner, overriding any supplied recipient', async () => {
  const setup = fixture({ providerId: new Types.ObjectId(owner) });
  const created = await setup.repository.create({ ...row, providerId: '5123456789abcdef01234567' });
  assert.equal(created.providerId, owner);
  assert.equal(String(setup.inserted[0]?.providerId), owner);
  assert.equal(setup.lookup()?.status, 'published');
  assert.equal(setup.lookup()?.active, true);
});

test('rejects missing, unavailable or ownerless properties without writing a viewing', async () => {
  for (const property of [null, {}, { providerId: 'invalid' }]) {
    const setup = fixture(property);
    await assert.rejects(() => setup.repository.create(row), /VIEWING_NOT_FOUND/);
    assert.equal(setup.inserted.length, 0);
  }
});

test('resolves a property provider profile to the account used for appointment ownership', async () => {
  const profileId = '7123456789abcdef01234567';
  const setup = fixture({ providerId: new Types.ObjectId(profileId) }, owner);
  const created = await setup.repository.create(row);
  assert.equal(created.providerId, owner);
  assert.equal(String(setup.inserted[0]?.providerId), owner);
});
