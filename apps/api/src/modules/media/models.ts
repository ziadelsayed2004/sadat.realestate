import { Schema, type Connection, type Model, type Types } from 'mongoose';
import type { PropertyMediaData, PropertyMediaKind, PropertyMediaMime, PropertyMediaProcessingState } from '@sadat-real-estate/contracts';

export interface PropertyMediaRecord {
  propertyId: Types.ObjectId;
  providerId: Types.ObjectId;
  kind: PropertyMediaKind;
  originalFilename: string;
  declaredMime: PropertyMediaMime;
  detectedMime: PropertyMediaMime;
  byteSize: number;
  sha256: string;
  storageKey: string;
  sortOrder: number;
  isCover: boolean;
  processingState: PropertyMediaProcessingState;
  failureCode?: string;
  active: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PropertyMediaModels {
  PropertyMedia: Model<PropertyMediaRecord>;
}

export const propertyMediaSchema = new Schema<PropertyMediaRecord>({
  propertyId: { type: Schema.Types.ObjectId, required: true, immutable: true, ref: 'Property' },
  providerId: { type: Schema.Types.ObjectId, required: true, immutable: true, ref: 'User' },
  kind: { type: String, enum: ['image', 'floor_plan'], required: true, immutable: true },
  originalFilename: { type: String, required: true, trim: true, maxlength: 120, immutable: true },
  declaredMime: { type: String, enum: ['application/pdf', 'image/jpeg', 'image/png'], required: true, immutable: true },
  detectedMime: { type: String, enum: ['application/pdf', 'image/jpeg', 'image/png'], required: true, immutable: true },
  byteSize: { type: Number, required: true, min: 1, max: 10 * 1024 * 1024, immutable: true },
  sha256: { type: String, required: true, match: /^[a-f0-9]{64}$/, immutable: true },
  storageKey: { type: String, required: true, select: false, immutable: true },
  sortOrder: { type: Number, required: true, min: 0, max: 1_000, default: 0 },
  isCover: { type: Boolean, required: true, default: false },
  processingState: { type: String, enum: ['processing', 'ready', 'failed', 'deleted'], required: true },
  failureCode: { type: String, match: /^[A-Z][A-Z0-9_]{2,79}$/ },
  active: { type: Boolean, required: true, default: true },
}, { collection: 'property_media', strict: 'throw', timestamps: true, versionKey: 'version', optimisticConcurrency: true });

propertyMediaSchema.pre('validate', function validateCover() {
  if (this.isCover && (!this.active || this.processingState !== 'ready')) this.invalidate('isCover', 'Only active ready media can be a cover');
  if (this.processingState === 'failed' && !this.failureCode) this.invalidate('failureCode', 'Failed media requires a failure code');
  if (this.processingState !== 'failed' && this.failureCode) this.invalidate('failureCode', 'Only failed media can have a failure code');
});
propertyMediaSchema.index({ propertyId: 1, active: 1, sortOrder: 1, createdAt: 1 }, { name: 'property_media_order' });
propertyMediaSchema.index({ propertyId: 1, isCover: 1, active: 1 }, { name: 'property_media_cover' });
propertyMediaSchema.index({ providerId: 1, sha256: 1, active: 1 }, { name: 'property_media_checksum' });
propertyMediaSchema.index({ processingState: 1, updatedAt: 1 }, { name: 'property_media_processing' });

export function createPropertyMediaModels(connection: Connection): PropertyMediaModels {
  return { PropertyMedia: (connection.models.PropertyMedia as Model<PropertyMediaRecord> | undefined) ?? connection.model<PropertyMediaRecord>('PropertyMedia', propertyMediaSchema) };
}

export function propertyMediaData(record: PropertyMediaRecord & { _id: Types.ObjectId }): PropertyMediaData {
  return {
    id: record._id.toHexString(), propertyId: record.propertyId.toHexString(), kind: record.kind,
    originalFilename: record.originalFilename, detectedMime: record.detectedMime, byteSize: record.byteSize,
    sha256: record.sha256, sortOrder: record.sortOrder, isCover: record.isCover,
    processingState: record.processingState, ...(record.failureCode ? { failureCode: record.failureCode } : {}),
    active: record.active, version: record.version, createdAt: record.createdAt.toISOString(), updatedAt: record.updatedAt.toISOString()
  };
}
