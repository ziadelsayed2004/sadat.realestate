import { Types, type ClientSession, type Connection, type Model } from 'mongoose';
import type { PropertyMediaData, PropertyMediaKind, PropertyMediaMime, PropertyMediaOrder, PropertyMediaProcessingState, PropertyMediaUpdate } from '@sadat-real-estate/contracts';
import type { AuditWriter } from '../audit/writer.js';
import type { PropertyMediaModels, PropertyMediaRecord } from './models.js';
import { propertyMediaData, propertyMediaSchema } from './models.js';
import { unexpiredPropertyFilter } from '../settings/property-policy.js';
import { publicPropertyCoverUrl } from './public-cover.js';
import { randomUUID } from 'node:crypto';

export interface OwnedMediaProperty { id: string; status: string; active: boolean; }
export interface StoredPropertyMedia extends Omit<PropertyMediaData, 'createdAt' | 'updatedAt'> { storageKey: string; createdAt: Date; updatedAt: Date; }
export interface MediaMutationMetadata { actorType?: 'admin' | 'provider'; actorId: string; reason: string; requestId: string; traceId: string; changedAt: Date; }
export type MediaWriteResult = { kind: 'written'; media: StoredPropertyMedia } | { kind: 'not_found' } | { kind: 'version_conflict' } | { kind: 'capacity' } | { kind: 'replay'; media: StoredPropertyMedia };
export type MediaCreateInput = { propertyId: string; providerId: string; kind: PropertyMediaKind; originalFilename: string; declaredMime: PropertyMediaMime; detectedMime: PropertyMediaMime; byteSize: number; sha256: string; storageKey: string; capacity: number; metadata: MediaMutationMetadata };

export interface PropertyMediaRepository {
  findAdminProperty?(propertyId: string): Promise<(OwnedMediaProperty & { providerId: string }) | null>;
  findOwnedProperty(providerId: string, propertyId: string): Promise<OwnedMediaProperty | null>;
  create(input: MediaCreateInput): Promise<MediaWriteResult>;
  updateProcessing(input: { providerId: string; mediaId: string; state: PropertyMediaProcessingState; failureCode?: string; metadata: MediaMutationMetadata }): Promise<MediaWriteResult>;
  listOwned(providerId: string, propertyId: string): Promise<StoredPropertyMedia[]>;
  listPublic(propertyId: string): Promise<PropertyMediaData[]>;
  update(input: { providerId: string; propertyId: string; mediaId: string; expectedVersion: number; changes: PropertyMediaUpdate; before: StoredPropertyMedia; metadata: MediaMutationMetadata }): Promise<MediaWriteResult>;
  reorder(input: { providerId: string; propertyId: string; expectedVersion: number; changes: PropertyMediaOrder; metadata: MediaMutationMetadata }): Promise<MediaWriteResult[]>;
  markDeleted(input: { providerId: string; propertyId: string; mediaId: string; metadata: MediaMutationMetadata }): Promise<MediaWriteResult>;
}

function valid(value: string): boolean { return /^[a-f0-9]{24}$/.test(value); }
function toStored(record: PropertyMediaRecord & { _id: Types.ObjectId }): StoredPropertyMedia {
  return { ...propertyMediaData(record), storageKey: record.storageKey, createdAt: record.createdAt, updatedAt: record.updatedAt };
}
function duplicate(error: unknown): boolean { return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: unknown }).code === 11000; }

export function createMongoosePropertyMediaRepository(connection: Connection, models: PropertyMediaModels, audit: AuditWriter, draftOnly = false): PropertyMediaRepository {
  const Draft = draftOnly ? undefined : (connection.models.PropertyMediaDraft as Model<PropertyMediaRecord> | undefined) ?? connection.model<PropertyMediaRecord>('PropertyMediaDraft', propertyMediaSchema, 'property_media_drafts');
  const drafts = Draft ? createMongoosePropertyMediaRepository(connection, { PropertyMedia: Draft }, audit, true) : undefined;
  const editing = async (propertyId: string) => !draftOnly && Boolean(await connection.collection('properties').findOne({ _id: new Types.ObjectId(propertyId), status: 'published', active: true, hasEditDraft: true }, { projection: { _id: 1 } }));
  async function tx<T>(run: (session: ClientSession) => Promise<T>): Promise<T> { const session = await connection.startSession(); try { return await session.withTransaction(() => run(session)); } finally { await session.endSession(); } }
  // Serialize media writes with starting/submitting an edit without changing the
  // editor's field version. A submit cannot silently omit a concurrent upload.
  async function lockProperty(propertyId: string, session: ClientSession): Promise<boolean> {
    const filter = { _id: new Types.ObjectId(propertyId), ...(!draftOnly ? { $nor: [{ status: 'published', active: true, hasEditDraft: true }] } : {}) };
    const result = await connection.collection(draftOnly ? 'property_edit_drafts' : 'properties').updateOne(filter, { $set: { mediaRevision: randomUUID() } }, { session });
    return result.matchedCount === 1;
  }
  async function auditWrite(action: string, id: string, before: unknown, after: unknown, metadata: MediaMutationMetadata, session?: ClientSession): Promise<void> {
    await audit.record({ actorType: metadata.actorType ?? 'provider', actorId: metadata.actorId, targetType: 'property_media', targetId: id, action, reason: metadata.reason, before, after, requestId: metadata.requestId, traceId: metadata.traceId, occurredAt: metadata.changedAt }, session);
  }
  async function syncCover(propertyId: string, session: ClientSession) {
    const covers = await connection.collection(draftOnly ? 'property_media_drafts' : 'property_media').find({ propertyId: new Types.ObjectId(propertyId), active: true, processingState: 'ready', kind: 'image' }, { session, projection: { _id: 1, imageUrl: 1, kind: 1, active: 1, processingState: 1, isCover: 1, sortOrder: 1 } }).toArray();
    const imageUrl = publicPropertyCoverUrl(propertyId, covers.map(cover => ({ id: String(cover._id), ...(typeof cover.imageUrl === 'string' ? { imageUrl: cover.imageUrl } : {}), kind: cover.kind, active: cover.active, processingState: cover.processingState, isCover: cover.isCover, sortOrder: cover.sortOrder })));
    if (imageUrl) await connection.collection(draftOnly ? 'property_edit_drafts' : 'properties').updateOne({ _id: new Types.ObjectId(propertyId) }, { $set: { imageUrl } }, { session });
    else await connection.collection(draftOnly ? 'property_edit_drafts' : 'properties').updateOne({ _id: new Types.ObjectId(propertyId), imageUrl: /^\/api\/v1\/public\/properties\// }, { $unset: { imageUrl: 1 } }, { session });
  }
  const load = async (filter: Record<string, unknown>, session?: ClientSession): Promise<StoredPropertyMedia | null> => {
    const row = await models.PropertyMedia.findOne(filter).select('+storageKey').lean().session(session ?? null);
    return row ? toStored(row as PropertyMediaRecord & { _id: Types.ObjectId }) : null;
  };
  return {
    async findAdminProperty(propertyId) {
      if (!valid(propertyId)) return null;
      const row = await connection.collection('properties').findOne({ _id: new Types.ObjectId(propertyId) }, { projection: { status: 1, active: 1, providerId: 1 } });
      return row && row.providerId instanceof Types.ObjectId ? { id: propertyId, providerId: row.providerId.toHexString(), status: String(row.status), active: Boolean(row.active) } : null;
    },
    async findOwnedProperty(providerId, propertyId) {
      if (!valid(providerId) || !valid(propertyId)) return null;
      const row = await connection.collection('properties').findOne({ _id: new Types.ObjectId(propertyId), providerId: new Types.ObjectId(providerId) }, { projection: { status: 1, active: 1, hasEditDraft: 1 } });
      return row ? { id: propertyId, status: row.status === 'published' && row.hasEditDraft ? 'needs_changes' : String(row.status), active: Boolean(row.active) } : null;
    },
    async create(input) {
      if (drafts && await editing(input.propertyId)) return drafts.create(input);
      try {
        return await tx(async session => {
          if (!await lockProperty(input.propertyId, session)) return { kind: 'version_conflict' as const };
          const existing = await models.PropertyMedia.findOne({ propertyId: new Types.ObjectId(input.propertyId), providerId: new Types.ObjectId(input.providerId), sha256: input.sha256, active: true }).select('+storageKey').lean().session(session);
          if (existing) return { kind: 'replay' as const, media: toStored(existing as PropertyMediaRecord & { _id: Types.ObjectId }) };
          const count = await models.PropertyMedia.countDocuments({ propertyId: new Types.ObjectId(input.propertyId), active: true }).session(session);
          if (count >= input.capacity) return { kind: 'capacity' as const };
          const created = new models.PropertyMedia({ propertyId: new Types.ObjectId(input.propertyId), providerId: new Types.ObjectId(input.providerId), kind: input.kind, originalFilename: input.originalFilename, declaredMime: input.declaredMime, detectedMime: input.detectedMime, byteSize: input.byteSize, sha256: input.sha256, storageKey: input.storageKey, sortOrder: count, isCover: false, processingState: 'processing', active: true, createdAt: input.metadata.changedAt, updatedAt: input.metadata.changedAt });
          await created.save({ session });
          const media = toStored(created.toObject() as PropertyMediaRecord & { _id: Types.ObjectId });
          await auditWrite('property_media.create', media.id, null, media, input.metadata, session);
          return { kind: 'written' as const, media };
        });
      } catch (error) { if (duplicate(error)) return { kind: 'capacity' }; throw error; }
    },
    async updateProcessing(input) {
      if (drafts && Draft && await Draft.exists({ _id: input.mediaId, providerId: input.providerId })) return drafts.updateProcessing(input);
      const current = await load({ _id: input.mediaId, providerId: input.providerId, active: true });
      if (!current) return { kind: 'not_found' };
      if (!['processing', 'failed'].includes(current.processingState)) return { kind: 'version_conflict' };
      const media = await tx(async session => {
        if (!await lockProperty(current.propertyId, session)) return null;
        const hasCover = input.state === 'ready' && await models.PropertyMedia.exists({ propertyId: current.propertyId, providerId: input.providerId, isCover: true, active: true, processingState: 'ready' }).session(session);
        const row = await models.PropertyMedia.findOneAndUpdate({ _id: input.mediaId, providerId: input.providerId, processingState: current.processingState, active: true }, { $set: { processingState: input.state, ...(input.state === 'ready' && current.kind === 'image' && !hasCover ? { isCover: true } : {}), ...(input.failureCode ? { failureCode: input.failureCode } : { failureCode: null }), updatedAt: input.metadata.changedAt }, $inc: { version: 1 } }, { new: true, runValidators: true, lean: true, session });
        if (!row) return null;
        if (input.state === 'ready' && current.kind === 'image' && !hasCover) await models.PropertyMedia.updateMany({ propertyId: current.propertyId, _id: { $ne: row._id }, active: true }, { $set: { isCover: false } }, { session });
        const output = toStored(row as PropertyMediaRecord & { _id: Types.ObjectId });
        await auditWrite('property_media.processing', output.id, current, output, input.metadata, session);
        await syncCover(output.propertyId, session);
        return output;
      });
      return media ? { kind: 'written' as const, media } : { kind: 'version_conflict' as const };
    },
    async listOwned(providerId, propertyId) {
      if (drafts && await editing(propertyId)) return drafts.listOwned(providerId, propertyId);
      const rows = await models.PropertyMedia.find({ providerId, propertyId }).select('+storageKey').sort({ sortOrder: 1, createdAt: 1, _id: 1 }).lean();
      return rows.map(row => toStored(row as PropertyMediaRecord & { _id: Types.ObjectId }));
    },
    async listPublic(propertyId) {
      const property = await connection.collection('properties').findOne({ _id: new Types.ObjectId(propertyId), status: 'published', active: true, ...unexpiredPropertyFilter() }, { projection: { _id: 1 } });
      if (!property) return [];
      const rows = await models.PropertyMedia.find({ propertyId, active: true, processingState: 'ready' }).sort({ sortOrder: 1, createdAt: 1, _id: 1 }).lean();
      return rows.map(row => propertyMediaData(row as PropertyMediaRecord & { _id: Types.ObjectId }));
    },
    async update(input) {
      if (drafts && await editing(input.propertyId)) return drafts.update(input);
      const changes = Object.fromEntries(Object.entries(input.changes).filter(([key]) => key !== 'version' && key !== 'reason'));
      return tx(async session => {
        if (!await lockProperty(input.propertyId, session)) return { kind: 'version_conflict' as const };
        const eligible = await models.PropertyMedia.exists({ _id: input.mediaId, propertyId: input.propertyId, providerId: input.providerId, version: input.expectedVersion, active: true, processingState: 'ready' }).session(session);
        if (!eligible) return { kind: 'version_conflict' as const };
        if (changes.isCover === true) await models.PropertyMedia.updateMany({ propertyId: input.propertyId, active: true }, { $set: { isCover: false } }, { session });
        const row = await models.PropertyMedia.findOneAndUpdate({ _id: input.mediaId, propertyId: input.propertyId, providerId: input.providerId, version: input.expectedVersion, active: true, processingState: 'ready' }, { $set: { ...changes, updatedAt: input.metadata.changedAt }, $inc: { version: 1 } }, { new: true, runValidators: true, lean: true, session });
        if (!row) return (await models.PropertyMedia.exists({ _id: input.mediaId, propertyId: input.propertyId, providerId: input.providerId }).session(session)) ? { kind: 'version_conflict' as const } : { kind: 'not_found' as const };
        const media = toStored(row as PropertyMediaRecord & { _id: Types.ObjectId }); await auditWrite('property_media.update', media.id, input.before, media, input.metadata, session); await syncCover(input.propertyId, session); return { kind: 'written' as const, media };
      });
    },
    async reorder(input) {
      if (drafts && await editing(input.propertyId)) return drafts.reorder(input);
      return tx(async session => {
        if (!await lockProperty(input.propertyId, session)) return [{ kind: 'version_conflict' as const }];
        const property = await connection.collection(draftOnly ? 'property_edit_drafts' : 'properties').findOne({ _id: new Types.ObjectId(input.propertyId), version: input.expectedVersion }, { session, projection: { _id: 1 } });
        if (!property) return [{ kind: 'version_conflict' as const }];
        const ids = input.changes.items.map(item => new Types.ObjectId(item.mediaId));
        const rows = await models.PropertyMedia.find({ _id: { $in: ids }, propertyId: input.propertyId, providerId: input.providerId, active: true, processingState: 'ready' }).select('+storageKey').lean().session(session);
        if (rows.length !== ids.length) return [{ kind: 'not_found' as const }];
        const results: MediaWriteResult[] = [];
        for (const item of input.changes.items) {
          const set: Record<string, unknown> = { sortOrder: item.sortOrder, ...(item.isCover !== undefined ? { isCover: item.isCover } : {}), updatedAt: input.metadata.changedAt };
          if (item.isCover) await models.PropertyMedia.updateMany({ propertyId: input.propertyId, active: true }, { $set: { isCover: false } }, { session });
          const row = await models.PropertyMedia.findOneAndUpdate({ _id: item.mediaId, propertyId: input.propertyId, providerId: input.providerId, active: true, processingState: 'ready' }, { $set: set, $inc: { version: 1 } }, { new: true, runValidators: true, lean: true, session });
          if (row) results.push({ kind: 'written', media: toStored(row as PropertyMediaRecord & { _id: Types.ObjectId }) });
        }
        await auditWrite('property_media.reorder', input.propertyId, rows.map(row => propertyMediaData(row as PropertyMediaRecord & { _id: Types.ObjectId })), results.filter(result => result.kind === 'written').map(result => result.media), input.metadata, session);
        await syncCover(input.propertyId, session);
        return results;
      });
    },
    async markDeleted(input) {
      if (drafts && await editing(input.propertyId)) return drafts.markDeleted(input);
      return tx(async session => {
        if (!await lockProperty(input.propertyId, session)) return { kind: 'version_conflict' as const };
        const row = await models.PropertyMedia.findOneAndUpdate({ _id: input.mediaId, propertyId: input.propertyId, providerId: input.providerId, active: true }, { $set: { active: false, isCover: false, processingState: 'deleted', updatedAt: input.metadata.changedAt }, $inc: { version: 1 } }, { new: true, runValidators: true, lean: true, session });
        if (!row) return { kind: 'not_found' as const };
        const media = toStored(row as PropertyMediaRecord & { _id: Types.ObjectId }); await auditWrite('property_media.delete', media.id, null, media, input.metadata, session); await syncCover(input.propertyId, session); return { kind: 'written' as const, media };
      });
    }
  };
}
