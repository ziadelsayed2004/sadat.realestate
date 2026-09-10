import type { Connection } from 'mongoose';
import {
  publicSitemapDataSchema,
  type PublicSitemapData,
  type PublicSitemapItem
} from '@sadat-real-estate/contracts';

const STATIC_PATHS = ['/', '/properties', '/developers', '/articles', '/community', '/about', '/team'] as const;

export interface PublicSitemapSource {
  list(): Promise<PublicSitemapItem[]>;
}

function item(prefix: string, row: Record<string, unknown>): PublicSitemapItem | undefined {
  if (typeof row.slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(row.slug)) return undefined;
  return {
    path: `${prefix}/${row.slug}`,
    ...(row.updatedAt instanceof Date ? { updatedAt: row.updatedAt.toISOString() } : {})
  };
}

export function createMongoosePublicSitemapSource(connection: Connection): PublicSitemapSource {
  return {
    async list() {
      const projection = { slug: 1, updatedAt: 1 };
      const [properties, organizations, articles] = await Promise.all([
        connection.collection('properties').find({ status: 'published', active: true }, { projection }).sort({ slug: 1 }).limit(5_000).toArray(),
        connection.collection('organizations').find({ status: 'approved' }, { projection }).sort({ slug: 1 }).limit(2_000).toArray(),
        connection.collection('articles').find({ status: 'published' }, { projection }).sort({ slug: 1 }).limit(2_000).toArray()
      ]);
      return [
        ...STATIC_PATHS.map(path => ({ path })),
        ...properties.flatMap(row => item('/properties', row) ?? []),
        ...organizations.flatMap(row => item('/developers', row) ?? []),
        ...articles.flatMap(row => item('/articles', row) ?? [])
      ];
    }
  };
}

export function createPublicSitemapService(source: PublicSitemapSource) {
  return {
    async read(): Promise<PublicSitemapData> {
      const unique = new Map((await source.list()).map(entry => [entry.path, entry]));
      return publicSitemapDataSchema.parse({ items: [...unique.values()] });
    }
  };
}

export type PublicSitemapService = ReturnType<typeof createPublicSitemapService>;
