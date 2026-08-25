import { useEffect, useState, type ReactNode } from 'react';
import type {
  PublicHomepageBanner,
  PublicHomepageContent,
  PublicHomepageData,
  PublicHomepageDeveloper,
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
  const links: ReadonlyArray<readonly [string, string]> = [
    ['/', copy.nav.home],
    ['/properties', copy.nav.properties],
    ['/developers', copy.nav.developers],
    ['/articles', copy.nav.articles],
    ['/community', copy.nav.community],
    ['/about', copy.nav.about],
    ['/team', copy.nav.team]
  ];

  return (
    <header className="public-homepage__header">
      <a className="public-homepage__brand" href="/" aria-label={copy.brand}>
        <img src="/assets/sadat-real-estate-logo.png" alt={copy.brand} width={636} height={557} decoding="async" />
      </a>
      <nav className="public-homepage__nav" aria-label={copy.nav.home}>
        {links.map(([href, label]) => <a key={href} href={href} aria-current={href === activePath ? 'page' : undefined}>{label}</a>)}
      </nav>
      <div className="public-homepage__actions">
        <a className="public-homepage__login" href="/auth/login">{copy.login}</a>
        <a className="public-homepage__signup" href="/auth/register">{copy.createAccount}</a>
        <span className="public-homepage__locale" aria-label={copy.localeLabel}>{locale}</span>
      </div>
    </header>
  );
}

export function PublicMediaImage({
  src,
  alt,
  fallback,
  className
}: {
  readonly src?: string | undefined;
  readonly alt: string;
  readonly fallback: ReactNode;
  readonly className?: string | undefined;
}) {
  const [failed, setFailed] = useState(false);
  const imageUrl = safePublicUrl(src);
  if (imageUrl === undefined || failed) return <>{fallback}</>;
  return <img className={className} src={imageUrl} alt={alt} decoding="async" onError={() => setFailed(true)} />;
}

export function PublicSiteFooter({ locale, description }: { readonly locale: SupportedLocale; readonly description?: string | undefined }) {
  const copy = getPublicHomepageCopy(locale);
  const labels = locale === 'ar'
    ? { explore: 'استكشف', contact: 'تواصل معنا', legal: 'الخصوصية والشروط', email: 'hello@sadat.realestate' }
    : locale === 'zh-CN'
      ? { explore: '探索', contact: '联系我们', legal: '隐私与条款', email: 'hello@sadat.realestate' }
      : { explore: 'Explore', contact: 'Contact', legal: 'Privacy & terms', email: 'hello@sadat.realestate' };
  return (
    <footer className="public-homepage__footer public-site-footer">
      <div className="public-site-footer__brand">
        <p className="public-homepage__eyebrow">{copy.brand}</p>
        <p>{description ?? copy.footerDescription}</p>
      </div>
      <div>
        <p className="public-homepage__footer-title">{labels.explore}</p>
        <div className="public-homepage__footer-links">
          <a href="/">{copy.nav.home}</a>
          <a href="/properties">{copy.nav.properties}</a>
          <a href="/developers">{copy.nav.developers}</a>
          <a href="/articles">{copy.nav.articles}</a>
          <a href="/about">{copy.nav.about}</a>
        </div>
      </div>
      <div>
        <p className="public-homepage__footer-title">{labels.contact}</p>
        <div className="public-homepage__footer-links">
          <a href={`mailto:${labels.email}`}>{labels.email}</a>
          <a href="/auth/register">{copy.createAccount}</a>
          <a href="/auth/login">{copy.login}</a>
        </div>
      </div>
      <div className="public-site-footer__bottom">
        <span>{copy.brand}</span>
        <span>{labels.legal}</span>
        <span aria-label="social links">◎ ◇ ◌</span>
      </div>
    </footer>
  );
}

function BannerMedia({
  banner,
  copy,
  locale,
  className
}: {
  readonly banner: PublicHomepageBanner | undefined;
  readonly copy: PublicHomepageCopy;
  readonly locale: SupportedLocale;
  readonly className?: string | undefined;
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

  return <img className={className} src={imageUrl} alt={imageAlt} onError={() => setFailed(true)} />;
}

function SearchPanel({ copy }: { readonly copy: PublicHomepageCopy }) {
  return (
    <form className="public-homepage__search" action="/properties" method="get" aria-label={copy.searchLabel}>
      <div className="public-homepage__search-tabs" aria-hidden="true">
        <span className="is-active">{copy.sale}</span>
        <span>{copy.rent}</span>
      </div>
      <label htmlFor="public-homepage-search">{copy.searchLabel}</label>
      <div className="public-homepage__search-row">
        <input id="public-homepage-search" name="search" type="search" placeholder={copy.searchPlaceholder} />
        <button type="submit">{copy.searchAction}</button>
      </div>
    </form>
  );
}

function Hero({
  locale,
  copy,
  sections,
  banners
}: {
  readonly locale: SupportedLocale;
  readonly copy: PublicHomepageCopy;
  readonly sections: readonly PublicHomepageSection[];
  readonly banners: readonly PublicHomepageBanner[];
}) {
  const section = sections[0];
  const banner = banners[0];
  const title = localizedText(section?.title, locale) ?? localizedText(banner?.title, locale) ?? copy.heroFallbackTitle;
  const body = localizedText(section?.body, locale) ?? copy.heroFallbackBody;

  return (
    <section className="public-homepage__hero" aria-labelledby="public-homepage-hero-title">
      <div className="public-homepage__hero-media" aria-hidden={banner?.imageUrl === undefined ? undefined : true}>
        <BannerMedia banner={banner} copy={copy} locale={locale} />
      </div>
      <div className="public-homepage__hero-shade" aria-hidden="true" />
      <div className="public-homepage__hero-content">
        <p className="public-homepage__eyebrow">{copy.heroLabel}</p>
        <h1 id="public-homepage-hero-title">{title}</h1>
        <p className="public-homepage__hero-body">{body}</p>
        <div className="public-homepage__hero-links">
          <a className="public-homepage__primary-action" href="/properties">{copy.browseProperties}</a>
          <a className="public-homepage__secondary-action" href="/developers">{copy.developers}</a>
        </div>
        <SearchPanel copy={copy} />
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
  properties,
  developers,
  content
}: {
  readonly locale: SupportedLocale;
  readonly properties: readonly PublicHomepageProperty[];
  readonly developers: readonly PublicHomepageDeveloper[];
  readonly content: readonly PublicHomepageContent[];
}) {
  const labels = locale === 'ar'
    ? ['عقار منشور', 'مصدر معتمد', 'محتوى منشور']
    : locale === 'zh-CN'
      ? ['已发布房产', '已批准来源', '已发布内容']
      : ['Published properties', 'Approved sources', 'Published content'];
  const values = [properties.length, developers.length, content.length];

  return (
    <section className="public-homepage__summary" aria-label={labels.join(', ')} data-homepage-summary="data-backed">
      {labels.map((label, index) => (
        <article className="public-homepage__summary-item" key={label}>
          <strong>{new Intl.NumberFormat(locale).format(values[index] ?? 0)}</strong>
          <span>{label}</span>
        </article>
      ))}
    </section>
  );
}

function HomepageCategoryRail({
  locale,
  copy,
  properties
}: {
  readonly locale: SupportedLocale;
  readonly copy: PublicHomepageCopy;
  readonly properties: readonly PublicHomepageProperty[];
}) {
  const counts = new Map<string, number>();
  for (const property of properties) counts.set(property.kind, (counts.get(property.kind) ?? 0) + 1);
  const items = [...counts.entries()];
  if (items.length === 0) return null;

  const title = locale === 'ar' ? 'تصفح حسب النوع' : locale === 'zh-CN' ? '按类型浏览' : 'Browse by type';
  return (
    <section className="public-homepage__category-section" aria-labelledby="public-homepage-categories">
      <SectionHeading eyebrow={copy.featuredProperties} id="public-homepage-categories" title={title} />
      <div className="public-homepage__category-rail">
        {items.map(([kind, count]) => (
          <a className="public-homepage__category-card" href={'/properties?kind=' + encodeURIComponent(kind)} key={kind}>
            <span className="public-homepage__category-icon" aria-hidden="true">◆</span>
            <strong>{kind}</strong>
            <small>{new Intl.NumberFormat(locale).format(count)}</small>
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
    </section>
  );
}

function DeveloperGrid({
  locale,
  developers
}: {
  readonly locale: SupportedLocale;
  readonly developers: readonly PublicHomepageDeveloper[];
}) {
  return (
    <div className="public-homepage__developer-grid">
      {developers.map(developer => (
        <article className="public-homepage__developer-card" key={developer.id}>
          <PublicMediaImage src={developer.imageUrl} alt={localizedText(developer.name, locale) ?? developer.slug} fallback={<span className="public-homepage__developer-mark" aria-hidden="true">◆</span>} />
          <span className="public-homepage__developer-mark" aria-hidden="true">◆</span>
          <h3><a href={'/developers/' + developer.slug}>{localizedText(developer.name, locale) ?? developer.slug}</a></h3>
          {localizedText(developer.description, locale) === undefined ? null : <p>{localizedText(developer.description, locale)}</p>}
        </article>
      ))}
    </div>
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
    <section className="public-homepage__section public-homepage__section--content" aria-labelledby={'public-homepage-' + type}>
      <SectionHeading id={'public-homepage-' + type} title={title} />
      <div className="public-homepage__content-grid">
        {items.map(item => (
          <article className="public-homepage__content-card" key={item.key}>
            {item.imageUrl === undefined ? null : <PublicMediaImage src={item.imageUrl} alt={localizedText(item.title, locale) ?? item.key} fallback={<span className="public-homepage__content-media-fallback" />} />}
            <p className="public-homepage__content-type">{title}</p>
            <h3>{localizedText(item.title, locale) ?? item.key}</h3>
            {localizedText(item.body, locale) === undefined ? null : <p>{localizedText(item.body, locale)}</p>}
            {type === 'article' ? <a href="/articles">{copy.readMore}</a> : null}
          </article>
        ))}
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
  const items = ordered(banners).slice(1);
  if (items.length === 0) return null;

  return (
    <section className="public-homepage__section public-homepage__section--banners" aria-labelledby="public-homepage-banners">
      <SectionHeading id="public-homepage-banners" title={copy.about} />
      <div className="public-homepage__banner-grid">
        {items.map(banner => {
          const title = localizedText(banner.title, locale) ?? banner.key;
          const targetUrl = safePublicUrl(banner.targetUrl);
          const content = (
            <>
              <BannerMedia banner={banner} copy={copy} locale={locale} />
              <span>{title}</span>
            </>
          );
          return targetUrl === undefined
            ? <article className="public-homepage__banner-card" key={banner.key}>{content}</article>
            : <a className="public-homepage__banner-card" key={banner.key} href={targetUrl}>{content}</a>;
        })}
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
      <Hero locale={locale} copy={copy} sections={sections} banners={data.banners} />
      <HomepageSummary locale={locale} properties={data.properties} developers={data.developers} content={data.content} />
      <HomepageCategoryRail locale={locale} copy={copy} properties={data.properties} />
      <BannerGrid locale={locale} copy={copy} banners={data.banners} />
      {data.properties.length === 0 ? null : (
        <section className="public-homepage__section public-homepage__section--properties" aria-labelledby="public-homepage-properties">
          <SectionHeading id="public-homepage-properties" title={copy.featuredProperties} action={<a href="/properties">{copy.viewAll}</a>} />
          <PropertyGrid locale={locale} copy={copy} properties={data.properties} />
        </section>
      )}
      {data.developers.length === 0 ? null : (
        <section className="public-homepage__section public-homepage__section--developers" aria-labelledby="public-homepage-developers">
          <SectionHeading id="public-homepage-developers" title={copy.developers} action={<a href="/developers">{copy.viewAll}</a>} />
          <DeveloperGrid locale={locale} developers={data.developers} />
        </section>
      )}
      <ContentGrid locale={locale} copy={copy} type="article" content={data.content} />
      <ContentGrid locale={locale} copy={copy} type="community" content={data.content} />
      <PlatformCallout locale={locale} copy={copy} />
      <ContentGrid locale={locale} copy={copy} type="about" content={data.content} />
      <ContentGrid locale={locale} copy={copy} type="tip" content={data.content} />
      {sections.length <= 1 ? null : (
        <section className="public-homepage__section public-homepage__section--editorial" aria-labelledby="public-homepage-editorial">
          <SectionHeading id="public-homepage-editorial" title={copy.about} />
          <div className="public-homepage__editorial-grid">
            {sections.slice(1).map(section => (
              <article key={section.key}>
                <h3>{localizedText(section.title, locale) ?? section.key}</h3>
                {localizedText(section.body, locale) === undefined ? null : <p>{localizedText(section.body, locale)}</p>}
              </article>
            ))}
          </div>
        </section>
      )}
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
