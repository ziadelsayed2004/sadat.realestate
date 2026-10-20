import { ProviderSecurity } from './security.tsx';
import { CompanyEditor } from '../admin_accounts/company-editor.tsx';
import { useEffect, useMemo, useState } from 'react';
import {
  providerSettingsPatchSchema,
  type ProviderSettingsData,
  type ProviderSettingsPatch,
  type SupportedLocale
} from '@sadat-real-estate/contracts';
import { ApiClientError } from '../contracts/index.ts';
import { Button, Input, StateMessage } from '../design_system/index.ts';
import type { RouteSession } from '../routing/index.ts';
import { ProviderNavigation } from './overview.tsx';
import type { ProviderAuthorizationSource } from './data.ts';
import {
  createProviderSettingsActions,
  createProviderSettingsLoader,
  type ProviderSettingsActions,
  type ProviderSettingsLoader
} from './settings-data.ts';
import { getProviderSettingsCopy } from './settings-copy.ts';
import './settings.css';
import '../dashboard_account/settings-mobile.css';

export type ProviderSettingsTab = 'account' | 'contact' | 'security';
export type ProviderSettingsViewState = 'loading' | 'empty' | 'error' | 'retry' | 'success' | 'permission';

export interface ProviderSettingsProps {
  readonly locale: SupportedLocale;
  readonly session: RouteSession;
  readonly authClient?: ProviderAuthorizationSource | undefined;
  readonly apiOrigin?: string | undefined;
  readonly tab?: ProviderSettingsTab | undefined;
  readonly load?: ProviderSettingsLoader | undefined;
  readonly actions?: ProviderSettingsActions | undefined;
}

type SettingsFeedback = 'saved' | 'validation' | 'conflict' | 'permission' | 'error';
type SettingsForm = { email: string; whatsappNumber: string; officeAddress: string; website: string };

function formFromData(data: ProviderSettingsData): SettingsForm {
  return { email: data.email ?? '', whatsappNumber: data.whatsappNumber ?? '', officeAddress: data.officeAddress ?? '', website: data.website ?? '' };
}

function stateForError(error: unknown): Exclude<ProviderSettingsViewState, 'loading' | 'empty' | 'success'> {
  if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) return 'permission';
  if (error instanceof ApiClientError && (error.code === 'NETWORK_ERROR' || error.code === 'ABORTED')) return 'retry';
  return 'error';
}

function feedbackForError(error: unknown): Exclude<SettingsFeedback, 'saved' | 'validation'> {
  if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) return 'permission';
  if (error instanceof ApiClientError && error.status === 409) return 'conflict';
  return 'error';
}

function localeForProviderSettingsPath(locale: SupportedLocale, tab: ProviderSettingsTab): string {
  const url = new URL('/provider/settings', 'http://sadat-real-estate.local');
  url.searchParams.set('tab', tab);
  url.searchParams.set('lang', locale);
  return `${url.pathname}${url.search}`;
}

function StatePanel({ state, locale, onRetry }: { readonly state: Exclude<ProviderSettingsViewState, 'success' | 'empty'>; readonly locale: SupportedLocale; readonly onRetry: () => void }) {
  const copy = getProviderSettingsCopy(locale);
  const message = copy.states[state];
  return (
    <section className="provider-settings__state" data-state={state} aria-label={message.title}>
      <StateMessage state={state} title={message.title} message={message.body} loadingVariant="form" onRetry={state === 'retry' ? onRetry : undefined} retryLabel={copy.retry} />
      {state === 'error' ? <Button variant="secondary" size="sm" onClick={onRetry}>{copy.retry}</Button> : null}
    </section>
  );
}

function SettingsTabs({ locale, active }: { readonly locale: SupportedLocale; readonly active: ProviderSettingsTab }) {
  const copy = getProviderSettingsCopy(locale);
  return (
    <nav className="provider-settings__tabs" aria-label={copy.title}>
      {(['account', 'contact', 'security'] as const).map(tab => <a key={tab} href={localeForProviderSettingsPath(locale, tab)} aria-current={active === tab ? 'page' : undefined} data-active={active === tab || undefined}>{copy.tabs[tab]}</a>)}
    </nav>
  );
}

export function ProviderSettings({ locale, session, authClient, apiOrigin, tab = 'account', load, actions }: ProviderSettingsProps) {
  const copy = getProviderSettingsCopy(locale);
  const [developer, setDeveloper] = useState(false);
  useEffect(() => { let active = true; void authClient?.getProviderApplicationStatus?.().then(application => { if (active) setDeveloper(application.providerType === 'developer_company' && application.status === 'approved'); }, () => {}); return () => { active = false; }; }, [authClient]);
  const [state, setState] = useState<ProviderSettingsViewState>('loading');
  const [data, setData] = useState<ProviderSettingsData | undefined>();
  const [form, setForm] = useState<SettingsForm>({ email: '', whatsappNumber: '', officeAddress: '', website: '' });
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<SettingsFeedback | undefined>();
  const sessionRole = session.status === 'authenticated' ? session.role : undefined;
  const loadSource = useMemo(() => load ?? createProviderSettingsLoader({ apiOrigin, authorization: authClient }), [apiOrigin, authClient, load]);
  const actionSource = useMemo(() => actions ?? createProviderSettingsActions({ apiOrigin, authorization: authClient }), [actions, apiOrigin, authClient]);
  const canSave = data !== undefined && (tab === 'account'
    ? data.availableActions.includes('update_email')
    : tab === 'contact' && data.availableActions.includes('update_contact'));

  useEffect(() => {
    if (session.status !== 'authenticated' || sessionRole !== 'provider') {
      setState('permission');
      return undefined;
    }
    const controller = new AbortController();
    setState('loading');
    void loadSource(controller.signal).then(nextData => {
      if (controller.signal.aborted) return;
      setData(nextData);
      setForm(formFromData(nextData));
      setState('success');
    }).catch(error => {
      if (controller.signal.aborted) return;
      setState(error instanceof ApiClientError && error.status === 404 ? 'empty' : stateForError(error));
    });
    return () => controller.abort();
  }, [attempt, loadSource, sessionRole, session.status]);

  const updateField = (field: keyof SettingsForm) => (event: React.ChangeEvent<HTMLInputElement>) => setForm(current => ({ ...current, [field]: event.target.value }));
  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (sessionRole !== 'provider') {
      setFeedback('permission');
      return;
    }
    if (data === undefined || tab === 'security' || !canSave) return;
    const input: ProviderSettingsPatch = tab === 'account'
      ? { expectedVersion: data.version, email: form.email.trim() }
      : { expectedVersion: data.version, whatsappNumber: form.whatsappNumber.trim() || null, officeAddress: form.officeAddress.trim() || null, website: form.website.trim() || null };
    const parsed = providerSettingsPatchSchema.safeParse(input);
    if (!parsed.success) { setFeedback('validation'); return; }
    setFeedback(undefined);
    setSaving(true);
    try {
      const next = await actionSource.update(parsed.data);
      setData(next);
      setForm(formFromData(next));
      setFeedback('saved');
    } catch (error) { setFeedback(feedbackForError(error)); }
    finally { setSaving(false); }
  };

  const feedbackMessage = feedback === undefined ? undefined : copy.feedback[feedback];
  const screenId = tab === 'account' ? 'PRV-22-1' : tab === 'contact' ? 'PRV-22-2' : 'PRV-22-3';
  return (
    <section className="provider-dashboard provider-settings" data-testid="provider-settings-page" data-screen-id={screenId} data-route="/provider/settings" data-device-scope="desktop">
      <ProviderNavigation locale={locale} activePath="/provider/settings" authClient={authClient} />
      <div className="provider-dashboard__content">
        {developer && tab === 'account' ? <CompanyEditor owner providerId="self" locale={locale} authorization={authClient} apiOrigin={apiOrigin} /> : null}
        {state !== 'success' && state !== 'empty' ? <StatePanel state={state} locale={locale} onRetry={() => setAttempt(value => value + 1)} /> : null}
        {state === 'empty' ? <div className="provider-settings__empty" data-state="empty"><h1>{copy.states.empty.title}</h1><p>{copy.states.empty.body}</p></div> : null}
        {state === 'success' && data !== undefined ? (
          <>
            <div className="provider-dashboard__heading-row provider-settings__heading"><div><h1>{copy.title}</h1><p>{copy.description}</p></div></div>
            <SettingsTabs locale={locale} active={tab} />
            {feedbackMessage ? <p className="provider-settings__feedback" data-state={feedback === 'saved' ? 'success' : feedback} role={feedback === 'saved' ? 'status' : 'alert'}>{feedbackMessage}</p> : null}
            {tab === 'account' ? (
              <form className="provider-settings__panel" onSubmit={event => { void save(event); }} aria-labelledby="provider-settings-account-heading">
                <h2 id="provider-settings-account-heading">{copy.account.heading}</h2>
                <Input id="provider-settings-email" type="email" label={copy.account.email} value={form.email} onChange={updateField('email')} disabled={saving || !canSave} autoComplete="email" />
                <p className="provider-settings__notice">{copy.account.legalNotice}</p>
                <Button type="submit" loading={saving} disabled={!canSave}>{copy.account.saveEmail}</Button>
              </form>
            ) : null}
            {tab === 'contact' ? (
              <form className="provider-settings__panel provider-settings__panel--contact" onSubmit={event => { void save(event); }} aria-labelledby="provider-settings-contact-heading">
                <h2 id="provider-settings-contact-heading">{copy.contact.heading}</h2>
                <Input className="provider-settings__contact-field--whatsapp" id="provider-settings-whatsapp" type="tel" label={copy.contact.whatsapp} value={form.whatsappNumber} onChange={updateField('whatsappNumber')} disabled={saving || !canSave} />
                <Input className="provider-settings__contact-field--address" id="provider-settings-address" type="text" label={copy.contact.address} value={form.officeAddress} onChange={updateField('officeAddress')} disabled={saving || !canSave} />
                <Input className="provider-settings__contact-field--website" id="provider-settings-website" type="url" label={copy.contact.website} value={form.website} onChange={updateField('website')} disabled={saving || !canSave} />
                <Button type="submit" loading={saving} disabled={!canSave}>{copy.contact.save}</Button>
              </form>
            ) : null}
            {tab === 'security' ? (
              <ProviderSecurity locale={locale} authorization={authClient} apiOrigin={apiOrigin} />
            ) : null}
          </>
        ) : null}
      </div>
    </section>
  );
}
