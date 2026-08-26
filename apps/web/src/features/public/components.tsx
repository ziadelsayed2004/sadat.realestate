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
import { PropertyCard } from '../design_system/index.ts';
import { UxStateView, type UxState } from '../ux_states/index.ts';
import { getPublicHomepageCopy, type PublicHomepageCopy } from './copy.ts';
import { defaultPublicHomepageLoader, type PublicHomepageLoader } from './data.ts';
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
        <span className="public-homepage__locale" aria-label={copy.localeLabel}>
          <span aria-hidden="true">⌄</span>
          <span>{locale.toUpperCase()}</span>
          <svg viewBox="0 0 16 16" focusable="false" aria-hidden="true"><circle cx="8" cy="8" r="6" /><path d="M2 8h12M8 2a9 9 0 0 1 0 12M8 2a9 9 0 0 0 0 12" /></svg>
        </span>
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
  const labels = locale === 'ar'
    ? { explore: 'الصفحات', company: 'الشركة', contact: 'تواصل معنا', follow: 'تابع عقارات السادات', followBody: 'ابقَ على اطلاع بأحدث العروض والأخبار', legal: 'سياسة الخصوصية · الشروط والأحكام', copyright: '© 2026 منصة عقارات السادات — جميع الحقوق محفوظة', phone: '01001234567', whatsapp: 'واتساب متاح 24/7', address: 'مدينة السادات، مصر' }
    : locale === 'zh-CN'
      ? { explore: '页面', company: '公司', contact: '联系我们', follow: '关注萨达特房地产', followBody: '及时了解最新房源与资讯', legal: '隐私政策 · 条款与条件', copyright: '© 2026 萨达特房地产平台 — 版权所有', phone: '01001234567', whatsapp: 'WhatsApp 全天候可用', address: '埃及萨达特城' }
      : { explore: 'Pages', company: 'Company', contact: 'Contact us', follow: 'Follow Sadat Real Estate', followBody: 'Stay informed about the latest listings and news', legal: 'Privacy policy · Terms and conditions', copyright: '© 2026 Sadat Real Estate — All rights reserved', phone: '01001234567', whatsapp: 'WhatsApp available 24/7', address: 'Sadat City, Egypt' };
  const nav = locale === 'ar'
    ? { ...copy.nav, community: '\u0627\u0644\u0643\u0648\u0645\u064a\u0648\u0646\u062a\u064a', about: '\u0645\u0646 \u0646\u062d\u0646', team: '\u0641\u0631\u064a\u0642 \u0627\u0644\u0639\u0645\u0644' }
    : copy.nav;
  return (
    <footer className="public-homepage__footer public-site-footer">
      <div className="public-site-footer__brand">
        <img className="public-site-footer__logo" src="/assets/sadat-real-estate-logo.png" alt="" width={636} height={557} decoding="async" loading="lazy" />
        <p className="public-homepage__eyebrow">{copy.brand}</p>
        <p>{description ?? copy.footerDescription}</p>
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
          <a href="/community">{labels.whatsapp}</a>
          <span>{labels.address}</span>
        </div>
      </div>
      <div className="public-site-footer__follow">
        <div><strong>{labels.follow}</strong><span>{labels.followBody}</span></div>
        <div className="public-site-footer__social" aria-label="social links">
          <a href="/community" aria-label="Facebook"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 8h3V4h-3c-3.31 0-5 1.69-5 5v3H6v4h3v4h4v-4h3l1-4h-4V9c0-.67.33-1 1-1Z" /></svg></a>
          <a href="/community" aria-label="Instagram"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4" /><circle cx="12" cy="12" r="3.5" /><circle cx="17.25" cy="6.75" r=".75" fill="currentColor" stroke="none" /></svg></a>
          <a href="/community" aria-label="YouTube"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="18" height="12" rx="3" /><path d="m10 9 5 3-5 3Z" fill="currentColor" stroke="none" /></svg></a>
          <a href="/community" aria-label="TikTok"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4v10.2a3.8 3.8 0 1 1-3-3.7V14a1.8 1.8 0 1 0 1 1.7V4h3c.3 1.7 1.3 2.8 3 3.2v3c-1.1-.1-2.1-.5-3-1.1V14a4.8 4.8 0 1 1-5-4.8V4Z" fill="currentColor" stroke="none" /></svg></a>
          <a href="/community" aria-label="LinkedIn"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8.5V18H3V8.5h3ZM4.5 3A1.75 1.75 0 1 1 4.5 6.5 1.75 1.75 0 0 1 4.5 3ZM8 8.5h2.9v1.3h.1c.4-.8 1.4-1.7 3-1.7 3.2 0 3.8 2.1 3.8 4.9V18h-3v-4.4c0-1.1 0-2.6-1.6-2.6s-1.9 1.2-1.9 2.5V18H8V8.5Z" fill="currentColor" stroke="none" /></svg></a>
          <a href="/community" aria-label="WhatsApp"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5a8.5 8.5 0 0 0-7.3 12.9L3.5 20.5l4.2-1.1A8.5 8.5 0 1 0 12 3.5Z" /><path d="M9.2 8.7c.2-.3.4-.3.7-.3h.5c.2 0 .4.1.5.4l.7 1.6c.1.2.1.4-.1.6l-.5.6c.5 1 1.3 1.7 2.4 2.2l.7-.7c.2-.2.4-.2.7-.1l1.5.7c.3.1.4.3.3.6-.2.8-.8 1.3-1.6 1.4-1.2.1-3-.8-4.4-2.1-1.3-1.2-2.3-2.8-2.2-4.1 0-.3.2-.6.5-.8Z" fill="currentColor" stroke="none" /></svg></a>
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
  const imageUrl = safePublicUrl(banner?.imageUrl);
  const imageAlt = localizedText(banner?.title, locale) ?? copy.imageUnavailable;

  if (imageUrl === undefined || failed) {
    return (
      <div className={'public-homepage__missing-media' + (className === undefined ? '' : ' ' + className)}>
        <UxStateView state="missing_image" title={copy.imageUnavailable} />
      </div>
    );
  }

  return <img className={className} src={imageUrl} alt={imageAlt} decoding="async" loading={priority ? 'eager' : 'lazy'} onError={() => setFailed(true)} />;
}

function SearchPanel({ copy, locale, categories }: { readonly copy: PublicHomepageCopy; readonly locale: SupportedLocale; readonly categories: readonly PublicHomepageCategory[] }) {
  const labels = locale === 'ar'
    ? { type: 'نوع العقار', district: 'المنطقة', price: 'السعر', any: 'الكل' }
    : locale === 'zh-CN'
      ? { type: '房产类型', district: '区域', price: '价格', any: '全部' }
      : { type: 'Property type', district: 'District', price: 'Price', any: 'Any' };
  return (
    <form className="public-homepage__search" action="/properties" method="get" aria-label={copy.searchLabel}>
      <div className="public-homepage__search-tabs" aria-hidden="true">
        <span className="is-active">{copy.sale}</span>
        <span>{copy.rent}</span>
      </div>
      <div className="public-homepage__search-row">
        <label><span>{labels.type}</span><select name="propertyTypeId" defaultValue=""><option value="">{labels.any}</option>{categories.map(category => <option value={category.id} key={category.id}>{localizedText(category.name, locale) ?? category.slug}</option>)}</select></label>
        <label><span>{labels.district}</span><input id="public-homepage-search" name="search" type="search" placeholder={copy.searchPlaceholder} /></label>
        <label><span>{labels.price}</span><select name="maxPrice" defaultValue=""><option value="">{labels.any}</option><option value="1000000">1,000,000</option><option value="3000000">3,000,000</option><option value="5000000">5,000,000</option></select></label>
        <button type="submit">{copy.searchAction}</button>
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
            image={<PublicMediaImage src={property.imageUrl} alt={title} fallback={<UxStateView state="missing_image" title={copy.imageUnavailable} />} />}
            imageAlt={copy.imageUnavailable}
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
  const secondary = metrics.slice(1, 4);

  return (
    <section className="public-homepage__summary" aria-label={localizedText(primary.title, locale) ?? primary.key} data-homepage-summary="data-backed">
      <p className="public-homepage__summary-kicker">{locale === 'ar' ? 'إحصاءات المدينة' : locale === 'zh-CN' ? '城市统计' : 'City statistics'}</p>
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
  categories
}: {
  readonly locale: SupportedLocale;
  readonly copy: PublicHomepageCopy;
  readonly categories: readonly PublicHomepageCategory[];
}) {
  if (categories.length === 0) return null;

  const title = locale === 'ar' ? 'تصفح حسب النوع' : locale === 'zh-CN' ? '按类型浏览' : 'Browse by type';
  return (
    <section className="public-homepage__category-section" aria-labelledby="public-homepage-categories">
      <SectionHeading eyebrow={copy.featuredProperties} id="public-homepage-categories" title={title} />
      <p className="public-homepage__section-description">
        {locale === 'ar' ? 'تصفح جميع أنواع العقارات المتاحة في مدينة السادات' : locale === 'zh-CN' ? '浏览萨达特城所有可用房产类型' : 'Browse every property type available in Sadat City'}
      </p>
      <div className="public-homepage__category-rail">
        {categories.map(category => (
          <a className="public-homepage__category-card" href={'/properties?propertyTypeId=' + encodeURIComponent(category.id)} key={category.id}>
            <PublicMediaImage className="public-homepage__category-image" src={category.imageUrl} alt="" fallback={<span className="public-homepage__category-icon" aria-hidden="true">◆</span>} />
            <strong>{localizedText(category.name, locale) ?? category.slug}</strong>
            <small>{new Intl.NumberFormat(locale).format(category.propertyCount)}</small>
          </a>
        ))}
      </div>
    </section>
  );
}

function PlatformCallout({ locale, copy }: { readonly locale: SupportedLocale; readonly copy: PublicHomepageCopy }) {
  const title = locale === 'ar'
    ? 'ابدأ رحلتك العقارية بثقة'
    : locale === 'zh-CN'
      ? '开始安心的房产之旅'
      : 'Start your property journey with confidence';
  const body = locale === 'ar'
    ? 'استخدم البيانات المنشورة من مصادر معتمدة للوصول إلى الخطوة التالية.'
    : locale === 'zh-CN'
      ? '使用来自已批准来源的已发布数据，继续您的下一步。'
      : 'Use published data from approved sources to take the next step.';

  return (
    <section className="public-homepage__platform-callout" aria-labelledby="public-homepage-platform-callout">
      <div>
        <p className="public-homepage__eyebrow">{copy.about}</p>
        <h2 id="public-homepage-platform-callout">{title}</h2>
        <p>{body}</p>
      </div>
      <a className="public-homepage__primary-action" href="/properties">{copy.browseProperties}</a>
      <a className="public-homepage__secondary-action" href="/auth/register">{copy.createAccount}</a>
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
    ? copy.articles
    : type === 'community'
      ? copy.community
      : type === 'about'
        ? copy.about
        : copy.tips;

  return (
    <section className={`public-homepage__section public-homepage__section--content public-homepage__section--${type}`} aria-labelledby={'public-homepage-' + type}>
      <SectionHeading id={'public-homepage-' + type} title={title} />
      <div className="public-homepage__content-grid">
        {items.map(item => {
          const body = localizedText(item.body, locale);
          const bodyLines = body?.split('\n').filter(Boolean) ?? [];
          return (
            <article className="public-homepage__content-card" key={item.key}>
              {item.imageUrl === undefined ? null : <PublicMediaImage src={item.imageUrl} alt={localizedText(item.title, locale) ?? item.key} fallback={<span className="public-homepage__content-media-fallback" />} />}
              <p className="public-homepage__content-type">{title}</p>
              <h3>{localizedText(item.title, locale) ?? item.key}</h3>
              {bodyLines[0] === undefined ? null : <p>{bodyLines[0]}</p>}
              {type === 'about' && bodyLines.length > 1 ? <ul className="public-homepage__about-points">{bodyLines.slice(1).map(line => <li key={line}>{line}</li>)}</ul> : null}
              {type === 'article' ? <a href="/articles">{copy.readMore}</a> : null}
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
  const banner = ordered(banners).slice(1)[0];
  if (banner === undefined) return null;
  const title = localizedText(banner.title, locale) ?? banner.key;
  const eyebrow = localizedText(banner.eyebrow, locale) ?? copy.about;
  const body = localizedText(banner.body, locale);
  const highlight = localizedText(banner.highlight, locale);
  const targetUrl = safePublicUrl(banner.targetUrl) ?? '/properties';

  return (
    <section className="public-homepage__section public-homepage__section--banners" aria-labelledby="public-homepage-banners">
      <a className="public-homepage__banner-card" href={targetUrl}>
        <BannerMedia banner={banner} copy={copy} locale={locale} />
        <span className="public-homepage__banner-copy">
          <small>{eyebrow}</small>
          <strong>{title}</strong>
          {body === undefined ? null : <span className="public-homepage__banner-body">{body}</span>}
          {highlight === undefined ? null : <b className="public-homepage__banner-highlight">{highlight}</b>}
          <em>{copy.browseProperties}</em>
        </span>
      </a>
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
      <HomepageCategoryRail locale={locale} copy={copy} categories={data.categories} />
      {data.properties.length === 0 ? null : (
        <section className="public-homepage__section public-homepage__section--properties" aria-labelledby="public-homepage-properties">
          <SectionHeading id="public-homepage-properties" title={copy.featuredProperties} action={<a href="/properties">{copy.viewAll}</a>} />
          <PropertyGrid locale={locale} copy={copy} properties={data.properties.slice(0, 3)} />
        </section>
      )}
      <ContentGrid locale={locale} copy={copy} type="article" content={data.content} />
      <ContentGrid locale={locale} copy={copy} type="community" content={data.content} />
      <ContentGrid locale={locale} copy={copy} type="about" content={data.content} />
      <PlatformCallout locale={locale} copy={copy} />
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
