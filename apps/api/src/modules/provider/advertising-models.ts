import {
  Schema,
  type Connection,
  type Model,
  type Types
} from 'mongoose';
import type {
  AdQuote,
  AdRequest,
  PaymentProofData
} from '@sadat-real-estate/contracts';

interface RequestHistoryRecord {
  status: AdRequest['status'];
  version: number;
  reason?: string;
  changedAt: Date;
}

interface QuoteDecisionRecord {
  action: AdQuote['status'] | 'issued';
  actorId: Types.ObjectId;
  actorRole: 'admin' | 'provider';
  reason?: string;
  version: number;
  createdAt: Date;
}

interface PaymentReviewRecord {
  action: 'approve' | 'reject';
  actorId: Types.ObjectId;
  reason: string;
  version: number;
  createdAt: Date;
}

export interface AdRequestRecord {
  providerId: Types.ObjectId;
  placementKey: AdRequest['placementKey'];
  purpose: AdRequest['purpose'];
  intervalStart: Date;
  intervalEnd: Date;
  status: AdRequest['status'];
  version: number;
  history?: Array<RequestHistoryRecord>;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdQuoteRecord {
  requestId: Types.ObjectId;
  providerId: Types.ObjectId;
  currency: AdQuote['currency'];
  lineItems: AdQuote['lineItems'];
  totalMinor: AdQuote['totalMinor'];
  validUntil: Date;
  terms: AdQuote['terms'];
  notes?: AdQuote['notes'];
  status: AdQuote['status'];
  issuerId: Types.ObjectId;
  version: number;
  decisionHistory: Array<QuoteDecisionRecord>;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentProofRecord {
  adRequestId: Types.ObjectId;
  providerId: Types.ObjectId;
  originalFilename: PaymentProofData['originalFilename'];
  normalizedExtension: PaymentProofData['normalizedExtension'];
  detectedMime: PaymentProofData['detectedMime'];
  byteSize: PaymentProofData['byteSize'];
  sha256: PaymentProofData['sha256'];
  version: number;
  securityState: PaymentProofData['securityState'];
  status: PaymentProofData['status'];
  reviewHistory: Array<PaymentReviewRecord>;
  uploadedAt: Date;
  active: boolean;
  idempotentReplay: boolean;
  storageKey?: string;
}

export interface AdScheduleRecord {
  requestId: Types.ObjectId;
  placementKey: AdRequest['placementKey'];
  providerId: Types.ObjectId;
  status: 'scheduled' | 'active' | 'ended';
  startsAt: Date;
  endsAt: Date;
  timezone: 'Africa/Cairo';
  localStart: string;
  localEnd: string;
  version: number;
}

export interface ProviderAdvertisingModels {
  AdRequest: Model<AdRequestRecord>;
  AdQuote: Model<AdQuoteRecord>;
  PaymentProof: Model<PaymentProofRecord>;
  AdSchedule: Model<AdScheduleRecord>;
}

const AD_REQUEST_STATUSES = [
  'draft', 'review', 'waiting_pricing', 'quote_sent', 'waiting_payment',
  'scheduled', 'active', 'ended', 'rejected', 'cancelled', 'expired'
] as const;
const QUOTE_STATUSES = ['issued', 'accepted', 'rejected', 'cancelled', 'expired'] as const;
const PAYMENT_STATUSES = ['uploaded', 'pending_review', 'approved', 'rejected'] as const;
const PAYMENT_SECURITY_STATES = ['quarantined', 'scan_pending', 'clean', 'infected', 'scan_failed', 'deleted'] as const;

const requestHistorySchema = new Schema<RequestHistoryRecord>({
  status: { type: String, enum: AD_REQUEST_STATUSES, required: true },
  version: { type: Number, required: true, min: 0 },
  reason: { type: String, trim: true, maxlength: 500 },
  changedAt: { type: Date, required: true }
}, { _id: false, strict: 'throw' });

const quoteLineItemSchema = new Schema({
  description: { type: String, trim: true, required: true, maxlength: 300 },
  quantity: { type: Number, required: true, min: 1 },
  unitAmountMinor: { type: Number, required: true, min: 0 }
}, { _id: false, strict: 'throw' });

const quoteDecisionSchema = new Schema<QuoteDecisionRecord>({
  action: { type: String, enum: QUOTE_STATUSES, required: true },
  actorId: { type: Schema.Types.ObjectId, required: true },
  actorRole: { type: String, enum: ['admin', 'provider'], required: true },
  reason: { type: String, trim: true, maxlength: 500 },
  version: { type: Number, required: true, min: 0 },
  createdAt: { type: Date, required: true }
}, { _id: false, strict: 'throw' });

const paymentReviewSchema = new Schema<PaymentReviewRecord>({
  action: { type: String, enum: ['approve', 'reject'], required: true },
  actorId: { type: Schema.Types.ObjectId, required: true },
  reason: { type: String, trim: true, required: true, maxlength: 500 },
  version: { type: Number, required: true, min: 1 },
  createdAt: { type: Date, required: true }
}, { _id: false, strict: 'throw' });

const adRequestSchema = new Schema<AdRequestRecord>({
  providerId: { type: Schema.Types.ObjectId, required: true, immutable: true, ref: 'User' },
  placementKey: { type: String, trim: true, required: true, maxlength: 80 },
  purpose: { type: String, trim: true, required: true, maxlength: 500 },
  intervalStart: { type: Date, required: true },
  intervalEnd: { type: Date, required: true },
  status: { type: String, enum: AD_REQUEST_STATUSES, required: true },
  version: { type: Number, required: true, min: 0, default: 0 },
  history: { type: [requestHistorySchema], default: undefined }
}, {
  collection: 'ad_requests',
  strict: 'throw',
  timestamps: true,
  versionKey: false
});
adRequestSchema.index(
  { providerId: 1, createdAt: -1, _id: -1 },
  { name: 'ad_requests_provider_created' }
);
adRequestSchema.index(
  { providerId: 1, status: 1, createdAt: -1, _id: -1 },
  { name: 'ad_requests_provider_status_created' }
);

const adQuoteSchema = new Schema<AdQuoteRecord>({
  requestId: { type: Schema.Types.ObjectId, required: true, immutable: true, ref: 'AdRequest' },
  providerId: { type: Schema.Types.ObjectId, required: true, immutable: true, ref: 'User' },
  currency: { type: String, required: true, uppercase: true, minlength: 3, maxlength: 3 },
  lineItems: { type: [quoteLineItemSchema], required: true },
  totalMinor: { type: Number, required: true, min: 0 },
  validUntil: { type: Date, required: true },
  terms: { type: String, trim: true, required: true, maxlength: 2_000 },
  notes: { type: String, trim: true, maxlength: 2_000 },
  status: { type: String, enum: QUOTE_STATUSES, required: true },
  issuerId: { type: Schema.Types.ObjectId, required: true, immutable: true, ref: 'User' },
  version: { type: Number, required: true, min: 0, default: 0 },
  decisionHistory: { type: [quoteDecisionSchema], required: true }
}, {
  collection: 'ad_quotes',
  strict: 'throw',
  timestamps: true,
  versionKey: false
});
adQuoteSchema.index(
  { requestId: 1, updatedAt: -1, _id: -1 },
  { name: 'ad_quotes_request_updated' }
);
adQuoteSchema.index(
  { providerId: 1, updatedAt: -1, _id: -1 },
  { name: 'ad_quotes_provider_updated' }
);

const paymentProofSchema = new Schema<PaymentProofRecord>({
  adRequestId: { type: Schema.Types.ObjectId, required: true, immutable: true, ref: 'AdRequest' },
  providerId: { type: Schema.Types.ObjectId, required: true, immutable: true, ref: 'User' },
  originalFilename: { type: String, required: true, maxlength: 120 },
  normalizedExtension: { type: String, enum: ['.pdf', '.jpg', '.jpeg', '.png'], required: true },
  detectedMime: { type: String, enum: ['application/pdf', 'image/jpeg', 'image/png'], required: true },
  byteSize: { type: Number, required: true, min: 1, max: 10 * 1024 * 1024 },
  sha256: { type: String, required: true, match: /^[a-f0-9]{64}$/ },
  version: { type: Number, required: true, min: 1 },
  securityState: { type: String, enum: PAYMENT_SECURITY_STATES, required: true },
  status: { type: String, enum: PAYMENT_STATUSES, required: true },
  reviewHistory: { type: [paymentReviewSchema], required: true },
  uploadedAt: { type: Date, required: true },
  active: { type: Boolean, required: true },
  idempotentReplay: { type: Boolean, required: true },
  storageKey: { type: String, select: false }
}, {
  collection: 'payment_proofs',
  strict: 'throw',
  timestamps: false,
  versionKey: false
});
paymentProofSchema.index(
  { adRequestId: 1, providerId: 1, active: 1, uploadedAt: -1, _id: -1 },
  { name: 'payment_proofs_request_provider_active' }
);

const adScheduleSchema = new Schema<AdScheduleRecord>({
  requestId: { type: Schema.Types.ObjectId, required: true, immutable: true, ref: 'AdRequest' },
  placementKey: { type: String, trim: true, required: true, maxlength: 80 },
  providerId: { type: Schema.Types.ObjectId, required: true, immutable: true, ref: 'User' },
  status: { type: String, enum: ['scheduled', 'active', 'ended'], required: true },
  startsAt: { type: Date, required: true },
  endsAt: { type: Date, required: true },
  timezone: { type: String, enum: ['Africa/Cairo'], required: true },
  localStart: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/ },
  localEnd: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/ },
  version: { type: Number, required: true, min: 0 }
}, {
  collection: 'ad_schedules',
  strict: 'throw',
  timestamps: false,
  versionKey: false
});
adScheduleSchema.index(
  { requestId: 1, providerId: 1, startsAt: 1, _id: -1 },
  { name: 'ad_schedules_request_provider_start' }
);

export function createProviderAdvertisingModels(connection: Connection): ProviderAdvertisingModels {
  return {
    AdRequest: (connection.models.AdRequest as Model<AdRequestRecord> | undefined)
      ?? connection.model<AdRequestRecord>('AdRequest', adRequestSchema),
    AdQuote: (connection.models.AdQuote as Model<AdQuoteRecord> | undefined)
      ?? connection.model<AdQuoteRecord>('AdQuote', adQuoteSchema),
    PaymentProof: (connection.models.PaymentProof as Model<PaymentProofRecord> | undefined)
      ?? connection.model<PaymentProofRecord>('PaymentProof', paymentProofSchema),
    AdSchedule: (connection.models.AdSchedule as Model<AdScheduleRecord> | undefined)
      ?? connection.model<AdScheduleRecord>('AdSchedule', adScheduleSchema)
  };
}
