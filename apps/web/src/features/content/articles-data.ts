import {
  articleListQuerySchema,
  articlePublicCategoryListSuccessEnvelopeSchema,
  articlePublicListSuccessEnvelopeSchema,
  articlePublicSuccessEnvelopeSchema,
  articleSlugSchema,
  type ArticleListQuery,
  type ArticlePublic,
  type ArticlePublicCategory,
  type ArticlePublicListData,
  type LocalizedText,
  type SupportedLocale
} from '@sadat-real-estate/contracts';
import { ApiClient, type ApiClientOptions } from '../contracts/index.ts';

export const PUBLIC_ARTICLES_ROUTE = '/public/articles' as const;
export const PUBLIC_ARTICLE_CATEGORIES_ROUTE = '/public/article-categories' as const;
export const PUBLIC_ARTICLES_PATH = '/articles' as const;

const DEFAULT_QUERY = articleListQuerySchema.parse({});

export interface PublicArticleCategoryOption {
  readonly id: string;
  readonly slug?: string | undefined;
  readonly name: LocalizedText;
  readonly description?: LocalizedText | undefined;
}

export interface PublicArticleListLoadOptions {
  readonly query: ArticleListQuery;
  readonly apiClient?: ApiClient | undefined;
  readonly apiOrigin?: string | undefined;
  readonly signal?: AbortSignal | undefined;
}

export interface PublicArticleDetailsLoadOptions {
  readonly slug: string;
  readonly locale: SupportedLocale;
  readonly apiClient?: ApiClient | undefined;
  readonly apiOrigin?: string | undefined;
  readonly signal?: AbortSignal | undefined;
}

export type PublicArticleListLoader = (
  query: ArticleListQuery,
  signal?: AbortSignal
) => Promise<ArticlePublicListData>;

export type PublicArticleDetailsLoader = (
  slug: string,
  locale: SupportedLocale,
  signal?: AbortSignal
) => Promise<ArticlePublic>;

export type PublicArticleCategoryLoader = (
  locale: SupportedLocale,
  signal?: AbortSignal
) => Promise<readonly PublicArticleCategoryOption[]>;

function clientFor(options: { readonly apiClient?: ApiClient | undefined; readonly apiOrigin?: string | undefined }): ApiClient {
  if (options.apiClient !== undefined) return options.apiClient;
  const clientOptions: ApiClientOptions = options.apiOrigin === undefined ? {} : { baseUrl: options.apiOrigin };
  return new ApiClient(clientOptions);
}

function paramsForSource(source: URLSearchParams | URL | string): URLSearchParams {
  if (source instanceof URLSearchParams) return source;
  if (source instanceof URL) return source.searchParams;
  try {
    return new URL(source, 'http://sadat-real-estate.local').searchParams;
  } catch {
    return new URLSearchParams();
  }
}

export function defaultPublicArticleListQuery(locale: SupportedLocale = 'ar'): ArticleListQuery {
  return articleListQuerySchema.parse({ ...DEFAULT_QUERY, locale });
}

export function parsePublicArticleListQuery(
  source: URLSearchParams | URL | string,
  locale: SupportedLocale = 'ar'
): ArticleListQuery {
  const params = paramsForSource(source);
  const raw: Record<string, string | number> = { locale };
  const categoryId = params.get('categoryId');
  const page = params.get('page');
  const limit = params.get('limit');
  if (categoryId !== null && categoryId.trim().length > 0) raw.categoryId = categoryId;
  if (page !== null && page.trim().length > 0) raw.page = Number(page);
  if (limit !== null && limit.trim().length > 0) raw.limit = Number(limit);
  const parsed = articleListQuerySchema.safeParse(raw);
  return parsed.success ? parsed.data : defaultPublicArticleListQuery(locale);
}

export function publicArticleListParams(query: ArticleListQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.categoryId !== undefined) params.set('categoryId', query.categoryId);
  if (query.page !== DEFAULT_QUERY.page) params.set('page', String(query.page));
  if (query.limit !== DEFAULT_QUERY.limit) params.set('limit', String(query.limit));
  return params;
}

export function publicArticleListUrl(query: ArticleListQuery): string {
  const queryString = publicArticleListParams(query).toString();
  return queryString.length === 0 ? PUBLIC_ARTICLES_PATH : `${PUBLIC_ARTICLES_PATH}?${queryString}`;
}

export function publicArticleSlugFromUrl(source: URL | string): string | undefined {
  let url: URL;
  try {
    url = source instanceof URL ? source : new URL(source, 'http://sadat-real-estate.local');
  } catch {
    return undefined;
  }
  const segments = url.pathname.split('/').filter(Boolean);
  if (segments.length !== 2 || segments[0] !== PUBLIC_ARTICLES_PATH.slice(1)) return undefined;
  try {
    const parsed = articleSlugSchema.safeParse(decodeURIComponent(segments[1] ?? ''));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

export function publicArticleUrl(slug: string): string {
  return `${PUBLIC_ARTICLES_PATH}/${encodeURIComponent(articleSlugSchema.parse(slug))}`;
}

export async function loadPublicArticles(options: PublicArticleListLoadOptions): Promise<ArticlePublicListData> {
  const client = clientFor(options);
  const requestOptions = options.signal === undefined
    ? { responseSchema: articlePublicListSuccessEnvelopeSchema, query: options.query }
    : { responseSchema: articlePublicListSuccessEnvelopeSchema, query: options.query, signal: options.signal };
  const response = await client.request(PUBLIC_ARTICLES_ROUTE, requestOptions);
  return response.data.data;
}

export function createPublicArticleListLoader(
  options: Omit<PublicArticleListLoadOptions, 'query' | 'signal'> = {}
): PublicArticleListLoader {
  return (query, signal) => loadPublicArticles({ ...options, query, ...(signal === undefined ? {} : { signal }) });
}

export const defaultPublicArticleListLoader = createPublicArticleListLoader();

export async function loadPublicArticleDetails(options: PublicArticleDetailsLoadOptions): Promise<ArticlePublic> {
  const slug = articleSlugSchema.parse(options.slug);
  const client = clientFor(options);
  const requestOptions = options.signal === undefined
    ? { responseSchema: articlePublicSuccessEnvelopeSchema, query: { locale: options.locale } }
    : { responseSchema: articlePublicSuccessEnvelopeSchema, query: { locale: options.locale }, signal: options.signal };
  const response = await client.request(`${PUBLIC_ARTICLES_ROUTE}/${encodeURIComponent(slug)}`, requestOptions);
  return response.data.data;
}

export function createPublicArticleDetailsLoader(
  options: Omit<PublicArticleDetailsLoadOptions, 'slug' | 'locale' | 'signal'> = {}
): PublicArticleDetailsLoader {
  return (slug, locale, signal) => loadPublicArticleDetails({ ...options, slug, locale, ...(signal === undefined ? {} : { signal }) });
}

export const defaultPublicArticleDetailsLoader = createPublicArticleDetailsLoader();

export async function loadPublicArticleCategories(options: {
  readonly locale: SupportedLocale;
  readonly apiClient?: ApiClient | undefined;
  readonly apiOrigin?: string | undefined;
  readonly signal?: AbortSignal | undefined;
}): Promise<readonly PublicArticleCategoryOption[]> {
  const client = clientFor(options);
  const requestOptions = options.signal === undefined
    ? { responseSchema: articlePublicCategoryListSuccessEnvelopeSchema, query: { locale: options.locale } }
    : { responseSchema: articlePublicCategoryListSuccessEnvelopeSchema, query: { locale: options.locale }, signal: options.signal };
  const response = await client.request(PUBLIC_ARTICLE_CATEGORIES_ROUTE, requestOptions);
  return response.data.data satisfies ArticlePublicCategory[];
}

export function createPublicArticleCategoryLoader(
  options: { readonly apiClient?: ApiClient | undefined; readonly apiOrigin?: string | undefined } = {}
): PublicArticleCategoryLoader {
  return (locale, signal) => loadPublicArticleCategories({
    ...options,
    locale,
    ...(signal === undefined ? {} : { signal })
  });
}

export const defaultPublicArticleCategoryLoader = createPublicArticleCategoryLoader();
