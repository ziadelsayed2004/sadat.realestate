import { createHash } from 'node:crypto';
import type { AccessTokenClaims } from '../auth/crypto.js';
import type { AdCalendarEvent, AdQuote, AdRequest, PaymentProofData, AdFinancialReviewListData, AdFinancialReviewQuery, AdFinancialReviewRow, AdLedgerEntry, AdLedgerListData, AdLedgerQuery } from '@sadat-real-estate/contracts';
import { adFinancialReviewListDataSchema, adFinancialReviewQuerySchema, adFinancialReviewRowSchema, adLedgerEntrySchema, adLedgerListDataSchema, adLedgerQuerySchema } from '@sadat-real-estate/contracts';

export interface AdvertisingFinancialRecord {
  request: AdRequest;
  quote?: AdQuote;
  paymentProofs?: readonly PaymentProofData[];
  schedule?: AdCalendarEvent;
}

export interface AdvertisingFinancialSource {
  list(): Promise<readonly AdvertisingFinancialRecord[]>;
}

export interface AdvertisingLedgerDependencies {
  source: AdvertisingFinancialSource;
}

export type AdvertisingLedgerServiceErrorCode = 'AD_REPORT_FORBIDDEN' | 'AD_REPORT_NOT_FOUND' | 'AD_REPORT_SOURCE_INVALID';

export class AdvertisingLedgerServiceError extends Error {
  constructor(readonly code: AdvertisingLedgerServiceErrorCode) {
    super(code);
    this.name = 'AdvertisingLedgerServiceError';
  }
}

function adminClaims(claims: AccessTokenClaims): void {
  if (claims.role !== 'admin' || claims.status !== 'verified') throw new AdvertisingLedgerServiceError('AD_REPORT_FORBIDDEN');
}

function eventId(seed: string): string {
  return createHash('sha256').update(seed).digest('hex').slice(0, 24);
}

function latestProof(record: AdvertisingFinancialRecord): PaymentProofData | undefined {
  return [...(record.paymentProofs ?? [])].filter(proof => proof.active).sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt) || b.id.localeCompare(a.id))[0];
}

function financialState(record: AdvertisingFinancialRecord): AdFinancialReviewRow['financialState'] {
  const proof = latestProof(record);
  if (proof?.status === 'pending_review') return 'payment_proof_pending_review';
  if (proof?.status === 'approved') return 'payment_proof_approved';
  if (proof?.status === 'rejected') return 'payment_proof_rejected';
  if (record.quote) return 'quote_only';
  return 'not_submitted';
}

function row(record: AdvertisingFinancialRecord): AdFinancialReviewRow {
  const request = record.request;
  if (record.quote && (record.quote.requestId !== request.id || record.quote.providerId !== request.providerId)) throw new AdvertisingLedgerServiceError('AD_REPORT_SOURCE_INVALID');
  const proof = latestProof(record);
  if (proof && (proof.adRequestId !== request.id || proof.providerId !== request.providerId)) throw new AdvertisingLedgerServiceError('AD_REPORT_SOURCE_INVALID');
  if (record.schedule && (record.schedule.requestId !== request.id || record.schedule.providerId !== request.providerId)) throw new AdvertisingLedgerServiceError('AD_REPORT_SOURCE_INVALID');
  return adFinancialReviewRowSchema.parse({
    requestId: request.id,
    providerId: request.providerId,
    placementKey: request.placementKey,
    requestStatus: request.status,
    intervalStart: request.intervalStart,
    intervalEnd: request.intervalEnd,
    ...(record.quote ? { quoteStatus: record.quote.status, quotedTotalMinor: record.quote.totalMinor, quoteCurrency: record.quote.currency } : {}),
    ...(proof ? { paymentProofStatus: proof.status, paymentProofSecurityState: proof.securityState } : {}),
    paymentProofCount: (record.paymentProofs ?? []).filter(item => item.active).length,
    financialState: financialState(record),
    ...(record.schedule ? { scheduleStatus: record.schedule.status } : {}),
    createdAt: request.createdAt,
    updatedAt: request.updatedAt
  });
}

function quoteEntries(record: AdvertisingFinancialRecord): AdLedgerEntry[] {
  const quote = record.quote;
  if (!quote) return [];
  if (quote.requestId !== record.request.id || quote.providerId !== record.request.providerId) throw new AdvertisingLedgerServiceError('AD_REPORT_SOURCE_INVALID');
  return quote.decisionHistory.map(entry => ({
    id: eventId(`quote:${quote.id}:${entry.version}:${entry.action}`),
    requestId: record.request.id,
    providerId: record.request.providerId,
    placementKey: record.request.placementKey,
    kind: entry.action === 'issued' ? 'quote_issued' : entry.action === 'accepted' ? 'quote_accepted' : entry.action === 'rejected' ? 'quote_rejected' : 'quote_cancelled',
    source: 'quote',
    occurredAt: entry.createdAt,
    amountMinor: quote.totalMinor,
    currency: quote.currency,
    accountingTreatment: 'not_realized'
  })).map(entry => adLedgerEntrySchema.parse(entry));
}

function paymentEntries(record: AdvertisingFinancialRecord): AdLedgerEntry[] {
  return (record.paymentProofs ?? []).flatMap(proof => {
    if (proof.adRequestId !== record.request.id || proof.providerId !== record.request.providerId) throw new AdvertisingLedgerServiceError('AD_REPORT_SOURCE_INVALID');
    const entries: AdLedgerEntry[] = [{ id: eventId(`payment:${proof.id}:uploaded`), requestId: record.request.id, providerId: record.request.providerId, placementKey: record.request.placementKey, kind: 'payment_proof_uploaded', source: 'payment_proof', occurredAt: proof.uploadedAt, accountingTreatment: 'not_realized' }];
    return entries.concat(proof.reviewHistory.map(review => adLedgerEntrySchema.parse({ id: eventId(`payment:${proof.id}:${review.version}:${review.action}`), requestId: record.request.id, providerId: record.request.providerId, placementKey: record.request.placementKey, kind: review.action === 'approve' ? 'payment_proof_approved' : 'payment_proof_rejected', source: 'payment_proof', occurredAt: review.createdAt, accountingTreatment: 'not_realized' })));
  }).map(entry => adLedgerEntrySchema.parse(entry));
}

function scheduleEntries(record: AdvertisingFinancialRecord): AdLedgerEntry[] {
  const schedule = record.schedule;
  if (!schedule) return [];
  if (schedule.requestId !== record.request.id || schedule.providerId !== record.request.providerId) throw new AdvertisingLedgerServiceError('AD_REPORT_SOURCE_INVALID');
  return (['scheduled', 'active', 'ended'] as const).map(status => adLedgerEntrySchema.parse({ id: eventId(`schedule:${schedule.requestId}:${schedule.version}:${status}`), requestId: record.request.id, providerId: record.request.providerId, placementKey: record.request.placementKey, kind: status, source: 'schedule', occurredAt: status === 'scheduled' ? schedule.startsAt : status === 'active' ? schedule.startsAt : schedule.endsAt, accountingTreatment: 'not_realized' }));
}

function inRange(value: string, from?: string, to?: string): boolean {
  const time = new Date(value).getTime();
  return (from === undefined || time >= new Date(from).getTime()) && (to === undefined || time < new Date(to).getTime());
}

export function createAdvertisingLedgerService(dependencies: AdvertisingLedgerDependencies) {
  const review = async (claims: AccessTokenClaims, input: unknown): Promise<AdFinancialReviewListData> => {
    adminClaims(claims);
    const query = adFinancialReviewQuerySchema.parse(input) as AdFinancialReviewQuery;
    const records = await dependencies.source.list();
    const rows = records.map(row).filter(item => (!query.placementKey || item.placementKey === query.placementKey) && (!query.providerId || item.providerId === query.providerId) && (!query.from || inRange(item.updatedAt, query.from, query.to)) && (!query.to || inRange(item.createdAt, query.from, query.to))).filter(item => {
      if (!query.status || query.status === 'all') return true;
      return query.status === item.financialState || query.status === item.scheduleStatus;
    }).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || b.requestId.localeCompare(a.requestId));
    return { items: rows.slice((query.page - 1) * query.limit, query.page * query.limit), page: query.page, limit: query.limit, total: rows.length };
  };
  const detail = async (claims: AccessTokenClaims, requestId: string): Promise<AdFinancialReviewRow> => {
    adminClaims(claims);
    if (!/^[a-f0-9]{24}$/.test(requestId)) throw new AdvertisingLedgerServiceError('AD_REPORT_NOT_FOUND');
    const record = (await dependencies.source.list()).find(item => item.request.id === requestId);
    if (!record) throw new AdvertisingLedgerServiceError('AD_REPORT_NOT_FOUND');
    return row(record);
  };
  const ledger = async (claims: AccessTokenClaims, input: unknown): Promise<AdLedgerListData> => {
    adminClaims(claims);
    const query = adLedgerQuerySchema.parse(input) as AdLedgerQuery;
    const records = await dependencies.source.list();
    const entries = records.flatMap(record => quoteEntries(record).concat(paymentEntries(record), scheduleEntries(record))).filter(item => (!query.kind || item.kind === query.kind) && (!query.source || item.source === query.source) && (!query.placementKey || item.placementKey === query.placementKey) && (!query.providerId || item.providerId === query.providerId) && inRange(item.occurredAt, query.from, query.to)).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt) || b.id.localeCompare(a.id));
    return { items: entries.slice((query.page - 1) * query.limit, query.page * query.limit), page: query.page, limit: query.limit, total: entries.length };
  };
  return {
    review,
    detail,
    listFinancialReview: review,
    getFinancialReview: detail,
    ledger,
    listLedger: ledger,
    listAdvertisingLedger: ledger,
    validateReview: (value: unknown) => adFinancialReviewListDataSchema.parse(value),
    validateLedger: (value: unknown) => adLedgerListDataSchema.parse(value)
  };
}
