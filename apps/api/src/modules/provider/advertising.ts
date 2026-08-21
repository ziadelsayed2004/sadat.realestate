import type { AccessTokenClaims } from '../auth/crypto.js';
import type {
  AdCalendarEvent,
  AdQuote,
  AdRequest,
  PaymentProofData,
  ProviderAdRequestHistoryEntry,
  ProviderAdRequestListData,
  ProviderAdRequestListQuery,
  ProviderAdRequestProjection
} from '@sadat-real-estate/contracts';
import {
  providerAdRequestListQuerySchema,
  providerAdRequestProjectionSchema
} from '@sadat-real-estate/contracts';

export type ProviderAdvertisingHistoryRecord = ProviderAdRequestHistoryEntry;

export interface ProviderAdvertisingRequestRecord {
  request: AdRequest;
  history?: readonly ProviderAdvertisingHistoryRecord[];
  quote?: AdQuote;
  paymentProofs?: readonly PaymentProofData[];
  schedule?: AdCalendarEvent;
}

export interface ProviderAdvertisingRequestSource {
  listForProvider(providerId: string): Promise<readonly ProviderAdvertisingRequestRecord[]>;
  findForProvider?(providerId: string, requestId: string): Promise<ProviderAdvertisingRequestRecord | undefined>;
}

export interface ProviderAdvertisingProjectionDependencies {
  source: ProviderAdvertisingRequestSource;
}

export type ProviderAdvertisingProjectionErrorCode = 'PROVIDER_AD_FORBIDDEN' | 'PROVIDER_AD_NOT_FOUND' | 'PROVIDER_AD_SOURCE_INVALID';

export interface ProviderAdvertisingProjectionService {
  list(claims: AccessTokenClaims, input: unknown): Promise<ProviderAdRequestListData>;
  get(claims: AccessTokenClaims, requestId: string): Promise<ProviderAdRequestProjection>;
}

export class ProviderAdvertisingProjectionError extends Error {
  constructor(readonly code: ProviderAdvertisingProjectionErrorCode) {
    super(code);
    this.name = 'ProviderAdvertisingProjectionError';
  }
}

function providerClaims(claims: AccessTokenClaims): void {
  if (claims.role !== 'provider' || claims.status !== 'verified') throw new ProviderAdvertisingProjectionError('PROVIDER_AD_FORBIDDEN');
}

function ownerRecord(record: ProviderAdvertisingRequestRecord, providerId: string): ProviderAdvertisingRequestRecord {
  if (record.request.providerId !== providerId) throw new ProviderAdvertisingProjectionError('PROVIDER_AD_NOT_FOUND');
  return record;
}

function quoteProjection(quote: AdQuote | undefined, request: AdRequest): ProviderAdRequestProjection['quote'] {
  if (!quote) return undefined;
  if (quote.requestId !== request.id || quote.providerId !== request.providerId) throw new ProviderAdvertisingProjectionError('PROVIDER_AD_SOURCE_INVALID');
  return {
    id: quote.id,
    requestId: quote.requestId,
    currency: quote.currency,
    lineItems: quote.lineItems,
    totalMinor: quote.totalMinor,
    validUntil: quote.validUntil,
    terms: quote.terms,
    ...(quote.notes ? { notes: quote.notes } : {}),
    status: quote.status,
    version: quote.version,
    decisionHistory: quote.decisionHistory.map(entry => ({
      action: entry.action,
      ...(entry.reason ? { reason: entry.reason } : {}),
      version: entry.version,
      createdAt: entry.createdAt
    }))
  };
}

function paymentProjection(proof: PaymentProofData, request: AdRequest): ProviderAdRequestProjection['paymentProofs'][number] {
  if (proof.adRequestId !== request.id || proof.providerId !== request.providerId) throw new ProviderAdvertisingProjectionError('PROVIDER_AD_SOURCE_INVALID');
  return {
    id: proof.id,
    adRequestId: proof.adRequestId,
    status: proof.status,
    securityState: proof.securityState,
    version: proof.version,
    reviewHistory: proof.reviewHistory.map(entry => ({ action: entry.action, reason: entry.reason, version: entry.version, createdAt: entry.createdAt })),
    uploadedAt: proof.uploadedAt,
    active: proof.active
  };
}

function projection(record: ProviderAdvertisingRequestRecord): ProviderAdRequestProjection {
  const request = record.request;
  const history = record.history?.length ? [...record.history] : [{ status: request.status, version: request.version, changedAt: request.updatedAt }];
  const schedule = record.schedule;
  if (schedule && (schedule.requestId !== request.id || schedule.providerId !== request.providerId)) throw new ProviderAdvertisingProjectionError('PROVIDER_AD_SOURCE_INVALID');
  const result = {
    id: request.id,
    placementKey: request.placementKey,
    purpose: request.purpose,
    intervalStart: request.intervalStart,
    intervalEnd: request.intervalEnd,
    status: request.status,
    version: request.version,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
    history,
    ...(record.quote ? { quote: quoteProjection(record.quote, request) } : {}),
    paymentProofs: (record.paymentProofs ?? []).map(proof => paymentProjection(proof, request)),
    ...(schedule ? { schedule: { status: schedule.status, startsAt: schedule.startsAt, endsAt: schedule.endsAt, timezone: schedule.timezone, localStart: schedule.localStart, localEnd: schedule.localEnd, version: schedule.version } } : {})
  };
  return providerAdRequestProjectionSchema.parse(result);
}

export function createProviderAdvertisingProjectionService(dependencies: ProviderAdvertisingProjectionDependencies): ProviderAdvertisingProjectionService & {
  listRequests: ProviderAdvertisingProjectionService['list'];
  getRequest: ProviderAdvertisingProjectionService['get'];
  listAdvertisingRequests: ProviderAdvertisingProjectionService['list'];
  getAdvertisingRequest: ProviderAdvertisingProjectionService['get'];
  validateProjection: (value: unknown) => ProviderAdRequestProjection;
} {
  const list = async (claims: AccessTokenClaims, input: unknown): Promise<ProviderAdRequestListData> => {
    providerClaims(claims);
    const query = providerAdRequestListQuerySchema.parse(input) as ProviderAdRequestListQuery;
    const records = (await dependencies.source.listForProvider(claims.sub)).map(record => ownerRecord(record, claims.sub));
    const values = records.map(projection).filter(item => !query.status || item.status === query.status).sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
    return { items: values.slice((query.page - 1) * query.limit, query.page * query.limit), page: query.page, limit: query.limit, total: values.length };
  };
  const get = async (claims: AccessTokenClaims, requestId: string): Promise<ProviderAdRequestProjection> => {
    providerClaims(claims);
    if (!/^[a-f0-9]{24}$/.test(requestId)) throw new ProviderAdvertisingProjectionError('PROVIDER_AD_NOT_FOUND');
    const record = dependencies.source.findForProvider
      ? await dependencies.source.findForProvider(claims.sub, requestId)
      : (await dependencies.source.listForProvider(claims.sub)).find(item => item.request.id === requestId);
    if (!record) throw new ProviderAdvertisingProjectionError('PROVIDER_AD_NOT_FOUND');
    return projection(ownerRecord(record, claims.sub));
  };
  return {
    list,
    get,
    listRequests: list,
    getRequest: get,
    listAdvertisingRequests: list,
    getAdvertisingRequest: get,
    validateProjection: (value: unknown) => providerAdRequestProjectionSchema.parse(value)
  };
}
