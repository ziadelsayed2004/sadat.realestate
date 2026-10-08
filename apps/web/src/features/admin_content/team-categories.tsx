import { useEffect, useState } from 'react';
import type { TeamCategory, SupportedLocale } from '@sadat-real-estate/contracts';
import { Button } from '../design_system/index.ts';
import type { TeamCategoryLoader, TeamCategorySave } from './data.ts';

export function TeamCategoriesManager({ locale, load, save, onChange }: { locale: SupportedLocale; load: TeamCategoryLoader; save: TeamCategorySave; onChange: (items: TeamCategory[]) => void }) {
  const ar = locale === 'ar'; const [items, setItems] = useState<TeamCategory[]>([]); const [selected, setSelected] = useState<TeamCategory>();
  const [labelAr, setLabelAr] = useState(''); const [labelEn, setLabelEn] = useState(''); const [order, setOrder] = useState('0'); const [active, setActive] = useState(true); const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false); const [failed, setFailed] = useState(false); const [saved, setSaved] = useState(false); const [attempt, setAttempt] = useState(0);
  useEffect(() => { const controller = new AbortController();
    void load(controller.signal).then(data => { if (!controller.signal.aborted) { setItems(data); onChange(data); setFailed(false); } }).catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [load, onChange, attempt]);
  return <details className="admin-content__panel" data-testid="team-categories-manager"><summary>{ar ? 'إدارة تصنيفات الفريق وإضافة تصنيف' : 'Manage team categories and add a category'}</summary>
    <p>{ar ? 'أنشئ الأقسام مثل مبيعات أو إدارة أو تسويق، ثم اختر القسم عند إضافة الشخص. المسمى الوظيفي يكتب داخل بياناته. تصنيف الفريق لا يمنح صلاحيات دخول للوحة الإدارة.' : 'Create departments such as sales, management or marketing, then select one when adding a person. Their job title is entered separately. A team category does not grant admin login permissions.'}</p>
    <label>{ar ? 'اختر تصنيفًا للتعديل أو أنشئ جديدًا' : 'Choose a category to edit or create one'}<select value={selected?.key ?? ''} onChange={event => {
      const item = items.find(item => item.key === event.target.value); setSelected(item); setLabelAr(item?.label.ar ?? ''); setLabelEn(item?.label.en ?? ''); setOrder(String(item?.order ?? 0)); setActive(item?.active ?? true); setSaved(false);
    }}><option value="">{ar ? 'تصنيف جديد' : 'New category'}</option>{items.map(item => <option key={item.key} value={item.key}>{item.label[locale] ?? item.label.ar ?? item.label.en}{item.active ? '' : ar ? ' (متوقف)' : ' (Inactive)'}</option>)}</select></label>
    <form onSubmit={event => { event.preventDefault(); setBusy(true); setFailed(false); setSaved(false);
      void save({ ...(selected ? { key: selected.key, version: selected.version } : {}), label: { ...(labelAr.trim() ? { ar: labelAr.trim() } : {}), ...(labelEn.trim() ? { en: labelEn.trim() } : {}) }, order: Number(order), active, reason })
        .then(data => { setItems(data); onChange(data); setSaved(true); setSelected(undefined); setLabelAr(''); setLabelEn(''); setReason(''); }).catch(() => setFailed(true)).finally(() => setBusy(false));
    }}><div className="admin-content__form-grid"><label>{ar ? 'اسم التصنيف بالعربية' : 'Arabic category name'}<input value={labelAr} onChange={event => setLabelAr(event.target.value)} maxLength={80} required={!labelEn.trim()} /></label>
      <label>{ar ? 'اسم التصنيف بالإنجليزية (اختياري)' : 'English category name (optional)'}<input value={labelEn} onChange={event => setLabelEn(event.target.value)} maxLength={80} /></label>
      <label>{ar ? 'ترتيب الظهور' : 'Display order'}<input type="number" min="0" max="10000" value={order} onChange={event => setOrder(event.target.value)} required /></label>
      <label><input type="checkbox" checked={active} onChange={event => setActive(event.target.checked)} />{ar ? 'متاح لاختيار أعضاء جدد' : 'Available for new members'}</label></div>
      <label>{ar ? 'سبب تعديل التصنيف' : 'Category change reason'}<input value={reason} onChange={event => setReason(event.target.value)} minLength={5} maxLength={500} required /></label>
      <Button type="submit" loading={busy}>{ar ? 'حفظ التصنيف' : 'Save category'}</Button>
    </form>{failed ? <p role="alert">{ar ? 'تعذر تحميل أو حفظ التصنيف. تحقق من الصلاحيات والبيانات؛ الكتابة محفوظة.' : 'Category could not load or save. Check permissions and values; input is preserved.'}<Button type="button" variant="secondary" onClick={() => setAttempt(value => value + 1)}>{ar ? 'تحديث التصنيفات' : 'Refresh categories'}</Button></p> : null}{saved ? <p role="status">{ar ? 'تم حفظ التصنيف. اختره في نموذج الشخص.' : 'Category saved. Select it in the member form.'}</p> : null}
  </details>;
}
