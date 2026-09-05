import { Types, type Connection } from 'mongoose';
import { type ViewingListQuery } from '@sadat-real-estate/contracts';
import {
  publicRelatedObjectIds,
  publicRelatedPropertyProjection,
  publicRelatedUnique,
  projectPublicRelatedProperty,
  publicRelatedId,
  type PublicRelatedOrganization
} from '../public/related-property.js';
import type { PublicPropertyRelatedProperty } from '@sadat-real-estate/contracts';
import type { ViewingRecord, ViewingRepository } from './service.js';

type Row = Record<string, unknown>;

function oid(value: string): Types.ObjectId {
  return new Types.ObjectId(value);
}

function id(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && typeof (value as { toHexString?: () => string }).toHexString === 'function') {
    return (value as { toHexString: () => string }).toHexString();
  }
  return undefined;
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

export function createMongooseViewingRepository(connection: Connection): ViewingRepository {
  const collection = connection.collection('viewings');
  const properties = connection.collection('properties');

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
      active: true
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
    async create(row) {
      await collection.createIndex({ propertyId: 1, requestedAt: 1, status: 1 });
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
      });
      const [enriched] = await enrich([row]);
      return enriched ?? row;
    },
    async list(query: ViewingListQuery, scope) {
      const filter: Record<string, unknown> = {};
      if (query.status) filter.status = query.status;
      if (scope.seekerId) filter.seekerId = oid(scope.seekerId);
      if (scope.providerId) filter.providerId = oid(scope.providerId);
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
      if (scope.providerId) filter.providerId = oid(scope.providerId);
      const value = await collection.findOne(filter);
      const parsed = value ? parse(value as Row) : undefined;
      if (!parsed) return undefined;
      const [enriched] = await enrich([parsed]);
      return enriched;
    },
    async update(input) {
      const result = await collection.findOneAndUpdate(
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
        { returnDocument: 'after' }
      );
      if (!result) return { kind: 'version_conflict' };
      const parsed = parse(result as unknown as Row);
      if (!parsed) return { kind: 'not_found' };
      const [enriched] = await enrich([parsed]);
      return { kind: 'written', row: enriched ?? parsed };
    }
  };
}
