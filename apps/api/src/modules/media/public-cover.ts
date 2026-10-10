import { Types, type Connection } from 'mongoose';

export interface PublicCoverMedia {
  readonly id: string;
  readonly imageUrl?: string;
  readonly kind: string;
  readonly active: boolean;
  readonly processingState: string;
  readonly isCover: boolean;
  readonly sortOrder: number;
}

/** Uploaded, ready images are authoritative; a video can never become a card cover. */
export function publicPropertyCoverUrl(propertyId: string, media: readonly PublicCoverMedia[], legacyUrl?: string): string | undefined {
  const cover = media.filter(item => item.kind === 'image' && item.active && item.processingState === 'ready')
    // Old demo records may retain a cover flag after a real photo is uploaded.
    .sort((left, right) => Number(right.isCover) - Number(left.isCover)
      || Number(!!left.imageUrl && !left.imageUrl.startsWith('/api/v1/public/properties/')) - Number(!!right.imageUrl && !right.imageUrl.startsWith('/api/v1/public/properties/'))
      || left.sortOrder - right.sortOrder || left.id.localeCompare(right.id, 'en'))[0];
  if (cover) return cover.imageUrl ?? `/api/v1/public/properties/${propertyId}/media/${cover.id}/content`;
  // Do not resurrect an old uploaded cover after its last ready image was removed.
  return legacyUrl?.startsWith('/api/v1/public/properties/') ? undefined : legacyUrl;
}

/** One bounded query for the properties already selected by a public repository. */
export async function attachPublicPropertyCovers<T extends { _id?: unknown; imageUrl?: string }>(connection: Connection, rows: readonly T[]): Promise<T[]> {
  if (!rows.length) return [];
  const ids = rows.flatMap(row => row._id instanceof Types.ObjectId ? [row._id] : []);
  if (!ids.length) return [...rows];
  const media = await connection.collection('property_media').find({ propertyId: { $in: ids }, kind: 'image', active: true, processingState: 'ready' }, {
    projection: { _id: 1, propertyId: 1, kind: 1, active: 1, processingState: 1, isCover: 1, sortOrder: 1, imageUrl: 1 }
  }).toArray();
  const grouped = new Map<string, PublicCoverMedia[]>();
  for (const item of media) {
    if (!(item._id instanceof Types.ObjectId) || !(item.propertyId instanceof Types.ObjectId)) continue;
    const key = item.propertyId.toHexString();
    const items = grouped.get(key) ?? [];
    items.push({ id: item._id.toHexString(), ...(typeof item.imageUrl === 'string' ? { imageUrl: item.imageUrl } : {}), kind: item.kind, active: item.active, processingState: item.processingState, isCover: item.isCover, sortOrder: item.sortOrder });
    grouped.set(key, items);
  }
  return rows.map(row => {
    if (!(row._id instanceof Types.ObjectId)) return row;
    const key = row._id.toHexString();
    const imageUrl = publicPropertyCoverUrl(key, grouped.get(key) ?? [], row.imageUrl);
    const next = { ...row };
    if (imageUrl) next.imageUrl = imageUrl;
    else delete next.imageUrl;
    return next;
  });
}
