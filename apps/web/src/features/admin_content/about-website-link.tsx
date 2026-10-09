import type { CmsAdminAboutBlock, SupportedLocale } from '@sadat-real-estate/contracts';

export function AboutWebsiteLink({ item, locale }: { readonly item: CmsAdminAboutBlock; readonly locale: SupportedLocale }) {
  const ar = locale === 'ar';
  if (item.status !== 'published' || !item.active) {
    return <span className="admin-content__muted">{ar ? 'غير ظاهر للزوار؛ استخدم المعاينة قبل النشر.' : 'Not visible to visitors; preview it before publishing.'}</span>;
  }
  return <a className="ui-button ui-button--secondary ui-button--sm" href={`/about?lang=${locale}#about-block-${encodeURIComponent(item.key)}`} target="_blank" rel="noopener noreferrer" title={ar ? 'يفتح مكان الجزء في صفحة عن المنصة في تبويب جديد' : 'Opens this section of the About page in a new tab'}>
    <span className="ui-button__label">{ar ? 'عرض في الموقع' : 'View on website'}</span><span aria-hidden="true">↗</span>
  </a>;
}
