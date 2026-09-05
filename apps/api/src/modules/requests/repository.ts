import { Types, type Connection } from 'mongoose';
import type { RequestListQuery } from '@sadat-real-estate/contracts';
import {
  publicRelatedId,
  publicRelatedObjectIds,
  publicRelatedPropertyProjection,
  publicRelatedUnique,
  projectPublicRelatedProperty
} from '../public/related-property.js';
import type { RequestRecord, RequestRepository } from './service.js';

type Row = Record<string, unknown>;

function toObjectId(id: string): Types.ObjectId { return new Types.ObjectId(id); }

function row(value: Row): RequestRecord | undefined {
  const id = value._id instanceof Types.ObjectId ? value._id.toHexString() : typeof value._id === 'string' ? value._id : undefined;
  if (!id || !(value.createdAt instanceof Date) || !(value.updatedAt instanceof Date) || typeof value.type !== 'string' || typeof value.status !== 'string' || typeof value.source !== 'string' || typeof value.version !== 'number') return undefined;
  return {
    id,
    type: value.type as RequestRecord['type'],
    source: value.source as RequestRecord['source'],
    ...(typeof value.creatorId === 'string' ? { creatorId: value.creatorId } : value.creatorId instanceof Types.ObjectId ? { creatorId: value.creatorId.toHexString() } : {}),
    ...(value.seekerId instanceof Types.ObjectId ? { seekerId: value.seekerId.toHexString() } : {}),
    ...(value.providerId instanceof Types.ObjectId ? { providerId: value.providerId.toHexString() } : {}),
    ...(value.propertyId instanceof Types.ObjectId ? { propertyId: value.propertyId.toHexString() } : {}),
    ...(value.projectId instanceof Types.ObjectId ? { projectId: value.projectId.toHexString() } : {}),
    status: value.status as RequestRecord['status'],
    payload: (value.payload ?? {}) as Record<string, unknown>,
    ...(value.assignedTo instanceof Types.ObjectId ? { assignedTo: value.assignedTo.toHexString() } : {}),
    ...(Array.isArray(value.internalNotes) ? { internalNotes: value.internalNotes as NonNullable<RequestRecord['internalNotes']> } : {}),
    ...(value.dueAt instanceof Date ? { dueAt: value.dueAt } : {}),
    ...(value.appointmentAt instanceof Date ? { appointmentAt: value.appointmentAt } : {}),
    ...(typeof value.appointmentTimezone === 'string' ? { appointmentTimezone: value.appointmentTimezone } : {}),
    version: value.version,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt
  };
}

function escapedSearch(value: string): RegExp {
  return new RegExp(value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'), 'i');
}

export function createMongooseRequestRepository(connection: Connection): RequestRepository {
  const requests = connection.collection('requests');
  const properties = connection.collection('properties');

  async function enrich(items: readonly RequestRecord[]): Promise<RequestRecord[]> {
    const propertyIds = publicRelatedUnique(items.flatMap(item => item.propertyId ? [item.propertyId] : []));
    const propertyObjectIds = publicRelatedObjectIds(propertyIds);
    if (propertyObjectIds.length === 0) return [...items];
    const propertyRows = await properties.find({ _id: { $in: propertyObjectIds }, status: 'published', active: true }, { projection: publicRelatedPropertyProjection }).toArray();
    if (propertyRows.length === 0) return [...items];

    const locationIds = publicRelatedUnique(propertyRows.flatMap(value => {
      const id = publicRelatedId(value.locationId);
      return id ? [id] : [];
    }));
    const organizationIds = publicRelatedUnique(propertyRows.flatMap(value => {
      const id = publicRelatedId(value.organizationId);
      return id ? [id] : [];
    }));
    const [locationRows, organizationRows] = await Promise.all([
      locationIds.length === 0 ? [] : connection.collection('locations').find({ _id: { $in: publicRelatedObjectIds(locationIds) }, active: true }, { projection: { _id: 1, name: 1 } }).toArray(),
      organizationIds.length === 0 ? [] : connection.collection('organizations').find({ _id: { $in: publicRelatedObjectIds(organizationIds) }, status: 'approved' }, { projection: { _id: 1, name: 1, imageUrl: 1 } }).toArray()
    ]);
    const locations = new Map(locationRows.flatMap(value => {
      const id = publicRelatedId(value._id);
      return id && value.name !== undefined ? [[id, value.name] as const] : [];
    }));
    const organizations = new Map(organizationRows.flatMap(value => {
      const id = publicRelatedId(value._id);
      return id && value.name !== undefined ? [[id, { name: value.name, ...(typeof value.imageUrl === 'string' ? { imageUrl: value.imageUrl } : {}) }] as const] : [];
    }));
    const cards = new Map(propertyRows.flatMap(value => {
      const locationId = publicRelatedId(value.locationId);
      const organizationId = publicRelatedId(value.organizationId);
      const card = projectPublicRelatedProperty(value as Row, locationId ? locations.get(locationId) : undefined, organizationId ? organizations.get(organizationId) : undefined);
      return card ? [[card.id, card] as const] : [];
    }));
    return items.map(item => {
      const property = item.propertyId ? cards.get(item.propertyId) : undefined;
      return property ? { ...item, property } : item;
    });
  }

  async function enrichedResult(result: unknown): Promise<RequestRecord | undefined> {
    const parsed = result ? row(result as Row) : undefined;
    if (!parsed) return undefined;
    const [enriched] = await enrich([parsed]);
    return enriched;
  }

  return {
    async create(request) {
      try {
        const doc = {
          _id: toObjectId(request.id),
          type: request.type,
          source: request.source,
          ...(request.creatorId ? { creatorId: toObjectId(request.creatorId) } : {}),
          ...(request.seekerId ? { seekerId: toObjectId(request.seekerId) } : {}),
          ...(request.providerId ? { providerId: toObjectId(request.providerId) } : {}),
          ...(request.propertyId ? { propertyId: toObjectId(request.propertyId) } : {}),
          ...(request.projectId ? { projectId: toObjectId(request.projectId) } : {}),
          status: request.status,
          payload: request.payload,
          ...(request.dueAt ? { dueAt: request.dueAt } : {}),
          version: request.version,
          createdAt: request.createdAt,
          updatedAt: request.updatedAt
        };
        await requests.insertOne(doc);
        return { kind: 'written', request: (await enrichedResult(doc)) ?? request };
      } catch (error) {
        if (typeof error === 'object' && error !== null && 'code' in error && (error as { code?: number }).code === 11000) return { kind: 'duplicate' };
        throw error;
      }
    },
    async list(query: RequestListQuery, scope, options) {
      const filter: Record<string, unknown> = {};
      if (options?.overdueBefore) {
        filter.dueAt = { $lt: options.overdueBefore };
        filter.$and = [{ status: { $nin: ['resolved', 'cancelled', 'closed'] } }];
      }
      if (query.status) filter.status = query.status;
      if (query.type) filter.type = query.type;
      if (query.source) filter.source = query.source;
      if (query.assignedTo) filter.assignedTo = toObjectId(query.assignedTo);
      if (scope?.seekerId) filter.seekerId = toObjectId(scope.seekerId);
      if (scope?.providerId) filter.providerId = toObjectId(scope.providerId);
      const search = query.search?.trim();
      if (search) {
        const clauses: Record<string, unknown>[] = [
          { type: escapedSearch(search) },
          { status: escapedSearch(search) },
          { 'payload.firstName': escapedSearch(search) },
          { 'payload.lastName': escapedSearch(search) },
          { 'payload.phone': escapedSearch(search) },
          { 'payload.email': escapedSearch(search) },
          { $expr: { $regexMatch: {
            input: { $concat: [{ $ifNull: ['$payload.firstName', ''] }, ' ', { $ifNull: ['$payload.lastName', ''] }] },
            regex: escapedSearch(search)
          } } },
          { 'payload.message': escapedSearch(search) },
          { 'payload.note': escapedSearch(search) }
        ];
        if (/^[a-f0-9]{24}$/u.test(search)) clauses.unshift({ _id: toObjectId(search) });
        filter.$or = clauses;
      }
      const [rows, total] = await Promise.all([
        requests.find(filter).sort({ createdAt: -1, _id: -1 }).skip((query.page - 1) * query.limit).limit(query.limit).toArray(),
        requests.countDocuments(filter)
      ]);
      const items = rows.flatMap(value => {
        const parsed = row(value as Row);
        return parsed ? [parsed] : [];
      });
      return { items: await enrich(items), total };
    },
    async get(id, scope) {
      const filter: Record<string, unknown> = { _id: toObjectId(id) };
      if (scope?.seekerId) filter.seekerId = toObjectId(scope.seekerId);
      if (scope?.providerId) filter.providerId = toObjectId(scope.providerId);
      return enrichedResult(await requests.findOne(filter));
    },
    async transition(input) {
      const result = await requests.findOneAndUpdate({ _id: toObjectId(input.id), version: input.expectedVersion }, { $set: { status: input.status, updatedAt: input.now }, $inc: { version: 1 } }, { returnDocument: 'after' });
      if (!result) return { kind: 'version_conflict' };
      const parsed = await enrichedResult(result);
      return parsed ? { kind: 'written', request: parsed } : { kind: 'not_found' };
    },
    async assign(input) {
      const result = await requests.findOneAndUpdate({ _id: toObjectId(input.id), version: input.expectedVersion }, { $set: { assignedTo: toObjectId(input.assigneeId), updatedAt: input.now }, $inc: { version: 1 } }, { returnDocument: 'after' });
      if (!result) return { kind: 'version_conflict' };
      const parsed = await enrichedResult(result);
      return parsed ? { kind: 'written', request: parsed } : { kind: 'not_found' };
    },
    async addNote(input) {
      const result = await requests.findOneAndUpdate({ _id: toObjectId(input.id), version: input.expectedVersion }, ({ $push: { internalNotes: input.note }, $set: { updatedAt: input.now }, $inc: { version: 1 } } as never), { returnDocument: 'after' });
      if (!result) return { kind: 'version_conflict' };
      const parsed = await enrichedResult(result);
      return parsed ? { kind: 'written', request: parsed } : { kind: 'not_found' };
    }
  };
}
