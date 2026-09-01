import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type {
  FeatureData,
  LocalizedText,
  LocationData,
  SupportedLocale,
  TaxonomyData
} from '@sadat-real-estate/contracts';
import { ApiClient, ApiClientError } from '../contracts/index.ts';
import { Button, Modal, StateMessage } from '../design_system/index.ts';
import type { RouteSession } from '../routing/index.ts';
import { AdminNavigation } from '../admin/index.ts';
import {
  createAdminMasterDataSource,
  type AdminMasterDataSource,
  type MasterDataItem,
  type MasterDataList
} from './data.ts';
import { getAdminMasterDataCopy, type AdminMasterDataState, type AdminMasterDataTab } from './copy.ts';
import './styles.css';

export interface AdminMasterDataProps {
  readonly locale: SupportedLocale;
  readonly session: RouteSession;
  readonly authClient?: { readonly getAuthorizationHeader: () => string | undefined } | undefined;
  readonly apiClient?: ApiClient | undefined;
  readonly apiOrigin?: string | undefined;
  readonly initialData?: MasterDataList | undefined;
  readonly initialState?: AdminMasterDataState | undefined;
}

interface FormState {
  readonly kind: string;
  readonly nameAr: string;
  readonly nameEn: string;
  readonly slug: string;
  readonly parentId: string;
  readonly categoryId: string;
  readonly groupKey: string;
  readonly order: string;
  readonly active: boolean;
  readonly reason: string;
  readonly latitude: string;
  readonly longitude: string;
}

type ModalState = { readonly mode: 'create' | 'edit'; readonly item?: MasterDataItem | undefined } | { readonly mode: 'delete'; readonly item: MasterDataItem } | undefined;

const tabRoutes: Readonly<Record<AdminMasterDataTab, string>> = {
  categories: '/admin/property-categories',
  locations: '/admin/locations',
  features: '/admin/features'
};

function tabForPath(path: string): AdminMasterDataTab {
  if (path === tabRoutes.locations || path.startsWith(`${tabRoutes.locations}/`)) return 'locations';
  if (path === tabRoutes.features || path.startsWith(`${tabRoutes.features}/`)) return 'features';
  return 'categories';
}

function currentPath(): string {
  if (typeof window === 'undefined') return tabRoutes.categories;
  return new URL(window.location.href).pathname.replace(/\/+$/u, '') || '/';
}

function localizedPath(locale: SupportedLocale, path: string): string {
  const url = new URL(path, 'http://sadat-real-estate.local');
  url.searchParams.set('lang', locale);
  return `${url.pathname}${url.search}`;
}

function localizedValue(value: LocalizedText, locale: SupportedLocale): string {
  return value[locale] ?? value.en ?? value.ar ?? '—';
}

function isLocation(item: MasterDataItem): item is LocationData {
  return item.kind === 'location' || item.kind === 'neighborhood';
}

function isTaxonomy(item: MasterDataItem): item is TaxonomyData {
  return item.kind === 'category' || item.kind === 'type';
}

function isFeature(item: MasterDataItem): item is FeatureData {
  return item.kind === 'feature' || item.kind === 'service';
}

function formFromItem(item: MasterDataItem | undefined, tab: AdminMasterDataTab): FormState {
  const name = item?.name;
  return {
    kind: item?.kind ?? (tab === 'categories' ? 'category' : tab === 'locations' ? 'location' : 'feature'),
    nameAr: name?.ar ?? '',
    nameEn: name?.en ?? '',
    slug: item?.slug ?? '',
    parentId: item !== undefined && isLocation(item) ? item.parentLocationId ?? '' : '',
    categoryId: item !== undefined && isTaxonomy(item) ? item.categoryId ?? '' : '',
    groupKey: item !== undefined && isFeature(item) ? item.groupKey : '',
    order: item === undefined ? '0' : String(item.order),
    active: item?.active ?? true,
    reason: '',
    latitude: item !== undefined && isLocation(item) && item.coordinates !== undefined ? String(item.coordinates.latitude) : '',
    longitude: item !== undefined && isLocation(item) && item.coordinates !== undefined ? String(item.coordinates.longitude) : ''
  };
}

function nameFromForm(form: FormState): LocalizedText {
  return {
    ...(form.nameAr.trim() === '' ? {} : { ar: form.nameAr.trim() }),
    ...(form.nameEn.trim() === '' ? {} : { en: form.nameEn.trim() }),
  };
}

function buildPayload(tab: AdminMasterDataTab, form: FormState, item: MasterDataItem | undefined): unknown {
  const common = { name: nameFromForm(form), slug: form.slug.trim(), order: Number(form.order), active: form.active, reason: form.reason.trim() };
  if (tab === 'categories') {
    if (item === undefined) return { ...common, kind: form.kind, ...(form.kind === 'type' && form.categoryId.trim() !== '' ? { categoryId: form.categoryId.trim() } : {}) };
    return { ...common, version: item.version, ...(form.kind === 'type' && form.categoryId.trim() !== '' ? { categoryId: form.categoryId.trim() } : {}) };
  }
  if (tab === 'locations') {
    const coordinates = form.latitude.trim() !== '' && form.longitude.trim() !== '' ? { latitude: Number(form.latitude), longitude: Number(form.longitude) } : undefined;
    if (item === undefined) return { ...common, kind: form.kind, ...(form.kind === 'neighborhood' && form.parentId.trim() !== '' ? { parentLocationId: form.parentId.trim() } : {}), ...(coordinates === undefined ? {} : { coordinates }) };
    return { ...common, version: item.version, ...(form.parentId.trim() === '' ? {} : { parentLocationId: form.parentId.trim() }), ...(coordinates === undefined ? {} : { coordinates }) };
  }
  if (item === undefined) return { ...common, kind: form.kind, groupKey: form.groupKey.trim() };
  return { ...common, version: item.version, groupKey: form.groupKey.trim() };
}

function stateForError(error: unknown): Exclude<AdminMasterDataState, 'loading' | 'empty' | 'success'> {
  if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) return 'permission';
  if (error instanceof ApiClientError && (error.code === 'NETWORK_ERROR' || error.code === 'ABORTED')) return 'retry';
  return 'error';
}

function stateForData(data: MasterDataList): AdminMasterDataState {
  return data.items.length === 0 ? 'empty' : 'success';
}

function dateLabel(value: string, locale: SupportedLocale): string {
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(value));
  } catch {
    return '—';
  }
}

function StatePanel({ state, locale, onRetry }: { readonly state: Exclude<AdminMasterDataState, 'empty' | 'success'>; readonly locale: SupportedLocale; readonly onRetry: () => void }) {
  const copy = getAdminMasterDataCopy(locale);
  const message = copy.states[state];
  return (
    <section className="admin-master-data__state" data-state={state} aria-label={message.title}>
      <StateMessage state={state} title={message.title} message={message.body} retryLabel={copy.retry} onRetry={state === 'retry' ? onRetry : undefined} />
      {state === 'error' ? <Button variant="secondary" size="sm" onClick={onRetry}>{copy.retry}</Button> : null}
    </section>
  );
}

function parentLabel(item: MasterDataItem, data: MasterDataList, tab: AdminMasterDataTab, locale: SupportedLocale, copy: ReturnType<typeof getAdminMasterDataCopy>): string {
  if (tab === 'features' && isFeature(item)) return item.groupKey;
  if (tab === 'categories' && isTaxonomy(item)) {
    if (item.categoryId === undefined) return copy.noParent;
    const parent = data.items.find(candidate => candidate.id === item.categoryId);
    return parent === undefined ? item.categoryId : localizedValue(parent.name, locale);
  }
  if (tab === 'locations' && isLocation(item)) {
    if (item.parentLocationId === undefined) return copy.noParent;
    const parent = data.items.find(candidate => candidate.id === item.parentLocationId);
    return parent === undefined ? item.parentLocationId : localizedValue(parent.name, locale);
  }
  return copy.noGroup;
}

function MasterDataTable({ tab, data, locale, copy, onEdit, onDelete }: { readonly tab: AdminMasterDataTab; readonly data: MasterDataList; readonly locale: SupportedLocale; readonly copy: ReturnType<typeof getAdminMasterDataCopy>; readonly onEdit: (item: MasterDataItem) => void; readonly onDelete: (item: MasterDataItem) => void }) {
  return (
    <div className="admin-master-data__table-wrap">
      <table className="admin-master-data__table">
        <caption className="sr-only">{copy.titles[tab]}</caption>
        <thead><tr><th scope="col">{copy.columns.name}</th><th scope="col">{copy.columns.kind}</th><th scope="col">{copy.columns.parent}</th><th scope="col">{copy.columns.order}</th><th scope="col">{copy.columns.active}</th><th scope="col">{copy.columns.updated}</th><th scope="col">{copy.columns.actions}</th></tr></thead>
        <tbody>
          {data.items.map(item => {
            const canEdit = item.availableActions.includes('update');
            const canDelete = item.availableActions.includes('delete');
            return (
              <tr key={item.id} data-testid={`admin-master-data-item-${item.id}`}>
                <td><div className="admin-master-data__identity"><strong>{localizedValue(item.name, locale)}</strong><small>{item.slug}</small></div></td>
                <td><span className="admin-master-data__kind">{copy.kinds[item.kind] ?? item.kind}</span></td>
                <td>{parentLabel(item, data, tab, locale, copy)}</td>
                <td className="admin-master-data__number">{new Intl.NumberFormat(locale).format(item.order)}</td>
                <td><span className={`admin-master-data__status admin-master-data__status--${item.active ? 'active' : 'inactive'}`}>{item.active ? copy.active : copy.inactive}</span></td>
                <td>{dateLabel(item.updatedAt, locale)}</td>
                <td><div className="admin-master-data__actions">
                  {canEdit ? <Button variant="ghost" size="sm" onClick={() => onEdit(item)} aria-label={`${copy.edit}: ${localizedValue(item.name, locale)}`}>{copy.edit}</Button> : null}
                  {canDelete ? <Button variant="ghost" size="sm" onClick={() => onDelete(item)} aria-label={`${copy.delete}: ${localizedValue(item.name, locale)}`}>{copy.delete}</Button> : null}
                  {!canEdit && !canDelete ? <span className="admin-master-data__muted">{copy.noActions}</span> : null}
                </div></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function FormField({ id, label, value, placeholder, onChange, type = 'text', required = false, disabled = false, min, max, step }: { readonly id: string; readonly label: string; readonly value: string; readonly placeholder?: string; readonly onChange: (value: string) => void; readonly type?: string; readonly required?: boolean; readonly disabled?: boolean; readonly min?: string; readonly max?: string; readonly step?: string }) {
  return <label className="admin-master-data__field" htmlFor={id}><span>{label}{required ? ' *' : ''}</span><input id={id} type={type} value={value} placeholder={placeholder} required={required} disabled={disabled} min={min} max={max} step={step} onChange={event => onChange(event.target.value)} /></label>;
}

function SelectField({ id, label, value, options, onChange, disabled = false }: { readonly id: string; readonly label: string; readonly value: string; readonly options: readonly { readonly value: string; readonly label: string }[]; readonly onChange: (value: string) => void; readonly disabled?: boolean }) {
  return <label className="admin-master-data__field" htmlFor={id}><span>{label}</span><select id={id} value={value} disabled={disabled} onChange={event => onChange(event.target.value)}>{options.map(option => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label>;
}

function EditorForm({ tab, form, copy, editing, data, locale, onChange, onSubmit, onClose, busy, error }: { readonly tab: AdminMasterDataTab; readonly form: FormState; readonly copy: ReturnType<typeof getAdminMasterDataCopy>; readonly editing: boolean; readonly data: MasterDataList | undefined; readonly locale: SupportedLocale; readonly onChange: (next: Partial<FormState>) => void; readonly onSubmit: (event: FormEvent<HTMLFormElement>) => void; readonly onClose: () => void; readonly busy: boolean; readonly error: string | undefined }) {
  const kindOptions = tab === 'categories' ? [{ value: 'category', label: copy.kinds.category }, { value: 'type', label: copy.kinds.type }] : tab === 'locations' ? [{ value: 'location', label: copy.kinds.location }, { value: 'neighborhood', label: copy.kinds.neighborhood }] : [{ value: 'feature', label: copy.kinds.feature }, { value: 'service', label: copy.kinds.service }];
  const parentOptions = data?.items.filter(item => tab === 'locations' ? item.kind === 'location' : item.kind === 'category').map(item => ({ value: item.id, label: localizedValue(item.name, locale) })) ?? [];
  return (
    <form className="admin-master-data__form" onSubmit={onSubmit}>
      <div className="admin-master-data__form-grid">
        <SelectField id="admin-master-data-kind" label={copy.labels.kind} value={form.kind} options={kindOptions} disabled={editing} onChange={kind => onChange({ kind })} />
        <FormField id="admin-master-data-slug" label={copy.labels.slug} value={form.slug} placeholder={copy.placeholders.slug} required onChange={slug => onChange({ slug })} disabled={editing} />
        <FormField id="admin-master-data-name-ar" label={copy.labels.nameAr} value={form.nameAr} placeholder={copy.placeholders.nameAr} onChange={nameAr => onChange({ nameAr })} />
        <FormField id="admin-master-data-name-en" label={copy.labels.nameEn} value={form.nameEn} placeholder={copy.placeholders.nameEn} onChange={nameEn => onChange({ nameEn })} />
        <FormField id="admin-master-data-order" label={copy.labels.order} value={form.order} type="number" min="0" step="1" required onChange={order => onChange({ order })} />
        {tab === 'categories' && form.kind === 'type' ? <SelectField id="admin-master-data-category" label={copy.labels.category} value={form.categoryId} options={[{ value: '', label: copy.placeholders.category }, ...parentOptions]} onChange={categoryId => onChange({ categoryId })} /> : null}
        {tab === 'locations' && form.kind === 'neighborhood' ? <SelectField id="admin-master-data-parent" label={copy.labels.parent} value={form.parentId} options={[{ value: '', label: copy.placeholders.parent }, ...parentOptions]} onChange={parentId => onChange({ parentId })} /> : null}
        {tab === 'features' ? <FormField id="admin-master-data-group" label={copy.labels.group} value={form.groupKey} placeholder={copy.placeholders.group} required onChange={groupKey => onChange({ groupKey })} /> : null}
        {tab === 'locations' ? <><FormField id="admin-master-data-latitude" label={copy.labels.latitude} value={form.latitude} placeholder={copy.placeholders.latitude} type="number" step="any" onChange={latitude => onChange({ latitude })} /><FormField id="admin-master-data-longitude" label={copy.labels.longitude} value={form.longitude} placeholder={copy.placeholders.longitude} type="number" step="any" onChange={longitude => onChange({ longitude })} /></> : null}
        <label className="admin-master-data__checkbox"><input type="checkbox" checked={form.active} onChange={event => onChange({ active: event.target.checked })} /> <span>{copy.labels.active}</span></label>
        <label className="admin-master-data__field admin-master-data__field--wide" htmlFor="admin-master-data-reason"><span>{copy.labels.reason} *</span><textarea id="admin-master-data-reason" value={form.reason} placeholder={copy.placeholders.reason} minLength={5} maxLength={500} required rows={3} onChange={event => onChange({ reason: event.target.value })} /></label>
      </div>
      {error !== undefined ? <p className="admin-master-data__form-error" role="alert">{error}</p> : null}
      <div className="admin-master-data__form-actions"><Button type="submit" loading={busy}>{copy.save}</Button><Button type="button" variant="secondary" disabled={busy} onClick={onClose}>{copy.cancel}</Button></div>
    </form>
  );
}

export function AdminMasterData({ locale, session, authClient, apiClient, apiOrigin, initialData, initialState = 'loading' }: AdminMasterDataProps) {
  const copy = getAdminMasterDataCopy(locale);
  const initialTab = useState<AdminMasterDataTab>(() => tabForPath(currentPath()))[0];
  const [tab, setTab] = useState<AdminMasterDataTab>(initialTab);
  const [state, setState] = useState<AdminMasterDataState>(() => initialData === undefined ? initialState : stateForData(initialData));
  const [data, setData] = useState<MasterDataList | undefined>(initialData);
  const [attempt, setAttempt] = useState(0);
  const [modal, setModal] = useState<ModalState>();
  const [form, setForm] = useState<FormState>(() => formFromItem(undefined, initialTab));
  const [busy, setBusy] = useState(false);
  const [mutationError, setMutationError] = useState<string | undefined>();
  const [feedback, setFeedback] = useState<string | undefined>();
  const source: AdminMasterDataSource = useMemo(() => createAdminMasterDataSource({ apiClient, apiOrigin, authorization: authClient }), [apiClient, apiOrigin, authClient]);
  const path = currentPath();
  const sessionRole = session.status === 'authenticated' ? session.role : undefined;
  const screenId = tab === 'categories' ? 'ADM-09' : tab === 'locations' ? 'ADM-10' : 'ADM-11';

  useEffect(() => {
    if (session.status !== 'authenticated' || sessionRole !== 'admin') {
      setState('permission');
      return undefined;
    }
    if (initialData !== undefined && tab === initialTab && attempt === 0) return undefined;
    const controller = new AbortController();
    setState('loading');
    void source.load(tab, controller.signal).then(nextData => {
      if (controller.signal.aborted) return;
      setData(nextData);
      setState(stateForData(nextData));
    }).catch(error => {
      if (controller.signal.aborted) return;
      setState(stateForError(error));
    });
    return () => controller.abort();
  }, [attempt, initialData, initialTab, session.status, sessionRole, source, tab]);

  function changeTab(nextTab: AdminMasterDataTab): void {
    setTab(nextTab);
    setFeedback(undefined);
    setMutationError(undefined);
  }

  function openCreate(): void {
    setForm(formFromItem(undefined, tab));
    setMutationError(undefined);
    setModal({ mode: 'create' });
  }

  function openEdit(item: MasterDataItem): void {
    setForm(formFromItem(item, tab));
    setMutationError(undefined);
    setModal({ mode: 'edit', item });
  }

  function openDelete(item: MasterDataItem): void {
    setForm({ ...formFromItem(item, tab), reason: '' });
    setMutationError(undefined);
    setModal({ mode: 'delete', item });
  }

  function patchForm(next: Partial<FormState>): void {
    setForm(current => ({ ...current, ...next }));
    setMutationError(undefined);
  }

  function applyItem(nextItem: MasterDataItem, editing: boolean): void {
    setData(current => current === undefined ? current : {
      ...current,
      items: editing ? current.items.map(item => item.id === nextItem.id ? nextItem : item) : [nextItem, ...current.items],
      total: editing ? current.total : current.total + 1
    });
  }

  function removeItem(id: string): void {
    setData(current => current === undefined ? current : { ...current, items: current.items.filter(item => item.id !== id), total: Math.max(0, current.total - 1) });
  }

  async function submitEditor(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (modal === undefined || modal.mode === 'delete') return;
    if (nameFromForm(form).ar === undefined && nameFromForm(form).en === undefined) {
      setMutationError(copy.mutation.validation);
      return;
    }
    if (form.reason.trim().length < 5) {
      setMutationError(copy.mutation.validation);
      return;
    }
    setBusy(true);
    setMutationError(undefined);
    try {
      const payload = buildPayload(tab, form, modal.item);
      const nextItem = tab === 'categories'
        ? modal.mode === 'create' ? await source.createTaxonomy(payload) : await source.updateTaxonomy(modal.item!.id, payload)
        : tab === 'locations'
        ? modal.mode === 'create' ? await source.createLocation(payload) : await source.updateLocation(modal.item!.id, payload)
        : modal.mode === 'create' ? await source.createFeature(payload) : await source.updateFeature(modal.item!.id, payload);
      applyItem(nextItem, modal.mode === 'edit');
      setFeedback(modal.mode === 'create' ? copy.mutation.created : copy.mutation.updated);
      setModal(undefined);
    } catch (error) {
      setMutationError(error instanceof ApiClientError && (error.status === 401 || error.status === 403) ? copy.states.permission.body : error instanceof Error && error.message.length > 0 ? error.message : copy.mutation.failed);
    } finally {
      setBusy(false);
    }
  }

  async function submitDelete(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (modal === undefined || modal.mode !== 'delete' || form.reason.trim().length < 5) {
      setMutationError(copy.mutation.validation);
      return;
    }
    setBusy(true);
    setMutationError(undefined);
    try {
      const payload = { version: modal.item.version, reason: form.reason.trim() };
      if (tab === 'categories') await source.deleteTaxonomy(modal.item.id, payload);
      else if (tab === 'locations') await source.deleteLocation(modal.item.id, payload);
      else await source.deleteFeature(modal.item.id, payload);
      removeItem(modal.item.id);
      setFeedback(copy.mutation.deleted);
      setModal(undefined);
    } catch (error) {
      setMutationError(error instanceof ApiClientError && (error.status === 401 || error.status === 403) ? copy.states.permission.body : error instanceof Error && error.message.length > 0 ? error.message : copy.mutation.failed);
    } finally {
      setBusy(false);
    }
  }

  const title = copy.titles[tab];
  return (
    <section className="admin-master-data" data-screen-id={screenId} data-route={tabRoutes[tab]} data-device-scope="desktop" data-admin-state={state}>
      <AdminNavigation locale={locale} activePath={path} />
      <div className="admin-master-data__content">
        <div className="admin-master-data__main">
          <header className="admin-master-data__heading">
            <div><p className="admin-master-data__eyebrow">{copy.eyebrow}</p><h1>{title}</h1><p>{copy.descriptions[tab]}</p><small>{copy.directionNote}</small></div>
            <Button onClick={openCreate} disabled={state === 'permission'}>{copy.add}</Button>
          </header>
          <nav className="admin-master-data__tabs" aria-label={copy.navigationLabel}>
            {(Object.keys(tabRoutes) as AdminMasterDataTab[]).map(nextTab => <a key={nextTab} href={localizedPath(locale, tabRoutes[nextTab])} data-active={nextTab === tab || undefined} aria-current={nextTab === tab ? 'page' : undefined} onClick={() => changeTab(nextTab)}>{copy.tabs[nextTab]}</a>)}
          </nav>
          {feedback !== undefined ? <p className="admin-master-data__feedback" role="status">{feedback}</p> : null}
          {state === 'loading' || state === 'retry' || state === 'error' || state === 'permission' ? <StatePanel state={state} locale={locale} onRetry={() => setAttempt(value => value + 1)} /> : null}
          {state === 'empty' && data !== undefined ? <section className="admin-master-data__empty" data-state="empty"><h2>{copy.states.empty.title}</h2><p>{copy.states.empty.body}</p><Button onClick={openCreate}>{copy.add}</Button></section> : null}
          {state === 'success' && data !== undefined ? <section className="admin-master-data__panel" aria-labelledby="admin-master-data-list-title"><div className="admin-master-data__panel-heading"><div><h2 id="admin-master-data-list-title">{title}</h2><p data-testid="admin-master-data-total">{copy.count(data.total)}</p></div><Button variant="secondary" size="sm" onClick={() => setAttempt(value => value + 1)}>{copy.retry}</Button></div><MasterDataTable tab={tab} data={data} locale={locale} copy={copy} onEdit={openEdit} onDelete={openDelete} /></section> : null}
        </div>
      </div>
      {modal?.mode === 'create' || modal?.mode === 'edit' ? <Modal open title={modal.mode === 'create' ? copy.add : copy.edit} description={title} closeLabel={copy.close} onClose={() => setModal(undefined)}><EditorForm tab={tab} form={form} copy={copy} editing={modal.mode === 'edit'} data={data} locale={locale} onChange={patchForm} onSubmit={event => { void submitEditor(event); }} onClose={() => setModal(undefined)} busy={busy} error={mutationError} /></Modal> : null}
      {modal?.mode === 'delete' ? <Modal open title={copy.confirmDelete} description={localizedValue(modal.item.name, locale)} closeLabel={copy.close} onClose={() => setModal(undefined)}><form className="admin-master-data__delete-form" onSubmit={event => { void submitDelete(event); }}><p>{copy.mutation.deleted}</p><label className="admin-master-data__field" htmlFor="admin-master-data-delete-reason"><span>{copy.labels.reason} *</span><textarea id="admin-master-data-delete-reason" value={form.reason} minLength={5} maxLength={500} required rows={3} placeholder={copy.placeholders.reason} onChange={event => patchForm({ reason: event.target.value })} /></label>{mutationError !== undefined ? <p className="admin-master-data__form-error" role="alert">{mutationError}</p> : null}<div className="admin-master-data__form-actions"><Button type="submit" loading={busy}>{copy.delete}</Button><Button type="button" variant="secondary" disabled={busy} onClick={() => setModal(undefined)}>{copy.cancel}</Button></div></form></Modal> : null}
    </section>
  );
}
