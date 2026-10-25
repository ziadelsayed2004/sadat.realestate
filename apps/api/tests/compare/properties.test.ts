import assert from 'node:assert/strict';
import test from 'node:test';
import { Types, type Connection } from 'mongoose';
import { PUBLIC_PROPERTY_COMPARISON_FIELDS } from '@sadat-real-estate/contracts';
import { createMongoosePublicPropertyComparisonRepository, createPublicPropertyComparisonService, PublicPropertyComparisonError, type PublicPropertyComparisonRepository, type PublicPropertyComparisonSource } from '../../src/modules/compare/properties.js';

const id = '0123456789abcdef01234567'; const other = '1123456789abcdef01234567';
const localized = { ar: 'شقة', en: 'Apartment' };

test('comparison retains partial delivery, independent finishing choices and public project affiliation', async () => {
  const result = await createPublicPropertyComparisonService({ repository: repository([row(id, { deliveryStatus: 'partial_infrastructure', finishing: [{ en: 'Premium finishing' }], projectId: other, projectName: { en: 'Owner compound' }, projectUrl: '/developers/owner-company/projects/owner-compound' })]) }).compare({ propertyIds: [id] });
  assert.equal(result.items[0]?.deliveryStatus, 'partial_infrastructure');
  assert.deepEqual(result.items[0]?.finishing, [{ en: 'Premium finishing' }]);
  assert.deepEqual(result.items[0]?.projectName, { en: 'Owner compound' });
  assert.equal(result.items[0]?.projectUrl, '/developers/owner-company/projects/owner-compound');
});
const row = (value: string, overrides: Partial<PublicPropertyComparisonSource> = {}): PublicPropertyComparisonSource => ({ id: value, slug: value === id ? 'first' : 'second', kind: 'property', name: localized, transactionType: 'sale', status: 'published', active: true, ...overrides });
function repository(rows: PublicPropertyComparisonSource[]): PublicPropertyComparisonRepository { return { async findPublished(ids) { return rows.filter((item) => ids.includes(item.id) && item.status === 'published' && item.active); } }; }

test('compares one or two published active properties using fixed fields and safe cards', async () => {
  const service = createPublicPropertyComparisonService({ repository: repository([row(id), row(other)]) });
  const result = await service.compare({ propertyIds: [other, id] });
  assert.deepEqual(result.items.map((item) => item.id), [other, id]);
  assert.deepEqual(result.fields, [...PUBLIC_PROPERTY_COMPARISON_FIELDS]);
  assert.equal('status' in result.items[0]!, false);
  assert.equal('active' in result.items[0]!, false);
});

test('rejects duplicate, over-limit, unavailable, draft, and operator-shaped input', async () => {
  const service = createPublicPropertyComparisonService({ repository: repository([row(id), row(other, { status: 'draft' })]) });
  await assert.rejects(service.compare({ propertyIds: [id, id] }));
  await assert.rejects(service.compare({ propertyIds: [id, other, '2123456789abcdef01234567'] }));
  await assert.rejects(service.compare({ propertyIds: [id, other] }), (error) => error instanceof PublicPropertyComparisonError && error.code === 'PROPERTY_UNAVAILABLE');
  await assert.rejects(service.compare({ propertyIds: { '$in': [id] } }));
});

test('returns a single item comparison without inventing unavailable data', async () => {
  const service = createPublicPropertyComparisonService({ repository: repository([row(id)]) });
  const result = await service.compare({ propertyIds: [id] });
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0]?.price, undefined);
});

test('comparison resolves only selected active finishing features and keeps each property association', async () => {
  const finishId = '2123456789abcdef01234567', hiddenId = '3123456789abcdef01234567';
  const finishing = { ar: 'تشطيب فاخر', en: 'Premium finishing' };
  const stored = [
    { _id: new Types.ObjectId(id), ...row(id), featureIds: [new Types.ObjectId(finishId), new Types.ObjectId(hiddenId)], deliveryStatus: 'ready_to_move' },
    { _id: new Types.ObjectId(other), ...row(other), deliveryStatus: 'ready_to_move' }
  ];
  let featureReads = 0;
  const connection = { collection(name: string) { return { find(filter: Record<string, unknown>, options?: { projection: Record<string, number> }) {
    if (name === 'properties') {
      assert.equal(options?.projection.featureIds, 1);
      return { async toArray() { return stored; } };
    }
    if (name === 'property_media') return { async toArray() { return []; } };
    assert.equal(name, 'features_services');
    featureReads++;
    assert.equal(filter.kind, 'feature');
    assert.equal(filter.active, true);
    assert.deepEqual(filter._id, { $in: [new Types.ObjectId(finishId), new Types.ObjectId(hiddenId)] });
    assert.deepEqual(filter.$or, [{ groupKey: 'finishing' }, { slug: /(?:^|-)finish(?:ing)?(?:-|$)/u }]);
    assert.deepEqual(options?.projection, { _id: 1, name: 1 });
    return { sort() { return this; }, async toArray() { return [{ _id: new Types.ObjectId(finishId), name: finishing }]; } };
  } }; } } as unknown as Connection;
  const result = await createPublicPropertyComparisonService({ repository: createMongoosePublicPropertyComparisonRepository(connection) }).compare({ propertyIds: [other, id] });
  assert.equal(featureReads, 1);
  assert.equal(result.items[0]?.finishing, undefined, 'ready to move does not imply a finishing condition');
  assert.deepEqual(result.items[1]?.finishing, [finishing]);
  assert.equal('featureIds' in result.items[1]!, false);
});

test('comparison resolves uploaded covers in one bounded query when the stored URL is missing or stale', async () => {
  const mediaId = '2123456789abcdef01234567', otherMediaId = '3123456789abcdef01234567';
  const toStored = (value: PublicPropertyComparisonSource) => {
    const { id: propertyId, ...fields } = value;
    return { _id: new Types.ObjectId(propertyId), ...fields };
  };
  const rows = [toStored(row(id)), toStored(row(other, { imageUrl: '/assets/old-cover.png' }))];
  let coverReads = 0;
  const connection = { collection(name: string) {
    return { find(filter: Record<string, unknown>, options?: { projection: Record<string, number> }) {
      if (name === 'properties') {
        assert.deepEqual(filter._id, { $in: [new Types.ObjectId(other), new Types.ObjectId(id)] });
        assert.equal(filter.status, 'published');
        assert.equal(filter.active, true);
        assert.ok((filter.expiresAt as { $not?: { $lte?: unknown } })?.$not?.$lte instanceof Date, 'expired properties are excluded before their media is read');
        return { async toArray() { return rows; } };
      }
      assert.equal(name, 'property_media');
      coverReads++;
      assert.deepEqual(filter, { propertyId: { $in: rows.map(value => value._id) }, kind: 'image', active: true, processingState: 'ready' });
      assert.equal(options?.projection.storageKey, undefined);
      return { async toArray() { return [
        { _id: new Types.ObjectId(mediaId), propertyId: rows[0]!._id, kind: 'image', active: true, processingState: 'ready', isCover: true, sortOrder: 1, storageKey: 'private-storage-key' },
        { _id: new Types.ObjectId(otherMediaId), propertyId: rows[1]!._id, kind: 'image', active: true, processingState: 'ready', isCover: true, sortOrder: 0 }
      ]; } };
    } };
  } } as unknown as Connection;
  const service = createPublicPropertyComparisonService({ repository: createMongoosePublicPropertyComparisonRepository(connection) });
  const result = await service.compare({ propertyIds: [other, id] });
  assert.deepEqual(result.items.map(value => [value.id, value.imageUrl]), [
    [other, `/api/v1/public/properties/${other}/media/${otherMediaId}/content`],
    [id, `/api/v1/public/properties/${id}/media/${mediaId}/content`]
  ]);
  assert.equal(coverReads, 1);
  assert.equal(JSON.stringify(result).includes('private-storage-key'), false);
  assert.equal('imageUrl' in rows[0]!, false);
  assert.equal(rows[1]!.imageUrl, '/assets/old-cover.png');
});

test('comparison does not resurrect a removed uploaded cover and preserves ordinary legacy images', async () => {
  const stored = [
    { _id: new Types.ObjectId(id), ...row(id), imageUrl: `/api/v1/public/properties/${id}/media/2123456789abcdef01234567/content` },
    { _id: new Types.ObjectId(other), ...row(other), imageUrl: '/assets/legacy-cover.png' }
  ];
  const connection = { collection(name: string) { return { find() { return { async toArray() { return name === 'properties' ? stored : []; } }; } }; } } as unknown as Connection;
  const result = await createPublicPropertyComparisonService({ repository: createMongoosePublicPropertyComparisonRepository(connection) }).compare({ propertyIds: [id, other] });
  assert.equal(result.items[0]?.imageUrl, undefined);
  assert.equal(result.items[1]?.imageUrl, '/assets/legacy-cover.png');
});

test('comparison does not query media when no published properties are available', async () => {
  const connection = { collection(name: string) {
    assert.equal(name, 'properties');
    return { find() { return { async toArray() { return []; } }; } };
  } } as unknown as Connection;
  const service = createPublicPropertyComparisonService({ repository: createMongoosePublicPropertyComparisonRepository(connection) });
  await assert.rejects(service.compare({ propertyIds: [id] }), (error) => error instanceof PublicPropertyComparisonError && error.code === 'PROPERTY_UNAVAILABLE');
});
