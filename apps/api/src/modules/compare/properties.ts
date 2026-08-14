import { Types, type Connection } from 'mongoose';
import { PUBLIC_PROPERTY_COMPARISON_FIELDS, publicHomepagePropertySchema, publicPropertyCompareRequestSchema, publicPropertyComparisonDataSchema, type PublicPropertyComparisonData } from '@sadat-real-estate/contracts';

export interface PublicPropertyComparisonSource { id: string; slug: string; kind: string; name: unknown; transactionType: string; projectId?: string; description?: unknown; area?: unknown; layout?: unknown; price?: unknown; status: string; active: boolean }
export interface PublicPropertyComparisonRepository { findPublished(ids: string[]): Promise<PublicPropertyComparisonSource[]> }
export class PublicPropertyComparisonError extends Error { constructor(readonly code: 'PROPERTY_UNAVAILABLE') { super(code); this.name = 'PublicPropertyComparisonError'; } }

function card(source: PublicPropertyComparisonSource) {
  const parsed = publicHomepagePropertySchema.safeParse({ id: source.id, slug: source.slug, kind: source.kind, name: source.name, transactionType: source.transactionType, ...(source.projectId ? { projectId: source.projectId } : {}), ...(source.description !== undefined ? { description: source.description } : {}), ...(source.area !== undefined ? { area: source.area } : {}), ...(source.layout !== undefined ? { layout: source.layout } : {}), ...(source.price !== undefined ? { price: source.price } : {}) });
  return parsed.success ? parsed.data : null;
}

export function createPublicPropertyComparisonService(dependencies: { repository: PublicPropertyComparisonRepository }) {
  return { async compare(unparsedInput: unknown): Promise<PublicPropertyComparisonData> {
    const input = publicPropertyCompareRequestSchema.parse(unparsedInput);
    const rows = await dependencies.repository.findPublished(input.propertyIds);
    const byId = new Map(rows.map((row) => [row.id, row]));
    const items = input.propertyIds.map((id) => byId.get(id)).flatMap((row) => row ? (card(row) ? [card(row)!] : []) : []);
    if (items.length !== input.propertyIds.length) throw new PublicPropertyComparisonError('PROPERTY_UNAVAILABLE');
    return publicPropertyComparisonDataSchema.parse({ items, fields: [...PUBLIC_PROPERTY_COMPARISON_FIELDS] });
  } };
}

type Row = Record<string, unknown>;
function id(value: unknown): string | undefined { if (typeof value === 'string') return value; if (value && typeof value === 'object' && typeof (value as { toHexString?: () => string }).toHexString === 'function') return (value as { toHexString: () => string }).toHexString(); return undefined; }
function mapRow(row: Row): PublicPropertyComparisonSource | null {
  const rowId = id(row._id); const projectId = id(row.projectId);
  if (!rowId || typeof row.slug !== 'string' || typeof row.kind !== 'string' || row.name === undefined || typeof row.transactionType !== 'string' || typeof row.status !== 'string' || typeof row.active !== 'boolean') return null;
  return { id: rowId, slug: row.slug, kind: row.kind, name: row.name, transactionType: row.transactionType, ...(projectId ? { projectId } : {}), ...(row.description !== undefined ? { description: row.description } : {}), ...(row.area !== undefined ? { area: row.area } : {}), ...(row.layout !== undefined ? { layout: row.layout } : {}), ...(row.price !== undefined ? { price: row.price } : {}), status: row.status, active: row.active };
}

export function createMongoosePublicPropertyComparisonRepository(connection: Connection): PublicPropertyComparisonRepository {
  return { async findPublished(ids) {
    const rows = await connection.collection('properties').find({ _id: { $in: ids.map((value) => new Types.ObjectId(value)) }, status: 'published', active: true }, { projection: { _id: 1, slug: 1, kind: 1, name: 1, transactionType: 1, projectId: 1, description: 1, area: 1, layout: 1, price: 1, status: 1, active: 1 } }).toArray();
    return rows.flatMap((row) => { const value = mapRow(row as Row); return value ? [value] : []; });
  } };
}
