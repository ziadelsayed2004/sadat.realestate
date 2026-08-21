import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  adminUserCreateSchema,
  adminUserPatchSchema,
  rbacRoleCreateRequestSchema,
  rbacRolePatchRequestSchema,
  type AdminUserCreate,
  type AdminUserData,
  type AdminUserListData,
  type AdminUserListQuery,
  type AdminUserPatch,
  type RbacPermission,
  type RbacRoleData,
  type RbacRoleListData,
  type SupportedLocale
} from '@sadat-real-estate/contracts';
import { ApiClientError } from '../contracts/index.ts';
import { AdminNavigation } from '../admin/index.ts';
import { Button, StateMessage } from '../design_system/index.ts';
import type { RouteSession } from '../routing/index.ts';
import {
  ADMIN_RBAC_ROLES_ROUTE,
  ADMIN_RBAC_USERS_ROUTE,
  createAdminRbacSource,
  type AdminRbacAuthorizationSource,
  type AdminRbacSource
} from './data.ts';
import { getAdminRbacCopy } from './copy.ts';
import './styles.css';

export type AdminRbacState = 'loading' | 'empty' | 'error' | 'retry' | 'permission' | 'not_found' | 'conflict' | 'success';

export interface AdminRbacProps {
  readonly url?: string | undefined;
  readonly locale: SupportedLocale;
  readonly session: RouteSession;
  readonly authClient?: AdminRbacAuthorizationSource | undefined;
  readonly apiOrigin?: string | undefined;
  readonly source?: AdminRbacSource | undefined;
}

type AdminRbacView =
  | { readonly kind: 'users'; readonly path: string }
  | { readonly kind: 'user-create'; readonly path: string }
  | { readonly kind: 'user-detail'; readonly path: string; readonly id: string }
  | { readonly kind: 'roles'; readonly path: string }
  | { readonly kind: 'role-detail'; readonly path: string; readonly id: string }
  | { readonly kind: 'not-found'; readonly path: string };

function pathnameFrom(url: string | undefined): string {
  if (url !== undefined) return new URL(url, 'http://sadat-real-estate.local').pathname.replace(/\/+$/u, '') || '/';
  if (typeof window !== 'undefined') return new URL(window.location.href).pathname.replace(/\/+$/u, '') || '/';
  return ADMIN_RBAC_USERS_ROUTE;
}

function viewForPath(path: string): AdminRbacView {
  if (path === ADMIN_RBAC_USERS_ROUTE) return { kind: 'users', path };
  if (path === `${ADMIN_RBAC_USERS_ROUTE}/new`) return { kind: 'user-create', path };
  const user = path.match(/^\/admin\/admin-users\/([a-f0-9]{24})$/u);
  if (user !== null) return { kind: 'user-detail', path, id: user[1]! };
  if (path === ADMIN_RBAC_ROLES_ROUTE) return { kind: 'roles', path };
  const role = path.match(/^\/admin\/roles\/([a-f0-9]{24})$/u);
  if (role !== null) return { kind: 'role-detail', path, id: role[1]! };
  return { kind: 'not-found', path };
}

function localePath(locale: SupportedLocale, path: string): string {
  const url = new URL(path, 'http://sadat-real-estate.local');
  url.searchParams.set('lang', locale);
  return `${url.pathname}${url.search}${url.hash}`;
}

function stateForError(error: unknown, detail = false): AdminRbacState {
  if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) return 'permission';
  if (detail && error instanceof ApiClientError && error.status === 404) return 'not_found';
  if (error instanceof ApiClientError && error.status === 409) return 'conflict';
  if (error instanceof ApiClientError && (error.code === 'NETWORK_ERROR' || error.code === 'ABORTED')) return 'retry';
  return 'error';
}

function validationMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.length > 0) return error.message;
  return fallback;
}

function permissionFor(authClient: AdminRbacAuthorizationSource | undefined, action: string, fallback: boolean): boolean {
  const candidate = authClient as (AdminRbacAuthorizationSource & {
    readonly hasAvailableAction?: (name: string) => boolean;
    readonly getSnapshot?: () => { readonly availableActions?: readonly string[] };
  }) | undefined;
  if (candidate?.hasAvailableAction === undefined) return fallback;
  const actions = candidate.getSnapshot?.().availableActions;
  if (actions !== undefined && actions.length > 0) return candidate.hasAvailableAction(action);
  return fallback;
}

type PanelState = Exclude<AdminRbacState, 'success' | 'empty' | 'not_found'>;

function panelState(state: AdminRbacState): PanelState {
  if (state === 'success' || state === 'empty' || state === 'not_found') return 'error';
  return state;
}

function StatePanel({ state, locale, onRetry }: { readonly state: Exclude<AdminRbacState, 'success' | 'empty' | 'not_found'>; readonly locale: SupportedLocale; readonly onRetry: () => void }) {
  const copy = getAdminRbacCopy(locale);
  const message = copy.states[state];
  return <section className="admin-rbac__state" data-state={state} aria-label={message.title}><StateMessage state={state === 'conflict' ? 'error' : state} title={message.title} message={message.body} retryLabel={copy.retry} onRetry={state === 'retry' ? onRetry : undefined} />{state === 'error' || state === 'conflict' ? <Button variant="secondary" size="sm" onClick={onRetry}>{copy.retry}</Button> : null}</section>;
}

function Shell({ locale, path, screenId, state, children }: { readonly locale: SupportedLocale; readonly path: string; readonly screenId: string; readonly state: AdminRbacState; readonly children: ReactNode }) {
  const copy = getAdminRbacCopy(locale);
  return <section className="admin-rbac" data-screen-id={screenId} data-route={path} data-device-scope="desktop" data-state={state} dir={locale === 'ar' ? 'rtl' : 'ltr'}><AdminNavigation locale={locale} activePath="/admin/users" /><div className="admin-rbac__content"><header className="admin-rbac__heading"><div><p className="admin-rbac__eyebrow">{copy.eyebrow}</p><h1>{copy.users} · {copy.roles}</h1><p>{copy.directionNote}</p></div></header><nav className="admin-rbac__tabs" aria-label={copy.eyebrow}><a href={localePath(locale, ADMIN_RBAC_USERS_ROUTE)} aria-current={path.startsWith(ADMIN_RBAC_USERS_ROUTE) ? 'page' : undefined}>{copy.users}</a><a href={localePath(locale, ADMIN_RBAC_ROLES_ROUTE)} aria-current={path.startsWith(ADMIN_RBAC_ROLES_ROUTE) ? 'page' : undefined}>{copy.roles}</a></nav>{children}</div></section>;
}

function Field({ label, id, value, onChange, type = 'text', required = false, disabled = false }: { readonly label: string; readonly id: string; readonly value: string; readonly onChange: (value: string) => void; readonly type?: 'text' | 'email'; readonly required?: boolean; readonly disabled?: boolean }) {
  return <label className="admin-rbac__field" htmlFor={id}>{label}<input id={id} type={type} value={value} required={required} disabled={disabled} onChange={event => onChange(event.target.value)} /></label>;
}

function ReasonField({ copy, value, onChange, disabled }: { readonly copy: ReturnType<typeof getAdminRbacCopy>; readonly value: string; readonly onChange: (value: string) => void; readonly disabled?: boolean }) {
  return <label className="admin-rbac__field" htmlFor="admin-rbac-reason">{copy.reason}<textarea id="admin-rbac-reason" required minLength={3} maxLength={1_000} value={value} disabled={disabled} placeholder={copy.reasonPlaceholder} onChange={event => onChange(event.target.value)} /></label>;
}

function UsersList({ locale, source, authClient }: { readonly locale: SupportedLocale; readonly source: AdminRbacSource; readonly authClient?: AdminRbacAuthorizationSource | undefined }) {
  const copy = getAdminRbacCopy(locale);
  const [query, setQuery] = useState<AdminUserListQuery>({ page: 1, limit: 20 });
  const [data, setData] = useState<AdminUserListData | undefined>();
  const [state, setState] = useState<AdminRbacState>('loading');
  const [attempt, setAttempt] = useState(0);
  const canCreate = permissionFor(authClient, 'admin:staff.manage', true);
  useEffect(() => {
    const controller = new AbortController();
    setState('loading');
    void source.loadUsers(query, controller.signal).then(next => {
      if (controller.signal.aborted) return;
      setData(next); setState(next.items.length === 0 ? 'empty' : 'success');
    }).catch(error => { if (!controller.signal.aborted) setState(stateForError(error)); });
    return () => controller.abort();
  }, [attempt, query, source]);
  const pageCount = data === undefined ? 1 : Math.max(1, Math.ceil(data.total / data.limit));
  return <Shell locale={locale} path={ADMIN_RBAC_USERS_ROUTE} screenId="ADM-59" state={state}><div className="admin-rbac__panel-heading"><div><h2>{copy.users}</h2><p>{copy.usersDescription}</p></div>{canCreate ? <a className="ui-button ui-button--primary ui-button--md" href={localePath(locale, `${ADMIN_RBAC_USERS_ROUTE}/new`)}>{copy.addUser}</a> : null}</div><div className="admin-rbac__filters"><label htmlFor="admin-rbac-status">{copy.filterStatus}<select id="admin-rbac-status" value={query.status ?? ''} onChange={event => setQuery(current => ({ ...current, page: 1, status: event.target.value === '' ? undefined : event.target.value as AdminUserListQuery['status'] }))}><option value="">{copy.all}</option><option value="active">{copy.activeStatus}</option><option value="disabled">{copy.disabledStatus}</option></select></label><label htmlFor="admin-rbac-access">{copy.filterAccess}<select id="admin-rbac-access" value={query.accessLevel ?? ''} onChange={event => setQuery(current => ({ ...current, page: 1, accessLevel: event.target.value === '' ? undefined : event.target.value as AdminUserListQuery['accessLevel'] }))}><option value="">{copy.all}</option><option value="super_admin">{copy.superAdmin}</option><option value="standard_admin">{copy.standardAdmin}</option></select></label></div>{state === 'loading' || state === 'error' || state === 'retry' || state === 'permission' ? <StatePanel state={state === 'loading' ? 'loading' : panelState(state)} locale={locale} onRetry={() => setAttempt(value => value + 1)} /> : null}{state === 'empty' ? <section className="admin-rbac__state" data-state="empty" aria-label={copy.states.empty.title}><StateMessage state="empty" title={copy.states.empty.title} message={copy.noUsers} /></section> : null}{state === 'success' && data !== undefined ? <section className="admin-rbac__panel"><table className="admin-rbac__table"><caption className="a11y-visually-hidden">{copy.users}</caption><thead><tr><th scope="col">{copy.displayName}</th><th scope="col">{copy.email}</th><th scope="col">{copy.accessLevel}</th><th scope="col">{copy.status}</th><th scope="col">{copy.version}</th><th scope="col">{copy.edit}</th></tr></thead><tbody>{data.items.map(user => <tr key={user.id}><td>{user.displayName}<small><code>{user.id}</code></small></td><td>{user.email}</td><td>{user.accessLevel === 'super_admin' ? copy.superAdmin : copy.standardAdmin}</td><td>{user.status === 'active' ? copy.activeStatus : copy.disabledStatus}</td><td>{user.version}</td><td>{user.availableActions.includes('update') ? <a className="admin-rbac__row-link" href={localePath(locale, `${ADMIN_RBAC_USERS_ROUTE}/${user.id}`)}>{copy.edit}</a> : <span className="admin-rbac__muted">{copy.noActions}</span>}</td></tr>)}</tbody></table><div className="admin-rbac__pagination"><Button size="sm" variant="secondary" disabled={query.page <= 1} onClick={() => setQuery(current => ({ ...current, page: current.page - 1 }))}>{copy.back}</Button><span aria-live="polite">{query.page} / {pageCount}</span><Button size="sm" variant="secondary" disabled={query.page >= pageCount} onClick={() => setQuery(current => ({ ...current, page: current.page + 1 }))}>{copy.retry}</Button></div></section> : null}</Shell>;
}

function UserCreate({ locale, source, authClient }: { readonly locale: SupportedLocale; readonly source: AdminRbacSource; readonly authClient?: AdminRbacAuthorizationSource | undefined }) {
  const copy = getAdminRbacCopy(locale);
  const [form, setForm] = useState<AdminUserCreate>({ email: '', displayName: '', accessLevel: 'standard_admin' });
  const [state, setState] = useState<AdminRbacState>('success');
  const [feedback, setFeedback] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const canCreate = permissionFor(authClient, 'admin:staff.manage', true);
  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault(); setFeedback(undefined);
    if (!canCreate) { setState('permission'); return; }
    const parsed = adminUserCreateSchema.safeParse(form);
    if (!parsed.success) { setFeedback(copy.validation); return; }
    setSaving(true);
    try { await source.createUser(parsed.data); setFeedback(copy.saved); setState('success'); }
    catch (error) { setState(stateForError(error)); setFeedback(validationMessage(error, copy.validation)); }
    finally { setSaving(false); }
  }
  return <Shell locale={locale} path={`${ADMIN_RBAC_USERS_ROUTE}/new`} screenId="ADM-60" state={state}><section className="admin-rbac__form-panel"><div className="admin-rbac__panel-heading"><div><h2>{copy.addUser}</h2><p>{copy.usersDescription}</p></div><a className="admin-rbac__row-link" href={localePath(locale, ADMIN_RBAC_USERS_ROUTE)}>{copy.back}</a></div><form onSubmit={event => { void submit(event); }}><div className="admin-rbac__form-grid"><Field label={copy.displayName} id="admin-rbac-display-name" value={form.displayName} required disabled={!canCreate || saving} onChange={displayName => setForm(current => ({ ...current, displayName }))} /><Field label={copy.email} id="admin-rbac-email" type="email" value={form.email} required disabled={!canCreate || saving} onChange={email => setForm(current => ({ ...current, email }))} /><label className="admin-rbac__field" htmlFor="admin-rbac-access-level">{copy.accessLevel}<select id="admin-rbac-access-level" value={form.accessLevel} disabled={!canCreate || saving} onChange={event => setForm(current => ({ ...current, accessLevel: event.target.value as AdminUserCreate['accessLevel'] }))}><option value="standard_admin">{copy.standardAdmin}</option><option value="super_admin">{copy.superAdmin}</option></select></label></div><Button type="submit" loading={saving} disabled={!canCreate}>{copy.save}</Button>{feedback !== undefined ? <p className="admin-rbac__feedback" role="alert">{feedback}</p> : null}</form></section></Shell>;
}

function UserDetail({ id, locale, source }: { readonly id: string; readonly locale: SupportedLocale; readonly source: AdminRbacSource }) {
  const copy = getAdminRbacCopy(locale);
  const [user, setUser] = useState<AdminUserData | undefined>();
  const [state, setState] = useState<AdminRbacState>('loading');
  const [attempt, setAttempt] = useState(0);
  const [form, setForm] = useState<AdminUserPatch>({ expectedVersion: 0, reason: '', displayName: '' });
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | undefined>();
  useEffect(() => {
    const controller = new AbortController(); setState('loading');
    void source.loadUser(id, controller.signal).then(next => { if (controller.signal.aborted) return; setUser(next); setForm({ expectedVersion: next.version, reason: '', email: next.email, displayName: next.displayName, accessLevel: next.accessLevel }); setState('success'); }).catch(error => { if (!controller.signal.aborted) setState(stateForError(error, true)); });
    return () => controller.abort();
  }, [attempt, id, source]);
  async function submit(event: FormEvent<HTMLFormElement>, status?: AdminUserPatch['status']): Promise<void> {
    event.preventDefault(); setFeedback(undefined);
    if (user === undefined) return;
    const input = { ...form, ...(status === undefined ? {} : { status }), reason: form.reason.trim() };
    if (input.reason.length < 3) { setFeedback(copy.reasonRequired); return; }
    const parsed = adminUserPatchSchema.safeParse(input);
    if (!parsed.success) { setFeedback(copy.validation); return; }
    setSaving(true);
    try { const next = await source.updateUser(id, parsed.data); setUser(next); setForm({ expectedVersion: next.version, reason: '', email: next.email, displayName: next.displayName, accessLevel: next.accessLevel }); setFeedback(copy.saved); setState('success'); }
    catch (error) { setState(stateForError(error, true)); setFeedback(validationMessage(error, copy.validation)); }
    finally { setSaving(false); }
  }
  const screenId = user?.accessLevel === 'super_admin' ? 'ADM-61' : 'ADM-62';
  if (state === 'loading') return <Shell locale={locale} path={`${ADMIN_RBAC_USERS_ROUTE}/${id}`} screenId="ADM-61" state={state}><StatePanel state="loading" locale={locale} onRetry={() => setAttempt(value => value + 1)} /></Shell>;
  if (state === 'not_found' || state === 'permission' || state === 'error' || state === 'retry' || user === undefined) return <Shell locale={locale} path={`${ADMIN_RBAC_USERS_ROUTE}/${id}`} screenId="ADM-61" state={state}><StatePanel state={panelState(state)} locale={locale} onRetry={() => setAttempt(value => value + 1)} /></Shell>;
  const canUpdate = user.availableActions.includes('update');
  const canDisable = user.availableActions.includes('disable');
  const canEnable = user.availableActions.includes('enable');
  return <Shell locale={locale} path={`${ADMIN_RBAC_USERS_ROUTE}/${id}`} screenId={screenId} state={state}><section className="admin-rbac__form-panel"><div className="admin-rbac__panel-heading"><div><h2>{user.displayName}</h2><p>{user.email} · {user.accessLevel === 'super_admin' ? copy.superAdmin : copy.standardAdmin}</p></div><span className="admin-rbac__status">{user.status === 'active' ? copy.activeStatus : copy.disabledStatus}</span></div><dl className="admin-rbac__details"><div><dt>{copy.version}</dt><dd>{user.version}</dd></div><div><dt>{copy.createdAt}</dt><dd>{user.createdAt}</dd></div><div><dt>{copy.updatedAt}</dt><dd>{user.updatedAt}</dd></div></dl>{canUpdate ? <form onSubmit={event => { void submit(event); }}><div className="admin-rbac__form-grid"><Field label={copy.displayName} id="admin-rbac-detail-name" value={form.displayName ?? ''} disabled={saving} onChange={displayName => setForm(current => ({ ...current, displayName }))} /><Field label={copy.email} id="admin-rbac-detail-email" type="email" value={form.email ?? ''} disabled={saving} onChange={email => setForm(current => ({ ...current, email }))} /><label className="admin-rbac__field" htmlFor="admin-rbac-detail-level">{copy.accessLevel}<select id="admin-rbac-detail-level" value={form.accessLevel ?? user.accessLevel} disabled={saving} onChange={event => setForm(current => ({ ...current, accessLevel: event.target.value as AdminUserPatch['accessLevel'] }))}><option value="standard_admin">{copy.standardAdmin}</option><option value="super_admin">{copy.superAdmin}</option></select></label></div><ReasonField copy={copy} value={form.reason} disabled={saving} onChange={reason => setForm(current => ({ ...current, reason }))} /><div className="admin-rbac__actions"><Button type="submit" loading={saving}>{copy.save}</Button>{canDisable ? <Button type="button" variant="danger" disabled={saving} onClick={event => { void submit(event as unknown as FormEvent<HTMLFormElement>, 'disabled'); }}>{copy.disable}</Button> : null}{canEnable ? <Button type="button" variant="secondary" disabled={saving} onClick={event => { void submit(event as unknown as FormEvent<HTMLFormElement>, 'active'); }}>{copy.enable}</Button> : null}</div>{feedback !== undefined ? <p className="admin-rbac__feedback" role="alert">{feedback}</p> : null}</form> : <p className="admin-rbac__muted">{copy.noActions}</p>}</section></Shell>;
}

function RoleList({ locale, source }: { readonly locale: SupportedLocale; readonly source: AdminRbacSource }) {
  const copy = getAdminRbacCopy(locale);
  const [data, setData] = useState<RbacRoleListData | undefined>();
  const [state, setState] = useState<AdminRbacState>('loading');
  const [attempt, setAttempt] = useState(0);
  const [creating, setCreating] = useState(false);
  const [feedback, setFeedback] = useState<string | undefined>();
  const [form, setForm] = useState({ name: '', description: '', accessMode: 'custom' as 'custom' | 'view_only', permissions: [] as RbacPermission[], reason: '' });
  useEffect(() => { const controller = new AbortController(); setState('loading'); void source.loadRoles(controller.signal).then(next => { if (controller.signal.aborted) return; setData(next); setState(next.items.length === 0 ? 'empty' : 'success'); }).catch(error => { if (!controller.signal.aborted) setState(stateForError(error)); }); return () => controller.abort(); }, [attempt, source]);
  const canManage = data?.effectivePermissions.includes('admin:roles.manage') ?? false;
  function togglePermission(permission: RbacPermission): void { setForm(current => ({ ...current, permissions: current.permissions.includes(permission) ? current.permissions.filter(item => item !== permission) : [...current.permissions, permission] })); }
  async function create(event: FormEvent<HTMLFormElement>): Promise<void> { event.preventDefault(); setFeedback(undefined); const parsed = rbacRoleCreateRequestSchema.safeParse(form); if (!parsed.success) { setFeedback(copy.validation); return; } setCreating(true); try { await source.createRole(parsed.data); setFeedback(copy.saved); setAttempt(value => value + 1); } catch (error) { setState(stateForError(error)); setFeedback(validationMessage(error, copy.validation)); } finally { setCreating(false); } }
  return <Shell locale={locale} path={ADMIN_RBAC_ROLES_ROUTE} screenId="ADM-63" state={state}><div className="admin-rbac__panel-heading"><div><h2>{copy.roles}</h2><p>{copy.rolesDescription}</p></div></div>{state === 'loading' || state === 'error' || state === 'retry' || state === 'permission' ? <StatePanel state={state === 'loading' ? 'loading' : panelState(state)} locale={locale} onRetry={() => setAttempt(value => value + 1)} /> : null}{state === 'empty' ? <section className="admin-rbac__state" data-state="empty" aria-label={copy.states.empty.title}><StateMessage state="empty" title={copy.states.empty.title} message={copy.noRoles} /></section> : null}{state === 'success' && data !== undefined ? <><section className="admin-rbac__panel"><table className="admin-rbac__table"><caption className="a11y-visually-hidden">{copy.roles}</caption><thead><tr><th scope="col">{copy.roleName}</th><th scope="col">{copy.accessMode}</th><th scope="col">{copy.permissions}</th><th scope="col">{copy.active}</th><th scope="col">{copy.edit}</th></tr></thead><tbody>{data.items.map(role => <tr key={role.id}><td><a className="admin-rbac__row-link" href={localePath(locale, `${ADMIN_RBAC_ROLES_ROUTE}/${role.id}`)}>{role.name}</a><small><code>{role.id}</code></small></td><td>{role.accessMode === 'view_only' ? copy.viewOnly : copy.custom}</td><td>{role.permissions.length}</td><td>{role.active ? copy.activeStatus : copy.disabledStatus}</td><td>{role.availableActions.includes('update') ? <a className="admin-rbac__row-link" href={localePath(locale, `${ADMIN_RBAC_ROLES_ROUTE}/${role.id}`)}>{copy.edit}</a> : <span className="admin-rbac__muted">{copy.noActions}</span>}</td></tr>)}</tbody></table></section>{canManage ? <section className="admin-rbac__form-panel"><h3>{copy.createRole}</h3><form onSubmit={event => { void create(event); }}><div className="admin-rbac__form-grid"><Field label={copy.roleName} id="admin-rbac-role-name" value={form.name} disabled={creating} onChange={name => setForm(current => ({ ...current, name }))} /><Field label={copy.description} id="admin-rbac-role-description" value={form.description} disabled={creating} onChange={description => setForm(current => ({ ...current, description }))} /><label className="admin-rbac__field" htmlFor="admin-rbac-role-mode">{copy.accessMode}<select id="admin-rbac-role-mode" value={form.accessMode} disabled={creating} onChange={event => setForm(current => ({ ...current, accessMode: event.target.value as 'custom' | 'view_only', permissions: event.target.value === 'view_only' ? current.permissions.filter(item => item.endsWith('.view')) : current.permissions }))}><option value="custom">{copy.custom}</option><option value="view_only">{copy.viewOnly}</option></select></label></div><fieldset className="admin-rbac__permissions"><legend>{copy.permissionCatalog}</legend>{data.permissionCatalog.map(permission => <label key={permission}><input type="checkbox" checked={form.permissions.includes(permission)} disabled={creating || (form.accessMode === 'view_only' && !permission.endsWith('.view'))} onChange={() => togglePermission(permission)} />{permission}</label>)}</fieldset><ReasonField copy={copy} value={form.reason} disabled={creating} onChange={reason => setForm(current => ({ ...current, reason }))} /><Button type="submit" loading={creating}>{copy.createRole}</Button>{feedback !== undefined ? <p className="admin-rbac__feedback" role="alert">{feedback}</p> : null}</form></section> : null}</> : null}</Shell>;
}

function RoleDetail({ id, locale, source }: { readonly id: string; readonly locale: SupportedLocale; readonly source: AdminRbacSource }) {
  const copy = getAdminRbacCopy(locale);
  const [data, setData] = useState<RbacRoleListData | undefined>();
  const [role, setRole] = useState<RbacRoleData | undefined>();
  const [state, setState] = useState<AdminRbacState>('loading');
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | undefined>();
  const [form, setForm] = useState({ name: '', description: '', accessMode: 'custom' as 'custom' | 'view_only', permissions: [] as RbacPermission[], active: true, version: 0, reason: '' });
  useEffect(() => { const controller = new AbortController(); setState('loading'); void source.loadRoles(controller.signal).then(next => { if (controller.signal.aborted) return; const found = next.items.find(item => item.id === id); setData(next); setRole(found); if (found !== undefined) setForm({ name: found.name, description: found.description ?? '', accessMode: found.accessMode, permissions: [...found.permissions], active: found.active, version: found.version, reason: '' }); setState(found === undefined ? 'not_found' : 'success'); }).catch(error => { if (!controller.signal.aborted) setState(stateForError(error, true)); }); return () => controller.abort(); }, [attempt, id, source]);
  if (state === 'loading') return <Shell locale={locale} path={`${ADMIN_RBAC_ROLES_ROUTE}/${id}`} screenId="ADM-64" state={state}><StatePanel state="loading" locale={locale} onRetry={() => setAttempt(value => value + 1)} /></Shell>;
  if (role === undefined || data === undefined) return <Shell locale={locale} path={`${ADMIN_RBAC_ROLES_ROUTE}/${id}`} screenId="ADM-64" state={state}><StatePanel state={panelState(state)} locale={locale} onRetry={() => setAttempt(value => value + 1)} /></Shell>;
  const canUpdate = role.availableActions.includes('update') && data.effectivePermissions.includes('admin:roles.manage');
  function togglePermission(permission: RbacPermission): void { setForm(current => ({ ...current, permissions: current.permissions.includes(permission) ? current.permissions.filter(item => item !== permission) : [...current.permissions, permission] })); }
  async function save(event: FormEvent<HTMLFormElement>): Promise<void> { event.preventDefault(); setFeedback(undefined); const parsed = rbacRolePatchRequestSchema.safeParse({ version: form.version, reason: form.reason, name: form.name, description: form.description === '' ? null : form.description, accessMode: form.accessMode, permissions: form.permissions, active: form.active }); if (!parsed.success) { setFeedback(copy.validation); return; } setSaving(true); try { const next = await source.updateRole(id, parsed.data); setRole(next); setForm(current => ({ ...current, version: next.version, reason: '', name: next.name, description: next.description ?? '', accessMode: next.accessMode, permissions: [...next.permissions], active: next.active })); setFeedback(copy.saved); setState('success'); } catch (error) { setState(stateForError(error, true)); setFeedback(validationMessage(error, copy.validation)); } finally { setSaving(false); } }
  return <Shell locale={locale} path={`${ADMIN_RBAC_ROLES_ROUTE}/${id}`} screenId="ADM-64" state={state}><section className="admin-rbac__form-panel"><div className="admin-rbac__panel-heading"><div><h2>{role.name}</h2><p>{copy.rolesDescription}</p></div><a className="admin-rbac__row-link" href={localePath(locale, ADMIN_RBAC_ROLES_ROUTE)}>{copy.back}</a></div>{canUpdate ? <form onSubmit={event => { void save(event); }}><div className="admin-rbac__form-grid"><Field label={copy.roleName} id="admin-rbac-role-detail-name" value={form.name} disabled={saving} onChange={name => setForm(current => ({ ...current, name }))} /><Field label={copy.description} id="admin-rbac-role-detail-description" value={form.description} disabled={saving} onChange={description => setForm(current => ({ ...current, description }))} /><label className="admin-rbac__field" htmlFor="admin-rbac-role-detail-mode">{copy.accessMode}<select id="admin-rbac-role-detail-mode" value={form.accessMode} disabled={saving} onChange={event => setForm(current => ({ ...current, accessMode: event.target.value as 'custom' | 'view_only', permissions: event.target.value === 'view_only' ? current.permissions.filter(item => item.endsWith('.view')) : current.permissions }))}><option value="custom">{copy.custom}</option><option value="view_only">{copy.viewOnly}</option></select></label></div><label className="admin-rbac__checkbox"><input type="checkbox" checked={form.active} disabled={saving} onChange={event => setForm(current => ({ ...current, active: event.target.checked }))} />{copy.active}</label><fieldset className="admin-rbac__permissions"><legend>{copy.permissions}</legend>{data.permissionCatalog.map(permission => <label key={permission}><input type="checkbox" checked={form.permissions.includes(permission)} disabled={saving || (form.accessMode === 'view_only' && !permission.endsWith('.view'))} onChange={() => togglePermission(permission)} />{permission}</label>)}</fieldset><ReasonField copy={copy} value={form.reason} disabled={saving} onChange={reason => setForm(current => ({ ...current, reason }))} /><Button type="submit" loading={saving}>{copy.save}</Button>{feedback !== undefined ? <p className="admin-rbac__feedback" role="alert">{feedback}</p> : null}</form> : <p className="admin-rbac__muted">{copy.noActions}</p>}</section></Shell>;
}

export function AdminRbac({ url, locale, session, authClient, apiOrigin, source: providedSource }: AdminRbacProps) {
  const path = pathnameFrom(url);
  const view = viewForPath(path);
  const source = useMemo(() => providedSource ?? createAdminRbacSource({ apiOrigin, authorization: authClient }), [apiOrigin, authClient, providedSource]);
  if (session.status !== 'authenticated' || session.role !== 'admin') return <Shell locale={locale} path={path} screenId="ADM-59" state="permission"><StatePanel state="permission" locale={locale} onRetry={() => undefined} /></Shell>;
  if (view.kind === 'not-found') return <Shell locale={locale} path={path} screenId="ADM-59" state="not_found"><StatePanel state="error" locale={locale} onRetry={() => undefined} /></Shell>;
  if (view.kind === 'users') return <UsersList locale={locale} source={source} authClient={authClient} />;
  if (view.kind === 'user-create') return <UserCreate locale={locale} source={source} authClient={authClient} />;
  if (view.kind === 'user-detail') return <UserDetail id={view.id} locale={locale} source={source} />;
  if (view.kind === 'roles') return <RoleList locale={locale} source={source} />;
  return <RoleDetail id={view.id} locale={locale} source={source} />;
}
