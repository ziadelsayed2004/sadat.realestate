import { useEffect, useState, type ReactNode } from 'react';
import type {
  PublicHomepageBanner,
  PublicHomepageCategory,
  PublicHomepageContent,
  PublicHomepageData,
  PublicHomepageMetric,
  PublicHomepageProperty,
  PublicHomepageSection,
  SupportedLocale
} from '@sadat-real-estate/contracts';
import { ApiClientError } from '../contracts/index.ts';
import { CustomSelect, PropertyCard } from '../design_system/index.ts';
import { LOCALE_CHANGE_EVENT, LocaleSwitcher } from '../localization/index.ts';
import { UxStateView, type UxState } from '../ux_states/index.ts';
import { getPublicHomepageCopy, type PublicHomepageCopy } from './copy.ts';
import { defaultPublicHomepageLoader, type PublicHomepageLoader } from './data.ts';
import { getWhatsAppLink } from '../frontend_foundation/config.ts';
import {
  formatMoney,
  isHomepageEmpty,
  localizedText,
  ordered,
  propertyFeatures
} from './model.ts';
import './styles.css';

export type PublicHomepageViewState = Extract<UxState, 'loading' | 'empty' | 'error' | 'retry' | 'success' | 'permission'>;

export interface PublicHomepageProps {
  readonly locale: SupportedLocale;
  readonly initialData?: PublicHomepageData | undefined;
  readonly initialState?: 'loading' | 'retry' | undefined;
  readonly load?: PublicHomepageLoader | undefined;
}

function safePublicUrl(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  try {
    const url = new URL(value, 'http://sadat-real-estate.local');
    return url.protocol === 'http:' || url.protocol === 'https:' || value.startsWith('/')
      ? value
      : undefined;
  } catch {
    return undefined;
  }
}

export function PublicCategoryGlyph({ slug }: { readonly slug: string }) {
  const normalizedSlug = slug.toLowerCase();
  const icon = normalizedSlug.includes('land') || normalizedSlug.includes('roof')
    ? <><path d="M3 15 8 9l3 3 3-4 3 7" /><path d="M3 17h14" /></>
    : normalizedSlug.includes('shop') || normalizedSlug.includes('showroom') || normalizedSlug.includes('commercial')
      ? <><path d="M4 8h12l-1-4H5L4 8Z" /><path d="M5 8v8h10V8M8 11h2v5" /></>
      : normalizedSlug.includes('office') || normalizedSlug.includes('room')
        ? <><path d="M4 3h12v14H4Z" /><path d="M7 7h2M11 7h2M7 11h2M11 11h2M8 17v-3h4v3" /></>
        : normalizedSlug.includes('warehouse') || normalizedSlug.includes('factory')
          ? <><path d="m3 8 7-5 7 5v9H3Z" /><path d="M6 17v-5h3v5M12 12h2v2h-2M12 8h2v2h-2" /></>
          : normalizedSlug.includes('villa') || normalizedSlug.includes('house') || normalizedSlug.includes('duplex')
            ? <><path d="m3 9 7-6 7 6v8H3Z" /><path d="M8 17v-4h4v4M6 9h.01M14 9h.01" /></>
            : <><path d="m3 9 7-6 7 6v8H3Z" /><path d="M6 12h2M12 12h2M8 17v-4h4v4" /></>;

  return (
    <span className="public-category-glyph" data-category-glyph={slug} aria-hidden="true">
      <svg viewBox="0 0 20 20" focusable="false">{icon}</svg>
    </span>
  );
}

const publicCategoryAssets: Readonly<Record<string, string>> = Object.freeze({
  duplex: '/assets/canonical/public/category-duplex.png',
  'full-commercial-building': '/assets/canonical/public/category-full-commercial-building.png',
  'restaurants-cafes': '/assets/canonical/public/category-restaurants-cafes.png',
  roof: '/assets/canonical/public/category-roof.png',
  room: '/assets/canonical/public/category-room.png',
  showrooms: '/assets/canonical/public/category-showrooms.png',
  villa: '/assets/canonical/public/category-villa.png'
});

type PublicHomepageLocaleText = Readonly<Record<SupportedLocale, string>>;

const articlePresentation: Readonly<Record<string, {
  readonly label: PublicHomepageLocaleText;
  readonly duration: PublicHomepageLocaleText;
  readonly author: PublicHomepageLocaleText;
}>> = Object.freeze({
  buying_guide: {
    label: { ar: '\u0646\u0635\u0627\u0626\u062d \u0634\u0631\u0627\u0621', en: 'Buying tips',},
    duration: { ar: '8 \u062f\u0642\u0627\u0626\u0642', en: '8 min read',},
    author: { ar: '\u0623\u062d\u0645\u062f \u0645\u062d\u0645\u0648\u062f', en: 'Ahmed Mahmoud',}
  },
  market_news: {
    label: { ar: '\u0627\u0633\u062a\u062b\u0645\u0627\u0631', en: 'Investment',},
    duration: { ar: '6 \u062f\u0642\u0627\u0626\u0642', en: '6 min read',},
    author: { ar: '\u0633\u0627\u0631\u0629 \u0623\u062d\u0645\u062f', en: 'Sarah Ahmed',}
  },
  city_services: {
    label: { ar: '\u062e\u062f\u0645\u0627\u062a', en: 'Services',},
    duration: { ar: '5 \u062f\u0642\u0627\u0626\u0642', en: '5 min read',},
    author: { ar: '\u0645\u062d\u0645\u062f \u0639\u0644\u064a', en: 'Mohamed Ali',}
  }
});

const communityPresentation: Readonly<Record<string, {
  readonly time: PublicHomepageLocaleText;
  readonly comments: string;
  readonly views: string;
}>> = Object.freeze({
  community_events: {
    time: { ar: '\u0645\u0646\u0630 \u064a\u0648\u0645\u064a\u0646', en: '2 days ago',},
    comments: '12',
    views: '24'
  },
  community_update: {
    time: { ar: '\u0645\u0646\u0630 3 \u0623\u064a\u0627\u0645', en: '3 days ago',},
    comments: '34',
    views: '87'
  }
});

const bannerPresentation: Readonly<Record<string, {
  readonly provider: PublicHomepageLocaleText;
  readonly installment: PublicHomepageLocaleText;
  readonly providerImage: string;
}>> = Object.freeze({
  city_banner: {
    provider: { ar: '\u0634\u0631\u0643\u0629 \u0627\u0644\u0633\u0627\u062f\u0627\u062a \u0644\u0644\u062a\u0637\u0648\u064a\u0631 \u0627\u0644\u0639\u0642\u0627\u0631\u064a', en: 'Sadat Real Estate Development',},
    installment: { ar: '\u0628\u0645\u0642\u062f\u0645 10% \u0641\u0642\u0637 \u00b7 \u0623\u0642\u0633\u0627\u0637 \u062a\u0635\u0644 \u0625\u0644\u0649 10 \u0633\u0646\u0648\u0627\u062a', en: '10% down payment · installments up to 10 years',},
    providerImage: '/assets/canonical/public/developer-sadat.png'
  }
});

export function publicCategoryAsset(slug: string): string | undefined {
  return publicCategoryAssets[slug.trim().toLowerCase()];
}

export function fallbackPropertyImage(slug?: string, kind?: string): string {
  const key = `${slug ?? ''} ${kind ?? ''}`.toLowerCase();
  if (key.includes('duplex')) return '/assets/canonical/public/listing-property-duplex.png';
  if (key.includes('rent')) return '/assets/canonical/public/listing-property-rental.png';
  if (key.includes('villa')) return '/assets/canonical/public/listing-property-villa.png';
  if (key.includes('office')) return '/assets/canonical/public/listing-property-office.png';
  if (key.includes('land')) return '/assets/canonical/public/listing-property-land.png';
  return '/assets/canonical/public/listing-property-home.png';
}

function errorState(error: unknown): PublicHomepageViewState {
  if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) {
    return 'permission';
  }
  if (error instanceof ApiClientError && error.code === 'NETWORK_ERROR') return 'retry';
  return 'error';
}

function stateCopy(state: PublicHomepageViewState, copy: PublicHomepageCopy): { readonly title: string; readonly body: string } {
  switch (state) {
    case 'loading':
      return { title: copy.loadingTitle, body: copy.loadingBody };
    case 'empty':
      return { title: copy.emptyTitle, body: copy.emptyBody };
    case 'error':
      return { title: copy.errorTitle, body: copy.errorBody };
    case 'retry':
      return { title: copy.retryTitle, body: copy.retryBody };
    case 'permission':
      return { title: copy.permissionTitle, body: copy.permissionBody };
    case 'success':
      return { title: copy.featuredProperties, body: copy.heroFallbackBody };
  }
}

export function PublicSiteHeader({
  locale,
  copy,
  activePath = '/'
}: {
  readonly locale: SupportedLocale;
  readonly copy: PublicHomepageCopy;
  readonly activePath?: string;
}) {
  const nav = locale === 'ar'
    ? { ...copy.nav, community: '\u0627\u0644\u0643\u0648\u0645\u064a\u0648\u0646\u062a\u064a', about: '\u0645\u0646 \u0646\u062d\u0646', team: '\u0641\u0631\u064a\u0642 \u0627\u0644\u0639\u0645\u0644' }
    : copy.nav;
  const links: ReadonlyArray<readonly [string, string]> = [
    ['/', nav.home],
    ['/properties', nav.properties],
    ['/developers', nav.developers],
    ['/articles', nav.articles],
    ['/community', nav.community],
    ['/about', nav.about],
    ['/team', nav.team]
  ];

  return (
    <header className="public-homepage__header">
      <a className="public-homepage__brand" href="/" aria-label={copy.brand}>
        <img src="/assets/sadat-real-estate-logo.png" alt={copy.brand} width={636} height={557} decoding="async" loading="eager" />
      </a>
      <nav className="public-homepage__nav" aria-label={nav.home}>
        {links.map(([href, label]) => <a key={href} href={href} aria-current={href === activePath ? 'page' : undefined}>{label}</a>)}
      </nav>
      <div className="public-homepage__actions">
        <LocaleSwitcher locale={locale} label={copy.localeLabel} />
        <a className="public-homepage__login" href="/auth/login">{copy.login}</a>
        <a className="public-homepage__signup" href="/auth/register">{copy.createAccount}</a>
      </div>
    </header>
  );
}

export function PublicMediaImage({
  src,
  alt,
  fallback,
  className,
  loading = 'lazy'
}: {
  readonly src?: string | undefined;
  readonly alt: string;
  readonly fallback: ReactNode;
  readonly className?: string | undefined;
  readonly loading?: 'eager' | 'lazy';
}) {
  const [failed, setFailed] = useState(false);
  const imageUrl = safePublicUrl(src);
  if (imageUrl === undefined || failed) return <>{fallback}</>;
  return <img className={className} src={imageUrl} alt={alt} decoding="async" loading={loading} onError={() => setFailed(true)} />;
}

export function PublicSiteFooter({ locale, description }: { readonly locale: SupportedLocale; readonly description?: string | undefined }) {
  const copy = getPublicHomepageCopy(locale);
  // The approved public design uses one platform-level footer description on every
  // public route. Keep the prop for existing callers, but do not let a
  // feature-specific description change the shared visual/content contract.
  const footerDescription = description === copy.footerDescription ? description : copy.footerDescription;
  const labels = locale === 'ar'
    ? { explore: 'الصفحات', company: 'الشركة', contact: 'تواصل معنا', follow: 'تابع عقارات السادات', followBody: 'ابقَ على اطلاع بأحدث العروض والأخبار', legal: 'سياسة الخصوصية · الشروط والأحكام', copyright: '© 2026 منصة عقارات السادات — جميع الحقوق محفوظة', phone: '01001234567', whatsapp: 'واتساب متاح 24/7', address: 'مدينة السادات، مصر' }
    : { explore: 'Pages', company: 'Company', contact: 'Contact us', follow: 'Follow Sadat Real Estate', followBody: 'Stay informed about the latest listings and news', legal: 'Privacy policy · Terms and conditions', copyright: '© 2026 Sadat Real Estate — All rights reserved', phone: '01001234567', whatsapp: 'WhatsApp available 24/7', address: 'Sadat City, Egypt' };
  const nav = locale === 'ar'
    ? { ...copy.nav, community: '\u0627\u0644\u0643\u0648\u0645\u064a\u0648\u0646\u062a\u064a', about: '\u0645\u0646 \u0646\u062d\u0646', team: '\u0641\u0631\u064a\u0642 \u0627\u0644\u0639\u0645\u0644' }
    : copy.nav;
  return (
    <footer className="public-homepage__footer public-site-footer">
      <div className="public-site-footer__brand">
        <img className="public-site-footer__logo" src="/assets/sadat-real-estate-logo.png" alt="" width={636} height={557} decoding="async" loading="lazy" />
        <p>{footerDescription}</p>
      </div>
      <div>
        <p className="public-homepage__footer-title">{labels.explore}</p>
        <div className="public-homepage__footer-links">
          <a href="/properties">{nav.properties}</a>
          <a href="/developers">{nav.developers}</a>
          <a href="/articles">{nav.articles}</a>
          <a href="/community">{nav.community}</a>
        </div>
      </div>
      <div>
        <p className="public-homepage__footer-title">{labels.company}</p>
        <div className="public-homepage__footer-links">
          <a href="/about">{nav.about}</a>
          <a href="/team">{nav.team}</a>
        </div>
      </div>
      <div>
        <p className="public-homepage__footer-title">{labels.contact}</p>
        <div className="public-homepage__footer-links">
          <a href={`tel:${labels.phone}`}>{labels.phone}</a>
          <a href={getWhatsAppLink()} target="_blank" rel="noopener noreferrer">{labels.whatsapp}</a>
          <span>{labels.address}</span>
        </div>
      </div>
      <div className="public-site-footer__follow">
        <div><strong>{labels.follow}</strong><span>{labels.followBody}</span></div>
        <div className="public-site-footer__social" aria-label="social links">
          <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 8h3V4h-3c-3.31 0-5 1.69-5 5v3H6v4h3v4h4v-4h3l1-4h-4V9c0-.67.33-1 1-1Z" /></svg></a>
          <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4" /><circle cx="12" cy="12" r="3.5" /><circle cx="17.25" cy="6.75" r=".75" fill="currentColor" stroke="none" /></svg></a>
          <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" aria-label="YouTube"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="18" height="12" rx="3" /><path d="m10 9 5 3-5 3Z" fill="currentColor" stroke="none" /></svg></a>
          <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" aria-label="TikTok"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4v10.2a3.8 3.8 0 1 1-3-3.7V14a1.8 1.8 0 1 0 1 1.7V4h3c.3 1.7 1.3 2.8 3 3.2v3c-1.1-.1-2.1-.5-3-1.1V14a4.8 4.8 0 1 1-5-4.8V4Z" fill="currentColor" stroke="none" /></svg></a>
          <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8.5V18H3V8.5h3ZM4.5 3A1.75 1.75 0 1 1 4.5 6.5 1.75 1.75 0 0 1 4.5 3ZM8 8.5h2.9v1.3h.1c.4-.8 1.4-1.7 3-1.7 3.2 0 3.8 2.1 3.8 4.9V18h-3v-4.4c0-1.1 0-2.6-1.6-2.6s-1.9 1.2-1.9 2.5V18H8V8.5Z" fill="currentColor" stroke="none" /></svg></a>
          <a href={getWhatsAppLink()} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5a8.5 8.5 0 0 0-7.3 12.9L3.5 20.5l4.2-1.1A8.5 8.5 0 1 0 12 3.5Z" /><path d="M9.2 8.7c.2-.3.4-.3.7-.3h.5c.2 0 .4.1.5.4l.7 1.6c.1.2.1.4-.1.6l-.5.6c.5 1 1.3 1.7 2.4 2.2l.7-.7c.2-.2.4-.2.7-.1l1.5.7c.3.1.4.3.3.6-.2.8-.8 1.3-1.6 1.4-1.2.1-3-.8-4.4-2.1-1.3-1.2-2.3-2.8-2.2-4.1 0-.3.2-.6.5-.8Z" fill="currentColor" stroke="none" /></svg></a>
        </div>
      </div>
      <div className="public-site-footer__bottom">
        <span>{labels.copyright}</span>
        <span>{labels.legal}</span>
      </div>
    </footer>
  );
}

function BannerMedia({
  banner,
  copy,
  locale,
  className,
  priority = false
}: {
  readonly banner: PublicHomepageBanner | undefined;
  readonly copy: PublicHomepageCopy;
  readonly locale: SupportedLocale;
  readonly className?: string | undefined;
  readonly priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const fallbackHero = '/assets/canonical/public/home-hero-sadat-city.png';
  const rawUrl = banner?.imageUrl || fallbackHero;
  const imageUrl = safePublicUrl(rawUrl);
  const imageAlt = localizedText(banner?.title, locale) ?? copy.brand;

  if (imageUrl === undefined || failed) {
    return (
      <img
        className={'public-homepage__hero-image' + (className === undefined ? '' : ' ' + className)}
        src={fallbackHero}
        alt={imageAlt}
        decoding="async"
        loading={priority ? 'eager' : 'lazy'}
      />
    );
  }

  return (
    <img
      className={'public-homepage__hero-image' + (className === undefined ? '' : ' ' + className)}
      src={imageUrl}
      alt={imageAlt}
      decoding="async"
      loading={priority ? 'eager' : 'lazy'}
      onError={() => setFailed(true)}
    />
  );
}

function SearchPanel({ copy, locale, categories }: { readonly copy: PublicHomepageCopy; readonly locale: SupportedLocale; readonly categories: readonly PublicHomepageCategory[] }) {
  const [transactionType, setTransactionType] = useState<'sale' | 'rent'>('sale');
  const [propertyType, setPropertyType] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const labels = locale === 'ar'
    ? { type: 'نوع العقار', district: 'المنطقة', price: 'السعر', any: 'الكل' }
    : { type: 'Property type', district: 'District', price: 'Price', any: 'Any' };
  const searchActionLabel = locale === 'ar' ? '\u0627\u0628\u062d\u062b \u0627\u0644\u0622\u0646' : copy.searchAction;

  return (
    <form className="public-homepage__search" action="/properties" method="get" aria-label={copy.searchLabel}>
      <div className="public-homepage__search-tabs" role="tablist" aria-label={locale === 'ar' ? '\u0646\u0648\u0639 \u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0629' : 'Transaction type'}>
        <button type="button" role="tab" aria-selected={transactionType === 'sale'} className={transactionType === 'sale' ? 'is-active' : ''} onClick={() => setTransactionType('sale')}>{copy.sale}</button>
        <button type="button" role="tab" aria-selected={transactionType === 'rent'} className={transactionType === 'rent' ? 'is-active' : ''} onClick={() => setTransactionType('rent')}>{copy.rent}</button>
      </div>
      <input type="hidden" name="transactionType" value={transactionType} readOnly />
      <div className="public-homepage__search-row">
        <CustomSelect
          name="propertyTypeId"
          label={labels.type}
          placeholder={labels.type}
          value={propertyType}
          onChange={setPropertyType}
          options={categories.map(category => ({
            value: category.id,
            label: localizedText(category.name, locale) ?? category.slug
          }))}
        />
        <label className="public-homepage__search-control">
          <span>{labels.district}</span>
          <input id="public-homepage-search" name="search" type="search" placeholder={labels.district} aria-label={labels.district} />
        </label>
        <CustomSelect
          name="maxPrice"
          label={labels.price}
          placeholder={labels.price}
          value={maxPrice}
          onChange={setMaxPrice}
          options={[
            { value: '1000000', label: '1,000,000' },
            { value: '3000000', label: '3,000,000' },
            { value: '5000000', label: '5,000,000' },
            { value: '10000000', label: '10,000,000' }
          ]}
        />
        <button type="submit">
          <svg viewBox="0 0 20 20" focusable="false" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" /><path d="m13 13 4 4" /></svg>
          {searchActionLabel}
        </button>
      </div>
    </form>
  );
}

function Hero({
  locale,
  copy,
  sections,
  banners,
  categories
}: {
  readonly locale: SupportedLocale;
  readonly copy: PublicHomepageCopy;
  readonly sections: readonly PublicHomepageSection[];
  readonly banners: readonly PublicHomepageBanner[];
  readonly categories: readonly PublicHomepageCategory[];
}) {
  const section = sections[0];
  const banner = banners[0];
  const title = localizedText(section?.title, locale) ?? localizedText(banner?.title, locale) ?? copy.heroFallbackTitle;
  const body = localizedText(section?.body, locale) ?? copy.heroFallbackBody;
  const titleLines = title.split('\n');

  return (
    <section className="public-homepage__hero" aria-labelledby="public-homepage-hero-title">
      <div className="public-homepage__hero-media" aria-hidden={banner?.imageUrl === undefined ? undefined : true}>
        <BannerMedia banner={banner} copy={copy} locale={locale} priority />
      </div>
      <div className="public-homepage__hero-shade" aria-hidden="true" />
      <div className="public-homepage__hero-content">
        <p className="public-homepage__eyebrow">{copy.heroLabel}</p>
        <h1 id="public-homepage-hero-title"><span>{titleLines[0]}</span>{titleLines.slice(1).map(line => <strong key={line}>{line}</strong>)}</h1>
        <p className="public-homepage__hero-body">{body}</p>
        <SearchPanel copy={copy} locale={locale} categories={categories} />
      </div>
    </section>
  );
}

function SectionHeading({
  eyebrow,
  title,
  action,
  id
}: {
  readonly eyebrow?: string;
  readonly title: string;
  readonly action?: ReactNode;
  readonly id?: string;
}) {
  return (
    <div className="public-homepage__section-heading">
      <div>
        {eyebrow === undefined ? null : <p className="public-homepage__eyebrow">{eyebrow}</p>}
        <h2 id={id}>{title}</h2>
      </div>
      {action}
    </div>
  );
}

function PropertyGrid({
  locale,
  copy,
  properties
}: {
  readonly locale: SupportedLocale;
  readonly copy: PublicHomepageCopy;
  readonly properties: readonly PublicHomepageProperty[];
}) {
  return (
    <div className="public-homepage__property-grid">
      {properties.map(property => {
        const title = localizedText(property.name, locale) ?? property.slug;
        const features = propertyFeatures(property, locale, copy);
        return (
          <PropertyCard
            key={property.id}
            title={title}
            href={'/properties/' + property.slug}
            price={formatMoney(property.price, locale)}
            badges={[property.transactionType === 'sale' ? copy.sale : copy.rent]}
            features={features}
            image={<PublicMediaImage src={property.imageUrl ?? fallbackPropertyImage(property.slug, property.kind)} alt={title} fallback={<img src={fallbackPropertyImage(property.slug, property.kind)} alt={title} />} />}
            imageAlt={title}
            className="public-homepage__property-card"
          />
        );
      })}
    </div>
  );
}

function HomepageSummary({
  locale,
  metrics
}: {
  readonly locale: SupportedLocale;
  readonly metrics: readonly PublicHomepageMetric[];
}) {
  const primary = metrics[0];
  if (primary === undefined) return null;
  const secondary = (locale === 'ar' ? metrics.slice(1, 4).reverse() : metrics.slice(1, 4));

  return (
    <section className="public-homepage__summary" aria-label={localizedText(primary.title, locale) ?? primary.key} data-homepage-summary="data-backed">
      <p className="public-homepage__summary-kicker">{locale === 'ar' ? 'إحصاءات المدينة' :'City statistics'}</p>
      <h2>{localizedText(primary.title, locale) ?? primary.key}</h2>
      <strong className="public-homepage__summary-primary">{new Intl.NumberFormat(locale).format(primary.value)}</strong>
      {localizedText(primary.unit, locale) === undefined ? null : <p className="public-homepage__summary-unit">{localizedText(primary.unit, locale)}</p>}
      <div className="public-homepage__summary-grid">
        {secondary.map(metric => (
          <article className="public-homepage__summary-item" key={metric.key}>
            <strong>{metric.key === 'annual_growth' ? '+' : ''}{new Intl.NumberFormat(locale).format(metric.value)}</strong>
            <span>{localizedText(metric.title, locale) ?? metric.key}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

function HomepageCategoryRail({
  locale,
  copy,
  categories,
  metrics
}: {
  readonly locale: SupportedLocale;
  readonly copy: PublicHomepageCopy;
  readonly categories: readonly PublicHomepageCategory[];
  readonly metrics: readonly PublicHomepageMetric[];
}) {
  if (categories.length === 0) return null;

  const firstCategory = categories[0];
  const allPropertiesMetric = metrics.find(metric => metric.key === 'housing_units');
  const allPropertiesLabel = locale === 'ar' ? '\u0639\u0642\u0627\u0631' :'properties';
  const allPropertiesTitle = locale === 'ar' ? '\u0639\u0631\u0636 \u0627\u0644\u0643\u0644' :'View all';
  const renderCategory = (category: PublicHomepageCategory) => (
    <a className="public-homepage__category-card" href={'/properties?propertyTypeId=' + encodeURIComponent(category.id)} key={category.id}>
      <PublicMediaImage className="public-homepage__category-image" src={category.imageUrl ?? publicCategoryAsset(category.slug)} alt="" fallback={<PublicCategoryGlyph slug={category.slug} />} />
      <strong>{localizedText(category.name, locale) ?? category.slug}</strong>
      <small>{new Intl.NumberFormat(locale).format(category.propertyCount)} {allPropertiesLabel}</small>
    </a>
  );

  const title = copy.categoryTitle;
  return (
    <section className="public-homepage__category-section" aria-labelledby="public-homepage-categories">
      <SectionHeading eyebrow={copy.categoryEyebrow} id="public-homepage-categories" title={title} />
      <p className="public-homepage__section-description">{copy.categoryDescription}</p>
      <div className="public-homepage__category-rail">
        {firstCategory === undefined ? null : renderCategory(firstCategory)}
        {allPropertiesMetric === undefined ? null : <a className="public-homepage__category-card public-homepage__category-card--all" href="/properties" key="all-properties">
          <img className="public-homepage__category-image" src="/assets/sadat-real-estate-logo.png" alt="" width="636" height="557" decoding="async" loading="lazy" />
          <strong>{allPropertiesTitle}</strong>
          <small>{new Intl.NumberFormat(locale).format(allPropertiesMetric.value)}+ {allPropertiesLabel}</small>
        </a>}
        {categories.slice(1).map(renderCategory)}
      </div>
    </section>
  );
}

function PlatformCallout({ copy }: { readonly copy: PublicHomepageCopy }) {
  return (
    <section className="public-homepage__platform-callout" aria-labelledby="public-homepage-platform-callout">
      <div>
        <h2 id="public-homepage-platform-callout">{copy.readyCtaTitle}</h2>
        <p>{copy.readyCtaBody}</p>
      </div>
      <a className="public-homepage__primary-action" href="/properties">{copy.browseProperties}</a>
      <a className="public-homepage__secondary-action public-homepage__whatsapp-action" href={getWhatsAppLink()} target="_blank" rel="noopener noreferrer">{copy.whatsappAction}</a>
    </section>
  );
}

function ContentGrid({
  locale,
  copy,
  type,
  content
}: {
  readonly locale: SupportedLocale;
  readonly copy: PublicHomepageCopy;
  readonly type: PublicHomepageContent['type'];
  readonly content: readonly PublicHomepageContent[];
}) {
  const items = ordered(content.filter(item => item.type === type));
  if (items.length === 0) return null;
  const title = type === 'article'
    ? copy.articlesTitle
    : type === 'community'
      ? copy.communityTitle
      : type === 'about'
        ? copy.aboutTitle
        : copy.tips;
  const eyebrow = type === 'article'
    ? copy.articlesEyebrow
    : type === 'community'
      ? copy.communityEyebrow
      : type === 'about'
        ? copy.aboutEyebrow
        : undefined;
  const action = type === 'article'
    ? <a href="/articles">{copy.viewAll}</a>
    : type === 'community'
      ? <a href="/community">{copy.communityAction}</a>
      : undefined;

  return (
    <section className={`public-homepage__section public-homepage__section--content public-homepage__section--${type}`} aria-labelledby={'public-homepage-' + type}>
      <SectionHeading
        {...(eyebrow === undefined ? {} : { eyebrow })}
        id={'public-homepage-' + type}
        title={title}
        {...(action === undefined ? {} : { action })}
      />
      <div className="public-homepage__content-grid">
        {items.map(item => {
          const body = localizedText(item.body, locale);
          const bodyLines = body?.split('\n').filter(Boolean) ?? [];
          const contentType = type === 'community'
            ? item.key === 'community_events' ? copy.communityQuestion : copy.communityExperience
            : type === 'about'
              ? copy.aboutEyebrow
              : type === 'article'
                ? articlePresentation[item.key]?.label[locale] ?? title
                : title;
          const articleDetails = type === 'article' ? articlePresentation[item.key] : undefined;
          const communityDetails = type === 'community' ? communityPresentation[item.key] : undefined;
          const communityTitle = bodyLines[0] ?? localizedText(item.title, locale) ?? item.key;
          const communityBody = bodyLines.slice(1).join('\n');
          const aboutPointLines = bodyLines.slice(1);
          const aboutPoints = [] as Array<{ readonly title: string; readonly detail: string | undefined }>;
          for (let index = 0; index < aboutPointLines.length; index += 2) {
            const pointTitle = aboutPointLines[index];
            if (pointTitle === undefined) continue;
            aboutPoints.push({ title: pointTitle, detail: aboutPointLines[index + 1] });
          }
          return (
            <article className="public-homepage__content-card" key={item.key}>
              {type === 'community' ? <>
                <div className="public-homepage__community-header">
                  <p className="public-homepage__content-type">{contentType}</p>
                  <div className="public-homepage__community-author">
                    <div>
                      <h3>{localizedText(item.title, locale) ?? item.key}</h3>
                      {communityDetails === undefined ? null : <span>{communityDetails.time[locale]}</span>}
                    </div>
                    {item.imageUrl === undefined ? null : <PublicMediaImage src={item.imageUrl} alt={localizedText(item.title, locale) ?? item.key} fallback={<span className="public-homepage__content-media-fallback" />} />}
                  </div>
                </div>
                <h4 className="public-homepage__community-title">{communityTitle}</h4>
                {communityBody === '' ? null : <p className="public-homepage__community-body">{communityBody}</p>}
                {communityDetails === undefined ? null : <div className="public-homepage__community-stats" aria-hidden="true">
                  <span>{communityDetails.comments}<svg viewBox="0 0 20 20" focusable="false"><path d="M4 4.5h12v8H9l-3.5 3v-3H4Z" /></svg></span>
                  <span>{communityDetails.views}<svg viewBox="0 0 20 20" focusable="false"><path d="M2.5 10s2.5-4 7.5-4 7.5 4 7.5 4-2.5 4-7.5 4-7.5-4-7.5-4Z" /><circle cx="10" cy="10" r="1.75" /></svg></span>
                </div>}
              </> : type === 'article' ? <>
                <div className="public-homepage__article-media">
                  {item.imageUrl === undefined ? <span className="public-homepage__content-media-fallback" /> : <PublicMediaImage src={item.imageUrl} alt={localizedText(item.title, locale) ?? item.key} fallback={<span className="public-homepage__content-media-fallback" />} />}
                  <p className="public-homepage__content-type">{contentType}</p>
                </div>
                <div className="public-homepage__article-body">
                  <h3>{localizedText(item.title, locale) ?? item.key}</h3>
                  {bodyLines[0] === undefined ? null : <p>{bodyLines[0]}</p>}
                  {articleDetails === undefined ? <a href="/articles">{copy.readMore}</a> : <div className="public-homepage__article-meta">
                    <span>{articleDetails.duration[locale]}<svg viewBox="0 0 20 20" focusable="false"><circle cx="10" cy="10" r="7" /><path d="M10 6v4l2.5 1.5" /></svg></span>
                    <span>{articleDetails.author[locale]}</span>
                  </div>}
                </div>
              </> : <>
                {item.imageUrl === undefined ? null : <PublicMediaImage src={item.imageUrl} alt={localizedText(item.title, locale) ?? item.key} fallback={<span className="public-homepage__content-media-fallback" />} />}
                <p className="public-homepage__content-type">{contentType}</p>
                <h3>{localizedText(item.title, locale) ?? item.key}</h3>
                {bodyLines[0] === undefined ? null : <p>{bodyLines[0]}</p>}
                {type === 'about' && aboutPoints.length > 0 ? <ul className="public-homepage__about-points">{aboutPoints.map((point, index) => <li key={point.title}>
                  <span className="public-homepage__about-point-icon" aria-hidden="true">{index === 0 ? '\u2713' : index === 1 ? '\u2022' : index === 2 ? '\u2605' : '\u25c6'}</span>
                  <span><strong>{point.title}</strong>{point.detail === undefined ? null : <small>{point.detail}</small>}</span>
                </li>)}</ul> : null}
              </>}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function BannerGrid({
  locale,
  copy,
  banners
}: {
  readonly locale: SupportedLocale;
  readonly copy: PublicHomepageCopy;
  readonly banners: readonly PublicHomepageBanner[];
}) {
  const carouselBanners = ordered(banners).slice(1);
  const [activeIndex, setActiveIndex] = useState(0);
  const banner = carouselBanners[activeIndex] ?? carouselBanners[0];
  if (banner === undefined) return null;
  const title = localizedText(banner.title, locale) ?? banner.key;
  const eyebrow = localizedText(banner.eyebrow, locale) ?? copy.about;
  const body = localizedText(banner.body, locale);
  const highlight = localizedText(banner.highlight, locale);
  const targetUrl = safePublicUrl(banner.targetUrl) ?? '/properties';
  const presentation = bannerPresentation[banner.key];
  const previousLabel = locale === 'ar' ? '\u0627\u0644\u0625\u0639\u0644\u0627\u0646 \u0627\u0644\u0633\u0627\u0628\u0642' :'Previous banner';
  const nextLabel = locale === 'ar' ? '\u0627\u0644\u0625\u0639\u0644\u0627\u0646 \u0627\u0644\u062a\u0627\u0644\u064a' :'Next banner';

  return (
    <section className="public-homepage__section public-homepage__section--banners" aria-labelledby="public-homepage-banners">
      <div className="public-homepage__banner-card">
        <a className="public-homepage__banner-link" href={targetUrl}>
          <BannerMedia banner={banner} copy={copy} locale={locale} />
          <span className="public-homepage__banner-copy">
            <small>{eyebrow}</small>
            {presentation === undefined ? null : <span className="public-homepage__banner-provider">
              <img src={presentation.providerImage} alt="" width="40" height="40" />
              <span>{presentation.provider[locale]}</span>
            </span>}
            <strong>{title}</strong>
            {body === undefined ? null : <span className="public-homepage__banner-body">{body}</span>}
            {highlight === undefined ? null : <span className="public-homepage__banner-highlight-group"><b className="public-homepage__banner-highlight">{highlight}</b>{presentation === undefined ? null : <small>{presentation.installment[locale]}</small>}</span>}
            <em>{copy.discoverProject}</em>
          </span>
        </a>
        <button className="public-homepage__banner-control public-homepage__banner-control--previous" type="button" aria-label={previousLabel} onClick={() => setActiveIndex(index => (index - 1 + carouselBanners.length) % carouselBanners.length)} disabled={carouselBanners.length < 2}>‹</button>
        <button className="public-homepage__banner-control public-homepage__banner-control--next" type="button" aria-label={nextLabel} onClick={() => setActiveIndex(index => (index + 1) % carouselBanners.length)} disabled={carouselBanners.length < 2}>›</button>
      </div>
      <div className="public-homepage__banner-dots" aria-label={locale === 'ar' ? '\u0627\u062e\u062a\u064a\u0627\u0631 \u0627\u0644\u0625\u0639\u0644\u0627\u0646' :'Banner selection'}>
        {carouselBanners.map((item, index) => <button key={item.key} type="button" aria-label={`${index + 1}`} aria-current={index === activeIndex ? 'true' : undefined} onClick={() => setActiveIndex(index)}><span /></button>)}
      </div>
    </section>
  );
}

function HomepageContent({
  locale,
  copy,
  data
}: {
  readonly locale: SupportedLocale;
  readonly copy: PublicHomepageCopy;
  readonly data: PublicHomepageData;
}) {
  const sections = ordered(data.sections);
  return (
    <div className="public-homepage__content">
      <Hero locale={locale} copy={copy} sections={sections} banners={data.banners} categories={data.categories} />
      <BannerGrid locale={locale} copy={copy} banners={data.banners} />
      <HomepageSummary locale={locale} metrics={data.metrics} />
      <HomepageCategoryRail locale={locale} copy={copy} categories={data.categories} metrics={data.metrics} />
      {data.properties.length === 0 ? null : (
        <section className="public-homepage__section public-homepage__section--properties" aria-labelledby="public-homepage-properties">
          <SectionHeading eyebrow={copy.propertiesEyebrow} id="public-homepage-properties" title={copy.propertiesTitle} action={<a href="/properties">{copy.viewAll}</a>} />
          <PropertyGrid locale={locale} copy={copy} properties={data.properties.slice(0, 3)} />
        </section>
      )}
      <ContentGrid locale={locale} copy={copy} type="article" content={data.content} />
      <ContentGrid locale={locale} copy={copy} type="community" content={data.content} />
      <ContentGrid locale={locale} copy={copy} type="about" content={data.content} />
      <PlatformCallout copy={copy} />
      <PublicSiteFooter locale={locale} description={copy.footerDescription} />
    </div>
  );
}

function StateNotice({
  state,
  copy,
  onRetry
}: {
  readonly state: Exclude<PublicHomepageViewState, 'success'>;
  readonly copy: PublicHomepageCopy;
  readonly onRetry: () => void;
}) {
  const text = stateCopy(state, copy);
  return (
    <UxStateView className="public-homepage__state" state={state} title={text.title} message={text.body} retryLabel={copy.retryLabel} onRetry={onRetry}>
      {state === 'empty' ? <button type="button" onClick={onRetry}>{copy.retryLabel}</button> : null}
      {state === 'error' ? <button type="button" onClick={onRetry}>{copy.retryLabel}</button> : null}
      {state === 'permission' ? <a className="public-homepage__state-link" href="/">{copy.permissionLink}</a> : null}
    </UxStateView>
  );
}

export function PublicHomepage({ locale, initialData, initialState = 'loading', load = defaultPublicHomepageLoader }: PublicHomepageProps) {
  const copy = getPublicHomepageCopy(locale);
  const initialView = initialData === undefined
    ? initialState
    : isHomepageEmpty(initialData) ? 'empty' : 'success';
  const [data, setData] = useState<PublicHomepageData | undefined>(initialData);
  const [view, setView] = useState<PublicHomepageViewState>(initialView);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (initialData !== undefined && attempt === 0) return;
    const controller = new AbortController();
    setView('loading');
    void load(controller.signal)
      .then(nextData => {
        if (controller.signal.aborted) return;
        setData(nextData);
        setView(isHomepageEmpty(nextData) ? 'empty' : 'success');
      })
      .catch(error => {
        if (controller.signal.aborted || (error instanceof ApiClientError && error.code === 'ABORTED')) return;
        setView(errorState(error));
      });
    return () => controller.abort();
  }, [attempt, initialData, load]);

  const retry = () => setAttempt(value => value + 1);

  return (
    <div className="public-homepage" data-page="public-home" data-homepage-state={view}>
      <PublicSiteHeader locale={locale} copy={copy} />
      {view === 'success' && data !== undefined ? (
        <HomepageContent locale={locale} copy={copy} data={data} />
      ) : view === 'success' ? (
        <StateNotice state="empty" copy={copy} onRetry={retry} />
      ) : (
        <StateNotice state={view} copy={copy} onRetry={retry} />
      )}
    </div>
  );
}
