import { useEffect, useMemo, useState } from 'react';
import type { PropertyAdminListQuery, PropertyAvailableAction, PropertyData, PropertyDuplicateData, PropertyReportAction, PropertyReportData, PropertyReportListData, PropertyReportListQuery, PropertyReportStatus, PropertyReviewAction, PropertyStatus, PropertyVisibilityAction, SupportedLocale } from '@sadat-real-estate/contracts';
import { ApiClientError } from '../contracts/index.ts';
import { AdminNavigation } from '../admin/index.ts';
import { Button, StateMessage } from '../design_system/index.ts';
import type { RouteSession } from '../routing/index.ts';
import {
  ADMIN_PROPERTIES_ROUTE,
  ADMIN_PROPERTY_DUPLICATES_ROUTE,
  ADMIN_PROPERTY_REPORTS_ROUTE,
  ADMIN_PROPERTY_REVIEW_ROUTE,
  createAdminPropertiesLoader,
  createAdminPropertyDuplicatesLoader,
  createAdminPropertyReportResolver,
  createAdminPropertyReportsLoader,
  createAdminPropertyReviewMutation,
  createAdminPropertyVisibilityMutation,
  type AdminPropertiesAuthorizationSource,
  type AdminPropertyDuplicatesLoader,
  type AdminPropertyListData,
  type AdminPropertyReportResolver,
  type AdminPropertyReportsLoader,
  type AdminPropertiesLoader,
  type AdminPropertyReviewMutation,
  type AdminPropertyVisibilityMutation
} from './data.ts';
import { getAdminPropertiesCopy, type AdminPropertiesCopy, type AdminPropertiesState, type AdminPropertiesView } from './copy.ts';
import './styles.css';

export interface AdminPropertiesProps {
  readonly locale: SupportedLocale;
  readonly session: RouteSession;
  readonly authClient?: AdminPropertiesAuthorizationSource | undefined;
  readonly apiOrigin?: string | undefined;
  readonly url?: string | undefined;
  readonly view: AdminPropertiesView;
  readonly propertyId?: string | undefined;
  readonly reportId?: string | undefined;
  readonly initialProperties?: AdminPropertyListData | undefined;
  readonly initialDuplicates?: PropertyDuplicateData | undefined;
  readonly initialReports?: PropertyReportListData | undefined;
  readonly initialState?: 'loading' | 'retry' | undefined;
  readonly loadProperties?: AdminPropertiesLoader | undefined;
  readonly loadDuplicates?: AdminPropertyDuplicatesLoader | undefined;
  readonly loadReports?: AdminPropertyReportsLoader | undefined;
  readonly reviewProperty?: AdminPropertyReviewMutation | undefined;
  readonly changeVisibility?: AdminPropertyVisibilityMutation | undefined;
  readonly resolveReport?: AdminPropertyReportResolver | undefined;
}

const propertyStatuses: readonly PropertyStatus[] = ['draft', 'pending_review', 'needs_changes', 'approved', 'published', 'rejected', 'hidden', 'archived'];
const reviewActions: readonly PropertyReviewAction[] = ['needs_changes', 'approve', 'reject', 'publish'];
const visibilityActions: readonly PropertyVisibilityAction[] = ['hide', 'restore', 'archive'];
const reportStatuses: readonly PropertyReportStatus[] = ['open', 'in_review', 'resolved', 'dismissed'];
const reportActions: readonly PropertyReportAction[] = ['resolve', 'dismiss'];

type PropertyMutationAction = PropertyReviewAction | PropertyVisibilityAction;

function pageUrl(value: string | undefined): URL {
  if (value !== undefined) return new URL(value, 'http://sadat-real-estate.local');
  if (typeof window !== 'undefined') return new URL(window.location.href);
  return new URL('http://sadat-real-estate.local/admin/properties');
}

function localePath(locale: SupportedLocale, path: string): string {
  const url = new URL(path, 'http://sadat-real-estate.local');
  url.searchParams.set('lang', locale);
  return `${url.pathname}${url.search}${url.hash}`;
}

function localizedValue(value: PropertyData['name'], locale: SupportedLocale): string {
  return value[locale] ?? value.ar ?? value.en ?? '';
}

function dateLabel(value: string, locale: SupportedLocale): string {
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(value));
  } catch {
    return '—';
  }
}

function stateForError(error: unknown): Exclude<AdminPropertiesState, 'loading' | 'empty' | 'success'> {
  if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) return 'permission';
  if (error instanceof ApiClientError && error.status === 404) return 'not_found';
  if (error instanceof ApiClientError && (error.code === 'NETWORK_ERROR' || error.code === 'ABORTED')) return 'retry';
  return 'error';
}

function stateForData<T>(items: readonly T[]): AdminPropertiesState {
  return items.length === 0 ? 'empty' : 'success';
}

function toneForStatus(status: PropertyStatus): 'success' | 'warning' | 'info' | 'error' | 'neutral' {
  if (status === 'approved' || status === 'published') return 'success';
  if (status === 'pending_review' || status === 'needs_changes') return 'warning';
  if (status === 'rejected') return 'error';
  if (status === 'draft') return 'info';
  return 'neutral';
}

function StatusBadge({ status, locale }: { readonly status: PropertyStatus; readonly locale: SupportedLocale }) {
  const copy = getAdminPropertiesCopy(locale);
  return <span className="admin-properties__badge" data-tone={toneForStatus(status)} data-status={status}>{copy.status[status]}</span>;
}

function PropertyMetricStrip({ data, locale, review }: { readonly data: AdminPropertyListData; readonly locale: SupportedLocale; readonly review?: boolean }) {
  const copy = getAdminPropertiesCopy(locale);
  const count = (status: PropertyStatus) => data.items.filter(property => property.status === status).length;
  const labels = review
    ? (locale === 'ar' ? ['\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0639\u0642\u0627\u0631\u0627\u062a', copy.status.pending_review, copy.status.needs_changes, copy.status.approved, copy.status.rejected, copy.status.hidden, copy.status.archived, '\u0627\u0644\u0633\u062c\u0644\u0627\u062a \u0627\u0644\u0645\u062d\u0645\u0644\u0629'] : ['Total properties', copy.status.pending_review, copy.status.needs_changes, copy.status.approved, copy.status.rejected, copy.status.hidden, copy.status.archived, 'Loaded records'])
    : (locale === 'ar' ? ['\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0639\u0642\u0627\u0631\u0627\u062a', copy.status.published, copy.status.pending_review, copy.status.needs_changes, copy.status.draft, copy.status.hidden, copy.status.archived] : ['Total properties', copy.status.published, copy.status.pending_review, copy.status.needs_changes, copy.status.draft, copy.status.hidden, copy.status.archived]);
  const values = review ? [data.total, count('pending_review'), count('needs_changes'), count('approved'), count('rejected'), count('hidden'), count('archived'), data.items.length] : [data.total, count('published'), count('pending_review'), count('needs_changes'), count('draft'), count('hidden'), count('archived')];
  const colors = ['#1b2942', '#00854a', '#bf6500', '#bf6500', '#00854a', '#df1c2e', '#657286', '#2f68c9'];
  return <section aria-label={locale === 'ar' ? '\u0645\u0624\u0634\u0631\u0627\u062a \u0627\u0644\u0639\u0642\u0627\u0631\u0627\u062a' : 'Property metrics'} className="admin-dashboard__metric-section" style={{ marginBlockStart: 0 }}><div className="admin-dashboard__metric-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))' }}>{values.map((value, index) => <article className="admin-dashboard__metric" data-testid={`admin-property-metric-${index}`} key={labels[index]}><strong style={{ color: colors[index] }}>{new Intl.NumberFormat(locale).format(value)}</strong><span>{labels[index]}</span></article>)}</div></section>;
}

function PropertyStatusStrip({ locale, selected, onSelect }: { readonly locale: SupportedLocale; readonly selected: PropertyStatus | ''; readonly onSelect: (status: PropertyStatus | '') => void }) {
  const copy = getAdminPropertiesCopy(locale);
  const allLabel = locale === 'ar' ? '\u0627\u0644\u0643\u0644' :'All';
  return <div role="group" aria-label={locale === 'ar' ? '\u062d\u0627\u0644\u0629 \u0627\u0644\u0639\u0642\u0627\u0631' : 'Property status'} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, maxWidth: 1320, margin: '0 auto 12px', padding: 8, border: '1px solid #e3e5e7', borderRadius: 16, background: '#fff', boxShadow: '0 6px 16px #3232320d' }}>{[['', allLabel] as const, ...propertyStatuses.map(status => [status, copy.status[status]] as const)].map(([value, label]) => { const active = selected === value; return <button aria-pressed={active} data-filter-value={value || 'all'} key={value || 'all'} onClick={() => onSelect(value)} style={{ minHeight: 38, padding: '8px 16px', border: 0, borderRadius: 999, background: active ? '#155b4f' : 'transparent', color: active ? '#fff' : '#69768b', cursor: 'pointer', fontWeight: 800 }} type="button">{label}</button>; })}</div>;
}

function StatePanel({ state, locale, onRetry }: { readonly state: Exclude<AdminPropertiesState, 'success' | 'empty' | 'not_found'>; readonly locale: SupportedLocale; readonly onRetry: () => void }) {
  const copy = getAdminPropertiesCopy(locale);
  const message = copy.states[state];
  return (
    <section className="admin-properties__state" data-state={state} aria-label={message.title}>
      <StateMessage state={state} title={message.title} message={message.body} onRetry={state === 'retry' ? onRetry : undefined} retryLabel={copy.retry} />
      {state === 'error' ? <Button variant="secondary" size="sm" onClick={onRetry}>{copy.retry}</Button> : null}
    </section>
  );
}

function NotFoundPanel({ locale }: { readonly locale: SupportedLocale }) {
  const message = getAdminPropertiesCopy(locale).states.not_found;
  return <section className="admin-properties__state" data-state="not_found" aria-label={message.title}><h2>{message.title}</h2><p>{message.body}</p></section>;
}

function PageHeading({ copy, view }: { readonly copy: AdminPropertiesCopy; readonly view: AdminPropertiesView }) {
  return <div className="admin-properties__heading"><div><p className="admin-properties__eyebrow">{copy.eyebrow}</p><h1>{copy.titles[view]}</h1><p>{copy.descriptions[view]}</p></div><span className="admin-properties__direction-note">{copy.directionNote}</span></div>;
}

function safeSource(property: PropertyData): string {
  return `${property.source.sourceType} · ${property.source.providerId}`;
}

function isReviewAction(action: PropertyAvailableAction): action is PropertyReviewAction {
  return (reviewActions as readonly string[]).includes(action);
}

function isVisibilityAction(action: PropertyAvailableAction): action is PropertyVisibilityAction {
  return (visibilityActions as readonly string[]).includes(action);
}

function PropertyFilters({ locale, activeStatus, onApply, onClear }: { readonly locale: SupportedLocale; readonly activeStatus?: PropertyStatus | undefined; readonly onApply: (query: Partial<PropertyAdminListQuery>) => void; readonly onClear: () => void }) {
  const copy = getAdminPropertiesCopy(locale);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<PropertyStatus | ''>('');
  const [active, setActive] = useState<'' | 'true' | 'false'>('');
  const [providerId, setProviderId] = useState('');
  const [projectId, setProjectId] = useState('');
  useEffect(() => { setStatus(activeStatus ?? ''); }, [activeStatus]);
  return (
    <form className="admin-properties__filters" role="search" aria-label={copy.searchLabel} onSubmit={event => {
      event.preventDefault();
      onApply({
        page: 1,
        ...(search.trim() === '' ? {} : { search: search.trim() }),
        ...(status === '' ? {} : { status }),
        ...(active === '' ? {} : { active: active === 'true' }),
        ...(providerId.trim() === '' ? {} : { providerId: providerId.trim() }),
        ...(projectId.trim() === '' ? {} : { projectId: projectId.trim() })
      });
    }}>
      <label htmlFor="admin-properties-search">{copy.searchLabel}</label><input id="admin-properties-search" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder={copy.searchPlaceholder} />
      <label htmlFor="admin-properties-status">{copy.statusLabel}</label><select id="admin-properties-status" value={status} onChange={event => setStatus(event.target.value as PropertyStatus | '')}><option value="">{copy.allStatuses}</option>{propertyStatuses.map(value => <option key={value} value={value}>{copy.status[value]}</option>)}</select>
      <label htmlFor="admin-properties-active">{copy.activeLabel}</label><select id="admin-properties-active" value={active} onChange={event => setActive(event.target.value as '' | 'true' | 'false')}><option value="">{copy.allActivity}</option><option value="true">{copy.active}</option><option value="false">{copy.inactive}</option></select>
      <label htmlFor="admin-properties-provider">{copy.providerLabel}</label><input id="admin-properties-provider" value={providerId} onChange={event => setProviderId(event.target.value)} inputMode="text" />
      <label htmlFor="admin-properties-project">{copy.projectLabel}</label><input id="admin-properties-project" value={projectId} onChange={event => setProjectId(event.target.value)} inputMode="text" />
      <Button type="submit">{copy.apply}</Button><Button type="button" variant="secondary" onClick={() => { setSearch(''); setStatus(''); setActive(''); setProviderId(''); setProjectId(''); onClear(); }}>{copy.clear}</Button>
    </form>
  );
}

function PropertyTable({ locale, data, onPage }: { readonly locale: SupportedLocale; readonly data: AdminPropertyListData; readonly onPage: (page: number) => void }) {
  const copy = getAdminPropertiesCopy(locale);
  const page = data.page;
  const totalPages = Math.max(1, Math.ceil(data.total / data.limit));
  return (
    <section className="admin-properties__panel" aria-labelledby="admin-properties-table-title">
      <div className="admin-properties__panel-heading"><div><h2 id="admin-properties-table-title">{copy.allProperties}</h2><p>{copy.count(data.total)}</p></div></div>
      <div className="admin-properties__table-wrap"><table className="admin-properties__table"><thead><tr><th scope="col">{copy.columns.id}</th><th scope="col">{copy.columns.name}</th><th scope="col">{copy.columns.source}</th><th scope="col">{copy.columns.kind}</th><th scope="col">{copy.columns.transaction}</th><th scope="col">{copy.columns.status}</th><th scope="col">{copy.columns.active}</th><th scope="col">{copy.columns.updated}</th><th scope="col">{copy.columns.actions}</th></tr></thead><tbody>{data.items.map(property => {
        const reviewAvailable = property.availableActions.some(isReviewAction);
        return <tr key={property.id} data-testid={`admin-property-${property.id}`}><td><code>{property.id}</code></td><td><strong>{localizedValue(property.name, locale)}</strong><small>{property.slug}</small></td><td>{safeSource(property)}</td><td>{property.kind}</td><td>{property.transactionType}</td><td><StatusBadge status={property.status} locale={locale} /></td><td>{property.active ? copy.active : copy.inactive}</td><td>{dateLabel(property.updatedAt, locale)}</td><td><div className="admin-properties__row-actions">{reviewAvailable ? <a className="admin-properties__action-link" href={localePath(locale, `${ADMIN_PROPERTY_REVIEW_ROUTE}?propertyId=${encodeURIComponent(property.id)}`)}>{copy.review}</a> : <span className="admin-properties__muted">{copy.noActions}</span>}<a className="admin-properties__action-link" href={localePath(locale, `${ADMIN_PROPERTY_DUPLICATES_ROUTE}?propertyId=${encodeURIComponent(property.id)}`)}>{copy.duplicates}</a></div></td></tr>;
      })}</tbody></table></div>
      <div className="admin-properties__pagination"><Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>{copy.previous}</Button><span>{copy.page(page, totalPages)}</span><Button size="sm" variant="secondary" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>{copy.next}</Button></div>
    </section>
  );
}

function PropertyActionPanel({ locale, property, review, visibility }: { readonly locale: SupportedLocale; readonly property: PropertyData; readonly review: AdminPropertyReviewMutation; readonly visibility: AdminPropertyVisibilityMutation }) {
  const copy = getAdminPropertiesCopy(locale);
  const allowedActions = property.availableActions.filter((action): action is PropertyMutationAction => isReviewAction(action) || isVisibilityAction(action));
  const [action, setAction] = useState<PropertyMutationAction | ''>(allowedActions[0] ?? '');
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
      if (isReviewAction(action)) await review(property.id, { version: property.version, action, reason: reason.trim() });
      else await visibility(property.id, { version: property.version, action, reason: reason.trim() });
      setMutationState('idle');
      setFeedback(copy.actionSaved);
    } catch (error) {
      setMutationState(error instanceof ApiClientError && (error.status === 401 || error.status === 403) ? 'permission' : 'error');
      setFeedback(error instanceof ApiClientError && (error.status === 401 || error.status === 403) ? copy.states.permission.body : copy.states.error.body);
    }
  }

  return <form className="admin-properties__action-card" onSubmit={event => { event.preventDefault(); void submit(); }}><h2>{copy.titles.review}</h2>{allowedActions.length === 0 ? <p className="admin-properties__muted">{copy.noActions}</p> : <fieldset disabled={mutationState === 'saving'}><legend>{copy.columns.actions}</legend><label className="admin-properties__field" htmlFor="admin-property-action">{copy.columns.actions}</label><select id="admin-property-action" value={action} onChange={event => setAction(event.target.value as PropertyMutationAction)}>{allowedActions.map(value => <option key={value} value={value}>{isReviewAction(value) ? copy.availableAction[value] : copy.visibilityAction[value]}</option>)}</select><label className="admin-properties__field" htmlFor="admin-property-reason">{copy.reasonLabel}</label><textarea id="admin-property-reason" value={reason} onChange={event => setReason(event.target.value)} placeholder={copy.reasonPlaceholder} minLength={5} maxLength={500} aria-required="true" /><Button type="submit" loading={mutationState === 'saving'} disabled={mutationState === 'permission'}>{mutationState === 'saving' ? copy.saving : copy.saveAction}</Button></fieldset>}{feedback !== undefined ? <p className="admin-properties__feedback" data-tone={mutationState === 'error' || mutationState === 'permission' ? 'error' : 'success'} role="status">{feedback}</p> : null}</form>;
}

function PropertyReviewPanel({ locale, property, review, visibility }: { readonly locale: SupportedLocale; readonly property: PropertyData; readonly review: AdminPropertyReviewMutation; readonly visibility: AdminPropertyVisibilityMutation }) {
  const copy = getAdminPropertiesCopy(locale);
  return <section className="admin-properties__review" data-screen-id="ADM-15" data-route={ADMIN_PROPERTY_REVIEW_ROUTE} data-device-scope="desktop"><div className="admin-properties__review-heading"><div><p className="admin-properties__eyebrow">{copy.eyebrow}</p><h1>{copy.titles.review}</h1><p>{copy.descriptions.review}</p></div><a className="admin-properties__back-link" href={localePath(locale, ADMIN_PROPERTIES_ROUTE)}>{copy.back}</a></div><div className="admin-properties__review-grid"><article className="admin-properties__detail-card"><h2>{localizedValue(property.name, locale)}</h2><dl><div><dt>{copy.columns.id}</dt><dd><code>{property.id}</code></dd></div><div><dt>{copy.columns.source}</dt><dd>{safeSource(property)}</dd></div><div><dt>{copy.columns.kind}</dt><dd>{property.kind}</dd></div><div><dt>{copy.columns.transaction}</dt><dd>{property.transactionType}</dd></div><div><dt>{copy.columns.status}</dt><dd><StatusBadge status={property.status} locale={locale} /></dd></div><div><dt>{copy.columns.active}</dt><dd>{property.active ? copy.active : copy.inactive}</dd></div><div><dt>{copy.columns.version}</dt><dd>{property.version}</dd></div>{property.reviewReason !== undefined ? <div><dt>{copy.columns.reason}</dt><dd>{property.reviewReason}</dd></div> : null}</dl><div className="admin-properties__detail-links"><a href={localePath(locale, `${ADMIN_PROPERTY_DUPLICATES_ROUTE}?propertyId=${encodeURIComponent(property.id)}`)}>{copy.openDuplicates}</a><a href={localePath(locale, ADMIN_PROPERTY_REPORTS_ROUTE)}>{copy.openReports}</a></div></article><PropertyActionPanel locale={locale} property={property} review={review} visibility={visibility} /></div></section>;
}

function DuplicatePanel({ locale, propertyId, data }: { readonly locale: SupportedLocale; readonly propertyId: string; readonly data: PropertyDuplicateData }) {
  const copy = getAdminPropertiesCopy(locale);
  return <section className="admin-properties__duplicates" data-screen-id="ADM-16" data-route={ADMIN_PROPERTY_DUPLICATES_ROUTE} data-device-scope="desktop"><div className="admin-properties__review-heading"><div><p className="admin-properties__eyebrow">{copy.eyebrow}</p><h1>{copy.titles.duplicates}</h1><p>{copy.descriptions.duplicates}</p></div><a className="admin-properties__back-link" href={localePath(locale, ADMIN_PROPERTIES_ROUTE)}>{copy.back}</a></div><div className="admin-properties__selection-note"><strong>{copy.columns.propertyId}:</strong> <code>{propertyId}</code><span>{copy.candidateCount(data.total)}</span></div>{data.items.length === 0 ? <section className="admin-properties__empty" data-state="empty"><h2>{copy.noCandidates}</h2><p>{copy.states.empty.body}</p></section> : <div className="admin-properties__candidate-grid">{data.items.map(candidate => <article className="admin-properties__candidate" key={candidate.candidateId}><div><p className="admin-properties__eyebrow">{copy.columns.id}</p><h2><code>{candidate.candidateId}</code></h2></div><div className="admin-properties__chip-list">{candidate.signals.map(signal => <span className="admin-properties__chip" key={signal}>{copy.signal[signal]}</span>)}</div><p>{candidate.explanation}</p><a className="admin-properties__action-link" href={localePath(locale, `${ADMIN_PROPERTY_REVIEW_ROUTE}?propertyId=${encodeURIComponent(candidate.candidateId)}`)}>{copy.openProperty}</a></article>)}</div>}</section>;
}

function ReportResolutionPanel({ locale, report, resolve }: { readonly locale: SupportedLocale; readonly report: PropertyReportData; readonly resolve: AdminPropertyReportResolver }) {
  const copy = getAdminPropertiesCopy(locale);
  const [action, setAction] = useState<PropertyReportAction>('resolve');
  const [reason, setReason] = useState('');
  const [mutationState, setMutationState] = useState<'idle' | 'saving' | 'error' | 'permission'>('idle');
  const [feedback, setFeedback] = useState<string | undefined>();
  const canResolve = report.status === 'open' || report.status === 'in_review';
  async function submit(): Promise<void> {
    if (reason.trim().length < 5) { setMutationState('error'); setFeedback(copy.reasonRequired); return; }
    setMutationState('saving');
    try { await resolve(report.id, { version: report.version, action, reason: reason.trim() }); setMutationState('idle'); setFeedback(copy.actionSaved); }
    catch (error) { setMutationState(error instanceof ApiClientError && (error.status === 401 || error.status === 403) ? 'permission' : 'error'); setFeedback(error instanceof ApiClientError && (error.status === 401 || error.status === 403) ? copy.states.permission.body : copy.states.error.body); }
  }
  return <form className="admin-properties__action-card" onSubmit={event => { event.preventDefault(); void submit(); }}><h2>{copy.columns.actions}</h2>{canResolve ? <fieldset disabled={mutationState === 'saving'}><label className="admin-properties__field" htmlFor="admin-property-report-action">{copy.columns.actions}</label><select id="admin-property-report-action" value={action} onChange={event => setAction(event.target.value as PropertyReportAction)}>{reportActions.map(value => <option key={value} value={value}>{copy.reportAction[value]}</option>)}</select><label className="admin-properties__field" htmlFor="admin-property-report-reason">{copy.reasonLabel}</label><textarea id="admin-property-report-reason" value={reason} onChange={event => setReason(event.target.value)} placeholder={copy.reasonPlaceholder} minLength={5} maxLength={500} aria-required="true" /><Button type="submit" loading={mutationState === 'saving'} disabled={mutationState === 'permission'}>{mutationState === 'saving' ? copy.saving : copy.saveAction}</Button></fieldset> : <p className="admin-properties__muted">{copy.noActions}</p>}{feedback !== undefined ? <p className="admin-properties__feedback" data-tone={mutationState === 'error' || mutationState === 'permission' ? 'error' : 'success'} role="status">{feedback}</p> : null}</form>;
}

function ReportsTable({ locale, data }: { readonly locale: SupportedLocale; readonly data: PropertyReportListData }) {
  const copy = getAdminPropertiesCopy(locale);
  return <section className="admin-properties__panel" aria-labelledby="admin-property-reports-table-title"><div className="admin-properties__panel-heading"><div><h2 id="admin-property-reports-table-title">{copy.titles.reports}</h2><p>{copy.count(data.total)}</p></div></div><div className="admin-properties__table-wrap"><table className="admin-properties__table"><thead><tr><th scope="col">{copy.columns.reportId}</th><th scope="col">{copy.columns.propertyId}</th><th scope="col">{copy.columns.reportReason}</th><th scope="col">{copy.columns.status}</th><th scope="col">{copy.columns.date}</th><th scope="col">{copy.columns.actions}</th></tr></thead><tbody>{data.items.map(report => <tr key={report.id} data-testid={`admin-property-report-${report.id}`}><td><code>{report.id}</code></td><td><code>{report.propertyId}</code></td><td>{copy.reportReason[report.reason]}</td><td><span className="admin-properties__badge" data-tone={report.status === 'resolved' ? 'success' : report.status === 'dismissed' ? 'neutral' : 'warning'}>{copy.reportStatus[report.status]}</span></td><td>{dateLabel(report.createdAt, locale)}</td><td><a className="admin-properties__action-link" href={localePath(locale, `${ADMIN_PROPERTY_REPORTS_ROUTE}?reportId=${encodeURIComponent(report.id)}`)}>{copy.details}</a></td></tr>)}</tbody></table></div></section>;
}

function ReportFilters({ locale, onApply, onClear }: { readonly locale: SupportedLocale; readonly onApply: (query: Partial<PropertyReportListQuery>) => void; readonly onClear: () => void }) {
  const copy = getAdminPropertiesCopy(locale);
  const [status, setStatus] = useState<PropertyReportStatus | ''>('');
  const [propertyId, setPropertyId] = useState('');
  return <form className="admin-properties__filters admin-properties__filters--reports" role="search" aria-label={copy.titles.reports} onSubmit={event => { event.preventDefault(); onApply({ page: 1, ...(status === '' ? {} : { status }), ...(propertyId.trim() === '' ? {} : { propertyId: propertyId.trim() }) }); }}><label htmlFor="admin-property-reports-status">{copy.statusLabel}</label><select id="admin-property-reports-status" value={status} onChange={event => setStatus(event.target.value as PropertyReportStatus | '')}><option value="">{copy.allStatuses}</option>{reportStatuses.map(value => <option key={value} value={value}>{copy.reportStatus[value]}</option>)}</select><label htmlFor="admin-property-reports-property">{copy.columns.propertyId}</label><input id="admin-property-reports-property" value={propertyId} onChange={event => setPropertyId(event.target.value)} /><Button type="submit">{copy.apply}</Button><Button type="button" variant="secondary" onClick={() => { setStatus(''); setPropertyId(''); onClear(); }}>{copy.clear}</Button></form>;
}

export function AdminProperties({ locale, session, authClient, apiOrigin, url, view, propertyId, reportId, initialProperties, initialDuplicates, initialReports, initialState = 'loading', loadProperties, loadDuplicates, loadReports, reviewProperty, changeVisibility, resolveReport }: AdminPropertiesProps) {
  const copy = getAdminPropertiesCopy(locale);
  const currentUrl = pageUrl(url);
  const pathname = currentUrl.pathname.replace(/\/+$/u, '') || '/';
  const selectedPropertyId = propertyId ?? currentUrl.searchParams.get('propertyId') ?? undefined;
  const selectedReportId = reportId ?? currentUrl.searchParams.get('reportId') ?? undefined;
  const sessionAllowed = session.status === 'authenticated' && session.role === 'admin';
  const propertyLoader = useMemo(() => loadProperties ?? createAdminPropertiesLoader({ apiOrigin, authorization: authClient }), [apiOrigin, authClient, loadProperties]);
  const duplicateLoader = useMemo(() => loadDuplicates ?? createAdminPropertyDuplicatesLoader({ apiOrigin, authorization: authClient }), [apiOrigin, authClient, loadDuplicates]);
  const reportsLoader = useMemo(() => loadReports ?? createAdminPropertyReportsLoader({ apiOrigin, authorization: authClient }), [apiOrigin, authClient, loadReports]);
  const reviewMutation = useMemo(() => reviewProperty ?? createAdminPropertyReviewMutation({ apiOrigin, authorization: authClient }), [apiOrigin, authClient, reviewProperty]);
  const visibilityMutation = useMemo(() => changeVisibility ?? createAdminPropertyVisibilityMutation({ apiOrigin, authorization: authClient }), [apiOrigin, authClient, changeVisibility]);
  const reportResolver = useMemo(() => resolveReport ?? createAdminPropertyReportResolver({ apiOrigin, authorization: authClient }), [apiOrigin, authClient, resolveReport]);
  const [state, setState] = useState<AdminPropertiesState>(initialState);
  const [attempt, setAttempt] = useState(0);
  const [properties, setProperties] = useState<AdminPropertyListData | undefined>(initialProperties);
  const [duplicates, setDuplicates] = useState<PropertyDuplicateData | undefined>(initialDuplicates);
  const [reports, setReports] = useState<PropertyReportListData | undefined>(initialReports);
  const [propertyQuery, setPropertyQuery] = useState<Partial<PropertyAdminListQuery>>({ page: 1, limit: 20, sort: 'updatedAt', direction: 'desc' });
  const [reportQuery, setReportQuery] = useState<Partial<PropertyReportListQuery>>({ page: 1, limit: 20 });

  useEffect(() => {
    if (!sessionAllowed) { setState('permission'); return undefined; }
    if (initialProperties !== undefined && initialDuplicates !== undefined && view === 'duplicates' && attempt === 0) { setState('success'); return undefined; }
    if (initialProperties !== undefined && view !== 'reports' && view !== 'duplicates' && attempt === 0) { const selected = selectedPropertyId === undefined ? undefined : initialProperties.items.find(item => item.id === selectedPropertyId); setState(view === 'review' && selected === undefined ? 'not_found' : stateForData(initialProperties.items)); return undefined; }
    if (initialReports !== undefined && view === 'reports' && attempt === 0) { setState(selectedReportId !== undefined && !initialReports.items.some(report => report.id === selectedReportId) ? 'not_found' : stateForData(initialReports.items)); return undefined; }
    if (view === 'duplicates' && selectedPropertyId === undefined) { setState('not_found'); return undefined; }
    const controller = new AbortController();
    setState('loading');
    if (view === 'reports') {
      void reportsLoader({ page: reportQuery.page ?? 1, limit: reportQuery.limit ?? 20, ...(reportQuery.status === undefined ? {} : { status: reportQuery.status }), ...(reportQuery.propertyId === undefined ? {} : { propertyId: reportQuery.propertyId }) }, controller.signal).then(next => { if (controller.signal.aborted) return; setReports(next); setState(selectedReportId !== undefined && !next.items.some(report => report.id === selectedReportId) ? 'not_found' : stateForData(next.items)); }).catch(error => { if (!controller.signal.aborted) setState(stateForError(error)); });
    } else if (view === 'duplicates' && selectedPropertyId !== undefined) {
      void Promise.all([propertyLoader({ page: 1, limit: 100, sort: 'updatedAt', direction: 'desc' }, controller.signal), duplicateLoader(selectedPropertyId, { limit: 20 }, controller.signal)]).then(([nextProperties, nextDuplicates]) => { if (controller.signal.aborted) return; setProperties(nextProperties); setDuplicates(nextDuplicates); setState('success'); }).catch(error => { if (!controller.signal.aborted) setState(stateForError(error)); });
    } else {
      const query = view === 'review' ? { page: 1, limit: 100, sort: 'updatedAt' as const, direction: 'desc' as const } : { page: propertyQuery.page ?? 1, limit: propertyQuery.limit ?? 20, sort: propertyQuery.sort ?? 'updatedAt', direction: propertyQuery.direction ?? 'desc', ...(propertyQuery.status === undefined ? {} : { status: propertyQuery.status }), ...(propertyQuery.providerId === undefined ? {} : { providerId: propertyQuery.providerId }), ...(propertyQuery.locationId === undefined ? {} : { locationId: propertyQuery.locationId }), ...(propertyQuery.projectId === undefined ? {} : { projectId: propertyQuery.projectId }), ...(propertyQuery.active === undefined ? {} : { active: propertyQuery.active }), ...(propertyQuery.search === undefined ? {} : { search: propertyQuery.search }) };
      void propertyLoader(query, controller.signal).then(next => { if (controller.signal.aborted) return; setProperties(next); const selected = selectedPropertyId === undefined ? undefined : next.items.find(item => item.id === selectedPropertyId); setState(view === 'review' && selected === undefined ? 'not_found' : stateForData(next.items)); }).catch(error => { if (!controller.signal.aborted) setState(stateForError(error)); });
    }
    return () => controller.abort();
  }, [attempt, duplicateLoader, initialDuplicates, initialProperties, initialReports, propertyLoader, propertyQuery, reportQuery, reportsLoader, selectedPropertyId, selectedReportId, sessionAllowed, view]);

  const selectedProperty = properties?.items.find(item => item.id === selectedPropertyId);
  const selectedReport = reports?.items.find(report => report.id === selectedReportId);
  const screenId = view === 'list' ? 'ADM-14' : view === 'review' ? 'ADM-15' : view === 'duplicates' ? 'ADM-16' : 'ADM-17';
  const retry = () => setAttempt(value => value + 1);
  return <section className="admin-properties" data-screen-id={screenId} data-route={pathname} data-device-scope="desktop" data-admin-properties-state={state}><AdminNavigation locale={locale} activePath={pathname} /><div className="admin-properties__content"><PageHeading copy={copy} view={view} />{view === 'list' ? <>{state === 'success' && properties !== undefined ? <PropertyMetricStrip data={properties} locale={locale} /> : null}<PropertyStatusStrip locale={locale} selected={(propertyQuery.status as PropertyStatus | undefined) ?? ''} onSelect={status => { setPropertyQuery(current => ({ ...current, page: 1, ...(status === '' ? { status: undefined } : { status }) })); setAttempt(value => value + 1); }} /><PropertyFilters locale={locale} activeStatus={(propertyQuery.status as PropertyStatus | undefined)} onApply={query => { setPropertyQuery(current => ({ ...current, ...query })); setAttempt(value => value + 1); }} onClear={() => { setPropertyQuery({ page: 1, limit: 20, sort: 'updatedAt', direction: 'desc' }); setAttempt(value => value + 1); }} /></> : null}{view === 'reports' ? <ReportFilters locale={locale} onApply={query => { setReportQuery(current => ({ ...current, ...query })); setAttempt(value => value + 1); }} onClear={() => { setReportQuery({ page: 1, limit: 20 }); setAttempt(value => value + 1); }} /> : null}{state === 'loading' || state === 'retry' || state === 'error' || state === 'permission' ? <StatePanel state={state} locale={locale} onRetry={retry} /> : null}{state === 'not_found' ? <NotFoundPanel locale={locale} /> : null}{view === 'list' && state === 'empty' ? <section className="admin-properties__empty" data-state="empty"><h2>{copy.states.empty.title}</h2><p>{copy.states.empty.body}</p></section> : null}{view === 'list' && state === 'success' && properties !== undefined ? <PropertyTable locale={locale} data={properties} onPage={page => { setPropertyQuery(current => ({ ...current, page })); setAttempt(value => value + 1); }} /> : null}{view === 'review' && state === 'success' && properties !== undefined ? <PropertyMetricStrip data={properties} locale={locale} review /> : null}{view === 'review' && state === 'success' && selectedProperty !== undefined ? <PropertyReviewPanel locale={locale} property={selectedProperty} review={reviewMutation} visibility={visibilityMutation} /> : null}{view === 'duplicates' && state === 'success' && selectedPropertyId !== undefined && duplicates !== undefined ? <DuplicatePanel locale={locale} propertyId={selectedPropertyId} data={duplicates} /> : null}{view === 'reports' && state === 'empty' ? <section className="admin-properties__empty" data-state="empty"><h2>{copy.noReports}</h2><p>{copy.states.empty.body}</p></section> : null}{view === 'reports' && state === 'success' && reports !== undefined ? <><ReportsTable locale={locale} data={reports} />{selectedReport !== undefined ? <section className="admin-properties__report-detail"><div><p className="admin-properties__eyebrow">{copy.details}</p><h2><code>{selectedReport.id}</code></h2><dl><div><dt>{copy.columns.propertyId}</dt><dd><code>{selectedReport.propertyId}</code></dd></div><div><dt>{copy.columns.reportReason}</dt><dd>{copy.reportReason[selectedReport.reason]}</dd></div><div><dt>{copy.columns.status}</dt><dd>{copy.reportStatus[selectedReport.status]}</dd></div>{selectedReport.details !== undefined ? <div><dt>{copy.detailsLabel}</dt><dd>{selectedReport.details}</dd></div> : null}</dl></div><ReportResolutionPanel locale={locale} report={selectedReport} resolve={reportResolver} /></section> : null}</> : null}</div></section>;
}
