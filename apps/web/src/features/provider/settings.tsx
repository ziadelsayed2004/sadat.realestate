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
  if (error instanceof ApiClientError && error.status === 401 || error instanceof ApiClientError && error.status === 403) return 'permission';
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
      <StateMessage state={state} title={message.title} message={message.body} onRetry={state === 'retry' ? onRetry : undefined} retryLabel={copy.retry} />
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
  const [state, setState] = useState<ProviderSettingsViewState>('loading');
  const [data, setData] = useState<ProviderSettingsData | undefined>();
  const [form, setForm] = useState<SettingsForm>({ email: '', whatsappNumber: '', officeAddress: '', website: '' });
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<SettingsFeedback | undefined>();
  const sessionRole = session.status === 'authenticated' ? session.role : undefined;
  const loadSource = useMemo(() => load ?? createProviderSettingsLoader({ apiOrigin, authorization: authClient }), [apiOrigin, authClient, load]);
  const actionSource = useMemo(() => actions ?? createProviderSettingsActions({ apiOrigin, authorization: authClient }), [actions, apiOrigin, authClient]);

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
    if (data === undefined || tab === 'security') return;
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
      <ProviderNavigation locale={locale} activePath="/provider/settings" />
      <div className="provider-dashboard__content">
        {state !== 'success' && state !== 'empty' ? <StatePanel state={state} locale={locale} onRetry={() => setAttempt(value => value + 1)} /> : null}
        {state === 'empty' ? <div className="provider-settings__empty" data-state="empty"><h1>{copy.states.empty.title}</h1><p>{copy.states.empty.body}</p></div> : null}
        {state === 'success' && data !== undefined ? (
          <>
            <div className="provider-dashboard__heading-row"><div><p className="provider-dashboard__eyebrow">{copy.eyebrow}</p><h1>{copy.title}</h1><p>{copy.description}</p></div></div>
            <SettingsTabs locale={locale} active={tab} />
            {feedbackMessage ? <p className="provider-settings__feedback" data-state={feedback === 'saved' ? 'success' : feedback} role={feedback === 'saved' ? 'status' : 'alert'}>{feedbackMessage}</p> : null}
            {tab === 'account' ? (
              <form className="provider-settings__panel" onSubmit={event => { void save(event); }} aria-labelledby="provider-settings-account-heading">
                <h2 id="provider-settings-account-heading">{copy.account.heading}</h2>
                <Input id="provider-settings-email" type="email" label={copy.account.email} value={form.email} onChange={updateField('email')} disabled={saving} autoComplete="email" />
                <Input id="provider-settings-phone" type="tel" label={copy.account.phone} value={data.phone} disabled readOnly />
                <p className="provider-settings__notice">{copy.account.legalNotice}</p>
                <Button type="submit" loading={saving}>{copy.account.saveEmail}</Button>
              </form>
            ) : null}
            {tab === 'contact' ? (
              <form className="provider-settings__panel" onSubmit={event => { void save(event); }} aria-labelledby="provider-settings-contact-heading">
                <h2 id="provider-settings-contact-heading">{copy.contact.heading}</h2>
                <Input id="provider-settings-contact-phone" type="tel" label={copy.contact.phone} value={data.phone} disabled readOnly />
                <Input id="provider-settings-whatsapp" type="tel" label={copy.contact.whatsapp} value={form.whatsappNumber} onChange={updateField('whatsappNumber')} disabled={saving} />
                <Input id="provider-settings-address" type="text" label={copy.contact.address} value={form.officeAddress} onChange={updateField('officeAddress')} disabled={saving} />
                <Input id="provider-settings-website" type="url" label={copy.contact.website} value={form.website} onChange={updateField('website')} disabled={saving} />
                <Button type="submit" loading={saving}>{copy.contact.save}</Button>
              </form>
            ) : null}
            {tab === 'security' ? (
              <div className="provider-settings__security-grid">
                <section className="provider-settings__panel" data-state="unavailable" aria-labelledby="provider-settings-security-heading">
                  <h2 id="provider-settings-security-heading">{copy.security.password}</h2>
                  <Input id="provider-settings-current-password" type="password" label={copy.security.current} disabled autoComplete="current-password" />
                  <Input id="provider-settings-new-password" type="password" label={copy.security.next} disabled autoComplete="new-password" />
                  <Input id="provider-settings-confirm-password" type="password" label={copy.security.confirm} disabled autoComplete="new-password" />
                  <Button type="button" disabled>{copy.security.update}</Button>
                  <p className="provider-settings__notice">{copy.security.unavailable}</p>
                </section>
                <section className="provider-settings__panel provider-settings__panel--danger" data-state="unavailable" aria-labelledby="provider-settings-delete-heading">
                  <h2 id="provider-settings-delete-heading">{copy.security.deleteHeading}</h2>
                  <p>{copy.security.deleteBody}</p>
                  <Button type="button" variant="danger" disabled>{copy.security.deleteAction}</Button>
                </section>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </section>
  );
}
