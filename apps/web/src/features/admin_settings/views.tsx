import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import type { AdminSettingsData, AdminSettingsNamespace, AdminSettingsUpdate, AdminSettingsValues, SupportedLocale } from '@sadat-real-estate/contracts';
import { ApiClientError } from '../contracts/index.ts';
import { Button, StateMessage } from '../design_system/index.ts';
import { AdminNavigation } from '../admin/index.ts';
import type { RouteSession } from '../routing/index.ts';
import {
  ADMIN_SETTINGS_ADVERTISING_ROUTE,
  ADMIN_SETTINGS_CONTACT_ROUTE,
  ADMIN_SETTINGS_DISPLAY_ROUTE,
  ADMIN_SETTINGS_NAMESPACES,
  ADMIN_SETTINGS_PLATFORM_ROUTE,
  ADMIN_SETTINGS_PRIVACY_SECURITY_ROUTE,
  ADMIN_SETTINGS_PROPERTIES_ROUTE,
  ADMIN_SETTINGS_REQUESTS_ROUTE,
  ADMIN_SETTINGS_SEO_ROUTE,
  ADMIN_SETTINGS_SOCIAL_ROUTE,
  arrayDraft,
  booleanDraft,
  type AdminSettingsLoader,
  type AdminSettingsMutation,
  type AdminSettingsSource,
  copySettingsValues,
  createAdminSettingsSource,
  localizedDraft,
  numberDraft,
  setArrayValue,
  setBooleanValue,
  setLocalizedValue,
  setNumberValue,
  setTextValue,
  stringDraft
} from './data.ts';
import { getAdminSettingsCopy } from './copy.ts';
import './styles.css';

export type AdminSettingsState = 'loading' | 'empty' | 'error' | 'retry' | 'permission' | 'conflict' | 'success' | 'not_found';
type SettingsNamespace = AdminSettingsNamespace;
type DraftValues = ReturnType<typeof copySettingsValues>;
type LocalizedLocale = 'ar' | 'en';

const SETTINGS_ROUTES: Readonly<Record<SettingsNamespace, string>> = {
  platform: ADMIN_SETTINGS_PLATFORM_ROUTE,
  contact: ADMIN_SETTINGS_CONTACT_ROUTE,
  social: ADMIN_SETTINGS_SOCIAL_ROUTE,
  properties: ADMIN_SETTINGS_PROPERTIES_ROUTE,
  requests: ADMIN_SETTINGS_REQUESTS_ROUTE,
  advertising: ADMIN_SETTINGS_ADVERTISING_ROUTE,
  seo: ADMIN_SETTINGS_SEO_ROUTE,
  'privacy-security': ADMIN_SETTINGS_PRIVACY_SECURITY_ROUTE,
  display: ADMIN_SETTINGS_DISPLAY_ROUTE
};

const SETTINGS_SCREEN_IDS: Readonly<Record<SettingsNamespace, string>> = {
  platform: 'ADM-50',
  contact: 'ADM-51',
  social: 'ADM-52',
  properties: 'ADM-53',
  requests: 'ADM-54',
  advertising: 'ADM-55',
  seo: 'ADM-56',
  'privacy-security': 'ADM-57',
  display: 'ADM-58'
};

const LOCALES: readonly LocalizedLocale[] = ['ar', 'en',];

type Field = {
  readonly key: string;
  readonly kind: 'localized' | 'text' | 'url' | 'number' | 'boolean' | 'array' | 'select';
  readonly labelKey: string;
  readonly options?: readonly { readonly value: string; readonly labelKey: string }[];
};

const FIELD_MAP: Readonly<Record<SettingsNamespace, readonly Field[]>> = {
  platform: [
    { key: 'platform_name', kind: 'localized', labelKey: 'platform_name' },
    { key: 'short_name', kind: 'localized', labelKey: 'short_name' },
    { key: 'description', kind: 'localized', labelKey: 'description' },
    { key: 'city', kind: 'text', labelKey: 'city' },
    { key: 'timezone', kind: 'text', labelKey: 'timezone' },
    { key: 'currency', kind: 'text', labelKey: 'currency' },
    { key: 'default_locale', kind: 'text', labelKey: 'default_locale' },
    { key: 'primary_email', kind: 'text', labelKey: 'primary_email' },
    { key: 'primary_phone', kind: 'text', labelKey: 'primary_phone' },
    { key: 'office_address', kind: 'localized', labelKey: 'office_address' },
    { key: 'working_hours', kind: 'localized', labelKey: 'working_hours' }
  ],
  contact: [
    { key: 'primary_phone', kind: 'text', labelKey: 'primary_phone' },
    { key: 'whatsapp_number', kind: 'text', labelKey: 'whatsapp_number' },
    { key: 'primary_email', kind: 'text', labelKey: 'primary_email' },
    { key: 'office_address', kind: 'localized', labelKey: 'office_address' },
    { key: 'map_url', kind: 'url', labelKey: 'map_url' }
  ],
  social: [
    { key: 'facebook_url', kind: 'url', labelKey: 'facebook_url' },
    { key: 'instagram_url', kind: 'url', labelKey: 'instagram_url' },
    { key: 'linkedin_url', kind: 'url', labelKey: 'linkedin_url' },
    { key: 'youtube_url', kind: 'url', labelKey: 'youtube_url' },
    { key: 'tiktok_url', kind: 'url', labelKey: 'tiktok_url' }
  ],
  properties: [
    { key: 'requires_admin_review', kind: 'boolean', labelKey: 'requires_admin_review' },
    { key: 'publication_after_approval', kind: 'select', labelKey: 'publication_after_approval', options: [{ value: 'automatic', labelKey: 'option_automatic' }, { value: 'manual', labelKey: 'option_manual' }] },
    { key: 'automatic_expiry', kind: 'select', labelKey: 'automatic_expiry', options: [{ value: 'never', labelKey: 'option_never' }, { value: '30_days', labelKey: 'option_30_days' }, { value: '60_days', labelKey: 'option_60_days' }, { value: '90_days', labelKey: 'option_90_days' }] },
    { key: 'max_images', kind: 'number', labelKey: 'max_images' },
    { key: 'accepted_image_formats', kind: 'array', labelKey: 'accepted_image_formats' },
    { key: 'max_image_size_mb', kind: 'number', labelKey: 'max_image_size_mb' },
    { key: 'hide_provider_contact', kind: 'boolean', labelKey: 'hide_provider_contact' },
    { key: 'contact_visibility', kind: 'select', labelKey: 'contact_visibility', options: [{ value: 'authenticated', labelKey: 'option_authenticated' }, { value: 'public', labelKey: 'option_public' }, { value: 'after_request', labelKey: 'option_after_request' }] }
  ],
  requests: [],
  advertising: [
    { key: 'supported_placements', kind: 'array', labelKey: 'supported_placements' },
    { key: 'supported_ad_types', kind: 'array', labelKey: 'supported_ad_types' },
    { key: 'desktop_dimensions', kind: 'text', labelKey: 'desktop_dimensions' },
    { key: 'mobile_dimensions', kind: 'text', labelKey: 'mobile_dimensions' },
    { key: 'accepted_file_formats', kind: 'array', labelKey: 'accepted_file_formats' },
    { key: 'quote_validity_days', kind: 'number', labelKey: 'quote_validity_days' },
    { key: 'payment_proof_methods', kind: 'array', labelKey: 'payment_proof_methods' }
  ],
  seo: [
    { key: 'default_seo_title', kind: 'localized', labelKey: 'default_seo_title' },
    { key: 'default_meta_description', kind: 'localized', labelKey: 'default_meta_description' },
    { key: 'title_separator', kind: 'text', labelKey: 'title_separator' },
    { key: 'canonical_domain', kind: 'url', labelKey: 'canonical_domain' },
    { key: 'allow_indexing', kind: 'boolean', labelKey: 'allow_indexing' },
    { key: 'sitemap_status', kind: 'select', labelKey: 'sitemap_status', options: [{ value: 'active', labelKey: 'option_active' }, { value: 'inactive', labelKey: 'option_inactive' }] },
    { key: 'google_search_console_verification', kind: 'text', labelKey: 'google_search_console_verification' }
  ],
  'privacy-security': [
    { key: 'hide_customer_contact', kind: 'boolean', labelKey: 'hide_customer_contact' },
    { key: 'hide_internal_notes', kind: 'boolean', labelKey: 'hide_internal_notes' },
    { key: 'hide_private_documents', kind: 'boolean', labelKey: 'hide_private_documents' },
    { key: 'admin_session_timeout_minutes', kind: 'number', labelKey: 'admin_session_timeout_minutes' },
    { key: 'two_factor_authentication', kind: 'boolean', labelKey: 'two_factor_authentication' }
  ],
  display: [
    { key: 'default_locale', kind: 'select', labelKey: 'default_locale', options: [{ value: 'ar', labelKey: 'option_arabic' }, { value: 'en', labelKey: 'option_english' }] },
    { key: 'page_direction', kind: 'select', labelKey: 'page_direction', options: [{ value: 'rtl', labelKey: 'option_rtl' }, { value: 'ltr', labelKey: 'option_ltr' }] },
    { key: 'page_size', kind: 'number', labelKey: 'page_size' },
    { key: 'population_count', kind: 'number', labelKey: 'population_count' },
    { key: 'population_label', kind: 'localized', labelKey: 'population_label' },
    { key: 'show_population_counter', kind: 'boolean', labelKey: 'show_population_counter' },
    { key: 'blocked_word_review', kind: 'boolean', labelKey: 'blocked_word_review' },
    { key: 'blocked_words', kind: 'array', labelKey: 'blocked_words' },
    { key: 'blocked_word_action', kind: 'select', labelKey: 'blocked_word_action', options: [{ value: 'manual_review', labelKey: 'option_manual_review' }, { value: 'reject', labelKey: 'option_reject' }] },
    { key: 'daily_post_limit', kind: 'number', labelKey: 'daily_post_limit' },
    { key: 'moderation_wait_hours', kind: 'number', labelKey: 'moderation_wait_hours' }
  ]
};

function namespaceForPath(path: string): SettingsNamespace | undefined {
  const normalized = path.replace(/\/+$/u, '') || '/';
  if (normalized === ADMIN_SETTINGS_PLATFORM_ROUTE) return 'platform';
  if (normalized === ADMIN_SETTINGS_CONTACT_ROUTE) return 'contact';
  if (normalized === ADMIN_SETTINGS_SOCIAL_ROUTE) return 'social';
  if (normalized === ADMIN_SETTINGS_PROPERTIES_ROUTE) return 'properties';
  if (normalized === ADMIN_SETTINGS_REQUESTS_ROUTE) return 'requests';
  if (normalized === ADMIN_SETTINGS_ADVERTISING_ROUTE) return 'advertising';
  if (normalized === ADMIN_SETTINGS_SEO_ROUTE) return 'seo';
  if (normalized === ADMIN_SETTINGS_PRIVACY_SECURITY_ROUTE) return 'privacy-security';
  if (normalized === ADMIN_SETTINGS_DISPLAY_ROUTE) return 'display';
  if (normalized === '/admin/settings') return 'platform';
  return undefined;
}

function fieldsForValues(namespace: SettingsNamespace, values: DraftValues): readonly Field[] {
  const known = FIELD_MAP[namespace];
  const knownKeys = new Set(known.map(field => field.key));
  const dynamic = Object.keys(values).filter(key => !knownKeys.has(key)).map(key => {
    const value = values[key];
    if (value !== undefined && typeof value === 'object' && !Array.isArray(value)) return { key, kind: 'localized' as const, labelKey: key };
    if (Array.isArray(value)) return { key, kind: 'array' as const, labelKey: key };
    if (typeof value === 'boolean') return { key, kind: 'boolean' as const, labelKey: key };
    if (typeof value === 'number') return { key, kind: 'number' as const, labelKey: key };
    return { key, kind: /(?:url|uri|href|link)$/iu.test(key) ? 'url' as const : 'text' as const, labelKey: key };
  });
  return [...known, ...dynamic];
}

function emptyValuesCopy(locale: SupportedLocale): { readonly title: string; readonly body: string } {
  if (locale === 'ar') return {
    title: 'لا توجد إعدادات طلبات مهيّأة بعد',
    body: 'سيتم عرض القيم التي يرسلها API فقط. لا تُضاف قواعد تشغيلية أو قيم إنتاجية غير موثقة من واجهة المستخدم.'
  };
  return {
    title: 'No request settings are configured yet',
    body: 'Only values returned by the API are shown. The interface does not add unverified operational rules or production values.'
  };
}

function localePath(locale: SupportedLocale, path: string): string {
  const url = new URL(path, 'http://sadat.local');
  url.searchParams.set('lang', locale);
  return `${url.pathname}${url.search}${url.hash}`;
}

function stateForError(error: unknown): Exclude<AdminSettingsState, 'loading' | 'success' | 'not_found'> {
  if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) return 'permission';
  if (error instanceof ApiClientError && error.status === 404) return 'empty';
  if (error instanceof ApiClientError && error.status === 409) return 'conflict';
  if (error instanceof ApiClientError && (error.code === 'NETWORK_ERROR' || error.code === 'ABORTED')) return 'retry';
  return 'error';
}

function stateMessage(state: Exclude<AdminSettingsState, 'loading' | 'empty' | 'success'>, locale: SupportedLocale, onRetry: () => void) {
  const copy = getAdminSettingsCopy(locale);
  const message = copy.states[state];
  const componentState = state === 'not_found' || state === 'conflict' ? 'error' : state;
  return <section className="admin-settings__state" data-state={state} aria-label={message.title}><StateMessage state={componentState} title={message.title} message={message.body} loadingVariant="form" retryLabel={copy.retry} onRetry={state === 'retry' || state === 'error' || state === 'conflict' ? onRetry : undefined} />{state === 'error' || state === 'conflict' ? <Button type="button" variant="secondary" size="sm" onClick={onRetry}>{copy.retry}</Button> : null}</section>;
}

function LocalizedField({ field, values, locale, copy, onChange }: { readonly field: Field; readonly values: DraftValues; readonly locale: SupportedLocale; readonly copy: ReturnType<typeof getAdminSettingsCopy>; readonly onChange: (language: LocalizedLocale, value: string) => void }) {
  const value = localizedDraft(values[field.key]);
  const label = copy.fields[field.labelKey] ?? field.key;
  return <fieldset className="admin-settings__localized-field"><legend>{label}</legend><p className="admin-settings__hint">{copy.locales[locale]} · {copy.directionNote}</p><div className="admin-settings__localized-grid">{LOCALES.map(language => <label key={language} htmlFor={`admin-settings-${field.key}-${language}`}>{copy.locales[language]}<textarea id={`admin-settings-${field.key}-${language}`} dir={language === 'ar' ? 'rtl' : 'ltr'} value={value[language]} onChange={event => onChange(language, event.target.value)} /></label>)}</div></fieldset>;
}

function PrimitiveField({ field, values, copy, onChangeText, onChangeArray, onChangeNumber, onChangeBoolean }: { readonly field: Field; readonly values: DraftValues; readonly copy: ReturnType<typeof getAdminSettingsCopy>; readonly onChangeText: (key: string, value: string) => void; readonly onChangeArray: (key: string, value: string) => void; readonly onChangeNumber: (key: string, value: string) => void; readonly onChangeBoolean: (key: string, value: boolean) => void }) {
  const label = copy.fields[field.labelKey] ?? field.key;
  if (field.kind === 'boolean') return <label className="admin-settings__boolean" htmlFor={`admin-settings-${field.key}`}><span>{label}</span><input id={`admin-settings-${field.key}`} type="checkbox" checked={booleanDraft(values[field.key])} onChange={event => onChangeBoolean(field.key, event.target.checked)} /></label>;
  if (field.kind === 'select') return <label htmlFor={`admin-settings-${field.key}`}>{label}<select id={`admin-settings-${field.key}`} value={stringDraft(values[field.key])} onChange={event => onChangeText(field.key, event.target.value)}><option value="">{copy.selectPlaceholder}</option>{field.options?.map(option => <option key={option.value} value={option.value}>{copy.fields[option.labelKey] ?? option.value}</option>)}</select></label>;
  if (field.kind === 'array') return <label style={{ gridColumn: '1 / -1' }} htmlFor={`admin-settings-${field.key}`}>{label}<textarea id={`admin-settings-${field.key}`} value={arrayDraft(values[field.key])} onChange={event => onChangeArray(field.key, event.target.value)} /></label>;
  if (field.kind === 'number') return <label htmlFor={`admin-settings-${field.key}`}>{label}<input id={`admin-settings-${field.key}`} type="number" inputMode="decimal" value={numberDraft(values[field.key])} onChange={event => onChangeNumber(field.key, event.target.value)} /></label>;
  return <label htmlFor={`admin-settings-${field.key}`}>{label}<input id={`admin-settings-${field.key}`} type={field.kind === 'url' ? 'url' : 'text'} value={stringDraft(values[field.key])} onChange={event => onChangeText(field.key, event.target.value)} /></label>;
}

function SettingsForm({ namespace, data, values, locale, saving, onChangeText, onChangeLocalized, onChangeArray, onChangeNumber, onChangeBoolean, onSave }: { readonly namespace: SettingsNamespace; readonly data?: AdminSettingsData; readonly values: DraftValues; readonly locale: SupportedLocale; readonly saving: boolean; readonly onChangeText: (key: string, value: string) => void; readonly onChangeLocalized: (key: string, language: LocalizedLocale, value: string) => void; readonly onChangeArray: (key: string, value: string) => void; readonly onChangeNumber: (key: string, value: string) => void; readonly onChangeBoolean: (key: string, value: boolean) => void; readonly onSave: (input: AdminSettingsUpdate) => Promise<boolean> }) {
  const copy = getAdminSettingsCopy(locale);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | undefined>();
  const fields = fieldsForValues(namespace, values);
  const emptyValues = emptyValuesCopy(locale);
  const showEmptyValues = namespace === 'requests' && fields.length === 0;

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(undefined);
    const trimmedReason = reason.trim();
    if (trimmedReason.length < 3) { setError(copy.reasonRequired); return; }
    const saved = await onSave({ schemaVersion: data?.schemaVersion ?? 1, values: values as AdminSettingsValues, expectedVersion: data?.version ?? 0, reason: trimmedReason });
    if (saved) setReason('');
  }

  return <section className="admin-settings__editor" data-testid={`admin-settings-${namespace}-form`}><div className="admin-settings__editor-heading"><div><h2>{copy.labels[namespace]}</h2><p>{copy.descriptions[namespace]}</p></div><span className="admin-settings__version">{copy.version}: {data?.version ?? 0} · {copy.schemaVersion}: {data?.schemaVersion ?? 1}</span></div><form onSubmit={event => { void submit(event); }}><div className="admin-settings__fields">{showEmptyValues ? <div className="admin-settings__empty-values" data-state="empty-values" role="status"><div className="admin-settings__empty-icon" aria-hidden="true">⌁</div><div><h3>{emptyValues.title}</h3><p>{emptyValues.body}</p></div></div> : fields.map(field => field.kind === 'localized' ? <LocalizedField key={field.key} field={field} values={values} locale={locale} copy={copy} onChange={(language, value) => onChangeLocalized(field.key, language, value)} /> : <PrimitiveField key={field.key} field={field} values={values} copy={copy} onChangeText={onChangeText} onChangeArray={onChangeArray} onChangeNumber={onChangeNumber} onChangeBoolean={onChangeBoolean} />)}</div><p className="admin-settings__hint">{copy.preservedValues}</p><label htmlFor={`admin-settings-${namespace}-reason`}>{copy.reason}<textarea id={`admin-settings-${namespace}-reason`} minLength={3} maxLength={500} required value={reason} onChange={event => setReason(event.target.value)} placeholder={copy.reasonPlaceholder} /></label><div className="admin-settings__actions"><Button type="submit" loading={saving} disabled={saving}>{saving ? copy.saving : copy.save}</Button></div>{error ? <p className="admin-settings__feedback" role="alert">{error}</p> : null}</form></section>;
}

export interface AdminSettingsProps {
  readonly path?: string | undefined;
  readonly locale: SupportedLocale;
  readonly session: RouteSession;
  readonly authClient?: { readonly getAuthorizationHeader: () => string | undefined } | undefined;
  readonly apiOrigin?: string | undefined;
  readonly initialData?: AdminSettingsData | undefined;
  readonly load?: AdminSettingsLoader | undefined;
  readonly update?: AdminSettingsMutation | undefined;
  readonly source?: AdminSettingsSource | undefined;
}

export function AdminSettings({ path = ADMIN_SETTINGS_PLATFORM_ROUTE, locale, session, authClient, apiOrigin, initialData, load, update, source: providedSource }: AdminSettingsProps) {
  const namespace = namespaceForPath(path);
  const copy = getAdminSettingsCopy(locale);
  const source = useMemo(() => providedSource ?? createAdminSettingsSource({ apiOrigin, authorization: authClient }), [apiOrigin, authClient, providedSource]);
  const initialMatches = initialData !== undefined && namespace !== undefined && initialData.namespace === namespace;
  const [state, setState] = useState<AdminSettingsState>(() => namespace === undefined ? 'not_found' : initialMatches ? 'success' : 'loading');
  const [data, setData] = useState<AdminSettingsData | undefined>(() => initialMatches ? initialData : undefined);
  const [values, setValues] = useState<DraftValues>(() => initialMatches ? copySettingsValues(initialData.values) : {});
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const sessionAllowed = session.status === 'authenticated' && session.role === 'admin';
  const settingsTabsRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!sessionAllowed) { setState('permission'); return undefined; }
    if (namespace === undefined) { setState('not_found'); return undefined; }
    if (initialMatches && attempt === 0) return undefined;
    const controller = new AbortController();
    setState('loading');
    const loader = load ?? source.load;
    void loader(namespace, controller.signal).then(next => {
      if (controller.signal.aborted) return;
      setData(next); setValues(copySettingsValues(next.values)); setState('success');
    }).catch(error => {
      if (controller.signal.aborted) return;
      const nextState = stateForError(error);
      if (nextState === 'empty') { setData(undefined); setValues({}); }
      setState(nextState);
    });
    return () => controller.abort();
  }, [attempt, initialMatches, load, namespace, sessionAllowed, source]);

  useEffect(() => {
    const tabs = settingsTabsRef.current;
    const activeTab = tabs?.querySelector<HTMLElement>('[data-active="true"]');
    if (!tabs || !activeTab) return;
    let disposed = false;
    const reveal = () => {
      if (disposed) return;
      const container = tabs.getBoundingClientRect();
      const active = activeTab.getBoundingClientRect();
      tabs.scrollLeft += active.left + active.width / 2 - container.left - container.width / 2;
    };
    // Recalculate after fonts and responsive widths settle, without scrolling the document.
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(reveal);
    observer?.observe(tabs);
    for (const tab of tabs.children) observer?.observe(tab);
    void document.fonts?.ready.then(reveal);
    reveal();
    return () => { disposed = true; observer?.disconnect(); };
  }, [locale, namespace]);

  if (namespace === undefined) return <section className="admin-settings" data-device-scope="desktop" data-admin-settings-state="not_found"><AdminNavigation locale={locale} activePath={path} />{stateMessage('not_found', locale, () => undefined)}</section>;

  const activeNamespace = namespace;
  const activePath = SETTINGS_ROUTES[activeNamespace];
  const refresh = () => setAttempt(value => value + 1);

  async function save(input: AdminSettingsUpdate): Promise<boolean> {
    setSaving(true);
    try {
      const mutation = update ?? source.update;
      const next = await mutation(activeNamespace, input);
      setData(next); setValues(copySettingsValues(next.values)); setState('success');
      return true;
    } catch (error) {
      setState(stateForError(error));
      return false;
    } finally { setSaving(false); }
  }

  return <section className="admin-settings" data-screen-id={SETTINGS_SCREEN_IDS[activeNamespace]} data-route={activePath} data-device-scope="desktop" data-admin-settings-state={state}><AdminNavigation locale={locale} activePath={activePath} /><div className="admin-settings__content"><header className="admin-settings__heading"><div>{activeNamespace === 'requests' ? <p className="admin-settings__eyebrow">{copy.eyebrow}</p> : null}<h1>{copy.labels[activeNamespace]}</h1><p>{copy.descriptions[activeNamespace]}</p></div></header><nav ref={settingsTabsRef} className="admin-settings__tabs" aria-label={copy.eyebrow}>{ADMIN_SETTINGS_NAMESPACES.map(tab => <a key={tab} href={localePath(locale, SETTINGS_ROUTES[tab])} aria-current={activeNamespace === tab ? 'page' : undefined} data-active={activeNamespace === tab || undefined}>{copy.labels[tab]}</a>)}</nav>{state === 'loading' ? <section className="admin-settings__state" data-state="loading" aria-label={copy.states.loading.title}><StateMessage state="loading" title={copy.states.loading.title} message={copy.states.loading.body} loadingVariant="form" /></section> : null}{state === 'permission' || state === 'retry' || state === 'error' || state === 'conflict' ? stateMessage(state, locale, refresh) : null}{state === 'empty' ? <section className="admin-settings__state" data-state="empty" aria-label={copy.states.empty.title}><StateMessage state="empty" title={copy.states.empty.title} message={copy.states.empty.body} /></section> : null}{state === 'success' || state === 'empty' ? <SettingsForm namespace={activeNamespace} {...(data === undefined ? {} : { data })} values={values} locale={locale} saving={saving} onChangeText={(key, value) => setValues(current => setTextValue(current, key, value))} onChangeLocalized={(key, language, value) => setValues(current => setLocalizedValue(current, key, language, value))} onChangeArray={(key, value) => setValues(current => setArrayValue(current, key, value))} onChangeNumber={(key, value) => setValues(current => setNumberValue(current, key, value))} onChangeBoolean={(key, value) => setValues(current => setBooleanValue(current, key, value))} onSave={save} /> : null}<p className="admin-settings__direction-note">{copy.directionNote}</p></div></section>;
}
