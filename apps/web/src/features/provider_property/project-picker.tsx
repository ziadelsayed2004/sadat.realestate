import { useEffect, useState } from 'react';
import type { SupportedLocale } from '@sadat-real-estate/contracts';
import { Button } from '../design_system/index.ts';
import type { ProviderProjectsData, ProviderProjectsLoader } from '../provider/projects-data.ts';

export function PropertyProjectPicker({ locale, label, value, onChange, load, error }: { locale: SupportedLocale; label: string; value: string; onChange: (id: string) => void; load: ProviderProjectsLoader; error?: string | undefined }) {
  const ar = locale === 'ar', [open, setOpen] = useState(false), [search, setSearch] = useState(''), [page, setPage] = useState(1), [attempt, setAttempt] = useState(0);
  const [data, setData] = useState<ProviderProjectsData>(), [state, setState] = useState<'loading' | 'success' | 'error'>('loading');
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController(); setState('loading');
    const timer = window.setTimeout(() => { void load({ page, limit: 100, ...(search.trim() ? { search: search.trim() } : {}) }, controller.signal).then(next => { if (!controller.signal.aborted) { setData(next); setState('success'); } }, () => { if (!controller.signal.aborted) setState('error'); }); }, search ? 300 : 0);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [open, search, page, attempt, load]);
  const items = data?.items.filter(item => item.status !== 'archived' && item.status !== 'rejected') ?? [];
  return <details open={open} onToggle={event => setOpen(event.currentTarget.open)} className="provider-property-wizard__field"><summary>{ar ? 'ربط الإعلان بمشروع (اختياري)' : 'Link to a project (optional)'}{value ? ' ✓' : ''}</summary>
    <p>{ar ? 'لو العقار ضمن مشروع مسجل عندك اختاره بالاسم. لو إعلان مستقل سيب الاختيار فاضي.' : 'Choose one of your registered projects by name. Leave empty for a standalone listing.'}</p>
    <label htmlFor="provider-property-project-search">{ar ? 'ابحث باسم المشروع' : 'Search your projects'}</label><input id="provider-property-project-search" type="search" value={search} maxLength={80} onChange={event => { setSearch(event.target.value); setPage(1); }} />
    <label htmlFor="provider-property-project">{label}</label><select id="provider-property-project" value={value} aria-invalid={Boolean(error)} onChange={event => onChange(event.target.value)}><option value="">{ar ? 'بدون مشروع' : 'No project'}</option>{value && !items.some(item => item.id === value) ? <option value={value}>{ar ? 'المشروع المرتبط حاليًا' : 'Currently linked project'}</option> : null}{items.map(item => <option key={item.id} value={item.id}>{item.name[locale] ?? item.name.ar ?? item.name.en}</option>)}</select>
    {error ? <p role="alert">{error}</p> : null}
    {open && state === 'loading' ? <p role="status">{ar ? 'جارٍ تحميل مشاريعك…' : 'Loading your projects…'}</p> : open && state === 'error' ? <p role="status">{ar ? 'تعذر تحميل المشاريع؛ اختيارك محفوظ.' : 'Projects could not load; your selection is preserved.'} <Button type="button" variant="secondary" onClick={() => setAttempt(n => n + 1)}>{ar ? 'إعادة المحاولة' : 'Retry'}</Button></p> : open && !items.length ? <p>{ar ? 'لا توجد مشاريع مطابقة. تقدر تضيف مشروعًا من صفحة «المشاريع» أو تكمل بإعلان مستقل.' : 'No matching projects. Add one from Projects, or continue with a standalone listing.'}</p> : null}
    {open && (data?.total ?? 0) > 100 ? <div><Button type="button" disabled={page === 1} onClick={() => setPage(n => n - 1)}>{ar ? 'السابق' : 'Previous'}</Button><Button type="button" disabled={page * 100 >= (data?.total ?? 0)} onClick={() => setPage(n => n + 1)}>{ar ? 'التالي' : 'Next'}</Button></div> : null}
  </details>;
}
