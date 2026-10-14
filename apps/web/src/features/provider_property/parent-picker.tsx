import { useEffect, useState } from 'react';
import type { PropertyData, SupportedLocale } from '@sadat-real-estate/contracts';
import { Button } from '../design_system/index.ts';
import type { ProviderPropertiesData } from '../provider/data.ts';
import type { ProviderPropertyCopy } from './copy.ts';
import type { ProviderPropertyParentsLoader } from './data.ts';

export function ParentPropertyPicker({ locale, copy, value, currentId, onChange, load, loadSelected, error }: {
  readonly locale: SupportedLocale;
  readonly copy: ProviderPropertyCopy;
  readonly value: string;
  readonly currentId?: string | undefined;
  readonly onChange: (id: string) => void;
  readonly load: ProviderPropertyParentsLoader;
  readonly loadSelected: (id: string) => Promise<PropertyData>;
  readonly error?: string | undefined;
}) {
  const text = copy.wizard.parentPicker;
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading');
  const [data, setData] = useState<ProviderPropertiesData>({ items: [], page: 1, limit: 100, total: 0 });
  const [selected, setSelected] = useState<PropertyData | undefined>();
  useEffect(() => {
    const controller = new AbortController();
    setState('loading');
    const timer = window.setTimeout(() => {
      void load({ page, ...(search.trim() ? { search: search.trim() } : {}) }, controller.signal).then(next => {
        if (!controller.signal.aborted) { setData(next); setState('success'); }
      }, () => { if (!controller.signal.aborted) setState('error'); });
    }, search ? 300 : 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [attempt, load, page, search]);
  useEffect(() => {
    let active = true;
    setSelected(undefined);
    if (value) void loadSelected(value).then(item => { if (active && item.id === value) setSelected(item); }, () => undefined);
    return () => { active = false; };
  }, [loadSelected, value]);
  const candidates = state === 'success' ? data.items.filter(item => item.kind === 'property' && item.id !== currentId && item.active && item.status !== 'archived') : [];
  const current = candidates.find(item => item.id === value) ?? selected;
  const name = (item: PropertyData) => item.name[locale] ?? item.name.ar ?? item.name.en ?? text.selected;
  return <div className="provider-property-wizard__field">
    <label htmlFor="provider-property-parent-search">{text.search}</label>
    <input id="provider-property-parent-search" type="search" maxLength={80} value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} />
    <label htmlFor="provider-property-parent">{copy.wizard.labels.parentPropertyId}</label>
    <select id="provider-property-parent" value={value} onChange={event => onChange(event.target.value)} aria-describedby={`provider-property-parent-help${error ? ' provider-property-parent-error' : ''}`} aria-invalid={error ? true : undefined}>
      <option value="">{copy.wizard.placeholders.parentPropertyId}</option>
      {value && !candidates.some(item => item.id === value) ? <option value={value}>{current ? name(current) : text.selected}</option> : null}
      {candidates.map(item => <option value={item.id} key={item.id}>{name(item)}</option>)}
    </select>
    <p id="provider-property-parent-help" className="provider-property-wizard__help">{text.help}</p>
    {error ? <small id="provider-property-parent-error" role="alert">{error}</small> : null}
    {state === 'loading' ? <p role="status">{text.loading}</p> : state === 'error' ? <div role="status"><p>{text.error}</p><Button type="button" variant="secondary" size="sm" onClick={() => setAttempt(previous => previous + 1)}>{copy.retry}</Button></div> : candidates.length === 0 ? <p role="status">{text.empty}</p> : null}
    {state === 'success' && (page > 1 || page * data.limit < data.total) ? <div className="provider-property-wizard__actions">
      <Button type="button" variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage(previous => previous - 1)}>{text.previous}</Button>
      <span>{page}</span>
      <Button type="button" variant="secondary" size="sm" disabled={page * data.limit >= data.total} onClick={() => setPage(previous => previous + 1)}>{text.next}</Button>
    </div> : null}
  </div>;
}
