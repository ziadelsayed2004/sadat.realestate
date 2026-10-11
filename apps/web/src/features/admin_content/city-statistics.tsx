import { useState, type FormEvent } from 'react';
import type { CmsAdminContentData, CmsAdminDisplaySetting, SupportedLocale } from '@sadat-real-estate/contracts';
import { Button } from '../design_system/index.ts';

const metrics = [
  ['buildings', 'المباني', 'Buildings'],
  ['residential_districts', 'المناطق السكنية', 'Residential districts'],
  ['housing_units', 'الوحدات السكنية', 'Housing units'],
  ['annual_growth', 'النمو السنوي', 'Annual growth']
] as const;

export function CityStatisticsEditor({ locale, load, save, errorMessage }: {
  locale: SupportedLocale; load: () => Promise<CmsAdminContentData>;
  save: (input: unknown) => Promise<CmsAdminContentData>; errorMessage: (error: unknown) => string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<CmsAdminDisplaySetting[]>([]);
  const [selected, setSelected] = useState<string>(metrics[0][0]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [reason, setReason] = useState('');
  const [feedback, setFeedback] = useState<string>();
  const [success, setSuccess] = useState(false);
  const ar = locale === 'ar';
  const current = rows.find(row => row.key === `city_metric_${selected}`);
  const canSave = current === undefined || (current.availableActions.includes('update') && (current.status === 'published' || current.availableActions.includes('publish')));
  async function openEditor() {
    setOpen(true); setLoading(true); setLoaded(false); setSuccess(false); setFeedback(undefined);
    try {
      const data = await load();
      if (data.namespace !== 'display') throw new Error('Unexpected statistics response');
      setRows(data.items);
      setLoaded(true);
      setDrafts(Object.fromEntries(metrics.map(([key]) => {
        const row = data.items.find(item => item.key === `city_metric_${key}`);
        return [key, row?.value.kind === 'number' ? String(row.value.value) : ''];
      })));
    } catch (error) { setFeedback(errorMessage(error)); }
    finally { setLoading(false); }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || loading || !canSave) return;
    const value = drafts[selected]?.trim() ?? '';
    const number = Number(value);
    setSuccess(false);
    if (!value || !Number.isSafeInteger(number) || number < 0 || number > 100_000_000 || reason.trim().length < 5 || reason.trim().length > 500) {
      setFeedback(ar ? 'أدخل عددًا صحيحًا من 0 إلى 100,000,000 وسبب تعديل من 5 إلى 500 حرف.' : 'Enter a whole number from 0 to 100,000,000 and a change reason of 5 to 500 characters.'); return;
    }
    setSaving(true); setFeedback(undefined);
    try {
      const data = await save({ ...(current ? { id: current.id, version: current.version, ...(current.status === 'published' ? {} : { status: 'published' }) } : { key: `city_metric_${selected}`, status: 'published' }), value: { kind: 'number', value: number }, reason: reason.trim() });
      if (data.namespace !== 'display') throw new Error('Unexpected statistics response');
      setRows(data.items); setSuccess(true); setFeedback(ar ? 'تم حفظ الرقم وعرضه في إحصاءات المدينة.' : 'The count was saved and published in city statistics.');
    } catch (error) { setFeedback(errorMessage(error)); }
    finally { setSaving(false); }
  }
  return <section className="admin-content__editor" data-testid="admin-city-statistics">
    <h2>{ar ? 'باقي إحصاءات المدينة' : 'Other city statistics'}</h2>
    <p>{ar ? 'أدخل الأرقام المعتمدة يدويًا. تعديلها لا يغير عدد السكان التلقائي.' : 'Enter approved counts manually. Editing them does not change the automatic population estimate.'}</p>
    <Button type="button" variant="secondary" disabled={loading || saving} onClick={() => { void openEditor(); }}>{ar ? (open ? 'تحديث البيانات' : 'تعديل إحصاءات المدينة') : (open ? 'Reload statistics' : 'Edit city statistics')}</Button>
    {loading ? <p role="status">{ar ? 'جاري تحميل الأرقام...' : 'Loading counts...'}</p> : null}
    {open && loaded && !loading ? <form noValidate onSubmit={event => { void submit(event); }}>
      <label htmlFor="city-statistic-type">{ar ? 'الإحصائية' : 'Statistic'}<select id="city-statistic-type" value={selected} disabled={saving} onChange={event => { setSelected(event.target.value); setFeedback(undefined); }}>{metrics.map(([key, arabic, english]) => <option key={key} value={key}>{ar ? arabic : english}</option>)}</select></label>
      <label htmlFor="city-statistic-value">{ar ? 'العدد' : 'Count'}<input id="city-statistic-value" type="number" min="0" max="100000000" step="1" required disabled={saving || !canSave} value={drafts[selected] ?? ''} onChange={event => { setDrafts(old => ({ ...old, [selected]: event.target.value })); setFeedback(undefined); }} /></label>
      <label htmlFor="city-statistic-reason">{ar ? 'سبب التعديل' : 'Change reason'}<textarea id="city-statistic-reason" minLength={5} maxLength={500} required disabled={saving || !canSave} value={reason} onChange={event => setReason(event.target.value)} /></label>
      <Button type="submit" disabled={saving || !canSave} loading={saving}>{ar ? 'حفظ العدد' : 'Save count'}</Button>
    </form> : null}
    {feedback ? <p role={success ? 'status' : 'alert'} className="admin-content__feedback" data-tone={success ? 'success' : undefined}>{feedback}</p> : null}
  </section>;
}
