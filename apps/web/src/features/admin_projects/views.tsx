import { useEffect, useMemo, useState } from 'react';
import type { ProjectData, ProjectListQuery, ProjectReviewAction, ProjectStatus, SupportedLocale } from '@sadat-real-estate/contracts';
import { ApiClientError } from '../contracts/index.ts';
import { AdminNavigation } from '../admin/index.ts';
import { Button, StateMessage } from '../design_system/index.ts';
import type { RouteSession } from '../routing/index.ts';
import {
  ADMIN_PROJECT_REVIEW_ROUTE,
  ADMIN_PROJECTS_ROUTE,
  createAdminProjectReviewMutation,
  createAdminProjectsLoader,
  type AdminProjectListData,
  type AdminProjectReviewMutation,
  type AdminProjectsAuthorizationSource,
  type AdminProjectsLoader
} from './data.ts';
import { getAdminProjectsCopy, type AdminProjectsState } from './copy.ts';
import './styles.css';

export interface AdminProjectsProps {
  readonly locale: SupportedLocale;
  readonly session: RouteSession;
  readonly authClient?: AdminProjectsAuthorizationSource | undefined;
  readonly apiOrigin?: string | undefined;
  readonly initialData?: AdminProjectListData | undefined;
  readonly initialState?: 'loading' | 'retry' | undefined;
  readonly load?: AdminProjectsLoader | undefined;
  readonly review?: AdminProjectReviewMutation | undefined;
  readonly reviewProjectId?: string | undefined;
}

const statuses: readonly ProjectStatus[] = ['draft', 'pending_review', 'needs_changes', 'approved', 'published', 'rejected', 'hidden', 'archived'];
const actions: readonly ProjectReviewAction[] = ['needs_changes', 'approve', 'reject', 'publish'];

function localePath(locale: SupportedLocale, path: string): string {
  const url = new URL(path, 'http://sadat-real-estate.local');
  url.searchParams.set('lang', locale);
  return `${url.pathname}${url.search}${url.hash}`;
}

function localizedValue(value: ProjectData['name'], locale: SupportedLocale): string {
  return value[locale] ?? value.ar ?? value.en ?? value['zh-CN'] ?? '';
}

function dateLabel(value: string, locale: SupportedLocale): string {
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(value));
  } catch {
    return '—';
  }
}

function stateForError(error: unknown, detail: boolean): Exclude<AdminProjectsState, 'loading' | 'empty' | 'success'> {
  if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) return 'permission';
  if (detail && error instanceof ApiClientError && error.status === 404) return 'not_found';
  if (error instanceof ApiClientError && (error.code === 'NETWORK_ERROR' || error.code === 'ABORTED')) return 'retry';
  return 'error';
}

function toneForStatus(status: ProjectStatus): 'success' | 'warning' | 'info' | 'error' | 'neutral' {
  if (status === 'approved' || status === 'published') return 'success';
  if (status === 'pending_review' || status === 'needs_changes') return 'warning';
  if (status === 'rejected') return 'error';
  if (status === 'draft') return 'info';
  return 'neutral';
}

function StatePanel({ state, locale, onRetry }: { readonly state: Exclude<AdminProjectsState, 'success' | 'empty' | 'not_found'>; readonly locale: SupportedLocale; readonly onRetry: () => void }) {
  const copy = getAdminProjectsCopy(locale);
  const message = copy.states[state];
  return (
    <section className="admin-projects__state" data-state={state} aria-label={message.title}>
      <StateMessage state={state} title={message.title} message={message.body} onRetry={state === 'retry' ? onRetry : undefined} retryLabel={copy.retry} />
      {state === 'error' ? <Button variant="secondary" size="sm" onClick={onRetry}>{copy.retry}</Button> : null}
    </section>
  );
}

function NotFoundPanel({ locale }: { readonly locale: SupportedLocale }) {
  const copy = getAdminProjectsCopy(locale).states.not_found;
  return <section className="admin-projects__state" data-state="not_found" aria-label={copy.title}><h2>{copy.title}</h2><p>{copy.body}</p></section>;
}

function StatusBadge({ status, locale }: { readonly status: ProjectStatus; readonly locale: SupportedLocale }) {
  const copy = getAdminProjectsCopy(locale);
  return <span className="admin-projects__badge" data-tone={toneForStatus(status)} data-status={status}>{copy.status[status]}</span>;
}

function ProjectMetricStrip({ data, locale, review }: { readonly data: AdminProjectListData; readonly locale: SupportedLocale; readonly review?: boolean }) {
  const copy = getAdminProjectsCopy(locale);
  const counts = Object.fromEntries(statuses.map(status => [status, data.items.filter(project => project.status === status).length])) as Record<ProjectStatus, number>;
  const labels = review
    ? (locale === 'ar' ? ['\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0645\u0634\u0631\u0648\u0639\u0627\u062a', copy.status.pending_review, copy.status.needs_changes, '\u0627\u0644\u0633\u062c\u0644\u0627\u062a \u0627\u0644\u0645\u062d\u0645\u0644\u0629'] : ['Total projects', copy.status.pending_review, copy.status.needs_changes, 'Loaded records'])
    : (locale === 'ar' ? ['\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0645\u0634\u0631\u0648\u0639\u0627\u062a', '\u0627\u0644\u0633\u062c\u0644\u0627\u062a \u0627\u0644\u0645\u062d\u0645\u0644\u0629', copy.status.published, copy.status.pending_review, copy.status.needs_changes, copy.status.draft]
      : ['Total projects', 'Loaded records', copy.status.published, copy.status.pending_review, copy.status.needs_changes, copy.status.draft]);
  const values = review ? [data.total, counts.pending_review, counts.needs_changes, data.items.length] : [data.total, data.items.length, counts.published, counts.pending_review, counts.needs_changes, counts.draft];
  const colors = review ? ['#1b2942', '#bf6500', '#bf6500', '#2f68c9'] : ['#1b2942', '#2f68c9', '#00854a', '#bf6500', '#bf6500', '#2f68c9'];
  return (
    <section aria-label={locale === 'ar' ? '\u0645\u0624\u0634\u0631\u0627\u062a \u0627\u0644\u0645\u0634\u0631\u0648\u0639\u0627\u062a' : 'Project metrics'} className="admin-dashboard__metric-section" style={{ marginBlockStart: 0 }}>
      <div className="admin-dashboard__metric-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))' }}>
        {values.map((value, index) => <article className="admin-dashboard__metric" data-testid={`admin-project-metric-${index}`} key={labels[index]}><strong style={{ color: colors[index] }}>{new Intl.NumberFormat(locale).format(value)}</strong><span>{labels[index]}</span></article>)}
      </div>
    </section>
  );
}

function ProjectStatusStrip({ locale, selected, onSelect }: { readonly locale: SupportedLocale; readonly selected: ProjectStatus | ''; readonly onSelect: (status: ProjectStatus | '') => void }) {
  const copy = getAdminProjectsCopy(locale);
  const allLabel = locale === 'ar' ? '\u0627\u0644\u0643\u0644' : locale === 'zh-CN' ? '\u5168\u90e8' : 'All';
  return (
    <div role="tablist" aria-label={locale === 'ar' ? '\u062d\u0627\u0644\u0629 \u0627\u0644\u0645\u0634\u0631\u0648\u0639' : 'Project status'} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, maxWidth: 1320, margin: '0 auto 12px', padding: 8, border: '1px solid #e3e5e7', borderRadius: 16, background: '#fff', boxShadow: '0 6px 16px #3232320d' }}>
      {[['', allLabel] as const, ...statuses.map(status => [status, copy.status[status]] as const)].map(([value, label]) => {
        const active = selected === value;
        return <button aria-selected={active} data-filter-value={value || 'all'} key={value || 'all'} onClick={() => onSelect(value)} role="tab" style={{ minHeight: 38, padding: '8px 16px', border: 0, borderRadius: 999, background: active ? '#155b4f' : 'transparent', color: active ? '#fff' : '#69768b', cursor: 'pointer', fontWeight: 800 }} type="button">{label}</button>;
      })}
    </div>
  );
}

function ProjectTable({ projects, locale, onReview }: { readonly projects: readonly ProjectData[]; readonly locale: SupportedLocale; readonly onReview: (id: string) => void }) {
  const copy = getAdminProjectsCopy(locale);
  return (
    <div className="admin-projects__table-wrap">
      <table className="admin-projects__table">
        <thead>
          <tr>
            <th scope="col">{copy.columns.id}</th>
            <th scope="col">{copy.columns.name}</th>
            <th scope="col">{copy.columns.slug}</th>
            <th scope="col">{copy.columns.status}</th>
            <th scope="col">{copy.columns.version}</th>
            <th scope="col">{copy.columns.updated}</th>
            <th scope="col">{copy.columns.actions}</th>
          </tr>
        </thead>
        <tbody>
          {projects.map(project => (
            <tr key={project.id} data-testid={`admin-project-${project.id}`}>
              <td><code>{project.id}</code></td>
              <td><strong>{localizedValue(project.name, locale)}</strong></td>
              <td>{project.slug}</td>
              <td><StatusBadge status={project.status} locale={locale} /></td>
              <td>{project.version}</td>
              <td>{dateLabel(project.updatedAt, locale)}</td>
              <td>
                <div className="admin-projects__row-actions">
                  {project.availableActions.some(action => actions.includes(action as ProjectReviewAction)) ? <Button size="sm" variant="secondary" onClick={() => onReview(project.id)}>{copy.review}</Button> : <span className="admin-projects__muted">{copy.noActions}</span>}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReviewPanel({ project, locale, onBack, review }: { readonly project: ProjectData; readonly locale: SupportedLocale; readonly onBack: () => void; readonly review: AdminProjectReviewMutation }) {
  const copy = getAdminProjectsCopy(locale);
  const availableActions = actions.filter(action => project.availableActions.includes(action));
  const [action, setAction] = useState<ProjectReviewAction | ''>(availableActions[0] ?? '');
  const [reason, setReason] = useState('');
  const [mutationState, setMutationState] = useState<'idle' | 'saving' | 'error' | 'permission'>('idle');
  const [feedback, setFeedback] = useState<string | undefined>();

  async function submit(): Promise<void> {
    if (action === '' || reason.trim().length < 5) {
      setMutationState('error');
      setFeedback(copy.reasonRequired);
      return;
    }
    setMutationState('saving');
    setFeedback(undefined);
    try {
      await review(project.id, { version: project.version, action, reason: reason.trim() });
      setMutationState('idle');
      setFeedback(copy.reviewSaved);
    } catch (error) {
      setMutationState(error instanceof ApiClientError && (error.status === 401 || error.status === 403) ? 'permission' : 'error');
      setFeedback(error instanceof ApiClientError && (error.status === 401 || error.status === 403) ? copy.states.permission.body : copy.states.error.body);
    }
  }

  return (
    <section className="admin-projects__review" data-route={ADMIN_PROJECT_REVIEW_ROUTE} data-device-scope="desktop">
      <div className="admin-projects__review-heading">
        <div>
          <p className="admin-projects__eyebrow">{copy.eyebrow}</p>
          <h1>{copy.reviewTitle}</h1>
          <p>{copy.reviewDescription}</p>
        </div>
        <Button variant="secondary" onClick={onBack}>{copy.back}</Button>
      </div>
      <div className="admin-projects__review-grid">
        <article className="admin-projects__detail-card">
          <p className="admin-projects__eyebrow">{project.slug}</p>
          <h2>{localizedValue(project.name, locale)}</h2>
          <dl>
            <div><dt>{copy.columns.id}</dt><dd><code>{project.id}</code></dd></div>
            <div><dt>{copy.columns.status}</dt><dd><StatusBadge status={project.status} locale={locale} /></dd></div>
            <div><dt>{copy.columns.version}</dt><dd>{project.version}</dd></div>
            <div><dt>{copy.columns.updated}</dt><dd>{dateLabel(project.updatedAt, locale)}</dd></div>
            {project.reviewReason !== undefined ? <div><dt>{copy.reasonLabel}</dt><dd>{project.reviewReason}</dd></div> : null}
          </dl>
        </article>
        <form className="admin-projects__action-card" onSubmit={event => { event.preventDefault(); void submit(); }}>
          <h2>{copy.reviewTitle}</h2>
          {availableActions.length > 0 ? (
            <fieldset disabled={mutationState === 'saving'}>
              <legend>{copy.columns.actions}</legend>
              <div className="admin-projects__action-list">
                {availableActions.map(option => <label key={option} className="admin-projects__action-option"><input type="radio" name="project-review-action" value={option} checked={action === option} onChange={() => setAction(option)} />{copy.action[option]}</label>)}
              </div>
              <label className="admin-projects__field" htmlFor="admin-project-review-reason">{copy.reasonLabel}</label>
              <textarea id="admin-project-review-reason" value={reason} onChange={event => setReason(event.target.value)} placeholder={copy.reasonPlaceholder} minLength={5} maxLength={500} aria-required="true" />
              <Button type="submit" loading={mutationState === 'saving'} disabled={mutationState === 'permission'}>{mutationState === 'saving' ? copy.reviewing : copy.submitReview}</Button>
            </fieldset>
          ) : <p className="admin-projects__muted">{copy.noActions}</p>}
          {feedback !== undefined ? <p className="admin-projects__feedback" data-tone={mutationState === 'error' || mutationState === 'permission' ? 'error' : 'success'} role="status">{feedback}</p> : null}
        </form>
      </div>
    </section>
  );
}

export function AdminProjects({ locale, session, authClient, apiOrigin, initialData, initialState = 'loading', load, review, reviewProjectId }: AdminProjectsProps) {
  const copy = getAdminProjectsCopy(locale);
  const pathname = typeof window === 'undefined' ? ADMIN_PROJECTS_ROUTE : new URL(window.location.href).pathname.replace(/\/+$/u, '') || '/';
  const isReview = pathname === ADMIN_PROJECT_REVIEW_ROUTE;
  const [state, setState] = useState<AdminProjectsState>(() => initialData === undefined ? initialState : initialData.items.length === 0 ? 'empty' : 'success');
  const [data, setData] = useState<AdminProjectListData | undefined>(initialData);
  const [query, setQuery] = useState<Partial<ProjectListQuery>>({ page: 1, limit: 20, sort: 'updatedAt', direction: 'desc' });
  const [searchInput, setSearchInput] = useState('');
  const [statusInput, setStatusInput] = useState<ProjectStatus | ''>('');
  const [attempt, setAttempt] = useState(0);
  const source = useMemo(() => load ?? createAdminProjectsLoader({ apiOrigin, authorization: authClient }), [apiOrigin, authClient, load]);
  const reviewMutation = useMemo(() => review ?? createAdminProjectReviewMutation({ apiOrigin, authorization: authClient }), [apiOrigin, authClient, review]);
  const selectedProjectId = reviewProjectId ?? (typeof window === 'undefined' ? undefined : new URL(window.location.href).searchParams.get('projectId') ?? undefined);
  const selectedProject = data?.items.find(item => item.id === selectedProjectId);
  const sessionAllowed = session.status === 'authenticated' && session.role === 'admin';

  useEffect(() => {
    if (!sessionAllowed) {
      setState('permission');
      return undefined;
    }
    if (initialData !== undefined && attempt === 0) {
      if (isReview && selectedProjectId !== undefined && selectedProject === undefined) setState('not_found');
      return undefined;
    }
    const controller = new AbortController();
    setState('loading');
    void source({ page: query.page ?? 1, limit: query.limit ?? 20, sort: query.sort ?? 'updatedAt', direction: query.direction ?? 'desc', ...(query.search === undefined ? {} : { search: query.search }), ...(query.status === undefined ? {} : { status: query.status }) }, controller.signal).then(nextData => {
      if (controller.signal.aborted) return;
      setData(nextData);
      setState(isReview && selectedProjectId !== undefined && !nextData.items.some(item => item.id === selectedProjectId) ? 'not_found' : nextData.items.length === 0 ? 'empty' : 'success');
    }).catch(error => {
      if (!controller.signal.aborted) setState(stateForError(error, isReview));
    });
    return () => controller.abort();
  }, [attempt, initialData, isReview, query, selectedProjectId, sessionAllowed, source]);

  function applyFilters(): void {
    setQuery(current => ({ ...current, page: 1, ...(searchInput.trim() === '' ? { search: undefined } : { search: searchInput.trim() }), ...(statusInput === '' ? { status: undefined } : { status: statusInput }) }));
    setAttempt(value => value + 1);
  }

  function clearFilters(): void {
    setSearchInput('');
    setStatusInput('');
    setQuery({ page: 1, limit: 20, sort: 'updatedAt', direction: 'desc' });
    setAttempt(value => value + 1);
  }

  const page = data?.page ?? 1;
  const limit = data?.limit ?? 20;
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const reviewPath = (id: string) => localePath(locale, `${ADMIN_PROJECT_REVIEW_ROUTE}?projectId=${encodeURIComponent(id)}`);

  return (
    <section className="admin-projects" data-screen-id={isReview ? 'ADM-13' : 'ADM-12'} data-route={isReview ? ADMIN_PROJECT_REVIEW_ROUTE : ADMIN_PROJECTS_ROUTE} data-device-scope="desktop" data-admin-projects-state={state}>
      <AdminNavigation locale={locale} activePath={pathname} />
      <div className="admin-projects__content">
        {!isReview ? <>
          <div className="admin-projects__heading">
            <div><p className="admin-projects__eyebrow">{copy.eyebrow}</p><h1>{copy.listTitle}</h1><p>{copy.listDescription}</p></div>
            <a className="admin-projects__all-link" href={localePath(locale, ADMIN_PROJECTS_ROUTE)}>{copy.allProjects}</a>
          </div>
          {state === 'success' && data !== undefined ? <ProjectMetricStrip data={data} locale={locale} /> : null}
          <ProjectStatusStrip locale={locale} selected={statusInput} onSelect={status => { setStatusInput(status); setQuery(current => ({ ...current, page: 1, ...(status === '' ? { status: undefined } : { status }) })); setAttempt(value => value + 1); }} />
          <form className="admin-projects__filters" role="search" aria-label={copy.searchLabel} onSubmit={event => { event.preventDefault(); applyFilters(); }}>
            <label htmlFor="admin-projects-search">{copy.searchLabel}</label>
            <input id="admin-projects-search" type="search" value={searchInput} onChange={event => setSearchInput(event.target.value)} placeholder={copy.searchPlaceholder} />
            <label htmlFor="admin-projects-status">{copy.statusLabel}</label>
            <select id="admin-projects-status" value={statusInput} onChange={event => setStatusInput(event.target.value as ProjectStatus | '')}>
              <option value="">{copy.allStatuses}</option>
              {statuses.map(status => <option key={status} value={status}>{copy.status[status]}</option>)}
            </select>
            <Button type="submit">{copy.apply}</Button>
            <Button type="button" variant="secondary" onClick={clearFilters}>{copy.clear}</Button>
          </form>
        </> : null}
        {state === 'loading' || state === 'retry' || state === 'error' || state === 'permission' ? <StatePanel state={state} locale={locale} onRetry={() => setAttempt(value => value + 1)} /> : null}
        {state === 'not_found' ? <NotFoundPanel locale={locale} /> : null}
        {!isReview && state === 'empty' ? <section className="admin-projects__empty" data-state="empty"><h2>{copy.states.empty.title}</h2><p>{copy.states.empty.body}</p></section> : null}
        {!isReview && state === 'success' && data !== undefined ? <>
          <section className="admin-projects__panel" aria-labelledby="admin-projects-table-title">
            <div className="admin-projects__panel-heading"><div><h2 id="admin-projects-table-title">{copy.allProjects}</h2><p>{copy.count(data.total)}</p></div><span className="admin-projects__direction-note">{copy.directionNote}</span></div>
            <ProjectTable projects={data.items} locale={locale} onReview={id => { window.location.href = reviewPath(id); }} />
            <div className="admin-projects__pagination"><Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => { setQuery(current => ({ ...current, page: page - 1 })); setAttempt(value => value + 1); }}>{copy.previous}</Button><span>{copy.page(page, totalPages)}</span><Button size="sm" variant="secondary" disabled={page >= totalPages} onClick={() => { setQuery(current => ({ ...current, page: page + 1 })); setAttempt(value => value + 1); }}>{copy.next}</Button></div>
          </section>
        </> : null}
        {isReview && state === 'success' && data !== undefined ? <ProjectMetricStrip data={data} locale={locale} review /> : null}
        {isReview && state === 'success' && selectedProject !== undefined ? <ReviewPanel project={selectedProject} locale={locale} review={reviewMutation} onBack={() => { window.location.href = localePath(locale, ADMIN_PROJECTS_ROUTE); }} /> : null}
      </div>
    </section>
  );
}
