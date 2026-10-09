import { useEffect, useState } from 'react';
import type { TeamCategory, SupportedLocale } from '@sadat-real-estate/contracts';
import { Button } from '../design_system/index.ts';
import type { TeamCategoryLoader, TeamCategorySave } from './data.ts';
import './team-categories.css';

export function TeamCategoriesManager({ locale, load, save, onChange }: { locale: SupportedLocale; load: TeamCategoryLoader; save: TeamCategorySave; onChange: (items: TeamCategory[]) => void }) {
  const ar = locale === 'ar'; const [items, setItems] = useState<TeamCategory[]>([]); const [selected, setSelected] = useState<TeamCategory>();
  const [labelAr, setLabelAr] = useState(''); const [labelEn, setLabelEn] = useState(''); const [order, setOrder] = useState('0'); const [active, setActive] = useState(true); const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false); const [failed, setFailed] = useState(false); const [saved, setSaved] = useState(false); const [attempt, setAttempt] = useState(0);
  useEffect(() => { const controller = new AbortController();
    void load(controller.signal).then(data => { if (!controller.signal.aborted) { setItems(data); onChange(data); setFailed(false); } }).catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [load, onChange, attempt]);
  return <details id="team-departments" className="admin-content__panel admin-team-departments" data-testid="team-categories-manager"><summary>{ar ? 'إدارة أقسام الفريق وإضافة قسم' : 'Manage team departments and add a department'}</summary><div className="admin-team-departments__body">
    <p>{ar ? 'أنشئ قسمًا مثل إدارة أو مبيعات أو تسويق، ثم اختاره من «قسم الفريق» داخل بيانات الشخص. اكتب وظيفته، مثل «مدير المبيعات»، في المسمى الوظيفي.' : 'Create departments such as management, sales or marketing, then select one in the member’s Team department field. Enter a job title such as Sales Manager separately.'}</p>
    <label className="admin-team-departments__selector">{ar ? 'اختر قسمًا للتعديل أو أنشئ جديدًا' : 'Choose a department to edit or create one'}<select disabled={busy} value={selected?.key ?? ''} onChange={event => {
      const item = items.find(item => item.key === event.target.value); setSelected(item); setLabelAr(item?.label.ar ?? ''); setLabelEn(item?.label.en ?? ''); setOrder(String(item?.order ?? 0)); setActive(item?.active ?? true); setSaved(false);
    }}><option value="">{ar ? 'قسم جديد' : 'New department'}</option>{items.map(item => <option key={item.key} value={item.key}>{item.label[locale] ?? item.label.ar ?? item.label.en}{item.active ? '' : ar ? ' (متوقف)' : ' (Inactive)'}</option>)}</select></label>
    <form className="admin-team-departments__form" onSubmit={event => { event.preventDefault(); if (busy) return; setBusy(true); setFailed(false); setSaved(false);
      void save({ ...(selected ? { key: selected.key, version: selected.version } : {}), label: { ...(labelAr.trim() ? { ar: labelAr.trim() } : {}), ...(labelEn.trim() ? { en: labelEn.trim() } : {}) }, order: Number(order), active, reason })
        .then(data => { setItems(data); onChange(data); setSaved(true); setSelected(undefined); setLabelAr(''); setLabelEn(''); setReason(''); setOrder('0'); setActive(true); }).catch(() => setFailed(true)).finally(() => setBusy(false));
    }}><fieldset disabled={busy} className="admin-team-departments__fields"><legend>{selected ? (ar ? 'تعديل القسم' : 'Edit department') : (ar ? 'بيانات القسم الجديد' : 'New department details')}</legend><div className="admin-content__form-grid"><label>{ar ? 'اسم القسم بالعربية' : 'Arabic department name'}<input value={labelAr} onChange={event => setLabelAr(event.target.value)} maxLength={80} required={!labelEn.trim()} placeholder={ar ? 'مثال: مبيعات' : 'e.g. مبيعات'} /></label>
      <label>{ar ? 'اسم القسم بالإنجليزية (اختياري)' : 'English department name (optional)'}<input value={labelEn} onChange={event => setLabelEn(event.target.value)} maxLength={80} placeholder="Sales" /></label>
      <label>{ar ? 'ترتيب الظهور' : 'Display order'}<input type="number" min="0" max="10000" value={order} onChange={event => setOrder(event.target.value)} required /></label>
      <label className="admin-content__checkbox"><input type="checkbox" checked={active} onChange={event => setActive(event.target.checked)} />{ar ? 'متاح لاختيار أعضاء جدد' : 'Available for new members'}</label></div>
      <label>{ar ? 'سبب إضافة أو تعديل القسم' : 'Department change reason'}<input value={reason} onChange={event => setReason(event.target.value)} minLength={5} maxLength={500} required placeholder={ar ? 'اكتب سببًا واضحًا للتغيير' : 'Explain the change'} /></label></fieldset>
      <div className="admin-team-departments__actions"><Button type="submit" loading={busy} disabled={busy}>{ar ? 'حفظ القسم' : 'Save department'}</Button></div>
    </form>{failed ? <div className="admin-team-departments__feedback" data-tone="error" role="alert"><p>{ar ? 'تعذر تحميل أو حفظ القسم. تحقق من الصلاحيات والبيانات؛ الكتابة محفوظة.' : 'Department could not load or save. Check permissions and values; input is preserved.'}</p><Button type="button" variant="secondary" onClick={() => setAttempt(value => value + 1)}>{ar ? 'تحديث الأقسام' : 'Refresh departments'}</Button></div> : null}{saved ? <p className="admin-team-departments__feedback" data-tone="success" role="status">{ar ? 'تم حفظ القسم. اختاره من «قسم الفريق» في بيانات الشخص، ثم احفظ بياناته.' : 'Department saved. Select it in the member’s Team department field, then save the member.'}</p> : null}
    <p className="admin-team-departments__note">{ar ? 'إضافة الشخص لفريق العمل أو اختيار قسم له لا ينشئ حساب دخول ولا يمنحه صلاحيات إدارية.' : 'Adding a team member or assigning a department does not create a login account or grant admin permissions.'}</p></div>
  </details>;
}
