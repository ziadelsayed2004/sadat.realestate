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
    ...(typeof row.imageUrl === 'string' ? { imageUrl: row.imageUrl } : {}),
    ...(row.locationName !== undefined ? { locationName: row.locationName } : {}),
    ...(row.sourceName !== undefined ? { sourceName: row.sourceName } : {}),
    ...(typeof row.sourceImageUrl === 'string' ? { sourceImageUrl: row.sourceImageUrl } : {}),
    ...(typeof row.sourceType === 'string' ? { sourceType: row.sourceType } : {}),
    ...(typeof row.sourceVerified === 'boolean' ? { sourceVerified: row.sourceVerified } : {}),
    ...(typeof row.publicCode === 'string' ? { publicCode: row.publicCode } : {}),
    ...(typeof row.viewCount === 'number' ? { viewCount: row.viewCount } : {}),
    ...(typeof row.installmentAvailable === 'boolean' ? { installmentAvailable: row.installmentAvailable } : {}),
    ...(typeof row.featured === 'boolean' ? { featured: row.featured } : {}),
    ...(typeof row.deliveryStatus === 'string' ? { deliveryStatus: row.deliveryStatus } : {}),
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
  const projection = { _id: 1, slug: 1, kind: 1, name: 1, transactionType: 1, imageUrl: 1, locationId: 1, organizationId: 1, sourceType: 1, publicCode: 1, viewCount: 1, paymentPlans: 1, featured: 1, deliveryStatus: 1, projectId: 1, description: 1, area: 1, layout: 1, price: 1, status: 1, active: 1 };
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
      const propertyRows = await properties.find({ _id: { $in: mapped.map(value => new Types.ObjectId(value.propertyId)) } }, { projection }).toArray();
      const locationIds = propertyRows.flatMap(row => { const value = id(row.locationId); return value ? [new Types.ObjectId(value)] : []; });
      const organizationIds = propertyRows.flatMap(row => { const value = id(row.organizationId); return value ? [new Types.ObjectId(value)] : []; });
      const [locationRows, organizationRows] = await Promise.all([
        locationIds.length ? connection.collection('locations').find({ _id: { $in: locationIds }, active: true }, { projection: { _id: 1, name: 1 } }).toArray() : [],
        organizationIds.length ? connection.collection('organizations').find({ _id: { $in: organizationIds }, status: 'approved' }, { projection: { _id: 1, name: 1, imageUrl: 1 } }).toArray() : []
      ]);
      const locations = new Map(locationRows.flatMap(row => { const value = id(row._id); return value && row.name !== undefined ? [[value, row.name] as const] : []; }));
      const organizations = new Map(organizationRows.flatMap(row => { const value = id(row._id); return value && row.name !== undefined ? [[value, { name: row.name, ...(typeof row.imageUrl === 'string' ? { imageUrl: row.imageUrl } : {}) }] as const] : []; }));
      const propertiesById = new Map(propertyRows.flatMap(row => {
        const locationId = id(row.locationId); const organizationId = id(row.organizationId); const organization = organizationId ? organizations.get(organizationId) : undefined;
        const value = property({ ...row, ...(locationId && locations.has(locationId) ? { locationName: locations.get(locationId) } : {}), ...(organization ? { sourceName: organization.name, ...(organization.imageUrl ? { sourceImageUrl: organization.imageUrl } : {}), sourceVerified: true } : {}), installmentAvailable: Array.isArray(row.paymentPlans) && row.paymentPlans.length > 0 });
        return value ? [[value.id, value] as const] : [];
      }));
      return mapped.flatMap(value => { const source = propertiesById.get(value.propertyId); return source ? [{ favorite: value, property: source }] : []; });
    }
  };
}
