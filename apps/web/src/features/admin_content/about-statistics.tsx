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
  const meanings = ar ? ['عدد العقارات المدرجة في المنصة الذي تريد التعريف به.', 'عدد المناطق أو الأحياء التي تغطيها خدمات المنصة.', 'عدد الطلبات النشطة الذي تريد عرضه للزوار.', 'تقدير عدد سكان مدينة السادات من مصدر موثوق.'] : ['The number of listed properties you want to report.', 'The number of areas or districts covered by the platform.', 'The number of active requests you want to report.', 'An estimate of Sadat City residents from a reliable source.'];
  const change = (index: number, update: Partial<AboutStatDraft>) => onChange(stats.map((stat, position) => position === index ? { ...stat, ...update } : stat));
  return <fieldset disabled={disabled} className="admin-content__localized-fields admin-about-statistics" data-testid="admin-about-statistics">
    <legend>{ar ? 'أرقام صفحة من نحن' : 'About page statistics'}</legend>
    {stats.length === 0 && <button type="button" onClick={() => onChange(aboutStatDrafts(undefined))}>{ar ? 'إضافة بطاقات الأرقام' : 'Add statistic cards'}</button>}
    <p className="admin-content__muted">{ar ? 'هذه بطاقات تعريفية تظهر أسفل صفحة «عن المنصة»، بعد «قيمنا» وقبل أزرار تصفح العقارات والتواصل. الأرقام تدخلها أنت، ولا تتحدث تلقائيًا من العقارات أو الطلبات أو عداد السكان.' : 'These information cards appear near the bottom of About, after Our values and before the property and contact buttons. You enter the figures; they do not update automatically from properties, requests or the population counter.'}</p>
    <p className="admin-content__muted">{ar ? 'القيمة نص يظهر كما تكتبه وليست عملية حسابية. مثال: 342K+ يعني أكثر من 342 ألفًا؛ لو تقصد 342,088 اكتبها كاملة. استخدم أرقامًا مؤكدة؛ الأرقام المقترحة ليست إحصاءات فعلية. احفظ القسم منشورًا ونشطًا لتظهر التغييرات.' : 'The value is displayed exactly as typed, without calculations. For example, 342K+ means over 342 thousand; enter 342,088 in full if that is the intended figure. Use verified numbers; suggested values are not actual statistics. Save this block as Published and Active to show changes.'}</p>
    <a href={`/about?lang=${locale}#about-statistics`} target="_blank" rel="noopener noreferrer">{ar ? 'شاهد مكان البطاقات في الموقع' : 'View the cards on the website'}</a>
    <div className="admin-about-statistics__layout"><div className="admin-about-statistics__fields">
    {stats.map((stat, index) => <div className="admin-about-statistics__card-fields" key={index}>
      <strong>{ar ? `البطاقة ${index + 1}` : `Card ${index + 1}`} — {stat.label[locale] || stat.label.ar || stat.label.en || (ar ? 'بدون عنوان' : 'Untitled')}</strong>
      {Object.entries(stat.label).every(([language, text]) => !text || text === DEFAULT_ABOUT_STATS[index]?.label[language as 'ar' | 'en']) ? <p className="admin-content__muted">{meanings[index]}</p> : null}
      <p className="admin-content__muted">{ar ? 'القيمة تظهر كبيرة أعلى البطاقة، والعنوان تحتها يوضح المقصود بالرقم. غيّر العنوان إذا كنت تريد عرض معلومة مختلفة.' : 'The value appears in large text above the label. The label explains what the figure means; change it when displaying different information.'}</p>
      <div className="admin-content__form-grid">
        <label>{ar ? `قيمة البطاقة ${index + 1}` : `Card ${index + 1} value`}<input dir="ltr" value={stat.value} maxLength={24} required onChange={event => change(index, { value: event.target.value })} /></label>
        <label>{ar ? `عنوان البطاقة ${index + 1} بالعربية` : `Card ${index + 1} Arabic label`}<input lang="ar" dir="rtl" value={stat.label.ar} maxLength={80} onChange={event => change(index, { label: { ...stat.label, ar: event.target.value } })} /></label>
        <label>{ar ? `عنوان البطاقة ${index + 1} بالإنجليزية` : `Card ${index + 1} English label`}<input lang="en" dir="ltr" value={stat.label.en} maxLength={80} onChange={event => change(index, { label: { ...stat.label, en: event.target.value } })} /></label>
        <label className="admin-content__checkbox"><input type="checkbox" checked={stat.visible} onChange={event => change(index, { visible: event.target.checked })} />{ar ? `إظهار البطاقة ${index + 1}` : `Show card ${index + 1}`}</label>
      </div>
    </div>)}
    </div><aside className="admin-about-statistics__preview" data-testid="admin-about-statistics-preview" aria-label={ar ? 'معاينة بطاقات عن المنصة' : 'About statistic cards preview'}>
      <h3>{ar ? 'معاينة قبل الحفظ' : 'Preview before saving'}</h3>
      <p>{ar ? 'تعرض كتابتك الحالية. الموقع يعرض النسخة المحفوظة المنشورة.' : 'Shows your current edits. The website displays the saved, published version.'}</p>
      <div className="admin-about-statistics__preview-grid">{stats.filter(stat => stat.visible).map((stat, index) => <article key={index}><strong><bdi dir="ltr">{stat.value || '—'}</bdi></strong><span>{stat.label[locale] || stat.label.ar || stat.label.en || '—'}</span></article>)}</div>
      {!stats.some(stat => stat.visible) ? <p>{ar ? 'كل البطاقات مخفية، ولن يظهر قسم الأرقام.' : 'All cards are hidden; the statistics section will not appear.'}</p> : null}
    </aside></div>
  </fieldset>;
}
