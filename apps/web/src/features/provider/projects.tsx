import { useEffect, useMemo, useState } from 'react';
import {
  PROJECT_STATUSES,
  projectCreateSchema,
  projectPatchSchema,
  projectSubmitRequestSchema,
  type LocalizedText,
  type ProjectCreate,
  type ProjectData,
  type ProjectPatch,
  type ProjectStatus,
  type ProjectSubmitRequest,
  type SupportedLocale
} from '@sadat-real-estate/contracts';
import { ApiClientError } from '../contracts/index.ts';
import { Badge, Button, Input, Modal, Pagination, StateMessage, type BadgeTone } from '../design_system/index.ts';
import type { RouteSession } from '../routing/index.ts';
import { getProviderCopy } from './copy.ts';
import { ProviderNavigation } from './overview.tsx';
import {
  createProviderProjectMutationApi,
  createProviderProjectsLoader,
  type ProviderProjectMutationApi,
  type ProviderProjectsData,
  type ProviderProjectsLoader,
  type ProviderProjectsQuery
} from './projects-data.ts';
import { getProviderProjectsCopy, type ProviderProjectsCopy } from './projects-copy.ts';
import './projects.css';
import './styles.css';

export type ProviderProjectsViewState = 'loading' | 'empty' | 'error' | 'retry' | 'success' | 'permission';
export type ProviderProjectStatusFilter = ProjectStatus | 'all';

export interface ProviderProjectsProps {
  readonly locale: SupportedLocale;
  readonly session: RouteSession;
  readonly authClient?: { readonly getAuthorizationHeader: () => string | undefined } | undefined;
  readonly apiOrigin?: string | undefined;
  readonly load?: ProviderProjectsLoader | undefined;
  readonly mutations?: ProviderProjectMutationApi | undefined;
}

const LOCALE_KEYS = ['ar', 'en', 'zh-CN'] as const satisfies readonly SupportedLocale[];
const PROJECT_FORM_ID = 'provider-project-form';

interface ProjectFormState {
  readonly name: Record<SupportedLocale, string>;
  readonly description: Record<SupportedLocale, string>;
  readonly slug: string;
  readonly locationId: string;
  readonly organizationId: string;
  readonly website: string;
  readonly reason: string;
}

function blankForm(): ProjectFormState {
  return { name: { ar: '', en: '', 'zh-CN': '' }, description: { ar: '', en: '', 'zh-CN': '' }, slug: '', locationId: '', organizationId: '', website: '', reason: '' };
}

function formForProject(project: ProjectData): ProjectFormState {
  return {
    name: { ar: project.name.ar ?? '', en: project.name.en ?? '', 'zh-CN': project.name['zh-CN'] ?? '' },
    description: { ar: project.description?.ar ?? '', en: project.description?.en ?? '', 'zh-CN': project.description?.['zh-CN'] ?? '' },
    slug: project.slug,
    locationId: project.locationId ?? '',
    organizationId: project.organizationId ?? '',
    website: project.website ?? '',
    reason: ''
  };
}

function localizedText(values: Record<SupportedLocale, string>): LocalizedText | undefined {
  const output: LocalizedText = {};
  for (const locale of LOCALE_KEYS) {
    const value = (values[locale] ?? '').trim();
    if (value !== '') output[locale] = value;
  }
  return Object.keys(output).length === 0 ? undefined : output;
}

function localizedValue(value: ProjectData['name'], locale: SupportedLocale): string {
  return value[locale] ?? value.ar ?? value.en ?? value['zh-CN'] ?? '—';
}

function dateLabel(value: string, locale: SupportedLocale): string {
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(value));
  } catch {
    return '—';
  }
}

function statusTone(status: ProjectStatus): BadgeTone {
  if (status === 'published' || status === 'approved') return 'success';
  if (status === 'pending_review' || status === 'needs_changes') return 'warning';
  if (status === 'rejected') return 'error';
  if (status === 'draft') return 'info';
  return 'neutral';
}

function stateForError(error: unknown): Exclude<ProviderProjectsViewState, 'loading' | 'empty' | 'success'> {
  if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) return 'permission';
  if (error instanceof ApiClientError && (error.code === 'NETWORK_ERROR' || error.code === 'ABORTED')) return 'retry';
  return 'error';
}

function errorCopy(error: unknown, copy: ProviderProjectsCopy): string {
  if (error instanceof ApiClientError && error.status === 409) return copy.errors.conflict;
  return copy.errors.generic;
}

function StatePanel({ state, locale, onRetry }: { readonly state: Exclude<ProviderProjectsViewState, 'success' | 'empty'>; readonly locale: SupportedLocale; readonly onRetry: () => void }) {
  const providerCopy = getProviderCopy(locale);
  const message = providerCopy.states[state];
  return (
    <section className="provider-projects__state" data-state={state} aria-label={message.title}>
      <StateMessage state={state} title={message.title} message={message.body} onRetry={state === 'retry' ? onRetry : undefined} retryLabel={providerCopy.retry} />
      {state === 'error' ? <Button variant="secondary" size="sm" onClick={onRetry}>{providerCopy.retry}</Button> : null}
    </section>
  );
}

function ProjectStatusBadge({ status, copy }: { readonly status: ProjectStatus; readonly copy: ProviderProjectsCopy }) {
  return <Badge tone={statusTone(status)} data-project-status={status}>{copy.statuses[status]}</Badge>;
}

function ProjectFormModal({ locale, copy, mode, project, saving, error, onClose, onSave }: {
  readonly locale: SupportedLocale;
  readonly copy: ProviderProjectsCopy;
  readonly mode: 'create' | 'edit';
  readonly project?: ProjectData | undefined;
  readonly saving: boolean;
  readonly error?: string | undefined;
  readonly onClose: () => void;
  readonly onSave: (input: ProjectCreate | ProjectPatch) => Promise<void>;
}) {
  const [form, setForm] = useState<ProjectFormState>(() => project === undefined ? blankForm() : formForProject(project));
  const [validationError, setValidationError] = useState<string | undefined>();
  const title = mode === 'create' ? copy.form.createTitle : copy.form.editTitle;
  const description = mode === 'create' ? copy.form.createDescription : copy.form.editDescription;

  const update = <K extends keyof ProjectFormState>(key: K, value: ProjectFormState[K]) => setForm(previous => ({ ...previous, [key]: value }));
  const updateLocalized = (key: 'name' | 'description', localeKey: SupportedLocale, value: string) => update(key, { ...form[key], [localeKey]: value });

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setValidationError(undefined);
    const name = localizedText(form.name);
    const descriptionValue = localizedText(form.description);
    const reason = form.reason.trim();
    if (mode === 'create') {
      const parsed = projectCreateSchema.safeParse({
        name,
        slug: form.slug.trim(),
        ...(descriptionValue === undefined ? {} : { description: descriptionValue }),
        ...(form.locationId.trim() === '' ? {} : { locationId: form.locationId.trim() }),
        ...(form.organizationId.trim() === '' ? {} : { organizationId: form.organizationId.trim() }),
        ...(form.website.trim() === '' ? {} : { website: form.website.trim() }),
        reason
      });
      if (!parsed.success) {
        setValidationError(copy.errors.validation);
        return;
      }
      await onSave(parsed.data);
      return;
    }
    if (project === undefined) {
      setValidationError(copy.errors.generic);
      return;
    }
    const candidate: Record<string, unknown> = { version: project.version, slug: form.slug.trim(), description: descriptionValue ?? null, reason };
    if (name !== undefined) candidate.name = name;
    if (form.locationId.trim() !== (project.locationId ?? '')) candidate.locationId = form.locationId.trim() === '' ? null : form.locationId.trim();
    if (form.organizationId.trim() !== (project.organizationId ?? '')) candidate.organizationId = form.organizationId.trim() === '' ? null : form.organizationId.trim();
    if (form.website.trim() !== (project.website ?? '')) candidate.website = form.website.trim() === '' ? null : form.website.trim();
    const parsed = projectPatchSchema.safeParse(candidate);
    if (!parsed.success) {
      setValidationError(copy.errors.validation);
      return;
    }
    await onSave(parsed.data);
  }

  return (
    <Modal
      open
      title={title}
      description={description}
      closeLabel={copy.form.close}
      onClose={onClose}
      footer={(
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>{copy.form.cancel}</Button>
          <Button type="submit" form={PROJECT_FORM_ID} loading={saving}>{copy.form.save}</Button>
        </>
      )}
    >
      <form id={PROJECT_FORM_ID} className="provider-projects__form" onSubmit={event => { void submit(event); }} noValidate>
        {validationError || error ? <p className="provider-projects__form-error" role="alert">{validationError ?? error}</p> : null}
        <fieldset disabled={saving}>
          <legend>{copy.form.name}</legend>
          {LOCALE_KEYS.map(localeKey => <Input key={localeKey} id={`provider-project-name-${localeKey}`} label={`${copy.form.name} — ${copy.form.localeLabels[localeKey]}`} value={form.name[localeKey]} onChange={event => updateLocalized('name', localeKey, event.target.value)} required={localeKey === locale} />)}
        </fieldset>
        <fieldset disabled={saving}>
          <legend>{copy.form.description}</legend>
          {LOCALE_KEYS.map(localeKey => (
            <label key={localeKey} className="provider-projects__textarea-label" htmlFor={`provider-project-description-${localeKey}`}>
              {copy.form.description} — {copy.form.localeLabels[localeKey]}
              <textarea id={`provider-project-description-${localeKey}`} value={form.description[localeKey]} onChange={event => updateLocalized('description', localeKey, event.target.value)} rows={3} />
            </label>
          ))}
        </fieldset>
        <div className="provider-projects__form-grid">
          <Input id="provider-project-slug" label={copy.form.slug} value={form.slug} onChange={event => update('slug', event.target.value)} placeholder={copy.form.placeholders.slug} required />
          <Input id="provider-project-location" label={copy.form.locationId} value={form.locationId} onChange={event => update('locationId', event.target.value)} placeholder={copy.form.placeholders.locationId} />
          <Input id="provider-project-organization" label={copy.form.organizationId} value={form.organizationId} onChange={event => update('organizationId', event.target.value)} placeholder={copy.form.placeholders.organizationId} />
          <Input id="provider-project-website" label={copy.form.website} type="url" value={form.website} onChange={event => update('website', event.target.value)} placeholder={copy.form.placeholders.website} />
        </div>
        <Input id="provider-project-reason" label={copy.form.reason} value={form.reason} onChange={event => update('reason', event.target.value)} helpText={copy.form.reasonHelp} required />
      </form>
    </Modal>
  );
}

function SubmitProjectModal({ copy, project, saving, error, onClose, onSubmit }: {
  readonly copy: ProviderProjectsCopy;
  readonly project: ProjectData;
  readonly saving: boolean;
  readonly error?: string | undefined;
  readonly onClose: () => void;
  readonly onSubmit: (input: ProjectSubmitRequest) => Promise<void>;
}) {
  const [reason, setReason] = useState('');
  const [validationError, setValidationError] = useState<string | undefined>();
  const formId = `provider-project-submit-${project.id}`;

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const parsed = projectSubmitRequestSchema.safeParse({ version: project.version, reason: reason.trim() });
    if (!parsed.success) {
      setValidationError(copy.errors.validation);
      return;
    }
    setValidationError(undefined);
    await onSubmit(parsed.data);
  }

  return (
    <Modal open title={copy.submitDialog.title} description={copy.submitDialog.description} closeLabel={copy.form.close} onClose={onClose} footer={(
      <>
        <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>{copy.submitDialog.cancel}</Button>
        <Button type="submit" form={formId} loading={saving}>{copy.submitDialog.confirm}</Button>
      </>
    )}>
      <form id={formId} className="provider-projects__form" onSubmit={event => { void submit(event); }} noValidate>
        {validationError || error ? <p className="provider-projects__form-error" role="alert">{validationError ?? error}</p> : null}
        <Input id={`${formId}-reason`} label={copy.submitDialog.reason} value={reason} onChange={event => setReason(event.target.value)} helpText={copy.submitDialog.reasonHelp} required />
      </form>
    </Modal>
  );
}

function FilterBar({ locale, copy, status, searchInput, onStatusChange, onSearchInputChange, onSubmit, onClear }: {
  readonly locale: SupportedLocale;
  readonly copy: ProviderProjectsCopy;
  readonly status: ProviderProjectStatusFilter;
  readonly searchInput: string;
  readonly onStatusChange: (status: ProviderProjectStatusFilter) => void;
  readonly onSearchInputChange: (value: string) => void;
  readonly onSubmit: () => void;
  readonly onClear: () => void;
}) {
  return (
    <form className="provider-projects__filters" role="search" aria-label={copy.filtersLabel} onSubmit={event => { event.preventDefault(); onSubmit(); }}>
      <div className="provider-projects__field">
        <label htmlFor="provider-projects-search">{copy.searchLabel}</label>
        <input id="provider-projects-search" type="search" value={searchInput} onChange={event => onSearchInputChange(event.target.value)} placeholder={copy.searchPlaceholder} />
      </div>
      <div className="provider-projects__field">
        <label htmlFor="provider-projects-status">{copy.statusLabel}</label>
        <select id="provider-projects-status" value={status} onChange={event => onStatusChange(event.target.value as ProviderProjectStatusFilter)}>
          <option value="all">{copy.allStatuses}</option>
          {PROJECT_STATUSES.map(value => <option key={value} value={value}>{copy.statuses[value]}</option>)}
        </select>
      </div>
      <div className="provider-projects__filter-actions">
        <Button type="submit" size="sm">{copy.apply}</Button>
        <Button type="button" variant="secondary" size="sm" onClick={onClear} disabled={status === 'all' && searchInput.trim() === ''}>{copy.clear}</Button>
      </div>
      <span className="a11y-visually-hidden">{locale === 'ar' ? 'RTL' : 'LTR'}</span>
    </form>
  );
}

function ProjectRow({ project, locale, copy, onEdit, onSubmit }: {
  readonly project: ProjectData;
  readonly locale: SupportedLocale;
  readonly copy: ProviderProjectsCopy;
  readonly onEdit: (project: ProjectData) => void;
  readonly onSubmit: (project: ProjectData) => void;
}) {
  const name = localizedValue(project.name, locale);
  const showReason = project.reviewReason !== undefined && (project.status === 'needs_changes' || project.status === 'rejected');
  return (
    <tr data-testid={`provider-project-${project.id}`} data-project-status={project.status}>
      <td>
        <div className="provider-projects__identity">
          <strong>{name}</strong>
          {project.description?.[locale] ? <span>{project.description[locale]}</span> : null}
        </div>
      </td>
      <td><code>{project.slug}</code></td>
      <td><ProjectStatusBadge status={project.status} copy={copy} /></td>
      <td>{showReason ? <span className="provider-projects__reason"><strong>{copy.reason}</strong> {project.reviewReason}</span> : <span className="provider-projects__unavailable">{copy.viewUnavailable}</span>}</td>
      <td><time dateTime={project.updatedAt}>{dateLabel(project.updatedAt, locale)}</time></td>
      <td>
        <div className="provider-projects__actions">
          {project.availableActions.includes('update') ? <Button size="xs" variant="secondary" onClick={() => onEdit(project)} aria-label={`${copy.edit}: ${name}`}>{copy.edit}</Button> : null}
          {project.availableActions.includes('submit') ? <Button size="xs" onClick={() => onSubmit(project)} aria-label={`${copy.submit}: ${name}`}>{copy.submit}</Button> : null}
          {project.availableActions.length === 0 ? <span className="provider-projects__unavailable">{copy.noActions}</span> : null}
        </div>
      </td>
    </tr>
  );
}

function ProjectsContent({ data, locale, copy, status, searchInput, query, onStatusChange, onSearchInputChange, onSubmit, onClear, onPageChange, onAdd, onEdit, onSubmitProject }: {
  readonly data: ProviderProjectsData;
  readonly locale: SupportedLocale;
  readonly copy: ProviderProjectsCopy;
  readonly status: ProviderProjectStatusFilter;
  readonly searchInput: string;
  readonly query: ProviderProjectsQuery;
  readonly onStatusChange: (status: ProviderProjectStatusFilter) => void;
  readonly onSearchInputChange: (value: string) => void;
  readonly onSubmit: () => void;
  readonly onClear: () => void;
  readonly onPageChange: (page: number) => void;
  readonly onAdd: () => void;
  readonly onEdit: (project: ProjectData) => void;
  readonly onSubmitProject: (project: ProjectData) => void;
}) {
  const pageCount = Math.ceil(data.total / data.limit);
  const numberFormat = new Intl.NumberFormat(locale);
  const hasFilters = status !== 'all' || query.search !== undefined;
  return (
    <main aria-labelledby="provider-projects-title">
      <div className="provider-projects__heading provider-dashboard__heading-row">
        <div>
          <p className="provider-dashboard__eyebrow">{copy.eyebrow}</p>
          <h1 id="provider-projects-title">{copy.title}</h1>
          <p>{copy.description}</p>
        </div>
        <Button onClick={onAdd} startIcon="+">{copy.add}</Button>
      </div>
      <section className="provider-projects__panel" aria-labelledby="provider-projects-list-title">
        <div className="provider-dashboard__section-heading">
          <h2 id="provider-projects-list-title">{copy.title}</h2>
          <span className="provider-projects__count" data-testid="provider-projects-count">{numberFormat.format(data.total)} {copy.countSuffix}</span>
        </div>
        <FilterBar locale={locale} copy={copy} status={status} searchInput={searchInput} onStatusChange={onStatusChange} onSearchInputChange={onSearchInputChange} onSubmit={onSubmit} onClear={onClear} />
        {data.items.length === 0 ? (
          <div className="provider-projects__empty" data-state="empty">
            <h3>{hasFilters ? copy.noResultsTitle : copy.emptyTitle}</h3>
            <p>{hasFilters ? copy.noResultsBody : copy.emptyBody}</p>
            {!hasFilters ? <Button onClick={onAdd}>{copy.add}</Button> : null}
          </div>
        ) : (
          <div className="provider-projects__table-wrap">
            <table className="provider-projects__table">
              <caption className="a11y-visually-hidden">{copy.title}</caption>
              <thead><tr><th scope="col">{copy.columns.project}</th><th scope="col">{copy.columns.slug}</th><th scope="col">{copy.columns.status}</th><th scope="col">{copy.columns.reason}</th><th scope="col">{copy.columns.updated}</th><th scope="col">{copy.columns.actions}</th></tr></thead>
              <tbody>{data.items.map(project => <ProjectRow key={project.id} project={project} locale={locale} copy={copy} onEdit={onEdit} onSubmit={onSubmitProject} />)}</tbody>
            </table>
          </div>
        )}
        <Pagination page={data.page} pageCount={pageCount} onPageChange={onPageChange} previousLabel={copy.previous} nextLabel={copy.next} ariaLabel={copy.pagination} direction={locale === 'ar' ? 'rtl' : 'ltr'} />
      </section>
    </main>
  );
}

export function ProviderProjects({ locale, session, authClient, apiOrigin, load, mutations }: ProviderProjectsProps) {
  const copy = getProviderProjectsCopy(locale);
  const providerCopy = getProviderCopy(locale);
  const [status, setStatus] = useState<ProviderProjectStatusFilter>('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [state, setState] = useState<ProviderProjectsViewState>('loading');
  const [data, setData] = useState<ProviderProjectsData | undefined>();
  const [attempt, setAttempt] = useState(0);
  const [formMode, setFormMode] = useState<'create' | 'edit' | undefined>();
  const [editingProject, setEditingProject] = useState<ProjectData | undefined>();
  const [submitProject, setSubmitProject] = useState<ProjectData | undefined>();
  const [mutationError, setMutationError] = useState<string | undefined>();
  const [feedback, setFeedback] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const query = useMemo<ProviderProjectsQuery>(() => ({ page, limit: 5, ...(status === 'all' ? {} : { status }), ...(search === '' ? {} : { search }) }), [page, search, status]);
  const source = useMemo(() => load ?? createProviderProjectsLoader({ apiOrigin, authorization: authClient }), [apiOrigin, authClient, load]);
  const mutationApi = useMemo(() => mutations ?? createProviderProjectMutationApi({ apiOrigin, authorization: authClient }), [apiOrigin, authClient, mutations]);
  const path = typeof window === 'undefined' ? '/provider/projects' : new URL(window.location.href).pathname.replace(/\/+$/u, '') || '/';
  const sessionRole = session.status === 'authenticated' ? session.role : undefined;

  useEffect(() => {
    if (session.status !== 'authenticated' || sessionRole !== 'provider') {
      setState('permission');
      return undefined;
    }
    const controller = new AbortController();
    setState('loading');
    setData(undefined);
    void source(query, controller.signal).then(nextData => {
      if (controller.signal.aborted) return;
      setData(nextData);
      setState(nextData.items.length === 0 ? 'empty' : 'success');
    }).catch(error => {
      if (!controller.signal.aborted) setState(stateForError(error));
    });
    return () => controller.abort();
  }, [attempt, query, session.status, sessionRole, source]);

  function openCreate(): void {
    setMutationError(undefined);
    setFeedback(undefined);
    setEditingProject(undefined);
    setFormMode('create');
  }

  function openEdit(project: ProjectData): void {
    setMutationError(undefined);
    setFeedback(undefined);
    setEditingProject(project);
    setFormMode('edit');
  }

  function closeDialogs(): void {
    if (saving) return;
    setFormMode(undefined);
    setSubmitProject(undefined);
    setMutationError(undefined);
  }

  async function saveProject(input: ProjectCreate | ProjectPatch): Promise<void> {
    setSaving(true);
    setMutationError(undefined);
    try {
      if (formMode === 'create' && !('version' in input)) {
        await mutationApi.create(input);
        setFeedback(copy.feedback.created);
      } else if (formMode === 'edit' && editingProject !== undefined && 'version' in input) {
        await mutationApi.update(editingProject.id, input);
        setFeedback(copy.feedback.updated);
      } else {
        setMutationError(copy.errors.generic);
        return;
      }
      setFormMode(undefined);
      setEditingProject(undefined);
      setAttempt(value => value + 1);
    } catch (error) {
      setMutationError(errorCopy(error, copy));
    } finally {
      setSaving(false);
    }
  }

  async function submitProjectForReview(input: ProjectSubmitRequest): Promise<void> {
    if (submitProject === undefined) return;
    setSaving(true);
    setMutationError(undefined);
    try {
      await mutationApi.submit(submitProject.id, input);
      setSubmitProject(undefined);
      setFeedback(copy.feedback.submitted);
      setAttempt(value => value + 1);
    } catch (error) {
      setMutationError(errorCopy(error, copy));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="provider-dashboard provider-projects" data-screen-id="PRV-15" data-route="/provider/projects" data-device-scope="desktop">
      <ProviderNavigation locale={locale} activePath={path} />
      <div className="provider-dashboard__content">
        {state === 'loading' || state === 'retry' || state === 'error' || state === 'permission' ? <StatePanel state={state} locale={locale} onRetry={() => setAttempt(value => value + 1)} /> : null}
        {(state === 'success' || state === 'empty') && data !== undefined ? <ProjectsContent data={data} locale={locale} copy={copy} status={status} searchInput={searchInput} query={query} onStatusChange={nextStatus => { setStatus(nextStatus); setPage(1); }} onSearchInputChange={setSearchInput} onSubmit={() => { setSearch(searchInput.trim()); setPage(1); }} onClear={() => { setStatus('all'); setSearchInput(''); setSearch(''); setPage(1); }} onPageChange={setPage} onAdd={openCreate} onEdit={openEdit} onSubmitProject={project => { setMutationError(undefined); setFeedback(undefined); setSubmitProject(project); }} /> : null}
        {feedback ? <p className="provider-projects__feedback" role="status">{feedback}</p> : null}
      </div>
      {formMode !== undefined ? <ProjectFormModal key={`${formMode}-${editingProject?.id ?? 'new'}`} locale={locale} copy={copy} mode={formMode} project={editingProject} saving={saving} error={mutationError} onClose={closeDialogs} onSave={saveProject} /> : null}
      {submitProject !== undefined ? <SubmitProjectModal key={submitProject.id} copy={copy} project={submitProject} saving={saving} error={mutationError} onClose={closeDialogs} onSubmit={submitProjectForReview} /> : null}
      {state === 'permission' ? <span className="a11y-visually-hidden">{providerCopy.states.permission.title}</span> : null}
    </section>
  );
}
