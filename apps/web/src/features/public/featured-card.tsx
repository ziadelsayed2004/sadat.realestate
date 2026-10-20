import type { PublicHomepageBanner, SupportedLocale } from '@sadat-real-estate/contracts';
import { replaceLocaleInUrl } from '../localization/index.ts';
import './featured-card.css';

export const FEATURED_CARD_SECONDS = 10;
export function featuredText(value: PublicHomepageBanner['title'], locale: SupportedLocale) { return value?.[locale] ?? value?.ar ?? value?.en; }
export function FeaturedCard({ banner, locale, preview = false }: { readonly banner: PublicHomepageBanner; readonly locale: SupportedLocale; readonly preview?: boolean }) {
  const text = (value: PublicHomepageBanner['title']) => value?.[locale]?.trim() || undefined;
  const target = banner.targetUrl?.startsWith('/') && !banner.targetUrl.startsWith('//') ? replaceLocaleInUrl(banner.targetUrl, locale) : undefined;
  return <div className="public-homepage__banner-layout" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
    <div className="public-homepage__banner-media-wrapper">{banner.imageUrl ? <img src={banner.imageUrl} alt={text(banner.altText) ?? text(banner.title) ?? ''} loading="lazy" /> : <div className="public-homepage__missing-media">{locale === 'ar' ? 'اختر صورة الإعلان' : 'Choose an image'}</div>}</div>
    <div className="public-homepage__banner-copy">
      <div className="public-homepage__banner-kicker-row"><span className="public-homepage__banner-badge">★ {text(banner.eyebrow) ?? (locale === 'ar' ? 'إعلان مميز' : 'Featured ad')}</span></div>
      <div className="public-homepage__banner-provider">{banner.advertiserImageUrl ? <img src={banner.advertiserImageUrl} alt="" width="40" height="40" /> : null}<span className="public-homepage__banner-provider-name">{featuredText(banner.advertiserName, locale) ?? (locale === 'ar' ? 'عارض عقار' : 'Property advertiser')}</span>{banner.advertiserVerified === true && banner.advertiserName ? <span className="public-homepage__banner-verified" aria-label={locale === 'ar' ? 'موثق' : 'Verified'}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 1 3 2 3.6.4 1.2 3.4L22 10l-1 3.5.2 3.6-3.2 1.7-2.2 2.9-3.5-.8-3.5.8-2.2-2.9-3.2-1.7.2-3.6L2 10l2.2-3.2 1.2-3.4L9 3Z" fill="currentColor"/><path d="m7 11 3 3 6-6" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></span> : null}</div>
      <h2 className="public-homepage__banner-title">{text(banner.title) ?? (locale === 'ar' ? 'إعلان عقاري مميز' : 'Featured property')}</h2>
      {text(banner.body) ? <p className="public-homepage__banner-body">{text(banner.body)}</p> : null}
      <div className="public-homepage__banner-highlight-group">{text(banner.highlight) ? <strong className="public-homepage__banner-highlight">{text(banner.highlight)}</strong> : null}{text(banner.installment) ? <span className="public-homepage__banner-installment">{text(banner.installment)}</span> : null}</div>
      {target ? <a className="public-homepage__banner-cta" href={target} onClick={preview ? event => event.preventDefault() : undefined}>{text(banner.ctaLabel) ?? (locale === 'ar' ? 'اكتشف المشروع' : 'Discover more')} ‹</a> : null}
    </div>
  </div>;
}
