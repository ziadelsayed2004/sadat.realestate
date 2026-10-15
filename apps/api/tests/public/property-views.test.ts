import assert from 'node:assert/strict';
import test from 'node:test';
import { Types, type Connection } from 'mongoose';
import type { AccessTokenClaims } from '../../src/modules/auth/crypto.js';
import { createMongoosePropertyViews, propertyViewDay } from '../../src/modules/public/property-views.js';

test('view calendar uses Cairo midnight in summer and winter', () => {
  assert.equal(propertyViewDay(new Date('2026-09-30T20:59:59Z')), '2026-09-30');
  assert.equal(propertyViewDay(new Date('2026-09-30T21:00:00Z')), '2026-10-01');
  assert.equal(propertyViewDay(new Date('2026-12-31T22:00:00Z')), '2027-01-01');
});

test('views deduplicate per browser/property/day, skip private and owner views and scope monthly reads', async () => {
  const propertyId = new Types.ObjectId();
  const providerId = new Types.ObjectId();
  let at = new Date('2026-09-30T20:59:59Z');
  const events: Array<Record<string, unknown>> = [];
  const indexes: unknown[] = [];
  let viewCount = 0;
  const connection = { async startSession() { return { async withTransaction(action: () => Promise<boolean>) { return action(); }, async endSession() {} }; }, collection(name: string) {
    if (name === 'properties') return { async findOne(filter: Record<string, unknown>) {
      assert.equal(filter.status, 'published'); assert.equal(filter.active, true); assert.ok(filter.expiresAt);
      return filter.slug === 'public-home' ? { _id: propertyId, providerId, viewCount } : null;
    }, async updateOne(_filter: unknown, update: { $set: { viewCount: number } }) { viewCount = update.$set.viewCount; } };
    return {
      async createIndex(keys: unknown, options?: unknown) { indexes.push({ keys, options }); },
      async insertOne(row: Record<string, unknown>) {
        if (events.some(event => String(event.propertyId) === String(row.propertyId) && event.visitorHash === row.visitorHash && event.day === row.day)) throw { code: 11000 };
        events.push(row);
      },
      async countDocuments(filter: Record<string, unknown>) { return events.filter(row => String(row.providerId) === String(filter.providerId) && row.month === filter.month).length; },
      aggregate(pipeline: Array<{ $match?: Record<string, unknown> }>) {
        const match = pipeline[0]!.$match!;
        assert.equal(String(match.providerId), String(providerId));
        return { async toArray() { return [{ _id: propertyId, count: events.filter(row => row.month === match.month).length }]; } };
      }
    };
  } } as unknown as Connection;
  const service = createMongoosePropertyViews(connection, () => at);
  assert.equal(await service.record('missing-home', 'visitor'), false);
  assert.equal(await service.record('public-home', 'owner', { sub: String(providerId), role: 'provider' } as AccessTokenClaims), false);
  assert.equal(await service.record('public-home', 'admin', { sub: 'a'.repeat(24), role: 'admin' } as AccessTokenClaims), false);
  assert.deepEqual(await Promise.all([service.record('public-home', 'visitor'), service.record('public-home', 'visitor')]), [true, false]);
  assert.notEqual(events[0]!.visitorHash, 'visitor');
  assert.equal('ip' in events[0]!, false);
  assert.ok((events[0]!.expiresAt as Date) > at);
  at = new Date('2026-09-30T21:00:00Z');
  assert.equal(await service.record('public-home', 'visitor'), true);
  assert.equal(await service.record('public-home', 'another-visitor'), true);
  assert.deepEqual(await service.read(String(providerId), [String(propertyId)]), { monthlyViews: 2, propertyMonthlyViews: { [String(propertyId)]: 2 } });
  assert.equal(viewCount, 3);
  assert.ok(indexes.some(value => (value as { options?: { unique?: boolean } }).options?.unique));
  assert.ok(indexes.some(value => (value as { options?: { expireAfterSeconds?: number } }).options?.expireAfterSeconds === 0));
});
