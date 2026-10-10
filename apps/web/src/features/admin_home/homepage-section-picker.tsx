import type { SupportedLocale } from '@sadat-real-estate/contracts';

const places = [
  ['hero', 'عنوان أعلى الرئيسية', 'Homepage introduction', 'أعلى الصفحة مع صورة البانر والبحث', 'At the top, with the banner and search'],
  ['featured_properties', 'العقارات المميزة', 'Featured properties', 'بعد أنواع العقارات وقبل المقالات', 'After property types, before articles'],
  ['articles', 'المقالات', 'Articles', 'بعد العقارات المميزة', 'After featured properties'],
  ['community', 'المجتمع', 'Community', 'بعد المقالات', 'After articles'],
  ['tips', 'النصائح', 'Tips', 'بعد المجتمع', 'After community'],
  ['about', 'عن المنصة', 'About the platform', 'قرب نهاية الصفحة بعد النصائح', 'Near the bottom, after tips']
] as const;

export function homepagePlaceName(key: string, locale: SupportedLocale) {
  return places.find(place => place[0] === key)?.[locale === 'ar' ? 1 : 2] ?? (locale === 'ar' ? 'موضع قديم' : 'Legacy placement');
}

export function HomepageSectionPicker({ value, locale, existingKeys, editing, onChange }: {
  value: string; locale: SupportedLocale; existingKeys: readonly string[]; editing: boolean; onChange: (key: string) => void;
}) {
  const ar = locale === 'ar';
  const selected = places.find(place => place[0] === value);
  return <label htmlFor="admin-home-homepage-key"><span id="homepage-place-label">{ar ? 'القسم الذي تريد تعديل نصه' : 'Section to customize'}</span>
    <select id="admin-home-homepage-key" aria-labelledby="homepage-place-label" value={value} disabled={editing} required onChange={event => onChange(event.target.value)} aria-describedby="homepage-place-help">
      <option value="">{ar ? 'اختر القسم' : 'Choose a section'}</option>
      {editing && !selected ? <option value={value}>{homepagePlaceName(value, locale)}</option> : null}
      {places.map(place => <option key={place[0]} value={place[0]} disabled={!editing && existingKeys.includes(place[0])}>{place[ar ? 1 : 2]}{!editing && existingKeys.includes(place[0]) ? (ar ? ' — موجود؛ عدّله من القائمة' : ' — already added; edit it in the list') : ''}</option>)}
    </select>
    <small id="homepage-place-help">{selected ? selected[ar ? 3 : 4] : ar ? 'اختيار القسم يحدد المفتاح تلقائيًا. المكان ثابت حسب القسم.' : 'Choosing a section sets its key automatically. Each section has a fixed location.'}</small>
    {selected ? <a href={`/?lang=${locale}#${value === 'hero' ? 'homepage-hero' : value === 'featured_properties' ? 'public-homepage-properties' : value === 'articles' ? 'public-homepage-article' : value === 'tips' ? 'public-homepage-tip' : `public-homepage-${value}`}`} target="_blank" rel="noreferrer">{ar ? 'شاهد مكانه في الرئيسية' : 'View its location on the homepage'}</a> : null}
  </label>;
}
