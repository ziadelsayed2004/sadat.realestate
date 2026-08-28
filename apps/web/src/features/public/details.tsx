import { useEffect, useState, type FormEvent } from 'react';
import type {
  PublicPropertyDetails as PublicPropertyDetailsData,
  PublicPropertyMedia,
  SupportedLocale
} from '@sadat-real-estate/contracts';
import { ApiClientError } from '../contracts/index.ts';
import { Button, Modal, PropertyCard } from '../design_system/index.ts';
import { UxStateView, type UxState } from '../ux_states/index.ts';
import { getPublicHomepageCopy } from './copy.ts';
import { PublicMediaImage, PublicSiteFooter, PublicSiteHeader } from './components.tsx';
import {
  defaultPublicPropertyDetailsActions,
  defaultPublicPropertyDetailsLoader,
  propertyDetailsSlugFromUrl,
  type PublicContactRequestInput,
  type PublicPropertyDetailsActions,
  type PublicPropertyDetailsLoader
} from './details-data.ts';
import { getPublicPropertyDetailsCopy, type PublicPropertyDetailsCopy } from './details-copy.ts';
import { formatArea, formatMoney, localizedText } from './model.ts';
import './details.css';

export type PublicPropertyDetailsInitialState = 'loading' | 'retry' | 'not_found';
export type PublicPropertyDetailsViewState = Extract<UxState, 'loading' | 'empty' | 'error' | 'retry' | 'success' | 'permission'> | 'not_found';

export interface PublicPropertyDetailsProps {
  readonly url?: string | undefined;
  readonly locale: SupportedLocale;
  readonly initialData?: PublicPropertyDetailsData | undefined;
  readonly initialState?: PublicPropertyDetailsInitialState | undefined;
  readonly load?: PublicPropertyDetailsLoader | undefined;
  readonly actions?: PublicPropertyDetailsActions | undefined;
}

function errorState(error: unknown): PublicPropertyDetailsViewState {
  if (error instanceof ApiClientError && error.status === 404) return 'not_found';
  if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) return 'permission';
  if (error instanceof ApiClientError && error.code === 'NETWORK_ERROR') return 'retry';
  return 'error';
}

function stateCopy(
  state: Exclude<PublicPropertyDetailsViewState, 'success' | 'not_found'>,
  copy: PublicPropertyDetailsCopy
): { readonly title: string; readonly body: string } {
  switch (state) {
    case 'loading': return { title: copy.loadingTitle, body: copy.loadingBody };
    case 'empty': return { title: copy.emptyTitle, body: copy.emptyBody };
    case 'error': return { title: copy.errorTitle, body: copy.errorBody };
    case 'retry': return { title: copy.retryTitle, body: copy.retryBody };
    case 'permission': return { title: copy.permissionTitle, body: copy.permissionBody };
  }
}

function returnToUrl(url: string | undefined): string {
  if (url !== undefined) return url;
  if (typeof window !== 'undefined') return `${window.location.pathname}${window.location.search}`;
  return '/properties';
}

function loginUrl(url: string | undefined): string {
  return `/auth/login?returnTo=${encodeURIComponent(returnToUrl(url))}`;
}

function safeMapUrl(value: string | undefined): string | undefined {
  if (value === undefined || value.length > 2048) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname.length > 0 ? value : undefined;
  } catch {
    return undefined;
  }
}

function Footer({ locale }: { readonly locale: SupportedLocale }) { return <PublicSiteFooter locale={locale} />; }

function StateNotice({
  state,
  copy,
  url,
  onRetry
}: {
  readonly state: Exclude<PublicPropertyDetailsViewState, 'success' | 'not_found'>;
  readonly copy: PublicPropertyDetailsCopy;
  readonly url?: string | undefined;
  readonly onRetry: () => void;
}) {
  const text = stateCopy(state, copy);
  return (
    <UxStateView
      className="public-property-details__state"
      state={state}
      title={text.title}
      message={text.body}
      retryLabel={copy.retryLabel}
      onRetry={onRetry}
    >
      {state === 'empty' || state === 'error' ? <button type="button" onClick={onRetry}>{copy.retryLabel}</button> : null}
      {state === 'permission' ? <a href="/" className="public-property-details__state-link">{copy.permissionLink}</a> : null}
      {state === 'permission' ? <a href={loginUrl(url)} className="public-property-details__state-link">{copy.actionPermissionLink}</a> : null}
    </UxStateView>
  );
}

function NotFoundNotice({ copy }: { readonly copy: PublicPropertyDetailsCopy }) {
  return (
    <section className="public-property-details__state" data-state="error" data-details-not-found="true" role="alert">
      <h1>{copy.notFoundTitle}</h1>
      <p>{copy.notFoundBody}</p>
      <a className="public-property-details__state-link" href="/properties">{copy.notFoundLink}</a>
    </section>
  );
}

function Gallery({
  media,
  copy,
  locale,
  installmentAvailable
}: {
  readonly media: readonly PublicPropertyMedia[];
  readonly copy: PublicPropertyDetailsCopy;
  readonly locale: SupportedLocale;
  readonly installmentAvailable?: boolean | undefined;
}) {
  const [selectedId, setSelectedId] = useState<string | undefined>(media[0]?.id);
  const selected = media.find(item => item.id === selectedId) ?? media[0];

  useEffect(() => {
    setSelectedId(media[0]?.id);
  }, [media]);

  return (
    <section className="public-property-details__gallery" aria-labelledby="public-property-details-gallery-title" data-gallery="true">
      <h2 id="public-property-details-gallery-title" className="public-property-details__visually-hidden">{copy.galleryTitle}</h2>
      <div className="public-property-details__gallery-badges" aria-label={copy.sale}>
        {installmentAvailable ? <span className="public-property-details__gallery-badge public-property-details__gallery-badge--installment">{locale === 'ar' ? 'تقسيط' : locale === 'zh-CN' ? '分期' : 'Installments'}</span> : null}
        <span className="public-property-details__gallery-badge public-property-details__gallery-badge--transaction">{locale === 'ar' ? 'بيع' : locale === 'zh-CN' ? '出售' : copy.sale}</span>
      </div>
      <div className="public-property-details__gallery-main">
        <PublicMediaImage
          src={selected?.imageUrl}
          alt={copy.mediaItem(Math.max(1, media.findIndex(item => item.id === selected?.id) + 1))}
          fallback={<UxStateView state="missing_image" title={copy.imageUnavailable} message={selected?.kind === 'floor_plan' ? copy.mediaUnavailable : undefined} />}
          loading="eager"
        />
      </div>
      {media.length > 0 ? (
        <div className="public-property-details__gallery-thumbnails" role="list" aria-label={copy.galleryTitle}>
          {media.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={item.id === selected?.id ? 'is-selected' : undefined}
              aria-label={copy.mediaItem(index + 1)}
              aria-pressed={item.id === selected?.id}
              onClick={() => setSelectedId(item.id)}
              role="listitem"
            >
              <span aria-hidden="true">{index + 1}</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="public-property-details__media-note">{copy.mediaUnavailable}</p>
      )}
    </section>
  );
}

function PropertyFactIcon({ kind }: { readonly kind: 'area' | 'bedrooms' | 'bathrooms' | 'floor' | 'delivery' | 'finishing' }) {
  const icon = (() => {
    switch (kind) {
      case 'area':
        return <><path d="M5 15 15 5" /><path d="M8 5h7v7M5 8V5h3M12 15H5v-7" /></>;
      case 'bedrooms':
        return <><path d="M3 14V7M3 11h14M7 9V7h4a2 2 0 0 1 2 2M3 14h14M5 14v2M15 14v2" /></>;
      case 'bathrooms':
        return <><path d="M3 10h14M4 10V6a2 2 0 0 1 4 0v1M4 13a7 7 0 0 0 12 0M6 15v1M14 15v1" /></>;
      case 'floor':
        return <><path d="m3 7 7-4 7 4-7 4-7-4Z" /><path d="m3 10 7 4 7-4M3 13l7 4 7-4" /></>;
      case 'delivery':
        return <><circle cx="10" cy="10" r="7" /><path d="m6.5 10 2.2 2.2 4.8-5.2" /></>;
      case 'finishing':
        return <><path d="m3 9 7-6 7 6v7H3Z" /><path d="M8 16v-4h4v4M6 9h.01M14 9h.01" /></>;
    }
  })();
  return <span className={`public-property-details__fact-icon public-property-details__fact-icon--${kind}`} aria-hidden="true"><svg viewBox="0 0 20 20" focusable="false" aria-hidden="true">{icon}</svg></span>;
}

type DetailLineIconKind = 'calendar' | 'back' | 'location' | 'paper-plane' | 'whatsapp' | 'feature' | 'service' | 'advisory' | 'eye' | 'area' | 'bedrooms' | 'bathrooms';

function DetailLineIcon({ kind, index }: { readonly kind: DetailLineIconKind; readonly index?: number }) {
  const icon = kind === 'calendar'
    ? <><rect x="3" y="4" width="14" height="12" rx="2" /><path d="M6 2v4M14 2v4M3 8h14M6 11h.01M10 11h.01M14 11h.01M6 14h.01M10 14h.01" /></>
    : kind === 'back'
      ? <path d="m12.5 4.5-5.5 5.5 5.5 5.5" />
    : kind === 'advisory'
      ? <><path d="m10 2 6 2v5c0 4-2.5 7-6 9-3.5-2-6-5-6-9V4Z" /><path d="m7 10 2 2 4-4" /></>
      : kind === 'location'
      ? <><path d="M10 17s5-4.2 5-8.4a5 5 0 0 0-10 0C5 12.8 10 17 10 17Z" /><circle cx="10" cy="8.5" r="1.5" /></>
      : kind === 'paper-plane'
        ? <><path d="m3 9 13-5-5 13-2-6-6-2Z" /><path d="m9 11 4-4" /></>
        : kind === 'whatsapp'
          ? <><path d="M5.2 14.7A6.2 6.2 0 1 1 8 16l-3 1 .8-2.3Z" /><path d="M7.5 7.4c.3 1.8 1.3 3 3.1 3.7.7.3 1.3.1 1.7-.4l.4-.5" /></>
      : kind === 'eye'
        ? <><path d="M2 10s3-5 8-5 8 5 8 5-3 5-8 5-8-5-8-5Z" /><circle cx="10" cy="10" r="2.5" /></>
        : kind === 'area'
          ? <><path d="M7 3H3v4M13 17h4v-4M3 7l5-5M17 13l-5 5" /></>
          : kind === 'bedrooms'
            ? <><path d="M3 14V7M3 11h14M7 9V7h4a2 2 0 0 1 2 2M3 14h14M5 14v2M15 14v2" /></>
            : kind === 'bathrooms'
              ? <><path d="M3 10h14M4 10V6a2 2 0 0 1 4 0v1M4 13a7 7 0 0 0 12 0M6 15v1M14 15v1" /></>
              : kind === 'feature'
                ? index === 0
                  ? <><path d="M10 17s5-4.2 5-8.4a5 5 0 0 0-10 0C5 12.8 10 17 10 17Z" /><circle cx="10" cy="8.5" r="1.5" /></>
                  : index === 1
                    ? <><path d="M3 10h14M11 6l4 4-4 4" /></>
                    : index === 2
                      ? <><path d="m3 9 7-6 7 6v7H3Z" /><path d="M8 16v-4h4v4" /></>
                      : index === 3
                        ? <><path d="m11 2-7 9h5l-1 7 7-9h-5l1-7Z" /></>
                        : index === 4
                          ? <><path d="m5 14 7-7 3 3-7 7H5Z" /><path d="m11 6 2-2 3 3-2 2M4 17h4" /></>
                          : index === 5
                            ? <path d="m6 10 3 3 5-6" />
                            : index === 6
                              ? <><path d="M5 4h9l2 2-7 10-5-4Z" /><circle cx="11.5" cy="7" r="1" /></>
                              : index === 7
                                ? <><path d="M4 15 8 11l3 2 5-6" /><path d="M12 7h4v4" /></>
                                : index === 8
                                  ? <><path d="M10 17c-4-2-5-6-2-10 3 1 5 4 2 10Z" /><path d="M10 17c1-4 3-6 6-7" /></>
                                  : index === 9
                                    ? <><path d="m4 12 1-4h10l1 4v4H4Z" /><circle cx="6.5" cy="16" r="1" /><circle cx="13.5" cy="16" r="1" /></>
                                    : index === 10
                                      ? <><path d="M5 3h10v14H5Z" /><path d="M8 7h4M8 13h4M10 5v2M10 13v2" /></>
                                      : index === 11
                                        ? <><path d="M10 17c-4-2-5-6-2-10 3 1 5 4 2 10Z" /><path d="M10 17c2-3 4-4 6-4" /></>
                                        : index === 12
                                          ? <><circle cx="10" cy="10" r="3" /><path d="M10 2v3M10 15v3M2 10h3M15 10h3M4.3 4.3l2.1 2.1M13.6 13.6l2.1 2.1M15.7 4.3l-2.1 2.1M6.4 13.6l-2.1 2.1" /></>
                                          : index === 13
                                            ? <path d="m10 2 6 2v5c0 4-2.5 7-6 9-3.5-2-6-5-6-9V4Z" />
                                            : <><circle cx="10" cy="10" r="6.5" /><path d="m7 10 2 2 4-4" /></>
            : kind === 'service'
              ? index === 0
                ? <><path d="M3 5h6a2 2 0 0 1 2 2v8a2 2 0 0 0-2-2H3Z" /><path d="M17 5h-6a2 2 0 0 0-2 2v8a2 2 0 0 1 2-2h6Z" /></>
                : index === 1
                  ? <><path d="M3 8h14l-1-4H4L3 8Z" /><path d="M4 8v8h12V8M7 11h2v5" /></>
                  : index === 2
                    ? <><path d="M3 5h14v11H3Z" /><path d="M8 8h4M10 6v4M7 13c1-1 2-1 3 0s2 1 3 0" /></>
                    : index === 3
                      ? <><path d="M3 10h14M11 6l4 4-4 4" /></>
                      : index === 4
                        ? <><path d="M4 14V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8M4 10h12M6 15v2M14 15v2M6 7h.01M14 7h.01" /></>
                        : <><path d="M4 16v-5a6 6 0 0 1 12 0v5M3 16h14M7 16v-4h6v4M8 8h4" /></>
              : null;
  return <svg className="public-property-details__line-icon" viewBox="0 0 20 20" focusable="false" aria-hidden="true">{icon}</svg>;
}

function detailsPrice(value: PublicPropertyDetailsData['price'], locale: SupportedLocale): string | undefined {
  if (value === undefined) return undefined;
  if (value.amount >= 1_000_000) {
    const millions = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value.amount / 1_000_000);
    if (locale === 'ar') return `${millions} مليون جنيه`;
    if (locale === 'zh-CN') return `${millions} 百万埃镑`;
    return `EGP ${millions}M`;
  }
  return formatMoney(value, locale);
}

function detailsRelatedPrice(value: PublicPropertyDetailsData['price'], transactionType: PublicPropertyDetailsData['transactionType'], locale: SupportedLocale): string | undefined {
  if (value === undefined) return undefined;
  if (transactionType === 'rent' && locale === 'ar') return `${new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 0 }).format(value.amount)} جنيه / شهر`;
  if (transactionType === 'rent' && locale === 'en') return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value.amount)} EGP / month`;
  if (transactionType === 'rent' && locale === 'zh-CN') return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value.amount)} EGP / 月`;
  return detailsPrice(value, locale);
}

function PropertySummary({
  data,
  locale,
  copy
}: {
  readonly data: PublicPropertyDetailsData;
  readonly locale: SupportedLocale;
  readonly copy: PublicPropertyDetailsCopy;
}) {
  const title = localizedText(data.name, locale) ?? data.slug;
  const summaryLabels = locale === 'ar'
    ? { location: 'الحي الأول', delivery: 'الاستلام', finishing: 'التشطيب', ready: 'جاهز للتسليم' }
    : locale === 'zh-CN'
      ? { location: '第一街区', delivery: '交付', finishing: '装修', ready: '可立即入住' }
      : { location: 'First District', delivery: 'Delivery', finishing: 'Finishing', ready: 'Ready to move' };
  const finishing = data.features.find(item => item.groupKey === 'finishing' || item.slug.includes('finish'));
  const mapUrl = safeMapUrl(data.mapUrl);
  const facts = [
    ...(data.area === undefined ? [] : [{ kind: 'area' as const, label: copy.area, value: formatArea(data.area, locale, copy.sqm) ?? '—' }]),
    ...(data.layout?.bedrooms === undefined ? [] : [{ kind: 'bedrooms' as const, label: copy.bedrooms, value: String(data.layout.bedrooms) }]),
    ...(data.layout?.bathrooms === undefined ? [] : [{ kind: 'bathrooms' as const, label: copy.bathrooms, value: String(data.layout.bathrooms) }]),
    ...(data.layout?.floor === undefined ? [] : [{ kind: 'floor' as const, label: copy.floor, value: String(data.layout.floor) }]),
    ...(data.deliveryStatus === undefined ? [] : [{ kind: 'delivery' as const, label: summaryLabels.delivery, value: data.deliveryStatus === 'ready_to_move' ? summaryLabels.ready : data.deliveryStatus }]),
    ...(finishing === undefined ? [] : [{ kind: 'finishing' as const, label: summaryLabels.finishing, value: localizedText(finishing.detail, locale) ?? localizedText(finishing.name, locale) ?? finishing.slug }])
  ];

  return (
    <section className="public-property-details__card public-property-details__summary" aria-labelledby="public-property-details-title">
      <div className="public-property-details__summary-headline">
        <div className="public-property-details__summary-identity">
          <p className="public-property-details__location"><span className="public-property-details__inline-icon public-property-details__inline-icon--location" aria-hidden="true"><DetailLineIcon kind="location" /></span>{localizedText(data.locationName, locale) ?? summaryLabels.location}</p>
          <h1 id="public-property-details-title">{title}</h1>
          <p className="public-property-details__code">{copy.code}: {data.publicCode ?? data.slug}</p>
        </div>
        {data.price === undefined ? null : <p className="public-property-details__price">{detailsPrice(data.price, locale)}</p>}
      </div>
      {facts.length === 0 ? null : <dl className="public-property-details__facts">{facts.map(fact => <div key={fact.label}><PropertyFactIcon kind={fact.kind} /><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl>}
      {mapUrl ? <a className="public-property-details__map-link" href={mapUrl} target="_blank" rel="noopener noreferrer" data-action="open-map"><DetailLineIcon kind="location" />{copy.openMap}</a> : null}
    </section>
  );
}

function SourceAndProject({
  data,
  locale,
  copy
}: {
  readonly data: PublicPropertyDetailsData;
  readonly locale: SupportedLocale;
  readonly copy: PublicPropertyDetailsCopy;
}) {
  const sourceName = localizedText(data.source.name, locale) ?? copy.sourceTitle;
  const projectName = localizedText(data.project?.name, locale);
  const sourceType = copy.sourceTypes[data.source.sourceType];
  const sourceDescriptorParts = locale === 'ar'
    ? [projectName === undefined ? undefined : `مشروع: ${projectName}`, sourceType].filter((value): value is string => value !== undefined)
    : [projectName, sourceType].filter((value): value is string => value !== undefined);
  return (
    <section className="public-property-details__card public-property-details__source-card" aria-labelledby="public-property-details-source-title">
      <div className="public-property-details__source-identity">
        {data.source.imageUrl ? <img src={data.source.imageUrl} alt="" width="48" height="48" loading="lazy" decoding="async" /> : null}
        <div>
          <p className="public-property-details__eyebrow">{locale === 'ar' ? 'مقدم هذا العقار' : locale === 'zh-CN' ? '房产提供方' : 'Property provider'}</p>
          <h2 id="public-property-details-source-title">{sourceName}</h2>
          <p>
            {sourceDescriptorParts.map((part, index) => (
              <span key={`${part}-${index}`}>
                {index === 0 ? null : <span aria-hidden="true"> · </span>}
                <span>{part}</span>
              </span>
            ))}
          </p>
        </div>
        {data.source.verified ? <span className="public-property-details__verified">{locale === 'ar' ? 'موثق' : locale === 'zh-CN' ? '已验证' : 'Verified'}</span> : null}
      </div>
      <a className="public-property-details__profile-link" href={data.source.organizationId ? `/developers/${data.source.organizationId}` : '/developers'}>{locale === 'ar' ? 'عرض ملف المطور' : locale === 'zh-CN' ? '查看开发商资料' : 'View developer profile'}</a>
    </section>
  );
}

function Description({
  data,
  locale,
  copy
}: {
  readonly data: PublicPropertyDetailsData;
  readonly locale: SupportedLocale;
  readonly copy: PublicPropertyDetailsCopy;
}) {
  const description = localizedText(data.description, locale);
  return (
    <section className="public-property-details__card public-property-details__description" aria-labelledby="public-property-details-description-title">
      <h2 id="public-property-details-description-title">{copy.descriptionTitle}</h2>
      {description === undefined ? <p>{copy.noDescription}</p> : <p data-text-wrap="safe">{description}</p>}
    </section>
  );
}

function Amenities({ data, locale }: { readonly data: PublicPropertyDetailsData; readonly locale: SupportedLocale }) {
  const labels = locale === 'ar'
    ? { features: 'المميزات', services: 'الموقع والخدمات المحيطة' }
    : locale === 'zh-CN'
      ? { features: '房产特色', services: '附近服务' }
      : { features: 'Features', services: 'Nearby services' };
  const nearbyNote = locale === 'ar'
    ? '\u0627\u0644\u0645\u0633\u0627\u0641\u0627\u062a \u0648\u0627\u0644\u0623\u0648\u0642\u0627\u062a \u062a\u0642\u0631\u064a\u0628\u064a\u0629 \u0648\u0642\u062f \u062a\u062e\u062a\u0644\u0641 \u062d\u0633\u0628 \u0627\u0644\u0637\u0631\u064a\u0642 \u0648\u062d\u0627\u0644\u0629 \u0627\u0644\u0645\u0631\u0648\u0631.'
    : 'Distances and travel times are estimates and may vary by route.';
  return (
    <>
      {data.features.length === 0 ? null : <section className="public-property-details__card public-property-details__amenities" aria-labelledby="public-property-details-features-title">
        <h2 id="public-property-details-features-title">{locale === 'ar' ? '\u0645\u0645\u064a\u0632\u0627\u062a \u0627\u0644\u0639\u0642\u0627\u0631' : labels.features}</h2>
        <ul>{data.features.map((item, index) => <li key={item.id}><span aria-hidden="true"><DetailLineIcon kind="feature" index={index} /></span>{localizedText(item.name, locale) ?? item.slug}</li>)}</ul>
      </section>}
      {data.services.length === 0 ? null : <section className="public-property-details__card public-property-details__nearby" aria-labelledby="public-property-details-services-title">
        <h2 id="public-property-details-services-title">{labels.services}</h2>
        <div>{data.services.map((item, index) => <article key={item.id}><span aria-hidden="true"><DetailLineIcon kind="service" index={index} /></span><p><strong>{localizedText(item.name, locale) ?? item.slug}</strong>{localizedText(item.detail, locale) ? <small>{localizedText(item.detail, locale)}</small> : null}</p>{localizedText(item.distanceLabel, locale) ? <b>{localizedText(item.distanceLabel, locale)}</b> : null}</article>)}</div>
        <p className="public-property-details__nearby-note"><span aria-hidden="true">ⓘ</span>{nearbyNote}</p>
      </section>}
    </>
  );
}

function LocationAdvisory({ locale }: { readonly locale: SupportedLocale }) {
  const text = locale === 'ar'
    ? { eyebrow: 'ميزة موقع السادات', title: 'نصيحة عقارات السادات', body: 'قرب الوحدة من المدارس والسوق التجاري يجعلها مناسبة للسكن العائلي، كما يعزز من سهولة الوصول إلى الخدمات اليومية. أنصح بمعاينة العقار والمنطقة في أوقات مختلفة قبل اتخاذ قرار الشراء.' }
    : locale === 'zh-CN'
      ? { eyebrow: '位置优势', title: '萨达特房地产建议', body: '靠近学校和商业市场，适合家庭居住。建议在购买前于不同时段实地考察。' }
      : { eyebrow: 'Location advantage', title: 'Sadat Real Estate advice', body: 'Nearby schools and retail make this suitable for family living. Visit the property and area at different times before purchasing.' };
  return <section className="public-property-details__advisory"><header><span aria-hidden="true"><DetailLineIcon kind="advisory" /></span><div><small>{text.eyebrow}</small><strong>{text.title}</strong></div></header><p>{text.body}</p></section>;
}

function RelatedProperties({
  properties,
  locale,
  copy
}: {
  readonly properties: PublicPropertyDetailsData['relatedProperties'];
  readonly locale: SupportedLocale;
  readonly copy: PublicPropertyDetailsCopy;
}) {
  if (properties.length === 0) return null;
  return (
    <section className="public-property-details__related" aria-labelledby="public-property-details-related-title">
      <h2 id="public-property-details-related-title">{copy.relatedTitle}</h2>
      <div className="public-property-details__related-grid">
        {properties.map(property => {
          const relatedTitle = localizedText(property.name, locale) ?? property.slug;
          const relatedFeatures = [
            ...(property.viewCount === undefined ? [] : [{ label: locale === 'ar' ? '\u0627\u0644\u0645\u0634\u0627\u0647\u062f\u0627\u062a' : locale === 'zh-CN' ? '\u6d4f\u89c8\u91cf' : 'Views', value: <span className="public-property-details__related-feature-value"><DetailLineIcon kind="eye" />{property.viewCount.toLocaleString(locale)}</span> }]),
            ...(property.layout?.bathrooms === undefined ? [] : [{ label: copy.bathrooms, value: <span className="public-property-details__related-feature-value"><DetailLineIcon kind="bathrooms" />{String(property.layout.bathrooms)}</span> }]),
            ...(property.layout?.bedrooms === undefined ? [] : [{ label: copy.bedrooms, value: <span className="public-property-details__related-feature-value"><DetailLineIcon kind="bedrooms" />{String(property.layout.bedrooms)}</span> }]),
            ...(property.area === undefined ? [] : [{ label: copy.area, value: <span className="public-property-details__related-feature-value"><DetailLineIcon kind="area" />{formatArea(property.area, locale, copy.sqm) ?? '—'}</span> }])
          ];
          const sourceName = localizedText(property.sourceName, locale);
          const relatedLocation = localizedText(property.locationName, locale);
          return (
            <PropertyCard
              key={property.id}
              className="public-property-details__related-card"
              title={relatedTitle}
              href={`/properties/${property.slug}`}
              location={relatedLocation === undefined ? undefined : <span className="public-property-details__related-location"><DetailLineIcon kind="location" />{relatedLocation}</span>}
              price={detailsRelatedPrice(property.price, property.transactionType, locale)}
              features={relatedFeatures}
              source={sourceName === undefined ? undefined : <span className="public-property-details__related-source">{property.sourceImageUrl ? <img src={property.sourceImageUrl} alt="" width="20" height="20" loading="lazy" decoding="async" /> : null}<span>{locale === 'ar' ? '\u0628\u0648\u0627\u0633\u0637\u0629 ' : locale === 'zh-CN' ? '\u7531' : 'By '}{sourceName}</span>{property.sourceVerified || property.sourceType === 'developer_company' ? <b>{locale === 'ar' ? '\u0645\u0648\u062b\u0642' : locale === 'zh-CN' ? '\u5df2\u9a8c\u8bc1' : 'Verified'}</b> : null}</span>}
              mediaOverlay={<><span className={`public-property-details__related-badge public-property-details__related-badge--${property.transactionType}`}>{property.transactionType === 'sale' ? copy.sale : copy.rent}</span>{property.publicCode ? <span className="public-property-details__related-code">{property.publicCode}</span> : null}</>}
              image={<PublicMediaImage src={property.imageUrl} alt={relatedTitle} fallback={<UxStateView state="missing_image" title={copy.imageUnavailable} />} />}
              imageAlt={copy.imageUnavailable}
            />
          );
        })}
      </div>
    </section>
  );
}

type ActionState = 'idle' | 'submitting' | 'success' | 'permission' | 'error';

function ActionFeedback({
  state,
  copy,
  url
}: {
  readonly state: Exclude<ActionState, 'idle' | 'submitting'>;
  readonly copy: PublicPropertyDetailsCopy;
  readonly url?: string | undefined;
}) {
  if (state === 'success') {
    return <UxStateView state="success" title={copy.actionSuccessTitle} message={copy.actionSuccessBody} />;
  }
  if (state === 'permission') {
    return <UxStateView state="permission" title={copy.actionPermissionTitle} message={copy.actionPermissionBody}><a href={loginUrl(url)}>{copy.actionPermissionLink}</a></UxStateView>;
  }
  return <UxStateView state="error" title={copy.actionErrorTitle} message={copy.actionErrorBody}><button type="button">{copy.retryLabel}</button></UxStateView>;
}

function RequestPanel({
  data,
  locale,
  copy,
  url,
  actions
}: {
  readonly data: PublicPropertyDetailsData;
  readonly locale: SupportedLocale;
  readonly copy: PublicPropertyDetailsCopy;
  readonly url?: string | undefined;
  readonly actions: PublicPropertyDetailsActions;
}) {
  const [message, setMessage] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [contactTime, setContactTime] = useState('');
  const [contactValidation, setContactValidation] = useState(false);
  const [contactState, setContactState] = useState<ActionState>('idle');
  const [viewingOpen, setViewingOpen] = useState(false);
  const [requestedAt, setRequestedAt] = useState('');
  const [timezone, setTimezone] = useState('');
  const [note, setNote] = useState('');
  const [viewingValidation, setViewingValidation] = useState(false);
  const [viewingState, setViewingState] = useState<ActionState>('idle');

  const submitContact = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedMessage = message.trim();
    if (trimmedMessage.length === 0) {
      setContactValidation(true);
      return;
    }
    setContactValidation(false);
    setContactState('submitting');
    const input: PublicContactRequestInput = {
      message: trimmedMessage,
      propertyId: data.id,
      ...(data.project?.id === undefined ? {} : { projectId: data.project.id }),
      locale
    };
    try {
      await actions.submitContact(input);
      setContactState('success');
      setMessage('');
    } catch (error) {
      setContactState(error instanceof ApiClientError && (error.status === 401 || error.status === 403) ? 'permission' : 'error');
    }
  };

  const submitViewing = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedDate = new Date(requestedAt);
    if (!requestedAt || !timezone.trim() || Number.isNaN(parsedDate.getTime()) || parsedDate.getTime() <= Date.now()) {
      setViewingValidation(true);
      return;
    }
    setViewingValidation(false);
    setViewingState('submitting');
    try {
      await actions.submitViewing({
        propertyId: data.id,
        requestedAt: parsedDate.toISOString(),
        timezone: timezone.trim(),
        ...(note.trim().length === 0 ? {} : { note: note.trim() })
      });
      setViewingState('success');
      setViewingOpen(false);
      setRequestedAt('');
      setTimezone('');
      setNote('');
    } catch (error) {
      setViewingState(error instanceof ApiClientError && (error.status === 401 || error.status === 403) ? 'permission' : 'error');
    }
  };

  return (
    <aside className="public-property-details__actions" aria-labelledby="public-property-details-contact-title">
      <Button type="button" fullWidth startIcon={<span className="public-property-details__button-icon public-property-details__button-icon--calendar"><DetailLineIcon kind="calendar" /></span>} data-action="request-viewing" onClick={() => { setViewingState('idle'); setViewingOpen(true); }}>{copy.requestViewing}</Button>
      <section className="public-property-details__card public-property-details__contact">
        <h2 id="public-property-details-contact-title">{copy.contactTitle}</h2>
        {contactState === 'success' || contactState === 'permission' || contactState === 'error' ? <ActionFeedback state={contactState} copy={copy} url={url} /> : null}
        <form aria-label={copy.contactTitle} onSubmit={submitContact}>
          <label className="public-property-details__visually-hidden" htmlFor="public-property-contact-name">{locale === 'ar' ? 'الاسم الكامل' : 'Full name'}</label>
          <input id="public-property-contact-name" name="fullName" required value={fullName} placeholder={locale === 'ar' ? 'الاسم الكامل' : 'Full name'} onChange={event => setFullName(event.target.value)} />
          <label className="public-property-details__visually-hidden" htmlFor="public-property-contact-phone">{locale === 'ar' ? 'رقم الهاتف' : 'Phone number'}</label>
          <input id="public-property-contact-phone" name="phone" type="tel" required value={phone} placeholder={locale === 'ar' ? 'رقم الهاتف' : 'Phone number'} onChange={event => setPhone(event.target.value)} />
          <label className="public-property-details__visually-hidden" htmlFor="public-property-contact-time">{locale === 'ar' ? 'وقت التواصل' : 'Contact time'}</label>
          <select id="public-property-contact-time" name="contactTime" required value={contactTime} onChange={event => setContactTime(event.target.value)}><option value="">{locale === 'ar' ? 'وقت التواصل' : 'Contact time'}</option><option value="morning">{locale === 'ar' ? 'صباحاً' : 'Morning'}</option><option value="evening">{locale === 'ar' ? 'مساءً' : 'Evening'}</option></select>
          <label className="public-property-details__visually-hidden" htmlFor="public-property-contact-message">{copy.messageLabel}</label>
          <textarea
            id="public-property-contact-message"
            name="message"
            rows={5}
            required
            value={message}
            placeholder={locale === 'ar' ? 'رسالة إضافية' : copy.messagePlaceholder}
            onChange={event => setMessage(event.target.value)}
          />
          {contactValidation ? <p className="public-property-details__validation" role="alert">{copy.contactValidation}</p> : null}
          <Button type="submit" fullWidth className="public-property-details__contact-submit" startIcon={<span className="public-property-details__button-icon"><DetailLineIcon kind="paper-plane" /></span>} loading={contactState === 'submitting'}>{contactState === 'submitting' ? copy.actionLoading : copy.submitContact}</Button>
        </form>
        <a className="public-property-details__whatsapp" href="/community"><span className="public-property-details__button-icon public-property-details__button-icon--whatsapp" aria-hidden="true"><DetailLineIcon kind="whatsapp" /></span>{locale === 'ar' ? 'واتساب' : locale === 'zh-CN' ? 'WhatsApp' : 'WhatsApp'}</a>
      </section>
      {viewingState === 'success' || viewingState === 'permission' || viewingState === 'error' ? <ActionFeedback state={viewingState} copy={copy} url={url} /> : null}
      <Modal
        open={viewingOpen}
        title={copy.viewingTitle}
        description={copy.viewingBody}
        closeLabel={copy.close}
        onClose={() => setViewingOpen(false)}
        footer={(
          <>
            <Button type="button" variant="ghost" onClick={() => setViewingOpen(false)}>{copy.cancel}</Button>
            <Button type="submit" form="public-property-viewing-form" loading={viewingState === 'submitting'}>{viewingState === 'submitting' ? copy.actionLoading : copy.submitViewing}</Button>
          </>
        )}
      >
        <form id="public-property-viewing-form" className="public-property-details__viewing-form" onSubmit={submitViewing}>
          <label htmlFor="public-property-viewing-requested-at">{copy.requestedAt}</label>
          <input id="public-property-viewing-requested-at" name="requestedAt" type="datetime-local" required value={requestedAt} onChange={event => setRequestedAt(event.target.value)} />
          <label htmlFor="public-property-viewing-timezone">{copy.timezone}</label>
          <input id="public-property-viewing-timezone" name="timezone" type="text" required placeholder={copy.timezonePlaceholder} value={timezone} onChange={event => setTimezone(event.target.value)} />
          <label htmlFor="public-property-viewing-note">{copy.note}</label>
          <textarea id="public-property-viewing-note" name="note" rows={4} placeholder={copy.notePlaceholder} value={note} onChange={event => setNote(event.target.value)} />
          {viewingValidation ? <p className="public-property-details__validation" role="alert">{copy.viewingValidation}</p> : null}
        </form>
      </Modal>
    </aside>
  );
}

function SuccessDetails({
  data,
  locale,
  copy,
  url,
  actions
}: {
  readonly data: PublicPropertyDetailsData;
  readonly locale: SupportedLocale;
  readonly copy: PublicPropertyDetailsCopy;
  readonly url?: string | undefined;
  readonly actions: PublicPropertyDetailsActions;
}) {
  return (
    <>
      <div className="public-property-details__content">
        <a className="public-property-details__back" href="/properties"><DetailLineIcon kind="back" />{copy.backToResults}</a>
        <div className="public-property-details__layout">
          <div className="public-property-details__main-column">
            <Gallery media={data.media} copy={copy} locale={locale} installmentAvailable={data.installmentAvailable} />
            <PropertySummary data={data} locale={locale} copy={copy} />
            <SourceAndProject data={data} locale={locale} copy={copy} />
            <Description data={data} locale={locale} copy={copy} />
            <Amenities data={data} locale={locale} />
            <LocationAdvisory locale={locale} />
            <RelatedProperties properties={data.relatedProperties} locale={locale} copy={copy} />
          </div>
          <RequestPanel data={data} locale={locale} copy={copy} url={url} actions={actions} />
        </div>
      </div>
    </>
  );
}

export function PublicPropertyDetails({
  url,
  locale,
  initialData,
  initialState,
  load = defaultPublicPropertyDetailsLoader,
  actions = defaultPublicPropertyDetailsActions
}: PublicPropertyDetailsProps) {
  const copy = getPublicPropertyDetailsCopy(locale);
  const sourceUrl = url ?? (typeof window === 'undefined' ? '/' : window.location.href);
  const slug = propertyDetailsSlugFromUrl(sourceUrl);
  const initialView: PublicPropertyDetailsViewState = initialData !== undefined ? 'success' : initialState ?? 'loading';
  const [data, setData] = useState<PublicPropertyDetailsData | undefined>(initialData);
  const [view, setView] = useState<PublicPropertyDetailsViewState>(initialView);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (initialData !== undefined && attempt === 0) return;
    if (slug === undefined) {
      setView('not_found');
      return;
    }
    const controller = new AbortController();
    setView('loading');
    void load(slug, controller.signal)
      .then(nextData => {
        if (controller.signal.aborted) return;
        setData(nextData);
        setView('success');
      })
      .catch(error => {
        if (controller.signal.aborted || (error instanceof ApiClientError && error.code === 'ABORTED')) return;
        setView(errorState(error));
      });
    return () => controller.abort();
  }, [attempt, initialData, load, slug]);

  const retry = () => setAttempt(value => value + 1);

  return (
    <div className="public-property-details" data-page="public-property-details" data-details-state={view}>
      <PublicSiteHeader locale={locale} copy={getPublicHomepageCopy(locale)} activePath="/properties" />
      {view === 'success' && data !== undefined ? <SuccessDetails data={data} locale={locale} copy={copy} url={url} actions={actions} /> : view === 'not_found' ? <NotFoundNotice copy={copy} /> : <StateNotice state={view === 'success' ? 'empty' : view} copy={copy} url={url} onRetry={retry} />}
      <Footer locale={locale} />
    </div>
  );
}
