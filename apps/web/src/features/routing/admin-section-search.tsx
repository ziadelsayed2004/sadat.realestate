import { useRef, useState } from 'react';
import type { SupportedLocale } from '@sadat-real-estate/contracts';
import { sidebarGroups } from './admin-navigation-model.ts';

const normalize = (value: string) => value.normalize('NFKD').replace(/[\u064b-\u065f\u0670\u0640]/gu, '').replace(/[أإآ]/gu, 'ا').toLowerCase().trim();

export function AdminSectionSearch({ locale, label, placeholder }: { readonly locale: SupportedLocale; readonly label: string; readonly placeholder: string }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);
  const ar = locale === 'ar';
  const term = normalize(query);
  const matches = term ? sidebarGroups.flatMap(group => group.items.filter(item => normalize(`${item.label.ar} ${item.label.en}`).includes(term))) : [];
  const results = matches.slice(0, 8);
  return <div className="admin-shell-header__search admin-section-search" onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }} onKeyDown={event => {
    if (event.key === 'Escape') { event.currentTarget.querySelector('input')?.focus(); setOpen(false); }
  }}>
    <label className="a11y-visually-hidden" htmlFor="admin-section-search">{label}</label>
    <input id="admin-section-search" type="search" value={query} maxLength={80} placeholder={placeholder} aria-expanded={open && Boolean(term)} aria-controls="admin-section-search-results" onFocus={() => setOpen(true)} onChange={event => { setQuery(event.target.value); setOpen(true); }} onKeyDown={event => {
      if (event.key === 'ArrowDown' || event.key === 'Enter') {
        event.preventDefault();
        if (results.length) { setOpen(true); resultsRef.current?.querySelector('a')?.focus(); }
      }
    }} />
    {open && term ? <div ref={resultsRef} id="admin-section-search-results" className="admin-section-search__results">
      <p>{ar ? 'افتح القسم، ثم ابحث داخل قائمته.' : 'Open a section, then search its list.'}</p>
      {results.length ? <ul>{results.map(item => <li key={item.id}><a href={`${item.path}?lang=${locale}`}>{item.label[locale]}</a></li>)}</ul> : <p role="status">{ar ? 'لا يوجد قسم بهذا الاسم.' : 'No section matches this name.'}</p>}
    </div> : null}
  </div>;
}
