import { useEffect, useState, type FormEvent } from 'react';
import type {
  PublicOrganizationCard,
  PublicOrganizationDirectoryQuery,
  PublicOrganizationListData,
  SupportedLocale
} from '@sadat-real-estate/contracts';
import { publicOrganizationDirectoryQuerySchema } from '@sadat-real-estate/contracts';
import { ApiClientError } from '../contracts/index.ts';
import { Badge, Pagination } from '../design_system/index.ts';
import { UxStateView, type UxState } from '../ux_states/index.ts';
import { getPublicHomepageCopy } from './copy.ts';
import { PublicSiteHeader } from './components.tsx';
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

interface DirectoryFilterDraft {
  readonly search: string;
  readonly kind: '' | 'brokerage_office' | 'developer_company';
  readonly sort: PublicOrganizationDirectoryQuery['sort'];
  readonly direction: PublicOrganizationDirectoryQuery['direction'];
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

function draftFromQuery(query: PublicOrganizationDirectoryQuery): DirectoryFilterDraft {
  return {
    search: query.search ?? '',
    kind: query.kind ?? '',
    sort: query.sort,
    direction: query.direction
  };
}

function queryFromDraft(draft: DirectoryFilterDraft): PublicOrganizationDirectoryQuery | undefined {
  const raw: Record<string, string> = {
    page: '1',
    limit: '20',
    sort: draft.sort,
    direction: draft.direction
  };
  if (draft.search.trim().length > 0) raw.search = draft.search;
  if (draft.kind !== '') raw.kind = draft.kind;
  const parsed = publicOrganizationDirectoryQuerySchema.safeParse(raw);
  return parsed.success ? parsed.data : undefined;
}

function syncBrowserUrl(query: PublicOrganizationDirectoryQuery): void {
  if (typeof window !== 'undefined') window.history.replaceState({}, '', publicDeveloperDirectoryUrl(query));
}

function kindLabel(kind: PublicOrganizationCard['kind'], copy: PublicDevelopersCopy): string {
  return kind === 'developer_company' ? copy.developerCompany : copy.brokerageOffice;
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

function DirectoryFilters({
  draft,
  copy,
  onChange,
  onSubmit,
  onReset,
  error
}: {
  readonly draft: DirectoryFilterDraft;
  readonly copy: PublicDevelopersCopy;
  readonly onChange: <K extends keyof DirectoryFilterDraft>(key: K, value: DirectoryFilterDraft[K]) => void;
  readonly onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  readonly onReset: () => void;
  readonly error: boolean;
}) {
  return (
    <aside className="public-developer-directory__filters" aria-labelledby="public-developer-directory-filters-title">
      <h2 id="public-developer-directory-filters-title">{copy.searchLabel}</h2>
      <form onSubmit={onSubmit} aria-label={copy.searchLabel}>
        <div className="public-developer-directory__filter-field">
          <label htmlFor="public-developer-search">{copy.searchLabel}</label>
          <input id="public-developer-search" name="search" type="search" value={draft.search} placeholder={copy.searchPlaceholder} onChange={event => onChange('search', event.target.value)} />
        </div>
        <fieldset>
          <legend>{copy.kindLabel}</legend>
          <label><input type="radio" name="kind" value="" checked={draft.kind === ''} onChange={() => onChange('kind', '')} /> {copy.allKinds}</label>
          <label><input type="radio" name="kind" value="developer_company" checked={draft.kind === 'developer_company'} onChange={() => onChange('kind', 'developer_company')} /> {copy.developerCompany}</label>
          <label><input type="radio" name="kind" value="brokerage_office" checked={draft.kind === 'brokerage_office'} onChange={() => onChange('kind', 'brokerage_office')} /> {copy.brokerageOffice}</label>
        </fieldset>
        <div className="public-developer-directory__sort-fields">
          <label htmlFor="public-developer-sort">{copy.sortLabel}</label>
          <select id="public-developer-sort" value={draft.sort} onChange={event => onChange('sort', event.target.value as DirectoryFilterDraft['sort'])}>
            <option value="slug">{copy.sortSlug}</option>
            <option value="name">{copy.sortName}</option>
          </select>
          <label htmlFor="public-developer-direction">{copy.directionLabel}</label>
          <select id="public-developer-direction" value={draft.direction} onChange={event => onChange('direction', event.target.value as DirectoryFilterDraft['direction'])}>
            <option value="asc">{copy.ascending}</option>
            <option value="desc">{copy.descending}</option>
          </select>
        </div>
        {error ? <p className="public-developer-directory__filter-error" role="alert">{copy.errorBody}</p> : null}
        <div className="public-developer-directory__filter-actions">
          <button className="public-developer-directory__reset" type="button" onClick={onReset}>{copy.resetFilters}</button>
          <button type="submit">{copy.searchAction}</button>
        </div>
      </form>
    </aside>
  );
}

function OrganizationCard({ organization, locale, copy }: { readonly organization: PublicOrganizationCard; readonly locale: SupportedLocale; readonly copy: PublicDevelopersCopy }) {
  const title = localizedText(organization.name, locale) ?? organization.slug;
  const description = localizedText(organization.description, locale);
  return (
    <article className="public-developer-directory__card">
      <div className="public-developer-directory__card-media">
        <UxStateView state="missing_image" title={copy.imageUnavailable} />
      </div>
      <div className="public-developer-directory__card-body">
        <div className="public-developer-profile__badges">
          <Badge tone="success">{copy.verified}</Badge>
          <Badge tone="neutral">{kindLabel(organization.kind, copy)}</Badge>
        </div>
        <h2><a href={`/developers/${encodeURIComponent(organization.slug)}`}>{title}</a></h2>
        {description === undefined ? null : <p className="public-developer-directory__card-description">{description}</p>}
        <dl className="public-developer-directory__card-meta">
          <div><dt>{copy.projects}</dt><dd>{copy.projectCount(organization.projectCount)}</dd></div>
          <div><dt>{copy.properties}</dt><dd>{copy.propertyCount(organization.propertyCount)}</dd></div>
        </dl>
        <a className="public-developer-directory__card-link" href={`/developers/${encodeURIComponent(organization.slug)}`}>{copy.openProfile}</a>
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
      <Pagination page={data.page} pageCount={pageCount} onPageChange={onPageChange} previousLabel={copy.previousPage} nextLabel={copy.nextPage} ariaLabel={copy.paginationLabel} direction={locale === 'ar' ? 'rtl' : 'ltr'} />
    </section>
  );
}

function Footer({ locale, copy }: { readonly locale: SupportedLocale; readonly copy: PublicDevelopersCopy }) {
  const homepageCopy = getPublicHomepageCopy(locale);
  return (
    <footer className="public-homepage__footer public-developer-profile__footer">
      <div>
        <p className="public-homepage__eyebrow">{homepageCopy.brand}</p>
        <p>{copy.footerDescription}</p>
      </div>
      <div>
        <p className="public-homepage__footer-title">{copy.footerLinks}</p>
        <div className="public-homepage__footer-links">
          <a href="/">{homepageCopy.nav.home}</a>
          <a href="/properties">{homepageCopy.nav.properties}</a>
          <a href="/developers">{homepageCopy.nav.developers}</a>
          <a href="/about">{homepageCopy.nav.about}</a>
        </div>
      </div>
    </footer>
  );
}

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
  const [draft, setDraft] = useState<DirectoryFilterDraft>(() => draftFromQuery(initialQuery ?? parsePublicDeveloperDirectoryQuery(sourceUrl)));
  const initialView: PublicDevelopersViewState = initialData === undefined ? initialState : isDirectoryEmpty(initialData) ? 'empty' : 'success';
  const [data, setData] = useState<PublicOrganizationListData | undefined>(initialData);
  const [view, setView] = useState<PublicDevelopersViewState>(initialView);
  const [attempt, setAttempt] = useState(0);
  const [filterError, setFilterError] = useState(false);

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
  const changeFilter = <K extends keyof DirectoryFilterDraft>(key: K, value: DirectoryFilterDraft[K]) => {
    setDraft(current => ({ ...current, [key]: value }));
  };
  const submitFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextQuery = queryFromDraft(draft);
    if (nextQuery === undefined) {
      setFilterError(true);
      return;
    }
    setFilterError(false);
    setQuery(nextQuery);
    syncBrowserUrl(nextQuery);
    setAttempt(value => value + 1);
  };
  const resetFilters = () => {
    const nextQuery = defaultPublicDeveloperDirectoryQuery();
    setDraft(draftFromQuery(nextQuery));
    setQuery(nextQuery);
    setFilterError(false);
    syncBrowserUrl(nextQuery);
    setAttempt(value => value + 1);
  };
  const changePage = (page: number) => {
    const nextQuery = { ...query, page };
    setQuery(nextQuery);
    syncBrowserUrl(nextQuery);
    setAttempt(value => value + 1);
  };

  return (
    <div className="public-developer-directory" data-page="public-developers" data-developers-state={view}>
      <PublicSiteHeader locale={locale} copy={getPublicHomepageCopy(locale)} activePath="/developers" />
      <header className="public-developer-directory__intro">
        <div>
          <p className="public-homepage__eyebrow">{copy.verified}</p>
          <h1>{copy.title}</h1>
          <p>{copy.subtitle}</p>
        </div>
      </header>
      {view === 'success' && data !== undefined ? (
        <div className="public-developer-directory__body">
          <DirectoryFilters draft={draft} copy={copy} onChange={changeFilter} onSubmit={submitFilters} onReset={resetFilters} error={filterError} />
          <DirectorySuccess data={data} locale={locale} copy={copy} onPageChange={changePage} />
        </div>
      ) : view === 'empty' ? (
        <>
          <DirectoryFilters draft={draft} copy={copy} onChange={changeFilter} onSubmit={submitFilters} onReset={resetFilters} error={filterError} />
          <StateNotice state="empty" copy={copy} onRetry={retry} />
        </>
      ) : view === 'success' ? (
        <StateNotice state="empty" copy={copy} onRetry={retry} />
      ) : (
        <StateNotice state={view} copy={copy} onRetry={retry} />
      )}
      <Footer locale={locale} copy={copy} />
    </div>
  );
}
