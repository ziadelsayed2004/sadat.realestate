import { Schema, type Connection, type Model, type Types } from 'mongoose';
import type { PropertyReportReason, PropertyReportStatus } from '@sadat-real-estate/contracts';

export interface PropertyReportRecord {
  propertyId: Types.ObjectId;
  reporterId: Types.ObjectId;
  reason: PropertyReportReason;
  details?: string;
  status: PropertyReportStatus;
  resolutionReason?: string;
  resolvedBy?: Types.ObjectId;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}
export interface ModerationModels { PropertyReport: Model<PropertyReportRecord>; }

const propertyReportSchema = new Schema<PropertyReportRecord>({
  propertyId: { type: Schema.Types.ObjectId, required: true, immutable: true, ref: 'Property' },
  reporterId: { type: Schema.Types.ObjectId, required: true, immutable: true, ref: 'User' },
  reason: { type: String, required: true, enum: ['duplicate', 'fraud', 'inaccurate', 'inappropriate', 'other'], immutable: true },
  details: { type: String, trim: true, maxlength: 2_000, immutable: true },
  status: { type: String, required: true, enum: ['open', 'in_review', 'resolved', 'dismissed'], default: 'open' },
  resolutionReason: { type: String, trim: true, maxlength: 500 },
  resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  resolvedAt: { type: Date }
}, { collection: 'property_reports', strict: 'throw', timestamps: true, versionKey: 'version', optimisticConcurrency: true });
propertyReportSchema.index({ propertyId: 1, reporterId: 1, reason: 1 }, { unique: true, name: 'property_reports_reporter_reason_unique' });
propertyReportSchema.index({ status: 1, createdAt: -1, _id: -1 }, { name: 'property_reports_status_created' });
propertyReportSchema.index({ propertyId: 1, status: 1, createdAt: -1 }, { name: 'property_reports_property_status' });

export function createModerationModels(connection: Connection): ModerationModels {
  return { PropertyReport: (connection.models.PropertyReport as Model<PropertyReportRecord> | undefined) ?? connection.model<PropertyReportRecord>('PropertyReport', propertyReportSchema) };
}
