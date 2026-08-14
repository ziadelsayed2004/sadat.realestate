import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import test from 'node:test';
import { propertyMediaOrderSchema, propertyMediaUpdateSchema, propertyMediaUploadHeadersSchema } from '@sadat-real-estate/contracts';
import { createInMemoryStorageAdapter, createDeterministicMalwareScanner } from '../../src/modules/uploads/adapters.js';
import { propertyMediaSchema } from '../../src/modules/media/models.js';
import type { PropertyMediaRepository, StoredPropertyMedia } from '../../src/modules/media/repository.js';
import { createPropertyMediaService, PropertyMediaServiceError } from '../../src/modules/media/service.js';

const provider = '0123456789abcdef01234567'; const property = '1123456789abcdef01234567'; const mediaId = '2123456789abcdef01234567'; const now = new Date('2026-08-14T09:00:00.000Z');
const claims = (status: 'verified' | 'pending_review' = 'verified') => ({ sub: provider, role: 'provider', status, iss: 'sadat-real-estate-api', aud: 'sadat-real-estate', sid: '3123456789abcdef01234567', iat: 1, exp: 2, jti: 'media-test' } as never);
const bytes = Buffer.from([0xff, 0xd8, 0xff, 0x00, 0xff, 0xd9]);
function media(overrides: Partial<StoredPropertyMedia> = {}): StoredPropertyMedia { return { id: mediaId, propertyId: property, kind: 'image', originalFilename: 'photo.jpg', detectedMime: 'image/jpeg', byteSize: bytes.byteLength, sha256: 'a'.repeat(64), sortOrder: 0, isCover: true, processingState: 'ready', active: true, version: 1, storageKey: 'quarantine/' + 'a'.repeat(32), createdAt: now, updatedAt: now, ...overrides }; }
function fixture(scanner = createDeterministicMalwareScanner('clean')) {
  const rows = new Map<string, StoredPropertyMedia>(); const storage = createInMemoryStorageAdapter();
  const repository: PropertyMediaRepository = {
    async findOwnedProperty(owner, target) { return owner === provider && target === property ? { id: property, status: 'draft', active: true } : null; },
    async create(input) { const current = [...rows.values()].find(row => row.sha256 === input.sha256 && row.active); if (current) return { kind: 'replay', media: current }; const value = media({ id: mediaId, propertyId: input.propertyId, kind: input.kind, originalFilename: input.originalFilename, detectedMime: input.detectedMime, byteSize: input.byteSize, sha256: input.sha256, storageKey: input.storageKey, processingState: 'processing', isCover: rows.size === 0, sortOrder: rows.size }); rows.set(value.id, value); return { kind: 'written', media: value }; },
    async updateProcessing(input) { const current = rows.get(input.mediaId); if (!current) return { kind: 'not_found' }; const value = { ...current, processingState: input.state, ...(input.failureCode ? { failureCode: input.failureCode } : {}), version: current.version + 1, updatedAt: input.metadata.changedAt }; rows.set(value.id, value); return { kind: 'written', media: value }; },
    async listOwned(owner, target) { return owner === provider && target === property ? [...rows.values()] : []; },
    async listPublic() { return [...rows.values()].filter(row => row.active && row.processingState === 'ready').map(({ storageKey: _storageKey, createdAt, updatedAt, ...value }) => ({ ...value, createdAt: createdAt.toISOString(), updatedAt: updatedAt.toISOString() })); },
    async update(input) { const current = rows.get(input.mediaId); if (!current || current.version !== input.expectedVersion) return { kind: 'version_conflict' }; const value = { ...current, ...Object.fromEntries(Object.entries(input.changes).filter(([key]) => !['version', 'reason'].includes(key))), version: current.version + 1, updatedAt: input.metadata.changedAt }; rows.set(value.id, value); return { kind: 'written', media: value }; },
    async reorder(input) { const out = input.changes.items.map(item => { const current = rows.get(item.mediaId); if (!current) return { kind: 'not_found' as const }; const value = { ...current, sortOrder: item.sortOrder, ...(item.isCover !== undefined ? { isCover: item.isCover } : {}), version: current.version + 1, updatedAt: input.metadata.changedAt }; rows.set(value.id, value); return { kind: 'written' as const, media: value }; }); return out; },
    async markDeleted(input) { const current = rows.get(input.mediaId); if (!current) return { kind: 'not_found' }; const value = { ...current, active: false, isCover: false, processingState: 'deleted' as const, version: current.version + 1, updatedAt: input.metadata.changedAt }; rows.set(value.id, value); return { kind: 'written', media: value }; }
  };
  return { service: createPropertyMediaService({ repository, storage, scanner, now: () => now, createObjectKey: () => 'quarantine/' + 'b'.repeat(32) }) };
}

test('validates strict media kinds, MIME policy, ordering, and mass-assignment rejection', () => {
  assert.equal(propertyMediaUploadHeadersSchema.safeParse({ kind: 'image', filename: 'photo.jpg', contentType: 'image/jpeg' }).success, true);
  assert.equal(propertyMediaUploadHeadersSchema.safeParse({ kind: 'image', filename: 'plan.pdf', contentType: 'application/pdf' }).success, false);
  assert.equal(propertyMediaUploadHeadersSchema.safeParse({ kind: 'floor_plan', filename: 'plan.pdf', contentType: 'application/pdf', secret: 'x' }).success, false);
  assert.equal(propertyMediaOrderSchema.safeParse({ version: 1, items: [{ mediaId, sortOrder: 0, isCover: true }], reason: 'Order property media' }).success, true);
  assert.equal(propertyMediaUpdateSchema.safeParse({ version: 1, sortOrder: 1, reason: 'Order media' }).success, true);
  assert.equal(propertyMediaUpdateSchema.safeParse({ version: 1, reason: 'Unknown', unexpected: true }).success, false);
  assert.equal(propertyMediaSchema.options.strict, 'throw');
  assert.ok(propertyMediaSchema.indexes().some(([keys]) => keys.propertyId === 1 && keys.sortOrder === 1));
});

test('uploads ready media, supports cover ordering, ownership, replay, deletion, and failed processing', async () => {
  const { service } = fixture();
  const uploaded = await service.upload(claims(), property, { kind: 'image', filename: 'photo.jpg', contentType: 'image/jpeg' }, Readable.from(bytes), { requestId: 'media-1', traceId: 'a'.repeat(32) });
  assert.equal(uploaded.processingState, 'ready'); assert.equal(uploaded.isCover, true);
  const ordered = await service.reorder(claims(), property, { version: 1, items: [{ mediaId: uploaded.id, sortOrder: 4, isCover: true }], reason: 'Order property media' }, { requestId: 'media-2', traceId: 'b'.repeat(32) });
  assert.equal(ordered[0]?.sortOrder, 4);
  const listed = await service.list(claims(), property); assert.equal(listed.length, 1);
  const replay = await service.upload(claims(), property, { kind: 'image', filename: 'photo.jpg', contentType: 'image/jpeg' }, Readable.from(bytes), { requestId: 'media-3', traceId: 'c'.repeat(32) }); assert.equal(replay.id, uploaded.id);
  const deleted = await service.remove(claims(), property, uploaded.id, { requestId: 'media-4', traceId: 'd'.repeat(32) }); assert.equal(deleted.processingState, 'deleted');
  await assert.rejects(service.list(claims('pending_review'), property), error => error instanceof PropertyMediaServiceError && error.code === 'MEDIA_FORBIDDEN');
  const failed = fixture(createDeterministicMalwareScanner('infected'));
  await assert.rejects(failed.service.upload(claims(), property, { kind: 'image', filename: 'bad.jpg', contentType: 'image/jpeg' }, Readable.from(bytes), { requestId: 'media-5', traceId: 'e'.repeat(32) }), error => error instanceof PropertyMediaServiceError && error.code === 'MEDIA_PROCESSING_FAILED');
});
