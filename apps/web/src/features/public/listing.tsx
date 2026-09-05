import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import type {
  PublicHomepageCategory,
  PublicPropertyListData,
  PublicPropertySearchQuery,
  SupportedLocale
} from '@sadat-real-estate/contracts';
import { publicPropertySearchQuerySchema } from '@sadat-real-estate/contracts';
import { ApiClientError } from '../contracts/index.ts';
import { CustomSelect, Pagination, PropertyCard } from '../design_system/index.ts';
import { UxStateView, type UxState } from '../ux_states/index.ts';
import { getPublicHomepageCopy } from './copy.ts';
import { PublicCategoryGlyph, PublicMediaImage, PublicSiteFooter, PublicSiteHeader, canonicalHomepageCategories, fallbackPropertyImage, publicCategoryAsset } from './components.tsx';
import {
  defaultPublicPropertyListLoader,
  defaultPublicPropertySearchQuery,
  parsePublicPropertySearchQuery,
  publicPropertySearchUrl,
  type PublicPropertyListLoader
} from './listing-data.ts';
import { getPublicPropertyListingCopy, type PublicPropertyListingCopy } from './listing-copy.ts';
import { formatMoney, localizedText, propertyFeatures } from './model.ts';
import { publicPropertyComparisonUrl } from './compare-data.ts';
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
  readonly propertyTypeId: string;
  readonly deliveryStatus: '' | 'ready_to_move' | 'under_construction' | 'future_delivery';
  readonly sort: PublicPropertySearchQuery['sort'];
  readonly direction: PublicPropertySearchQuery['direction'];
}

const propertyTypeFilterOrder = ['apartments', 'villa', 'land', 'offices', 'duplex'] as const;

type ListingRailItem = PublicHomepageCategory & {
  readonly actualId?: string;
  readonly actualKind?: 'category' | 'type';
};

function listingRailItems(data: PublicPropertyListData): ReadonlyArray<ListingRailItem> {
  const categories = new Map(data.categories.map(item => [item.slug, item] as const));
  const propertyTypes = new Map(data.propertyTypes.map(item => [item.slug, item] as const));
  const canonical = canonicalHomepageCategories.map(item => {
    const actual = categories.get(item.slug) ?? propertyTypes.get(item.slug);
    return actual === undefined
      ? item
      : {
          ...item,
          id: actual.id,
          ...(actual.imageUrl ? { imageUrl: actual.imageUrl } : {}),
          actualId: actual.id,
          actualKind: categories.has(item.slug) ? 'category' as const : 'type' as const
        };
  });
  const canonicalSlugs = new Set(canonical.map(item => item.slug));
  const extras: ListingRailItem[] = [];
  for (const item of data.categories) {
    if (!canonicalSlugs.has(item.slug)) extras.push({ ...item, actualId: item.id, actualKind: 'category' });
  }
  for (const item of data.propertyTypes) {
    if (!canonicalSlugs.has(item.slug) && !extras.some(extra => extra.slug === item.slug)) {
      extras.push({ ...item, actualId: item.id, actualKind: 'type' });
    }
  }
  return [...canonical, ...extras];
}

function listingFilterTypes(data: PublicPropertyListData): PublicHomepageCategory[] {
  const propertyTypes = new Map(data.propertyTypes.map(item => [item.slug, item] as const));
  return propertyTypeFilterOrder.flatMap(slug => {
    const item = propertyTypes.get(slug);
    return item === undefined || item.propertyCount === 0 ? [] : [item];
  });
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

function listingPrice(
  value: PublicPropertyListData['items'][number]['price'],
  transactionType: PublicPropertyListData['items'][number]['transactionType'],
  locale: SupportedLocale
): string | undefined {
  if (value === undefined || locale !== 'ar' || value.currency !== 'EGP') return formatMoney(value, locale);

  const amount = value.amount >= 1_000_000
    ? `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value.amount / 1_000_000)} مليون جنيه`
    : `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value.amount)} جنيه`;
  return transactionType === 'rent' ? `${amount} / شهر` : amount;
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
    propertyTypeId: query.propertyTypeId ?? '',
    deliveryStatus: query.deliveryStatus ?? '',
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
  locale,
  onCommit,
  onSubmit,
  onReset,
  error,
  categories,
  locations
}: {
  readonly draft: ListingFilterDraft;
  readonly copy: PublicPropertyListingCopy;
  readonly locale: SupportedLocale;
  readonly onCommit: <K extends FilterKey>(key: K, value: ListingFilterDraft[K]) => void;
  readonly onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  readonly onReset: () => void;
  readonly error: boolean;
  readonly categories: PublicPropertyListData['categories'];
  readonly locations: NonNullable<PublicPropertyListData['locations']>;
}) {
  const locationNames = new Map(locations.map(location => [location.id, localizedText(location.name, locale) ?? location.slug] as const));
  const locationOptions = locations.map(location => ({
    value: location.id,
    label: location.parentLocationId && locationNames.has(location.parentLocationId)
      ? `${localizedText(location.name, locale) ?? location.slug} — ${locationNames.get(location.parentLocationId)}`
      : localizedText(location.name, locale) ?? location.slug
  }));
  return (
    <aside className="public-property-listing__filters" aria-labelledby="public-property-listing-filters-title">
      <div className="public-property-listing__filters-heading">
        <h2 id="public-property-listing-filters-title">{copy.filtersTitle}</h2>
        <button type="button" className="public-property-listing__reset" onClick={onReset}>{copy.resetFilters}</button>
      </div>
      <form onSubmit={onSubmit} aria-label={copy.filtersTitle}>
        <fieldset className="public-property-listing__filter-chips">
          <legend>{copy.transactionLabel}</legend>
          <label><input type="radio" name="transactionType" value="" checked={draft.transactionType === ''} onChange={() => onCommit('transactionType', '')} /> {copy.allTransactions}</label>
          <label><input type="radio" name="transactionType" value="sale" checked={draft.transactionType === 'sale'} onChange={() => onCommit('transactionType', 'sale')} /> {copy.sale}</label>
          <label><input type="radio" name="transactionType" value="rent" checked={draft.transactionType === 'rent'} onChange={() => onCommit('transactionType', 'rent')} /> {copy.rent}</label>
        </fieldset>
        <fieldset className="public-property-listing__filter-chips public-property-listing__filter-chips--types">
          <legend>{copy.propertyType}</legend>
          <label><input type="radio" name="propertyTypeId" value="" checked={draft.propertyTypeId === ''} onChange={() => onCommit('propertyTypeId', '')} /> {copy.allKinds}</label>
          {categories.map(category => <label key={category.id}><input type="radio" name="propertyTypeId" value={category.id} checked={draft.propertyTypeId === category.id} onChange={() => onCommit('propertyTypeId', category.id)} /> {localizedText(category.name, 'ar') ?? category.slug}</label>)}
        </fieldset>
        <FilterField id="public-property-location" label={copy.locationId}>
          <CustomSelect
            id="public-property-location"
            name="locationId"
            value={draft.locationId}
            onChange={value => onCommit('locationId', value)}
            placeholder={copy.valuePlaceholder}
            ariaLabel={copy.locationId}
            options={locationOptions}
            disabled={locationOptions.length === 0}
          />
        </FilterField>
        <FilterField id="public-property-delivery-status" label={copy.deliveryStatus}>
          <CustomSelect
            name="deliveryStatus"
            value={draft.deliveryStatus}
            onChange={val => onCommit('deliveryStatus', val as ListingFilterDraft['deliveryStatus'])}
            placeholder={copy.valuePlaceholder}
            ariaLabel={copy.deliveryStatus}
            options={[
              { value: '', label: copy.valuePlaceholder },
              { value: 'ready_to_move', label: copy.readyToMove },
              { value: 'under_construction', label: copy.underConstruction },
              { value: 'future_delivery', label: copy.futureDelivery }
            ]}
          />
        </FilterField>
        {error ? <p className="public-property-listing__filter-error" role="alert">{copy.invalidFilters}</p> : null}
        <button className="public-property-listing__apply" type="submit">{copy.applyFilters}</button>
      </form>
    </aside>
  );
}

function ListingIcon({ type }: { readonly type: 'grid' | 'list' | 'compare' }) {
  if (type === 'grid') {
    return <svg className="public-property-listing__icon" viewBox="0 0 20 20" aria-hidden="true"><rect x="2.5" y="2.5" width="6" height="6" rx="1" /><rect x="11.5" y="2.5" width="6" height="6" rx="1" /><rect x="2.5" y="11.5" width="6" height="6" rx="1" /><rect x="11.5" y="11.5" width="6" height="6" rx="1" /></svg>;
  }
  if (type === 'list') {
    return <svg className="public-property-listing__icon" viewBox="0 0 20 20" aria-hidden="true"><circle cx="3.5" cy="4" r="1" /><circle cx="3.5" cy="10" r="1" /><circle cx="3.5" cy="16" r="1" /><path d="M7 4h10M7 10h10M7 16h10" /></svg>;
  }
  return <svg className="public-property-listing__icon public-property-listing__icon--compare" viewBox="0 0 20 20" aria-hidden="true"><circle cx="5" cy="5" r="2" /><circle cx="15" cy="5" r="2" /><circle cx="5" cy="15" r="2" /><circle cx="15" cy="15" r="2" /><path d="M7 5h6M5 7v6M15 7v6M7 15h6" /></svg>;
}

function PropertyResults({
  data,
  locale,
  copy,
  listMode,
  onPageChange,
  comparedIds,
  onToggleCompare
}: {
  readonly data: PublicPropertyListData;
  readonly locale: SupportedLocale;
  readonly copy: PublicPropertyListingCopy;
  readonly listMode: boolean;
  readonly onPageChange: (page: number) => void;
  readonly comparedIds: readonly string[];
  readonly onToggleCompare: (id: string) => void;
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
            price={listingPrice(property.price, property.transactionType, locale)}
            location={localizedText(property.locationName, locale)}
            source={<span className="public-property-listing__source-identity">{property.sourceImageUrl ? <img src={property.sourceImageUrl} alt="" width="24" height="24" loading="lazy" decoding="async" /> : null}<span>{localizedText(property.sourceName, locale)}{property.sourceType ? <small>{property.sourceType === 'developer_company' ? copy.developerSource : copy.brokerageSource}</small> : null}</span></span>}
            badges={[property.transactionType === 'sale' ? copy.sale : copy.rent, ...(property.installmentAvailable ? [copy.installment] : []), ...(property.featured ? [copy.featured] : []), property.publicCode ?? property.slug.toUpperCase()]}
            features={[...propertyFeatures(property, locale, { area: copy.area, bedrooms: homepageCopy.bedrooms, bathrooms: copy.bathrooms, floor: copy.floor, sqm: copy.sqm }).slice(0, 3), ...(property.viewCount === undefined ? [] : [{ label: copy.views, value: property.viewCount.toLocaleString(locale) }])]}
            image={<PublicMediaImage src={property.imageUrl ?? fallbackPropertyImage(property.slug, property.kind)} alt={localizedText(property.name, locale) ?? property.slug} fallback={<img src={fallbackPropertyImage(property.slug, property.kind)} alt={localizedText(property.name, locale) ?? property.slug} />} />}
            imageAlt={localizedText(property.name, locale) ?? property.slug}
            className="public-property-listing__card"
            action={<button type="button" className={`public-property-listing__compare-button${comparedIds.includes(property.id) ? ' is-selected' : ''}`} aria-pressed={comparedIds.includes(property.id)} aria-label={`${copy.addToCompare}: ${localizedText(property.name, locale) ?? property.slug}`} onClick={() => onToggleCompare(property.id)}><ListingIcon type="compare" /> {comparedIds.includes(property.id) ? (locale === 'ar' ? 'تمت الإضافة' : 'Added') : copy.addToCompare}</button>}
          />
        ))}
      </div>
      {pageCount > 1 ? <Pagination
        page={data.page}
        pageCount={pageCount}
        onPageChange={onPageChange}
        previousLabel={copy.previousPage}
        nextLabel={copy.nextPage}
        ariaLabel={copy.paginationLabel}
        direction={locale === 'ar' ? 'rtl' : 'ltr'}
      /> : null}
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
  const [comparedIds, setComparedIds] = useState<readonly string[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem('sadat-property-comparison');
    if (saved === null) return;
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) setComparedIds(parsed.filter((id): id is string => typeof id === 'string').slice(0, 2));
    } catch {
      window.localStorage.removeItem('sadat-property-comparison');
    }
  }, []);

  const toggleCompare = (id: string) => {
    setComparedIds(previous => {
      const next = previous.includes(id) ? previous.filter(item => item !== id) : [...previous, id].slice(-2);
      if (typeof window !== 'undefined') window.localStorage.setItem('sadat-property-comparison', JSON.stringify(next));
      return next;
    });
  };

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

  const commitFilterChange = <K extends FilterKey>(key: K, value: ListingFilterDraft[K]) => {
    const nextDraft = { ...draft, [key]: value, sort: query.sort, direction: query.direction };
    setDraft(nextDraft);
    const nextQuery = queryFromDraft(nextDraft);
    if (nextQuery === undefined) {
      setFilterError(true);
      return;
    }
    navigate(nextQuery, false);
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

  const updatePropertyCategory = (propertyCategoryId: string | undefined) => {
    navigate({ ...query, propertyCategoryId, propertyTypeId: undefined, page: 1 }, false);
  };

  const updatePropertyType = (propertyTypeId: string) => {
    navigate({ ...query, propertyCategoryId: undefined, propertyTypeId, page: 1 }, false);
  };

  const railItemActive = (item: ListingRailItem): boolean => item.actualKind === 'category'
    ? query.propertyCategoryId === item.actualId
    : item.actualKind === 'type' && query.propertyTypeId === item.actualId;

  const selectRailItem = (item: ListingRailItem): void => {
    if (item.actualId === undefined) return;
    if (item.actualKind === 'category') updatePropertyCategory(item.actualId);
    else updatePropertyType(item.actualId);
  };

  const railItems = data === undefined ? [] : listingRailItems(data);
  const filterTypes = data === undefined ? [] : listingFilterTypes(data);

  return (
    <div className="public-property-listing" data-page="public-properties" data-listing-state={view}>
      <PublicSiteHeader locale={locale} copy={homepageCopy} activePath="/properties" />
      <section className="public-property-listing__intro" aria-labelledby="public-property-listing-title">
        <div>
          <h1 id="public-property-listing-title">{copy.title}</h1>
          {view === 'success' && data !== undefined ? <p>{copy.resultCount(data.total)}</p> : null}
        </div>
      </section>
      {view === 'success' && data !== undefined ? <nav className="public-property-listing__category-rail" aria-label={copy.propertyType}>
        {railItems.slice(0, 1).map(item => <button type="button" key={`rail-${item.slug}`} className={railItemActive(item) ? 'is-active' : ''} aria-pressed={railItemActive(item)} disabled={item.actualId === undefined} onClick={() => selectRailItem(item)}><PublicMediaImage src={item.imageUrl ?? publicCategoryAsset(item.slug)} alt="" fallback={<PublicCategoryGlyph slug={item.slug} />} loading="eager" /><strong>{localizedText(item.name, locale) ?? item.slug}</strong><span>{item.propertyCount.toLocaleString(locale)} {copy.propertyCountLabel}</span></button>)}
        <button type="button" className={query.propertyCategoryId === undefined && query.propertyTypeId === undefined ? 'is-active' : ''} aria-pressed={query.propertyCategoryId === undefined && query.propertyTypeId === undefined} onClick={() => updatePropertyCategory(undefined)}><img src="/assets/sadat-real-estate-logo.png" alt="" width="72" height="64" decoding="async" loading="eager" /><strong>{copy.allKinds}</strong><span>{copy.allPropertiesCount} {copy.propertyCountLabel}</span></button>
        {railItems.slice(1).map(item => <button type="button" key={`rail-${item.slug}`} className={railItemActive(item) ? 'is-active' : ''} aria-pressed={railItemActive(item)} disabled={item.actualId === undefined} onClick={() => selectRailItem(item)}><PublicMediaImage src={item.imageUrl ?? publicCategoryAsset(item.slug)} alt="" fallback={<PublicCategoryGlyph slug={item.slug} />} loading="eager" /><strong>{localizedText(item.name, locale) ?? item.slug}</strong><span>{item.propertyCount.toLocaleString(locale)} {copy.propertyCountLabel}</span></button>)}
      </nav> : null}
      <div className="public-property-listing__body">
        <ListingFilters draft={draft} copy={copy} locale={locale} onCommit={commitFilterChange} onSubmit={applyFilters} onReset={() => navigate(defaultPublicPropertySearchQuery())} error={filterError} categories={filterTypes} locations={data?.locations ?? []} />
        <section className="public-property-listing__results" aria-labelledby="public-property-listing-title" aria-busy={view === 'loading'}>
          <div className="public-property-listing__toolbar">
            <div className="public-property-listing__sort">
              <label className="public-property-listing__visually-hidden" htmlFor="public-property-sort">{copy.sortLabel}</label>
              <CustomSelect
                name="sort"
                value={query.sort}
                onChange={val => {
                  const sort = val as PublicPropertySearchQuery['sort'];
                  setDraft(previous => ({ ...previous, sort }));
                  navigate({ ...query, sort, page: 1 }, false);
                }}
                ariaLabel={copy.sortLabel}
                options={[
                  { value: 'publishedAt', label: copy.sortPublishedAt },
                  { value: 'price', label: copy.sortPrice },
                  { value: 'name', label: copy.sortName },
                  { value: 'slug', label: copy.sortSlug }
                ]}
              />
            </div>
            <div className="public-property-listing__view-toggle" role="group" aria-label={copy.title}>
              <button type="button" aria-pressed={!listMode} aria-label={copy.gridView} onClick={() => setListMode(false)}><ListingIcon type="grid" /></button>
              <button type="button" aria-pressed={listMode} aria-label={copy.listView} onClick={() => setListMode(true)}><ListingIcon type="list" /></button>
            </div>
          </div>
          {view === 'success' && data !== undefined ? <PropertyResults data={data} locale={locale} copy={copy} listMode={listMode} onPageChange={page => navigate({ ...query, page })} comparedIds={comparedIds} onToggleCompare={toggleCompare} /> : view === 'success' ? <StateNotice state="empty" copy={copy} onRetry={() => setAttempt(value => value + 1)} /> : <StateNotice state={view} copy={copy} onRetry={() => setAttempt(value => value + 1)} />}
        </section>
      </div>
      {comparedIds.length > 0 ? <aside className="public-property-listing__compare-tray" aria-live="polite"><span>{locale === 'ar' ? `${comparedIds.length} عقار في المقارنة` : `${comparedIds.length} properties selected`}</span><a href={publicPropertyComparisonUrl(comparedIds, `/compare?lang=${locale}`)}>{locale === 'ar' ? 'قارن الآن' : 'Compare now'}</a><button type="button" onClick={() => { setComparedIds([]); if (typeof window !== 'undefined') window.localStorage.removeItem('sadat-property-comparison'); }}>{locale === 'ar' ? 'مسح' : 'Clear'}</button></aside> : null}
      <PublicSiteFooter locale={locale} description={copy.footerDescription} />
    </div>
  );
}
