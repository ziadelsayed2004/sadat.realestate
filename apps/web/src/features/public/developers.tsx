import { useContext, useEffect, useState, type FormEvent } from 'react';
import type {
  PublicOrganizationCard,
  PublicOrganizationDirectoryQuery,
  PublicOrganizationListData,
  SupportedLocale
} from '@sadat-real-estate/contracts';
import { publicOrganizationDirectoryQuerySchema } from '@sadat-real-estate/contracts';
import { ApiClientError } from '../contracts/index.ts';
import { Pagination } from '../design_system/index.ts';
import { UxStateView, type UxState } from '../ux_states/index.ts';
import { getPublicHomepageCopy } from './copy.ts';
import { PublicAuthRoleContext, PublicMediaImage, PublicSiteFooter, PublicSiteHeader } from './components.tsx';
import {
  PUBLIC_DEVELOPERS_PATH,
  defaultPublicDeveloperDirectoryLoader,
  defaultPublicDeveloperDirectoryQuery,
  parsePublicDeveloperDirectoryQuery,
  publicDeveloperDirectoryUrl,
  type PublicDeveloperDirectoryLoader
} from './developers-data.ts';
import { getPublicDevelopersCopy, type PublicDevelopersCopy } from './developers-copy.ts';
import { localizedText } from './model.ts';
import './developers.css';

export type PublicDevelopersViewState = Extract<UxState, 'loading' | 'empty' | 'error' | 'retry' | 'success' | 'permission'>;

export interface PublicDevelopersProps {
  readonly url?: string;
  readonly locale: SupportedLocale;
  readonly initialData?: PublicOrganizationListData | undefined;
  readonly initialQuery?: PublicOrganizationDirectoryQuery | undefined;
  readonly initialState?: 'loading' | 'retry' | undefined;
  readonly load?: PublicDeveloperDirectoryLoader | undefined;
}

function errorState(error: unknown): PublicDevelopersViewState {
  if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) return 'permission';
  if (error instanceof ApiClientError && error.code === 'NETWORK_ERROR') return 'retry';
  return 'error';
}

function isDirectoryEmpty(data: PublicOrganizationListData): boolean {
  return data.total === 0 || data.items.length === 0;
}

function stateCopy(state: Exclude<PublicDevelopersViewState, 'success'>, copy: PublicDevelopersCopy): { readonly title: string; readonly body: string } {
  switch (state) {
    case 'loading': return { title: copy.loadingTitle, body: copy.loadingBody };
    case 'empty': return { title: copy.emptyTitle, body: copy.emptyBody };
    case 'error': return { title: copy.errorTitle, body: copy.errorBody };
    case 'retry': return { title: copy.retryTitle, body: copy.retryBody };
    case 'permission': return { title: copy.permissionTitle, body: copy.permissionBody };
  }
}

function syncBrowserUrl(query: PublicOrganizationDirectoryQuery, locale: SupportedLocale): void {
  if (typeof window === 'undefined') return;
  const next = new URL(publicDeveloperDirectoryUrl(query), window.location.origin);
  next.searchParams.set('lang', locale);
  window.history.replaceState(window.history.state, '', next.pathname + next.search);
}

function StateNotice({
  state,
  copy,
  onRetry
}: {
  readonly state: Exclude<PublicDevelopersViewState, 'success'>;
  readonly copy: PublicDevelopersCopy;
  readonly onRetry: () => void;
}) {
  const text = stateCopy(state, copy);
  return (
    <UxStateView className="public-developer-directory__state" state={state} title={text.title} message={text.body} retryLabel={copy.retryLabel} onRetry={onRetry}>
      {state === 'empty' || state === 'error' ? <button type="button" onClick={onRetry}>{copy.retryLabel}</button> : null}
      {state === 'permission' ? <a className="public-developer-directory__state-link" href="/">{copy.permissionLink}</a> : null}
    </UxStateView>
  );
}

function OrganizationCard({ organization, locale, copy }: { readonly organization: PublicOrganizationCard; readonly locale: SupportedLocale; readonly copy: PublicDevelopersCopy }) {
  const title = localizedText(organization.name, locale) ?? organization.slug;
  const description = localizedText(organization.description, locale);
  const locations = (organization.locations ?? []).flatMap((location, index) => {
    const label = localizedText(location, locale);
    return label === undefined ? [] : [{ key: `${organization.id}-location-${index}`, label }];
  });
  return (
    <article className="public-developer-directory__card" data-fit={organization.coverFit ?? 'contain'}>
      <div className="public-developer-directory__card-media">
        <PublicMediaImage src={organization.imageUrl ?? organization.logoUrl} alt={title} fallback={<div className="public-developer-directory__placeholder"><svg viewBox="0 0 64 64" aria-hidden="true"><path d="M10 56V20l22-12 22 12v36M24 56V40h16v16M22 24h4m12 0h4m-20 8h4m12 0h4" fill="none" stroke="currentColor" strokeWidth="3" /></svg><span>{title}</span></div>} />
        <span className="public-developer-directory__card-logo" aria-hidden="true">
          <PublicMediaImage src={organization.logoUrl} alt="" previewWidth={320} fallback={
            <PublicMediaImage className="public-developer-directory__card-avatar" src={organization.imageUrl} alt="" previewWidth={320} fallback={<img src="/assets/sadat-real-estate-logo.png" alt="" loading="lazy" decoding="async" />} />
          } />
        </span>
      </div>
      <div className="public-developer-directory__card-body">
        <h2><a href={`/developers/${encodeURIComponent(organization.slug)}?lang=${locale}`}>{title}</a></h2>
        {description === undefined ? null : <p className="public-developer-directory__card-description">{description}</p>}
        <div className="public-developer-directory__card-counts"><span>{organization.projectCount ? <a href={`/developers/${encodeURIComponent(organization.slug)}?lang=${locale}#developer-projects`}>{copy.projectCount(organization.projectCount)}</a> : copy.projectCount(0)}</span><span>{organization.propertyCount ? <a href={`/developers/${encodeURIComponent(organization.slug)}?lang=${locale}#developer-properties`}>{copy.propertyCount(organization.propertyCount)}</a> : copy.propertyCount(0)}</span></div>
        {locations.length > 0 ? <div className="public-developer-directory__card-locations" aria-label={copy.locationsLabel}>{locations.map(location => <span key={location.key}>{location.label}</span>)}</div> : null}
        <a className="public-developer-directory__card-link" href={`/developers/${encodeURIComponent(organization.slug)}?lang=${locale}`}><span>{copy.openProfile}</span><span aria-hidden="true">←</span></a>
      </div>
    </article>
  );
}

function DirectorySuccess({
  data,
  locale,
  copy,
  onPageChange
}: {
  readonly data: PublicOrganizationListData;
  readonly locale: SupportedLocale;
  readonly copy: PublicDevelopersCopy;
  readonly onPageChange: (page: number) => void;
}) {
  const pageCount = Math.ceil(data.total / data.limit);
  return (
    <section className="public-developer-directory__results" aria-labelledby="public-developer-directory-results-title">
      <div className="public-developer-directory__toolbar">
        <p id="public-developer-directory-results-title">{copy.resultCount(data.total)}</p>
      </div>
      <div className="public-developer-directory__grid">
        {data.items.map(organization => <OrganizationCard key={organization.id} organization={organization} locale={locale} copy={copy} />)}
      </div>
      {pageCount > 1 ? <Pagination page={data.page} pageCount={pageCount} onPageChange={onPageChange} previousLabel={copy.previousPage} nextLabel={copy.nextPage} ariaLabel={copy.paginationLabel} direction={locale === 'ar' ? 'rtl' : 'ltr'} /> : null}
    </section>
  );
}

function Footer({ locale, copy }: { readonly locale: SupportedLocale; readonly copy: PublicDevelopersCopy }) { return <PublicSiteFooter locale={locale} description={copy.footerDescription} />; }

export function PublicDevelopers({
  url,
  locale,
  initialData,
  initialQuery,
  initialState = 'loading',
  load = defaultPublicDeveloperDirectoryLoader
}: PublicDevelopersProps) {
  const copy = getPublicDevelopersCopy(locale);
  const sourceUrl = url ?? (typeof window === 'undefined' ? PUBLIC_DEVELOPERS_PATH : window.location.href);
  const [query, setQuery] = useState<PublicOrganizationDirectoryQuery>(() => initialQuery ?? parsePublicDeveloperDirectoryQuery(sourceUrl));
  const initialView: PublicDevelopersViewState = initialData === undefined ? initialState : isDirectoryEmpty(initialData) ? 'empty' : 'success';
  const [data, setData] = useState<PublicOrganizationListData | undefined>(initialData);
  const [view, setView] = useState<PublicDevelopersViewState>(initialView);
  const [attempt, setAttempt] = useState(0);
  const [search, setSearch] = useState(query.search ?? '');

  useEffect(() => {
    if (initialData !== undefined && attempt === 0) return;
    const controller = new AbortController();
    setView('loading');
    void load(query, controller.signal)
      .then(nextData => {
        if (controller.signal.aborted) return;
        setData(nextData);
        setView(isDirectoryEmpty(nextData) ? 'empty' : 'success');
      })
      .catch(error => {
        if (controller.signal.aborted || (error instanceof ApiClientError && error.code === 'ABORTED')) return;
        setView(errorState(error));
      });
    return () => controller.abort();
  }, [attempt, initialData, load, query]);

  const retry = () => setAttempt(value => value + 1);
  const changePage = (page: number) => {
    const nextQuery = { ...query, page };
    setQuery(nextQuery);
    syncBrowserUrl(nextQuery, locale);
    setAttempt(value => value + 1);
  };
  const role = useContext(PublicAuthRoleContext);
  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = publicOrganizationDirectoryQuerySchema.safeParse({ ...query, search: search.trim() || undefined, page: 1 });
    if (!parsed.success) return;
    setQuery(parsed.data);
    syncBrowserUrl(parsed.data, locale);
    setAttempt(value => value + 1);
  };

  return (
    <div className="public-developer-directory" data-page="public-developers" data-developers-state={view}>
      <PublicSiteHeader locale={locale} copy={getPublicHomepageCopy(locale)} activePath="/developers" />
      <header className="public-developer-directory__intro">
        <div>
          <p className="public-homepage__eyebrow">{copy.introEyebrow}</p>
          <h1>{copy.title}</h1>
          {role === 'admin' ? <p><a href={`/admin/providers?lang=${locale}`}>{locale === 'ar' ? 'إدارة الشركات: تعديل الملف والصورة أو الحذف من الدليل' : 'Manage companies: edit profiles, images or remove from the directory'}</a></p> : role === 'provider' ? <p><a href={`/provider/settings?lang=${locale}`}>{locale === 'ar' ? 'إعدادات حسابك' : 'Your account settings'}</a></p> : null}
          <p>{copy.subtitle}</p>
        </div>
      </header>
      <div className="public-developer-directory__body">
          <aside className="public-developer-directory__filters" aria-label={copy.searchLabel}>
            <form role="search" onSubmit={submitSearch} aria-label={copy.searchLabel}>
              <label className="public-developer-directory__filter-field" htmlFor="public-developer-search">{copy.searchLabel}<input id="public-developer-search" name="search" type="search" maxLength={80} value={search} placeholder={copy.searchPlaceholder} onChange={event => setSearch(event.target.value)} /></label>
              <div className="public-developer-directory__filter-actions"><button type="submit">{copy.searchAction}</button><button type="button" className="public-developer-directory__reset" onClick={() => { setSearch(''); const reset = defaultPublicDeveloperDirectoryQuery(); setQuery(reset); syncBrowserUrl(reset, locale); setAttempt(value => value + 1); }}>{copy.resetFilters}</button></div>
            </form>
          </aside>
          {view === 'success' && data !== undefined
            ? <DirectorySuccess data={data} locale={locale} copy={copy} onPageChange={changePage} />
            : <StateNotice state={view === 'success' ? 'empty' : view} copy={copy} onRetry={retry} />}
      </div>
      <Footer locale={locale} copy={copy} />
    </div>
  );
}
