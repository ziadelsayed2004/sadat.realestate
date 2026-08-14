import { Types, type ClientSession, type Connection } from 'mongoose';
import type { PropertyMediaData, PropertyMediaKind, PropertyMediaMime, PropertyMediaOrder, PropertyMediaProcessingState, PropertyMediaUpdate } from '@sadat-real-estate/contracts';
import type { AuditWriter } from '../audit/writer.js';
import type { PropertyMediaModels, PropertyMediaRecord } from './models.js';
import { propertyMediaData } from './models.js';

export interface OwnedMediaProperty { id: string; status: string; active: boolean; }
export interface StoredPropertyMedia extends Omit<PropertyMediaData, 'createdAt' | 'updatedAt'> { storageKey: string; createdAt: Date; updatedAt: Date; }
export interface MediaMutationMetadata { actorId: string; reason: string; requestId: string; traceId: string; changedAt: Date; }
export type MediaWriteResult = { kind: 'written'; media: StoredPropertyMedia } | { kind: 'not_found' } | { kind: 'version_conflict' } | { kind: 'capacity' } | { kind: 'replay'; media: StoredPropertyMedia };
export type MediaCreateInput = { propertyId: string; providerId: string; kind: PropertyMediaKind; originalFilename: string; declaredMime: PropertyMediaMime; detectedMime: PropertyMediaMime; byteSize: number; sha256: string; storageKey: string; metadata: MediaMutationMetadata };

export interface PropertyMediaRepository {
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

export function createMongoosePropertyMediaRepository(connection: Connection, models: PropertyMediaModels, audit: AuditWriter): PropertyMediaRepository {
  async function tx<T>(run: (session: ClientSession) => Promise<T>): Promise<T> { const session = await connection.startSession(); try { return await session.withTransaction(() => run(session)); } finally { await session.endSession(); } }
  async function auditWrite(action: string, id: string, before: unknown, after: unknown, metadata: MediaMutationMetadata, session?: ClientSession): Promise<void> {
    await audit.record({ actorType: 'provider', actorId: metadata.actorId, targetType: 'property_media', targetId: id, action, reason: metadata.reason, before, after, requestId: metadata.requestId, traceId: metadata.traceId, occurredAt: metadata.changedAt }, session);
  }
  const load = async (filter: Record<string, unknown>, session?: ClientSession): Promise<StoredPropertyMedia | null> => {
    const row = await models.PropertyMedia.findOne(filter).select('+storageKey').lean().session(session ?? null);
    return row ? toStored(row as PropertyMediaRecord & { _id: Types.ObjectId }) : null;
  };
  return {
    async findOwnedProperty(providerId, propertyId) {
      if (!valid(providerId) || !valid(propertyId)) return null;
      const row = await connection.collection('properties').findOne({ _id: new Types.ObjectId(propertyId), providerId: new Types.ObjectId(providerId) }, { projection: { status: 1, active: 1 } });
      return row ? { id: propertyId, status: String(row.status), active: Boolean(row.active) } : null;
    },
    async create(input) {
      try {
        return await tx(async session => {
          const existing = await models.PropertyMedia.findOne({ propertyId: new Types.ObjectId(input.propertyId), providerId: new Types.ObjectId(input.providerId), sha256: input.sha256, active: true }).select('+storageKey').lean().session(session);
          if (existing) return { kind: 'replay' as const, media: toStored(existing as PropertyMediaRecord & { _id: Types.ObjectId }) };
          const count = await models.PropertyMedia.countDocuments({ propertyId: new Types.ObjectId(input.propertyId), active: true }).session(session);
          if (count >= 50) return { kind: 'capacity' as const };
          const created = new models.PropertyMedia({ propertyId: new Types.ObjectId(input.propertyId), providerId: new Types.ObjectId(input.providerId), kind: input.kind, originalFilename: input.originalFilename, declaredMime: input.declaredMime, detectedMime: input.detectedMime, byteSize: input.byteSize, sha256: input.sha256, storageKey: input.storageKey, sortOrder: count, isCover: count === 0, processingState: 'processing', active: true, createdAt: input.metadata.changedAt, updatedAt: input.metadata.changedAt });
          await created.save({ session });
          const media = toStored(created.toObject() as PropertyMediaRecord & { _id: Types.ObjectId });
          await auditWrite('property_media.create', media.id, null, media, input.metadata, session);
          return { kind: 'written' as const, media };
        });
      } catch (error) { if (duplicate(error)) return { kind: 'capacity' }; throw error; }
    },
    async updateProcessing(input) {
      const current = await load({ _id: input.mediaId, providerId: input.providerId, active: true });
      if (!current) return { kind: 'not_found' };
      if (!['processing', 'failed'].includes(current.processingState)) return { kind: 'version_conflict' };
      const media = await tx(async session => {
        const row = await models.PropertyMedia.findOneAndUpdate({ _id: input.mediaId, providerId: input.providerId, processingState: current.processingState, active: true }, { $set: { processingState: input.state, ...(input.failureCode ? { failureCode: input.failureCode } : { failureCode: null }), updatedAt: input.metadata.changedAt }, $inc: { version: 1 } }, { new: true, runValidators: true, lean: true, session });
        if (!row) return null;
        const output = toStored(row as PropertyMediaRecord & { _id: Types.ObjectId });
        await auditWrite('property_media.processing', output.id, current, output, input.metadata, session);
        return output;
      });
      return media ? { kind: 'written' as const, media } : { kind: 'version_conflict' as const };
    },
    async listOwned(providerId, propertyId) {
      const rows = await models.PropertyMedia.find({ providerId, propertyId }).select('+storageKey').sort({ sortOrder: 1, createdAt: 1, _id: 1 }).lean();
      return rows.map(row => toStored(row as PropertyMediaRecord & { _id: Types.ObjectId }));
    },
    async listPublic(propertyId) {
      const property = await connection.collection('properties').findOne({ _id: new Types.ObjectId(propertyId), status: 'published', active: true }, { projection: { _id: 1 } });
      if (!property) return [];
      const rows = await models.PropertyMedia.find({ propertyId, active: true, processingState: 'ready' }).sort({ sortOrder: 1, createdAt: 1, _id: 1 }).lean();
      return rows.map(row => propertyMediaData(row as PropertyMediaRecord & { _id: Types.ObjectId }));
    },
    async update(input) {
      const changes = Object.fromEntries(Object.entries(input.changes).filter(([key]) => key !== 'version' && key !== 'reason'));
      return tx(async session => {
        if (changes.isCover === true) await models.PropertyMedia.updateMany({ propertyId: input.propertyId, providerId: input.providerId, active: true }, { $set: { isCover: false } }, { session });
        const row = await models.PropertyMedia.findOneAndUpdate({ _id: input.mediaId, propertyId: input.propertyId, providerId: input.providerId, version: input.expectedVersion, active: true, processingState: 'ready' }, { $set: { ...changes, updatedAt: input.metadata.changedAt }, $inc: { version: 1 } }, { new: true, runValidators: true, lean: true, session });
        if (!row) return (await models.PropertyMedia.exists({ _id: input.mediaId, propertyId: input.propertyId, providerId: input.providerId }).session(session)) ? { kind: 'version_conflict' as const } : { kind: 'not_found' as const };
        const media = toStored(row as PropertyMediaRecord & { _id: Types.ObjectId }); await auditWrite('property_media.update', media.id, input.before, media, input.metadata, session); return { kind: 'written' as const, media };
      });
    },
    async reorder(input) {
      return tx(async session => {
        const ids = input.changes.items.map(item => new Types.ObjectId(item.mediaId));
        const rows = await models.PropertyMedia.find({ _id: { $in: ids }, propertyId: input.propertyId, providerId: input.providerId, active: true, processingState: 'ready' }).select('+storageKey').lean().session(session);
        if (rows.length !== ids.length) return [{ kind: 'not_found' as const }];
        const results: MediaWriteResult[] = [];
        for (const item of input.changes.items) {
          const set: Record<string, unknown> = { sortOrder: item.sortOrder, ...(item.isCover !== undefined ? { isCover: item.isCover } : {}), updatedAt: input.metadata.changedAt };
          if (item.isCover) await models.PropertyMedia.updateMany({ propertyId: input.propertyId, providerId: input.providerId, active: true }, { $set: { isCover: false } }, { session });
          const row = await models.PropertyMedia.findOneAndUpdate({ _id: item.mediaId, propertyId: input.propertyId, providerId: input.providerId, active: true, processingState: 'ready' }, { $set: set, $inc: { version: 1 } }, { new: true, runValidators: true, lean: true, session });
          if (row) results.push({ kind: 'written', media: toStored(row as PropertyMediaRecord & { _id: Types.ObjectId }) });
        }
        return results;
      });
    },
    async markDeleted(input) {
      return tx(async session => {
        const row = await models.PropertyMedia.findOneAndUpdate({ _id: input.mediaId, propertyId: input.propertyId, providerId: input.providerId, active: true }, { $set: { active: false, isCover: false, processingState: 'deleted', updatedAt: input.metadata.changedAt }, $inc: { version: 1 } }, { new: true, runValidators: true, lean: true, session });
        if (!row) return { kind: 'not_found' as const };
        const media = toStored(row as PropertyMediaRecord & { _id: Types.ObjectId }); await auditWrite('property_media.delete', media.id, null, media, input.metadata, session); return { kind: 'written' as const, media };
      });
    }
  };
}
