import { useEffect, useMemo, useState } from 'react';
import type {
  ArticleListQuery,
  ArticlePublic,
  ArticlePublicListData,
  SupportedLocale
} from '@sadat-real-estate/contracts';
import { articleListQuerySchema } from '@sadat-real-estate/contracts';
import { ApiClientError } from '../contracts/index.ts';
import { Badge } from '../design_system/index.ts';
import { UxStateView, type UxState } from '../ux_states/index.ts';
import { PublicMediaImage, PublicSiteFooter, PublicSiteHeader } from '../public/components.tsx';
import { getPublicHomepageCopy } from '../public/copy.ts';
import { localizedText } from '../public/model.ts';
import {
  PUBLIC_ARTICLES_PATH,
  defaultPublicArticleCategoryLoader,
  defaultPublicArticleDetailsLoader,
  defaultPublicArticleListLoader,
  parsePublicArticleListQuery,
  publicArticleListUrl,
  publicArticleSlugFromUrl,
  publicArticleUrl,
  type PublicArticleCategoryOption,
  type PublicArticleCategoryLoader,
  type PublicArticleDetailsLoader,
  type PublicArticleListLoader
} from './articles-data.ts';
import { getPublicArticlesCopy, type PublicArticlesCopy } from './articles-copy.ts';
import './articles.css';

export type PublicArticlesViewState = Extract<UxState, 'loading' | 'empty' | 'error' | 'retry' | 'success' | 'permission'>;
export type PublicArticleDetailsViewState = PublicArticlesViewState | 'not_found';

export interface PublicArticlesProps {
  readonly url?: string;
  readonly locale: SupportedLocale;
  readonly initialData?: ArticlePublicListData | undefined;
  readonly initialQuery?: ArticleListQuery | undefined;
  readonly initialState?: 'loading' | 'retry' | undefined;
  readonly categories?: readonly PublicArticleCategoryOption[] | undefined;
  readonly load?: PublicArticleListLoader | undefined;
  readonly loadCategories?: PublicArticleCategoryLoader | undefined;
}

export interface PublicArticleDetailsProps {
  readonly url?: string;
  readonly locale: SupportedLocale;
  readonly initialData?: ArticlePublic | undefined;
  readonly initialState?: 'loading' | 'retry' | 'not_found' | undefined;
  readonly categories?: readonly PublicArticleCategoryOption[] | undefined;
  readonly relatedArticles?: ArticlePublicListData | undefined;
  readonly loadRelated?: PublicArticleListLoader | undefined;
  readonly load?: PublicArticleDetailsLoader | undefined;
}

function errorState(error: unknown): PublicArticlesViewState {
  if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) return 'permission';
  if (error instanceof ApiClientError && error.code === 'NETWORK_ERROR') return 'retry';
  return 'error';
}

function stateCopy(state: Exclude<PublicArticlesViewState, 'success'>, copy: PublicArticlesCopy): { readonly title: string; readonly body: string } {
  switch (state) {
    case 'loading': return { title: copy.loadingTitle, body: copy.loadingBody };
    case 'empty': return { title: copy.emptyTitle, body: copy.emptyBody };
    case 'error': return { title: copy.errorTitle, body: copy.errorBody };
    case 'retry': return { title: copy.retryTitle, body: copy.retryBody };
    case 'permission': return { title: copy.permissionTitle, body: copy.permissionBody };
  }
}

function syncBrowserUrl(query: ArticleListQuery): void {
  if (typeof window !== 'undefined') window.history.replaceState({}, '', publicArticleListUrl(query));
}

function formatPublishedAt(value: string | undefined, locale: SupportedLocale): string | undefined {
  if (value === undefined) return undefined;
  try {
    return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(value));
  } catch {
    return value;
  }
}

function readTime(body: string | undefined): number {
  if (body === undefined || body.trim().length === 0) return 1;
  return Math.max(1, Math.ceil(body.trim().split(/\s+/u).length / 180));
}

function summary(body: string | undefined, copy: PublicArticlesCopy): string {
  if (body === undefined || body.trim().length === 0) return copy.noSummary;
  const normalized = body.trim().replace(/\s+/gu, ' ');
  return normalized.length > 180 ? `${normalized.slice(0, 177)}…` : normalized;
}

function categoryName(
  categoryId: string,
  locale: SupportedLocale,
  categories: readonly PublicArticleCategoryOption[] | undefined
): string | undefined {
  const category = categories?.find(item => item.id === categoryId);
  return category === undefined ? undefined : localizedText(category.name, locale);
}

function mergeCategories(
  supplied: readonly PublicArticleCategoryOption[] | undefined,
  articles: ArticlePublicListData | undefined
): readonly PublicArticleCategoryOption[] {
  const categories = new Map<string, PublicArticleCategoryOption>();
  for (const category of supplied ?? []) categories.set(category.id, category);
  for (const article of articles ?? []) {
    if (article.category !== undefined) categories.set(article.category.id, article.category);
  }
  return [...categories.values()];
}

function StateNotice({
  state,
  copy,
  onRetry
}: {
  readonly state: Exclude<PublicArticlesViewState, 'success'>;
  readonly copy: PublicArticlesCopy;
  readonly onRetry: () => void;
}) {
  const text = stateCopy(state, copy);
  return (
    <section className="public-articles__state" data-state={state}>
      <UxStateView state={state} title={text.title} message={text.body} retryLabel={copy.retryLabel} onRetry={onRetry}>
        {state === 'empty' || state === 'error' ? <button type="button" onClick={onRetry}>{copy.retryLabel}</button> : null}
        {state === 'permission' ? <a href="/">{copy.permissionLink}</a> : null}
      </UxStateView>
    </section>
  );
}

function ArticleCard({
  article,
  locale,
  copy,
  categories
}: {
  readonly article: ArticlePublic;
  readonly locale: SupportedLocale;
  readonly copy: PublicArticlesCopy;
  readonly categories: readonly PublicArticleCategoryOption[] | undefined;
}) {
  const title = localizedText(article.title, locale) ?? article.slug;
  const body = localizedText(article.body, locale);
  const category = article.category === undefined
    ? categoryName(article.categoryId, locale, categories)
    : localizedText(article.category.name, locale);
  const publishedAt = formatPublishedAt(article.publishedAt, locale);
  return (
    <article className="public-articles__card" data-article-card>
      <div className="public-articles__card-media">
        <PublicMediaImage src={article.imageUrl} alt={title} fallback={<UxStateView state="missing_image" title={copy.imageUnavailable} />} />
      </div>
      <div className="public-articles__card-body">
        {category === undefined ? null : <Badge tone="warning">{category}</Badge>}
        <h2><a href={publicArticleUrl(article.slug)}>{title}</a></h2>
        <p className="public-articles__card-summary">{summary(body, copy)}</p>
        <dl className="public-articles__card-meta">
          <div>
            <dt>{copy.publishedAt}</dt>
            <dd>{publishedAt ?? '—'}</dd>
          </div>
          <div>
            <dt>{copy.readTime(1)}</dt>
            <dd>{copy.readTime(readTime(body))}</dd>
          </div>
        </dl>
        <a className="public-articles__card-link" href={publicArticleUrl(article.slug)}>{copy.openArticle}</a>
      </div>
    </article>
  );
}

function Footer({ locale, copy }: { readonly locale: SupportedLocale; readonly copy: PublicArticlesCopy }) { return <PublicSiteFooter locale={locale} description={copy.footerDescription} />; }

export function PublicArticles({
  url,
  locale,
  initialData,
  initialQuery,
  initialState = 'loading',
  categories,
  load = defaultPublicArticleListLoader,
  loadCategories = defaultPublicArticleCategoryLoader
}: PublicArticlesProps) {
  const copy = getPublicArticlesCopy(locale);
  const homepageCopy = getPublicHomepageCopy(locale);
  const sourceUrl = url ?? (typeof window === 'undefined' ? PUBLIC_ARTICLES_PATH : window.location.href);
  const [query, setQuery] = useState<ArticleListQuery>(() => initialQuery ?? parsePublicArticleListQuery(sourceUrl, locale));
  const [data, setData] = useState<ArticlePublicListData | undefined>(initialData);
  const [view, setView] = useState<PublicArticlesViewState>(initialData === undefined ? initialState : initialData.length === 0 ? 'empty' : 'success');
  const [attempt, setAttempt] = useState(0);
  const [search, setSearch] = useState('');
  const [loadedCategories, setLoadedCategories] = useState<readonly PublicArticleCategoryOption[] | undefined>(categories);

  useEffect(() => {
    if (categories !== undefined) {
      setLoadedCategories(categories);
      return;
    }
    const controller = new AbortController();
    void loadCategories(locale, controller.signal)
      .then(nextCategories => {
        if (!controller.signal.aborted) setLoadedCategories(nextCategories);
      })
      .catch(() => {
        // Article results remain usable because every public article may carry its
        // safe category projection. Category metadata is an enhancement, not a
        // reason to replace the primary article state with an error screen.
      });
    return () => controller.abort();
  }, [categories, loadCategories, locale]);

  useEffect(() => {
    if (initialData !== undefined && attempt === 0) return;
    const controller = new AbortController();
    setView('loading');
    void load(query, controller.signal)
      .then(nextData => {
        if (controller.signal.aborted) return;
        setData(nextData);
        setView(nextData.length === 0 ? 'empty' : 'success');
      })
      .catch(error => {
        if (controller.signal.aborted || (error instanceof ApiClientError && error.code === 'ABORTED')) return;
        setView(errorState(error));
      });
    return () => controller.abort();
  }, [attempt, initialData, load, query]);

  const filteredArticles = useMemo(() => {
    if (data === undefined || search.trim().length === 0) return data ?? [];
    const needle = search.trim().toLocaleLowerCase(locale);
    return data.filter(article => {
      const title = localizedText(article.title, locale) ?? '';
      const body = localizedText(article.body, locale) ?? '';
      return `${title} ${body}`.toLocaleLowerCase(locale).includes(needle);
    });
  }, [data, locale, search]);

  const availableCategories = useMemo(
    () => mergeCategories(loadedCategories, data),
    [data, loadedCategories]
  );

  const updateCategory = (categoryId: string | undefined) => {
    const parsed = articleListQuerySchema.safeParse({ ...query, categoryId, page: 1 });
    if (!parsed.success) return;
    setQuery(parsed.data);
    syncBrowserUrl(parsed.data);
    setAttempt(value => value + 1);
  };

  const retry = () => setAttempt(value => value + 1);
  const hasLocalSearchMismatch = view === 'success' && filteredArticles.length === 0 && search.trim().length > 0;
  const resultsView = view === 'success'
    ? hasLocalSearchMismatch
      ? <div className="public-articles__inline-empty" role="status"><p>{copy.searchNoMatch}</p></div>
      : data !== undefined
        ? <div className="public-articles__grid">{filteredArticles.map(article => <ArticleCard key={article.id} article={article} locale={locale} copy={copy} categories={availableCategories} />)}</div>
        : null
    : <StateNotice state={view} copy={copy} onRetry={retry} />;

  return (
    <div className="public-articles" data-page="public-articles" data-articles-state={view}>
      <PublicSiteHeader locale={locale} copy={homepageCopy} activePath={PUBLIC_ARTICLES_PATH} />
      <section className="public-articles__intro" aria-labelledby="public-articles-title">
        <p className="public-articles__eyebrow">{homepageCopy.nav.articles}</p>
        <h1 id="public-articles-title">{copy.title}</h1>
        <p>{copy.subtitle}</p>
        <label className="public-articles__search-label" htmlFor="public-articles-search">{copy.searchLabel}</label>
        <input id="public-articles-search" name="search" type="search" value={search} placeholder={copy.searchPlaceholder} onChange={event => setSearch(event.target.value)} />
      </section>
      <nav className="public-articles__categories" aria-label={copy.categoryLabel}>
        <button type="button" className={query.categoryId === undefined ? 'is-active' : ''} aria-pressed={query.categoryId === undefined} onClick={() => updateCategory(undefined)}>{copy.allCategories}</button>
        {availableCategories.map(category => {
          const label = localizedText(category.name, locale) ?? category.id;
          return <button key={category.id} type="button" className={query.categoryId === category.id ? 'is-active' : ''} aria-pressed={query.categoryId === category.id} onClick={() => updateCategory(category.id)}>{label}</button>;
        })}
      </nav>
      <section className="public-articles__results" aria-labelledby="public-articles-results-title" aria-busy={view === 'loading'}>
        <div className="public-articles__toolbar"><p id="public-articles-results-title">{view === 'success' ? copy.resultCount(filteredArticles.length) : copy.title}</p></div>
        {resultsView}
      </section>
      <section className="public-articles__cta" aria-labelledby="public-articles-cta-title">
        <div><p className="public-articles__eyebrow">{homepageCopy.brand}</p><h2 id="public-articles-cta-title">{copy.openArticle}</h2><p>{copy.subtitle}</p></div>
        <a href="/properties">{homepageCopy.browseProperties}</a>
      </section>
      <Footer locale={locale} copy={copy} />
    </div>
  );
}

function NotFoundNotice({ copy }: { readonly copy: PublicArticlesCopy }) {
  return (
    <section className="public-article-details__state" data-state="not_found" role="alert" aria-label={copy.notFoundTitle}>
      <h1>{copy.notFoundTitle}</h1>
      <p>{copy.notFoundBody}</p>
      <a href={PUBLIC_ARTICLES_PATH}>{copy.notFoundLink}</a>
    </section>
  );
}

function ArticleBody({ article, locale, copy }: { readonly article: ArticlePublic; readonly locale: SupportedLocale; readonly copy: PublicArticlesCopy }) {
  const body = localizedText(article.body, locale);
  const paragraphs = (body ?? '').split(/\n{2,}/u).map(value => value.trim()).filter(Boolean);
  return (
    <section className="public-article-details__body" aria-labelledby="public-article-body-title">
      <h2 id="public-article-body-title">{copy.articleBody}</h2>
      {paragraphs.length === 0 ? <p>{copy.noSummary}</p> : paragraphs.map((paragraph, index) => <p key={`${article.id}-paragraph-${index}`}>{paragraph}</p>)}
    </section>
  );
}

function ArticleDetailsView({
  article,
  locale,
  copy,
  categories,
  relatedArticles
}: {
  readonly article: ArticlePublic;
  readonly locale: SupportedLocale;
  readonly copy: PublicArticlesCopy;
  readonly categories: readonly PublicArticleCategoryOption[] | undefined;
  readonly relatedArticles: ArticlePublicListData | undefined;
}) {
  const title = localizedText(article.title, locale) ?? article.slug;
  const category = article.category === undefined
    ? categoryName(article.categoryId, locale, categories)
    : localizedText(article.category.name, locale);
  const publishedAt = formatPublishedAt(article.publishedAt, locale);
  const related = relatedArticles?.filter(item => item.slug !== article.slug).slice(0, 3) ?? [];
  return (
    <article className="public-article-details__article">
      <div className="public-article-details__hero">
        <div className="public-article-details__hero-media"><PublicMediaImage src={article.imageUrl} alt={title} fallback={<UxStateView state="missing_image" title={copy.imageUnavailable} />} /></div>
        <div className="public-article-details__hero-copy">
          {category === undefined ? null : <Badge tone="warning">{category}</Badge>}
          <h1 id="public-article-details-title">{title}</h1>
          <dl className="public-article-details__meta">
            <div><dt>{copy.publishedAt}</dt><dd>{publishedAt ?? '—'}</dd></div>
            <div><dt>{copy.readTime(1)}</dt><dd>{copy.readTime(readTime(localizedText(article.body, locale)))}</dd></div>
          </dl>
          <p className="public-article-details__author-note">{copy.authorUnavailable}</p>
        </div>
      </div>
      <ArticleBody article={article} locale={locale} copy={copy} />
      <section className="public-article-details__related" aria-labelledby="public-article-related-title">
        <h2 id="public-article-related-title">{copy.relatedArticles}</h2>
        {related.length === 0 ? <p>{copy.noRelatedArticles}</p> : <div className="public-article-details__related-grid">{related.map(item => <ArticleCard key={item.id} article={item} locale={locale} copy={copy} categories={categories} />)}</div>}
      </section>
    </article>
  );
}

export function PublicArticleDetails({
  url,
  locale,
  initialData,
  initialState,
  categories,
  relatedArticles,
  loadRelated,
  load = defaultPublicArticleDetailsLoader
}: PublicArticleDetailsProps) {
  const copy = getPublicArticlesCopy(locale);
  const homepageCopy = getPublicHomepageCopy(locale);
  const sourceUrl = url ?? (typeof window === 'undefined' ? PUBLIC_ARTICLES_PATH : window.location.href);
  const slug = publicArticleSlugFromUrl(sourceUrl);
  const [data, setData] = useState<ArticlePublic | undefined>(initialData);
  const [relatedData, setRelatedData] = useState<ArticlePublicListData | undefined>(relatedArticles);
  const [view, setView] = useState<PublicArticleDetailsViewState>(slug === undefined ? 'not_found' : initialData === undefined ? initialState ?? 'loading' : 'success');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (initialData !== undefined && attempt === 0) return;
    if (slug === undefined) {
      setView('not_found');
      return;
    }
    const controller = new AbortController();
    setView('loading');
    void load(slug, locale, controller.signal)
      .then(nextData => {
        if (controller.signal.aborted) return;
        setData(nextData);
        setView('success');
      })
      .catch(error => {
        if (controller.signal.aborted || (error instanceof ApiClientError && error.code === 'ABORTED')) return;
        if (error instanceof ApiClientError && error.status === 404) setView('not_found');
        else setView(errorState(error));
      });
    return () => controller.abort();
  }, [attempt, initialData, load, locale, slug]);

  useEffect(() => {
    if (loadRelated === undefined || relatedArticles !== undefined || slug === undefined) return;
    const controller = new AbortController();
    void loadRelated({ locale, page: 1, limit: 20 }, controller.signal)
      .then(nextData => {
        if (!controller.signal.aborted) setRelatedData(nextData);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [loadRelated, locale, relatedArticles, slug]);

  const retry = () => setAttempt(value => value + 1);
  const state = view === 'not_found' || view === 'success' ? null : stateCopy(view, copy);

  return (
    <div className="public-article-details" data-page="public-article-details" data-article-details-state={view}>
      <PublicSiteHeader locale={locale} copy={homepageCopy} activePath={PUBLIC_ARTICLES_PATH} />
      <div className="public-article-details__content">
        <a className="public-article-details__back" href={PUBLIC_ARTICLES_PATH}>{copy.backToArticles}</a>
        {view === 'not_found' ? <NotFoundNotice copy={copy} /> : view === 'success' && data !== undefined ? <ArticleDetailsView article={data} locale={locale} copy={copy} categories={categories} relatedArticles={relatedData} /> : state === null ? null : <section className="public-article-details__state" data-state={view}><UxStateView state={view} title={state.title} message={state.body} retryLabel={copy.retryLabel} onRetry={retry}>{view === 'permission' ? <a href="/">{copy.permissionLink}</a> : null}{view === 'error' ? <button type="button" onClick={retry}>{copy.retryLabel}</button> : null}</UxStateView></section>}
      </div>
      <Footer locale={locale} copy={copy} />
    </div>
  );
}
