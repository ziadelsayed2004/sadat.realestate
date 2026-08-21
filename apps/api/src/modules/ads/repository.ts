import { Types, type ClientSession, type Connection } from 'mongoose';
import {
  AD_EGYPT_TIME_ZONE,
  adCalendarEventSchema,
  adAdminRequestSchema,
  adQuoteDecisionSchema,
  adQuoteSchema,
  adQuoteIssueSchema,
  adRequestSchema,
  type AdRequest,
  type AdAdminRequest,
  type AdAdminRequestListQuery,
  type AdCalendarEvent,
  type AdCalendarQuery,
  type AdRequestCreate,
  type AdQuote,
  type AdQuoteDecision,
  type AdQuoteIssue
} from '@sadat-real-estate/contracts';
import {
  AdSettingsServiceError,
  type AdAdminRequestRepository,
  type AdCalendarRepository,
  type AdQuoteRepository,
  type AdRequestRepository
} from './service.js';
import {
  createProviderAdvertisingModels,
  type AdQuoteRecord,
  type AdRequestRecord,
  type ProviderAdvertisingModels
} from '../provider/advertising-models.js';

function ownerId(value: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(value)) throw new AdSettingsServiceError('FORBIDDEN');
  return new Types.ObjectId(value);
}

function toAdRequest(row: {
  _id: Types.ObjectId;
  providerId: Types.ObjectId;
  placementKey: string;
  purpose: string;
  intervalStart: Date;
  intervalEnd: Date;
  status: AdRequest['status'];
  version: number;
  createdAt: Date;
  updatedAt: Date;
}): AdRequest {
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

type AdRequestRow = AdRequestRecord & { _id: Types.ObjectId };

function toAdQuote(row: AdQuoteRecord & { _id: Types.ObjectId }): AdQuote {
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

type AdQuoteRow = AdQuoteRecord & { _id: Types.ObjectId };

function egyptLocal(value: Date): string {
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
  const result = Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
  return `${result.year}-${result.month}-${result.day}T${result.hour}:${result.minute}:${result.second}`;
}

function calendarEvent(row: AdRequestRow): AdCalendarEvent {
  return adCalendarEventSchema.parse({
    requestId: row._id.toHexString(),
    placementKey: row.placementKey,
    providerId: row.providerId.toHexString(),
    status: row.status,
    startsAt: row.intervalStart.toISOString(),
    endsAt: row.intervalEnd.toISOString(),
    timezone: AD_EGYPT_TIME_ZONE,
    localStart: egyptLocal(row.intervalStart),
    localEnd: egyptLocal(row.intervalEnd),
    version: row.version
  });
}

function calendarFilter(query: AdCalendarQuery): Record<string, unknown> {
  const filter: Record<string, unknown> = {
    status: query.status ?? { $in: ['scheduled', 'active', 'ended'] }
  };
  if (query.placementKey) filter.placementKey = query.placementKey;
  if (query.from || query.to) {
    filter.intervalEnd = { ...(query.from ? { $gt: new Date(query.from) } : {}) };
    filter.intervalStart = { ...(query.to ? { $lt: new Date(query.to) } : {}) };
  }
  return filter;
}

function toAdminRequest(row: AdRequestRow, quote?: AdQuoteRow): AdAdminRequest {
  return adAdminRequestSchema.parse({
    request: toAdRequest(row),
    ...(quote ? { quote: toAdQuote(quote) } : {})
  });
}

async function hydrateAdminRequests(
  models: ProviderAdvertisingModels,
  rows: readonly AdRequestRow[]
): Promise<AdAdminRequest[]> {
  if (rows.length === 0) return [];
  const quotes = await models.AdQuote.find({ requestId: { $in: rows.map(row => row._id) } })
    .sort({ updatedAt: -1, _id: -1 })
    .lean();
  const latestQuoteByRequest = new Map<string, AdQuoteRow>();
  for (const quote of quotes as AdQuoteRow[]) {
    const key = quote.requestId.toHexString();
    if (!latestQuoteByRequest.has(key)) latestQuoteByRequest.set(key, quote);
  }
  return rows.map(row => toAdminRequest(row, latestQuoteByRequest.get(row._id.toHexString())));
}

function requestObjectId(value: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(value)) throw new AdSettingsServiceError('NOT_FOUND');
  return new Types.ObjectId(value);
}

function providerObjectId(value: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(value)) throw new AdSettingsServiceError('FORBIDDEN');
  return new Types.ObjectId(value);
}

function quoteTotal(input: AdQuoteIssue): number {
  return input.lineItems.reduce((total, item) => {
    const line = item.quantity * item.unitAmountMinor;
    if (!Number.isSafeInteger(line) || !Number.isSafeInteger(total + line)) {
      throw new AdSettingsServiceError('VERSION_CONFLICT');
    }
    return total + line;
  }, 0);
}

async function transaction<T>(connection: Connection, run: (session: ClientSession) => Promise<T>): Promise<T> {
  const session = await connection.startSession();
  try {
    return await session.withTransaction(() => run(session));
  } finally {
    await session.endSession();
  }
}

export function createMongooseAdRequestRepository(
  connection: Connection,
  models: ProviderAdvertisingModels = createProviderAdvertisingModels(connection)
): AdRequestRepository {
  return {
    async createProviderRequest(providerId: string, input: AdRequestCreate, now: Date): Promise<AdRequest> {
      const providerObjectId = ownerId(providerId);
      const document = new models.AdRequest({
        providerId: providerObjectId,
        placementKey: input.placementKey,
        purpose: input.purpose,
        intervalStart: new Date(input.intervalStart),
        intervalEnd: new Date(input.intervalEnd),
        status: 'draft',
        version: 0,
        history: [{ status: 'draft', version: 0, changedAt: now }],
        createdAt: now,
        updatedAt: now
      });
      await document.save();
      const row = document.toObject() as AdRequestRecord & { _id: Types.ObjectId };
      return toAdRequest(row);
    }
  };
}

export function createMongooseAdAdminRequestRepository(
  connection: Connection,
  models: ProviderAdvertisingModels = createProviderAdvertisingModels(connection)
): AdAdminRequestRepository {
  return {
    async listAdminRequests(query: AdAdminRequestListQuery): Promise<{ items: AdAdminRequest[]; total: number }> {
      const filter: Record<string, unknown> = {};
      if (query.status) filter.status = query.status;
      if (query.providerId) filter.providerId = providerObjectId(query.providerId);
      const [rows, total] = await Promise.all([
        models.AdRequest.find(filter)
          .sort({ createdAt: -1, _id: -1 })
          .skip((query.page - 1) * query.limit)
          .limit(query.limit)
          .lean(),
        models.AdRequest.countDocuments(filter)
      ]);
      return { items: await hydrateAdminRequests(models, rows as AdRequestRow[]), total };
    },
    async getAdminRequest(requestId: string): Promise<AdAdminRequest | undefined> {
      const row = await models.AdRequest.findOne({ _id: requestObjectId(requestId) }).lean();
      if (!row) return undefined;
      const values = await hydrateAdminRequests(models, [row as AdRequestRow]);
      return values[0];
    }
  };
}

export function createMongooseAdCalendarRepository(
  connection: Connection,
  models: ProviderAdvertisingModels = createProviderAdvertisingModels(connection)
): AdCalendarRepository {
  return {
    async listCalendar(query) {
      const filter = calendarFilter(query);
      const [rows, total] = await Promise.all([
        models.AdRequest.find(filter)
          .sort({ intervalStart: 1, placementKey: 1, _id: 1 })
          .skip((query.page - 1) * query.limit)
          .limit(query.limit)
          .lean(),
        models.AdRequest.countDocuments(filter)
      ]);
      return { items: (rows as AdRequestRow[]).map(calendarEvent), total };
    },

    async schedule(requestId, expectedVersion) {
      const requestObject = requestObjectId(requestId);
      return transaction(connection, async (session) => {
        const request = await models.AdRequest.findOne({ _id: requestObject })
          .session(session)
          .lean<AdRequestRow>()
          .exec();
        if (!request) throw new AdSettingsServiceError('NOT_FOUND');
        if (request.status !== 'waiting_payment' || request.version !== expectedVersion) {
          throw new AdSettingsServiceError('VERSION_CONFLICT');
        }

        const now = new Date();
        if (now.getTime() >= request.intervalEnd.getTime()) {
          throw new AdSettingsServiceError('VERSION_CONFLICT');
        }
        const conflict = await models.AdRequest.findOne({
          _id: { $ne: request._id },
          placementKey: request.placementKey,
          status: { $in: ['scheduled', 'active'] },
          intervalStart: { $lt: request.intervalEnd },
          intervalEnd: { $gt: request.intervalStart }
        })
          .session(session)
          .lean<AdRequestRow>()
          .exec();
        if (conflict) throw new AdSettingsServiceError('PLACEMENT_CONFLICT');

        const updated = await models.AdRequest.findOneAndUpdate(
          { _id: request._id, status: 'waiting_payment', version: expectedVersion },
          {
            $set: { status: 'scheduled', updatedAt: now },
            $inc: { version: 1 },
            $push: { history: { status: 'scheduled', version: expectedVersion + 1, changedAt: now } }
          },
          { new: true, runValidators: true, lean: true, session }
        ).exec() as AdRequestRow | null;
        if (!updated) throw new AdSettingsServiceError('VERSION_CONFLICT');

        await models.AdSchedule.findOneAndUpdate(
          { requestId: request._id, providerId: request.providerId },
          {
            $set: {
              requestId: request._id,
              placementKey: request.placementKey,
              providerId: request.providerId,
              status: 'scheduled',
              startsAt: request.intervalStart,
              endsAt: request.intervalEnd,
              timezone: AD_EGYPT_TIME_ZONE,
              localStart: egyptLocal(request.intervalStart),
              localEnd: egyptLocal(request.intervalEnd),
              version: updated.version
            }
          },
          { new: true, upsert: true, runValidators: true, session }
        ).exec();
        return calendarEvent(updated);
      });
    }
  };
}

export function createMongooseAdQuoteRepository(
  connection: Connection,
  models: ProviderAdvertisingModels = createProviderAdvertisingModels(connection)
): AdQuoteRepository {
  return {
    async issueAdminQuote(adminId: string, rawInput: AdQuoteIssue, now: Date): Promise<AdQuote> {
      const input = adQuoteIssueSchema.parse(rawInput);
      const requestId = requestObjectId(input.requestId);
      const issuerId = providerObjectId(adminId);
      const totalMinor = quoteTotal(input);
      if (new Date(input.validUntil) <= now) throw new AdSettingsServiceError('VERSION_CONFLICT');

      return transaction(connection, async (session) => {
        const request = await models.AdRequest.findOne({ _id: requestId })
          .session(session)
          .lean() as AdRequestRow | null;
        if (!request) throw new AdSettingsServiceError('NOT_FOUND');
        if (request.status !== 'waiting_pricing') throw new AdSettingsServiceError('VERSION_CONFLICT');

        const stamp = new Date(now);
        const quote = new models.AdQuote({
          requestId,
          providerId: request.providerId,
          currency: input.currency,
          lineItems: input.lineItems,
          totalMinor,
          validUntil: new Date(input.validUntil),
          terms: input.terms,
          ...(input.notes ? { notes: input.notes } : {}),
          status: 'issued',
          issuerId,
          version: 0,
          decisionHistory: [{
            action: 'issued',
            actorId: issuerId,
            actorRole: 'admin',
            version: 0,
            createdAt: stamp
          }],
          createdAt: stamp,
          updatedAt: stamp
        });
        await quote.save({ session });

        const updatedRequest = await models.AdRequest.findOneAndUpdate(
          { _id: requestId, status: 'waiting_pricing', version: request.version },
          {
            $set: { status: 'quote_sent', updatedAt: stamp },
            $inc: { version: 1 },
            $push: { history: { status: 'quote_sent', version: request.version + 1, changedAt: stamp } }
          },
          { new: true, runValidators: true, lean: true, session }
        );
        if (!updatedRequest) throw new AdSettingsServiceError('VERSION_CONFLICT');
        return toAdQuote(quote.toObject() as AdQuoteRecord & { _id: Types.ObjectId });
      });
    },

    async acceptProviderQuote(providerId: string, requestIdValue: string, rawInput: AdQuoteDecision, now: Date): Promise<AdQuote> {
      const input = adQuoteDecisionSchema.parse(rawInput);
      if (input.action !== 'accept') throw new AdSettingsServiceError('VERSION_CONFLICT');
      const provider = providerObjectId(providerId);
      const requestId = requestObjectId(requestIdValue);

      return transaction(connection, async (session) => {
        const quote = await models.AdQuote.findOne({ requestId, providerId: provider })
          .sort({ updatedAt: -1, _id: -1 })
          .session(session)
          .lean() as (AdQuoteRecord & { _id: Types.ObjectId }) | null;
        if (!quote) throw new AdSettingsServiceError('NOT_FOUND');
        if (quote.status === 'accepted') return toAdQuote(quote);
        if (quote.status !== 'issued' || quote.validUntil <= now) throw new AdSettingsServiceError('VERSION_CONFLICT');
        if (input.expectedVersion !== quote.version) throw new AdSettingsServiceError('VERSION_CONFLICT');

        const request = await models.AdRequest.findOne({ _id: requestId, providerId: provider })
          .session(session)
          .lean() as AdRequestRow | null;
        if (!request) throw new AdSettingsServiceError('NOT_FOUND');
        if (request.status !== 'quote_sent') throw new AdSettingsServiceError('VERSION_CONFLICT');

        const stamp = new Date(now);
        const updatedQuote = await models.AdQuote.findOneAndUpdate(
          { _id: quote._id, requestId, providerId: provider, status: 'issued', version: input.expectedVersion },
          {
            $set: { status: 'accepted', updatedAt: stamp },
            $inc: { version: 1 },
            $push: {
              decisionHistory: {
                action: 'accepted',
                actorId: provider,
                actorRole: 'provider',
                version: quote.version + 1,
                createdAt: stamp
              }
            }
          },
          { new: true, runValidators: true, lean: true, session }
        ) as (AdQuoteRecord & { _id: Types.ObjectId }) | null;
        if (!updatedQuote) throw new AdSettingsServiceError('VERSION_CONFLICT');

        const updatedRequest = await models.AdRequest.findOneAndUpdate(
          { _id: requestId, providerId: provider, status: 'quote_sent', version: request.version },
          {
            $set: { status: 'waiting_payment', updatedAt: stamp },
            $inc: { version: 1 },
            $push: { history: { status: 'waiting_payment', version: request.version + 1, changedAt: stamp } }
          },
          { new: true, runValidators: true, lean: true, session }
        );
        if (!updatedRequest) throw new AdSettingsServiceError('VERSION_CONFLICT');
        return toAdQuote(updatedQuote);
      });
    }
  };
}
