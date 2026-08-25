import type { Connection } from 'mongoose';
import {
  publicHomepageBannerSchema,
  publicHomepageContentSchema,
  publicHomepageDataSchema,
  publicHomepageDeveloperSchema,
  publicHomepagePropertySchema,
  publicHomepageSectionSchema,
  type PublicHomepageData
} from '@sadat-real-estate/contracts';

export interface HomepageSectionSource { key: string; title: unknown; body?: unknown; order: number; status: string; visible: boolean }
export interface HomepagePropertySource { id: string; slug: string; kind: string; name: unknown; transactionType: string; imageUrl?: string; projectId?: string; description?: unknown; area?: unknown; layout?: unknown; price?: unknown; status: string; active: boolean }
export interface HomepageDeveloperSource { id: string; slug: string; name: unknown; imageUrl?: string; description?: unknown; kind: string; status: string }
export interface HomepageContentSource { key: string; type: 'article' | 'community' | 'about' | 'tip'; title: unknown; imageUrl?: string; body?: unknown; order: number; status: string; active?: boolean }
export interface HomepageBannerSource { key: string; title?: unknown; imageUrl?: string; targetUrl?: string; order: number; status: string; active?: boolean }

export interface HomepageSources {
  sections: HomepageSectionSource[];
  properties: HomepagePropertySource[];
  developers: HomepageDeveloperSource[];
  content: HomepageContentSource[];
  banners: HomepageBannerSource[];
}

export interface PublicHomepageRepository { read(): Promise<HomepageSources> }

function stableOrder<T extends { order: number; key: string }>(items: T[]): T[] {
  return [...items].sort((left, right) => left.order - right.order || left.key.localeCompare(right.key, 'en'));
}

function publicSections(items: HomepageSectionSource[]) {
  return stableOrder(items.filter((item) => item.status === 'published' && item.visible).flatMap((item) => {
    const parsed = publicHomepageSectionSchema.safeParse({ key: item.key, title: item.title, ...(item.body !== undefined ? { body: item.body } : {}), order: item.order });
    return parsed.success ? [parsed.data] : [];
  }));
}

function publicProperties(items: HomepagePropertySource[]) {
  return [...items].filter((item) => item.status === 'published' && item.active).sort((left, right) => left.slug.localeCompare(right.slug, 'en') || left.id.localeCompare(right.id, 'en')).flatMap((item) => {
    const parsed = publicHomepagePropertySchema.safeParse({
      id: item.id, slug: item.slug, kind: item.kind, name: item.name, transactionType: item.transactionType,
      ...(item.imageUrl ? { imageUrl: item.imageUrl } : {}),
      ...(item.projectId ? { projectId: item.projectId } : {}), ...(item.description !== undefined ? { description: item.description } : {}),
      ...(item.area !== undefined ? { area: item.area } : {}), ...(item.layout !== undefined ? { layout: item.layout } : {}), ...(item.price !== undefined ? { price: item.price } : {})
    });
    return parsed.success ? [parsed.data] : [];
  });
}

function publicDevelopers(items: HomepageDeveloperSource[]) {
  return [...items].filter((item) => item.status === 'approved' && item.kind === 'developer_company').sort((left, right) => left.slug.localeCompare(right.slug, 'en') || left.id.localeCompare(right.id, 'en')).flatMap((item) => {
    const parsed = publicHomepageDeveloperSchema.safeParse({ id: item.id, slug: item.slug, name: item.name, ...(item.imageUrl ? { imageUrl: item.imageUrl } : {}), ...(item.description !== undefined ? { description: item.description } : {}) });
    return parsed.success ? [parsed.data] : [];
  });
}

function publicContent(items: HomepageContentSource[]) {
  return stableOrder(items.filter((item) => item.status === 'published' && item.active !== false).flatMap((item) => {
    const parsed = publicHomepageContentSchema.safeParse({ key: item.key, type: item.type, title: item.title, ...(item.imageUrl ? { imageUrl: item.imageUrl } : {}), ...(item.body !== undefined ? { body: item.body } : {}), order: item.order });
    return parsed.success ? [parsed.data] : [];
  }));
}

function publicBanners(items: HomepageBannerSource[]) {
  return stableOrder(items.filter((item) => item.status === 'published' && item.active !== false).flatMap((item) => {
    const parsed = publicHomepageBannerSchema.safeParse({ key: item.key, ...(item.title !== undefined ? { title: item.title } : {}), ...(item.imageUrl ? { imageUrl: item.imageUrl } : {}), ...(item.targetUrl ? { targetUrl: item.targetUrl } : {}), order: item.order });
    return parsed.success ? [parsed.data] : [];
  }));
}

export function publicHomepageProjection(sources: HomepageSources): PublicHomepageData {
  return publicHomepageDataSchema.parse({
    sections: publicSections(sources.sections),
    properties: publicProperties(sources.properties),
    developers: publicDevelopers(sources.developers),
    content: publicContent(sources.content),
    banners: publicBanners(sources.banners)
  });
}

export function createPublicHomepageService(dependencies: { repository: PublicHomepageRepository }) {
  return { read: async (): Promise<PublicHomepageData> => publicHomepageProjection(await dependencies.repository.read()) };
}

type MongoRow = {
  _id?: unknown;
  key?: string;
  slug?: string;
  kind?: string;
  name?: unknown;
  title?: unknown;
  body?: unknown;
  description?: unknown;
  order?: number;
  status?: string;
  visible?: boolean;
  active?: boolean;
  transactionType?: string;
  projectId?: unknown;
  area?: unknown;
  layout?: unknown;
  price?: unknown;
  imageUrl?: string;
  targetUrl?: string;
};
function id(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && typeof (value as { toHexString?: () => string }).toHexString === 'function') return (value as { toHexString: () => string }).toHexString();
  return undefined;
}

async function findRows(connection: Connection, collection: string, filter: Record<string, unknown>, projection: Record<string, 0 | 1>, sort: Record<string, 1 | -1>, limit: number): Promise<MongoRow[]> {
  return connection.collection(collection).find(filter, { projection }).sort(sort).limit(limit).toArray() as Promise<MongoRow[]>;
}

export function createMongoosePublicHomepageRepository(connection: Connection): PublicHomepageRepository {
  return {
    async read() {
      const [sections, properties, developers, about, tips, banners] = await Promise.all([
        findRows(connection, 'cms_homepage_sections', { status: 'published', visible: true }, { _id: 1, key: 1, title: 1, body: 1, order: 1, status: 1, visible: 1 }, { order: 1, key: 1, _id: 1 }, 100),
        findRows(connection, 'properties', { status: 'published', active: true }, { _id: 1, slug: 1, kind: 1, name: 1, transactionType: 1, imageUrl: 1, projectId: 1, description: 1, area: 1, layout: 1, price: 1, status: 1, active: 1 }, { slug: 1, _id: 1 }, 100),
        findRows(connection, 'organizations', { status: 'approved', kind: 'developer_company' }, { _id: 1, slug: 1, name: 1, imageUrl: 1, description: 1, kind: 1, status: 1 }, { slug: 1, _id: 1 }, 100),
        findRows(connection, 'cms_about_blocks', { status: 'published', active: true }, { _id: 1, key: 1, title: 1, body: 1, order: 1, status: 1, active: 1 }, { order: 1, key: 1, _id: 1 }, 100),
        findRows(connection, 'cms_real_estate_tips', { status: 'published', active: true }, { _id: 1, key: 1, title: 1, body: 1, order: 1, status: 1, active: 1 }, { order: 1, key: 1, _id: 1 }, 100),
        findRows(connection, 'cms_banners', { status: 'published', active: true }, { _id: 1, key: 1, title: 1, imageUrl: 1, targetUrl: 1, order: 1, status: 1, active: 1 }, { order: 1, key: 1, _id: 1 }, 100)
      ]);
      const mapId = (row: MongoRow) => id(row._id);
      return {
        sections: sections.flatMap((row) => mapId(row) && typeof row.key === 'string' && typeof row.order === 'number' && typeof row.status === 'string' && typeof row.visible === 'boolean' ? [{ key: row.key, title: row.title, ...(row.body !== undefined ? { body: row.body } : {}), order: row.order, status: row.status, visible: row.visible }] : []),
        properties: properties.flatMap((row) => { const rowId = mapId(row); const projectId = id(row.projectId); return rowId && typeof row.slug === 'string' && typeof row.kind === 'string' && row.name !== undefined && typeof row.transactionType === 'string' && typeof row.status === 'string' && typeof row.active === 'boolean' ? [{ id: rowId, slug: row.slug, kind: row.kind, name: row.name, transactionType: row.transactionType, ...(row.imageUrl ? { imageUrl: row.imageUrl } : {}), ...(projectId ? { projectId } : {}), ...(row.description !== undefined ? { description: row.description } : {}), ...(row.area !== undefined ? { area: row.area } : {}), ...(row.layout !== undefined ? { layout: row.layout } : {}), ...(row.price !== undefined ? { price: row.price } : {}), status: row.status, active: row.active }] : []; }),
        developers: developers.flatMap((row) => { const rowId = mapId(row); return rowId && typeof row.slug === 'string' && row.name !== undefined && typeof row.kind === 'string' && typeof row.status === 'string' ? [{ id: rowId, slug: row.slug, name: row.name, ...(row.imageUrl ? { imageUrl: row.imageUrl } : {}), ...(row.description !== undefined ? { description: row.description } : {}), kind: row.kind, status: row.status }] : [] }),
        content: [...about, ...tips].flatMap((row) => typeof row.key === 'string' && row.title !== undefined && typeof row.order === 'number' && typeof row.status === 'string' ? [{ key: row.key, type: about.includes(row) ? 'about' as const : 'tip' as const, title: row.title, ...(row.imageUrl ? { imageUrl: row.imageUrl } : {}), ...(row.body !== undefined ? { body: row.body } : {}), order: row.order, status: row.status, ...(typeof row.active === 'boolean' ? { active: row.active } : {}) }] : []),
        banners: banners.flatMap((row) => typeof row.key === 'string' && typeof row.order === 'number' && typeof row.status === 'string' ? [{ key: row.key, ...(row.title !== undefined ? { title: row.title } : {}), ...(row.imageUrl ? { imageUrl: row.imageUrl } : {}), ...(row.targetUrl ? { targetUrl: row.targetUrl } : {}), order: row.order, status: row.status, ...(typeof row.active === 'boolean' ? { active: row.active } : {}) }] : [])
      };
    }
  };
}
