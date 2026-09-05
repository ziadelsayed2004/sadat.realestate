import {
  SUPPORTED_LOCALES,
  articleAdminListQuerySchema,
  articleCategoryCreateSchema,
  articleCategoryDataSchema,
  articleCategoryDeleteSchema,
  articleCategoryListQuerySchema,
  articleCategoryPatchSchema,
  articleCreateSchema,
  articleDataSchema,
  articleIdSchema,
  articleListQuerySchema,
  articlePatchSchema,
  articlePublicCategoryListQuerySchema,
  articlePublicCategorySchema,
  articlePublicSchema,
  articleSlugSchema,
  articleTransitionRequestSchema,
  supportedLocaleSchema,
  type Article,
  type ArticleAdminListQuery,
  type ArticleCategory,
  type ArticleCategoryCreate,
  type ArticleCategoryDelete,
  type ArticleCategoryListQuery,
  type ArticleCategoryPatch,
  type ArticleCreate,
  type ArticleListQuery,
  type ArticlePatch,
  type ArticlePublic,
  type ArticlePublicCategory,
  type ArticlePublicCategoryListQuery,
  type ArticleStatus,
  type ArticleTransitionRequest,
  type LocalizedText,
  type RbacPermission,
  type SupportedLocale
} from '@sadat-real-estate/contracts';
import type { AuditWriter } from '../audit/writer.js';
import type {
  ArticleCategoryWriteResult,
  ArticleRepository,
  ArticleWriteResult,
  PublicStoredArticle,
  StoredArticle,
  StoredArticleCategory
} from './repository.js';

export interface ArticlePrincipal { userId: string }
export interface ArticleMutationContext { requestId: string; traceId: string }
export interface ArticleAuthorization {
  authorize(userId: string, permission: RbacPermission): Promise<boolean>;
}

export class ArticleServiceError extends Error {
  constructor(readonly code:
    | 'ARTICLE_FORBIDDEN'
    | 'ARTICLE_CATEGORY_NOT_FOUND'
    | 'ARTICLE_CATEGORY_SLUG_EXISTS'
    | 'ARTICLE_CATEGORY_IN_USE'
    | 'ARTICLE_CATEGORY_INACTIVE'
    | 'ARTICLE_NOT_FOUND'
    | 'ARTICLE_SLUG_EXISTS'
    | 'ARTICLE_VERSION_CONFLICT'
    | 'ARTICLE_TRANSITION_INVALID') {
    super(code);
  }
}

export interface ArticleService {
  listCategories(principal: ArticlePrincipal, query: ArticleCategoryListQuery): Promise<{
    data: { items: ArticleCategory[] };
    page: number;
    limit: number;
    total: number;
  }>;
  listPublicCategories(query: ArticlePublicCategoryListQuery): Promise<ArticlePublicCategory[]>;
  createCategory(principal: ArticlePrincipal, input: ArticleCategoryCreate, context: ArticleMutationContext): Promise<ArticleCategory>;
  updateCategory(principal: ArticlePrincipal, id: string, input: ArticleCategoryPatch, context: ArticleMutationContext): Promise<ArticleCategory>;
  deleteCategory(principal: ArticlePrincipal, id: string, input: ArticleCategoryDelete, context: ArticleMutationContext): Promise<{ id: string; deleted: true }>;
  listArticles(principal: ArticlePrincipal, query: ArticleAdminListQuery): Promise<{
    data: { items: Article[] };
    page: number;
    limit: number;
    total: number;
  }>;
  createArticle(principal: ArticlePrincipal, input: ArticleCreate, context: ArticleMutationContext): Promise<Article>;
  updateArticle(principal: ArticlePrincipal, id: string, input: ArticlePatch, context: ArticleMutationContext): Promise<Article>;
  transitionArticle(principal: ArticlePrincipal, id: string, input: ArticleTransitionRequest, context: ArticleMutationContext): Promise<Article>;
  listPublic(query: ArticleListQuery): Promise<{ data: ArticlePublic[]; page: number; limit: number; total: number }>;
  getPublicBySlug(slug: string, locale: SupportedLocale): Promise<ArticlePublic>;
}

const ALLOWED_TRANSITIONS: Readonly<Record<ArticleStatus, readonly ArticleStatus[]>> = Object.freeze({
  draft: ['pending_review'],
  pending_review: ['published', 'draft'],
  published: ['archived'],
  archived: ['draft']
});

function categoryResult(result: ArticleCategoryWriteResult): StoredArticleCategory {
  if (result.kind === 'written') return result.item;
  if (result.kind === 'not_found') throw new ArticleServiceError('ARTICLE_CATEGORY_NOT_FOUND');
  if (result.kind === 'slug_conflict') throw new ArticleServiceError('ARTICLE_CATEGORY_SLUG_EXISTS');
  throw new ArticleServiceError('ARTICLE_VERSION_CONFLICT');
}

function articleResult(result: ArticleWriteResult): StoredArticle {
  if (result.kind === 'written') return result.item;
  if (result.kind === 'not_found') throw new ArticleServiceError('ARTICLE_NOT_FOUND');
  if (result.kind === 'slug_conflict') throw new ArticleServiceError('ARTICLE_SLUG_EXISTS');
  throw new ArticleServiceError('ARTICLE_VERSION_CONFLICT');
}

function localized(value: LocalizedText, locale: SupportedLocale): LocalizedText {
  const selected = value[locale] ?? value.ar ?? value.en;
  if (selected === undefined) throw new ArticleServiceError('ARTICLE_NOT_FOUND');
  return { [locale]: selected };
}

function categoryActions(manage: boolean): ArticleCategory['availableActions'] {
  return manage ? ['update', 'delete'] : [];
}

function articleActions(status: ArticleStatus, manage: boolean, publish: boolean): Article['availableActions'] {
  const actions: Article['availableActions'] = [];
  if (manage && status === 'draft') actions.push('update', 'submit');
  if (!publish) return actions;
  if (status === 'pending_review') actions.push('publish', 'return_to_draft');
  if (status === 'published') actions.push('archive');
  if (status === 'archived') actions.push('restore');
  return actions;
}

function categoryData(item: StoredArticleCategory, manage: boolean): ArticleCategory {
  return articleCategoryDataSchema.parse({
    ...item,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    availableActions: categoryActions(manage)
  });
}

function articleData(item: StoredArticle, manage: boolean, publish: boolean): Article {
  return articleDataSchema.parse({
    ...item,
    ...(item.publishedAt ? { publishedAt: item.publishedAt.toISOString() } : {}),
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    availableActions: articleActions(item.status, manage, publish)
  });
}

function presentLocales(value: LocalizedText | undefined): SupportedLocale[] {
  return SUPPORTED_LOCALES.filter((locale) => value?.[locale] !== undefined);
}

function categoryAuditSnapshot(item: ArticleCategory): Record<string, unknown> {
  return {
    id: item.id,
    slug: item.slug,
    nameLocales: presentLocales(item.name),
    descriptionLocales: presentLocales(item.description),
    displayOrder: item.displayOrder,
    active: item.active,
    version: item.version
  };
}

function articleAuditSnapshot(item: Article): Record<string, unknown> {
  return {
    id: item.id,
    categoryId: item.categoryId,
    slug: item.slug,
    titleLocales: presentLocales(item.title),
    bodyLocales: presentLocales(item.body),
    seoTitleLocales: presentLocales(item.seoTitle),
    seoDescriptionLocales: presentLocales(item.seoDescription),
    ...(item.coverAssetId ? { coverAssetId: item.coverAssetId } : {}),
    authorId: item.authorId,
    status: item.status,
    ...(item.publishedAt ? { publishedAt: item.publishedAt } : {}),
    version: item.version
  };
}

function publicCategory(item: StoredArticleCategory, locale: SupportedLocale): ArticlePublicCategory {
  return articlePublicCategorySchema.parse({
    id: item.id,
    slug: item.slug,
    name: localized(item.name, locale),
    ...(item.description ? { description: localized(item.description, locale) } : {})
  });
}

function publicArticle(item: PublicStoredArticle, locale: SupportedLocale, authorName?: string): ArticlePublic {
  const body = localized(item.article.body, locale);
  const selectedBody = body[locale] ?? '';
  const readingTimeMinutes = item.article.readingTimeMinutes
    ?? Math.max(1, Math.ceil(selectedBody.trim().split(/\s+/u).filter(Boolean).length / 200));
  return articlePublicSchema.parse({
    id: item.article.id,
    categoryId: item.article.categoryId,
    slug: item.article.slug,
    title: localized(item.article.title, locale),
    body,
    ...(item.article.seoTitle ? { seoTitle: localized(item.article.seoTitle, locale) } : {}),
    ...(item.article.seoDescription ? { seoDescription: localized(item.article.seoDescription, locale) } : {}),
    ...(item.article.coverAssetId ? { coverAssetId: item.article.coverAssetId } : {}),
    ...(item.article.imageUrl ? { imageUrl: item.article.imageUrl } : {}),
    ...(authorName ? { authorName: { ar: authorName, en: authorName } } : {}),
    readingTimeMinutes,
    ...(item.article.publishedAt ? { publishedAt: item.article.publishedAt.toISOString() } : {}),
    category: publicCategory(item.category, locale)
  });
}

export function createArticleService(dependencies: {
  repository: ArticleRepository;
  authorization: ArticleAuthorization;
  audit: Pick<AuditWriter, 'record'>;
  resolveAuthorName?: (authorId: string) => Promise<string | undefined>;
  now?: () => Date;
}): ArticleService {
  const now = dependencies.now ?? (() => new Date());
  const allowed = (userId: string, permission: RbacPermission) => dependencies.authorization.authorize(userId, permission);
  const requirePermission = async (userId: string, permission: RbacPermission) => {
    if (!await allowed(userId, permission)) throw new ArticleServiceError('ARTICLE_FORBIDDEN');
  };
  const requireActiveCategory = async (categoryId: string) => {
    const category = await dependencies.repository.findCategory(categoryId);
    if (!category) throw new ArticleServiceError('ARTICLE_CATEGORY_NOT_FOUND');
    if (!category.active) throw new ArticleServiceError('ARTICLE_CATEGORY_INACTIVE');
    return category;
  };
  const audit = async (
    action: string,
    targetType: string,
    targetId: string,
    principal: ArticlePrincipal,
    reason: string,
    before: unknown,
    after: unknown,
    context: ArticleMutationContext,
    at: Date
  ) => dependencies.audit.record({
    actorType: 'admin',
    actorId: principal.userId,
    targetType,
    targetId,
    action,
    reason,
    before,
    after,
    requestId: context.requestId,
    traceId: context.traceId,
    occurredAt: at
  });

  return {
    async listCategories(principal, unparsedQuery) {
      const query = articleCategoryListQuerySchema.parse(unparsedQuery);
      await requirePermission(principal.userId, 'admin:content.view');
      const manage = await allowed(principal.userId, 'admin:content.manage');
      const result = await dependencies.repository.listCategories(query);
      return {
        data: { items: result.items.map((item) => categoryData(item, manage)) },
        page: query.page,
        limit: query.limit,
        total: result.total
      };
    },

    async listPublicCategories(unparsedQuery) {
      const query = articlePublicCategoryListQuerySchema.parse(unparsedQuery);
      return (await dependencies.repository.listPublicCategories())
        .map((item) => publicCategory(item, query.locale));
    },

    async createCategory(principal, unparsedInput, context) {
      const input = articleCategoryCreateSchema.parse(unparsedInput);
      await requirePermission(principal.userId, 'admin:content.manage');
      const at = now();
      const stored = categoryResult(await dependencies.repository.createCategory({
        slug: input.slug,
        name: input.name,
        ...(input.description ? { description: input.description } : {}),
        displayOrder: input.displayOrder,
        active: input.active
      }, principal.userId, at));
      const output = categoryData(stored, true);
      await audit('article_category.create', 'article_category', stored.id, principal, input.reason, null, categoryAuditSnapshot(output), context, at);
      return output;
    },

    async updateCategory(principal, id, unparsedInput, context) {
      articleIdSchema.parse(id);
      const input = articleCategoryPatchSchema.parse(unparsedInput);
      await requirePermission(principal.userId, 'admin:content.manage');
      const before = await dependencies.repository.findCategory(id);
      if (!before) throw new ArticleServiceError('ARTICLE_CATEGORY_NOT_FOUND');
      const at = now();
      const stored = categoryResult(await dependencies.repository.updateCategory(id, input.version, {
        ...(input.slug !== undefined ? { slug: input.slug } : {}),
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.displayOrder !== undefined ? { displayOrder: input.displayOrder } : {}),
        ...(input.active !== undefined ? { active: input.active } : {})
      }, principal.userId, at));
      const output = categoryData(stored, true);
      await audit('article_category.update', 'article_category', id, principal, input.reason, categoryAuditSnapshot(categoryData(before, true)), categoryAuditSnapshot(output), context, at);
      return output;
    },

    async deleteCategory(principal, id, unparsedInput, context) {
      articleIdSchema.parse(id);
      const input = articleCategoryDeleteSchema.parse(unparsedInput);
      await requirePermission(principal.userId, 'admin:content.manage');
      const before = await dependencies.repository.findCategory(id);
      if (!before) throw new ArticleServiceError('ARTICLE_CATEGORY_NOT_FOUND');
      const result = await dependencies.repository.deleteCategory(id, input.version);
      if (result.kind === 'not_found') throw new ArticleServiceError('ARTICLE_CATEGORY_NOT_FOUND');
      if (result.kind === 'version_conflict') throw new ArticleServiceError('ARTICLE_VERSION_CONFLICT');
      if (result.kind === 'in_use') throw new ArticleServiceError('ARTICLE_CATEGORY_IN_USE');
      const at = now();
      await audit('article_category.delete', 'article_category', id, principal, input.reason, categoryAuditSnapshot(categoryData(before, true)), null, context, at);
      return { id, deleted: true };
    },

    async listArticles(principal, unparsedQuery) {
      const query = articleAdminListQuerySchema.parse(unparsedQuery);
      await requirePermission(principal.userId, 'admin:content.view');
      const [manage, publish] = await Promise.all([
        allowed(principal.userId, 'admin:content.manage'),
        allowed(principal.userId, 'admin:content.publish')
      ]);
      const result = await dependencies.repository.listArticles(query);
      return {
        data: { items: result.items.map((item) => articleData(item, manage, publish)) },
        page: query.page,
        limit: query.limit,
        total: result.total
      };
    },

    async createArticle(principal, unparsedInput, context) {
      const input = articleCreateSchema.parse(unparsedInput);
      await requirePermission(principal.userId, 'admin:content.manage');
      await requireActiveCategory(input.categoryId);
      const at = now();
      const stored = articleResult(await dependencies.repository.createArticle({
        categoryId: input.categoryId,
        slug: input.slug,
        title: input.title,
        body: input.body,
        ...(input.seoTitle ? { seoTitle: input.seoTitle } : {}),
        ...(input.seoDescription ? { seoDescription: input.seoDescription } : {}),
        ...(input.coverAssetId ? { coverAssetId: input.coverAssetId } : {}),
        authorId: principal.userId
      }, principal.userId, at));
      const publish = await allowed(principal.userId, 'admin:content.publish');
      const output = articleData(stored, true, publish);
      await audit('article.create', 'article', stored.id, principal, input.reason, null, articleAuditSnapshot(output), context, at);
      return output;
    },

    async updateArticle(principal, id, unparsedInput, context) {
      articleIdSchema.parse(id);
      const input = articlePatchSchema.parse(unparsedInput);
      await requirePermission(principal.userId, 'admin:content.manage');
      const before = await dependencies.repository.findArticle(id);
      if (!before) throw new ArticleServiceError('ARTICLE_NOT_FOUND');
      if (before.status !== 'draft') throw new ArticleServiceError('ARTICLE_TRANSITION_INVALID');
      if (input.categoryId) await requireActiveCategory(input.categoryId);
      const at = now();
      const stored = articleResult(await dependencies.repository.updateArticle(id, input.version, {
        ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
        ...(input.slug !== undefined ? { slug: input.slug } : {}),
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.body !== undefined ? { body: input.body } : {}),
        ...(input.seoTitle !== undefined ? { seoTitle: input.seoTitle } : {}),
        ...(input.seoDescription !== undefined ? { seoDescription: input.seoDescription } : {}),
        ...(input.coverAssetId !== undefined ? { coverAssetId: input.coverAssetId } : {})
      }, principal.userId, at));
      const publish = await allowed(principal.userId, 'admin:content.publish');
      const output = articleData(stored, true, publish);
      await audit('article.update', 'article', id, principal, input.reason, articleAuditSnapshot(articleData(before, true, publish)), articleAuditSnapshot(output), context, at);
      return output;
    },

    async transitionArticle(principal, id, unparsedInput, context) {
      articleIdSchema.parse(id);
      const input = articleTransitionRequestSchema.parse(unparsedInput);
      await requirePermission(
        principal.userId,
        input.status === 'pending_review' ? 'admin:content.manage' : 'admin:content.publish'
      );
      const before = await dependencies.repository.findArticle(id);
      if (!before) throw new ArticleServiceError('ARTICLE_NOT_FOUND');
      if (!ALLOWED_TRANSITIONS[before.status].includes(input.status)) {
        throw new ArticleServiceError('ARTICLE_TRANSITION_INVALID');
      }
      if (input.status === 'published') await requireActiveCategory(before.categoryId);
      const at = now();
      const stored = articleResult(await dependencies.repository.transitionArticle(
        id,
        input.version,
        input.status,
        principal.userId,
        at
      ));
      const manage = await allowed(principal.userId, 'admin:content.manage');
      const output = articleData(stored, manage, true);
      await audit('article.transition', 'article', id, principal, input.reason, articleAuditSnapshot(articleData(before, manage, true)), articleAuditSnapshot(output), context, at);
      return output;
    },

    async listPublic(unparsedQuery) {
      const query = articleListQuerySchema.parse(unparsedQuery);
      const result = await dependencies.repository.listPublicArticles(query);
      const authorNames = new Map<string, string | undefined>();
      await Promise.all([...new Set(result.items.map(({ article }) => article.authorId))].map(async (authorId) => {
        authorNames.set(authorId, await dependencies.resolveAuthorName?.(authorId));
      }));
      return {
        data: result.items.map((item) => publicArticle(item, query.locale, authorNames.get(item.article.authorId))),
        page: query.page,
        limit: query.limit,
        total: result.total
      };
    },

    async getPublicBySlug(unparsedSlug, locale) {
      const slug = articleSlugSchema.parse(unparsedSlug);
      const selectedLocale = supportedLocaleSchema.parse(locale);
      const stored = await dependencies.repository.findPublicArticleBySlug(slug);
      if (!stored) throw new ArticleServiceError('ARTICLE_NOT_FOUND');
      return publicArticle(stored, selectedLocale, await dependencies.resolveAuthorName?.(stored.article.authorId));
    }
  };
}
