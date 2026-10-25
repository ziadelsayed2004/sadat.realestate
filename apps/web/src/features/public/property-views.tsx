import type { SupportedLocale } from '@sadat-real-estate/contracts';

export function PropertyViews({ count = 0, locale }: { count?: number | undefined; locale: SupportedLocale }) {
  return <span className="public-property-views" aria-label={`${locale === 'ar' ? 'عدد المشاهدات' : 'Views'}: ${count.toLocaleString(locale)}`}>
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>
    <strong>{count.toLocaleString(locale)}</strong><span>{locale === 'ar' ? 'مشاهدة' : 'views'}</span>
  </span>;
}
