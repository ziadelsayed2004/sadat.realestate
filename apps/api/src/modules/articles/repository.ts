import { randomBytes } from 'node:crypto';
import { Types } from 'mongoose';
import type {
  ArticleAdminListQuery,
  ArticleCategoryListQuery,
  ArticleListQuery,
  ArticleStatus,
  LocalizedText
} from '@sadat-real-estate/contracts';
import type { ArticleCategoryRecord, ArticleModels, ArticleRecord } from './models.js';

export interface StoredArticleCategory {
  id: string;
  slug: string;
  name: LocalizedText;
  description?: LocalizedText;
  displayOrder: number;
  active: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoredArticle {
  id: string;
  categoryId: string;
  slug: string;
  title: LocalizedText;
  body: LocalizedText;
  seoTitle?: LocalizedText;
  seoDescription?: LocalizedText;
  coverAssetId?: string;
  imageUrl?: string;
  readingTimeMinutes?: number;
  authorId: string;
  status: ArticleStatus;
  publishedAt?: Date;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export type ArticleCategoryWriteResult =
  | { kind: 'written'; item: StoredArticleCategory }
  | { kind: 'not_found' | 'slug_conflict' | 'version_conflict' };
export type ArticleWriteResult =
  | { kind: 'written'; item: StoredArticle }
  | { kind: 'not_found' | 'slug_conflict' | 'version_conflict' };
export type ArticleCategoryDeleteResult =
  | { kind: 'deleted' }
  | { kind: 'not_found' | 'version_conflict' | 'in_use' };

export interface ArticleCategoryCreateRecord {
  slug: string;
  name: LocalizedText;
  description?: LocalizedText;
  displayOrder: number;
  active: boolean;
}

export interface ArticleCategoryChanges {
  slug?: string;
  name?: LocalizedText;
  description?: LocalizedText | null;
  displayOrder?: number;
  active?: boolean;
}

export interface ArticleCreateRecord {
  categoryId: string;
  slug: string;
  title: LocalizedText;
  body: LocalizedText;
  seoTitle?: LocalizedText;
  seoDescription?: LocalizedText;
  coverAssetId?: string;
  authorId: string;
}

export interface ArticleChanges {
  categoryId?: string;
  slug?: string;
  title?: LocalizedText;
  body?: LocalizedText;
  seoTitle?: LocalizedText | null;
  seoDescription?: LocalizedText | null;
  coverAssetId?: string | null;
}

export interface PublicStoredArticle {
  article: StoredArticle;
  category: StoredArticleCategory;
}

export interface ArticleRepository {
  listCategories(query: ArticleCategoryListQuery): Promise<{ items: StoredArticleCategory[]; total: number }>;
  listPublicCategories(): Promise<StoredArticleCategory[]>;
  findCategory(id: string): Promise<StoredArticleCategory | null>;
  createCategory(value: ArticleCategoryCreateRecord, actorId: string, at: Date): Promise<ArticleCategoryWriteResult>;
  updateCategory(id: string, version: number, changes: ArticleCategoryChanges, actorId: string, at: Date): Promise<ArticleCategoryWriteResult>;
  deleteCategory(id: string, version: number): Promise<ArticleCategoryDeleteResult>;
  listArticles(query: ArticleAdminListQuery): Promise<{ items: StoredArticle[]; total: number }>;
  findArticle(id: string): Promise<StoredArticle | null>;
  createArticle(value: ArticleCreateRecord, actorId: string, at: Date): Promise<ArticleWriteResult>;
  updateArticle(id: string, version: number, changes: ArticleChanges, actorId: string, at: Date): Promise<ArticleWriteResult>;
  transitionArticle(id: string, version: number, status: ArticleStatus, actorId: string, at: Date): Promise<ArticleWriteResult>;
  listPublicArticles(query: ArticleListQuery): Promise<{ items: PublicStoredArticle[]; total: number }>;
  findPublicArticleBySlug(slug: string): Promise<PublicStoredArticle | null>;
}

function duplicateKey(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
}

function mapCategory(record: ArticleCategoryRecord): StoredArticleCategory {
  return {
    id: record._id.toHexString(),
    slug: record.slug,
    name: record.name,
    ...(record.description ? { description: record.description } : {}),
    displayOrder: record.displayOrder,
    active: record.active,
    version: record.version,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

function mapArticle(record: ArticleRecord): StoredArticle {
  return {
    id: record._id.toHexString(),
    categoryId: record.categoryId.toHexString(),
    slug: record.slug,
    title: record.title,
    body: record.body,
    ...(record.seoTitle ? { seoTitle: record.seoTitle } : {}),
    ...(record.seoDescription ? { seoDescription: record.seoDescription } : {}),
    ...(record.coverAssetId ? { coverAssetId: record.coverAssetId.toHexString() } : {}),
    ...(record.imageUrl ? { imageUrl: record.imageUrl } : {}),
    ...(record.readingTimeMinutes !== undefined ? { readingTimeMinutes: record.readingTimeMinutes } : {}),
    authorId: record.authorId.toHexString(),
    status: record.status,
    ...(record.publishedAt ? { publishedAt: record.publishedAt } : {}),
    version: record.version,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

export function createMongooseArticleRepository(models: ArticleModels): ArticleRepository {
  const categoryById = async (id: string) => {
    const result = await models.ArticleCategory.findById(id).lean();
    return result ? mapCategory(result as ArticleCategoryRecord) : null;
  };
  const articleById = async (id: string) => {
    const result = await models.Article.findById(id).lean();
    return result ? mapArticle(result as ArticleRecord) : null;
  };

  return {
    async listCategories(query) {
      const filter: Record<string, unknown> = {};
      if (query.active !== undefined) filter.active = query.active;
      if (query.search) filter.$text = { $search: query.search };
      const direction: 1 | -1 = query.direction === 'asc' ? 1 : -1;
      const sort: Record<string, 1 | -1> = query.sort === 'displayOrder'
        ? { displayOrder: direction, slug: 1, _id: 1 }
        : { [query.sort]: direction, slug: 1, _id: 1 };
      const [rows, total] = await Promise.all([
        models.ArticleCategory.find(filter).sort(sort)
          .skip((query.page - 1) * query.limit).limit(query.limit).lean(),
        models.ArticleCategory.countDocuments(filter)
      ]);
      return { items: rows.map((row) => mapCategory(row as ArticleCategoryRecord)), total };
    },

    async listPublicCategories() {
      const rows = await models.ArticleCategory.find({ active: true })
        .sort({ displayOrder: 1, slug: 1, _id: 1 }).limit(100).lean();
      return rows.map((row) => mapCategory(row as ArticleCategoryRecord));
    },

    findCategory: categoryById,

    async createCategory(value, actorId, at) {
      try {
        const document = await models.ArticleCategory.create({
          ...value,
          createdBy: new Types.ObjectId(actorId),
          updatedBy: new Types.ObjectId(actorId),
          createdAt: at,
          updatedAt: at
        });
        return { kind: 'written', item: mapCategory(document.toObject() as ArticleCategoryRecord) };
      } catch (error) {
        if (duplicateKey(error)) return { kind: 'slug_conflict' };
        throw error;
      }
    },

    async updateCategory(id, version, changes, actorId, at) {
      try {
        const set: Record<string, unknown> = {
          updatedBy: new Types.ObjectId(actorId),
          updatedAt: at
        };
        const unset: Record<string, 1> = {};
        for (const [key, value] of Object.entries(changes)) {
          if (value === null) unset[key] = 1;
          else if (value !== undefined) set[key] = value;
        }
        const update = {
          $set: set,
          $inc: { version: 1 },
          ...(Object.keys(unset).length ? { $unset: unset } : {})
        };
        const row = await models.ArticleCategory.findOneAndUpdate(
          { _id: id, version },
          update,
          { new: true, runValidators: true, lean: true }
        );
        if (!row) return await models.ArticleCategory.exists({ _id: id })
          ? { kind: 'version_conflict' }
          : { kind: 'not_found' };
        return { kind: 'written', item: mapCategory(row as ArticleCategoryRecord) };
      } catch (error) {
        if (duplicateKey(error)) return { kind: 'slug_conflict' };
        throw error;
      }
    },

    async deleteCategory(id, version) {
      if (await models.Article.exists({ categoryId: new Types.ObjectId(id) })) return { kind: 'in_use' };
      const row = await models.ArticleCategory.findOneAndDelete({ _id: id, version });
      if (row) return { kind: 'deleted' };
      return await models.ArticleCategory.exists({ _id: id })
        ? { kind: 'version_conflict' }
        : { kind: 'not_found' };
    },

    async listArticles(query) {
      const filter: Record<string, unknown> = {};
      if (query.status) filter.status = query.status;
      if (query.categoryId) filter.categoryId = new Types.ObjectId(query.categoryId);
      if (query.search) filter.$text = { $search: query.search };
      const direction: 1 | -1 = query.direction === 'asc' ? 1 : -1;
      const sort: Record<string, 1 | -1> = { [query.sort]: direction, slug: 1, _id: 1 };
      const [rows, total] = await Promise.all([
        models.Article.find(filter).sort(sort)
          .skip((query.page - 1) * query.limit).limit(query.limit).lean(),
        models.Article.countDocuments(filter)
      ]);
      return { items: rows.map((row) => mapArticle(row as ArticleRecord)), total };
    },

    findArticle: articleById,

    async createArticle(value, actorId, at) {
      try {
        const document = await models.Article.create({
          ...value,
          categoryId: new Types.ObjectId(value.categoryId),
          ...(value.coverAssetId ? { coverAssetId: new Types.ObjectId(value.coverAssetId) } : {}),
          authorId: new Types.ObjectId(value.authorId),
          status: 'draft',
          createdBy: new Types.ObjectId(actorId),
          updatedBy: new Types.ObjectId(actorId),
          createdAt: at,
          updatedAt: at
        });
        return { kind: 'written', item: mapArticle(document.toObject() as ArticleRecord) };
      } catch (error) {
        if (duplicateKey(error)) return { kind: 'slug_conflict' };
        throw error;
      }
    },

    async updateArticle(id, version, changes, actorId, at) {
      try {
        const set: Record<string, unknown> = {
          updatedBy: new Types.ObjectId(actorId),
          updatedAt: at
        };
        const unset: Record<string, 1> = {};
        for (const [key, value] of Object.entries(changes)) {
          if (value === null) unset[key] = 1;
          else if (value !== undefined) {
            set[key] = ['categoryId', 'coverAssetId'].includes(key)
              ? new Types.ObjectId(value as string)
              : value;
          }
        }
        const update = {
          $set: set,
          $inc: { version: 1 },
          ...(Object.keys(unset).length ? { $unset: unset } : {})
        };
        const row = await models.Article.findOneAndUpdate(
          { _id: id, version },
          update,
          { new: true, runValidators: true, lean: true }
        );
        if (!row) return await models.Article.exists({ _id: id })
          ? { kind: 'version_conflict' }
          : { kind: 'not_found' };
        return { kind: 'written', item: mapArticle(row as ArticleRecord) };
      } catch (error) {
        if (duplicateKey(error)) return { kind: 'slug_conflict' };
        throw error;
      }
    },

    async transitionArticle(id, version, status, actorId, at) {
      const set: Record<string, unknown> = {
        status,
        updatedBy: new Types.ObjectId(actorId),
        updatedAt: at
      };
      const unset: Record<string, 1> = {};
      if (status === 'published') set.publishedAt = at;
      if (status === 'draft') unset.publishedAt = 1;
      const row = await models.Article.findOneAndUpdate(
        { _id: id, version },
        {
          $set: set,
          $inc: { version: 1 },
          ...(Object.keys(unset).length ? { $unset: unset } : {})
        },
        { new: true, runValidators: true, lean: true }
      );
      if (!row) return await models.Article.exists({ _id: id })
        ? { kind: 'version_conflict' }
        : { kind: 'not_found' };
      return { kind: 'written', item: mapArticle(row as ArticleRecord) };
    },

    async listPublicArticles(query) {
      const categoryRows = await models.ArticleCategory.find({ active: true }).lean();
      const categories = new Map(categoryRows.map((row) => {
        const mapped = mapCategory(row as ArticleCategoryRecord);
        return [mapped.id, mapped] as const;
      }));
      if (query.categoryId && !categories.has(query.categoryId)) return { items: [], total: 0 };
      const categoryIds = query.categoryId
        ? [new Types.ObjectId(query.categoryId)]
        : [...categories.keys()].map((id) => new Types.ObjectId(id));
      if (!categoryIds.length) return { items: [], total: 0 };
      const filter = { status: 'published' as const, categoryId: { $in: categoryIds } };
      const [rows, total] = await Promise.all([
        models.Article.find(filter).sort({ publishedAt: -1, _id: 1 })
          .skip((query.page - 1) * query.limit).limit(query.limit).lean(),
        models.Article.countDocuments(filter)
      ]);
      const items = rows.flatMap((row) => {
        const article = mapArticle(row as ArticleRecord);
        const category = categories.get(article.categoryId);
        return category ? [{ article, category }] : [];
      });
      return { items, total };
    },

    async findPublicArticleBySlug(slug) {
      const row = await models.Article.findOne({ slug, status: 'published' }).lean();
      if (!row) return null;
      const article = mapArticle(row as ArticleRecord);
      const category = await models.ArticleCategory.findOne({ _id: article.categoryId, active: true }).lean();
      return category ? { article, category: mapCategory(category as ArticleCategoryRecord) } : null;
    }
  };
}

function memoryId(): string {
  return randomBytes(12).toString('hex');
}

export function createMemoryArticleRepository(
  seed: { categories?: StoredArticleCategory[]; articles?: StoredArticle[] } = {}
): ArticleRepository {
  const categories = new Map((seed.categories ?? []).map((item) => [item.id, { ...item }]));
  const articles = new Map((seed.articles ?? []).map((item) => [item.id, { ...item }]));
  const orderedCategories = (values: StoredArticleCategory[]) => values.sort(
    (left, right) => left.displayOrder - right.displayOrder || left.slug.localeCompare(right.slug) || left.id.localeCompare(right.id)
  );

  return {
    async listCategories(query) {
      let items = [...categories.values()];
      if (query.active !== undefined) items = items.filter((item) => item.active === query.active);
      if (query.search) {
        const search = query.search.toLocaleLowerCase('en');
        items = items.filter((item) => `${item.slug} ${Object.values(item.name).join(' ')}`.toLocaleLowerCase('en').includes(search));
      }
      const direction = query.direction === 'asc' ? 1 : -1;
      items.sort((left, right) => {
        const leftValue = query.sort === 'displayOrder' ? left.displayOrder : query.sort === 'createdAt' ? left.createdAt.getTime() : left.slug;
        const rightValue = query.sort === 'displayOrder' ? right.displayOrder : query.sort === 'createdAt' ? right.createdAt.getTime() : right.slug;
        return (leftValue < rightValue ? -1 : leftValue > rightValue ? 1 : left.id.localeCompare(right.id)) * direction;
      });
      const total = items.length;
      return { items: items.slice((query.page - 1) * query.limit, query.page * query.limit), total };
    },
    async listPublicCategories() {
      return orderedCategories([...categories.values()].filter((item) => item.active));
    },
    async findCategory(id) { return categories.get(id) ?? null; },
    async createCategory(value, _actorId, at) {
      if ([...categories.values()].some((item) => item.slug === value.slug)) return { kind: 'slug_conflict' };
      const item: StoredArticleCategory = { id: memoryId(), ...value, version: 0, createdAt: at, updatedAt: at };
      categories.set(item.id, item);
      return { kind: 'written', item };
    },
    async updateCategory(id, version, changes, _actorId, at) {
      const before = categories.get(id);
      if (!before) return { kind: 'not_found' };
      if (before.version !== version) return { kind: 'version_conflict' };
      if (changes.slug && [...categories.values()].some((item) => item.id !== id && item.slug === changes.slug)) return { kind: 'slug_conflict' };
      const { description, ...categoryChanges } = changes;
      const next: StoredArticleCategory = {
        ...before,
        ...categoryChanges,
        ...(description !== undefined && description !== null ? { description } : {}),
        version: before.version + 1,
        updatedAt: at
      };
      if (description === null) delete next.description;
      categories.set(id, next);
      return { kind: 'written', item: next };
    },
    async deleteCategory(id, version) {
      const before = categories.get(id);
      if (!before) return { kind: 'not_found' };
      if (before.version !== version) return { kind: 'version_conflict' };
      if ([...articles.values()].some((item) => item.categoryId === id)) return { kind: 'in_use' };
      categories.delete(id);
      return { kind: 'deleted' };
    },
    async listArticles(query) {
      let items = [...articles.values()];
      if (query.status) items = items.filter((item) => item.status === query.status);
      if (query.categoryId) items = items.filter((item) => item.categoryId === query.categoryId);
      if (query.search) {
        const search = query.search.toLocaleLowerCase('en');
        items = items.filter((item) => `${item.slug} ${Object.values(item.title).join(' ')}`.toLocaleLowerCase('en').includes(search));
      }
      const direction = query.direction === 'asc' ? 1 : -1;
      items.sort((left, right) => {
        const leftValue = query.sort === 'slug' ? left.slug : query.sort === 'publishedAt' ? left.publishedAt?.getTime() ?? 0 : left.updatedAt.getTime();
        const rightValue = query.sort === 'slug' ? right.slug : query.sort === 'publishedAt' ? right.publishedAt?.getTime() ?? 0 : right.updatedAt.getTime();
        return (leftValue < rightValue ? -1 : leftValue > rightValue ? 1 : left.id.localeCompare(right.id)) * direction;
      });
      const total = items.length;
      return { items: items.slice((query.page - 1) * query.limit, query.page * query.limit), total };
    },
    async findArticle(id) { return articles.get(id) ?? null; },
    async createArticle(value, _actorId, at) {
      if ([...articles.values()].some((item) => item.slug === value.slug)) return { kind: 'slug_conflict' };
      const item: StoredArticle = {
        id: memoryId(),
        ...value,
        status: 'draft',
        version: 0,
        createdAt: at,
        updatedAt: at
      };
      articles.set(item.id, item);
      return { kind: 'written', item };
    },
    async updateArticle(id, version, changes, _actorId, at) {
      const before = articles.get(id);
      if (!before) return { kind: 'not_found' };
      if (before.version !== version) return { kind: 'version_conflict' };
      if (changes.slug && [...articles.values()].some((item) => item.id !== id && item.slug === changes.slug)) return { kind: 'slug_conflict' };
      const { seoTitle, seoDescription, coverAssetId, ...articleChanges } = changes;
      const next: StoredArticle = {
        ...before,
        ...articleChanges,
        ...(seoTitle !== undefined && seoTitle !== null ? { seoTitle } : {}),
        ...(seoDescription !== undefined && seoDescription !== null ? { seoDescription } : {}),
        ...(coverAssetId !== undefined && coverAssetId !== null ? { coverAssetId } : {}),
        version: before.version + 1,
        updatedAt: at
      };
      for (const key of ['seoTitle', 'seoDescription', 'coverAssetId'] as const) {
        if (changes[key] === null) delete next[key];
      }
      articles.set(id, next);
      return { kind: 'written', item: next };
    },
    async transitionArticle(id, version, status, _actorId, at) {
      const before = articles.get(id);
      if (!before) return { kind: 'not_found' };
      if (before.version !== version) return { kind: 'version_conflict' };
      const next: StoredArticle = {
        ...before,
        status,
        ...(status === 'published' ? { publishedAt: at } : {}),
        version: before.version + 1,
        updatedAt: at
      };
      if (status === 'draft') delete next.publishedAt;
      articles.set(id, next);
      return { kind: 'written', item: next };
    },
    async listPublicArticles(query) {
      const activeCategories = new Map([...categories.values()].filter((item) => item.active).map((item) => [item.id, item]));
      let rows = [...articles.values()].filter((item) => item.status === 'published' && activeCategories.has(item.categoryId));
      if (query.categoryId) rows = rows.filter((item) => item.categoryId === query.categoryId);
      rows.sort((left, right) => (right.publishedAt?.getTime() ?? 0) - (left.publishedAt?.getTime() ?? 0) || left.id.localeCompare(right.id));
      const total = rows.length;
      const items = rows.slice((query.page - 1) * query.limit, query.page * query.limit).map((article) => ({
        article,
        category: activeCategories.get(article.categoryId)!
      }));
      return { items, total };
    },
    async findPublicArticleBySlug(slug) {
      const article = [...articles.values()].find((item) => item.slug === slug && item.status === 'published');
      if (!article) return null;
      const category = categories.get(article.categoryId);
      return category?.active ? { article, category } : null;
    }
  };
}
