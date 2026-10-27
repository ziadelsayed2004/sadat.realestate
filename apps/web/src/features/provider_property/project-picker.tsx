import { useEffect, useState } from 'react';
import type { SupportedLocale } from '@sadat-real-estate/contracts';
import { Button } from '../design_system/index.ts';
import { ApiClientError } from '../contracts/index.ts';
import type { ProviderProjectsData, ProviderProjectsLoader } from '../provider/projects-data.ts';

export function PropertyProjectPicker({ locale, label, value, onChange, load, error }: { locale: SupportedLocale; label: string; value: string; onChange: (id: string) => void; load: ProviderProjectsLoader; error?: string | undefined }) {
  const ar = locale === 'ar', [search, setSearch] = useState(''), [page, setPage] = useState(1), [attempt, setAttempt] = useState(0);
  const [data, setData] = useState<ProviderProjectsData>(), [state, setState] = useState<'loading' | 'success' | 'error' | 'unavailable'>('loading');
  useEffect(() => {
    const controller = new AbortController(); setState('loading');
    const timer = window.setTimeout(() => { void Promise.resolve().then(() => load({ page, limit: 100, ...(search.trim() ? { search: search.trim() } : {}) }, controller.signal)).then(next => { if (!controller.signal.aborted) { setData(next); setState('success'); } }, error => { if (!controller.signal.aborted) setState(error instanceof ApiClientError && error.status === 403 ? 'unavailable' : 'error'); }); }, search ? 300 : 0);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [search, page, attempt, load]);
  const items = data?.items.filter(item => item.status !== 'archived' && item.status !== 'rejected') ?? [];
  if (state === 'unavailable' && !value) return <p>{ar ? 'المشروعات متاحة لشركات التطوير المعتمدة. حساب المكتب أو مالك العقار يكمل بإعلان عقار مستقل.' : 'Projects are available to approved developers. Offices and property owners can continue with a standalone property listing.'}</p>;
  return <section className="provider-property-wizard__field"><h3>{ar ? 'ربط الإعلان بمشروع (اختياري)' : 'Link to a project (optional)'}{value ? ' ✓' : ''}</h3>
    <p>{ar ? 'لو العقار ضمن مشروع مسجل عندك اختاره بالاسم. لو إعلان مستقل سيب الاختيار فاضي.' : 'Choose one of your registered projects by name. Leave empty for a standalone listing.'}</p>
    <details><summary>{ar ? 'بحث في مشاريعك (اختياري)' : 'Search your projects (optional)'}</summary><label htmlFor="provider-property-project-search">{ar ? 'ابحث باسم المشروع' : 'Search your projects'}</label><input id="provider-property-project-search" type="search" value={search} maxLength={80} onChange={event => { setSearch(event.target.value); setPage(1); }} /></details>
    <label htmlFor="provider-property-project">{label}</label><select id="provider-property-project" value={value} aria-invalid={Boolean(error)} onChange={event => onChange(event.target.value)}><option value="">{ar ? 'بدون مشروع' : 'No project'}</option>{value && !items.some(item => item.id === value) ? <option value={value}>{ar ? 'المشروع المرتبط حاليًا' : 'Currently linked project'}</option> : null}{items.map(item => <option key={item.id} value={item.id}>{item.name[locale] ?? item.name.ar ?? item.name.en}</option>)}</select>
    {error ? <p role="alert">{error}</p> : null}
    {state === 'loading' ? <p aria-live="polite">{ar ? 'جارٍ تحميل مشاريعك…' : 'Loading your projects…'}</p> : state === 'error' ? <p aria-live="polite">{ar ? 'تعذر تحميل المشاريع؛ اختيارك محفوظ.' : 'Projects could not load; your selection is preserved.'} <Button type="button" variant="secondary" onClick={() => setAttempt(n => n + 1)}>{ar ? 'إعادة المحاولة' : 'Retry'}</Button></p> : !items.length ? <p>{ar ? 'لا توجد مشاريع مطابقة. تقدر تضيف مشروعًا من صفحة «المشاريع» أو تكمل بإعلان مستقل.' : 'No matching projects. Add one from Projects, or continue with a standalone listing.'}</p> : null}
    {(data?.total ?? 0) > 100 ? <div><Button type="button" disabled={page === 1} onClick={() => setPage(n => n - 1)}>{ar ? 'السابق' : 'Previous'}</Button><Button type="button" disabled={page * 100 >= (data?.total ?? 0)} onClick={() => setPage(n => n + 1)}>{ar ? 'التالي' : 'Next'}</Button></div> : null}
  </section>;
}
