import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose, { type Model } from 'mongoose';
import { createLocationModels } from '../../src/modules/locations/models.js';

function indexByName(model: Model<unknown>, name: string) {
  return model.schema.indexes().find(([, options]) => options.name === name);
}

test('declares strict localized hierarchy records and query-driven indexes', async () => {
  const connection = mongoose.createConnection();
  const first = createLocationModels(connection);
  assert.equal(first.Location, createLocationModels(connection).Location);
  const actor = new mongoose.Types.ObjectId();
  const parent = new first.Location({
    kind: 'location', name: { ar: 'مدينة السادات' }, slug: 'sadat-city',
    createdBy: actor, updatedBy: actor
  });
  await parent.validate();
  assert.equal(parent.active, true);
  assert.equal(parent.order, 0);
  await assert.rejects(new first.Location({
    kind: 'neighborhood', name: { en: 'District One' }, slug: 'district-one',
    createdBy: actor, updatedBy: actor
  }).validate(), /parentLocationId/);
  await assert.rejects(new first.Location({
    kind: 'location', name: {}, slug: 'empty-name', createdBy: actor, updatedBy: actor
  }).validate(), /name/);
  assert.throws(() => new first.Location({
    kind: 'location', name: { en: 'Unsafe' }, slug: 'unsafe', createdBy: actor, updatedBy: actor,
    population: 100000
  }), /strict mode/);
  assert.equal(indexByName(first.Location, 'locations_slug_unique')?.[1].unique, true);
  assert.ok(indexByName(first.Location, 'locations_hierarchy_active_order'));
  assert.ok(indexByName(first.Location, 'locations_localized_name_search'));
  assert.ok(indexByName(first.Location, 'locations_coordinates_geo'));
});

test('validates optional GeoJSON coordinate order and ranges', async () => {
  const { Location } = createLocationModels(mongoose.createConnection());
  const actor = new mongoose.Types.ObjectId();
  await new Location({
    kind: 'location', name: { en: 'Mapped' }, slug: 'mapped', createdBy: actor, updatedBy: actor,
    coordinates: { type: 'Point', coordinates: [30.5, 30.2] }
  }).validate();
  await assert.rejects(new Location({
    kind: 'location', name: { en: 'Invalid' }, slug: 'invalid-geo', createdBy: actor, updatedBy: actor,
    coordinates: { type: 'Point', coordinates: [200, 30.2] }
  }).validate(), /Coordinates/);
});
