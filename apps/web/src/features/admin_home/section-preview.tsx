import type { LocalizedText, SupportedLocale } from '@sadat-real-estate/contracts';
import { localizedText } from '../public/model.ts';
import { homepagePlaceName } from './homepage-section-picker.tsx';

export const homepagePlaces = ['hero', 'featured_properties', 'articles', 'community', 'tips', 'about'] as const;
export function homepagePlaceHref(key: string, locale: SupportedLocale) {
  const anchor = ({ hero: 'homepage-hero', featured_properties: 'public-homepage-properties', articles: 'public-homepage-article', community: 'public-homepage-community', tips: 'public-homepage-tip', about: 'public-homepage-about' } as Record<string, string>)[key];
  return anchor ? `/?lang=${locale}#${anchor}` : undefined;
}
export function SectionPreview({ sectionKey, title, body, locale }: { sectionKey: string; title: LocalizedText; body: LocalizedText; locale: SupportedLocale }) {
  const ar = locale === 'ar', href = homepagePlaceHref(sectionKey, locale);
  return <aside className="admin-home__section-preview" aria-label={ar ? 'معاينة القسم ومكانه' : 'Section and location preview'}>
    <h3>{ar ? 'معاينة قبل الحفظ والنشر' : 'Preview before saving and publishing'}</h3>
    <p>{ar ? 'تعديل النص هنا يغيّر عنوان ووصف القسم المختار؛ العقارات والمقالات والصور تُدار من صفحاتها.' : 'This changes the selected section heading and description. Manage properties, articles and images from their own pages.'}</p>
    {sectionKey === "hero" ? <p>{ar ? "لو في بانر ظاهر أعلى الرئيسية وله عنوان ووصف، محتوى البانر هو الذي يظهر للزائر. النص هنا بديل عند عدم وجود محتوى للبانر." : "When the active homepage banner has a heading and description, its content is shown to visitors. This section supplies fallback text."} <a href={`/admin/banners?placementKey=homepage.hero&lang=${locale}`}>{ar ? "تعديل نص وصورة البانر" : "Edit banner text and image"}</a></p> : null}
    <ol className="admin-home__page-map">{homepagePlaces.map(key => <li key={key} aria-current={key === sectionKey ? 'location' : undefined}>{homepagePlaceName(key, locale)}</li>)}</ol>
    {href ? <><div className={`admin-home__section-sample ${sectionKey === 'hero' ? 'admin-home__section-sample--hero' : ''}`} dir={ar ? 'rtl' : 'ltr'}><small>{homepagePlaceName(sectionKey, locale)}</small><h2>{localizedText(title, locale) || (ar ? 'عنوان القسم' : 'Section heading')}</h2><p>{localizedText(body, locale) || (ar ? 'الوصف يظهر هنا تحت العنوان.' : 'The description appears here below the heading.')}</p><div aria-hidden="true" className="admin-home__sample-cards"><span /><span /><span /></div></div><a className="ui-button ui-button--secondary" href={href} target="_blank" rel="noreferrer">{ar ? 'فتح مكانه في الموقع' : 'Open its location on the website'} ↗</a></> : <p role="status">{ar ? 'هذا مفتاح قديم لا يرتبط بقسم ظاهر. اختر قسمًا متاحًا من القائمة لربطه بمكانه، أو عدّل القسم الموجود بالفعل.' : 'This legacy key has no visible section. Choose an available section to connect it, or edit the existing section.'}</p>}
    <p>{ar ? 'المعاينة تعرض النص الحالي فقط؛ لن يتغير الموقع حتى تحفظه وتنشره.' : 'The preview shows current text only. Save and publish to change the website.'}</p>
  </aside>;
}
