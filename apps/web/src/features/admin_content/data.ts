import {
  articleAdminListQuerySchema,
  articleAdminListSuccessEnvelopeSchema,
  articleCategoryCreateSchema,
  articleCategoryDeleteSchema,
  articleCategoryListQuerySchema,
  articleCategoryListSuccessEnvelopeSchema,
  articleCategoryPatchSchema,
  articleCategorySuccessEnvelopeSchema,
  articleCategoryDeleteSuccessEnvelopeSchema,
  articleCreateSchema,
  articleParamsSchema,
  articlePatchSchema,
  articleSuccessEnvelopeSchema,
  articleTransitionRequestSchema,
  cmsAdminAboutBlockPutSchema,
  cmsAdminContentNamespaceSchema,
  cmsAdminContentSuccessEnvelopeSchema,
  cmsAdminPopulationValuePutSchema,
  cmsAdminTeamMemberPutSchema,
  type Article,
  type ArticleAdminListData,
  type ArticleAdminListQuery,
  type ArticleCategory,
  type ArticleCategoryCreate,
  type ArticleCategoryDelete,
  type ArticleCategoryListData,
  type ArticleCategoryListQuery,
  type ArticleCategoryPatch,
  type ArticleCreate,
  type ArticlePatch,
  type ArticleTransitionRequest,
  type CmsAdminContentData,
  type CmsAdminContentNamespace
} from '@sadat-real-estate/contracts';
import { ApiClient, type ApiClientOptions } from '../contracts/index.ts';

export const ADMIN_ARTICLES_ROUTE = '/admin/articles' as const;
export const ADMIN_ARTICLE_CATEGORIES_ROUTE = '/admin/article-categories' as const;
export const ADMIN_CMS_CONTENT_ROUTE = '/admin/content' as const;
export const ADMIN_CMS_ABOUT_ROUTE = `${ADMIN_CMS_CONTENT_ROUTE}/about` as const;
export const ADMIN_CMS_TEAM_ROUTE = `${ADMIN_CMS_CONTENT_ROUTE}/team` as const;
export const ADMIN_CMS_POPULATION_ROUTE = `${ADMIN_CMS_CONTENT_ROUTE}/population-counter` as const;

export interface AdminContentAuthorizationSource {
  readonly getAuthorizationHeader: () => string | undefined;
}

interface CommonOptions {
  readonly apiClient?: ApiClient | undefined;
  readonly apiOrigin?: string | undefined;
  readonly authorization?: AdminContentAuthorizationSource | undefined;
  readonly signal?: AbortSignal | undefined;
}

export interface AdminContentLoadOptions extends CommonOptions {
  readonly query?: Partial<ArticleAdminListQuery> | undefined;
}

export interface AdminCategoryLoadOptions extends CommonOptions {
  readonly query?: Partial<ArticleCategoryListQuery> | undefined;
}

export type AdminCmsContentOptions = CommonOptions;

export type AdminArticleListData = ArticleAdminListData & { readonly page: number; readonly limit: number; readonly total: number };
export type AdminCategoryListData = ArticleCategoryListData & { readonly page: number; readonly limit: number; readonly total: number };
export type AdminArticlesLoader = (query: ArticleAdminListQuery, signal?: AbortSignal) => Promise<AdminArticleListData>;
export type AdminCategoriesLoader = (query: ArticleCategoryListQuery, signal?: AbortSignal) => Promise<AdminCategoryListData>;
export type AdminArticleCreateMutation = (input: ArticleCreate, signal?: AbortSignal) => Promise<Article>;
export type AdminArticleUpdateMutation = (articleId: string, input: ArticlePatch, signal?: AbortSignal) => Promise<Article>;
export type AdminArticleTransitionMutation = (articleId: string, input: ArticleTransitionRequest, signal?: AbortSignal) => Promise<Article>;
export type AdminCategoryCreateMutation = (input: ArticleCategoryCreate, signal?: AbortSignal) => Promise<ArticleCategory>;
export type AdminCategoryUpdateMutation = (categoryId: string, input: ArticleCategoryPatch, signal?: AbortSignal) => Promise<ArticleCategory>;
export type AdminCategoryDeleteMutation = (categoryId: string, input: ArticleCategoryDelete, signal?: AbortSignal) => Promise<{ id: string; deleted: true }>;
export type AdminCmsContentLoader = (namespace: CmsAdminContentNamespace, signal?: AbortSignal) => Promise<CmsAdminContentData>;
export type AdminCmsContentMutation = (namespace: CmsAdminContentNamespace, input: unknown, signal?: AbortSignal) => Promise<CmsAdminContentData>;

function clientFor(options: Pick<CommonOptions, 'apiClient' | 'apiOrigin'>): ApiClient {
  if (options.apiClient !== undefined) return options.apiClient;
  const clientOptions: ApiClientOptions = options.apiOrigin === undefined ? {} : { baseUrl: options.apiOrigin };
  return new ApiClient(clientOptions);
}

function headersFor(source: AdminContentAuthorizationSource | undefined): HeadersInit | undefined {
  const authorization = source?.getAuthorizationHeader();
  return authorization === undefined ? undefined : { authorization };
}

function requestOptions(options: CommonOptions): { readonly headers?: HeadersInit; readonly signal?: AbortSignal } {
  const headers = headersFor(options.authorization);
  return {
    ...(headers === undefined ? {} : { headers }),
    ...(options.signal === undefined ? {} : { signal: options.signal })
  };
}

export async function loadAdminArticles(options: AdminContentLoadOptions = {}): Promise<AdminArticleListData> {
  const query = articleAdminListQuerySchema.parse({ page: 1, limit: 20, sort: 'updatedAt', direction: 'desc', ...options.query });
  const response = await clientFor(options).request(ADMIN_ARTICLES_ROUTE, {
    responseSchema: articleAdminListSuccessEnvelopeSchema,
    query,
    ...requestOptions(options)
  });
  return {
    ...response.data.data,
    page: response.data.meta.page ?? query.page,
    limit: response.data.meta.limit ?? query.limit,
    total: response.data.meta.total ?? response.data.data.items.length
  };
}

export async function createAdminArticle(input: unknown, options: CommonOptions = {}): Promise<Article> {
  const body = articleCreateSchema.parse(input);
  const response = await clientFor(options).request(ADMIN_ARTICLES_ROUTE, {
    method: 'POST', responseSchema: articleSuccessEnvelopeSchema, json: body, ...requestOptions(options)
  });
  return response.data.data;
}

export async function updateAdminArticle(articleId: string, input: unknown, options: CommonOptions = {}): Promise<Article> {
  const id = articleParamsSchema.parse({ articleId }).articleId;
  const body = articlePatchSchema.parse(input);
  const response = await clientFor(options).request(`${ADMIN_ARTICLES_ROUTE}/${id}`, {
    method: 'PATCH', responseSchema: articleSuccessEnvelopeSchema, json: body, ...requestOptions(options)
  });
  return response.data.data;
}

export async function transitionAdminArticle(articleId: string, input: unknown, options: CommonOptions = {}): Promise<Article> {
  const id = articleParamsSchema.parse({ articleId }).articleId;
  const body = articleTransitionRequestSchema.parse(input);
  const response = await clientFor(options).request(`${ADMIN_ARTICLES_ROUTE}/${id}/transitions`, {
    method: 'POST', responseSchema: articleSuccessEnvelopeSchema, json: body, ...requestOptions(options)
  });
  return response.data.data;
}

export async function loadAdminArticleCategories(options: AdminCategoryLoadOptions = {}): Promise<AdminCategoryListData> {
  const query = articleCategoryListQuerySchema.parse({ page: 1, limit: 20, sort: 'displayOrder', direction: 'asc', ...options.query });
  const response = await clientFor(options).request(ADMIN_ARTICLE_CATEGORIES_ROUTE, {
    responseSchema: articleCategoryListSuccessEnvelopeSchema,
    query,
    ...requestOptions(options)
  });
  return {
    ...response.data.data,
    page: response.data.meta.page ?? query.page,
    limit: response.data.meta.limit ?? query.limit,
    total: response.data.meta.total ?? response.data.data.items.length
  };
}

export async function createAdminArticleCategory(input: unknown, options: CommonOptions = {}): Promise<ArticleCategory> {
  const body = articleCategoryCreateSchema.parse(input);
  const response = await clientFor(options).request(ADMIN_ARTICLE_CATEGORIES_ROUTE, {
    method: 'POST', responseSchema: articleCategorySuccessEnvelopeSchema, json: body, ...requestOptions(options)
  });
  return response.data.data;
}

export async function updateAdminArticleCategory(categoryId: string, input: unknown, options: CommonOptions = {}): Promise<ArticleCategory> {
  const body = articleCategoryPatchSchema.parse(input);
  const response = await clientFor(options).request(`${ADMIN_ARTICLE_CATEGORIES_ROUTE}/${categoryId}`, {
    method: 'PATCH', responseSchema: articleCategorySuccessEnvelopeSchema, json: body, ...requestOptions(options)
  });
  return response.data.data;
}

export async function deleteAdminArticleCategory(categoryId: string, input: unknown, options: CommonOptions = {}): Promise<{ id: string; deleted: true }> {
  const body = articleCategoryDeleteSchema.parse(input);
  const response = await clientFor(options).request(`${ADMIN_ARTICLE_CATEGORIES_ROUTE}/${categoryId}`, {
    method: 'DELETE', responseSchema: articleCategoryDeleteSuccessEnvelopeSchema, json: body, ...requestOptions(options)
  });
  return response.data.data;
}

export async function loadAdminCmsContent(namespace: CmsAdminContentNamespace, options: AdminCmsContentOptions = {}): Promise<CmsAdminContentData> {
  const parsedNamespace = cmsAdminContentNamespaceSchema.parse(namespace);
  const response = await clientFor(options).request(`${ADMIN_CMS_CONTENT_ROUTE}/${parsedNamespace}`, {
    responseSchema: cmsAdminContentSuccessEnvelopeSchema,
    ...requestOptions(options)
  });
  return response.data.data;
}

export async function updateAdminCmsContent(namespace: CmsAdminContentNamespace, input: unknown, options: CommonOptions = {}): Promise<CmsAdminContentData> {
  const parsedNamespace = cmsAdminContentNamespaceSchema.parse(namespace);
  const body = parsedNamespace === 'about'
    ? cmsAdminAboutBlockPutSchema.parse(input)
    : parsedNamespace === 'team'
      ? cmsAdminTeamMemberPutSchema.parse(input)
      : cmsAdminPopulationValuePutSchema.parse(input);
  const response = await clientFor(options).request(`${ADMIN_CMS_CONTENT_ROUTE}/${parsedNamespace}`, {
    method: 'PUT',
    responseSchema: cmsAdminContentSuccessEnvelopeSchema,
    json: body,
    ...requestOptions(options)
  });
  return response.data.data;
}

export function createAdminArticlesLoader(options: Omit<AdminContentLoadOptions, 'query' | 'signal'> = {}): AdminArticlesLoader {
  return (query, signal) => loadAdminArticles({ ...options, query, ...(signal === undefined ? {} : { signal }) });
}

export function createAdminCategoriesLoader(options: Omit<AdminCategoryLoadOptions, 'query' | 'signal'> = {}): AdminCategoriesLoader {
  return (query, signal) => loadAdminArticleCategories({ ...options, query, ...(signal === undefined ? {} : { signal }) });
}

export function createAdminContentSource(options: Omit<CommonOptions, 'signal'> = {}) {
  return {
    loadArticles: createAdminArticlesLoader(options),
    createArticle: (input: ArticleCreate, signal?: AbortSignal) => createAdminArticle(input, { ...options, ...(signal === undefined ? {} : { signal }) }),
    updateArticle: (id: string, input: ArticlePatch, signal?: AbortSignal) => updateAdminArticle(id, input, { ...options, ...(signal === undefined ? {} : { signal }) }),
    transitionArticle: (id: string, input: ArticleTransitionRequest, signal?: AbortSignal) => transitionAdminArticle(id, input, { ...options, ...(signal === undefined ? {} : { signal }) }),
    loadCategories: createAdminCategoriesLoader(options),
    createCategory: (input: ArticleCategoryCreate, signal?: AbortSignal) => createAdminArticleCategory(input, { ...options, ...(signal === undefined ? {} : { signal }) }),
    updateCategory: (id: string, input: ArticleCategoryPatch, signal?: AbortSignal) => updateAdminArticleCategory(id, input, { ...options, ...(signal === undefined ? {} : { signal }) }),
    deleteCategory: (id: string, input: ArticleCategoryDelete, signal?: AbortSignal) => deleteAdminArticleCategory(id, input, { ...options, ...(signal === undefined ? {} : { signal }) })
  };
}

export function createAdminCmsContentSource(options: Omit<CommonOptions, 'signal'> = {}) {
  return {
    load: (namespace: CmsAdminContentNamespace, signal?: AbortSignal) => loadAdminCmsContent(namespace, { ...options, ...(signal === undefined ? {} : { signal }) }),
    update: (namespace: CmsAdminContentNamespace, input: unknown, signal?: AbortSignal) => updateAdminCmsContent(namespace, input, { ...options, ...(signal === undefined ? {} : { signal }) })
  };
}

export type AdminContentSource = ReturnType<typeof createAdminContentSource>;
