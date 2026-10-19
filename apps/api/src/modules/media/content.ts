import { Types, type Connection } from 'mongoose';
import type { Readable } from 'node:stream';
import type { StorageAdapter } from '../uploads/adapters.js';
import { unexpiredPropertyFilter } from '../settings/property-policy.js';
import { propertyMediaSchema, type PropertyMediaModels, type PropertyMediaRecord } from './models.js';
import type { Model } from 'mongoose';

export function createPropertyMediaContentReader(connection: Connection, models: PropertyMediaModels, storage: StorageAdapter, audience: 'public' | 'admin' = 'public') {
  const Draft = audience === 'public' ? undefined : (connection.models.PropertyMediaDraft as Model<PropertyMediaRecord> | undefined) ?? connection.model<PropertyMediaRecord>('PropertyMediaDraft', propertyMediaSchema, 'property_media_drafts');
  return async (propertyId: string, mediaId: string): Promise<{ mime: string; size: number; etag?: string; open: (range?: { start: number; end: number }) => Promise<Readable> } | null> => {
    const property = await connection.collection('properties').findOne({ _id: new Types.ObjectId(propertyId), ...(audience === 'public' ? { active: true, status: 'published', ...unexpiredPropertyFilter() } : {}) }, { projection: { _id: 1, hasEditDraft: 1, status: 1 } });
    if (!property) return null;
    const source = Draft && property.hasEditDraft && property.status === 'published' ? Draft : models.PropertyMedia;
    const media = await source.findOne({ _id: mediaId, propertyId, active: true, processingState: 'ready' }).select('+storageKey').lean();
    if (!media) return null;
    return { mime: media.detectedMime, size: media.byteSize, ...(/^[a-f0-9]{64}$/u.test(media.sha256 ?? '') ? { etag: `"${media.sha256}"` } : {}), open: (range?: { start: number; end: number }) => storage.openPrivate(media.storageKey, range) };
  };
}

export type PropertyMediaContentReader = ReturnType<typeof createPropertyMediaContentReader>;

export function mediaByteRange(header: string | undefined, size: number): { start: number; end: number } | null | undefined {
  if (header === undefined) return undefined;
  const match = /^bytes=(\d*)-(\d*)$/u.exec(header);
  if (!match || (!match[1] && !match[2])) return null;
  const start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
  const end = match[1] && match[2] ? Math.min(size - 1, Number(match[2])) : size - 1;
  return Number.isSafeInteger(start) && Number.isSafeInteger(end) && start >= 0 && end >= start && start < size ? { start, end } : null;
}
