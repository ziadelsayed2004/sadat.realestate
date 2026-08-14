import { Types, type Connection } from 'mongoose';
import { propertySlugSchema, publicHomepagePropertySchema, publicPropertyDetailsSchema, type PublicPropertyDetails } from '@sadat-real-estate/contracts';

export interface PublicPropertyDetailsSource {
  id: string;
  slug: string;
  kind: string;
  name: unknown;
  transactionType: string;
  sourceType: string;
  organizationId?: string;
  projectId?: string;
  description?: unknown;
  area?: unknown;
  layout?: unknown;
  price?: unknown;
  status: string;
  active: boolean;
  project?: { id: string; slug: string; name: unknown; description?: unknown; status: string } | null;
  media: Array<{ id: string; propertyId: string; kind: string; originalFilename: string; detectedMime: string; byteSize: number; sortOrder: number; isCover: boolean; processingState: string; active: boolean }>;
  relatedProperties: Array<{ id: string; slug: string; kind: string; name: unknown; transactionType: string; projectId?: string; description?: unknown; area?: unknown; layout?: unknown; price?: unknown; status: string; active: boolean }>;
}

export interface PublicPropertyDetailsRepository { findBySlug(slug: string): Promise<PublicPropertyDetailsSource | null> }

function card(source: { id: string; slug: string; kind: string; name: unknown; transactionType: string; projectId?: string; description?: unknown; area?: unknown; layout?: unknown; price?: unknown; status: string; active: boolean }) {
  const parsed = publicHomepagePropertySchema.safeParse({ id: source.id, slug: source.slug, kind: source.kind, name: source.name, transactionType: source.transactionType, ...(source.projectId ? { projectId: source.projectId } : {}), ...(source.description !== undefined ? { description: source.description } : {}), ...(source.area !== undefined ? { area: source.area } : {}), ...(source.layout !== undefined ? { layout: source.layout } : {}), ...(source.price !== undefined ? { price: source.price } : {}) });
  return parsed.success ? parsed.data : null;
}

export function publicPropertyDetailsProjection(source: PublicPropertyDetailsSource): PublicPropertyDetails | null {
  if (source.status !== 'published' || !source.active) return null;
  const property = card(source);
  if (!property) return null;
  const relatedProperties = source.relatedProperties.filter((value) => value.status === 'published' && value.active).flatMap((value) => { const result = card(value); return result ? [result] : []; }).sort((left, right) => left.slug.localeCompare(right.slug, 'en') || left.id.localeCompare(right.id, 'en')).slice(0, 20);
  const media = source.media.filter((value) => value.active && value.processingState === 'ready').flatMap((value) => {
    const result = { id: value.id, propertyId: value.propertyId, kind: value.kind, originalFilename: value.originalFilename, detectedMime: value.detectedMime, byteSize: value.byteSize, sortOrder: value.sortOrder, isCover: value.isCover };
    return result.kind === 'image' || result.kind === 'floor_plan' ? (result.detectedMime === 'application/pdf' || result.detectedMime === 'image/jpeg' || result.detectedMime === 'image/png' ? [result] : []) : [];
  }).sort((left, right) => left.sortOrder - right.sortOrder || left.id.localeCompare(right.id, 'en')).slice(0, 50);
  const project = source.project && source.project.status === 'published' ? { id: source.project.id, slug: source.project.slug, name: source.project.name, ...(source.project.description !== undefined ? { description: source.project.description } : {}) } : null;
  return publicPropertyDetailsSchema.parse({ ...property, source: { sourceType: source.sourceType, ...(source.organizationId ? { organizationId: source.organizationId } : {}) }, seo: { title: source.name, ...(source.description !== undefined ? { description: source.description } : {}), slug: source.slug }, project, media, relatedProperties });
}

export function createPublicPropertyDetailsService(dependencies: { repository: PublicPropertyDetailsRepository }) {
  return { async get(slug: string): Promise<PublicPropertyDetails | null> { const source = await dependencies.repository.findBySlug(propertySlugSchema.parse(slug)); return source ? publicPropertyDetailsProjection(source) : null; } };
}

type Row = Record<string, unknown>;
function id(value: unknown): string | undefined { if (typeof value === 'string') return value; if (value && typeof value === 'object' && typeof (value as { toHexString?: () => string }).toHexString === 'function') return (value as { toHexString: () => string }).toHexString(); return undefined; }
function property(row: Row): PublicPropertyDetailsSource | null {
  const rowId = id(row._id); const slug = row.slug; const kind = row.kind; const name = row.name; const transactionType = row.transactionType; const sourceType = row.sourceType; const status = row.status; const active = row.active;
  if (!rowId || typeof slug !== 'string' || typeof kind !== 'string' || name === undefined || typeof transactionType !== 'string' || typeof sourceType !== 'string' || typeof status !== 'string' || typeof active !== 'boolean') return null;
  const projectId = id(row.projectId); const organizationId = id(row.organizationId);
  return { id: rowId, slug, kind, name, transactionType, sourceType, ...(organizationId ? { organizationId } : {}), ...(projectId ? { projectId } : {}), ...(row.description !== undefined ? { description: row.description } : {}), ...(row.area !== undefined ? { area: row.area } : {}), ...(row.layout !== undefined ? { layout: row.layout } : {}), ...(row.price !== undefined ? { price: row.price } : {}), status, active, media: [], relatedProperties: [] };
}

export function createMongoosePublicPropertyDetailsRepository(connection: Connection): PublicPropertyDetailsRepository {
  return { async findBySlug(slug) {
    const properties = connection.collection('properties');
    const row = await properties.findOne({ slug, status: 'published', active: true }, { projection: { _id: 1, slug: 1, kind: 1, name: 1, transactionType: 1, sourceType: 1, organizationId: 1, projectId: 1, description: 1, area: 1, layout: 1, price: 1, status: 1, active: 1 } });
    const base = property(row as Row | null ?? {}); if (!base) return null;
    const project = base.projectId ? await connection.collection('projects').findOne({ _id: new Types.ObjectId(base.projectId), status: 'published' }, { projection: { _id: 1, slug: 1, name: 1, description: 1, status: 1 } }) : null;
    const media = await connection.collection('property_media').find({ propertyId: new Types.ObjectId(base.id), active: true, processingState: 'ready' }, { projection: { _id: 1, propertyId: 1, kind: 1, originalFilename: 1, detectedMime: 1, byteSize: 1, sortOrder: 1, isCover: 1, processingState: 1, active: 1 } }).sort({ sortOrder: 1, _id: 1 }).limit(50).toArray();
    const relatedRows = base.projectId ? await properties.find({ projectId: new Types.ObjectId(base.projectId), _id: { $ne: new Types.ObjectId(base.id) }, status: 'published', active: true }, { projection: { _id: 1, slug: 1, kind: 1, name: 1, transactionType: 1, projectId: 1, description: 1, area: 1, layout: 1, price: 1, status: 1, active: 1 } }).sort({ slug: 1, _id: 1 }).limit(20).toArray() : [];
    const mappedProject = project ? { id: id(project._id) ?? '', slug: String(project.slug ?? ''), name: project.name, ...(project.description !== undefined ? { description: project.description } : {}), status: String(project.status ?? '') } : null;
    const mappedMedia = media.flatMap((value) => { const mediaId = id(value._id); const propertyId = id(value.propertyId); return mediaId && propertyId && typeof value.kind === 'string' && typeof value.originalFilename === 'string' && typeof value.detectedMime === 'string' && typeof value.byteSize === 'number' && typeof value.sortOrder === 'number' && typeof value.isCover === 'boolean' && typeof value.processingState === 'string' && typeof value.active === 'boolean' ? [{ id: mediaId, propertyId, kind: value.kind, originalFilename: value.originalFilename, detectedMime: value.detectedMime, byteSize: value.byteSize, sortOrder: value.sortOrder, isCover: value.isCover, processingState: value.processingState, active: value.active }] : []; });
    const relatedProperties = relatedRows.flatMap((value) => { const mapped = property(value as Row); return mapped ? [{ id: mapped.id, slug: mapped.slug, kind: mapped.kind, name: mapped.name, transactionType: mapped.transactionType, ...(mapped.projectId ? { projectId: mapped.projectId } : {}), ...(mapped.description !== undefined ? { description: mapped.description } : {}), ...(mapped.area !== undefined ? { area: mapped.area } : {}), ...(mapped.layout !== undefined ? { layout: mapped.layout } : {}), ...(mapped.price !== undefined ? { price: mapped.price } : {}), status: mapped.status, active: mapped.active }] : []; });
    return { ...base, project: mappedProject, media: mappedMedia, relatedProperties };
  } };
}
