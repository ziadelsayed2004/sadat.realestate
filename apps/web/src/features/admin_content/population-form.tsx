import { useState, type FormEvent } from 'react';
import { cmsAdminPopulationValuePutSchema, type CmsAdminPopulationValue, type SupportedLocale } from '@sadat-real-estate/contracts';
import { Button } from '../design_system/index.ts';
import { getAdminCmsCopy } from './copy.ts';

const statuses = ['available', 'unavailable', 'draft'] as const;
type Field = 'value' | 'sourceLabel' | 'sourceUrl' | 'asOf' | 'reason';
const ids: Record<Field, string> = { value: 'admin-cms-population-value', sourceLabel: 'admin-cms-population-source-ar', sourceUrl: 'admin-cms-population-url', asOf: 'admin-cms-population-as-of', reason: 'admin-cms-population-reason' };

export function PopulationValueForm({ population, locale, onSave, errorMessage }: {
  readonly population: CmsAdminPopulationValue | undefined;
  readonly locale: SupportedLocale;
  readonly onSave: (input: unknown) => Promise<void>;
  readonly errorMessage: (error: unknown) => string;
}) {
  const copy = getAdminCmsCopy(locale);
  const text = locale === 'ar' ? {
    hint: 'لنشر العدد اختر «متاح» وأكمل القيمة واسم المصدر ورابط البيان وتاريخه. التاريخ لا يحتاج وقتًا. «مسودة» أو «غير متاح» يخفي العدد من الموقع.',
    saved: 'تم حفظ عداد السكان بنجاح.', hidden: 'تم الحفظ. العدد مخفي لأن الحالة ليست «متاح».',
    invalid: 'راجع الحقول الموضحة أدناه؛ لم يتم الحفظ بعد.',
    value: 'أدخل عددًا صحيحًا من 0 إلى 100,000,000.', sourceLabel: 'أدخل اسم الجهة التي أصدرت البيان بالعربية أو الإنجليزية.',
    sourceUrl: 'أدخل رابطًا كاملًا للمصدر، مثل https://example.com/report.', asOf: 'اختر تاريخ البيان كاملًا: يوم وشهر وسنة.', reason: 'اكتب سبب التغيير من 5 إلى 500 حرف.'
  } : {
    hint: 'To publish the count, choose Available and complete the value, source name, statement URL and date. No time is needed. Draft or Unavailable hides the count from the website.',
    saved: 'Population counter saved successfully.', hidden: 'Saved. The count is hidden because its status is not Available.',
    invalid: 'Check the fields below; your changes have not been saved yet.',
    value: 'Enter a whole number from 0 to 100,000,000.', sourceLabel: 'Enter the issuing organization in Arabic or English.',
    sourceUrl: 'Enter a complete source URL, such as https://example.com/report.', asOf: 'Choose the complete statement date: day, month and year.', reason: 'Enter a change reason between 5 and 500 characters.'
  };
  const [status, setStatus] = useState<(typeof statuses)[number]>(population?.status ?? 'unavailable');
  const [value, setValue] = useState(population?.value === undefined ? '' : String(population.value));
  const [sourceLabel, setSourceLabel] = useState({ ar: population?.sourceLabel?.ar ?? '', en: population?.sourceLabel?.en ?? '' });
  const [sourceUrl, setSourceUrl] = useState(population?.sourceUrl ?? '');
  const [asOf, setAsOf] = useState(population?.asOf?.slice(0, 10) ?? '');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [feedback, setFeedback] = useState<string>();
  const [saved, setSaved] = useState(false);
  const available = status === 'available';
  const canUpdate = population === undefined || population.availableActions.includes('update');
  const changed = () => { setSaved(false); setFeedback(undefined); setErrors({}); };
  const fieldError = (field: Field) => errors[field] ? <small id={`${ids[field]}-error`} className="admin-content__feedback">{errors[field]}</small> : null;
  const attributes = (field: Field) => ({ 'aria-invalid': errors[field] ? true : undefined, 'aria-describedby': errors[field] ? `${ids[field]}-error` : undefined });

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (saving || !canUpdate) return;
    setSaved(false); setFeedback(undefined);
    const date = new Date(`${asOf}T00:00:00.000Z`);
    const labels = Object.fromEntries(Object.entries(sourceLabel).filter(([, label]) => label.trim()).map(([key, label]) => [key, label.trim()]));
    const parsed = cmsAdminPopulationValuePutSchema.safeParse({
      status, ...(available && value.trim() ? { value: Number(value) } : {}),
      ...(Object.keys(labels).length ? { sourceLabel: labels } : {}),
      ...(sourceUrl.trim() ? { sourceUrl: sourceUrl.trim() } : {}),
      ...(asOf ? { asOf: Number.isFinite(date.getTime()) ? date.toISOString() : asOf } : {}),
      reason: reason.trim(), ...(population ? { version: population.version } : {})
    });
    if (!parsed.success || reason.trim().length < 5) {
      const next: Partial<Record<Field, string>> = {};
      if (!parsed.success) for (const issue of parsed.error.issues) {
        const field = issue.path[0] as Field;
        if (field in ids) next[field] = text[field];
      }
      if (reason.trim().length < 5) next.reason = text.reason;
      setErrors(next); setFeedback(text.invalid);
      const field = Object.keys(next)[0] as Field | undefined;
      if (field) event.currentTarget.querySelector<HTMLElement>(`#${ids[field]}`)?.focus();
      return;
    }
    setErrors({}); setSaving(true);
    try { await onSave(parsed.data); setSaved(true); setFeedback(available ? text.saved : text.hidden); }
    catch (error) { setFeedback(errorMessage(error)); }
    finally { setSaving(false); }
  }

  return <section className="admin-content__editor" data-testid="admin-cms-population-editor">
    <div className="admin-content__editor-heading"><div><p className="admin-content__eyebrow">{copy.eyebrow}</p><h2>{copy.namespace.population}</h2></div></div>
    <p className="admin-content__muted">{text.hint}</p>
    <form noValidate onSubmit={event => { void submit(event); }}>
      <label htmlFor="admin-cms-population-status">{copy.status}<select id="admin-cms-population-status" value={status} onChange={event => { changed(); setStatus(event.target.value as (typeof statuses)[number]); }}>{statuses.map(option => <option key={option} value={option}>{copy.statusLabels[option]}</option>)}</select></label>
      <label htmlFor={ids.value}>{copy.value}<input id={ids.value} type="number" min="0" max="100000000" step="1" value={value} onChange={event => { changed(); setValue(event.target.value); }} disabled={!available} required={available} {...attributes('value')} />{fieldError('value')}</label>
      <div className="admin-content__localized-fields"><span className="admin-content__field-label">{copy.sourceLabel}</span><div className="admin-content__localized-grid">{(['ar', 'en'] as const).map(language => <label key={language} htmlFor={`admin-cms-population-source-${language}`}>{language.toUpperCase()} {copy.sourceLabel}<input id={`admin-cms-population-source-${language}`} value={sourceLabel[language]} onChange={event => { changed(); setSourceLabel(current => ({ ...current, [language]: event.target.value })); }} {...attributes('sourceLabel')} /></label>)}</div>{fieldError('sourceLabel')}<small className="admin-content__field-hint">{copy.localizedHint}</small></div>
      <div className="admin-content__form-grid">
        <label htmlFor={ids.sourceUrl}>{copy.sourceUrl}<input id={ids.sourceUrl} type="url" value={sourceUrl} onChange={event => { changed(); setSourceUrl(event.target.value); }} required={available} {...attributes('sourceUrl')} />{fieldError('sourceUrl')}</label>
        <label htmlFor={ids.asOf}>{copy.asOf}<input id={ids.asOf} type="date" value={asOf} onChange={event => { changed(); setAsOf(event.target.value); }} required={available} {...attributes('asOf')} />{fieldError('asOf')}</label>
      </div>
      <label htmlFor={ids.reason}>{copy.reason}<textarea id={ids.reason} value={reason} onChange={event => { changed(); setReason(event.target.value); }} minLength={5} maxLength={500} required placeholder={copy.reasonPlaceholder} {...attributes('reason')} />{fieldError('reason')}</label>
      <div className="admin-content__inline-actions">{canUpdate ? <Button type="submit" disabled={saving} loading={saving}>{saving ? copy.saving : copy.save}</Button> : <span className="admin-content__muted">{copy.states.permission.title}</span>}</div>
      {feedback ? <p className="admin-content__feedback" data-tone={saved ? 'success' : undefined} role={saved ? 'status' : 'alert'}>{feedback}</p> : null}
    </form>
  </section>;
}
