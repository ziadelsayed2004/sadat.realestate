import { createHash } from 'node:crypto';
import { Types, type Connection } from 'mongoose';
import type { AuditRecordInput, AuditWriter } from '../audit/writer.js';
import type { RequestListQuery } from '@sadat-real-estate/contracts';
import {
  publicRelatedId,
  publicRelatedObjectIds,
  publicRelatedPropertyProjection,
  publicRelatedUnique,
  projectPublicRelatedProperty
} from '../public/related-property.js';
import type { RequestRecord, RequestRepository } from './service.js';
import { unexpiredPropertyFilter } from '../settings/property-policy.js';

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

export function createMongooseRequestRepository(connection: Connection, audit?: AuditWriter): RequestRepository {
  const requests = connection.collection('requests');
  const properties = connection.collection('properties');
  let creationIndex: Promise<string> | undefined;
  function ensureCreationIndex(): Promise<string> {
    creationIndex ??= requests.createIndex({ creationFingerprint: 1 }, {
      name: 'requests_new_creation_fingerprint_unique', unique: true,
      partialFilterExpression: { status: 'new', creationFingerprint: { $type: 'string' } }
    }).catch(error => { creationIndex = undefined; throw error; });
    return creationIndex;
  }

  async function enrich(items: readonly RequestRecord[]): Promise<RequestRecord[]> {
    const propertyIds = publicRelatedUnique(items.flatMap(item => item.propertyId ? [item.propertyId] : []));
    const propertyObjectIds = publicRelatedObjectIds(propertyIds);
    if (propertyObjectIds.length === 0) return [...items];
    const propertyRows = await properties.find({ _id: { $in: propertyObjectIds }, status: 'published', active: true, ...unexpiredPropertyFilter() }, { projection: publicRelatedPropertyProjection }).toArray();
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

  async function write(input: { id: string; expectedVersion: number; audit: AuditRecordInput }, update: Row) {
    if (!audit) throw new Error('AUDIT_UNAVAILABLE');
    const result = await connection.transaction(async session => {
      const updated = await requests.findOneAndUpdate(
        { _id: toObjectId(input.id), version: input.expectedVersion }, update,
        { returnDocument: 'after', session }
      );
      if (updated) await audit.record(input.audit, session);
      return updated;
    });
    if (!result) return { kind: 'version_conflict' } as const;
    const parsed = await enrichedResult(result);
    return parsed ? { kind: 'written', request: parsed } as const : { kind: 'not_found' } as const;
  }

  return {
    async isActiveAccount(claims) {
      return Boolean(await connection.collection('users').findOne({ _id: toObjectId(claims.sub), roleType: claims.role, status: 'verified' }, { projection: { _id: 1 } }));
    },
    async create(request) {
      await ensureCreationIndex();
      try {
        const doc = {
          _id: toObjectId(request.id),
          creationFingerprint: createHash('sha256').update(JSON.stringify([request.creatorId, request.type, request.payload])).digest('hex'),
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
      return write(input, { $set: { status: input.status, updatedAt: input.now }, $inc: { version: 1 } });
    },
    async assign(input) {
      return write(input, { $set: { assignedTo: toObjectId(input.assigneeId), updatedAt: input.now }, $inc: { version: 1 } });
    },
    async addNote(input) {
      return write(input, { $push: { internalNotes: input.note }, $set: { updatedAt: input.now }, $inc: { version: 1 } });
    }
  };
}
