import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { CmsAdminContentData, CmsAdminDisplaySetting, SupportedLocale } from '@sadat-real-estate/contracts';
import { Button } from '../design_system/index.ts';

const metrics = [
  ['buildings', 'المباني', 'Buildings'], ['residential_districts', 'المناطق السكنية', 'Residential districts'],
  ['housing_units', 'الوحدات السكنية', 'Housing units'], ['annual_growth', 'النمو السنوي', 'Annual growth']
] as const;
const valueOf = (rows: readonly CmsAdminDisplaySetting[], key: string) => {
  const row = rows.find(item => item.key === `city_metric_${key}`);
  return row?.value.kind === 'number' ? String(row.value.value) : '';
};
const editable = (row?: CmsAdminDisplaySetting) => !row || row.availableActions.includes('update') && (row.status === 'published' || row.availableActions.includes('publish'));

export function CityStatisticsEditor({ locale, load, save, errorMessage, population }: {
  locale: SupportedLocale; load: () => Promise<CmsAdminContentData>;
  save: (input: unknown) => Promise<CmsAdminContentData>; errorMessage: (error: unknown) => string; population?: number | undefined;
}) {
  const ar = locale === 'ar';
  const [loading, setLoading] = useState(true), [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [rows, setRows] = useState<CmsAdminDisplaySetting[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [reason, setReason] = useState(''), [feedback, setFeedback] = useState<string>(), [success, setSuccess] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const loader = useRef(load); loader.current = load;
  const errorCopy = useRef(errorMessage); errorCopy.current = errorMessage;
  useEffect(() => {
    let active = true; setLoading(true); setFeedback(undefined);
    void loader.current().then(data => {
      if (!active) return;
      if (data.namespace !== 'display') throw new Error('Unexpected statistics response');
      setRows(data.items); setDrafts(Object.fromEntries(metrics.map(([key]) => [key, valueOf(data.items, key)])));
      setLoaded(true);
    }).catch(error => { if (active) setFeedback(errorCopy.current(error)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]);
  const changed = metrics.filter(([key]) => (drafts[key] ?? '') !== valueOf(rows, key));
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (saving || loading || !loaded || !changed.length) return;
    setSuccess(false);
    const invalid = changed.find(([key]) => !drafts[key]?.trim() || !Number.isSafeInteger(Number(drafts[key])) || Number(drafts[key]) < 0 || Number(drafts[key]) > 100_000_000);
    if (invalid || reason.trim().length < 5 || reason.trim().length > 500) {
      setFeedback(ar ? 'أدخل أعدادًا صحيحة من 0 إلى 100,000,000 وسبب تعديل من 5 إلى 500 حرف.' : 'Enter whole numbers from 0 to 100,000,000 and a reason of 5 to 500 characters.');
      document.getElementById(invalid ? `city-statistic-${invalid[0]}` : 'city-statistic-reason')?.focus(); return;
    }
    setSaving(true); setFeedback(undefined);
    let working = rows, completed = 0;
    try {
      for (const [key] of changed) {
        const current = working.find(row => row.key === `city_metric_${key}`);
        if (!editable(current)) throw new Error(ar ? 'لا توجد صلاحية تعديل هذا الرقم.' : 'This statistic cannot be edited.');
        const data = await save({ ...(current ? { id: current.id, version: current.version, ...(current.status === 'published' ? {} : { status: 'published' }) } : { key: `city_metric_${key}`, status: 'published' }), value: { kind: 'number', value: Number(drafts[key]) }, reason: reason.trim() });
        if (data.namespace !== 'display') throw new Error('Unexpected statistics response');
        const merged = new Map(working.map(row => [row.key, row]));
        for (const row of data.items) merged.set(row.key, row);
        working = [...merged.values()]; setRows(working); completed++;
      }
      setSuccess(true); setFeedback(ar ? `تم حفظ ${completed} إحصائية ونشر التغييرات.` : `Saved and published ${completed} statistics.`);
    } catch (error) {
      setFeedback(`${completed ? (ar ? `تم حفظ ${completed} إحصائية. ` : `Saved ${completed} statistics. `) : ''}${errorMessage(error)} ${ar ? 'التغييرات المتبقية محفوظة في النموذج؛ أعد الحفظ للمحاولة.' : 'Remaining edits are retained. Save again to retry.'}`);
    } finally { setSaving(false); }
  }
  const number = (value: string | number | undefined) => value === undefined || value === '' || !Number.isFinite(Number(value)) ? '—' : new Intl.NumberFormat(locale).format(Number(value));
  return <section className="admin-content__editor admin-city-statistics" id="admin-city-statistics" data-testid="admin-city-statistics">
    <div className="admin-content__editor-heading"><div><h2>{ar ? 'إحصاءات المدينة' : 'City statistics'}</h2><p>{ar ? 'عدّل أكثر من رقم وشاهد النتيجة قبل الحفظ. عدد السكان يتحدث تلقائيًا.' : 'Edit multiple counts and preview them before saving. Population updates automatically.'}</p></div><Button type="button" variant="secondary" disabled={loading || saving || changed.length > 0} onClick={() => setAttempt(value => value + 1)}>{ar ? 'إعادة تحميل الأرقام' : 'Reload counts'}</Button></div>
    <aside className="admin-city-statistics__preview" aria-label={ar ? 'معاينة إحصاءات المدينة' : 'City statistics preview'}>
      <p>{ar ? 'معاينة مباشرة — قبل الحفظ' : 'Live preview — before saving'}</p>
      <strong>{number(population)}</strong><span>{ar ? 'نسمة في مدينة السادات' : 'Sadat City residents'}</span>
      <div>{metrics.map(([key, arabic, english]) => <article key={key}><strong>{key === 'annual_growth' ? '+' : ''}{number(drafts[key])}</strong><span>{ar ? arabic : english}</span></article>)}</div>
    </aside>
    {loading ? <p role="status">{ar ? 'جارٍ تحميل الأرقام…' : 'Loading counts…'}</p> : !loaded ? null : <form noValidate onSubmit={event => { void submit(event); }}>
      <div className="admin-city-statistics__fields">{metrics.map(([key, arabic, english]) => <label key={key} htmlFor={`city-statistic-${key}`}>{ar ? arabic : english}<input id={`city-statistic-${key}`} type="number" min="0" max="100000000" step="1" disabled={saving || !editable(rows.find(row => row.key === `city_metric_${key}`))} value={drafts[key] ?? ''} onChange={event => { setDrafts(values => ({ ...values, [key]: event.target.value })); setFeedback(undefined); }} /></label>)}</div>
      <label htmlFor="city-statistic-reason">{ar ? 'سبب التعديل' : 'Change reason'}<textarea id="city-statistic-reason" minLength={5} maxLength={500} required disabled={saving} value={reason} onChange={event => setReason(event.target.value)} /></label>
      <Button type="submit" disabled={saving || !changed.length} loading={saving}>{ar ? `حفظ التغييرات (${changed.length})` : `Save changes (${changed.length})`}</Button>
    </form>}
    {feedback ? <p role={success ? 'status' : 'alert'} className="admin-content__feedback" data-tone={success ? 'success' : undefined}>{feedback}</p> : null}
  </section>;
}
