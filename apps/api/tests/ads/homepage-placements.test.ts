import assert from 'node:assert/strict';
import test from 'node:test';
import { Types, type Connection } from 'mongoose';
import { adPlacementSchema } from '@sadat-real-estate/contracts';
import { initializeFeaturedHomepagePlacement } from '../../src/modules/ads/homepage-placements.js';
import { advertisingRuntimeSettings } from '../../src/modules/settings/advertising-policy.js';

const actor = new Types.ObjectId('0123456789abcdef01234567');
const now = new Date('2026-10-11T12:00:00Z');
type Row = Record<string, unknown>;
function database(hero: Row | undefined, existing?: Row) {
  const rows = new Map<string, Row>();
  if (hero) rows.set('homepage.hero', hero);
  if (existing) rows.set('homepage.featured', existing);
  let writes = 0;
  const connection = { collection(name: string) {
    assert.equal(name, 'ad_placements');
    return {
      async findOne(filter: Row) {
        assert.deepEqual(filter, { key: 'homepage.hero', surface: 'homepage' });
        return rows.get('homepage.hero');
      },
      async updateOne(filter: Row, update: { $setOnInsert: Row }, options: Row) {
        writes++;
        assert.deepEqual(filter, { key: 'homepage.featured' });
        assert.deepEqual(Object.keys(update), ['$setOnInsert']);
        assert.deepEqual(options, { upsert: true });
        if (!rows.has('homepage.featured')) rows.set('homepage.featured', { _id: new Types.ObjectId(), key: filter.key, ...update.$setOnInsert });
      }
    };
  } } as unknown as Connection;
  return { connection, rows, writes: () => writes };
}

test('an older hero installation gains a real selectable featured card placement and repeated startup preserves it', async () => {
  const hero = { key: 'homepage.hero', active: true, updatedBy: actor };
  const db = database(hero);
  await initializeFeaturedHomepagePlacement(db.connection, now);
  const stored = db.rows.get('homepage.featured')!;
  const { _id, updatedBy, updatedAt, ...fields } = stored;
  const placement = adPlacementSchema.parse({ ...fields, id: String(_id), updatedBy: String(updatedBy), updatedAt: (updatedAt as Date).toISOString() });
  assert.equal(placement.active, true);
  assert.equal(placement.label.ar, 'كارت الرئيسية المميز');
  assert.equal(placement.surface, 'homepage');
  assert.equal(placement.targetUrlRequired, true);
  assert.ok(advertisingRuntimeSettings({ supported_placements: ['homepage.hero'] }).supportedPlacements.includes(placement.key));
  await initializeFeaturedHomepagePlacement(db.connection, new Date('2026-10-12T12:00:00Z'));
  assert.equal(db.rows.get('homepage.featured'), stored);
  assert.equal(db.rows.get('homepage.hero'), hero);
  assert.equal(db.rows.size, 2);
});

for (const active of [true, false]) {
  test(`startup preserves an existing ${active ? 'active' : 'disabled'} featured placement and its custom configuration`, async () => {
    const existing = { key: 'homepage.featured', active, label: { ar: 'إعلان مخصص' }, version: 7, width: 900, updatedBy: actor };
    const db = database({ active: true, updatedBy: actor }, existing);
    await initializeFeaturedHomepagePlacement(db.connection, now);
    assert.deepEqual(db.rows.get('homepage.featured'), existing);
  });
}

test('startup does not activate advertising for a disabled hero installation', async () => {
  const db = database({ active: false, updatedBy: actor });
  await initializeFeaturedHomepagePlacement(db.connection, now);
  assert.equal(db.rows.get('homepage.featured')?.active, false);
});

for (const hero of [undefined, { active: true }]) {
  test(`startup does not invent setup authority when ${hero ? 'the setup actor is missing' : 'homepage advertising has never been configured'}`, async () => {
    const db = database(hero);
    await initializeFeaturedHomepagePlacement(db.connection, now);
    assert.equal(db.rows.has('homepage.featured'), false);
    assert.equal(db.writes(), 0);
  });
}
