import type { SupportedLocale } from '@sadat-real-estate/contracts';
import './placement-guide.css';

export function adPlacementName(key: string | undefined, locale: SupportedLocale): string {
  const ar = locale === 'ar';
  if (key === 'homepage.hero') return ar ? 'بانر أعلى الرئيسية' : 'Homepage hero banner';
  if (key === 'homepage.featured') return ar ? 'إعلانات الرئيسية المميزة' : 'Featured homepage ads';
  return key || (ar ? 'لم يحدد مكان العرض بعد' : 'Display placement not assigned yet');
}

export function AdPlacementGuide({ placementKey, locale }: { placementKey?: string | undefined; locale: SupportedLocale }) {
  const ar = locale === 'ar';
  const known = placementKey === 'homepage.hero' || placementKey === 'homepage.featured';
  return <aside className="ad-placement-guide" aria-label={ar ? 'مكان الإعلان في الصفحة' : 'Ad location on the page'}>
    <strong>{ar ? 'مكان الإعلان في الصفحة' : 'Ad location on the page'}</strong>
    <ol aria-label={ar ? 'الرئيسية من أعلى لأسفل' : 'Homepage from top to bottom'}>
      <li data-selected={placementKey === 'homepage.hero' || undefined}><strong>{adPlacementName('homepage.hero', locale)}</strong><p>{ar ? 'صورة كبيرة في أول الصفحة، مع العنوان والبحث.' : 'Large image at the top, with the heading and search.'}</p></li>
      <li data-selected={placementKey === 'homepage.featured' || undefined}><strong>{adPlacementName('homepage.featured', locale)}</strong><p>{ar ? 'كارت أسفل البانر والبحث؛ الصورة بجانب النص، وفوقه على الموبايل.' : 'Card below the hero and search: image beside the text, above it on mobile.'}</p></li>
    </ol>
    {known ? <a href={`/?lang=${locale}#${placementKey === 'homepage.hero' ? 'homepage-hero' : 'homepage-featured'}`} target="_blank" rel="noopener noreferrer">{ar ? 'فتح مكانه في الموقع' : 'Open its location on the site'}</a> : <p>{placementKey ? ar ? 'موضع مخصص؛ تأكد من صفحة عرضه قبل النشر.' : 'Custom placement; confirm its display page before publishing.' : ar ? 'اختر المكان لتحديده هنا. مكان العرض مختلف عن الصفحة التي يفتحها زر الإعلان.' : 'Choose a placement to highlight it. Placement differs from the page opened by the ad button.'}</p>}
    {known ? <small>{ar ? 'الرابط يفتح القسم الحالي؛ إعلانك يظهر بعد النشر وفي موعده فقط.' : 'The link opens the current section; your ad appears only when published and within its dates.'}</small> : null}
  </aside>;
}
