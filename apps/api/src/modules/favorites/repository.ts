import { Types, type Connection } from 'mongoose';
import type { FavoritePropertySource, FavoriteRecord, FavoriteRepository } from './service.js';

type Row = Record<string, unknown>;

function id(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && typeof (value as { toHexString?: () => string }).toHexString === 'function') {
    return (value as { toHexString: () => string }).toHexString();
  }
  return undefined;
}

function property(row: Row): FavoritePropertySource | null {
  const rowId = id(row._id);
  const projectId = id(row.projectId);
  if (!rowId || typeof row.slug !== 'string' || typeof row.kind !== 'string' || row.name === undefined || typeof row.transactionType !== 'string' || typeof row.status !== 'string' || typeof row.active !== 'boolean') return null;
  return {
    id: rowId, slug: row.slug, kind: row.kind, name: row.name, transactionType: row.transactionType,
    ...(projectId ? { projectId } : {}), ...(row.description !== undefined ? { description: row.description } : {}),
    ...(row.area !== undefined ? { area: row.area } : {}), ...(row.layout !== undefined ? { layout: row.layout } : {}),
    ...(row.price !== undefined ? { price: row.price } : {}), status: row.status, active: row.active
  };
}

function favorite(row: Row): FavoriteRecord | null {
  const seekerId = id(row.seekerId);
  const propertyId = id(row.propertyId);
  const savedAt = row.savedAt instanceof Date ? row.savedAt : undefined;
  return seekerId && propertyId && savedAt ? { seekerId, propertyId, savedAt } : null;
}

const duplicate = (error: unknown) => typeof error === 'object' && error !== null && 'code' in error && (error as { code?: unknown }).code === 11000;

export function createMongooseFavoriteRepository(connection: Connection): FavoriteRepository {
  const favorites = connection.collection('favorites');
  const properties = connection.collection('properties');
  const projection = { _id: 1, slug: 1, kind: 1, name: 1, transactionType: 1, projectId: 1, description: 1, area: 1, layout: 1, price: 1, status: 1, active: 1 };
  let indexReady: Promise<unknown> | undefined;
  function ensureIndex(): Promise<unknown> {
    indexReady ??= favorites.createIndex({ seekerId: 1, propertyId: 1 }, { unique: true, name: 'favorites_seeker_property_unique' });
    return indexReady;
  }
  return {
    async save(seekerId, propertyId, now) {
      await ensureIndex();
      const sourceRow = await properties.findOne({ _id: new Types.ObjectId(propertyId), status: 'published', active: true }, { projection });
      const source = property(sourceRow as Row | null ?? {});
      if (!source) return { kind: 'unavailable' };
      try {
        await favorites.insertOne({ seekerId: new Types.ObjectId(seekerId), propertyId: new Types.ObjectId(propertyId), savedAt: now });
        return { kind: 'created', favorite: { seekerId, propertyId, savedAt: now }, property: source };
      } catch (error) {
        if (!duplicate(error)) throw error;
        const existing = favorite(await favorites.findOne({ seekerId: new Types.ObjectId(seekerId), propertyId: new Types.ObjectId(propertyId) }) as Row | null ?? {});
        return existing ? { kind: 'existing', favorite: existing, property: source } : { kind: 'unavailable' };
      }
    },
    async remove(seekerId, propertyId) {
      const result = await favorites.deleteOne({ seekerId: new Types.ObjectId(seekerId), propertyId: new Types.ObjectId(propertyId) });
      return result.deletedCount > 0;
    },
    async list(seekerId, page, limit) {
      const rows = await favorites.find({ seekerId: new Types.ObjectId(seekerId) }, { projection: { _id: 0, seekerId: 1, propertyId: 1, savedAt: 1 } }).sort({ savedAt: -1, propertyId: 1 }).skip((page - 1) * limit).limit(limit).toArray();
      const mapped = rows.flatMap(row => { const value = favorite(row as Row); return value ? [value] : []; });
      if (!mapped.length) return [];
      const propertiesById = new Map((await properties.find({ _id: { $in: mapped.map(value => new Types.ObjectId(value.propertyId)) } }, { projection }).toArray()).flatMap(row => { const value = property(row as Row); return value ? [[value.id, value] as const] : []; }));
      return mapped.flatMap(value => { const source = propertiesById.get(value.propertyId); return source ? [{ favorite: value, property: source }] : []; });
    }
  };
}
