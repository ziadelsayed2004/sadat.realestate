import { Types, type Connection, type Model } from 'mongoose';
import type { PropertyCoreStep } from '@sadat-real-estate/contracts';
import type { AuditWriter } from '../audit/writer.js';
import { propertySchema, type PropertyModels, type PropertyRecord } from './models.js';
import type { PropertyRepository, PropertyWriteResult, StoredProperty } from './repository.js';

const editable = ['imageUrl', 'name', 'slug', 'transactionType', 'projectId', 'parentPropertyId', 'locationId', 'mapUrl', 'coordinates', 'description', 'propertyTypeId', 'deliveryStatus', 'area', 'layout', 'price', 'paymentPlans', 'featureIds', 'serviceIds', 'contact'] as const;

// Keep the public record and its media untouched until the owner explicitly submits.
// Drafts retain the same IDs, so existing links and the eight-step editor stay stable.
export function createPropertyEditDrafts(connection: Connection, models: PropertyModels, audit: AuditWriter, stored: (row: PropertyRecord & { _id: Types.ObjectId }) => StoredProperty, repository: (models: PropertyModels) => PropertyRepository) {
  const Draft = (connection.models.PropertyEditDraft as Model<PropertyRecord> | undefined) ?? connection.model<PropertyRecord>('PropertyEditDraft', propertySchema, 'property_edit_drafts');
  const drafts = repository({ Property: Draft });
  const draftFields = new Set(Object.keys(propertySchema.paths).map(key => key.split('.')[0]));
  async function transaction(run: (session: import('mongoose').ClientSession) => Promise<PropertyWriteResult>) {
    const session = await connection.startSession();
    try { return await session.withTransaction(() => run(session)); }
    catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 11000 && 'keyPattern' in error && error.keyPattern && typeof error.keyPattern === 'object' && 'slug' in error.keyPattern) return { kind: 'slug_conflict' as const };
      throw error;
    } finally { await session.endSession(); }
  }
  return {
    async findOwned(providerId: string, id: string) {
      const live = await models.Property.exists({ _id: id, providerId, status: 'published', active: true, hasEditDraft: true });
      return live ? drafts.findOwned(providerId, id) : null;
    },
    async update(input: { providerId: string; id: string; expectedVersion: number; changes: Record<string, unknown>; before: StoredProperty; metadata: import('./repository.js').PropertyMutationMetadata }): Promise<PropertyWriteResult> {
      if (typeof input.changes.slug === 'string' && await models.Property.exists({ providerId: input.providerId, _id: { $ne: input.id }, slug: input.changes.slug })) return { kind: 'slug_conflict' };
      return drafts.updateCore({ ...input, changes: { ...input.changes, version: input.expectedVersion, reason: input.metadata.reason } as PropertyCoreStep });
    },
    start(input: Parameters<PropertyRepository['visibility']>[0]) {
      return transaction(async session => {
        const row = await models.Property.findOneAndUpdate({ _id: input.id, providerId: input.metadata.actorId, version: input.expectedVersion, status: 'published', active: true, hasEditDraft: { $ne: true }, 'deactivationRequest.status': { $ne: 'pending' } }, { $set: { hasEditDraft: true }, $inc: { version: 1 } }, { new: true, lean: true, session });
        if (!row) return { kind: 'version_conflict' };
        // Raw analytics/legacy fields (e.g. viewCount/publicCode) can be present
        // on lean public records. Keep them on the original, outside the strict draft schema.
        const draft = { ...Object.fromEntries(Object.entries(row).filter(([key]) => draftFields.has(key))), status: 'needs_changes', editingPublishedVersion: row.version, version: row.version, updatedAt: input.metadata.changedAt } as PropertyRecord & { _id: Types.ObjectId };
        await Draft.replaceOne({ _id: row._id }, draft, { upsert: true, session, runValidators: true });
        const media = await connection.collection('property_media').find({ propertyId: row._id }, { session }).toArray();
        await connection.collection('property_media_drafts').deleteMany({ propertyId: row._id }, { session });
        if (media.length) await connection.collection('property_media_drafts').insertMany(media, { session });
        const output = stored(draft as PropertyRecord & { _id: Types.ObjectId });
        await audit.record({ actorType: 'provider', actorId: input.metadata.actorId, targetType: 'property', targetId: input.id, action: 'property.start_edit', reason: input.metadata.reason, before: input.before, after: output, requestId: input.metadata.requestId, traceId: input.metadata.traceId, occurredAt: input.metadata.changedAt }, session);
        return { kind: 'written', property: output };
      });
    },
    submit(input: Parameters<PropertyRepository['submit']>[0]) {
      return transaction(async session => {
        const draft = await Draft.findOne({ _id: input.id, providerId: input.providerId, version: input.expectedVersion }).lean().session(session);
        if (!draft || draft.editingPublishedVersion === undefined) return { kind: 'version_conflict' };
        const set: Record<string, unknown> = { status: 'pending_review', active: true, submittedAt: input.metadata.changedAt, updatedAt: input.metadata.changedAt, version: draft.version + 1 };
        const unset: Record<string, 1> = { hasEditDraft: 1 };
        for (const key of editable) { if (draft[key] !== undefined) set[key] = draft[key]; else unset[key] = 1; }
        const row = await models.Property.findOneAndUpdate({ _id: input.id, providerId: input.providerId, version: draft.editingPublishedVersion, status: 'published', active: true, hasEditDraft: true, 'deactivationRequest.status': { $ne: 'pending' } }, { $set: set, $unset: unset }, { new: true, lean: true, session, runValidators: true });
        if (!row) return { kind: 'version_conflict' };
        const media = await connection.collection('property_media_drafts').find({ propertyId: row._id }, { session }).toArray();
        await connection.collection('property_media').deleteMany({ propertyId: row._id }, { session });
        if (media.length) await connection.collection('property_media').insertMany(media, { session });
        await connection.collection('property_media_drafts').deleteMany({ propertyId: row._id }, { session });
        await Draft.deleteOne({ _id: row._id }, { session });
        const output = stored(row as PropertyRecord & { _id: Types.ObjectId });
        await audit.record({ actorType: 'provider', actorId: input.metadata.actorId, targetType: 'property', targetId: input.id, action: 'property.submit', reason: input.metadata.reason, before: input.before, after: output, requestId: input.metadata.requestId, traceId: input.metadata.traceId, occurredAt: input.metadata.changedAt }, session);
        return { kind: 'written', property: output };
      });
    }
  };
}
