import { Types, type Connection } from 'mongoose';
import {
  AD_EGYPT_TIME_ZONE,
  adCalendarEventSchema,
  adRequestSchema,
  adQuoteSchema,
  paymentProofDataSchema,
  type AdCalendarEvent,
  type AdQuote,
  type AdRequest,
  type PaymentProofData
} from '@sadat-real-estate/contracts';
import {
  createProviderAdvertisingModels,
  type AdQuoteRecord,
  type AdRequestRecord,
  type AdScheduleRecord,
  type PaymentProofRecord,
  type ProviderAdvertisingModels
} from '../provider/advertising-models.js';
import type { AdvertisingFinancialRecord, AdvertisingFinancialSource } from './advertising-ledger.js';

type RequestRow = AdRequestRecord & { _id: Types.ObjectId };
type QuoteRow = AdQuoteRecord & { _id: Types.ObjectId };
type PaymentProofRow = PaymentProofRecord & { _id: Types.ObjectId };
type ScheduleRow = AdScheduleRecord & { _id: Types.ObjectId };

function request(row: RequestRow): AdRequest {
  return adRequestSchema.parse({
    id: row._id.toHexString(),
    providerId: row.providerId.toHexString(),
    placementKey: row.placementKey,
    purpose: row.purpose,
    intervalStart: row.intervalStart.toISOString(),
    intervalEnd: row.intervalEnd.toISOString(),
    status: row.status,
    version: row.version,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  });
}

function quote(row: QuoteRow): AdQuote {
  return adQuoteSchema.parse({
    id: row._id.toHexString(),
    requestId: row.requestId.toHexString(),
    providerId: row.providerId.toHexString(),
    currency: row.currency,
    lineItems: row.lineItems,
    totalMinor: row.totalMinor,
    validUntil: row.validUntil.toISOString(),
    terms: row.terms,
    ...(row.notes ? { notes: row.notes } : {}),
    status: row.status,
    issuerId: row.issuerId.toHexString(),
    version: row.version,
    decisionHistory: row.decisionHistory.map((entry) => ({
      action: entry.action,
      actorId: entry.actorId.toHexString(),
      actorRole: entry.actorRole,
      ...(entry.reason ? { reason: entry.reason } : {}),
      version: entry.version,
      createdAt: entry.createdAt.toISOString()
    })),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  });
}

function paymentProof(row: PaymentProofRow): PaymentProofData {
  return paymentProofDataSchema.parse({
    id: row._id.toHexString(),
    adRequestId: row.adRequestId.toHexString(),
    providerId: row.providerId.toHexString(),
    originalFilename: row.originalFilename,
    normalizedExtension: row.normalizedExtension,
    detectedMime: row.detectedMime,
    byteSize: row.byteSize,
    sha256: row.sha256,
    version: row.version,
    securityState: row.securityState,
    status: row.status,
    reviewHistory: row.reviewHistory.map((entry) => ({
      action: entry.action,
      actorId: entry.actorId.toHexString(),
      reason: entry.reason,
      version: entry.version,
      createdAt: entry.createdAt.toISOString()
    })),
    uploadedAt: row.uploadedAt.toISOString(),
    active: row.active,
    idempotentReplay: row.idempotentReplay
  }) as PaymentProofData;
}

function cairoLocal(value: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: AD_EGYPT_TIME_ZONE,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).formatToParts(value);
  const values = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}:${values.second}`;
}

function schedule(row: ScheduleRow): AdCalendarEvent {
  return adCalendarEventSchema.parse({
    requestId: row.requestId.toHexString(),
    placementKey: row.placementKey,
    providerId: row.providerId.toHexString(),
    status: row.status,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    timezone: AD_EGYPT_TIME_ZONE,
    localStart: row.localStart || cairoLocal(row.startsAt),
    localEnd: row.localEnd || cairoLocal(row.endsAt),
    version: row.version
  });
}

export function createMongooseAdvertisingFinancialSource(
  connection: Connection,
  models: ProviderAdvertisingModels = createProviderAdvertisingModels(connection)
): AdvertisingFinancialSource {
  return {
    async list(): Promise<readonly AdvertisingFinancialRecord[]> {
      const [requestRows, quoteRows, proofRows, scheduleRows] = await Promise.all([
        models.AdRequest.find({}).sort({ updatedAt: -1, _id: -1 }).lean(),
        models.AdQuote.find({}).sort({ updatedAt: -1, _id: -1 }).lean(),
        models.PaymentProof.find({ active: true }).select('-storageKey').sort({ uploadedAt: -1, _id: -1 }).lean(),
        models.AdSchedule.find({}).sort({ version: -1, _id: -1 }).lean()
      ]);

      const latestQuoteByRequest = new Map<string, AdQuote>();
      for (const row of quoteRows as QuoteRow[]) {
        const key = row.requestId.toHexString();
        if (!latestQuoteByRequest.has(key)) latestQuoteByRequest.set(key, quote(row));
      }

      const proofsByRequest = new Map<string, PaymentProofData[]>();
      for (const row of proofRows as PaymentProofRow[]) {
        const key = row.adRequestId.toHexString();
        const proofs = proofsByRequest.get(key) ?? [];
        proofs.push(paymentProof(row));
        proofsByRequest.set(key, proofs);
      }

      const scheduleByRequest = new Map<string, AdCalendarEvent>();
      for (const row of scheduleRows as ScheduleRow[]) {
        const key = row.requestId.toHexString();
        if (!scheduleByRequest.has(key)) scheduleByRequest.set(key, schedule(row));
      }

      return (requestRows as RequestRow[]).map((row) => {
        const requestData = request(row);
        const requestId = requestData.id;
        const quoteData = latestQuoteByRequest.get(requestId);
        const proofData = proofsByRequest.get(requestId);
        const scheduleData = scheduleByRequest.get(requestId);
        return {
          request: requestData,
          ...(quoteData ? { quote: quoteData } : {}),
          ...(proofData ? { paymentProofs: proofData } : {}),
          ...(scheduleData ? { schedule: scheduleData } : {})
        };
      });
    }
  };
}
