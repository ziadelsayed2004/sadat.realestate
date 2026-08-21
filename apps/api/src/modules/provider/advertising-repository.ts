import { Types, type Connection } from 'mongoose';
import {
  AD_EGYPT_TIME_ZONE,
  adCalendarEventSchema,
  adQuoteSchema,
  adRequestSchema,
  paymentProofDataSchema,
  type AdCalendarEvent,
  type AdQuote,
  type AdRequest,
  type PaymentProofData
} from '@sadat-real-estate/contracts';
import {
  ProviderAdvertisingProjectionError,
  type ProviderAdvertisingRequestRecord,
  type ProviderAdvertisingRequestSource,
  type ProviderAdvertisingHistoryRecord
} from './advertising.js';
import {
  createProviderAdvertisingModels,
  type AdQuoteRecord,
  type AdRequestRecord,
  type AdScheduleRecord,
  type PaymentProofRecord,
  type ProviderAdvertisingModels
} from './advertising-models.js';

type ObjectIdRow = Types.ObjectId;

function objectId(value: string): ObjectIdRow {
  if (!Types.ObjectId.isValid(value)) throw new ProviderAdvertisingProjectionError('PROVIDER_AD_SOURCE_INVALID');
  return new Types.ObjectId(value);
}

function identifier(value: Types.ObjectId): string {
  return value.toHexString();
}

function iso(value: Date): string {
  return value.toISOString();
}

function requestFromRow(row: AdRequestRecord & { _id: Types.ObjectId }): AdRequest {
  return adRequestSchema.parse({
    id: identifier(row._id),
    providerId: identifier(row.providerId),
    placementKey: row.placementKey,
    purpose: row.purpose,
    intervalStart: iso(row.intervalStart),
    intervalEnd: iso(row.intervalEnd),
    status: row.status,
    version: row.version,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt)
  });
}

function requestHistory(row: AdRequestRecord & { _id: Types.ObjectId }): readonly ProviderAdvertisingHistoryRecord[] | undefined {
  return row.history?.map(entry => ({
    status: entry.status,
    version: entry.version,
    ...(entry.reason ? { reason: entry.reason } : {}),
    changedAt: iso(entry.changedAt)
  }));
}

function quoteFromRow(row: AdQuoteRecord & { _id: Types.ObjectId }): AdQuote {
  return adQuoteSchema.parse({
    id: identifier(row._id),
    requestId: identifier(row.requestId),
    providerId: identifier(row.providerId),
    currency: row.currency,
    lineItems: row.lineItems,
    totalMinor: row.totalMinor,
    validUntil: iso(row.validUntil),
    terms: row.terms,
    ...(row.notes ? { notes: row.notes } : {}),
    status: row.status,
    issuerId: identifier(row.issuerId),
    version: row.version,
    decisionHistory: row.decisionHistory.map(entry => ({
      action: entry.action,
      actorId: identifier(entry.actorId),
      actorRole: entry.actorRole,
      ...(entry.reason ? { reason: entry.reason } : {}),
      version: entry.version,
      createdAt: iso(entry.createdAt)
    })),
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt)
  });
}

function paymentProofFromRow(row: PaymentProofRecord & { _id: Types.ObjectId }): PaymentProofData {
  return paymentProofDataSchema.parse({
    id: identifier(row._id),
    adRequestId: identifier(row.adRequestId),
    providerId: identifier(row.providerId),
    originalFilename: row.originalFilename,
    normalizedExtension: row.normalizedExtension,
    detectedMime: row.detectedMime,
    byteSize: row.byteSize,
    sha256: row.sha256,
    version: row.version,
    securityState: row.securityState,
    status: row.status,
    reviewHistory: row.reviewHistory.map(entry => ({
      action: entry.action,
      actorId: identifier(entry.actorId),
      reason: entry.reason,
      version: entry.version,
      createdAt: iso(entry.createdAt)
    })),
    uploadedAt: iso(row.uploadedAt),
    active: row.active,
    idempotentReplay: row.idempotentReplay
  });
}

function scheduleFromRow(row: AdScheduleRecord & { _id: Types.ObjectId }): AdCalendarEvent {
  return adCalendarEventSchema.parse({
    requestId: identifier(row.requestId),
    placementKey: row.placementKey,
    providerId: identifier(row.providerId),
    status: row.status,
    startsAt: iso(row.startsAt),
    endsAt: iso(row.endsAt),
    timezone: AD_EGYPT_TIME_ZONE,
    localStart: row.localStart,
    localEnd: row.localEnd,
    version: row.version
  });
}

type RequestRow = AdRequestRecord & { _id: Types.ObjectId };
type QuoteRow = AdQuoteRecord & { _id: Types.ObjectId };
type PaymentRow = PaymentProofRecord & { _id: Types.ObjectId };
type ScheduleRow = AdScheduleRecord & { _id: Types.ObjectId };

export function createMongooseProviderAdvertisingSource(
  connection: Connection,
  models: ProviderAdvertisingModels = createProviderAdvertisingModels(connection)
): ProviderAdvertisingRequestSource {
  async function hydrate(rows: readonly RequestRow[]): Promise<readonly ProviderAdvertisingRequestRecord[]> {
    if (rows.length === 0) return [];
    const requestIds = rows.map(row => row._id);
    const [quoteRows, paymentRows, scheduleRows] = await Promise.all([
      models.AdQuote.find({ requestId: { $in: requestIds } })
        .sort({ updatedAt: -1, _id: -1 })
        .lean(),
      models.PaymentProof.find({ adRequestId: { $in: requestIds }, active: true })
        .sort({ uploadedAt: -1, _id: -1 })
        .lean(),
      models.AdSchedule.find({ requestId: { $in: requestIds } })
        .sort({ startsAt: 1, _id: -1 })
        .lean()
    ]);
    const quotesByRequest = new Map<string, QuoteRow>();
    for (const row of quoteRows as QuoteRow[]) {
      const key = identifier(row.requestId);
      if (!quotesByRequest.has(key)) quotesByRequest.set(key, row);
    }
    const paymentsByRequest = new Map<string, PaymentProofData[]>();
    for (const row of paymentRows as PaymentRow[]) {
      const key = identifier(row.adRequestId);
      const values = paymentsByRequest.get(key) ?? [];
      values.push(paymentProofFromRow(row));
      paymentsByRequest.set(key, values);
    }
    const schedulesByRequest = new Map<string, ScheduleRow>();
    for (const row of scheduleRows as ScheduleRow[]) {
      const key = identifier(row.requestId);
      if (!schedulesByRequest.has(key)) schedulesByRequest.set(key, row);
    }
    return rows.map(row => {
      const id = identifier(row._id);
      const request = requestFromRow(row);
      const history = requestHistory(row);
      const quote = quotesByRequest.get(id);
      const schedule = schedulesByRequest.get(id);
      return {
        request,
        ...(history ? { history } : {}),
        ...(quote ? { quote: quoteFromRow(quote) } : {}),
        paymentProofs: paymentsByRequest.get(id) ?? [],
        ...(schedule ? { schedule: scheduleFromRow(schedule) } : {})
      };
    });
  }

  return {
    async listForProvider(providerId: string): Promise<readonly ProviderAdvertisingRequestRecord[]> {
      const ownerId = objectId(providerId);
      const rows = await models.AdRequest.find({ providerId: ownerId })
        .sort({ createdAt: -1, _id: -1 })
        .lean();
      return hydrate(rows as RequestRow[]);
    },
    async findForProvider(providerId: string, requestId: string): Promise<ProviderAdvertisingRequestRecord | undefined> {
      const row = await models.AdRequest.findOne({ _id: objectId(requestId), providerId: objectId(providerId) })
        .lean();
      if (!row) return undefined;
      const values = await hydrate([row as RequestRow]);
      return values[0];
    }
  };
}
