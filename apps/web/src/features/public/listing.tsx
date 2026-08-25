import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import type {
  PublicPropertyListData,
  PublicPropertySearchQuery,
  SupportedLocale
} from '@sadat-real-estate/contracts';
import { publicPropertySearchQuerySchema } from '@sadat-real-estate/contracts';
import { ApiClientError } from '../contracts/index.ts';
import { Pagination, PropertyCard } from '../design_system/index.ts';
import { UxStateView, type UxState } from '../ux_states/index.ts';
import { getPublicHomepageCopy } from './copy.ts';
import { PublicMediaImage, PublicSiteFooter, PublicSiteHeader } from './components.tsx';
import {
  defaultPublicPropertyListLoader,
  defaultPublicPropertySearchQuery,
  parsePublicPropertySearchQuery,
  publicPropertySearchUrl,
  type PublicPropertyListLoader
} from './listing-data.ts';
import { getPublicPropertyListingCopy, type PublicPropertyListingCopy } from './listing-copy.ts';
import { formatMoney, localizedText, propertyFeatures } from './model.ts';
import './listing.css';

export type PublicPropertyListingViewState = Extract<UxState, 'loading' | 'empty' | 'error' | 'retry' | 'success' | 'permission'>;

export interface PublicPropertyListingProps {
  readonly url?: string;
  readonly locale: SupportedLocale;
  readonly initialData?: PublicPropertyListData | undefined;
  readonly initialQuery?: PublicPropertySearchQuery | undefined;
  readonly initialState?: 'loading' | 'retry' | undefined;
  readonly load?: PublicPropertyListLoader | undefined;
}

interface ListingFilterDraft {
  readonly search: string;
  readonly transactionType: '' | 'sale' | 'rent';
  readonly kind: '' | 'property' | 'unit';
  readonly minPrice: string;
  readonly maxPrice: string;
  readonly bedrooms: string;
  readonly locationId: string;
  readonly projectId: string;
  readonly sort: PublicPropertySearchQuery['sort'];
  readonly direction: PublicPropertySearchQuery['direction'];
}

type FilterKey = keyof ListingFilterDraft;

function errorState(error: unknown): PublicPropertyListingViewState {
  if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) return 'permission';
  if (error instanceof ApiClientError && error.code === 'NETWORK_ERROR') return 'retry';
  return 'error';
}

function isListEmpty(data: PublicPropertyListData): boolean {
  return data.total === 0 || data.items.length === 0;
}

function stateCopy(state: PublicPropertyListingViewState, copy: PublicPropertyListingCopy): { readonly title: string; readonly body: string } {
  switch (state) {
    case 'loading': return { title: copy.loadingTitle, body: copy.loadingBody };
    case 'empty': return { title: copy.emptyTitle, body: copy.emptyBody };
    case 'error': return { title: copy.errorTitle, body: copy.errorBody };
    case 'retry': return { title: copy.retryTitle, body: copy.retryBody };
    case 'permission': return { title: copy.permissionTitle, body: copy.permissionBody };
    case 'success': return { title: copy.title, body: copy.loadingBody };
  }
}

function draftFromQuery(query: PublicPropertySearchQuery): ListingFilterDraft {
  return {
    search: query.search ?? '',
    transactionType: query.transactionType ?? '',
    kind: query.kind ?? '',
    minPrice: query.minPrice === undefined ? '' : String(query.minPrice),
    maxPrice: query.maxPrice === undefined ? '' : String(query.maxPrice),
    bedrooms: query.bedrooms === undefined ? '' : String(query.bedrooms),
    locationId: query.locationId ?? '',
    projectId: query.projectId ?? '',
    sort: query.sort,
    direction: query.direction
  };
}

function queryFromDraft(draft: ListingFilterDraft): PublicPropertySearchQuery | undefined {
  const raw: Record<string, string> = {};
  for (const [key, value] of Object.entries(draft)) {
    if (value !== '') raw[key] = value;
  }
  raw.page = '1';
  raw.limit = '20';
  const parsed = publicPropertySearchQuerySchema.safeParse(raw);
  return parsed.success ? parsed.data : undefined;
}

function StateNotice({
  state,
  copy,
  onRetry
}: {
  readonly state: Exclude<PublicPropertyListingViewState, 'success'>;
  readonly copy: PublicPropertyListingCopy;
  readonly onRetry: () => void;
}) {
  const text = stateCopy(state, copy);
  return (
    <UxStateView className="public-property-listing__state" state={state} title={text.title} message={text.body} retryLabel={copy.retryLabel} onRetry={onRetry}>
      {state === 'empty' || state === 'error' ? <button type="button" onClick={onRetry}>{copy.retryLabel}</button> : null}
      {state === 'permission' ? <a href="/" className="public-property-listing__state-link">{copy.permissionLink}</a> : null}
    </UxStateView>
  );
}

function FilterField({
  id,
  label,
  children
}: {
  readonly id: string;
  readonly label: string;
  readonly children: ReactNode;
}) {
  return (
    <div className="public-property-listing__filter-field">
      <label htmlFor={id}>{label}</label>
      {children}
    </div>
  );
}

function ListingFilters({
  draft,
  copy,
  onChange,
  onSubmit,
  onReset,
  error
}: {
  readonly draft: ListingFilterDraft;
  readonly copy: PublicPropertyListingCopy;
  readonly onChange: <K extends FilterKey>(key: K, value: ListingFilterDraft[K]) => void;
  readonly onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  readonly onReset: () => void;
  readonly error: boolean;
}) {
  return (
    <aside className="public-property-listing__filters" aria-labelledby="public-property-listing-filters-title">
      <div className="public-property-listing__filters-heading">
        <h2 id="public-property-listing-filters-title">{copy.filtersTitle}</h2>
        <button type="button" className="public-property-listing__reset" onClick={onReset}>{copy.resetFilters}</button>
      </div>
      <form onSubmit={onSubmit} aria-label={copy.filtersTitle}>
        <FilterField id="public-property-search" label={copy.searchLabel}>
          <input id="public-property-search" name="search" type="search" value={draft.search} placeholder={copy.searchPlaceholder} onChange={event => onChange('search', event.target.value)} />
        </FilterField>
        <fieldset>
          <legend>{copy.transactionLabel}</legend>
          <label><input type="radio" name="transactionType" value="" checked={draft.transactionType === ''} onChange={() => onChange('transactionType', '')} /> {copy.allTransactions}</label>
          <label><input type="radio" name="transactionType" value="sale" checked={draft.transactionType === 'sale'} onChange={() => onChange('transactionType', 'sale')} /> {copy.sale}</label>
          <label><input type="radio" name="transactionType" value="rent" checked={draft.transactionType === 'rent'} onChange={() => onChange('transactionType', 'rent')} /> {copy.rent}</label>
        </fieldset>
        <fieldset>
          <legend>{copy.kindLabel}</legend>
          <label><input type="radio" name="kind" value="" checked={draft.kind === ''} onChange={() => onChange('kind', '')} /> {copy.allKinds}</label>
          <label><input type="radio" name="kind" value="property" checked={draft.kind === 'property'} onChange={() => onChange('kind', 'property')} /> {copy.property}</label>
          <label><input type="radio" name="kind" value="unit" checked={draft.kind === 'unit'} onChange={() => onChange('kind', 'unit')} /> {copy.unit}</label>
        </fieldset>
        <div className="public-property-listing__filter-pair">
          <FilterField id="public-property-min-price" label={copy.minPrice}>
            <input id="public-property-min-price" name="minPrice" type="number" min="0" inputMode="decimal" value={draft.minPrice} placeholder={copy.valuePlaceholder} onChange={event => onChange('minPrice', event.target.value)} />
          </FilterField>
          <FilterField id="public-property-max-price" label={copy.maxPrice}>
            <input id="public-property-max-price" name="maxPrice" type="number" min="0" inputMode="decimal" value={draft.maxPrice} placeholder={copy.valuePlaceholder} onChange={event => onChange('maxPrice', event.target.value)} />
          </FilterField>
        </div>
        <FilterField id="public-property-bedrooms" label={copy.bedrooms}>
          <input id="public-property-bedrooms" name="bedrooms" type="number" min="0" max="100" inputMode="numeric" value={draft.bedrooms} placeholder={copy.valuePlaceholder} onChange={event => onChange('bedrooms', event.target.value)} />
        </FilterField>
        <FilterField id="public-property-location" label={copy.locationId}>
          <input id="public-property-location" name="locationId" type="text" value={draft.locationId} placeholder={copy.valuePlaceholder} onChange={event => onChange('locationId', event.target.value)} />
        </FilterField>
        <FilterField id="public-property-project" label={copy.projectId}>
          <input id="public-property-project" name="projectId" type="text" value={draft.projectId} placeholder={copy.valuePlaceholder} onChange={event => onChange('projectId', event.target.value)} />
        </FilterField>
        {error ? <p className="public-property-listing__filter-error" role="alert">{copy.invalidFilters}</p> : null}
        <button className="public-property-listing__apply" type="submit">{copy.applyFilters}</button>
      </form>
    </aside>
  );
}

function PropertyResults({
  data,
  locale,
  copy,
  listMode,
  onPageChange
}: {
  readonly data: PublicPropertyListData;
  readonly locale: SupportedLocale;
  readonly copy: PublicPropertyListingCopy;
  readonly listMode: boolean;
  readonly onPageChange: (page: number) => void;
}) {
  const pageCount = Math.ceil(data.total / data.limit);
  const homepageCopy = getPublicHomepageCopy(locale);
  return (
    <>
      <div className={'public-property-listing__cards' + (listMode ? ' is-list' : '')} data-layout={listMode ? 'list' : 'grid'}>
        {data.items.map(property => (
          <PropertyCard
            key={property.id}
            title={localizedText(property.name, locale) ?? property.slug}
            href={'/properties/' + property.slug}
            price={formatMoney(property.price, locale)}
            badges={[property.transactionType === 'sale' ? copy.sale : copy.rent]}
            features={propertyFeatures(property, locale, { area: copy.area, bedrooms: homepageCopy.bedrooms, bathrooms: copy.bathrooms, floor: copy.floor, sqm: copy.sqm })}
            image={<PublicMediaImage src={property.imageUrl} alt={localizedText(property.name, locale) ?? property.slug} fallback={<UxStateView state="missing_image" title={copy.imageUnavailable} />} />}
            imageAlt={copy.imageUnavailable}
            className="public-property-listing__card"
          />
        ))}
      </div>
      <Pagination
        page={data.page}
        pageCount={pageCount}
        onPageChange={onPageChange}
        previousLabel={copy.previousPage}
        nextLabel={copy.nextPage}
        ariaLabel={copy.paginationLabel}
        direction={locale === 'ar' ? 'rtl' : 'ltr'}
      />
    </>
  );
}

export function PublicPropertyListing({
  url,
  locale,
  initialData,
  initialQuery,
  initialState = 'loading',
  load = defaultPublicPropertyListLoader
}: PublicPropertyListingProps) {
  const homepageCopy = getPublicHomepageCopy(locale);
  const copy = getPublicPropertyListingCopy(locale);
  const [query, setQuery] = useState<PublicPropertySearchQuery>(() => initialQuery ?? parsePublicPropertySearchQuery(url ?? (typeof window === 'undefined' ? '/' : window.location.href)));
  const [draft, setDraft] = useState<ListingFilterDraft>(() => draftFromQuery(initialQuery ?? parsePublicPropertySearchQuery(url ?? (typeof window === 'undefined' ? '/' : window.location.href))));
  const initialView = initialData === undefined ? initialState : isListEmpty(initialData) ? 'empty' : 'success';
  const [data, setData] = useState<PublicPropertyListData | undefined>(initialData);
  const [view, setView] = useState<PublicPropertyListingViewState>(initialView);
  const [attempt, setAttempt] = useState(0);
  const [filterError, setFilterError] = useState(false);
  const [listMode, setListMode] = useState(false);

  useEffect(() => {
    if (initialData !== undefined && attempt === 0) return;
    const controller = new AbortController();
    setView('loading');
    void load(query, controller.signal)
      .then(nextData => {
        if (controller.signal.aborted) return;
        setData(nextData);
        setView(isListEmpty(nextData) ? 'empty' : 'success');
      })
      .catch(error => {
        if (controller.signal.aborted || (error instanceof ApiClientError && error.code === 'ABORTED')) return;
        setView(errorState(error));
      });
    return () => controller.abort();
  }, [attempt, initialData, load, query]);

  useEffect(() => {
    const onPopState = () => {
      const nextQuery = parsePublicPropertySearchQuery(window.location.href);
      setQuery(nextQuery);
      setDraft(draftFromQuery(nextQuery));
      setFilterError(false);
      setAttempt(value => value + 1);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = (nextQuery: PublicPropertySearchQuery, syncDraft = true) => {
    const nextUrl = publicPropertySearchUrl(nextQuery);
    if (typeof window !== 'undefined') window.history.pushState({}, '', nextUrl);
    setQuery(nextQuery);
    if (syncDraft) setDraft(draftFromQuery(nextQuery));
    setFilterError(false);
    setAttempt(value => value + 1);
  };

  const onFilterChange = <K extends FilterKey>(key: K, value: ListingFilterDraft[K]) => {
    setDraft(previous => ({ ...previous, [key]: value }));
  };

  const applyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextQuery = queryFromDraft({ ...draft, sort: query.sort, direction: query.direction });
    if (nextQuery === undefined) {
      setFilterError(true);
      return;
    }
    navigate(nextQuery);
  };

  const updateKind = (kind: PublicPropertySearchQuery['kind'] | undefined) => {
    setDraft(previous => ({ ...previous, kind: kind ?? '' }));
    navigate({ ...query, kind, page: 1 }, false);
  };

  return (
    <div className="public-property-listing" data-page="public-properties" data-listing-state={view}>
      <PublicSiteHeader locale={locale} copy={homepageCopy} activePath="/properties" />
      <section className="public-property-listing__intro" aria-labelledby="public-property-listing-title">
        <div>
          <h1 id="public-property-listing-title">{copy.title}</h1>
          {view === 'success' && data !== undefined ? <p>{copy.resultCount(data.total)}</p> : null}
        </div>
      </section>
      <nav className="public-property-listing__kind-strip" aria-label={copy.kindLabel}>
        <button type="button" className={query.kind === undefined ? 'is-active' : ''} aria-pressed={query.kind === undefined} onClick={() => updateKind(undefined)}>{copy.allKinds}</button>
        <button type="button" className={query.kind === 'property' ? 'is-active' : ''} aria-pressed={query.kind === 'property'} onClick={() => updateKind('property')}>{copy.property}</button>
        <button type="button" className={query.kind === 'unit' ? 'is-active' : ''} aria-pressed={query.kind === 'unit'} onClick={() => updateKind('unit')}>{copy.unit}</button>
      </nav>
      <div className="public-property-listing__body">
        <ListingFilters draft={draft} copy={copy} onChange={onFilterChange} onSubmit={applyFilters} onReset={() => navigate(defaultPublicPropertySearchQuery())} error={filterError} />
        <section className="public-property-listing__results" aria-labelledby="public-property-listing-title" aria-busy={view === 'loading'}>
          <div className="public-property-listing__toolbar">
            <div className="public-property-listing__sort">
              <label htmlFor="public-property-sort">{copy.sortLabel}</label>
              <select id="public-property-sort" name="sort" value={query.sort} onChange={event => {
                const sort = event.target.value as PublicPropertySearchQuery['sort'];
                setDraft(previous => ({ ...previous, sort }));
                navigate({ ...query, sort, page: 1 }, false);
              }}>
                <option value="publishedAt">{copy.sortPublishedAt}</option>
                <option value="price">{copy.sortPrice}</option>
                <option value="name">{copy.sortName}</option>
                <option value="slug">{copy.sortSlug}</option>
              </select>
              <label htmlFor="public-property-direction">{copy.directionLabel}</label>
              <select id="public-property-direction" name="direction" value={query.direction} onChange={event => {
                const direction = event.target.value as PublicPropertySearchQuery['direction'];
                setDraft(previous => ({ ...previous, direction }));
                navigate({ ...query, direction, page: 1 }, false);
              }}>
                <option value="desc">{copy.descending}</option>
                <option value="asc">{copy.ascending}</option>
              </select>
            </div>
            <div className="public-property-listing__view-toggle" role="group" aria-label={copy.title}>
              <button type="button" aria-pressed={!listMode} aria-label={copy.gridView} onClick={() => setListMode(false)}>▦</button>
              <button type="button" aria-pressed={listMode} aria-label={copy.listView} onClick={() => setListMode(true)}>☷</button>
            </div>
          </div>
          {view === 'success' && data !== undefined ? <PropertyResults data={data} locale={locale} copy={copy} listMode={listMode} onPageChange={page => navigate({ ...query, page })} /> : view === 'success' ? <StateNotice state="empty" copy={copy} onRetry={() => setAttempt(value => value + 1)} /> : <StateNotice state={view} copy={copy} onRetry={() => setAttempt(value => value + 1)} />}
        </section>
      </div>
      <PublicSiteFooter locale={locale} description={copy.footerDescription} />
    </div>
  );
}
