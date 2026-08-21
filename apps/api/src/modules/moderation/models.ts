import { Schema, type Connection, type Model, type Types } from 'mongoose';
import type { AccountReportStatus, AuthRoleType, PropertyReportReason, PropertyReportStatus, RequestIssue } from '@sadat-real-estate/contracts';

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
export interface AccountReportRecord {
  accountId: Types.ObjectId;
  accountRoleType?: AuthRoleType;
  reporterId?: Types.ObjectId;
  reason: string;
  details?: string;
  status: AccountReportStatus;
  resolutionReason?: string;
  resolvedBy?: Types.ObjectId;
  resolvedAt?: Date;
  relatedReports: number;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}
export interface RequestIssueRecord {
  requestId: Types.ObjectId;
  category: RequestIssue['category'];
  details: string;
  status: RequestIssue['status'];
  resolutionReason?: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}
export interface ModerationModels { PropertyReport: Model<PropertyReportRecord>; AccountReport: Model<AccountReportRecord>; RequestIssue: Model<RequestIssueRecord>; }

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

const accountReportSchema = new Schema<AccountReportRecord>({
  accountId: { type: Schema.Types.ObjectId, required: true, immutable: true, ref: 'User' },
  accountRoleType: { type: String, enum: ['seeker', 'provider', 'admin'], immutable: true },
  reporterId: { type: Schema.Types.ObjectId, immutable: true, ref: 'User' },
  reason: {
    type: String,
    required: true,
    trim: true,
    minlength: 5,
    maxlength: 500,
    immutable: true,
    validate: { validator: (value: string) => !/[\u0000-\u001f\u007f]/.test(value) }
  },
  details: { type: String, trim: true, maxlength: 2_000, immutable: true },
  status: { type: String, required: true, enum: ['open', 'in_review', 'resolved', 'dismissed'], default: 'open' },
  resolutionReason: {
    type: String,
    trim: true,
    minlength: 5,
    maxlength: 500,
    validate: { validator: (value: string) => !/[\u0000-\u001f\u007f]/.test(value) }
  },
  resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  resolvedAt: { type: Date },
  relatedReports: { type: Number, required: true, min: 0, default: 1 }
}, { collection: 'account_reports', strict: 'throw', timestamps: true, versionKey: 'version', optimisticConcurrency: true });
accountReportSchema.index({ status: 1, createdAt: -1, _id: -1 }, { name: 'account_reports_status_created' });
accountReportSchema.index({ accountId: 1, status: 1, createdAt: -1 }, { name: 'account_reports_account_status' });

const requestIssueSchema = new Schema<RequestIssueRecord>({
  requestId: { type: Schema.Types.ObjectId, required: true, immutable: true, ref: 'Request' },
  category: { type: String, required: true, enum: ['duplicate', 'abuse', 'incorrect_data', 'service', 'other'], immutable: true },
  details: { type: String, required: true, trim: true, maxlength: 1_000, immutable: true },
  status: { type: String, required: true, enum: ['open', 'resolved', 'dismissed'], default: 'open' },
  resolutionReason: { type: String, trim: true, maxlength: 500 }
}, { collection: 'request_issues', strict: 'throw', timestamps: true, versionKey: 'version', optimisticConcurrency: true });
requestIssueSchema.index({ status: 1, createdAt: -1, _id: -1 }, { name: 'request_issues_status_created' });
requestIssueSchema.index({ requestId: 1, status: 1, createdAt: -1 }, { name: 'request_issues_request_status' });

export function createModerationModels(connection: Connection): ModerationModels {
  return {
    PropertyReport: (connection.models.PropertyReport as Model<PropertyReportRecord> | undefined) ?? connection.model<PropertyReportRecord>('PropertyReport', propertyReportSchema),
    AccountReport: (connection.models.AccountReport as Model<AccountReportRecord> | undefined) ?? connection.model<AccountReportRecord>('AccountReport', accountReportSchema),
    RequestIssue: (connection.models.RequestIssue as Model<RequestIssueRecord> | undefined) ?? connection.model<RequestIssueRecord>('RequestIssue', requestIssueSchema)
  };
}
