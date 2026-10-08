import { useEffect, useId, useRef, useState } from 'react';
import type { LocalizedText, SupportedLocale } from '@sadat-real-estate/contracts';
import { TipCard } from '../public/tip-card.tsx';
import { localizedText } from '../public/model.ts';
import { Button } from '../design_system/index.ts';

export function ContentPreview({ title, body, locale, status, active, saved = false, onClose }: {
  readonly title: LocalizedText; readonly body: LocalizedText; readonly locale: SupportedLocale;
  readonly status: 'draft' | 'published' | 'inactive'; readonly active: boolean; readonly saved?: boolean;
  readonly onClose?: (() => void) | undefined;
}) {
  const ar = locale === 'ar';
  const [language, setLanguage] = useState<SupportedLocale>(locale);
  const selectId = useId();
  const previewRef = useRef<HTMLElement>(null);
  useEffect(() => { if (saved) previewRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' }); }, [saved]);
  const visible = status === 'published' && active;
  return <aside ref={previewRef} className="admin-home__content-preview" aria-label={ar ? 'معاينة المحتوى' : 'Content preview'}>
    <div className="admin-home__preview-heading"><h3>{saved ? (ar ? 'معاينة النصيحة المحفوظة' : 'Saved tip preview') : (ar ? 'معاينة مباشرة أثناء الكتابة' : 'Live preview while editing')}</h3>{onClose ? <Button type="button" size="sm" variant="secondary" onClick={onClose}>{ar ? 'إغلاق المعاينة' : 'Close preview'}</Button> : null}</div>
    <label htmlFor={selectId}>{ar ? 'لغة المعاينة' : 'Preview language'}<select id={selectId} value={language} onChange={event => setLanguage(event.target.value as SupportedLocale)}><option value="ar">العربية</option><option value="en">English</option></select></label>
    <div lang={language} dir={language === 'ar' ? 'rtl' : 'ltr'}><TipCard title={localizedText(title, language) || (ar ? 'عنوان النصيحة' : 'Tip title')} body={localizedText(body, language) || (ar ? 'اكتب النص لتشاهده هنا.' : 'Enter the text to see it here.')} /></div>
    <p className="admin-home__preview-note">{ar ? 'دي بطاقة النصيحة في قسم «النصائح» بالصفحة الرئيسية. لو لغة المعاينة فاضية، بتظهر اللغة المتاحة زي الموقع.' : 'This is the tip card in the homepage Tips section. If the preview language is empty, the available translation appears as on the website.'}</p>
    {!saved ? <p className="admin-home__preview-note">{ar ? 'المعاينة بتعرض اللي بتكتبه فورًا؛ التعديل مش محفوظ لسه.' : 'Your typing appears immediately; these edits have not been saved yet.'}</p> : null}
    <p className="admin-home__preview-note">{visible ? (ar ? 'تظهر للزوار عندما تكون محفوظة ومنشورة ونشطة.' : 'Shown to visitors when saved, published and active.') : (ar ? 'مش ظاهرة للزوار بالحالة الحالية. ظهورها يحتاج «منشور» وتفعيل «نشط» ثم الحفظ.' : 'Not visible to visitors in its current state. Set Published and Active, then save to display it.')}</p>
  </aside>;
}
