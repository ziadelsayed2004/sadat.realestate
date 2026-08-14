import { Types, type ClientSession, type Connection } from 'mongoose';
import type {
  LocalizedText,
  LocationCoordinates,
  LocationKind,
  LocationListQuery
} from '@sadat-real-estate/contracts';
import type { AuditWriter } from '../audit/writer.js';
import type { LocationModels, LocationRecord } from './models.js';

export interface StoredLocation {
  id: string;
  kind: LocationKind;
  name: LocalizedText;
  slug: string;
  parentLocationId?: string;
  coordinates?: LocationCoordinates;
  order: number;
  active: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface LocationMutationMetadata {
  actorId: string;
  reason: string;
  requestId: string;
  traceId: string;
  changedAt: Date;
}

export type LocationWriteResult =
  | { kind: 'written'; location: StoredLocation }
  | { kind: 'slug_conflict' }
  | { kind: 'not_found' }
  | { kind: 'version_conflict' };

export type LocationDeleteResult =
  | { kind: 'deleted' }
  | { kind: 'not_found' }
  | { kind: 'version_conflict' }
  | { kind: 'in_use' };

export interface LocationRepository {
  list(query: LocationListQuery): Promise<{ items: StoredLocation[]; total: number }>;
  findById(id: string): Promise<StoredLocation | null>;
  parentLocationExists(id: string): Promise<boolean>;
  create(input: {
    location: Omit<StoredLocation, 'id' | 'version' | 'createdAt' | 'updatedAt'>;
    metadata: LocationMutationMetadata;
  }): Promise<LocationWriteResult>;
  update(input: {
    id: string;
    expectedVersion: number;
    changes: Partial<Pick<StoredLocation, 'name' | 'slug' | 'parentLocationId' | 'order' | 'active'>> & {
      coordinates?: LocationCoordinates | null;
    };
    before: StoredLocation;
    metadata: LocationMutationMetadata;
  }): Promise<LocationWriteResult>;
  delete(input: {
    id: string;
    expectedVersion: number;
    before: StoredLocation;
    metadata: LocationMutationMetadata;
  }): Promise<LocationDeleteResult>;
}

function duplicateKey(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
}

function stored(record: LocationRecord & { _id: Types.ObjectId }): StoredLocation {
  return {
    id: record._id.toHexString(),
    kind: record.kind,
    name: structuredClone(record.name),
    slug: record.slug,
    ...(record.parentLocationId ? { parentLocationId: record.parentLocationId.toHexString() } : {}),
    ...(record.coordinates ? {
      coordinates: {
        longitude: record.coordinates.coordinates[0],
        latitude: record.coordinates.coordinates[1]
      }
    } : {}),
    order: record.order,
    active: record.active,
    version: record.version,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

export function createMongooseLocationRepository(
  connection: Connection,
  models: LocationModels,
  auditWriter: AuditWriter
): LocationRepository {
  async function transaction<T>(run: (session: ClientSession) => Promise<T>): Promise<T> {
    const session = await connection.startSession();
    try { return await session.withTransaction(() => run(session)); }
    finally { await session.endSession(); }
  }

  async function audit(
    action: string,
    targetId: string,
    before: unknown,
    after: unknown,
    metadata: LocationMutationMetadata,
    session: ClientSession
  ) {
    await auditWriter.record({
      actorType: 'admin', actorId: metadata.actorId, targetType: 'location', targetId,
      action, reason: metadata.reason, before, after,
      requestId: metadata.requestId, traceId: metadata.traceId, occurredAt: metadata.changedAt
    }, session);
  }

  return {
    async list(query) {
      const filter: Record<string, unknown> = {};
      if (query.kind) filter.kind = query.kind;
      if (query.parentLocationId) filter.parentLocationId = new Types.ObjectId(query.parentLocationId);
      if (query.active !== undefined) filter.active = query.active;
      if (query.search) filter.$text = { $search: query.search };
      const direction: 1 | -1 = query.direction === 'asc' ? 1 : -1;
      const sort: Record<string, 1 | -1> = query.sort === 'order'
        ? { order: direction, slug: 1 }
        : { [query.sort]: direction, slug: 1 };
      const [records, total] = await Promise.all([
        models.Location.find(filter).sort(sort).skip((query.page - 1) * query.limit).limit(query.limit).lean(),
        models.Location.countDocuments(filter)
      ]);
      return { items: records.map((record) => stored(record as LocationRecord & { _id: Types.ObjectId })), total };
    },
    async findById(id) {
      const record = await models.Location.findById(id).lean();
      return record ? stored(record as LocationRecord & { _id: Types.ObjectId }) : null;
    },
    async parentLocationExists(id) {
      return Boolean(await models.Location.exists({ _id: id, kind: 'location' }));
    },
    async create(input) {
      try {
        return await transaction(async (session) => {
          const payload = {
            ...input.location,
            ...(input.location.parentLocationId ? { parentLocationId: new Types.ObjectId(input.location.parentLocationId) } : {}),
            ...(input.location.coordinates ? { coordinates: { type: 'Point', coordinates: [input.location.coordinates.longitude, input.location.coordinates.latitude] } } : {}),
            createdBy: new Types.ObjectId(input.metadata.actorId),
            updatedBy: new Types.ObjectId(input.metadata.actorId),
            createdAt: input.metadata.changedAt,
            updatedAt: input.metadata.changedAt
          };
          const created = new models.Location(payload);
          await created.save({ session });
          const result = stored(created.toObject() as LocationRecord & { _id: Types.ObjectId });
          await audit('location.create', result.id, null, result, input.metadata, session);
          return { kind: 'written' as const, location: result };
        });
      } catch (error) {
        if (duplicateKey(error)) return { kind: 'slug_conflict' };
        throw error;
      }
    },
    async update(input) {
      try {
        return await transaction(async (session) => {
          const changes: Record<string, unknown> = { ...input.changes, updatedBy: new Types.ObjectId(input.metadata.actorId), updatedAt: input.metadata.changedAt };
          if (input.changes.parentLocationId) changes.parentLocationId = new Types.ObjectId(input.changes.parentLocationId);
          if (input.changes.coordinates) changes.coordinates = { type: 'Point', coordinates: [input.changes.coordinates.longitude, input.changes.coordinates.latitude] };
          if (input.changes.coordinates === undefined || input.changes.coordinates === null) delete changes.coordinates;
          const update: Record<string, unknown> = { $set: changes, $inc: { version: 1 } };
          if (input.changes.coordinates === null) update.$unset = { coordinates: 1 };
          const record = await models.Location.findOneAndUpdate(
            { _id: input.id, version: input.expectedVersion },
            update,
            { new: true, runValidators: true, session, lean: true }
          );
          if (!record) {
            return await models.Location.exists({ _id: input.id }).session(session)
              ? { kind: 'version_conflict' as const }
              : { kind: 'not_found' as const };
          }
          const result = stored(record as LocationRecord & { _id: Types.ObjectId });
          await audit('location.update', result.id, input.before, result, input.metadata, session);
          return { kind: 'written' as const, location: result };
        });
      } catch (error) {
        if (duplicateKey(error)) return { kind: 'slug_conflict' };
        throw error;
      }
    },
    async delete(input) {
      return transaction(async (session) => {
        const id = new Types.ObjectId(input.id);
        const [childCount, providerCount] = await Promise.all([
          models.Location.countDocuments({ parentLocationId: id }).session(session),
          connection.collection('provider_applications').countDocuments({
            $or: [{ primaryLocationId: id }, { serviceAreaIds: id }]
          }, { session })
        ]);
        if (childCount + providerCount > 0) return { kind: 'in_use' as const };
        const removed = await models.Location.findOneAndDelete(
          { _id: id, version: input.expectedVersion }, { session }
        );
        if (!removed) {
          return await models.Location.exists({ _id: id }).session(session)
            ? { kind: 'version_conflict' as const }
            : { kind: 'not_found' as const };
        }
        await audit('location.delete', input.id, input.before, null, input.metadata, session);
        return { kind: 'deleted' as const };
      });
    }
  };
}
