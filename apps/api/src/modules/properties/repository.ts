import { Types, type ClientSession, type Connection } from 'mongoose';
import type { PropertyAdminListQuery, PropertyContactStep, PropertyCoordinates, PropertyCoreStep, PropertyDetailsStep, PropertyDuplicateData, PropertyFeaturesServicesStep, PropertyListQuery, PropertyLocationStep, PropertyPricingStep, PropertySource } from '@sadat-real-estate/contracts';
import type { AuditWriter } from '../audit/writer.js';
import type { PropertyModels, PropertyRecord } from './models.js';

export interface StoredProperty {
  id: string;
  providerId: string;
  source: PropertySource;
  kind: PropertyRecord['kind'];
  name: PropertyRecord['name'];
  slug: string;
  transactionType: PropertyRecord['transactionType'];
  projectId?: string;
  parentPropertyId?: string;
  locationId?: string;
  mapUrl?: string;
  coordinates?: PropertyCoordinates;
  description?: PropertyRecord['name'];
  propertyTypeId?: string;
  deliveryStatus?: PropertyRecord['deliveryStatus'];
  area?: PropertyDetailsStep['area'] extends infer T ? Exclude<T, null | undefined> : never;
  layout?: PropertyDetailsStep['layout'];
  price?: PropertyPricingStep['price'];
  paymentPlans?: PropertyPricingStep['paymentPlans'];
  featureIds?: string[];
  serviceIds?: string[];
  contact?: PropertyContactStep['contact'] extends infer T ? Exclude<T, null | undefined> : never;
  submittedAt?: Date;
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewReason?: string;
  publishedAt?: Date;
  status: PropertyRecord['status'];
  active: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PropertyMutationMetadata {
  actorId: string;
  reason: string;
  requestId: string;
  traceId: string;
  changedAt: Date;
}

export type PropertyWriteResult =
  | { kind: 'written'; property: StoredProperty }
  | { kind: 'slug_conflict' }
  | { kind: 'not_found' }
  | { kind: 'version_conflict' }
  | { kind: 'location_not_found' }
  | { kind: 'invalid_state' }
  | { kind: 'already_submitted'; property: StoredProperty };

export interface PropertyRepository {
  findOwned(providerId: string, id: string): Promise<StoredProperty | null>;
  findByIdAny(id: string): Promise<StoredProperty | null>;
  listOwned(providerId: string, query: PropertyListQuery): Promise<{ items: StoredProperty[]; total: number }>;
  listAdmin(query: PropertyAdminListQuery): Promise<{ items: StoredProperty[]; total: number }>;
  findPotentialDuplicates(propertyId: string, limit: number): Promise<PropertyDuplicateData | null>;
  create(input: { property: Omit<StoredProperty, 'id' | 'version' | 'createdAt' | 'updatedAt'>; metadata: PropertyMutationMetadata }): Promise<PropertyWriteResult>;
  updateCore(input: { providerId: string; id: string; expectedVersion: number; changes: PropertyCoreStep; before: StoredProperty; metadata: PropertyMutationMetadata }): Promise<PropertyWriteResult>;
  updateLocation(input: { providerId: string; id: string; expectedVersion: number; changes: PropertyLocationStep; before: StoredProperty; metadata: PropertyMutationMetadata }): Promise<PropertyWriteResult>;
  updateDetails(input: { providerId: string; id: string; expectedVersion: number; changes: PropertyDetailsStep; before: StoredProperty; metadata: PropertyMutationMetadata }): Promise<PropertyWriteResult>;
  updatePricing(input: { providerId: string; id: string; expectedVersion: number; changes: PropertyPricingStep; before: StoredProperty; metadata: PropertyMutationMetadata }): Promise<PropertyWriteResult>;
  updateFeaturesServices(input: { providerId: string; id: string; expectedVersion: number; changes: PropertyFeaturesServicesStep; before: StoredProperty; metadata: PropertyMutationMetadata }): Promise<PropertyWriteResult>;
  updateContact(input: { providerId: string; id: string; expectedVersion: number; changes: PropertyContactStep; before: StoredProperty; metadata: PropertyMutationMetadata }): Promise<PropertyWriteResult>;
  submit(input: { providerId: string; id: string; expectedVersion: number; before: StoredProperty; metadata: PropertyMutationMetadata }): Promise<PropertyWriteResult>;
  review(input: { id: string; expectedVersion: number; toStatus: Extract<PropertyRecord['status'], 'needs_changes' | 'approved' | 'rejected' | 'published'>; reviewerId: string; before: StoredProperty; metadata: PropertyMutationMetadata }): Promise<PropertyWriteResult>;
  visibility(input: { id: string; expectedVersion: number; action: 'hide' | 'restore' | 'archive'; before: StoredProperty; metadata: PropertyMutationMetadata }): Promise<PropertyWriteResult>;
}

function stored(record: PropertyRecord & { _id: Types.ObjectId }): StoredProperty {
  return {
    id: record._id.toHexString(),
    providerId: record.providerId.toHexString(),
    source: {
      providerId: record.providerId.toHexString(),
      sourceType: record.sourceType,
      ...(record.organizationId ? { organizationId: record.organizationId.toHexString() } : {})
    },
    kind: record.kind,
    name: structuredClone(record.name),
    slug: record.slug,
    transactionType: record.transactionType,
    ...(record.projectId ? { projectId: record.projectId.toHexString() } : {}),
    ...(record.parentPropertyId ? { parentPropertyId: record.parentPropertyId.toHexString() } : {}),
    ...(record.locationId ? { locationId: record.locationId.toHexString() } : {}),
    ...(record.mapUrl ? { mapUrl: record.mapUrl } : {}),
    ...(record.coordinates ? { coordinates: { longitude: record.coordinates.coordinates[0], latitude: record.coordinates.coordinates[1] } } : {}),
    ...(record.description ? { description: structuredClone(record.description) } : {}),
    ...(record.propertyTypeId ? { propertyTypeId: record.propertyTypeId.toHexString() } : {}),
    ...(record.deliveryStatus ? { deliveryStatus: record.deliveryStatus } : {}),
    ...(record.area ? { area: structuredClone(record.area) } : {}),
    ...(record.layout ? { layout: structuredClone(record.layout) } : {}),
    ...(record.price ? { price: structuredClone(record.price) } : {}),
    ...(record.paymentPlans ? { paymentPlans: structuredClone(record.paymentPlans) } : {}),
    ...(record.featureIds ? { featureIds: record.featureIds.map(value => value.toHexString()) } : {}),
    ...(record.serviceIds ? { serviceIds: record.serviceIds.map(value => value.toHexString()) } : {}),
    ...(record.contact ? { contact: structuredClone(record.contact) } : {}),
    ...(record.submittedAt ? { submittedAt: record.submittedAt } : {}),
    ...(record.reviewedBy ? { reviewedBy: record.reviewedBy.toHexString() } : {}),
    ...(record.reviewedAt ? { reviewedAt: record.reviewedAt } : {}),
    ...(record.reviewReason ? { reviewReason: record.reviewReason } : {}),
    ...(record.publishedAt ? { publishedAt: record.publishedAt } : {}),
    status: record.status,
    active: record.active,
    version: record.version,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

function duplicate(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: unknown }).code === 11000;
}

function coordinates(value: PropertyCoordinates | null | undefined): { type: 'Point'; coordinates: [number, number] } | undefined {
  return value ? { type: 'Point', coordinates: [value.longitude, value.latitude] } : undefined;
}
function normalizedName(value: string | undefined): string | undefined { const normalized = value?.trim().toLocaleLowerCase('en').replace(/\s+/g, ' '); return normalized || undefined; }

export function createMongoosePropertyRepository(connection: Connection, models: PropertyModels, audit: AuditWriter): PropertyRepository {
  async function transaction<T>(run: (session: ClientSession) => Promise<T>): Promise<T> {
    const session = await connection.startSession();
    try { return await session.withTransaction(() => run(session)); }
    finally { await session.endSession(); }
  }

  async function update(input: {
    providerId: string;
    id: string;
    expectedVersion: number;
    changes: Record<string, unknown>;
    before: StoredProperty;
    metadata: PropertyMutationMetadata;
  }): Promise<PropertyWriteResult> {
    if (!['draft', 'needs_changes'].includes(input.before.status)) return { kind: 'invalid_state' };
    try {
      return await transaction(async (session) => {
        const set: Record<string, unknown> = { ...input.changes, updatedAt: input.metadata.changedAt };
        if ('projectId' in set && set.projectId) set.projectId = new Types.ObjectId(set.projectId as string);
        if ('parentPropertyId' in set && set.parentPropertyId) set.parentPropertyId = new Types.ObjectId(set.parentPropertyId as string);
        if ('locationId' in set && set.locationId) {
          const locationExists = await connection.collection('locations').countDocuments({ _id: new Types.ObjectId(set.locationId as string), active: true }, { session, limit: 1 });
          if (!locationExists) return { kind: 'location_not_found' as const };
          set.locationId = new Types.ObjectId(set.locationId as string);
        }
        if ('propertyTypeId' in set && set.propertyTypeId) set.propertyTypeId = new Types.ObjectId(set.propertyTypeId as string);
        for (const field of ['featureIds', 'serviceIds'] as const) {
          if (field in set && Array.isArray(set[field])) set[field] = (set[field] as string[]).map(value => new Types.ObjectId(value));
        }
        if ('coordinates' in set) set.coordinates = coordinates(set.coordinates as PropertyCoordinates | null);
        const unset: Record<string, 1> = {};
        for (const field of ['projectId', 'parentPropertyId', 'locationId', 'mapUrl', 'coordinates', 'description', 'propertyTypeId', 'deliveryStatus', 'area', 'layout', 'price', 'paymentPlans', 'featureIds', 'serviceIds', 'contact']) if (set[field] === undefined || set[field] === null) { delete set[field]; unset[field] = 1; }
        const result = await models.Property.findOneAndUpdate(
          { _id: input.id, providerId: new Types.ObjectId(input.providerId), version: input.expectedVersion },
          { $set: set, ...(Object.keys(unset).length ? { $unset: unset } : {}), $inc: { version: 1 } },
          { new: true, runValidators: true, lean: true, session }
        );
        if (!result) {
          const exists = await models.Property.exists({ _id: input.id, providerId: new Types.ObjectId(input.providerId) }).session(session);
          return exists ? { kind: 'version_conflict' as const } : { kind: 'not_found' as const };
        }
        const output = stored(result as PropertyRecord & { _id: Types.ObjectId });
        await audit.record({ actorType: 'provider', actorId: input.metadata.actorId, targetType: 'property', targetId: output.id, action: 'property.update', reason: input.metadata.reason, before: input.before, after: output, requestId: input.metadata.requestId, traceId: input.metadata.traceId, occurredAt: input.metadata.changedAt }, session);
        return { kind: 'written' as const, property: output };
      });
    } catch (error) {
      if (duplicate(error)) return { kind: 'slug_conflict' };
      throw error;
    }
  }

  async function transitionState(input: {
    id: string;
    expectedVersion: number;
    filter: Record<string, unknown>;
    set: Record<string, unknown>;
    before: StoredProperty;
    metadata: PropertyMutationMetadata;
    action: string;
  }): Promise<PropertyWriteResult> {
    return transaction(async session => {
      const result = await models.Property.findOneAndUpdate(
        { _id: input.id, version: input.expectedVersion, ...input.filter },
        { $set: input.set, $inc: { version: 1 } },
        { new: true, runValidators: true, lean: true, session }
      );
      if (!result) {
        const current = await models.Property.findById(input.id).lean().session(session);
        if (!current) return { kind: 'not_found' as const };
        if (current.version !== input.expectedVersion) return { kind: 'version_conflict' as const };
        return { kind: 'invalid_state' as const };
      }
      const output = stored(result as PropertyRecord & { _id: Types.ObjectId });
      await audit.record({ actorType: 'admin', actorId: input.metadata.actorId, targetType: 'property', targetId: output.id, action: input.action, reason: input.metadata.reason, before: input.before, after: output, requestId: input.metadata.requestId, traceId: input.metadata.traceId, occurredAt: input.metadata.changedAt }, session);
      return { kind: 'written' as const, property: output };
    });
  }

  return {
    async findOwned(providerId, id) {
      const result = await models.Property.findOne({ _id: id, providerId: new Types.ObjectId(providerId) }).lean();
      return result ? stored(result as PropertyRecord & { _id: Types.ObjectId }) : null;
    },
    async findByIdAny(id) {
      const result = await models.Property.findById(id).lean();
      return result ? stored(result as PropertyRecord & { _id: Types.ObjectId }) : null;
    },
    async listOwned(providerId, query) {
      const filter: Record<string, unknown> = { providerId: new Types.ObjectId(providerId) };
      if (query.status) filter.status = query.status;
      if (query.search) filter.$text = { $search: query.search };
      const direction: 1 | -1 = query.direction === 'asc' ? 1 : -1;
      const sort: Record<string, 1 | -1> = query.sort === 'name' ? { 'name.en': direction, slug: 1 } : { [query.sort]: direction, slug: 1 };
      const [rows, total] = await Promise.all([
        models.Property.find(filter).sort(sort).skip((query.page - 1) * query.limit).limit(query.limit).lean(),
        models.Property.countDocuments(filter)
      ]);
      return { items: rows.map(row => stored(row as PropertyRecord & { _id: Types.ObjectId })), total };
    },
    async listAdmin(query) {
      const filter: Record<string, unknown> = {};
      if (query.status) filter.status = query.status;
      if (query.providerId) filter.providerId = new Types.ObjectId(query.providerId);
      if (query.locationId) filter.locationId = new Types.ObjectId(query.locationId);
      if (query.projectId) filter.projectId = new Types.ObjectId(query.projectId);
      if (query.active !== undefined) filter.active = query.active;
      if (query.search) filter.$text = { $search: query.search };
      const direction: 1 | -1 = query.direction === 'asc' ? 1 : -1;
      const sort: Record<string, 1 | -1> = query.sort === 'name' ? { 'name.en': direction, slug: 1 } : { [query.sort]: direction, slug: 1 };
      const [rows, total] = await Promise.all([
        models.Property.find(filter).sort(sort).skip((query.page - 1) * query.limit).limit(query.limit).lean(),
        models.Property.countDocuments(filter)
      ]);
      return { items: rows.map(row => stored(row as PropertyRecord & { _id: Types.ObjectId })), total };
    },
    async findPotentialDuplicates(propertyId, limit) {
      const target = await models.Property.findById(propertyId).lean();
      if (!target) return null;
      const targetRecord = target as PropertyRecord & { _id: Types.ObjectId };
      const targetNames = new Set([targetRecord.name.ar, targetRecord.name.en, targetRecord.name['zh-CN']].map(normalizedName).filter((value): value is string => Boolean(value)));
      const or: Record<string, unknown>[] = [{ slug: targetRecord.slug }];
      if (targetRecord.locationId) or.push({ locationId: targetRecord.locationId, transactionType: targetRecord.transactionType });
      for (const [locale, value] of Object.entries(targetRecord.name)) if (value) or.push({ [`name.${locale}`]: value });
      const candidates = await models.Property.find({ _id: { $ne: propertyId }, status: { $ne: 'archived' }, $or: or }).sort({ updatedAt: -1, slug: 1, _id: 1 }).limit(limit).lean();
      const items = candidates.flatMap(row => {
        const candidate = row as PropertyRecord & { _id: Types.ObjectId };
        const signals: PropertyDuplicateData['items'][number]['signals'] = [];
        if (candidate.slug === targetRecord.slug) signals.push('same_slug');
        if (targetRecord.locationId && candidate.locationId?.toHexString() === targetRecord.locationId.toHexString() && candidate.transactionType === targetRecord.transactionType) signals.push('same_location_transaction');
        const candidateNames = new Set([candidate.name.ar, candidate.name.en, candidate.name['zh-CN']].map(normalizedName).filter((value): value is string => Boolean(value)));
        if ([...targetNames].some(value => candidateNames.has(value))) signals.push('same_localized_name');
        if (!signals.length) return [];
        return [{ candidateId: candidate._id.toHexString(), signals, explanation: `Deterministic signals: ${signals.join(', ')}` }];
      });
      return { propertyId, items, total: items.length };
    },
    async create(input) {
      try {
        return await transaction(async (session) => {
          const payload = {
            providerId: new Types.ObjectId(input.property.providerId),
            sourceType: input.property.source.sourceType,
            ...(input.property.source.organizationId ? { organizationId: new Types.ObjectId(input.property.source.organizationId) } : {}),
            kind: input.property.kind,
            name: input.property.name,
            slug: input.property.slug,
            transactionType: input.property.transactionType,
            ...(input.property.projectId ? { projectId: new Types.ObjectId(input.property.projectId) } : {}),
            ...(input.property.parentPropertyId ? { parentPropertyId: new Types.ObjectId(input.property.parentPropertyId) } : {}),
            ...(input.property.locationId ? { locationId: new Types.ObjectId(input.property.locationId) } : {}),
            ...(input.property.mapUrl ? { mapUrl: input.property.mapUrl } : {}),
            ...(input.property.coordinates ? { coordinates: coordinates(input.property.coordinates) } : {}),
            ...(input.property.description ? { description: input.property.description } : {}),
            ...(input.property.propertyTypeId ? { propertyTypeId: new Types.ObjectId(input.property.propertyTypeId) } : {}),
            ...(input.property.area ? { area: input.property.area } : {}),
            ...(input.property.layout ? { layout: input.property.layout } : {}),
            ...(input.property.price ? { price: input.property.price } : {}),
            ...(input.property.paymentPlans ? { paymentPlans: input.property.paymentPlans } : {}),
            ...(input.property.featureIds ? { featureIds: input.property.featureIds.map(value => new Types.ObjectId(value)) } : {}),
            ...(input.property.serviceIds ? { serviceIds: input.property.serviceIds.map(value => new Types.ObjectId(value)) } : {}),
            ...(input.property.contact ? { contact: input.property.contact } : {}),
            status: 'draft' as const,
            active: true,
            createdAt: input.metadata.changedAt,
            updatedAt: input.metadata.changedAt
          };
          const created = new models.Property(payload);
          await created.save({ session });
          const output = stored(created.toObject() as PropertyRecord & { _id: Types.ObjectId });
          await audit.record({ actorType: 'provider', actorId: input.metadata.actorId, targetType: 'property', targetId: output.id, action: 'property.create', reason: input.metadata.reason, before: null, after: output, requestId: input.metadata.requestId, traceId: input.metadata.traceId, occurredAt: input.metadata.changedAt }, session);
          return { kind: 'written' as const, property: output };
        });
      } catch (error) {
        if (duplicate(error)) return { kind: 'slug_conflict' };
        throw error;
      }
    },
    async updateCore(input) {
      const changes = Object.fromEntries(Object.entries(input.changes).filter(([key]) => key !== 'version' && key !== 'reason'));
      return update({ ...input, changes });
    },
    async updateLocation(input) {
      const changes = Object.fromEntries(Object.entries(input.changes).filter(([key]) => key !== 'version' && key !== 'reason'));
      return update({ ...input, changes });
    },
    async updateDetails(input) {
      const changes = Object.fromEntries(Object.entries(input.changes).filter(([key]) => key !== 'version' && key !== 'reason'));
      return update({ ...input, changes });
    },
    async updatePricing(input) {
      const changes = Object.fromEntries(Object.entries(input.changes).filter(([key]) => key !== 'version' && key !== 'reason'));
      return update({ ...input, changes });
    },
    async updateFeaturesServices(input) {
      const changes = Object.fromEntries(Object.entries(input.changes).filter(([key]) => key !== 'version' && key !== 'reason'));
      return update({ ...input, changes });
    },
    async updateContact(input) {
      const changes = Object.fromEntries(Object.entries(input.changes).filter(([key]) => key !== 'version' && key !== 'reason'));
      return update({ ...input, changes });
    },
    async submit(input) {
      return transaction(async session => {
        const result = await models.Property.findOneAndUpdate({ _id: input.id, providerId: new Types.ObjectId(input.providerId), version: input.expectedVersion, status: { $in: ['draft', 'needs_changes'] } }, { $set: { status: 'pending_review', submittedAt: input.metadata.changedAt, updatedAt: input.metadata.changedAt }, $inc: { version: 1 } }, { new: true, runValidators: true, lean: true, session });
        if (!result) {
          const current = await models.Property.findOne({ _id: input.id, providerId: new Types.ObjectId(input.providerId) }).lean().session(session);
          if (!current) return { kind: 'not_found' as const };
          if (current.status === 'pending_review') return { kind: 'already_submitted' as const, property: stored(current as PropertyRecord & { _id: Types.ObjectId }) };
          if (current.version !== input.expectedVersion) return { kind: 'version_conflict' as const };
          return { kind: 'invalid_state' as const };
        }
        const output = stored(result as PropertyRecord & { _id: Types.ObjectId });
        await audit.record({ actorType: 'provider', actorId: input.metadata.actorId, targetType: 'property', targetId: output.id, action: 'property.submit', reason: input.metadata.reason, before: input.before, after: output, requestId: input.metadata.requestId, traceId: input.metadata.traceId, occurredAt: input.metadata.changedAt }, session);
        return { kind: 'written' as const, property: output };
      });
    },
    async review(input) {
      const set: Record<string, unknown> = {
        status: input.toStatus,
        reviewedBy: new Types.ObjectId(input.reviewerId),
        reviewedAt: input.metadata.changedAt,
        reviewReason: input.metadata.reason,
        updatedAt: input.metadata.changedAt,
        ...(input.toStatus === 'published' ? { publishedAt: input.metadata.changedAt, active: true } : { active: false })
      };
      return transitionState({ id: input.id, expectedVersion: input.expectedVersion, filter: { status: input.toStatus === 'published' ? 'approved' : 'pending_review' }, set, before: input.before, metadata: input.metadata, action: 'property.review' });
    },
    async visibility(input) {
      const target = input.action === 'hide' ? 'hidden' : input.action === 'restore' ? 'published' : 'archived';
      const filter = input.action === 'hide' ? { status: { $in: ['published', 'approved'] } } : input.action === 'restore' ? { status: 'hidden' } : { status: { $ne: 'archived' } };
      return transitionState({ id: input.id, expectedVersion: input.expectedVersion, filter, set: { status: target, active: input.action === 'restore', updatedAt: input.metadata.changedAt }, before: input.before, metadata: input.metadata, action: 'property.visibility' });
    }
  };
}
