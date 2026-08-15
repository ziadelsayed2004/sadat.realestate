import { randomBytes } from 'node:crypto';
import { Types, type ClientSession, type Connection } from 'mongoose';
import {
  OUTBOX_DEFAULT_MAX_ATTEMPTS,
  outboxEnqueueSchema,
  outboxEventSchema,
  outboxFailureSchema,
  outboxLeaseSchema,
  type OutboxEvent,
  type OutboxEventCreate,
  type OutboxFailure,
  type OutboxLease
} from '@sadat-real-estate/contracts';

export interface OutboxEventRecord {
  id: string;
  domain: OutboxEvent['domain'];
  type: string;
  dedupeKey: string;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  status: OutboxEvent['status'];
  attempts: number;
  maxAttempts: number;
  availableAt: Date;
  createdAt: Date;
  updatedAt: Date;
  lockedBy?: string;
  lockedUntil?: Date;
  lastErrorCode?: string;
  lastErrorMessage?: string;
  deliveredAt?: Date;
  deadLetteredAt?: Date;
}

export type OutboxFailureResult = 'retry_scheduled' | 'dead_lettered' | 'lease_lost' | 'not_found';

export interface OutboxEnqueueOptions {
  session?: ClientSession;
}

export interface OutboxRepository {
  enqueue(input: OutboxEventCreate, now?: Date, options?: OutboxEnqueueOptions): Promise<OutboxEventRecord>;
  claimAvailable(lease: OutboxLease, now?: Date): Promise<OutboxEventRecord[]>;
  markDelivered(eventId: string, workerId: string, now?: Date): Promise<boolean>;
  retry(eventId: string, workerId: string, failure: OutboxFailure, now?: Date): Promise<OutboxFailureResult>;
  deadLetter(eventId: string, workerId: string, failure: OutboxFailure, now?: Date): Promise<OutboxFailureResult>;
  findById(eventId: string): Promise<OutboxEventRecord | undefined>;
  list(limit?: number): Promise<OutboxEventRecord[]>;
}

export class OutboxRepositoryError extends Error {
  constructor(readonly code: 'OUTBOX_DEDUPE_CONFLICT' | 'OUTBOX_CORRUPT') {
    super(code);
    this.name = 'OutboxRepositoryError';
  }
}

function clonePayload(payload: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(payload)) as Record<string, unknown>;
}

function cloneRecord(record: OutboxEventRecord): OutboxEventRecord {
  return {
    ...record,
    payload: clonePayload(record.payload),
    availableAt: new Date(record.availableAt),
    createdAt: new Date(record.createdAt),
    updatedAt: new Date(record.updatedAt),
    ...(record.lockedUntil ? { lockedUntil: new Date(record.lockedUntil) } : {}),
    ...(record.deliveredAt ? { deliveredAt: new Date(record.deliveredAt) } : {}),
    ...(record.deadLetteredAt ? { deadLetteredAt: new Date(record.deadLetteredAt) } : {})
  };
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sameEnqueue(existing: OutboxEventRecord, input: OutboxEventCreate): boolean {
  return existing.domain === input.domain
    && existing.type === input.type
    && existing.aggregateType === input.aggregateType
    && existing.aggregateId === input.aggregateId
    && existing.maxAttempts === (input.maxAttempts ?? OUTBOX_DEFAULT_MAX_ATTEMPTS)
    && stableJson(existing.payload) === stableJson(input.payload);
}

function createRecord(input: OutboxEventCreate, now: Date): OutboxEventRecord {
  const parsed = outboxEnqueueSchema.parse(input);
  const stamp = new Date(now);
  const availableAt = new Date(parsed.availableAt ?? stamp.toISOString());
  if (Number.isNaN(availableAt.getTime()) || Number.isNaN(stamp.getTime())) throw new OutboxRepositoryError('OUTBOX_CORRUPT');
  return {
    id: randomBytes(12).toString('hex'),
    domain: parsed.domain,
    type: parsed.type,
    dedupeKey: parsed.dedupeKey,
    aggregateType: parsed.aggregateType,
    aggregateId: parsed.aggregateId,
    payload: clonePayload(parsed.payload),
    status: 'pending',
    attempts: 0,
    maxAttempts: parsed.maxAttempts ?? OUTBOX_DEFAULT_MAX_ATTEMPTS,
    availableAt,
    createdAt: stamp,
    updatedAt: stamp
  };
}

function asContract(record: OutboxEventRecord): OutboxEvent {
  return outboxEventSchema.parse({
    id: record.id,
    domain: record.domain,
    type: record.type,
    dedupeKey: record.dedupeKey,
    aggregateType: record.aggregateType,
    aggregateId: record.aggregateId,
    payload: record.payload,
    status: record.status,
    attempts: record.attempts,
    maxAttempts: record.maxAttempts,
    availableAt: record.availableAt.toISOString(),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    ...(record.lockedBy ? { lockedBy: record.lockedBy } : {}),
    ...(record.lockedUntil ? { lockedUntil: record.lockedUntil.toISOString() } : {}),
    ...(record.lastErrorCode ? { lastErrorCode: record.lastErrorCode } : {}),
    ...(record.lastErrorMessage ? { lastErrorMessage: record.lastErrorMessage } : {}),
    ...(record.deliveredAt ? { deliveredAt: record.deliveredAt.toISOString() } : {}),
    ...(record.deadLetteredAt ? { deadLetteredAt: record.deadLetteredAt.toISOString() } : {})
  });
}

function due(record: OutboxEventRecord, now: Date): boolean {
  return (record.status === 'pending' || record.status === 'retry_wait')
    ? record.availableAt.getTime() <= now.getTime()
    : record.status === 'processing' && !!record.lockedUntil && record.lockedUntil.getTime() <= now.getTime();
}

function activeLease(record: OutboxEventRecord, workerId: string, now: Date): boolean {
  return record.status === 'processing'
    && record.lockedBy === workerId
    && !!record.lockedUntil
    && record.lockedUntil.getTime() > now.getTime();
}

function validateFailure(failure: OutboxFailure): OutboxFailure {
  return outboxFailureSchema.parse(failure);
}

function applyFailure(record: OutboxEventRecord, workerId: string, failure: OutboxFailure, now: Date, deadLetter: boolean): OutboxFailureResult {
  if (record.status !== 'processing' || record.lockedBy !== workerId) return 'lease_lost';
  const stamp = new Date(now);
  if (deadLetter || record.attempts >= record.maxAttempts) {
    record.status = 'dead_letter';
    record.deadLetteredAt = stamp;
    record.lastErrorCode = failure.code;
    record.lastErrorMessage = failure.message;
    record.updatedAt = stamp;
    delete record.lockedBy;
    delete record.lockedUntil;
    return 'dead_lettered';
  }
  const availableAt = failure.availableAt ? new Date(failure.availableAt) : stamp;
  if (Number.isNaN(availableAt.getTime())) throw new OutboxRepositoryError('OUTBOX_CORRUPT');
  record.status = 'retry_wait';
  record.availableAt = availableAt;
  record.lastErrorCode = failure.code;
  record.lastErrorMessage = failure.message;
  record.updatedAt = stamp;
  delete record.lockedBy;
  delete record.lockedUntil;
  return 'retry_scheduled';
}

export function createInMemoryOutboxRepository(seed: readonly OutboxEventRecord[] = []): OutboxRepository {
  const events = new Map<string, OutboxEventRecord>();
  const dedupe = new Map<string, string>();
  for (const item of seed) {
    asContract(item);
    events.set(item.id, cloneRecord(item));
    dedupe.set(item.dedupeKey, item.id);
  }
  return {
    async enqueue(input, now = new Date()) {
      const parsed = outboxEnqueueSchema.parse(input);
      const existingId = dedupe.get(parsed.dedupeKey);
      if (existingId) {
        const existing = events.get(existingId);
        if (!existing) throw new OutboxRepositoryError('OUTBOX_CORRUPT');
        if (!sameEnqueue(existing, parsed)) throw new OutboxRepositoryError('OUTBOX_DEDUPE_CONFLICT');
        return cloneRecord(existing);
      }
      const record = createRecord(parsed, now);
      events.set(record.id, record);
      dedupe.set(record.dedupeKey, record.id);
      return cloneRecord(record);
    },
    async claimAvailable(lease, now = new Date()) {
      const parsedLease = outboxLeaseSchema.parse(lease);
      const stamp = new Date(now);
      const lockedUntil = new Date(stamp.getTime() + parsedLease.leaseMs);
      const candidates = [...events.values()]
        .filter(record => due(record, stamp))
        .sort((left, right) => left.availableAt.getTime() - right.availableAt.getTime() || left.id.localeCompare(right.id))
        .slice(0, parsedLease.limit);
      return candidates.map(record => {
        record.status = 'processing';
        record.attempts += 1;
        record.lockedBy = parsedLease.workerId;
        record.lockedUntil = lockedUntil;
        record.updatedAt = stamp;
        return cloneRecord(record);
      });
    },
    async markDelivered(eventId, workerId, now = new Date()) {
      const record = events.get(eventId);
      if (!record || !activeLease(record, workerId, now)) return false;
      const stamp = new Date(now);
      record.status = 'delivered';
      record.deliveredAt = stamp;
      record.updatedAt = stamp;
      delete record.lockedBy;
      delete record.lockedUntil;
      return true;
    },
    async retry(eventId, workerId, failure, now = new Date()) {
      const record = events.get(eventId);
      if (!record || !activeLease(record, workerId, now)) return record ? 'lease_lost' : 'not_found';
      return applyFailure(record, workerId, validateFailure(failure), new Date(now), false);
    },
    async deadLetter(eventId, workerId, failure, now = new Date()) {
      const record = events.get(eventId);
      if (!record || !activeLease(record, workerId, now)) return record ? 'lease_lost' : 'not_found';
      return applyFailure(record, workerId, validateFailure(failure), new Date(now), true);
    },
    async findById(eventId) {
      const record = events.get(eventId);
      return record ? cloneRecord(record) : undefined;
    },
    async list(limit = 100) {
      return [...events.values()]
        .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime() || left.id.localeCompare(right.id))
        .slice(0, Math.max(1, Math.min(100, limit)))
        .map(cloneRecord);
    }
  };
}

function objectId(value: string): Types.ObjectId {
  return new Types.ObjectId(value);
}

function fromMongo(value: Record<string, unknown>): OutboxEventRecord {
  const id = value._id instanceof Types.ObjectId ? value._id.toHexString() : typeof value._id === 'string' ? value._id : undefined;
  const date = (input: unknown): Date | undefined => input instanceof Date ? input : typeof input === 'string' ? new Date(input) : undefined;
  const availableAt = date(value.availableAt);
  const createdAt = date(value.createdAt);
  const updatedAt = date(value.updatedAt);
  const lockedUntil = date(value.lockedUntil);
  const deliveredAt = date(value.deliveredAt);
  const deadLetteredAt = date(value.deadLetteredAt);
  if (!id || !availableAt || !createdAt || !updatedAt || Number.isNaN(availableAt.getTime()) || Number.isNaN(createdAt.getTime()) || Number.isNaN(updatedAt.getTime())) throw new OutboxRepositoryError('OUTBOX_CORRUPT');
  const record: OutboxEventRecord = {
    id,
    domain: value.domain as OutboxEvent['domain'],
    type: value.type as string,
    dedupeKey: value.dedupeKey as string,
    aggregateType: value.aggregateType as string,
    aggregateId: value.aggregateId as string,
    payload: (value.payload ?? {}) as Record<string, unknown>,
    status: value.status as OutboxEvent['status'],
    attempts: value.attempts as number,
    maxAttempts: value.maxAttempts as number,
    availableAt,
    createdAt,
    updatedAt,
    ...(typeof value.lockedBy === 'string' ? { lockedBy: value.lockedBy } : {}),
    ...(lockedUntil ? { lockedUntil } : {}),
    ...(typeof value.lastErrorCode === 'string' ? { lastErrorCode: value.lastErrorCode } : {}),
    ...(typeof value.lastErrorMessage === 'string' ? { lastErrorMessage: value.lastErrorMessage } : {}),
    ...(deliveredAt ? { deliveredAt } : {}),
    ...(deadLetteredAt ? { deadLetteredAt } : {})
  };
  asContract(record);
  return record;
}

function mongoDocument(record: OutboxEventRecord): Record<string, unknown> {
  return {
    _id: objectId(record.id),
    domain: record.domain,
    type: record.type,
    dedupeKey: record.dedupeKey,
    aggregateType: record.aggregateType,
    aggregateId: record.aggregateId,
    payload: record.payload,
    status: record.status,
    attempts: record.attempts,
    maxAttempts: record.maxAttempts,
    availableAt: record.availableAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    ...(record.lockedBy ? { lockedBy: record.lockedBy } : {}),
    ...(record.lockedUntil ? { lockedUntil: record.lockedUntil } : {}),
    ...(record.lastErrorCode ? { lastErrorCode: record.lastErrorCode } : {}),
    ...(record.lastErrorMessage ? { lastErrorMessage: record.lastErrorMessage } : {}),
    ...(record.deliveredAt ? { deliveredAt: record.deliveredAt } : {}),
    ...(record.deadLetteredAt ? { deadLetteredAt: record.deadLetteredAt } : {})
  };
}

function duplicate(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: number }).code === 11000;
}

export function createMongooseOutboxRepository(connection: Connection): OutboxRepository {
  const collection = connection.collection('outbox_events');
  let indexesReady: Promise<unknown> | undefined;
  const ensureIndexes = (): Promise<unknown> => {
    indexesReady ??= Promise.all([
      collection.createIndex({ dedupeKey: 1 }, { unique: true, name: 'outbox_events_dedupe' }),
      collection.createIndex({ status: 1, availableAt: 1, _id: 1 }, { name: 'outbox_events_available' }),
      collection.createIndex({ status: 1, lockedUntil: 1 }, { name: 'outbox_events_lock' })
    ]);
    return indexesReady;
  };
  return {
    async enqueue(input, now = new Date(), options = {}) {
      await ensureIndexes();
      const parsed = outboxEnqueueSchema.parse(input);
      const record = createRecord(parsed, now);
      try {
        await collection.insertOne(mongoDocument(record), options.session ? { session: options.session } : {});
        return cloneRecord(record);
      } catch (error) {
        if (!duplicate(error)) throw error;
        const existing = await collection.findOne({ dedupeKey: parsed.dedupeKey }, options.session ? { session: options.session } : {});
        if (!existing) throw new OutboxRepositoryError('OUTBOX_CORRUPT');
        const stored = fromMongo(existing as Record<string, unknown>);
        if (!sameEnqueue(stored, parsed)) throw new OutboxRepositoryError('OUTBOX_DEDUPE_CONFLICT');
        return cloneRecord(stored);
      }
    },
    async claimAvailable(lease, now = new Date()) {
      await ensureIndexes();
      const parsedLease = outboxLeaseSchema.parse(lease);
      const stamp = new Date(now);
      const lockedUntil = new Date(stamp.getTime() + parsedLease.leaseMs);
      const claimed: OutboxEventRecord[] = [];
      for (let index = 0; index < parsedLease.limit; index += 1) {
        const result = await collection.findOneAndUpdate(
          {
            $or: [
              { status: { $in: ['pending', 'retry_wait'] }, availableAt: { $lte: stamp } },
              { status: 'processing', lockedUntil: { $lte: stamp } }
            ]
          },
          { $set: { status: 'processing', lockedBy: parsedLease.workerId, lockedUntil, updatedAt: stamp }, $inc: { attempts: 1 } },
          { sort: { availableAt: 1, _id: 1 }, returnDocument: 'after' }
        );
        if (!result) break;
        claimed.push(fromMongo(result as unknown as Record<string, unknown>));
      }
      return claimed;
    },
    async markDelivered(eventId, workerId, now = new Date()) {
      await ensureIndexes();
      const stamp = new Date(now);
      const result = await collection.findOneAndUpdate(
        { _id: objectId(eventId), status: 'processing', lockedBy: workerId, lockedUntil: { $gt: stamp } },
        { $set: { status: 'delivered', deliveredAt: stamp, updatedAt: stamp }, $unset: { lockedBy: '', lockedUntil: '' } },
        { returnDocument: 'after' }
      );
      return !!result;
    },
    async retry(eventId, workerId, failure, now = new Date()) {
      await ensureIndexes();
      const parsedFailure = validateFailure(failure);
      const stamp = new Date(now);
      const current = await collection.findOne({ _id: objectId(eventId) });
      if (!current) return 'not_found';
      const record = fromMongo(current as Record<string, unknown>);
      if (!activeLease(record, workerId, stamp)) return 'lease_lost';
      const dead = record.attempts >= record.maxAttempts;
      const availableAt = parsedFailure.availableAt ? new Date(parsedFailure.availableAt) : stamp;
      if (Number.isNaN(availableAt.getTime())) throw new OutboxRepositoryError('OUTBOX_CORRUPT');
      const leaseFilter = { _id: objectId(eventId), status: 'processing', lockedBy: workerId, lockedUntil: { $gt: stamp } };
      if (dead) {
        const result = await collection.findOneAndUpdate(leaseFilter, { $set: { status: 'dead_letter', deadLetteredAt: stamp, lastErrorCode: parsedFailure.code, lastErrorMessage: parsedFailure.message, updatedAt: stamp }, $unset: { lockedBy: '', lockedUntil: '' } }, { returnDocument: 'after' });
        return result ? 'dead_lettered' : 'lease_lost';
      }
      const result = await collection.findOneAndUpdate(leaseFilter, { $set: { status: 'retry_wait', availableAt, lastErrorCode: parsedFailure.code, lastErrorMessage: parsedFailure.message, updatedAt: stamp }, $unset: { lockedBy: '', lockedUntil: '' } }, { returnDocument: 'after' });
      return result ? 'retry_scheduled' : 'lease_lost';
    },
    async deadLetter(eventId, workerId, failure, now = new Date()) {
      await ensureIndexes();
      const parsedFailure = validateFailure(failure);
      const stamp = new Date(now);
      const result = await collection.findOneAndUpdate(
        { _id: objectId(eventId), status: 'processing', lockedBy: workerId, lockedUntil: { $gt: stamp } },
        { $set: { status: 'dead_letter', deadLetteredAt: stamp, lastErrorCode: parsedFailure.code, lastErrorMessage: parsedFailure.message, updatedAt: stamp }, $unset: { lockedBy: '', lockedUntil: '' } },
        { returnDocument: 'after' }
      );
      return result ? 'dead_lettered' : 'lease_lost';
    },
    async findById(eventId) {
      await ensureIndexes();
      const result = await collection.findOne({ _id: objectId(eventId) });
      return result ? fromMongo(result as Record<string, unknown>) : undefined;
    },
    async list(limit = 100) {
      await ensureIndexes();
      const rows = await collection.find({}).sort({ createdAt: 1, _id: 1 }).limit(Math.max(1, Math.min(100, limit))).toArray();
      return rows.map(row => fromMongo(row as Record<string, unknown>));
    }
  };
}

export const createInMemoryOutbox = createInMemoryOutboxRepository;
