import { DEFAULT_ABOUT_STATS, type CmsAdminAboutBlock, type SupportedLocale } from '@sadat-real-estate/contracts';

export type AboutStatDraft = { value: string; label: { ar: string; en: string }; visible: boolean };
export function aboutStatDrafts(stats: CmsAdminAboutBlock['stats']): AboutStatDraft[] {
  return (stats ?? DEFAULT_ABOUT_STATS).map(stat => ({ value: stat.value, label: { ar: stat.label.ar ?? '', en: stat.label.en ?? '' }, visible: stat.visible }));
}

export function AboutStatisticsFields({ stats, onChange, locale, disabled }: {
  readonly stats: AboutStatDraft[]; readonly onChange: (stats: AboutStatDraft[]) => void;
  readonly locale: SupportedLocale; readonly disabled: boolean;
}) {
  const ar = locale === 'ar';
  const change = (index: number, update: Partial<AboutStatDraft>) => onChange(stats.map((stat, position) => position === index ? { ...stat, ...update } : stat));
  return <fieldset disabled={disabled} className="admin-content__localized-fields admin-about-statistics" data-testid="admin-about-statistics">
    <legend>{ar ? 'أرقام صفحة من نحن' : 'About page statistics'}</legend>
    {stats.length === 0 && <button type="button" onClick={() => onChange(aboutStatDrafts(undefined))}>{ar ? 'إضافة بطاقات الأرقام' : 'Add statistic cards'}</button>}
    <p className="admin-content__muted">{ar ? 'غيّر الرقم ونص البطاقة كما سيظهران للزائر. أمثلة: 1200 أو 1,200+ أو 342K+. تظهر التغييرات عند نشر هذا القسم وتفعيله، ويمكنك إخفاء أي بطاقة.' : 'Edit each value and label as visitors will see them, e.g. 1200, 1,200+ or 342K+. Changes appear when this block is published and active. You can hide individual cards.'}</p>
    {stats.map((stat, index) => <div className="admin-content__localized-fields" key={index}>
      <strong>{ar ? `البطاقة ${index + 1}` : `Card ${index + 1}`}</strong>
      <div className="admin-content__form-grid">
        <label>{ar ? `قيمة البطاقة ${index + 1}` : `Card ${index + 1} value`}<input dir="ltr" value={stat.value} maxLength={24} required onChange={event => change(index, { value: event.target.value })} /></label>
        <label>{ar ? `عنوان البطاقة ${index + 1} بالعربية` : `Card ${index + 1} Arabic label`}<input lang="ar" dir="rtl" value={stat.label.ar} maxLength={80} onChange={event => change(index, { label: { ...stat.label, ar: event.target.value } })} /></label>
        <label>{ar ? `عنوان البطاقة ${index + 1} بالإنجليزية` : `Card ${index + 1} English label`}<input lang="en" dir="ltr" value={stat.label.en} maxLength={80} onChange={event => change(index, { label: { ...stat.label, en: event.target.value } })} /></label>
        <label className="admin-content__checkbox"><input type="checkbox" checked={stat.visible} onChange={event => change(index, { visible: event.target.checked })} />{ar ? `إظهار البطاقة ${index + 1}` : `Show card ${index + 1}`}</label>
      </div>
    </div>)}
  </fieldset>;
}
