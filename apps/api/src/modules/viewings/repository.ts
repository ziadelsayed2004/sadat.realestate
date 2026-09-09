import type { AuditWriter } from '../audit/writer.js';
import { Types, type ClientSession, type Connection } from 'mongoose';
import { type ViewingListQuery } from '@sadat-real-estate/contracts';
import {
  publicRelatedObjectIds,
  publicRelatedPropertyProjection,
  publicRelatedUnique,
  projectPublicRelatedProperty,
  publicRelatedId,
  type PublicRelatedOrganization
} from '../public/related-property.js';
import type { ViewingRecord, ViewingRepository } from './service.js';
import { ViewingServiceError } from './service.js';
import { unexpiredPropertyFilter } from '../settings/property-policy.js';

type Row = Record<string, unknown>;

function oid(value: string): Types.ObjectId {
  return new Types.ObjectId(value);
}

function parse(value: Row): ViewingRecord | undefined {
  const viewingId = value._id instanceof Types.ObjectId ? value._id.toHexString() : undefined;
  if (!viewingId || !(value.requestedAt instanceof Date) || !(value.createdAt instanceof Date) || !(value.updatedAt instanceof Date) || typeof value.propertyId !== 'string' || !(value.seekerId instanceof Types.ObjectId) || typeof value.status !== 'string' || typeof value.timezone !== 'string' || typeof value.version !== 'number') return undefined;
  return {
    id: viewingId,
    propertyId: value.propertyId,
    seekerId: value.seekerId.toHexString(),
    ...(value.providerId instanceof Types.ObjectId ? { providerId: value.providerId.toHexString() } : {}),
    status: value.status as ViewingRecord['status'],
    requestedAt: value.requestedAt,
    timezone: value.timezone,
    ...(typeof value.note === 'string' ? { note: value.note } : {}),
    version: value.version,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt
  };
}

export function createMongooseViewingRepository(connection: Connection, audit?: AuditWriter): ViewingRepository {
  const collection = connection.collection('viewings');
  const properties = connection.collection('properties');
  const locks = connection.collection('viewing_schedule_locks');
  async function prepareLock(propertyId: string): Promise<void> {
    try { await locks.updateOne({ _id: oid(propertyId) }, { $setOnInsert: { revision: 0 } }, { upsert: true }); }
    catch (error) { if (!(typeof error === 'object' && error !== null && 'code' in error && error.code === 11000)) throw error; }
  }
  async function lockSchedule(propertyId: string, session: ClientSession): Promise<void> {
    await locks.updateOne({ _id: oid(propertyId) }, { $inc: { revision: 1 } }, { session });
  }
  async function occupied(propertyId: string, requestedAt: Date, session: ClientSession, excluding?: string): Promise<boolean> {
    return Boolean(await collection.findOne({ propertyId, requestedAt,
      status: { $in: ['requested', 'confirmed', 'rescheduled'] },
      ...(excluding ? { _id: { $ne: oid(excluding) } } : {})
    }, { session, projection: { _id: 1 } }));
  }

  async function providerScope(accountId: string): Promise<{ $in: Types.ObjectId[] }> {
    const profiles = await connection.collection('provider_profiles').find(
      { userId: oid(accountId) }, { projection: { _id: 1 } }
    ).toArray();
    return { $in: [oid(accountId), ...profiles.flatMap(profile => profile._id instanceof Types.ObjectId ? [profile._id] : [])] };
  }

  async function enrich(records: readonly ViewingRecord[]): Promise<ViewingRecord[]> {
    if (records.length === 0) return [];
    const profiles = await connection.collection('seeker_profiles').find(
      { userId: { $in: publicRelatedObjectIds(publicRelatedUnique(records.map(item => item.seekerId))) } },
      { projection: { userId: 1, firstName: 1, lastName: 1 } }
    ).toArray();
    const names = new Map(profiles.flatMap(profile => {
      const userId = publicRelatedId(profile.userId);
      const name = [profile.firstName, profile.lastName].filter((part): part is string => typeof part === 'string').map(part => part.trim()).filter(Boolean).join(' ');
      return userId && name && name.length <= 401 ? [[userId, name] as const] : [];
    }));
    const items = records.map(item => {
      const customerName = names.get(item.seekerId);
      return customerName ? { ...item, customerName } : item;
    });
    const propertyIds = publicRelatedUnique(items.map(item => item.propertyId));
    const propertyObjectIds = publicRelatedObjectIds(propertyIds);
    if (propertyObjectIds.length === 0) return [...items];

    const propertyFilter: Record<string, unknown> = {
      $or: [{ _id: { $in: propertyObjectIds } }, { _id: { $in: propertyIds } }],
      status: 'published',
      active: true,
      ...unexpiredPropertyFilter()
    };
    const propertyRows = await properties.find(propertyFilter, { projection: publicRelatedPropertyProjection }).toArray();
    if (propertyRows.length === 0) return [...items];

    const locationIds = publicRelatedUnique(propertyRows.flatMap(row => {
      const value = publicRelatedId(row.locationId);
      return value ? [value] : [];
    }));
    const organizationIds = publicRelatedUnique(propertyRows.flatMap(row => {
      const value = publicRelatedId(row.organizationId);
      return value ? [value] : [];
    }));
    const [locationRows, organizationRows] = await Promise.all([
      locationIds.length === 0 ? [] : connection.collection('locations').find({ _id: { $in: publicRelatedObjectIds(locationIds) }, active: true }, { projection: { _id: 1, name: 1 } }).toArray(),
      organizationIds.length === 0 ? [] : connection.collection('organizations').find({ _id: { $in: publicRelatedObjectIds(organizationIds) }, status: 'approved' }, { projection: { _id: 1, name: 1, imageUrl: 1 } }).toArray()
    ]);
    const locations = new Map(locationRows.flatMap(row => {
      const value = publicRelatedId(row._id);
      return value && row.name !== undefined ? [[value, row.name] as const] : [];
    }));
    const organizations = new Map(organizationRows.flatMap(row => {
      const value = publicRelatedId(row._id);
      return value && row.name !== undefined ? [[value, { name: row.name, ...(typeof row.imageUrl === 'string' ? { imageUrl: row.imageUrl } : {}) } satisfies PublicRelatedOrganization] as const] : [];
    }));
    const cards = new Map(propertyRows.flatMap(row => {
      const locationId = publicRelatedId(row.locationId);
      const organizationId = publicRelatedId(row.organizationId);
      const card = projectPublicRelatedProperty(row as Row, locationId ? locations.get(locationId) : undefined, organizationId ? organizations.get(organizationId) : undefined);
      return card ? [[card.id, card] as const] : [];
    }));
    return items.map(item => {
      const property = cards.get(item.propertyId);
      return property ? { ...item, property } : item;
    });
  }

  return {
    async isActiveAccount(claims) {
      return Boolean(await connection.collection('users').findOne({ _id: oid(claims.sub), roleType: claims.role, status: 'verified' }, { projection: { _id: 1 } }));
    },
    async create(row) {
      // Resolve ownership on the server; a seeker must never choose the recipient.
      const propertyFilter: Record<string, unknown> = {
        $or: [{ _id: oid(row.propertyId) }, { _id: row.propertyId }],
        status: 'published',
        active: true,
        ...unexpiredPropertyFilter()
      };
      const property = await properties.findOne(propertyFilter, { projection: { providerId: 1 } });
      let providerId = publicRelatedId(property?.providerId);
      if (!providerId || !Types.ObjectId.isValid(providerId)) throw new ViewingServiceError('VIEWING_NOT_FOUND');
      const profile = await connection.collection('provider_profiles').findOne({ _id: oid(providerId) }, { projection: { userId: 1 } });
      providerId = publicRelatedId(profile?.userId) ?? providerId;
      const owner = await connection.collection('users').findOne({ _id: oid(providerId), roleType: 'provider', status: 'verified' }, { projection: { _id: 1 } });
      if (!owner) throw new ViewingServiceError('VIEWING_NOT_FOUND');
      row = { ...row, providerId };
      await collection.createIndex({ propertyId: 1, requestedAt: 1, status: 1 });
      await prepareLock(row.propertyId);
      await connection.transaction(async session => {
      await lockSchedule(row.propertyId, session);
      if (await occupied(row.propertyId, row.requestedAt, session)) throw new ViewingServiceError('VIEWING_CONFLICT');
      await collection.insertOne({
        _id: oid(row.id),
        propertyId: row.propertyId,
        seekerId: oid(row.seekerId),
        ...(row.providerId ? { providerId: oid(row.providerId) } : {}),
        status: row.status,
        requestedAt: row.requestedAt,
        timezone: row.timezone,
        ...(row.note ? { note: row.note } : {}),
        version: row.version,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt
      }, { session });
      });
      const [enriched] = await enrich([row]);
      return enriched ?? row;
    },
    async list(query: ViewingListQuery, scope) {
      const filter: Record<string, unknown> = {};
      if (query.status) filter.status = query.status;
      if (scope.seekerId) filter.seekerId = oid(scope.seekerId);
      if (scope.providerId) filter.providerId = await providerScope(scope.providerId);
      const [rows, total] = await Promise.all([
        collection.find(filter).sort({ requestedAt: 1, _id: 1 }).skip((query.page - 1) * query.limit).limit(query.limit).toArray(),
        collection.countDocuments(filter)
      ]);
      const items = rows.flatMap(value => {
        const parsed = parse(value as Row);
        return parsed ? [parsed] : [];
      });
      return { items: await enrich(items), total };
    },
    async get(viewingId, scope) {
      const filter: Record<string, unknown> = { _id: oid(viewingId) };
      if (scope.seekerId) filter.seekerId = oid(scope.seekerId);
      if (scope.providerId) filter.providerId = await providerScope(scope.providerId);
      const value = await collection.findOne(filter);
      const parsed = value ? parse(value as Row) : undefined;
      if (!parsed) return undefined;
      const [enriched] = await enrich([parsed]);
      return enriched;
    },
    async update(input) {
      if (!audit) throw new Error('AUDIT_UNAVAILABLE');
      const existing = await collection.findOne({ _id: oid(input.id) });
      if (!existing || typeof existing.propertyId !== 'string') return { kind: 'not_found' };
      await prepareLock(existing.propertyId);
      const result = await connection.transaction(async session => {
      await lockSchedule(existing.propertyId as string, session);
      const current = await collection.findOne({ _id: oid(input.id), version: input.expectedVersion }, { session });
      if (!current) return null;
      if (!['cancelled', 'completed'].includes(input.status ?? String(current.status))
        && await occupied(existing.propertyId as string, input.requestedAt ?? current.requestedAt as Date, session, input.id)) {
        throw new ViewingServiceError('VIEWING_CONFLICT');
      }
      const updated = await collection.findOneAndUpdate(
        { _id: oid(input.id), version: input.expectedVersion },
        {
          $set: {
            ...(input.status ? { status: input.status } : {}),
            ...(input.requestedAt ? { requestedAt: input.requestedAt } : {}),
            ...(input.timezone ? { timezone: input.timezone } : {}),
            updatedAt: input.now
          },
          $inc: { version: 1 }
        },
        { returnDocument: 'after', session }
      );
      if (updated) await audit.record(input.audit, session);
      return updated;
      });
      if (!result) return { kind: 'version_conflict' };
      const parsed = parse(result as unknown as Row);
      if (!parsed) return { kind: 'not_found' };
      const [enriched] = await enrich([parsed]);
      return { kind: 'written', row: enriched ?? parsed };
    }
  };
}
