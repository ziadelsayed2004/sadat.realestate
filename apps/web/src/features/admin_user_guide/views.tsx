import { useEffect, useMemo, useRef, useState } from 'react';
import type { SupportedLocale } from '@sadat-real-estate/contracts';
import { AdminNavigation } from '../admin/overview.tsx';
import type { RouteSession } from '../routing/index.ts';
import { GUIDE_SECTIONS, searchGuide } from './content.ts';
import { getUserGuideCopy } from './copy.ts';
import './styles.css';

const STORAGE_KEY = 'sadat-admin-user-guide-v1';
const topicIds = new Set(GUIDE_SECTIONS.flatMap(section => section.topics.map(topic => topic.id)));
interface Preferences { opened: string[]; last: string; large: boolean }
const initialPreferences: Preferences = { opened: ['use-guide'], last: '', large: false };

function taskPath(path: string, locale: SupportedLocale): string {
  const url = new URL(path, 'https://elsadatrealestate.com');
  url.searchParams.set('lang', locale);
  return `${url.pathname}${url.search}`;
}

export default function AdminUserGuide({ locale, session }: { readonly locale: SupportedLocale; readonly session: RouteSession }) {
  const copy = getUserGuideCopy(locale);
  const allowed = session.status === 'authenticated' && session.role === 'admin';
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [preferences, setPreferences] = useState<Preferences>(initialPreferences);
  const [ready, setReady] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [message, setMessage] = useState('');
  const [jump, setJump] = useState('');
  const panel = useRef<HTMLDivElement>(null);
  const restoreFocus = useRef<HTMLElement | null>(null);
  const visible = useMemo(() => searchGuide(query, category), [query, category]);
  const visibleIds = useMemo(() => visible.flatMap(section => section.topics.map(topic => topic.id)), [visible]);
  const opened = new Set(preferences.opened);

  useEffect(() => {
    if (!allowed) return;
    let saved: Preferences = initialPreferences;
    try {
      const raw: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
      if (raw !== null && typeof raw === 'object') {
        const value = raw as Record<string, unknown>;
        saved = { opened: Array.isArray(value.opened) ? value.opened.filter((id): id is string => typeof id === 'string' && topicIds.has(id)) : initialPreferences.opened, last: typeof value.last === 'string' && topicIds.has(value.last) ? value.last : '', large: value.large === true };
      }
    } catch { /* Reading remains available when storage is disabled. */ }
    const hashTopic = window.location.hash.replace('#guide-', '');
    if (topicIds.has(hashTopic)) {
      saved = { ...saved, opened: [...new Set([...saved.opened, hashTopic])], last: hashTopic };
      setJump(hashTopic);
    }
    setPreferences(saved);
    setReady(true);
  }, [allowed]);

  useEffect(() => {
    if (!ready || !allowed) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences)); } catch { /* No persistence is required to read. */ }
  }, [preferences, ready, allowed]);

  useEffect(() => {
    if (!allowed) return;
    const followHash = () => {
      const id = window.location.hash.replace('#guide-', '');
      if (!topicIds.has(id)) return;
      setQuery(''); setCategory('all'); setMinimized(false);
      setPreferences(value => ({ ...value, opened: [...new Set([...value.opened, id])], last: id }));
      setJump(id);
    };
    window.addEventListener('hashchange', followHash);
    window.addEventListener('popstate', followHash);
    return () => { window.removeEventListener('hashchange', followHash); window.removeEventListener('popstate', followHash); };
  }, [allowed]);

  useEffect(() => {
    if (query.trim() !== '') setPreferences(value => ({ ...value, opened: [...new Set([...value.opened, ...visibleIds])] }));
  }, [query, visibleIds]);

  useEffect(() => {
    if (jump === '' || minimized) return;
    // Fragment navigation can reset focus after the hashchange event. Finish it first.
    const timeout = window.setTimeout(() => {
      const target = document.getElementById(`guide-toggle-${jump}`);
      target?.scrollIntoView?.({ behavior: 'auto', block: 'start' });
      target?.focus({ preventScroll: true });
      setJump('');
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [jump, minimized, visible]);

  useEffect(() => {
    if (!maximized || panel.current === null) return;
    const readingPanel = panel.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const siblings: { element: HTMLElement; inert: boolean }[] = [];
    let current: HTMLElement | null = readingPanel;
    while (current?.parentElement !== null && current?.parentElement !== undefined) {
      for (const sibling of current.parentElement.children) {
        if (sibling !== current && sibling instanceof HTMLElement) {
          siblings.push({ element: sibling, inert: sibling.inert });
          sibling.inert = true;
        }
      }
      current = current.parentElement;
      if (current === document.body) break;
    }
    readingPanel.querySelector<HTMLButtonElement>('[data-guide-restore]')?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setMaximized(false); }
      if (event.key !== 'Tab') return;
      const focusable = [...readingPanel.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input, select')].filter(element => !element.closest('[hidden]'));
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      for (const sibling of siblings) sibling.element.inert = sibling.inert;
      document.removeEventListener('keydown', onKey);
      restoreFocus.current?.focus();
    };
  }, [maximized]);

  function openTopic(id: string) {
    setQuery(''); setCategory('all'); setMinimized(false);
    setPreferences(value => ({ ...value, opened: [...new Set([...value.opened, id])], last: id }));
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#guide-${id}`);
    setJump(id);
  }
  function toggleTopic(id: string) {
    setPreferences(value => ({ ...value, last: id, opened: value.opened.includes(id) ? value.opened.filter(item => item !== id) : [...value.opened, id] }));
  }
  function toggleGroup(ids: readonly string[]) {
    const close = ids.every(id => opened.has(id));
    setPreferences(value => ({ ...value, opened: close ? value.opened.filter(id => !ids.includes(id)) : [...new Set([...value.opened, ...ids])] }));
  }
  async function shareTopic(id: string) {
    try {
      const url = new URL(`/admin/user-guide?lang=${locale}#guide-${id}`, window.location.origin);
      await navigator.clipboard.writeText(url.href);
      setMessage(copy.copied);
    } catch { setMessage(copy.copyFailed); }
  }

  if (!allowed) return <p role="alert">{copy.permission}</p>;
  return <section className="admin-user-guide" data-testid="admin-user-guide">
    <AdminNavigation locale={locale} activePath="/admin/user-guide" />
    <div className="user-guide" ref={panel} data-maximized={maximized} data-large={preferences.large} {...(maximized ? { role: 'dialog', 'aria-modal': true as const } : {})} aria-labelledby="user-guide-title">
      <header className="user-guide__header" id="user-guide-top">
        <div><p className="user-guide__eyebrow">{copy.eyebrow}</p><h1 id="user-guide-title">{copy.title}</h1><p>{copy.description}</p><small>{copy.language}</small></div>
        <div className="user-guide__window-controls">
          <button type="button" aria-expanded={!minimized} aria-controls="user-guide-reading" onClick={() => { setMinimized(value => !value); setMaximized(false); }}>{minimized ? copy.expand : copy.minimize}</button>
          <button type="button" data-guide-restore aria-pressed={maximized} onClick={() => { restoreFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; setMinimized(false); setMaximized(value => !value); }}>{maximized ? copy.restore : copy.maximize}</button>
        </div>
      </header>
      {minimized ? <p className="user-guide__minimized" role="status">{copy.minimized}</p> : null}
      <div id="user-guide-reading" hidden={minimized}>
        <div className="user-guide__toolbar">
          <div className="user-guide__search"><label htmlFor="user-guide-search">{copy.search}</label><input id="user-guide-search" type="search" value={query} placeholder={copy.placeholder} onChange={event => setQuery(event.target.value)} /></div>
          <div><label htmlFor="user-guide-category">{copy.category}</label><select id="user-guide-category" value={category} onChange={event => setCategory(event.target.value)}><option value="all">{copy.all}</option>{GUIDE_SECTIONS.map(section => <option key={section.id} value={section.id}>{section.title}</option>)}</select></div>
          <div className="user-guide__actions">
            <button type="button" onClick={() => setPreferences(value => ({ ...value, opened: [...new Set([...value.opened, ...visibleIds])] }))}>{copy.openAll}</button>
            <button type="button" onClick={() => setPreferences(value => ({ ...value, opened: value.opened.filter(id => !visibleIds.includes(id)) }))}>{copy.closeAll}</button>
            <button type="button" aria-pressed={preferences.large} aria-label={`${copy.textSize}: ${preferences.large ? copy.large : copy.normal}`} onClick={() => setPreferences(value => ({ ...value, large: !value.large }))}>A<span aria-hidden="true">{preferences.large ? '−' : '+'}</span></button>
            <button type="button" onClick={() => window.print()}>{copy.print}</button>
            <button type="button" onClick={() => { setQuery(''); setCategory('all'); }}>{copy.clear}</button>
          </div>
          <p className="user-guide__count" role="status">{visibleIds.length} {copy.count}</p>
        </div>
        <p className="user-guide__link-note">{copy.tabNote}</p>
        <p className="user-guide__feedback" role="status">{message}</p>
        <div className="user-guide__layout">
          <nav className="user-guide__toc" aria-label={copy.toc}>
            <h2>{copy.toc}</h2>
            {preferences.last !== '' ? <button type="button" onClick={() => openTopic(preferences.last)}>{copy.resume}</button> : null}
            {visible.map(section => <div key={section.id}><h3>{section.title}</h3><ul>{section.topics.map(item => <li key={item.id}><a href={`#guide-${item.id}`} aria-current={preferences.last === item.id ? 'location' : undefined} onClick={event => { event.preventDefault(); openTopic(item.id); }}>{item.title}</a></li>)}</ul></div>)}
          </nav>
          <div className="user-guide__chapters" lang="ar" dir="rtl">
            {visible.length === 0 ? <div className="user-guide__empty"><h2>{copy.empty}</h2><p>{copy.emptyHelp}</p><button type="button" onClick={() => { setQuery(''); setCategory('all'); }}>{copy.clear}</button></div> : null}
            {visible.map(section => <section key={section.id} className="user-guide__section" aria-labelledby={`guide-section-${section.id}`}>
              <div className="user-guide__section-heading"><div><h2 id={`guide-section-${section.id}`}>{section.title}</h2><p>{section.description}</p></div><button type="button" aria-label={`${section.topics.every(item => opened.has(item.id)) ? copy.closeAll : copy.openAll}: ${section.title}`} onClick={() => toggleGroup(section.topics.map(item => item.id))}>{section.topics.every(item => opened.has(item.id)) ? '−' : '+'}</button></div>
              {section.topics.map(item => <article key={item.id} className="user-guide__topic" id={`guide-${item.id}`}>
                <h3><button type="button" id={`guide-toggle-${item.id}`} aria-expanded={opened.has(item.id)} aria-controls={`guide-body-${item.id}`} onClick={() => toggleTopic(item.id)}><span><strong>{item.title}</strong><small>{item.summary}</small></span><span className="user-guide__chevron" aria-hidden="true">{opened.has(item.id) ? '−' : '+'}</span></button></h3>
                <div className="user-guide__body" id={`guide-body-${item.id}`} hidden={!opened.has(item.id)}>
                  <div className="user-guide__before"><h4>{copy.before}</h4><p>{item.before}</p></div>
                  {item.limitation === undefined ? null : <aside className="user-guide__limit"><h4>{copy.limitation}</h4><p>{item.limitation}</p></aside>}
                  <h4>{copy.steps}</h4><ol>{item.steps.map(step => <li key={step}>{step}</li>)}</ol>
                  <h4>{copy.fields}</h4><dl>{item.fields.map(([label, explanation]) => <div key={label}><dt>{label}</dt><dd>{explanation}</dd></div>)}</dl>
                  <div className="user-guide__result"><h4>{copy.result}</h4><p>{item.result}</p></div>
                  <h4>{copy.faq}</h4><div className="user-guide__faq">{item.questions.map(([question, answer]) => <div key={question}><h5>{question}</h5><p>{answer}</p></div>)}</div>
                  <h4>{copy.links}</h4><div className="user-guide__links">{item.links.map(link => <a key={`${link.path}-${link.label}`} href={taskPath(link.path, locale)} target="_blank" rel="noopener noreferrer">{link.label}<span aria-hidden="true"> ↗</span></a>)}</div>
                  <footer><button type="button" onClick={() => { void shareTopic(item.id); }}>{copy.share}</button><a href="#user-guide-top" onClick={event => { event.preventDefault(); document.getElementById('user-guide-top')?.scrollIntoView?.({ block: 'start' }); panel.current?.querySelector<HTMLButtonElement>('.user-guide__window-controls button')?.focus({ preventScroll: true }); }}>{copy.top}</a></footer>
                </div>
              </article>)}
            </section>)}
          </div>
        </div>
      </div>
    </div>
  </section>;
}
