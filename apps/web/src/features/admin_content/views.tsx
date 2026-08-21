import { useEffect, useMemo, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import {
  articleCategoryCreateSchema,
  articleCategoryPatchSchema,
  articleCreateSchema,
  articlePatchSchema,
  articleTransitionRequestSchema,
  type CmsAdminAboutBlock,
  type CmsAdminContentData,
  type CmsAdminContentNamespace,
  type CmsAdminPopulationValue,
  type CmsAdminTeamMember,
  localizedTextSchema,
  type Article,
  type ArticleAdminListQuery,
  type ArticleAvailableAction,
  type ArticleCategoryListQuery,
  type ArticleCategory,
  type ArticleCategoryCreate,
  type ArticleCategoryDelete,
  type ArticleCategoryPatch,
  type ArticleCreate,
  type ArticlePatch,
  type ArticleStatus,
  type ArticleTransitionRequest,
  type LocalizedText,
  type SupportedLocale
} from '@sadat-real-estate/contracts';
import { ApiClientError } from '../contracts/index.ts';
import { AdminNavigation } from '../admin/index.ts';
import { Button, StateMessage } from '../design_system/index.ts';
import type { RouteSession } from '../routing/index.ts';
import {
  ADMIN_ARTICLE_CATEGORIES_ROUTE,
  ADMIN_ARTICLES_ROUTE,
  ADMIN_CMS_ABOUT_ROUTE,
  ADMIN_CMS_POPULATION_ROUTE,
  ADMIN_CMS_TEAM_ROUTE,
  createAdminCmsContentSource,
  createAdminContentSource,
  type AdminArticleCreateMutation,
  type AdminArticleListData,
  type AdminArticleTransitionMutation,
  type AdminArticleUpdateMutation,
  type AdminArticlesLoader,
  type AdminCategoriesLoader,
  type AdminCategoryCreateMutation,
  type AdminCategoryDeleteMutation,
  type AdminCategoryListData,
  type AdminCategoryUpdateMutation,
  type AdminCmsContentLoader,
  type AdminCmsContentMutation,
  type AdminContentAuthorizationSource
} from './data.ts';
import { getAdminCmsCopy, getAdminContentCopy, type AdminCmsState, type AdminContentState } from './copy.ts';
import './styles.css';

export interface AdminContentProps {
  readonly locale: SupportedLocale;
  readonly session: RouteSession;
  readonly authClient?: AdminContentAuthorizationSource | undefined;
  readonly apiOrigin?: string | undefined;
  readonly initialArticles?: AdminArticleListData | undefined;
  readonly initialCategories?: AdminCategoryListData | undefined;
  readonly loadArticles?: AdminArticlesLoader | undefined;
  readonly loadCategories?: AdminCategoriesLoader | undefined;
  readonly createArticle?: AdminArticleCreateMutation | undefined;
  readonly updateArticle?: AdminArticleUpdateMutation | undefined;
  readonly transitionArticle?: AdminArticleTransitionMutation | undefined;
  readonly createCategory?: AdminCategoryCreateMutation | undefined;
  readonly updateCategory?: AdminCategoryUpdateMutation | undefined;
  readonly deleteCategory?: AdminCategoryDeleteMutation | undefined;
}

const locales: readonly SupportedLocale[] = ['ar', 'en', 'zh-CN'];
const statuses: readonly ArticleStatus[] = ['draft', 'pending_review', 'published', 'archived'];
const actionToStatus: Readonly<Partial<Record<ArticleAvailableAction, ArticleStatus>>> = {
  submit: 'pending_review', publish: 'published', return_to_draft: 'draft', archive: 'archived', restore: 'draft'
};

type LocalizedDraft = Record<SupportedLocale, string>;
type LocalizedStateSetter = Dispatch<SetStateAction<LocalizedDraft>>;

function localizedDraft(value: LocalizedText | undefined): LocalizedDraft {
  return { ar: value?.ar ?? '', en: value?.en ?? '', 'zh-CN': value?.['zh-CN'] ?? '' };
}

function localizedValue(value: LocalizedText | undefined, locale: SupportedLocale): string {
  return value?.[locale] ?? value?.ar ?? value?.en ?? value?.['zh-CN'] ?? '';
}

function parseLocalized(value: LocalizedDraft): LocalizedText {
  const input: Partial<LocalizedText> = {};
  for (const locale of locales) {
    const text = value[locale].trim();
    if (text !== '') input[locale] = text;
  }
  return localizedTextSchema.parse(input);
}

function dateLabel(value: string, locale: SupportedLocale): string {
  try { return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(value)); } catch { return '—'; }
}

function localePath(locale: SupportedLocale, path: string): string {
  const url = new URL(path, 'http://sadat-real-estate.local');
  url.searchParams.set('lang', locale);
  return `${url.pathname}${url.search}${url.hash}`;
}

function stateForError(error: unknown): Exclude<AdminContentState, 'loading' | 'empty' | 'success'> {
  if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) return 'permission';
  if (error instanceof ApiClientError && (error.code === 'NETWORK_ERROR' || error.code === 'ABORTED')) return 'retry';
  return 'error';
}

function StatePanel({ state, locale, onRetry }: { readonly state: Exclude<AdminContentState, 'success' | 'empty'>; readonly locale: SupportedLocale; readonly onRetry: () => void }) {
  const copy = getAdminContentCopy(locale);
  const message = copy.states[state];
  return <section className="admin-content__state" data-state={state} aria-label={message.title}><StateMessage state={state} title={message.title} message={message.body} onRetry={state === 'retry' ? onRetry : undefined} retryLabel={copy.retry} />{state === 'error' ? <Button variant="secondary" size="sm" onClick={onRetry}>{copy.retry}</Button> : null}</section>;
}

function EmptyPanel({ locale }: { readonly locale: SupportedLocale }) {
  const copy = getAdminContentCopy(locale).states.empty;
  return <section className="admin-content__state" data-state="empty" aria-label={copy.title}><h2>{copy.title}</h2><p>{copy.body}</p></section>;
}

function StatusBadge({ status, locale }: { readonly status: ArticleStatus; readonly locale: SupportedLocale }) {
  const tone = status === 'published' ? 'success' : status === 'pending_review' ? 'warning' : status === 'draft' ? 'info' : 'neutral';
  return <span className="admin-content__badge" data-tone={tone}>{getAdminContentCopy(locale).status[status]}</span>;
}

function LocalizedFields({ label, value, onChange, multiline = false }: { readonly label: string; readonly value: LocalizedDraft; readonly onChange: (locale: SupportedLocale, value: string) => void; readonly multiline?: boolean }) {
  return <div className="admin-content__localized-fields"><span className="admin-content__field-label">{label}</span><div className="admin-content__localized-grid">{locales.map(locale => <label key={locale} htmlFor={`${label}-${locale}`}>{locale.toUpperCase()} {label}{multiline ? <textarea id={`${label}-${locale}`} value={value[locale]} onChange={event => onChange(locale, event.target.value)} rows={4} /> : <input id={`${label}-${locale}`} value={value[locale]} onChange={event => onChange(locale, event.target.value)} />}</label>)}</div></div>;
}

function ArticleEditor({ article, categories, locale, onCancel, onSave }: { readonly article?: Article; readonly categories: readonly ArticleCategory[]; readonly locale: SupportedLocale; readonly onCancel: () => void; readonly onSave: (input: ArticleCreate | ArticlePatch, articleId?: string) => Promise<void> }) {
  const copy = getAdminContentCopy(locale);
  const [categoryId, setCategoryId] = useState(article?.categoryId ?? categories[0]?.id ?? '');
  const [slug, setSlug] = useState(article?.slug ?? '');
  const [title, setTitle] = useState<LocalizedDraft>(() => localizedDraft(article?.title));
  const [body, setBody] = useState<LocalizedDraft>(() => localizedDraft(article?.body));
  const [reason, setReason] = useState('');
  const [state, setState] = useState<'idle' | 'saving' | 'error'>('idle');
  const [feedback, setFeedback] = useState<string | undefined>();

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (reason.trim().length < 5) { setState('error'); setFeedback(copy.reasonRequired); return; }
    if (categoryId === '') { setState('error'); setFeedback(copy.categoryRequired); return; }
    try {
      const titleValue = parseLocalized(title);
      const bodyValue = parseLocalized(body);
      const common = { categoryId, slug: slug.trim(), title: titleValue, body: bodyValue, reason: reason.trim() };
      setState('saving'); setFeedback(undefined);
      if (article === undefined) await onSave(articleCreateSchema.parse(common));
      else await onSave(articlePatchSchema.parse({ ...common, version: article.version }), article.id);
      setState('idle');
    } catch { setState('error'); setFeedback(copy.titleRequired); }
  }

  const updateField = (setter: LocalizedStateSetter) => (localeKey: SupportedLocale, value: string) => setter(current => ({ ...current, [localeKey]: value }));
  return <section className="admin-content__editor" data-testid="admin-article-editor"><div className="admin-content__editor-heading"><div><p className="admin-content__eyebrow">{copy.eyebrow}</p><h2>{article === undefined ? copy.createArticle : `${copy.edit}: ${localizedValue(article.title, locale)}`}</h2></div><Button type="button" variant="secondary" onClick={onCancel}>{copy.cancel}</Button></div><form onSubmit={event => { void submit(event); }}><div className="admin-content__form-grid"><label htmlFor="admin-article-slug">{copy.slug}<input id="admin-article-slug" value={slug} onChange={event => setSlug(event.target.value)} required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" /></label><label htmlFor="admin-article-category">{copy.category}<select id="admin-article-category" value={categoryId} onChange={event => setCategoryId(event.target.value)} required><option value="">{copy.categoryRequired}</option>{categories.filter(category => category.active).map(category => <option key={category.id} value={category.id}>{localizedValue(category.name, locale)}</option>)}</select></label></div><LocalizedFields label={copy.title} value={title} onChange={updateField(setTitle)} /><LocalizedFields label={copy.body} value={body} onChange={updateField(setBody)} multiline /><label htmlFor="admin-article-reason">{copy.reason}<textarea id="admin-article-reason" value={reason} onChange={event => setReason(event.target.value)} minLength={5} maxLength={1000} required placeholder={copy.reasonPlaceholder} /></label><Button type="submit" loading={state === 'saving'} disabled={state === 'saving'}>{state === 'saving' ? copy.saving : copy.save}</Button>{feedback !== undefined ? <p className="admin-content__feedback" data-tone="error" role="alert">{feedback}</p> : null}</form></section>;
}

function TransitionPanel({ article, locale, onCancel, onSubmit }: { readonly article: Article; readonly locale: SupportedLocale; readonly onCancel: () => void; readonly onSubmit: (input: ArticleTransitionRequest) => Promise<void> }) {
  const copy = getAdminContentCopy(locale);
  const actions = article.availableActions.filter(action => action !== 'update' && actionToStatus[action] !== undefined);
  const [action, setAction] = useState<ArticleAvailableAction>(actions[0] ?? 'submit');
  const [reason, setReason] = useState('');
  const [error, setError] = useState(false);
  return <section className="admin-content__action-panel"><h2>{copy.action[action]}: {localizedValue(article.title, locale)}</h2><form onSubmit={event => { event.preventDefault(); if (reason.trim().length < 5) { setError(true); return; } const status = actionToStatus[action]; if (status === undefined) return; void onSubmit(articleTransitionRequestSchema.parse({ status, version: article.version, reason: reason.trim() })); }}><label htmlFor="admin-article-action">{copy.actions}<select id="admin-article-action" value={action} onChange={event => setAction(event.target.value as ArticleAvailableAction)}>{actions.map(option => <option key={option} value={option}>{copy.action[option]}</option>)}</select></label><label htmlFor="admin-article-action-reason">{copy.reason}<textarea id="admin-article-action-reason" value={reason} onChange={event => setReason(event.target.value)} minLength={5} required placeholder={copy.reasonPlaceholder} /></label><div className="admin-content__inline-actions"><Button type="submit">{copy.save}</Button><Button type="button" variant="secondary" onClick={onCancel}>{copy.cancel}</Button></div>{error ? <p className="admin-content__feedback" data-tone="error" role="alert">{copy.reasonRequired}</p> : null}</form></section>;
}

function ArticleTable({ articles, categories, locale, onEdit, onTransition }: { readonly articles: readonly Article[]; readonly categories: readonly ArticleCategory[]; readonly locale: SupportedLocale; readonly onEdit: (article: Article) => void; readonly onTransition: (article: Article, action: ArticleAvailableAction) => void }) {
  const copy = getAdminContentCopy(locale);
  return <div className="admin-content__table-wrap"><table className="admin-content__table"><thead><tr><th>{copy.title}</th><th>{copy.category}</th><th>{copy.statusLabel}</th><th>{copy.version}</th><th>{copy.updated}</th><th>{copy.actions}</th></tr></thead><tbody>{articles.map(article => <tr key={article.id} data-testid={`admin-article-${article.id}`}><td><strong>{localizedValue(article.title, locale)}</strong><small>{article.slug}</small></td><td>{localizedValue(categories.find(category => category.id === article.categoryId)?.name, locale) || '—'}</td><td><StatusBadge status={article.status} locale={locale} /></td><td>{article.version}</td><td>{dateLabel(article.updatedAt, locale)}</td><td><div className="admin-content__row-actions">{article.availableActions.includes('update') ? <Button size="sm" variant="secondary" onClick={() => onEdit(article)}>{copy.edit}</Button> : null}{article.availableActions.filter(action => action !== 'update').map(action => <Button key={action} size="sm" variant="secondary" onClick={() => onTransition(article, action)}>{copy.action[action]}</Button>)}{article.availableActions.length === 0 ? <span>{copy.noActions}</span> : null}</div></td></tr>)}</tbody></table></div>;
}

function CategoryEditor({ category, locale, onCancel, onSave }: { readonly category?: ArticleCategory; readonly locale: SupportedLocale; readonly onCancel: () => void; readonly onSave: (input: ArticleCategoryCreate | ArticleCategoryPatch, categoryId?: string) => Promise<void> }) {
  const copy = getAdminContentCopy(locale);
  const [slug, setSlug] = useState(category?.slug ?? '');
  const [name, setName] = useState<LocalizedDraft>(() => localizedDraft(category?.name));
  const [description, setDescription] = useState<LocalizedDraft>(() => localizedDraft(category?.description));
  const [displayOrder, setDisplayOrder] = useState(String(category?.displayOrder ?? 0));
  const [active, setActive] = useState(category?.active ?? true);
  const [reason, setReason] = useState('');
  const [feedback, setFeedback] = useState<string | undefined>();
  const updateField = (setter: LocalizedStateSetter) => (localeKey: SupportedLocale, value: string) => setter(current => ({ ...current, [localeKey]: value }));
  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (reason.trim().length < 5) { setFeedback(copy.reasonRequired); return; }
    try {
      const nameValue = parseLocalized(name);
      const descriptionValue = Object.values(description).some(value => value.trim() !== '') ? parseLocalized(description) : undefined;
      if (category === undefined) await onSave(articleCategoryCreateSchema.parse({ slug: slug.trim(), name: nameValue, ...(descriptionValue === undefined ? {} : { description: descriptionValue }), displayOrder: Number(displayOrder), active, reason: reason.trim() }));
      else await onSave(articleCategoryPatchSchema.parse({ version: category.version, slug: slug.trim(), name: nameValue, description: descriptionValue ?? null, displayOrder: Number(displayOrder), active, reason: reason.trim() }), category.id);
    } catch { setFeedback(copy.titleRequired); }
  }
  return <section className="admin-content__editor" data-testid="admin-category-editor"><div className="admin-content__editor-heading"><h2>{category === undefined ? copy.createCategory : `${copy.edit}: ${localizedValue(category.name, locale)}`}</h2><Button type="button" variant="secondary" onClick={onCancel}>{copy.cancel}</Button></div><form onSubmit={event => { void submit(event); }}><div className="admin-content__form-grid"><label htmlFor="admin-category-slug">{copy.slug}<input id="admin-category-slug" value={slug} onChange={event => setSlug(event.target.value)} required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" /></label><label htmlFor="admin-category-order">{copy.order}<input id="admin-category-order" type="number" min="0" value={displayOrder} onChange={event => setDisplayOrder(event.target.value)} /></label></div><LocalizedFields label={copy.name} value={name} onChange={updateField(setName)} /><LocalizedFields label={copy.description} value={description} onChange={updateField(setDescription)} multiline /><label className="admin-content__checkbox" htmlFor="admin-category-active"><input id="admin-category-active" type="checkbox" checked={active} onChange={event => setActive(event.target.checked)} />{copy.active}</label><label htmlFor="admin-category-reason">{copy.reason}<textarea id="admin-category-reason" value={reason} onChange={event => setReason(event.target.value)} minLength={5} required placeholder={copy.reasonPlaceholder} /></label><Button type="submit">{copy.save}</Button>{feedback !== undefined ? <p className="admin-content__feedback" data-tone="error" role="alert">{feedback}</p> : null}</form></section>;
}

function CategoryTable({ categories, locale, onEdit, onDelete }: { readonly categories: readonly ArticleCategory[]; readonly locale: SupportedLocale; readonly onEdit: (category: ArticleCategory) => void; readonly onDelete: (category: ArticleCategory) => void }) {
  const copy = getAdminContentCopy(locale);
  return <div className="admin-content__table-wrap"><table className="admin-content__table"><thead><tr><th>{copy.order}</th><th>{copy.name}</th><th>{copy.slug}</th><th>{copy.description}</th><th>{copy.active}</th><th>{copy.actions}</th></tr></thead><tbody>{categories.map(category => <tr key={category.id} data-testid={`admin-category-${category.id}`}><td>{category.displayOrder}</td><td><strong>{localizedValue(category.name, locale)}</strong></td><td>{category.slug}</td><td>{localizedValue(category.description, locale) || '—'}</td><td><StatusBadge status={category.active ? 'published' : 'archived'} locale={locale} /></td><td><div className="admin-content__row-actions">{category.availableActions.includes('update') ? <Button size="sm" variant="secondary" onClick={() => onEdit(category)}>{copy.edit}</Button> : null}{category.availableActions.includes('delete') ? <Button size="sm" variant="secondary" onClick={() => onDelete(category)}>{copy.action.archive}</Button> : null}</div></td></tr>)}</tbody></table></div>;
}

function DeleteCategoryPanel({ category, locale, onCancel, onDelete }: { readonly category: ArticleCategory; readonly locale: SupportedLocale; readonly onCancel: () => void; readonly onDelete: (input: ArticleCategoryDelete) => Promise<void> }) {
  const copy = getAdminContentCopy(locale);
  const [reason, setReason] = useState('');
  const [error, setError] = useState(false);
  return <section className="admin-content__action-panel"><h2>{copy.action.archive}: {localizedValue(category.name, locale)}</h2><form onSubmit={event => { event.preventDefault(); if (reason.trim().length < 5) { setError(true); return; } void onDelete({ version: category.version, reason: reason.trim() }); }}><label htmlFor="admin-category-delete-reason">{copy.reason}<textarea id="admin-category-delete-reason" value={reason} onChange={event => setReason(event.target.value)} minLength={5} required placeholder={copy.reasonPlaceholder} /></label><div className="admin-content__inline-actions"><Button type="submit">{copy.save}</Button><Button type="button" variant="secondary" onClick={onCancel}>{copy.cancel}</Button></div>{error ? <p className="admin-content__feedback" data-tone="error" role="alert">{copy.reasonRequired}</p> : null}</form></section>;
}

export function AdminContent({ locale, session, authClient, apiOrigin, initialArticles, initialCategories, loadArticles, loadCategories, createArticle, updateArticle, transitionArticle, createCategory, updateCategory, deleteCategory }: AdminContentProps) {
  const copy = getAdminContentCopy(locale);
  const pathname = typeof window === 'undefined' ? ADMIN_ARTICLES_ROUTE : new URL(window.location.href).pathname.replace(/\/+$/u, '') || '/';
  const isCategories = pathname === ADMIN_ARTICLE_CATEGORIES_ROUTE;
  const sessionAllowed = session.status === 'authenticated' && session.role === 'admin';
  const [articleState, setArticleState] = useState<AdminContentState>(() => initialArticles === undefined ? 'loading' : initialArticles.items.length === 0 ? 'empty' : 'success');
  const [categoryState, setCategoryState] = useState<AdminContentState>(() => initialCategories === undefined ? 'loading' : initialCategories.items.length === 0 ? 'empty' : 'success');
  const [articles, setArticles] = useState<AdminArticleListData | undefined>(initialArticles);
  const [categories, setCategories] = useState<AdminCategoryListData | undefined>(initialCategories);
  const [attempt, setAttempt] = useState(0);
  const [articleQuery, setArticleQuery] = useState<ArticleAdminListQuery>({ page: 1, limit: 20, sort: 'updatedAt', direction: 'desc' });
  const [categoryQuery, setCategoryQuery] = useState<ArticleCategoryListQuery>({ page: 1, limit: 20, sort: 'displayOrder', direction: 'asc' });
  const [articleSearchInput, setArticleSearchInput] = useState('');
  const [articleStatusInput, setArticleStatusInput] = useState<ArticleStatus | ''>('');
  const [categorySearchInput, setCategorySearchInput] = useState('');
  const [articleEditor, setArticleEditor] = useState<Article | 'new' | undefined>();
  const [categoryEditor, setCategoryEditor] = useState<ArticleCategory | 'new' | undefined>();
  const [transitionTarget, setTransitionTarget] = useState<{ article: Article; action: ArticleAvailableAction } | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<ArticleCategory | undefined>();
  const source = useMemo(() => createAdminContentSource({ apiOrigin, authorization: authClient }), [apiOrigin, authClient]);
  const articleLoader = loadArticles ?? source.loadArticles;
  const categoryLoader = loadCategories ?? source.loadCategories;
  const articleCreate = createArticle ?? source.createArticle;
  const articleUpdate = updateArticle ?? source.updateArticle;
  const articleTransition = transitionArticle ?? source.transitionArticle;
  const categoryCreate = createCategory ?? source.createCategory;
  const categoryUpdate = updateCategory ?? source.updateCategory;
  const categoryDelete = deleteCategory ?? source.deleteCategory;

  useEffect(() => {
    if (!sessionAllowed) { setArticleState('permission'); setCategoryState('permission'); return undefined; }
    if (attempt === 0 && (isCategories ? initialCategories !== undefined : initialArticles !== undefined && initialCategories !== undefined)) return undefined;
    const controller = new AbortController();
    if (isCategories) {
      setCategoryState('loading');
      void categoryLoader(categoryQuery, controller.signal).then(data => { if (!controller.signal.aborted) { setCategories(data); setCategoryState(data.items.length === 0 ? 'empty' : 'success'); } }).catch(error => { if (!controller.signal.aborted) setCategoryState(stateForError(error)); });
    } else {
      setArticleState('loading'); setCategoryState('loading');
      void Promise.all([articleLoader(articleQuery, controller.signal), categoryLoader({ ...categoryQuery, limit: 100 }, controller.signal)]).then(([nextArticles, nextCategories]) => { if (!controller.signal.aborted) { setArticles(nextArticles); setCategories(nextCategories); setArticleState(nextArticles.items.length === 0 ? 'empty' : 'success'); setCategoryState('success'); } }).catch(error => { if (!controller.signal.aborted) { const nextState = stateForError(error); setArticleState(nextState); setCategoryState(nextState); } });
    }
    return () => controller.abort();
  }, [articleLoader, articleQuery, attempt, categoryLoader, categoryQuery, initialArticles, initialCategories, isCategories, sessionAllowed]);

  const refresh = () => setAttempt(value => value + 1);
  const applyArticleFilters = () => {
    const nextQuery = { ...articleQuery, page: 1 };
    if (articleSearchInput.trim() === '') delete nextQuery.search; else nextQuery.search = articleSearchInput.trim();
    if (articleStatusInput === '') delete nextQuery.status; else nextQuery.status = articleStatusInput;
    setArticleQuery(nextQuery); refresh();
  };
  const clearArticleFilters = () => { setArticleSearchInput(''); setArticleStatusInput(''); setArticleQuery({ page: 1, limit: 20, sort: 'updatedAt', direction: 'desc' }); refresh(); };
  const applyCategoryFilters = () => {
    const nextQuery = { ...categoryQuery, page: 1 };
    if (categorySearchInput.trim() === '') delete nextQuery.search; else nextQuery.search = categorySearchInput.trim();
    setCategoryQuery(nextQuery); refresh();
  };
  const clearCategoryFilters = () => { setCategorySearchInput(''); setCategoryQuery({ page: 1, limit: 20, sort: 'displayOrder', direction: 'asc' }); refresh(); };
  const handleArticleSave = async (input: ArticleCreate | ArticlePatch, articleId?: string): Promise<void> => { if (articleId === undefined) await articleCreate(input as ArticleCreate); else await articleUpdate(articleId, input as ArticlePatch); setArticleEditor(undefined); refresh(); };
  const handleTransition = async (input: ArticleTransitionRequest): Promise<void> => { if (transitionTarget === undefined) return; await articleTransition(transitionTarget.article.id, input); setTransitionTarget(undefined); refresh(); };
  const handleCategorySave = async (input: ArticleCategoryCreate | ArticleCategoryPatch, categoryId?: string): Promise<void> => { if (categoryId === undefined) await categoryCreate(input as ArticleCategoryCreate); else await categoryUpdate(categoryId, input as ArticleCategoryPatch); setCategoryEditor(undefined); refresh(); };
  const handleCategoryDelete = async (input: ArticleCategoryDelete): Promise<void> => { if (deleteTarget === undefined) return; await categoryDelete(deleteTarget.id, input); setDeleteTarget(undefined); refresh(); };
  const pageCount = (data: { readonly total: number; readonly limit: number } | undefined) => Math.max(1, Math.ceil((data?.total ?? 0) / (data?.limit ?? 20)));

  return <section className="admin-content" data-screen-id={isCategories ? 'ADM-26' : 'ADM-25'} data-route={isCategories ? ADMIN_ARTICLE_CATEGORIES_ROUTE : ADMIN_ARTICLES_ROUTE} data-device-scope="desktop" data-admin-content-state={isCategories ? categoryState : articleState}><AdminNavigation locale={locale} activePath={pathname} /><div className="admin-content__content"><div className="admin-content__heading"><div><p className="admin-content__eyebrow">{copy.eyebrow}</p><h1>{isCategories ? copy.categoriesTitle : copy.articlesTitle}</h1><p>{isCategories ? copy.categoriesDescription : copy.articlesDescription}</p></div><div className="admin-content__heading-actions"><a href={localePath(locale, isCategories ? ADMIN_ARTICLES_ROUTE : ADMIN_ARTICLE_CATEGORIES_ROUTE)}>{isCategories ? copy.articles : copy.categories}</a><Button onClick={() => isCategories ? setCategoryEditor('new') : setArticleEditor('new')}>{isCategories ? copy.createCategory : copy.createArticle}</Button></div></div>{isCategories ? <><form className="admin-content__filters" role="search" aria-label={copy.searchLabel} onSubmit={event => { event.preventDefault(); applyCategoryFilters(); }}><label htmlFor="admin-category-search">{copy.searchLabel}<input id="admin-category-search" type="search" value={categorySearchInput} onChange={event => setCategorySearchInput(event.target.value)} placeholder={copy.searchPlaceholder} /></label><Button type="submit">{copy.apply}</Button><Button type="button" variant="secondary" onClick={clearCategoryFilters}>{copy.clear}</Button></form>{categoryState === 'loading' || categoryState === 'retry' || categoryState === 'error' || categoryState === 'permission' ? <StatePanel state={categoryState} locale={locale} onRetry={refresh} /> : null}{categoryState === 'empty' ? <EmptyPanel locale={locale} /> : null}{categoryState === 'success' && categories !== undefined ? <><div className="admin-content__panel"><div className="admin-content__panel-heading"><h2>{copy.categoriesTitle}</h2><span>{copy.page(categories.page, pageCount(categories))}</span></div><CategoryTable categories={categories.items} locale={locale} onEdit={category => setCategoryEditor(category)} onDelete={category => setDeleteTarget(category)} /></div>{categoryEditor !== undefined ? <CategoryEditor {...(categoryEditor === 'new' ? {} : { category: categoryEditor })} locale={locale} onCancel={() => setCategoryEditor(undefined)} onSave={handleCategorySave} /> : null}{deleteTarget !== undefined ? <DeleteCategoryPanel category={deleteTarget} locale={locale} onCancel={() => setDeleteTarget(undefined)} onDelete={handleCategoryDelete} /> : null}</> : null}</> : <><form className="admin-content__filters" role="search" aria-label={copy.searchLabel} onSubmit={event => { event.preventDefault(); applyArticleFilters(); }}><label htmlFor="admin-article-search">{copy.searchLabel}<input id="admin-article-search" type="search" value={articleSearchInput} onChange={event => setArticleSearchInput(event.target.value)} placeholder={copy.searchPlaceholder} /></label><label htmlFor="admin-article-status">{copy.statusLabel}<select id="admin-article-status" value={articleStatusInput} onChange={event => setArticleStatusInput(event.target.value as ArticleStatus | '')}><option value="">{copy.allStatuses}</option>{statuses.map(status => <option key={status} value={status}>{copy.status[status]}</option>)}</select></label><Button type="submit">{copy.apply}</Button><Button type="button" variant="secondary" onClick={clearArticleFilters}>{copy.clear}</Button></form>{articleState === 'loading' || articleState === 'retry' || articleState === 'error' || articleState === 'permission' ? <StatePanel state={articleState} locale={locale} onRetry={refresh} /> : null}{articleState === 'empty' ? <EmptyPanel locale={locale} /> : null}{articleState === 'success' && articles !== undefined ? <><div className="admin-content__panel"><div className="admin-content__panel-heading"><h2>{copy.articlesTitle}</h2><span>{copy.page(articles.page, pageCount(articles))}</span></div><ArticleTable articles={articles.items} categories={categories?.items ?? []} locale={locale} onEdit={article => setArticleEditor(article)} onTransition={(article, action) => setTransitionTarget({ article, action })} /></div>{articleEditor !== undefined ? <ArticleEditor {...(articleEditor === 'new' ? {} : { article: articleEditor })} categories={categories?.items ?? []} locale={locale} onCancel={() => setArticleEditor(undefined)} onSave={handleArticleSave} /> : null}{transitionTarget !== undefined ? <TransitionPanel article={transitionTarget.article} locale={locale} onCancel={() => setTransitionTarget(undefined)} onSubmit={handleTransition} /> : null}</> : null}</>}</div></section>;
}

const cmsAboutStatuses = ['draft', 'published', 'inactive'] as const;
const cmsPopulationStatuses = ['available', 'unavailable', 'draft'] as const;
type CmsAboutStatus = (typeof cmsAboutStatuses)[number];
type CmsPopulationStatus = (typeof cmsPopulationStatuses)[number];

function cmsNamespaceForPath(path: string): CmsAdminContentNamespace | undefined {
  if (path === ADMIN_CMS_ABOUT_ROUTE) return 'about';
  if (path === ADMIN_CMS_TEAM_ROUTE) return 'team';
  if (path === ADMIN_CMS_POPULATION_ROUTE) return 'population';
  return undefined;
}

function cmsStatusLabel(status: string, locale: SupportedLocale): string {
  const labels = getAdminCmsCopy(locale).statusLabels;
  return status in labels ? labels[status as keyof typeof labels] : status;
}

function CmsStatusBadge({ status, locale }: { readonly status: string; readonly locale: SupportedLocale }) {
  const tone = status === 'published' || status === 'available' ? 'success' : status === 'draft' ? 'info' : 'neutral';
  return <span className="admin-content__badge" data-tone={tone}>{cmsStatusLabel(status, locale)}</span>;
}

function CmsLocalizedFields({ prefix, label, value, onChange, locale: copyLocale, multiline = false }: { readonly prefix: string; readonly label: string; readonly value: LocalizedDraft; readonly onChange: (locale: SupportedLocale, value: string) => void; readonly locale: SupportedLocale; readonly multiline?: boolean }) {
  const copy = getAdminCmsCopy(copyLocale);
  return <div className="admin-content__localized-fields"><span className="admin-content__field-label">{label}</span><div className="admin-content__localized-grid">{locales.map(locale => { const id = `admin-cms-${prefix}-${locale}`; return <label key={locale} htmlFor={id}>{locale.toUpperCase()} {label}{multiline ? <textarea id={id} value={value[locale]} onChange={event => onChange(locale, event.target.value)} rows={4} aria-describedby={`${id}-hint`} /> : <input id={id} value={value[locale]} onChange={event => onChange(locale, event.target.value)} aria-describedby={`${id}-hint`} />}</label>; })}</div><small id={`admin-cms-${prefix}-hint`} className="admin-content__field-hint">{copy.localizedHint}</small></div>;
}

function CmsStatePanel({ state, locale, onRetry }: { readonly state: AdminCmsState; readonly locale: SupportedLocale; readonly onRetry: () => void }) {
  const copy = getAdminCmsCopy(locale);
  const message = copy.states[state];
  if (state === 'not_found') return <section className="admin-content__state" data-state={state} aria-label={message.title}><h2>{message.title}</h2><p>{message.body}</p></section>;
  return <section className="admin-content__state" data-state={state} aria-label={message.title}><StateMessage state={state} title={message.title} message={message.body} onRetry={state === 'retry' ? onRetry : undefined} retryLabel={copy.retry} />{state === 'error' ? <Button type="button" variant="secondary" onClick={onRetry}>{copy.retry}</Button> : null}</section>;
}

function CmsPreview({ label, title, body, locale }: { readonly label: string; readonly title: string; readonly body: string | undefined; readonly locale: SupportedLocale }) {
  return <aside className="admin-cms__preview" lang={locale} data-testid="admin-cms-preview" aria-label={label}><h3>{label}</h3><strong>{title || '—'}</strong>{body ? <p>{body}</p> : null}</aside>;
}

function AboutBlockForm({ block, locale, onCancel, onSave }: { readonly block: CmsAdminAboutBlock | undefined; readonly locale: SupportedLocale; readonly onCancel: () => void; readonly onSave: (input: unknown) => Promise<void> }) {
  const copy = getAdminCmsCopy(locale);
  const [key, setKey] = useState(block?.key ?? '');
  const [title, setTitle] = useState<LocalizedDraft>(() => localizedDraft(block?.title));
  const [body, setBody] = useState<LocalizedDraft>(() => localizedDraft(block?.body));
  const [order, setOrder] = useState(String(block?.order ?? 0));
  const [active, setActive] = useState(block?.active ?? true);
  const [status, setStatus] = useState<CmsAboutStatus>(block?.status ?? 'draft');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | undefined>();
  const update = (setter: LocalizedStateSetter) => (localeKey: SupportedLocale, value: string) => setter(current => ({ ...current, [localeKey]: value }));
  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (reason.trim().length < 5) { setFeedback(copy.reasonRequired); return; }
    if (block === undefined && key.trim() === '') { setFeedback(`${copy.key} is required.`); return; }
    try {
      const common = { title: parseLocalized(title), body: parseLocalized(body), order: Number(order), active, status, reason: reason.trim() };
      setSaving(true); setFeedback(undefined);
      await onSave(block === undefined ? { key: key.trim(), ...common } : { id: block.id, version: block.version, ...common });
    } catch { setFeedback(copy.states.error.title); } finally { setSaving(false); }
  }
  const canUpdate = block === undefined || block.availableActions.includes('update');
  return <section className="admin-content__editor" data-testid="admin-cms-about-editor"><div className="admin-content__editor-heading"><div><p className="admin-content__eyebrow">{copy.eyebrow}</p><h2>{block === undefined ? `${copy.add}: ${copy.namespace.about}` : `${copy.namespace.about}: ${localizedValue(block.title, locale)}`}</h2></div><Button type="button" variant="secondary" onClick={onCancel}>{copy.cancel}</Button></div><form onSubmit={event => { void submit(event); }}><div className="admin-content__form-grid"><label htmlFor="admin-cms-about-key">{copy.key}<input id="admin-cms-about-key" value={key} onChange={event => setKey(event.target.value)} pattern="[a-z][a-z0-9_]{1,63}" disabled={block !== undefined} required /></label><label htmlFor="admin-cms-about-order">{copy.order}<input id="admin-cms-about-order" type="number" min="0" value={order} onChange={event => setOrder(event.target.value)} required /></label></div><CmsLocalizedFields locale={locale} prefix="about-title" label={copy.title} value={title} onChange={update(setTitle)} /><CmsLocalizedFields locale={locale} prefix="about-body" label={copy.body} value={body} onChange={update(setBody)} multiline /><div className="admin-content__form-grid"><label htmlFor="admin-cms-about-status">{copy.status}<select id="admin-cms-about-status" value={status} onChange={event => setStatus(event.target.value as CmsAboutStatus)}>{cmsAboutStatuses.map(option => <option key={option} value={option}>{cmsStatusLabel(option, locale)}</option>)}</select></label><label className="admin-content__checkbox" htmlFor="admin-cms-about-active"><input id="admin-cms-about-active" type="checkbox" checked={active} onChange={event => setActive(event.target.checked)} />{copy.active}</label></div><label htmlFor="admin-cms-about-reason">{copy.reason}<textarea id="admin-cms-about-reason" value={reason} onChange={event => setReason(event.target.value)} minLength={5} maxLength={500} required placeholder={copy.reasonPlaceholder} /></label><div className="admin-content__inline-actions">{canUpdate ? <Button type="submit" disabled={saving}>{saving ? copy.saving : copy.save}</Button> : <span className="admin-content__muted">{copy.states.permission.title}</span>}<Button type="button" variant="secondary" onClick={onCancel}>{copy.cancel}</Button></div>{feedback ? <p className="admin-content__feedback" role="alert">{feedback}</p> : null}</form></section>;
}

function TeamMemberForm({ member, locale, onCancel, onSave }: { readonly member: CmsAdminTeamMember | undefined; readonly locale: SupportedLocale; readonly onCancel: () => void; readonly onSave: (input: unknown) => Promise<void> }) {
  const copy = getAdminCmsCopy(locale);
  const [key, setKey] = useState(member?.key ?? '');
  const [name, setName] = useState<LocalizedDraft>(() => localizedDraft(member?.name));
  const [title, setTitle] = useState<LocalizedDraft>(() => localizedDraft(member?.title));
  const [bio, setBio] = useState<LocalizedDraft>(() => localizedDraft(member?.bio));
  const [photoAssetId, setPhotoAssetId] = useState(member?.photoAssetId ?? '');
  const [order, setOrder] = useState(String(member?.order ?? 0));
  const [active, setActive] = useState(member?.active ?? true);
  const [status, setStatus] = useState<CmsAboutStatus>(member?.status ?? 'draft');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | undefined>();
  const update = (setter: LocalizedStateSetter) => (localeKey: SupportedLocale, value: string) => setter(current => ({ ...current, [localeKey]: value }));
  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (reason.trim().length < 5) { setFeedback(copy.reasonRequired); return; }
    if (member === undefined && key.trim() === '') { setFeedback(`${copy.key} is required.`); return; }
    try {
      const common = { name: parseLocalized(name), title: parseLocalized(title), ...(Object.values(bio).some(value => value.trim() !== '') ? { bio: parseLocalized(bio) } : {}), ...(photoAssetId.trim() === '' ? {} : { photoAssetId: photoAssetId.trim() }), order: Number(order), active, status, reason: reason.trim() };
      setSaving(true); setFeedback(undefined);
      await onSave(member === undefined ? { key: key.trim(), ...common } : { id: member.id, version: member.version, ...common });
    } catch { setFeedback(copy.states.error.title); } finally { setSaving(false); }
  }
  const canUpdate = member === undefined || member.availableActions.includes('update');
  return <section className="admin-content__editor" data-testid="admin-cms-team-editor"><div className="admin-content__editor-heading"><div><p className="admin-content__eyebrow">{copy.eyebrow}</p><h2>{member === undefined ? `${copy.add}: ${copy.namespace.team}` : `${copy.namespace.team}: ${localizedValue(member.name, locale)}`}</h2></div><Button type="button" variant="secondary" onClick={onCancel}>{copy.cancel}</Button></div><form onSubmit={event => { void submit(event); }}><div className="admin-content__form-grid"><label htmlFor="admin-cms-team-key">{copy.key}<input id="admin-cms-team-key" value={key} onChange={event => setKey(event.target.value)} pattern="[a-z][a-z0-9_]{1,63}" disabled={member !== undefined} required /></label><label htmlFor="admin-cms-team-order">{copy.order}<input id="admin-cms-team-order" type="number" min="0" value={order} onChange={event => setOrder(event.target.value)} required /></label></div><CmsLocalizedFields locale={locale} prefix="team-name" label={copy.name} value={name} onChange={update(setName)} /><CmsLocalizedFields locale={locale} prefix="team-title" label={copy.title} value={title} onChange={update(setTitle)} /><CmsLocalizedFields locale={locale} prefix="team-bio" label={copy.body} value={bio} onChange={update(setBio)} multiline /><label htmlFor="admin-cms-team-photo">Photo asset ID<input id="admin-cms-team-photo" value={photoAssetId} onChange={event => setPhotoAssetId(event.target.value)} inputMode="text" /></label><div className="admin-content__form-grid"><label htmlFor="admin-cms-team-status">{copy.status}<select id="admin-cms-team-status" value={status} onChange={event => setStatus(event.target.value as CmsAboutStatus)}>{cmsAboutStatuses.map(option => <option key={option} value={option}>{cmsStatusLabel(option, locale)}</option>)}</select></label><label className="admin-content__checkbox" htmlFor="admin-cms-team-active"><input id="admin-cms-team-active" type="checkbox" checked={active} onChange={event => setActive(event.target.checked)} />{copy.active}</label></div><label htmlFor="admin-cms-team-reason">{copy.reason}<textarea id="admin-cms-team-reason" value={reason} onChange={event => setReason(event.target.value)} minLength={5} maxLength={500} required placeholder={copy.reasonPlaceholder} /></label><div className="admin-content__inline-actions">{canUpdate ? <Button type="submit" disabled={saving}>{saving ? copy.saving : copy.save}</Button> : <span className="admin-content__muted">{copy.states.permission.title}</span>}<Button type="button" variant="secondary" onClick={onCancel}>{copy.cancel}</Button></div>{feedback ? <p className="admin-content__feedback" role="alert">{feedback}</p> : null}</form></section>;
}

function PopulationValueForm({ population, locale, onSave }: { readonly population: CmsAdminPopulationValue | undefined; readonly locale: SupportedLocale; readonly onSave: (input: unknown) => Promise<void> }) {
  const copy = getAdminCmsCopy(locale);
  const [status, setStatus] = useState<CmsPopulationStatus>(population?.status ?? 'unavailable');
  const [value, setValue] = useState(population?.value === undefined ? '' : String(population.value));
  const [sourceLabel, setSourceLabel] = useState<LocalizedDraft>(() => localizedDraft(population?.sourceLabel));
  const [sourceUrl, setSourceUrl] = useState(population?.sourceUrl ?? '');
  const [asOf, setAsOf] = useState(population?.asOf?.slice(0, 16) ?? '');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | undefined>();
  const update = (localeKey: SupportedLocale, next: string) => setSourceLabel(current => ({ ...current, [localeKey]: next }));
  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (reason.trim().length < 5) { setFeedback(copy.reasonRequired); return; }
    try {
      const hasSourceLabel = Object.values(sourceLabel).some(text => text.trim() !== '');
      const common = { status, ...(value.trim() === '' ? {} : { value: Number(value) }), ...(hasSourceLabel ? { sourceLabel: parseLocalized(sourceLabel) } : {}), ...(sourceUrl.trim() === '' ? {} : { sourceUrl: sourceUrl.trim() }), ...(asOf.trim() === '' ? {} : { asOf: new Date(asOf).toISOString() }), reason: reason.trim() };
      setSaving(true); setFeedback(undefined);
      await onSave(population === undefined ? common : { version: population.version, ...common });
    } catch { setFeedback(copy.states.error.title); } finally { setSaving(false); }
  }
  const canUpdate = population === undefined || population.availableActions.includes('update');
  return <section className="admin-content__editor" data-testid="admin-cms-population-editor"><div className="admin-content__editor-heading"><div><p className="admin-content__eyebrow">{copy.eyebrow}</p><h2>{copy.namespace.population}</h2></div></div><form onSubmit={event => { void submit(event); }}><label htmlFor="admin-cms-population-status">{copy.status}<select id="admin-cms-population-status" value={status} onChange={event => setStatus(event.target.value as CmsPopulationStatus)}>{cmsPopulationStatuses.map(option => <option key={option} value={option}>{cmsStatusLabel(option, locale)}</option>)}</select></label><label htmlFor="admin-cms-population-value">{copy.value}<input id="admin-cms-population-value" type="number" min="0" step="1" value={value} onChange={event => setValue(event.target.value)} disabled={status !== 'available'} /></label><CmsLocalizedFields locale={locale} prefix="population-source" label={copy.sourceLabel} value={sourceLabel} onChange={update} /><div className="admin-content__form-grid"><label htmlFor="admin-cms-population-url">{copy.sourceUrl}<input id="admin-cms-population-url" type="url" value={sourceUrl} onChange={event => setSourceUrl(event.target.value)} /></label><label htmlFor="admin-cms-population-as-of">{copy.asOf}<input id="admin-cms-population-as-of" type="datetime-local" value={asOf} onChange={event => setAsOf(event.target.value)} /></label></div><label htmlFor="admin-cms-population-reason">{copy.reason}<textarea id="admin-cms-population-reason" value={reason} onChange={event => setReason(event.target.value)} minLength={5} maxLength={500} required placeholder={copy.reasonPlaceholder} /></label><div className="admin-content__inline-actions">{canUpdate ? <Button type="submit" disabled={saving}>{saving ? copy.saving : copy.save}</Button> : <span className="admin-content__muted">{copy.states.permission.title}</span>}</div>{feedback ? <p className="admin-content__feedback" role="alert">{feedback}</p> : null}</form></section>;
}

function AboutBlockList({ items, locale, onEdit, onPreview }: { readonly items: readonly CmsAdminAboutBlock[]; readonly locale: SupportedLocale; readonly onEdit: (item: CmsAdminAboutBlock) => void; readonly onPreview: (item: CmsAdminAboutBlock) => void }) {
  const copy = getAdminCmsCopy(locale);
  return <div className="admin-cms__record-grid">{items.map(item => <article className="admin-cms__record-card" key={item.id} data-testid={`admin-cms-about-${item.id}`}><div><strong>{localizedValue(item.title, locale)}</strong><small>{item.key} · {copy.order}: {item.order}</small></div><CmsStatusBadge status={item.status} locale={locale} /><div className="admin-content__row-actions"><Button type="button" size="sm" variant="secondary" onClick={() => onPreview(item)}>{copy.preview}</Button>{item.availableActions.includes('update') ? <Button type="button" size="sm" onClick={() => onEdit(item)}>{copy.save}</Button> : null}</div></article>)}</div>;
}

function TeamMemberList({ items, locale, onEdit, onPreview }: { readonly items: readonly CmsAdminTeamMember[]; readonly locale: SupportedLocale; readonly onEdit: (item: CmsAdminTeamMember) => void; readonly onPreview: (item: CmsAdminTeamMember) => void }) {
  const copy = getAdminCmsCopy(locale);
  return <div className="admin-cms__record-grid">{items.map(item => <article className="admin-cms__record-card" key={item.id} data-testid={`admin-cms-team-${item.id}`}><div><strong>{localizedValue(item.name, locale)}</strong><small>{localizedValue(item.title, locale)} · {copy.order}: {item.order}</small></div><CmsStatusBadge status={item.status} locale={locale} /><div className="admin-content__row-actions"><Button type="button" size="sm" variant="secondary" onClick={() => onPreview(item)}>{copy.preview}</Button>{item.availableActions.includes('update') ? <Button type="button" size="sm" onClick={() => onEdit(item)}>{copy.save}</Button> : null}</div></article>)}</div>;
}

export interface AdminCmsContentProps {
  readonly path?: string | undefined;
  readonly locale: SupportedLocale;
  readonly session: RouteSession;
  readonly authClient?: AdminContentAuthorizationSource | undefined;
  readonly apiOrigin?: string | undefined;
  readonly initialData?: CmsAdminContentData | undefined;
  readonly load?: AdminCmsContentLoader | undefined;
  readonly update?: AdminCmsContentMutation | undefined;
}

export function AdminCmsContent({ path = ADMIN_CMS_ABOUT_ROUTE, locale, session, authClient, apiOrigin, initialData, load, update }: AdminCmsContentProps) {
  const copy = getAdminCmsCopy(locale);
  const namespace = cmsNamespaceForPath(path);
  const sessionAllowed = session.status === 'authenticated' && session.role === 'admin';
  const initialMatches = namespace !== undefined && initialData?.namespace === namespace;
  const [state, setState] = useState<AdminCmsState>(() => namespace === undefined ? 'not_found' : !initialMatches ? 'loading' : initialData.items.length === 0 ? 'empty' : 'success');
  const [data, setData] = useState<CmsAdminContentData | undefined>(initialMatches ? initialData : undefined);
  const [attempt, setAttempt] = useState(0);
  const [editing, setEditing] = useState<string | 'new' | undefined>();
  const [preview, setPreview] = useState<{ title: string; body?: string } | undefined>();
  const source = useMemo(() => createAdminCmsContentSource({ apiOrigin, authorization: authClient }), [apiOrigin, authClient]);
  const loadContent = load ?? source.load;
  const updateContent = update ?? source.update;

  useEffect(() => {
    if (!sessionAllowed) { setState('permission'); return undefined; }
    if (namespace === undefined) { setState('not_found'); return undefined; }
    if (attempt === 0 && initialMatches) return undefined;
    const controller = new AbortController();
    setState('loading');
    void loadContent(namespace, controller.signal).then(next => { if (!controller.signal.aborted) { setData(next); setState(next.items.length === 0 ? 'empty' : 'success'); } }).catch(error => { if (!controller.signal.aborted) setState(stateForError(error)); });
    return () => controller.abort();
  }, [attempt, initialMatches, loadContent, namespace, sessionAllowed]);

  const refresh = () => setAttempt(value => value + 1);
  const save = async (input: unknown): Promise<void> => {
    if (namespace === undefined) return;
    const next = await updateContent(namespace, input);
    setData(next); setEditing(undefined); setPreview(undefined); setState(next.items.length === 0 ? 'empty' : 'success');
  };
  const aboutItems = data?.namespace === 'about' ? data.items : [];
  const teamItems = data?.namespace === 'team' ? data.items : [];
  const population = data?.namespace === 'population' ? data.items[0] : undefined;
  const empty = state === 'empty';
  const showEditor = editing !== undefined && namespace !== undefined;
  const title = namespace === undefined ? copy.eyebrow : copy.namespace[namespace];
  const description = namespace === undefined ? copy.states.not_found.body : copy.description[namespace];

  return <section className="admin-content admin-cms-content" data-screen-id={namespace === 'about' ? 'ADM-30' : namespace === 'team' ? 'ADM-31' : 'ADM-32'} data-route={path} data-device-scope="desktop" data-admin-cms-state={state}><AdminNavigation locale={locale} activePath={path} /><div className="admin-content__content"><div className="admin-content__heading"><div><p className="admin-content__eyebrow">{copy.eyebrow}</p><h1>{title}</h1><p>{description}</p></div><div className="admin-content__heading-actions">{namespace !== undefined ? <Button type="button" onClick={() => setEditing('new')}>{copy.add}</Button> : null}</div></div>{namespace !== undefined ? <nav className="admin-cms__tabs" aria-label={copy.eyebrow}><a href={localePath(locale, ADMIN_CMS_ABOUT_ROUTE)} data-active={namespace === 'about' || undefined}>{copy.namespace.about}</a><a href={localePath(locale, ADMIN_CMS_TEAM_ROUTE)} data-active={namespace === 'team' || undefined}>{copy.namespace.team}</a><a href={localePath(locale, ADMIN_CMS_POPULATION_ROUTE)} data-active={namespace === 'population' || undefined}>{copy.namespace.population}</a></nav> : null}{state === 'loading' || state === 'error' || state === 'retry' || state === 'permission' || state === 'not_found' ? <CmsStatePanel state={state} locale={locale} onRetry={refresh} /> : null}{empty ? <section className="admin-content__state" data-state="empty" aria-label={copy.states.empty.title}><h2>{copy.states.empty.title}</h2><p>{copy.states.empty.body}</p><Button type="button" onClick={() => setEditing('new')}>{copy.add}</Button></section> : null}{state === 'success' && namespace === 'about' ? <section className="admin-content__panel admin-cms__panel" aria-labelledby="admin-cms-about-list-title"><div className="admin-content__panel-heading"><h2 id="admin-cms-about-list-title">{copy.namespace.about}</h2><span>{aboutItems.length}</span></div><AboutBlockList items={aboutItems} locale={locale} onEdit={item => setEditing(item.id)} onPreview={item => setPreview({ title: localizedValue(item.title, locale), body: localizedValue(item.body, locale) })} /></section> : null}{state === 'success' && namespace === 'team' ? <section className="admin-content__panel admin-cms__panel" aria-labelledby="admin-cms-team-list-title"><div className="admin-content__panel-heading"><h2 id="admin-cms-team-list-title">{copy.namespace.team}</h2><span>{teamItems.length}</span></div><TeamMemberList items={teamItems} locale={locale} onEdit={item => setEditing(item.id)} onPreview={item => setPreview({ title: localizedValue(item.name, locale), body: localizedValue(item.bio, locale) })} /></section> : null}{(state === 'success' || empty) && namespace === 'population' ? <PopulationValueForm population={population} locale={locale} onSave={save} /> : null}{showEditor && namespace === 'about' ? <AboutBlockForm block={editing === 'new' ? undefined : aboutItems.find(item => item.id === editing)} locale={locale} onCancel={() => setEditing(undefined)} onSave={save} /> : null}{showEditor && namespace === 'team' ? <TeamMemberForm member={editing === 'new' ? undefined : teamItems.find(item => item.id === editing)} locale={locale} onCancel={() => setEditing(undefined)} onSave={save} /> : null}{preview ? <CmsPreview label={copy.preview} title={preview.title} body={preview.body} locale={locale} /> : null}</div></section>;
}
