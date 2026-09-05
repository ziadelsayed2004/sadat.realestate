import { useEffect, useState } from 'react';
import type {
  PublicPropertyRelatedProperty,
  PublicPropertyComparisonData,
  PublicPropertyComparisonField,
  SupportedLocale
} from '@sadat-real-estate/contracts';
import { ApiClientError } from '../contracts/index.ts';
import { Button, PropertyCard } from '../design_system/index.ts';
import { UxStateView, type UxState } from '../ux_states/index.ts';
import { getPublicHomepageCopy } from './copy.ts';
import { PublicMediaImage, PublicSiteFooter, PublicSiteHeader } from './components.tsx';
import {
  defaultPublicPropertyComparisonLoader,
  parsePublicPropertyComparisonIds,
  publicPropertyComparisonUrl,
  type PublicPropertyComparisonLoader
} from './compare-data.ts';
import { getPublicPropertyComparisonCopy, type PublicPropertyComparisonCopy } from './compare-copy.ts';
import { formatArea, formatMoney, localizedText } from './model.ts';
import { publicPropertyDetailsUrl } from './details-data.ts';
import './compare.css';

type PublicComparisonProperty = PublicPropertyComparisonData['items'][number];

export type PublicPropertyComparisonInitialState = 'loading' | 'retry' | 'empty' | 'unavailable';
export type PublicPropertyComparisonViewState =
  Extract<UxState, 'loading' | 'empty' | 'error' | 'retry' | 'success' | 'permission'> | 'unavailable';

export interface PublicPropertyComparisonProps {
  readonly url?: string | undefined;
  readonly locale: SupportedLocale;
  readonly initialData?: PublicPropertyComparisonData | undefined;
  readonly initialState?: PublicPropertyComparisonInitialState | undefined;
  readonly load?: PublicPropertyComparisonLoader | undefined;
}

function errorState(error: unknown): PublicPropertyComparisonViewState {
  if (error instanceof ApiClientError && error.status === 404) return 'unavailable';
  if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) return 'permission';
  if (error instanceof ApiClientError && error.code === 'NETWORK_ERROR') return 'retry';
  return 'error';
}

function stateCopy(
  state: Exclude<PublicPropertyComparisonViewState, 'success' | 'unavailable'>,
  copy: PublicPropertyComparisonCopy
): { readonly title: string; readonly body: string } {
  switch (state) {
    case 'loading': return { title: copy.loadingTitle, body: copy.loadingBody };
    case 'empty': return { title: copy.emptyTitle, body: copy.emptyBody };
    case 'error': return { title: copy.errorTitle, body: copy.errorBody };
    case 'retry': return { title: copy.retryTitle, body: copy.retryBody };
    case 'permission': return { title: copy.permissionTitle, body: copy.permissionBody };
  }
}

function Footer({ locale }: { readonly locale: SupportedLocale }) { return <PublicSiteFooter locale={locale} description={getPublicPropertyComparisonCopy(locale).footerDescription} />; }

function StateNotice({
  state,
  copy,
  onRetry
}: {
  readonly state: Exclude<PublicPropertyComparisonViewState, 'success' | 'unavailable'>;
  readonly copy: PublicPropertyComparisonCopy;
  readonly onRetry: () => void;
}) {
  const text = stateCopy(state, copy);
  return (
    <section className="public-property-comparison__state" data-state={state}>
      <UxStateView
        state={state}
        title={text.title}
        message={text.body}
        retryLabel={copy.retryLabel}
        onRetry={state === 'retry' || state === 'error' ? onRetry : undefined}
      >
        {state === 'empty' || state === 'permission' ? <a className="public-property-comparison__state-link" href="/properties">{copy.backToProperties}</a> : null}
        {state === 'permission' ? <a className="public-property-comparison__state-link" href="/">{copy.permissionLink}</a> : null}
        {state === 'error' ? <button type="button" onClick={onRetry}>{copy.retryLabel}</button> : null}
      </UxStateView>
    </section>
  );
}

function UnavailableNotice({ copy }: { readonly copy: PublicPropertyComparisonCopy }) {
  return (
    <section className="public-property-comparison__state" data-state="unavailable" role="alert" aria-label={copy.unavailableTitle}>
      <h1>{copy.unavailableTitle}</h1>
      <p>{copy.unavailableBody}</p>
      <a className="public-property-comparison__state-link" href="/properties">{copy.backToProperties}</a>
    </section>
  );
}

function sourceTypeValue(property: PublicPropertyRelatedProperty, copy: PublicPropertyComparisonCopy): string {
  switch (property.sourceType) {
    case 'developer_company': return copy.developerCompany;
    case 'brokerage_office': return copy.brokerageOffice;
    case 'individual_broker': return copy.individualBroker;
    default: return copy.valueUnavailable;
  }
}

function localizedOptional(value: Parameters<typeof localizedText>[0], locale: SupportedLocale, fallback: string): string {
  return localizedText(value, locale) ?? fallback;
}

function comparisonMoney(property: PublicPropertyRelatedProperty, locale: SupportedLocale): string | undefined {
  if (locale === 'ar' && property.price?.currency === 'EGP' && property.price.amount >= 1_000_000) {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(property.price.amount / 1_000_000) + ' مليون جنيه';
  }
  return formatMoney(property.price, locale);
}

function fieldValue(
  property: PublicComparisonProperty,
  field: PublicPropertyComparisonField,
  locale: SupportedLocale,
  copy: PublicPropertyComparisonCopy
): string {
  switch (field) {
    case 'kind': return localizedOptional(property.propertyTypeName, locale, property.kind === 'property' ? copy.property : copy.unit);
    case 'transactionType': return property.transactionType === 'sale' ? copy.sale : copy.rent;
    case 'sourceName': return localizedOptional(property.sourceName, locale, copy.valueUnavailable);
    case 'sourceType': return sourceTypeValue(property, copy);
    case 'project': return copy.valueUnavailable;
    case 'developer': return localizedOptional(property.sourceName, locale, copy.valueUnavailable);
    case 'publicCode': return property.publicCode ?? copy.valueUnavailable;
    case 'price': return comparisonMoney(property, locale) ?? copy.valueUnavailable;
    case 'installment': return property.installmentAvailable === true ? copy.available : copy.valueUnavailable;
    case 'area': return formatArea(property.area, locale, copy.sqm) ?? copy.valueUnavailable;
    case 'bedrooms': return property.layout?.bedrooms === undefined ? copy.valueUnavailable : String(property.layout.bedrooms);
    case 'bathrooms': return property.layout?.bathrooms === undefined ? copy.valueUnavailable : String(property.layout.bathrooms);
    case 'floor': return property.layout?.floor === undefined ? copy.valueUnavailable : String(property.layout.floor);
    case 'deliveryStatus': return copy.valueUnavailable;
    case 'locationName': return localizedOptional(property.locationName, locale, copy.valueUnavailable);
  }
}

function fieldLabel(field: PublicPropertyComparisonField, copy: PublicPropertyComparisonCopy): string {
  switch (field) {
    case 'kind': return copy.propertyType;
    case 'transactionType': return copy.transactionType;
    case 'sourceName': return copy.sourceName;
    case 'sourceType': return copy.sourceType;
    case 'project': return copy.project;
    case 'developer': return copy.developer;
    case 'publicCode': return copy.reference;
    case 'price': return copy.price;
    case 'installment': return copy.installment;
    case 'area': return copy.area;
    case 'bedrooms': return copy.bedrooms;
    case 'bathrooms': return copy.bathrooms;
    case 'floor': return copy.floor;
    case 'deliveryStatus': return copy.deliveryStatus;
    case 'locationName': return copy.location;
  }
}

const fieldGroups: ReadonlyArray<{
  readonly title: keyof Pick<PublicPropertyComparisonCopy, 'basicTitle' | 'priceTitle' | 'dimensionsTitle' | 'locationTitle'>;
  readonly fields: readonly PublicPropertyComparisonField[];
}> = [
  { title: 'basicTitle', fields: ['kind', 'transactionType', 'sourceName', 'sourceType', 'project', 'developer', 'publicCode'] },
  { title: 'priceTitle', fields: ['price', 'installment'] },
  { title: 'dimensionsTitle', fields: ['area', 'bedrooms', 'bathrooms', 'floor', 'deliveryStatus'] },
  { title: 'locationTitle', fields: ['locationName'] }
];

function ComparisonGroup({
  data,
  fields,
  id,
  title,
  locale,
  copy,
  showDifferences
}: {
  readonly data: PublicPropertyComparisonData;
  readonly fields: readonly PublicPropertyComparisonField[];
  readonly id: string;
  readonly title: string;
  readonly locale: SupportedLocale;
  readonly copy: PublicPropertyComparisonCopy;
  readonly showDifferences: boolean;
}) {
  const availableFields = fields.filter(field => data.fields.includes(field));
  const visibleFields = availableFields.filter(field => {
    if (!showDifferences || data.items.length < 2) return true;
    const values = data.items.map(item => fieldValue(item, field, locale, copy));
    return new Set(values).size > 1;
  });
  if (visibleFields.length === 0) return null;

  return (
    <section className="public-property-comparison__group" aria-labelledby={'public-property-comparison-' + id}>
      <h2 id={'public-property-comparison-' + id}>{title}</h2>
      <div className="public-property-comparison__table-wrap">
        <table>
          <caption className="public-property-comparison__visually-hidden">{title}</caption>
          <colgroup>
            <col className="public-property-comparison__value-column" />
            <col className="public-property-comparison__label-column" />
            <col className="public-property-comparison__value-column" />
          </colgroup>
          <tbody>
            {visibleFields.map(field => (
              <tr key={field}>
                {data.items[0] !== undefined ? <td>{fieldValue(data.items[0], field, locale, copy)}</td> : null}
                <th scope="row">{fieldLabel(field, copy)}</th>
                {data.items[1] !== undefined ? <td>{fieldValue(data.items[1], field, locale, copy)}</td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ComparisonTables({
  data,
  locale,
  copy,
  showDifferences
}: {
  readonly data: PublicPropertyComparisonData;
  readonly locale: SupportedLocale;
  readonly copy: PublicPropertyComparisonCopy;
  readonly showDifferences: boolean;
}) {
  const groups = fieldGroups.map(group => (
    <ComparisonGroup
      key={group.title}
      data={data}
      fields={group.fields}
      id={group.title}
      title={copy[group.title]}
      locale={locale}
      copy={copy}
      showDifferences={showDifferences}
    />
  ));
  const visibleGroupCount = groups.filter(group => group !== null).length;
  return (
    <section className="public-property-comparison__details" aria-labelledby="public-property-comparison-details-title">
      <h2 id="public-property-comparison-details-title" className="public-property-comparison__visually-hidden">{copy.detailsTitle}</h2>
      {visibleGroupCount === 0 ? <p className="public-property-comparison__no-differences" role="status">{copy.noDifferences}</p> : groups}
    </section>
  );
}

function ComparisonCards({
  data,
  locale,
  copy,
  onRemove
}: {
  readonly data: PublicPropertyComparisonData;
  readonly locale: SupportedLocale;
  readonly copy: PublicPropertyComparisonCopy;
  readonly onRemove: (propertyId: string) => void;
}) {
  return (
    <div className="public-property-comparison__cards" data-item-count={data.items.length}>
      {data.items.map(property => {
        const title = localizedText(property.name, locale) ?? property.slug;
        return (
          <PropertyCard
            key={property.id}
            className="public-property-comparison__card"
            data-comparison-card="true"
            title={title}
            href={publicPropertyDetailsUrl(property.slug)}
            location={localizedOptional(property.locationName, locale, copy.valueUnavailable)}
            price={comparisonMoney(property, locale)}
            source={property.sourceName !== undefined ? (
              <span className="public-property-comparison__source-content">
                {property.sourceImageUrl !== undefined ? <PublicMediaImage src={property.sourceImageUrl} alt="" loading="eager" fallback={<span className="public-property-comparison__source-image-fallback" aria-hidden="true" />} /> : null}
                <span>
                  <strong>{localizedOptional(property.sourceName, locale, copy.valueUnavailable)}</strong>
                  <small>{sourceTypeValue(property, copy)}</small>
                </span>
              </span>
            ) : undefined}
            image={<PublicMediaImage src={property.imageUrl} alt={title} fallback={<UxStateView state="missing_image" title={copy.imageUnavailable} />} />}
            imageAlt={copy.imageUnavailable}
            action={(
              <div className="public-property-comparison__card-actions">
                <a className="public-property-comparison__details-link" href={publicPropertyDetailsUrl(property.slug)}>{copy.viewDetails}</a>
                <Button type="button" variant="danger" size="sm" onClick={() => onRemove(property.id)}>{copy.remove}</Button>
              </div>
            )}
          />
        );
      })}
    </div>
  );
}

function ComparisonContent({
  data,
  locale,
  copy,
  onRemove,
  onClear
}: {
  readonly data: PublicPropertyComparisonData;
  readonly locale: SupportedLocale;
  readonly copy: PublicPropertyComparisonCopy;
  readonly onRemove: (propertyId: string) => void;
  readonly onClear: () => void;
}) {
  const [showDifferences, setShowDifferences] = useState(false);
  return (
    <>
      <section className="public-property-comparison__intro" aria-labelledby="public-property-comparison-title">
        <div className="public-property-comparison__intro-text">
          <h1 id="public-property-comparison-title">{copy.title}</h1>
          <p>{copy.description}</p>
          <span className="public-property-comparison__eyebrow">{copy.selectedCount(data.items.length)}</span>
        </div>
        {data.items.length < 2 ? (
          <a href="/properties" className="public-property-comparison__add-unit">
            {copy.addAnotherUnit}
          </a>
        ) : null}
      </section>
      <div className="public-property-comparison__controls-wrap">
        <div className="public-property-comparison__controls" aria-label={copy.viewModeLabel}>
          <button type="button" className={showDifferences ? undefined : 'is-active'} aria-pressed={!showDifferences} onClick={() => setShowDifferences(false)}>{copy.showAll}</button>
          <button type="button" className={showDifferences ? 'is-active' : undefined} aria-pressed={showDifferences} onClick={() => setShowDifferences(true)}>{copy.showDifferences}</button>
        </div>
      </div>
      <section className="public-property-comparison__selection" aria-labelledby="public-property-comparison-selection-title">
        <h2 id="public-property-comparison-selection-title" className="public-property-comparison__visually-hidden">{copy.title}</h2>
        <ComparisonCards data={data} locale={locale} copy={copy} onRemove={onRemove} />
      </section>
      <ComparisonTables data={data} locale={locale} copy={copy} showDifferences={showDifferences} />
      <div className="public-property-comparison__sticky-actions" aria-label={copy.title}>
        <strong>{copy.title}</strong>
        <button type="button" onClick={onClear}>{copy.clearAll}</button>
      </div>
    </>
  );
}

export function PublicPropertyComparison({
  url,
  locale,
  initialData,
  initialState,
  load = defaultPublicPropertyComparisonLoader
}: PublicPropertyComparisonProps) {
  const copy = getPublicPropertyComparisonCopy(locale);
  const sourceUrl = url ?? (typeof window === 'undefined' ? '/compare' : window.location.href);
  const initialIds = parsePublicPropertyComparisonIds(sourceUrl);
  const initialView: PublicPropertyComparisonViewState = initialIds.length === 0
    ? 'empty'
    : initialData === undefined
      ? initialState ?? 'loading'
      : 'success';
  const [ids, setIds] = useState<string[]>(initialIds);
  const [data, setData] = useState<PublicPropertyComparisonData | undefined>(initialData);
  const [view, setView] = useState<PublicPropertyComparisonViewState>(initialView);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (ids.length === 0) {
      setData(undefined);
      setView('empty');
      return;
    }
    if (initialData !== undefined && attempt === 0) return;
    if ((initialState === 'retry' || initialState === 'unavailable') && attempt === 0) return;

    const controller = new AbortController();
    setView('loading');
    void load(ids, controller.signal)
      .then(nextData => {
        if (controller.signal.aborted) return;
        setData(nextData);
        setView('success');
      })
      .catch(error => {
        if (controller.signal.aborted || (error instanceof ApiClientError && error.code === 'ABORTED')) return;
        setData(undefined);
        setView(errorState(error));
      });
    return () => controller.abort();
  }, [attempt, ids, initialData, load]);

  useEffect(() => {
    const onPopState = () => {
      setIds(parsePublicPropertyComparisonIds(window.location.href));
      setAttempt(value => value + 1);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const updateIds = (nextIds: readonly string[]) => {
    const nextUrl = publicPropertyComparisonUrl(nextIds, typeof window === 'undefined' ? sourceUrl : window.location.href);
    if (typeof window !== 'undefined') window.history.pushState({}, '', nextUrl);
    setIds([...nextIds]);
    setData(undefined);
    setView(nextIds.length === 0 ? 'empty' : 'loading');
    setAttempt(value => value + 1);
  };

  return (
    <div className="public-property-comparison" data-page="public-comparison" data-comparison-state={view} data-comparison-count={data?.items.length ?? 0}>
      <PublicSiteHeader locale={locale} copy={getPublicHomepageCopy(locale)} activePath="/properties" />
      {view === 'success' && data !== undefined ? (
        <ComparisonContent data={data} locale={locale} copy={copy} onRemove={propertyId => updateIds(ids.filter(id => id !== propertyId))} onClear={() => updateIds([])} />
      ) : view === 'unavailable' ? (
        <UnavailableNotice copy={copy} />
      ) : (
        <StateNotice state={view === 'success' ? 'loading' : view} copy={copy} onRetry={() => setAttempt(value => value + 1)} />
      )}
      <Footer locale={locale} />
    </div>
  );
}
