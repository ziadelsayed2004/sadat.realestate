import { Schema, type Connection, type HydratedDocument, type Model, type Types } from 'mongoose';
import {
  PROVIDER_DOCUMENT_CATEGORIES,
  PROVIDER_DOCUMENT_REVIEW_STATES,
  PROVIDER_DOCUMENT_SECURITY_STATES,
  type ProviderDocumentCategory,
  type ProviderDocumentMime,
  type ProviderDocumentReviewState,
  type ProviderDocumentSecurityState
} from '@sadat-real-estate/contracts';

export interface ProviderDocumentRecord {
  applicationId: Types.ObjectId;
  providerId: Types.ObjectId;
  category: ProviderDocumentCategory;
  requirementVersion: string;
  originalFilename: string;
  normalizedExtension: '.pdf' | '.jpg' | '.jpeg' | '.png';
  declaredMime: ProviderDocumentMime;
  detectedMime: ProviderDocumentMime;
  byteSize: number;
  sha256: string;
  storageKey: string;
  uploadActorId: Types.ObjectId;
  uploadedAt: Date;
  version: number;
  active: boolean;
  supersedesId?: Types.ObjectId;
  supersededAt?: Date;
  securityState: ProviderDocumentSecurityState;
  reviewState: ProviderDocumentReviewState;
  reviewReason?: string;
  scanCompletedAt?: Date;
  scanFailureCode?: string;
  deleteAfter?: Date;
  retentionReason?: 'infected' | 'abandoned_draft' | 'superseded' | 'application_closed' | 'account_closed';
  deletedAt?: Date;
  legalHold?: {
    actorId: Types.ObjectId;
    reason: string;
    startedAt: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

export type ProviderDocumentDocument = HydratedDocument<ProviderDocumentRecord>;

export interface UploadModels {
  ProviderDocument: Model<ProviderDocumentRecord>;
}

const legalHoldSchema = new Schema({
  actorId: { type: Schema.Types.ObjectId, required: true },
  reason: { type: String, required: true, trim: true, maxlength: 1_000 },
  startedAt: { type: Date, required: true }
}, { _id: false, strict: 'throw' });

const documentSchema = new Schema<ProviderDocumentRecord>({
  applicationId: { type: Schema.Types.ObjectId, required: true, immutable: true, ref: 'ProviderApplication' },
  providerId: { type: Schema.Types.ObjectId, required: true, immutable: true, ref: 'User' },
  category: { type: String, enum: PROVIDER_DOCUMENT_CATEGORIES, required: true, immutable: true },
  requirementVersion: { type: String, required: true, immutable: true },
  originalFilename: { type: String, required: true, maxlength: 120, immutable: true },
  normalizedExtension: { type: String, enum: ['.pdf', '.jpg', '.jpeg', '.png'], required: true, immutable: true },
  declaredMime: { type: String, enum: ['application/pdf', 'image/jpeg', 'image/png'], required: true, immutable: true },
  detectedMime: { type: String, enum: ['application/pdf', 'image/jpeg', 'image/png'], required: true, immutable: true },
  byteSize: { type: Number, required: true, min: 1, max: 10 * 1024 * 1024, immutable: true },
  sha256: { type: String, required: true, match: /^[a-f0-9]{64}$/, immutable: true },
  storageKey: { type: String, required: true, select: false, immutable: true },
  uploadActorId: { type: Schema.Types.ObjectId, required: true, immutable: true },
  uploadedAt: { type: Date, required: true, immutable: true },
  version: { type: Number, required: true, min: 1, immutable: true },
  active: { type: Boolean, required: true, default: true },
  supersedesId: { type: Schema.Types.ObjectId, immutable: true },
  supersededAt: Date,
  securityState: { type: String, enum: PROVIDER_DOCUMENT_SECURITY_STATES, required: true },
  reviewState: { type: String, enum: PROVIDER_DOCUMENT_REVIEW_STATES, required: true, default: 'uploaded' },
  reviewReason: { type: String, trim: true, maxlength: 1_000 },
  scanCompletedAt: Date,
  scanFailureCode: { type: String, maxlength: 80 },
  deleteAfter: Date,
  retentionReason: {
    type: String,
    enum: ['infected', 'abandoned_draft', 'superseded', 'application_closed', 'account_closed']
  },
  deletedAt: Date,
  legalHold: legalHoldSchema
}, {
  collection: 'provider_documents',
  strict: 'throw',
  timestamps: true,
  versionKey: false
});

documentSchema.pre('validate', function enforceReasonForAdverseReviewState() {
  if (
    (this.reviewState === 'needs_replacement' || this.reviewState === 'rejected')
    && !this.reviewReason?.trim()
  ) {
    this.invalidate('reviewReason', 'A reason is required for an adverse document review state');
  }
});

const securityTransitions: Readonly<Record<ProviderDocumentSecurityState, readonly ProviderDocumentSecurityState[]>> = {
  quarantined: ['scan_pending', 'deleted'],
  scan_pending: ['clean', 'infected', 'scan_failed', 'deleted'],
  clean: ['deleted'],
  infected: ['deleted'],
  scan_failed: ['scan_pending', 'deleted'],
  deleted: []
};

export function canTransitionProviderDocumentSecurity(
  from: ProviderDocumentSecurityState,
  to: ProviderDocumentSecurityState
): boolean {
  return securityTransitions[from].includes(to);
}

documentSchema.index(
  { applicationId: 1, category: 1 },
  { name: 'provider_documents_active_category_unique', unique: true, partialFilterExpression: { active: true } }
);
documentSchema.index(
  { providerId: 1, applicationId: 1, category: 1, sha256: 1 },
  { name: 'provider_documents_checksum_idempotency' }
);
documentSchema.index(
  { applicationId: 1, active: 1, uploadedAt: -1 },
  { name: 'provider_documents_application_active' }
);
documentSchema.index(
  { providerId: 1, category: 1, uploadedAt: -1 },
  { name: 'provider_documents_replacement_window' }
);
documentSchema.index(
  { securityState: 1, deleteAfter: 1 },
  { name: 'provider_documents_retention_cleanup' }
);

export function createUploadModels(connection: Connection): UploadModels {
  return {
    ProviderDocument: (connection.models.ProviderDocument as Model<ProviderDocumentRecord> | undefined)
      ?? connection.model<ProviderDocumentRecord>('ProviderDocument', documentSchema)
  };
}
