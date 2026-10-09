import assert from 'node:assert/strict';
import test from 'node:test';
import { Types, type Connection } from 'mongoose';
import { attachPublicPropertyCovers, publicPropertyCoverUrl, type PublicCoverMedia } from '../../src/modules/media/public-cover.js';
import { createMongoosePublicPropertySearchRepository, createPublicPropertySearchService } from '../../src/modules/search/properties.js';

const property = '0123456789abcdef01234567';
const mediaId = '1123456789abcdef01234567';
const image = (changes: Partial<PublicCoverMedia> = {}): PublicCoverMedia => ({ id: mediaId, kind: 'image', active: true, processingState: 'ready', isCover: false, sortOrder: 0, ...changes });
const url = (id = mediaId) => `/api/v1/public/properties/${property}/media/${id}/content`;

test('published covers prefer the ready selected photo, ignore videos, and fall back to the first ready image', () => {
  const selected = '2123456789abcdef01234567';
  const media = [image({ kind: 'video', isCover: true }), image({ id: selected, isCover: true, sortOrder: 2 }), image({ id: '3123456789abcdef01234567', isCover: true, active: false }), image({ id: '4123456789abcdef01234567', isCover: true, processingState: 'processing' }), image()];
  assert.equal(publicPropertyCoverUrl(property, media, 'https://example.com/old.jpg'), url(selected));
  assert.equal(publicPropertyCoverUrl(property, media.filter(item => item.id !== selected)), url());
  assert.equal(publicPropertyCoverUrl(property, [image({ imageUrl: '/assets/demo-cover.png' })]), '/assets/demo-cover.png');
  assert.equal(publicPropertyCoverUrl(property, [], 'https://example.com/legacy.jpg'), 'https://example.com/legacy.jpg');
  assert.equal(publicPropertyCoverUrl(property, [image({ kind: 'video' })], url()), undefined);
  assert.equal(publicPropertyCoverUrl(property, [image({ active: false })], url()), undefined);
});

test('listing reads one batch of public covers without a stored imageUrl or leaking private media fields', async () => {
  const row = { _id: new Types.ObjectId(property), slug: 'zaton', name: { ar: 'Apartment' }, kind: 'property', transactionType: 'sale', status: 'published', active: true };
  let coverReads = 0;
  const connection = { collection(name: string) {
    const cursor = { sort() { return this; }, skip() { return this; }, limit() { return this; }, async toArray() { return name === 'properties' ? [row] : []; } };
    return {
      find(filter: Record<string, unknown>, options?: { projection: Record<string, number> }) {
        if (name !== 'property_media') return cursor;
        coverReads++;
        assert.deepEqual(filter, { propertyId: { $in: [row._id] }, kind: 'image', active: true, processingState: 'ready' });
        assert.equal(options?.projection.storageKey, undefined);
        return { async toArray() { return [{ _id: new Types.ObjectId(mediaId), propertyId: row._id, kind: 'image', active: true, processingState: 'ready', isCover: true, sortOrder: 0, storageKey: 'private-should-not-leak' }]; } };
      },
      async countDocuments() { return 1; }
    };
  } } as unknown as Connection;
  const service = createPublicPropertySearchService({ repository: createMongoosePublicPropertySearchRepository(connection) });
  const result = await service.list({});
  assert.equal(result.items[0]?.imageUrl, url());
  assert.equal(coverReads, 1);
  assert.equal(JSON.stringify(result).includes('private-should-not-leak'), false);
  assert.equal('imageUrl' in row, false);
  const deleted = { _id: row._id, imageUrl: url() };
  const emptyConnection = { collection() { return { find() { return { async toArray() { return []; } }; } }; } } as unknown as Connection;
  assert.equal((await attachPublicPropertyCovers(emptyConnection, [deleted]))[0]?.imageUrl, undefined);
  assert.equal(deleted.imageUrl, url());
});
