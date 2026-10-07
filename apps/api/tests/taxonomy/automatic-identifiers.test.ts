import assert from 'node:assert/strict';
import test from 'node:test';
import { taxonomyCreateSchema, featureCreateSchema, articleSlugSchema } from '@sadat-real-estate/contracts';
import { generateIdentifier } from '../../src/modules/shared/identifiers.js';

test('taxonomy and amenity creation do not require manually typed slugs', () => {
  const taxonomy = taxonomyCreateSchema.parse({ kind: 'category', name: { en: 'Residential' }, reason: 'Add residential category' });
  const feature = featureCreateSchema.parse({ kind: 'feature', groupKey: 'building_amenities', name: { ar: 'مصعد' }, reason: 'Add elevator feature' });
  assert.equal(taxonomy.slug, undefined);
  assert.equal(feature.slug, undefined);
  for (const name of [{ en: 'Same Name' }, { ar: 'اسم عربي' }, { en: 'Étage & Floor' }, { en: 'x'.repeat(200) }]) {
    const identifiers = Array.from({ length: 50 }, () => generateIdentifier('feature', name));
    assert.equal(new Set(identifiers).size, identifiers.length);
    for (const slug of identifiers) assert.equal(articleSlugSchema.safeParse(slug).success, true);
  }
});
