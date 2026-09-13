import { getPersonalSurfaceCopy as personalSurfaceCopy, getSettingsSurfaceCopy as settingsSurfaceCopy, getProfileFeedbackCopy, getPreferenceOptionsCopy } from './profile-surface-copy.ts';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  passwordChangeRequestSchema,
  seekerPreferencesPatchSchema,
  seekerProfilePatchSchema,
  type SeekerPreferencesData,
  type SeekerPreferencesPatch,
  type SeekerProfileData,
  type SeekerProfilePatch,
  type AuthManagedSession,
  type SupportedLocale
} from '@sadat-real-estate/contracts';
import { ApiClientError } from '../contracts/index.ts';
import { Button, Input, Skeleton, StateMessage } from '../design_system/index.ts';
import type { RouteSession } from '../routing/index.ts';
import {
  createSeekerProfileActions,
  createSeekerProfileLoader,
  createAccountSessionsLoader,
  createAccountSessionRevoker,
  createSeekerPreferencesLoader as createPreferencesLoader,
  isAuthenticatedSeekerSession,
  localeForSeekerPath,
  type SeekerAuthorizationSource,
  type AccountSessionsLoader,
  type AccountSessionRevoker,
  type SeekerPreferencesLoader,
  type SeekerProfileActions,
  type SeekerProfileLoader
} from './data.ts';
import { SeekerNavigation } from './overview.tsx';
import { getSeekerProfileCopy } from './profile-copy.ts';
import { getAccountSessionCopy } from './session-copy.ts';
import './styles.css';

export type SeekerProfileTab = 'preferences' | 'profile' | 'settings';
export type SeekerProfileViewState = 'loading' | 'empty' | 'error' | 'retry' | 'success' | 'permission';

export interface SeekerProfileAuthClient extends SeekerAuthorizationSource {
  readonly getSnapshot: () => { readonly status: string };
  readonly logout?: () => Promise<unknown>;
}

export interface SeekerProfileProps {
  readonly locale: SupportedLocale;
  readonly session: RouteSession;
  readonly tab?: SeekerProfileTab | undefined;
  readonly authClient?: SeekerProfileAuthClient | undefined;
  readonly apiOrigin?: string | undefined;
  readonly loadProfile?: SeekerProfileLoader | undefined;
  readonly loadPreferences?: SeekerPreferencesLoader | undefined;
  readonly actions?: SeekerProfileActions | undefined;
  readonly loadSessions?: AccountSessionsLoader | undefined;
  readonly revokeSession?: AccountSessionRevoker | undefined;
}

type MutationFeedback = 'profileSaved' | 'preferencesSaved' | 'signedOut';

interface ProfileDraft {
  firstName: string;
  lastName: string;
  locale: SupportedLocale;
}

interface PreferencesDraft {
  propertyTypes: string;
  locations: string;
  purpose: '' | 'buy' | 'rent';
  minPrice: string;
  maxPrice: string;
  minArea: string;
  maxArea: string;
  bedroomsMin: string;
  bedroomsMax: string;
  paymentMethod: '' | 'cash' | 'installment' | 'any';
}

function stateForError(error: unknown): Exclude<SeekerProfileViewState, 'loading' | 'empty' | 'success'> {
  if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) return 'permission';
  if (error instanceof ApiClientError && (error.code === 'NETWORK_ERROR' || error.code === 'ABORTED')) return 'retry';
  return 'error';
}

function profileDraftFor(data: SeekerProfileData): ProfileDraft {
  return { firstName: data.firstName, lastName: data.lastName, locale: data.locale };
}

function preferencesDraftFor(data: SeekerPreferencesData | undefined): PreferencesDraft {
  const preferences = data?.preferences ?? {};
  return {
    propertyTypes: preferences.propertyTypes?.join(', ') ?? '',
    locations: preferences.locations?.join(', ') ?? '',
    purpose: preferences.purpose ?? '',
    minPrice: preferences.minPrice === undefined ? '' : String(preferences.minPrice),
    maxPrice: preferences.maxPrice === undefined ? '' : String(preferences.maxPrice),
    minArea: preferences.minArea === undefined ? '' : String(preferences.minArea),
    maxArea: preferences.maxArea === undefined ? '' : String(preferences.maxArea),
    bedroomsMin: preferences.bedroomsMin === undefined ? '' : String(preferences.bedroomsMin),
    bedroomsMax: preferences.bedroomsMax === undefined ? '' : String(preferences.bedroomsMax),
    paymentMethod: preferences.paymentMethod ?? ''
  };
}

function listValue(value: string): string[] {
  return value.split(',').map(item => item.trim()).filter(Boolean);
}

interface PreferenceChoice {
  readonly value: string;
}

const propertyTypeChoices: readonly PreferenceChoice[] = [
  { value: 'apartment' },
  { value: 'villa' },
  { value: 'duplex' },
  { value: 'roof' },
  { value: 'land' },
  { value: 'office' },
  { value: 'commercial' },
  { value: 'factory' }
];

const locationChoices: readonly PreferenceChoice[] = [
  { value: 'district-1' },
  { value: 'district-2' },
  { value: 'district-3' },
  { value: 'district-4' },
  { value: 'district-5' },
  { value: 'district-6' },
  { value: 'district-7' },
  { value: 'industrial-zone' },
  { value: 'upscale-zone' },
  { value: 'new-cairo' }
];

const bedroomChoices: readonly PreferenceChoice[] = [
  { value: '1' },
  { value: '2' },
  { value: '3' },
  { value: '4' },
  { value: '5+' }
];

function toggleListValue(current: string, value: string): string {
  const values = listValue(current);
  return values.includes(value)
    ? values.filter(item => item !== value).join(', ')
    : [...values, value].join(', ');
}

function profileTabForLocation(tab: SeekerProfileTab): SeekerProfileTab {
  if (tab !== 'preferences' || typeof window === 'undefined') return tab;
  const url = new URL(window.location.href);
  return url.pathname === '/seeker/profile' && url.searchParams.get('tab') === 'personal' ? 'profile' : tab;
}

function numberValue(value: string): number | undefined {
  if (value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : Number.NaN;
}

function preferencesPatchFor(draft: PreferencesDraft): SeekerPreferencesPatch {
  const minPrice = numberValue(draft.minPrice);
  const maxPrice = numberValue(draft.maxPrice);
  const bedroomsMin = numberValue(draft.bedroomsMin);
  const bedroomsMax = numberValue(draft.bedroomsMax);
  const minArea = numberValue(draft.minArea);
  const maxArea = numberValue(draft.maxArea);
  return {
    propertyTypes: listValue(draft.propertyTypes),
    locations: listValue(draft.locations),
    ...(draft.purpose === '' ? {} : { purpose: draft.purpose }),
    ...(minPrice === undefined ? {} : { minPrice }),
    ...(maxPrice === undefined ? {} : { maxPrice }),
    ...(minArea === undefined ? {} : { minArea }),
    ...(maxArea === undefined ? {} : { maxArea }),
    ...(bedroomsMin === undefined ? {} : { bedroomsMin }),
    ...(bedroomsMax === undefined ? {} : { bedroomsMax }),
    ...(draft.paymentMethod === '' ? {} : { paymentMethod: draft.paymentMethod })
  };
}

function StatePanel({ state, locale, onRetry }: { readonly state: Exclude<SeekerProfileViewState, 'success' | 'empty'>; readonly locale: SupportedLocale; readonly onRetry: () => void }) {
  const copy = getSeekerProfileCopy(locale);
  const message = copy.states[state];
  return (
    <section className="seeker-dashboard__state" data-state={state} aria-label={message.title}>
      <StateMessage state={state} title={message.title} message={message.body} loadingVariant="form" onRetry={state === 'retry' ? onRetry : undefined} retryLabel={copy.retry} />
      {state === 'error' ? <Button variant="secondary" size="sm" onClick={onRetry}>{copy.retry}</Button> : null}
    </section>
  );
}

function ProfileTabs({ locale, tab, copy }: { readonly locale: SupportedLocale; readonly tab: SeekerProfileTab; readonly copy: ReturnType<typeof getSeekerProfileCopy> }) {
  return (
    <nav className="seeker-profile__tabs" aria-label={copy.title}>
      {(['preferences', 'profile'] as const).map(item => (
        <a key={item} href={localeForSeekerPath(locale, `/seeker/profile?tab=${item === 'profile' ? 'personal' : item}`)} aria-current={tab === item ? 'page' : undefined} data-active={tab === item || undefined}>
          {copy.tabs[item]}
        </a>
      ))}
    </nav>
  );
}

function PreferenceChoiceField({ label, labels, value, choices, onChange }: { readonly label: string; readonly labels: Readonly<Record<string, string>>; readonly value: string; readonly choices: readonly PreferenceChoice[]; readonly onChange: (value: string) => void }) {
  const selected = listValue(value);
  const customChoices = selected
    .filter(item => !choices.some(choice => choice.value === item))
    .map(item => ({ value: item }));
  const visibleChoices = [...customChoices, ...choices];
  return (
    <fieldset className="seeker-profile__fieldset seeker-profile__chip-field">
      <legend>{label}</legend>
      <div className="seeker-profile__choice-list seeker-profile__choice-list--chips" role="group" aria-label={label}>
        {visibleChoices.map(choice => (
          <button key={choice.value} type="button" className="seeker-profile__choice seeker-profile__choice--chip" data-selected={selected.includes(choice.value) || undefined} aria-pressed={selected.includes(choice.value)} onClick={() => onChange(toggleListValue(value, choice.value))}>
            {labels[choice.value] ?? choice.value}{selected.includes(choice.value) ? <span aria-hidden="true"> ✓</span> : null}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function ProfileForm({
  locale,
  profile,
  draft,
  copy,
  saving,
  onChange,
  onSubmit
}: {
  readonly locale: SupportedLocale;
  readonly profile: SeekerProfileData;
  readonly draft: ProfileDraft;
  readonly copy: ReturnType<typeof getSeekerProfileCopy>;
  readonly saving: boolean;
  readonly onChange: (patch: Partial<ProfileDraft>) => void;
  readonly onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const surfaceCopy = personalSurfaceCopy(locale);
  return (
    <form className="seeker-profile__form" onSubmit={onSubmit} noValidate>
      <div className="seeker-profile__identity">
        <span><strong>{profile.firstName} {profile.lastName}</strong><small>{surfaceCopy.role}</small></span>
      </div>
      <div className="seeker-profile__form-grid">
        <Input id="seeker-profile-first-name" label={copy.profile.firstName} value={draft.firstName} autoComplete="given-name" onChange={event => onChange({ firstName: event.target.value })} required />
        <Input id="seeker-profile-last-name" label={copy.profile.lastName} value={draft.lastName} autoComplete="family-name" onChange={event => onChange({ lastName: event.target.value })} required />
        <Input id="seeker-profile-email" label={surfaceCopy.email} value={profile.email} readOnly disabled />
      </div>
      <Button type="submit" loading={saving}>{saving ? copy.saving : copy.profile.save}</Button>
    </form>
  );
}

function PreferencesForm({
  locale,
  draft,
  copy,
  saving,
  onChange,
  onSubmit
}: {
  readonly locale: SupportedLocale;
  readonly draft: PreferencesDraft;
  readonly copy: ReturnType<typeof getSeekerProfileCopy>;
  readonly saving: boolean;
  readonly onChange: (patch: Partial<PreferencesDraft>) => void;
  readonly onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const optionsCopy = getPreferenceOptionsCopy(locale);
  return (
    <form className="seeker-profile__form" onSubmit={onSubmit} noValidate>
      <fieldset className="seeker-profile__fieldset">
        <legend>{copy.preferences.purpose}</legend>
        <div className="seeker-profile__choice-list" role="group" aria-label={copy.preferences.purpose}>
          {([
            ['buy', copy.preferences.buy],
            ['rent', copy.preferences.rent],
            ['', copy.preferences.anyPurpose]
          ] as const).map(([value, label]) => (
            <button key={value || 'any'} type="button" className="seeker-profile__choice" data-selected={draft.purpose === value || undefined} aria-pressed={draft.purpose === value} onClick={() => onChange({ purpose: value })}>{label}</button>
          ))}
        </div>
      </fieldset>
      <div className="seeker-profile__preference-stack">
        <PreferenceChoiceField label={copy.preferences.propertyTypes} labels={optionsCopy.propertyTypes} value={draft.propertyTypes} choices={propertyTypeChoices} onChange={propertyTypes => onChange({ propertyTypes })} />
        <PreferenceChoiceField label={copy.preferences.locations} labels={optionsCopy.locations} value={draft.locations} choices={locationChoices} onChange={locations => onChange({ locations })} />
      </div>
      <fieldset className="seeker-profile__fieldset">
        <legend>{copy.preferences.budgetRange}</legend>
        <div className="seeker-profile__form-grid seeker-profile__form-grid--numeric">
          <Input id="seeker-preferences-min-price" label={copy.preferences.minPrice} aria-label={`${copy.preferences.budgetRange} — ${copy.preferences.minPrice}`} type="number" min="0" step="1" inputMode="numeric" value={draft.minPrice} onChange={event => onChange({ minPrice: event.target.value })} />
          <Input id="seeker-preferences-max-price" label={copy.preferences.maxPrice} aria-label={`${copy.preferences.budgetRange} — ${copy.preferences.maxPrice}`} type="number" min="0" step="1" inputMode="numeric" value={draft.maxPrice} onChange={event => onChange({ maxPrice: event.target.value })} />
        </div>
      </fieldset>
      <fieldset className="seeker-profile__fieldset">
        <legend>{copy.preferences.areaRange}</legend>
        <div className="seeker-profile__form-grid seeker-profile__form-grid--numeric">
          <Input id="seeker-preferences-min-area" label={copy.preferences.minArea} aria-label={`${copy.preferences.areaRange} — ${optionsCopy.minimum}`} type="number" min="0" step="1" inputMode="numeric" value={draft.minArea} onChange={event => onChange({ minArea: event.target.value })} />
          <Input id="seeker-preferences-max-area" label={copy.preferences.maxArea} aria-label={`${copy.preferences.areaRange} — ${optionsCopy.maximum}`} type="number" min="0" step="1" inputMode="numeric" value={draft.maxArea} onChange={event => onChange({ maxArea: event.target.value })} />
        </div>
      </fieldset>
      <fieldset className="seeker-profile__fieldset seeker-profile__chip-field">
        <legend>{copy.preferences.bedroomsMin}</legend>
        <div className="seeker-profile__choice-list seeker-profile__choice-list--bedrooms" role="group" aria-label={copy.preferences.bedroomsMin}>
          {bedroomChoices.map(choice => {
            const selectedBedroom = choice.value === '5+' ? draft.bedroomsMin === '5' && draft.bedroomsMax === '' : draft.bedroomsMin === choice.value && draft.bedroomsMax === choice.value;
            return <button key={choice.value} type="button" className="seeker-profile__choice seeker-profile__choice--bedroom" data-selected={selectedBedroom || undefined} aria-pressed={selectedBedroom} onClick={() => onChange(choice.value === '5+' ? { bedroomsMin: '5', bedroomsMax: '' } : { bedroomsMin: choice.value, bedroomsMax: choice.value })}>{choice.value}</button>;
          })}
        </div>
        {draft.bedroomsMin !== '' && draft.bedroomsMax !== '' && draft.bedroomsMin !== draft.bedroomsMax ? <p className="seeker-profile__field-note">{copy.preferences.bedroomsMin}: {draft.bedroomsMin} · {copy.preferences.bedroomsMax}: {draft.bedroomsMax}</p> : null}
      </fieldset>
      <fieldset className="seeker-profile__fieldset">
        <legend>{copy.preferences.paymentMethod}</legend>
        <div className="seeker-profile__choice-list" role="group" aria-label={copy.preferences.paymentMethod}>
          {([['cash', copy.preferences.cash], ['installment', copy.preferences.installment], ['any', copy.preferences.anyPayment]] as const).map(([value, label]) => (
            <button key={value} type="button" className="seeker-profile__choice" data-selected={draft.paymentMethod === value || undefined} aria-pressed={draft.paymentMethod === value} onClick={() => onChange({ paymentMethod: value })}>{label}</button>
          ))}
        </div>
      </fieldset>
      <Button type="submit" loading={saving}>{saving ? copy.saving : copy.preferences.save}</Button>
    </form>
  );
}

function SettingsContent({
  locale,
  profile,
  copy,
  authClient,
  saving,
  onChangePassword,
  onUpdateLocale,
  onSignOut,
  loadSessions,
  revokeSession
}: {
  readonly locale: SupportedLocale;
  readonly profile: SeekerProfileData;
  readonly copy: ReturnType<typeof getSeekerProfileCopy>;
  readonly authClient: SeekerProfileAuthClient | undefined;
  readonly saving: boolean;
  readonly onChangePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  readonly onUpdateLocale: (locale: SupportedLocale) => Promise<void>;
  readonly onSignOut: () => void;
  readonly loadSessions: AccountSessionsLoader;
  readonly revokeSession: AccountSessionRevoker;
}) {
  const surfaceCopy = settingsSurfaceCopy(locale);
  const sessionCopy = getAccountSessionCopy(locale);
  const notificationSettings = [
    { id: 'request-updates', label: surfaceCopy.requestUpdates, body: surfaceCopy.requestUpdatesBody, enabled: true },
    { id: 'viewing-reminders', label: surfaceCopy.viewingReminders, body: surfaceCopy.viewingRemindersBody, enabled: true },
    { id: 'saved-property-alerts', label: surfaceCopy.savedPropertyAlerts, body: surfaceCopy.savedPropertyAlertsBody, enabled: true },
    { id: 'account-alerts', label: surfaceCopy.accountAlerts, body: surfaceCopy.accountAlertsBody, enabled: true },
    { id: 'marketing-messages', label: surfaceCopy.marketingMessages, body: surfaceCopy.marketingMessagesBody, enabled: false }
  ];
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string>();
  const [sessionState, setSessionState] = useState<'loading' | 'success' | 'error'>('loading');
  const [sessions, setSessions] = useState<readonly AuthManagedSession[]>([]);
  const [sessionAttempt, setSessionAttempt] = useState(0);
  const [revokingSessionId, setRevokingSessionId] = useState<string>();
  const [sessionFeedback, setSessionFeedback] = useState<string>();
  useEffect(() => {
    const controller = new AbortController();
    setSessionState('loading');
    void loadSessions(controller.signal).then(result => {
      if (controller.signal.aborted) return;
      setSessions(result.items);
      setSessionState('success');
    }).catch(() => {
      if (!controller.signal.aborted) setSessionState('error');
    });
    return () => controller.abort();
  }, [loadSessions, sessionAttempt]);
  const revoke = async (sessionId: string) => {
    setRevokingSessionId(sessionId);
    setSessionFeedback(undefined);
    try {
      await revokeSession(sessionId);
      setSessions(current => current.filter(session => session.id !== sessionId));
      setSessionFeedback(sessionCopy.revoked);
    } catch {
      setSessionFeedback(sessionCopy.error);
    } finally {
      setRevokingSessionId(undefined);
    }
  };
  const revokeOthers = async () => {
    const others = sessions.filter(session => !session.current);
    if (others.length === 0) return;
    setRevokingSessionId('all');
    setSessionFeedback(undefined);
    try {
      const results = await Promise.allSettled(others.map(session => revokeSession(session.id)));
      if (results.some(result => result.status === 'rejected')) {
        setSessionFeedback(sessionCopy.error);
        setSessionAttempt(value => value + 1);
      } else {
        setSessions(current => current.filter(session => session.current));
        setSessionFeedback(sessionCopy.revoked);
      }
    } catch {
      setSessionFeedback(sessionCopy.error);
      setSessionAttempt(value => value + 1);
    } finally {
      setRevokingSessionId(undefined);
    }
  };
  const formatSessionDate = (value: string | null) => value === null
    ? '—'
    : new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  const authenticationLabel = (method: AuthManagedSession['authenticationMethod']) => method === 'mfa'
    ? sessionCopy.mfa
    : method === 'otp'
      ? sessionCopy.otp
      : sessionCopy.password;
  const submitPassword = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (newPassword !== confirmPassword || !passwordChangeRequestSchema.safeParse({ currentPassword, newPassword }).success) {
      setPasswordError(getProfileFeedbackCopy(locale).invalidPassword);
      return;
    }
    setPasswordError(undefined);
    void onChangePassword(currentPassword, newPassword).then(() => {
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    }).catch(() => {
      setPasswordError(getProfileFeedbackCopy(locale).passwordFailure);
    });
  };
  return (
    <div className="seeker-profile__settings">
      <section className="seeker-profile__settings-card seeker-profile__settings-card--value" aria-labelledby="seeker-profile-language-title">
        <h3 id="seeker-profile-language-title">{copy.settings.languageHeading}</h3>
        <p>{copy.settings.languageBody}</p>
        <label className="seeker-profile__language-field" htmlFor="seeker-profile-settings-language">
          <span>{copy.profile.language}</span>
          <select id="seeker-profile-settings-language" value={profile.locale} disabled={saving} onChange={event => { void onUpdateLocale(event.target.value as SupportedLocale); }}>
            <option value="ar">العربية</option>
            <option value="en">English</option>
          </select>
        </label>
      </section>
      <section className="seeker-profile__settings-card seeker-profile__settings-card--value" data-state="unavailable" aria-labelledby="seeker-profile-email-title">
        <h3 id="seeker-profile-email-title">{surfaceCopy.emailHeading}</h3>
        <Input id="seeker-profile-settings-email" label={surfaceCopy.currentEmail} value={profile.email} readOnly disabled />
        <div className="seeker-profile__settings-actions">
          <Button type="button" disabled>{surfaceCopy.updateEmail}</Button>
          <span className="seeker-profile__unavailable-label">{copy.unavailable}</span>
        </div>
      </section>
      <form className="seeker-profile__settings-card seeker-profile__settings-card--password" onSubmit={submitPassword} aria-labelledby="seeker-profile-password-title">
        <h3 id="seeker-profile-password-title">{surfaceCopy.passwordHeading}</h3>
        <div className="seeker-profile__password-fields">
          <Input id="seeker-profile-current-password" label={surfaceCopy.currentPassword} type="password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} autoComplete="current-password" />
          <Input id="seeker-profile-new-password" label={surfaceCopy.newPassword} type="password" value={newPassword} onChange={event => setNewPassword(event.target.value)} autoComplete="new-password" />
          <Input id="seeker-profile-confirm-password" label={surfaceCopy.confirmPassword} type="password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} autoComplete="new-password" />
        </div>
        {passwordError ? <p role="alert">{passwordError}</p> : null}
        <div className="seeker-profile__settings-actions">
          <Button type="submit" loading={saving}>{surfaceCopy.changePassword}</Button>
        </div>
      </form>
      <section className="seeker-profile__settings-card" data-state="unavailable" aria-labelledby="seeker-profile-notifications-title">
        <h3 id="seeker-profile-notifications-title">{surfaceCopy.notificationsHeading}</h3>
        <div className="seeker-profile__toggle-list">
          {notificationSettings.map(setting => (
            <label key={setting.id} className="seeker-profile__toggle-row">
              <span><strong>{setting.label}</strong><small>{setting.body}</small></span>
              <input type="checkbox" checked={setting.enabled} disabled readOnly aria-label={setting.label} />
            </label>
          ))}
        </div>
        <span className="seeker-profile__unavailable-label">{copy.unavailable}</span>
      </section>
      <section className="seeker-profile__settings-card" data-state={sessionState} aria-labelledby="seeker-profile-sessions-title">
        <h3 id="seeker-profile-sessions-title">{sessionCopy.heading}</h3>
        <p>{sessionCopy.body}</p>
        {sessionState === 'loading' ? <Skeleton variant="list" label={sessionCopy.loading} /> : null}
        {sessionState === 'error' ? (
          <div className="seeker-profile__settings-actions" role="alert">
            <p>{sessionCopy.error}</p>
            <Button type="button" variant="secondary" onClick={() => { setSessionFeedback(undefined); setSessionAttempt(value => value + 1); }}>{sessionCopy.retry}</Button>
          </div>
        ) : null}
        {sessionState === 'success' && sessions.length === 0 ? <p className="seeker-profile__empty-note" data-state="empty">{sessionCopy.empty}</p> : null}
        {sessionState === 'success' && sessions.length > 0 ? (
          <div className="seeker-profile__toggle-list">
            {sessions.map(managedSession => (
              <article className="seeker-profile__toggle-row seeker-profile__session" data-current={managedSession.current} key={managedSession.id}>
                <div>
                  <strong>{managedSession.current ? sessionCopy.current : sessionCopy.other}</strong>
                  <span>{authenticationLabel(managedSession.authenticationMethod)}</span>
                </div>
                <dl>
                  <div><dt>{sessionCopy.started}</dt><dd>{formatSessionDate(managedSession.createdAt)}</dd></div>
                  <div><dt>{sessionCopy.lastUsed}</dt><dd>{formatSessionDate(managedSession.lastUsedAt)}</dd></div>
                  <div><dt>{sessionCopy.expires}</dt><dd>{formatSessionDate(managedSession.expiresAt)}</dd></div>
                </dl>
                {!managedSession.current ? <Button type="button" variant="secondary" loading={revokingSessionId === managedSession.id} disabled={revokingSessionId !== undefined} onClick={() => { void revoke(managedSession.id); }}>{sessionCopy.revoke}</Button> : null}
              </article>
            ))}
          </div>
        ) : null}
        {sessionFeedback ? <p className="seeker-profile__feedback" data-state={sessionFeedback === sessionCopy.revoked ? 'success' : 'error'} role="status">{sessionFeedback}</p> : null}
        <div className="seeker-profile__settings-actions">
          <Button type="button" variant="secondary" loading={revokingSessionId === 'all'} disabled={sessionState !== 'success' || sessions.every(session => session.current) || revokingSessionId !== undefined} onClick={() => { void revokeOthers(); }}>{sessionCopy.revokeOthers}</Button>
        </div>
        {authClient?.logout ? <Button type="button" variant="ghost" loading={saving} onClick={onSignOut}>{copy.settings.signOut}</Button> : null}
      </section>
      <section className="seeker-profile__settings-card seeker-profile__settings-card--danger" data-state="unavailable" aria-labelledby="seeker-profile-danger-title">
        <h3 id="seeker-profile-danger-title">{surfaceCopy.dangerHeading}</h3>
        <p>{surfaceCopy.dangerBody}</p>
        <div className="seeker-profile__settings-actions">
          <Button type="button" variant="danger" disabled>{copy.settings.deleteAccount}</Button>
          <span className="seeker-profile__unavailable-label">{copy.unavailable}</span>
        </div>
      </section>
    </div>
  );
}

export function SeekerProfile({ locale, session, tab, authClient, apiOrigin, loadProfile, loadPreferences, actions, loadSessions, revokeSession }: SeekerProfileProps) {
  const copy = getSeekerProfileCopy(locale);
  const activeTab = tab === undefined ? profileTabForLocation('preferences') : tab;
  const profileSource = useMemo(() => loadProfile ?? createSeekerProfileLoader({ apiOrigin, authorization: authClient }), [apiOrigin, authClient, loadProfile]);
  const preferencesSource = useMemo(() => loadPreferences ?? createPreferencesLoader({ apiOrigin, authorization: authClient }), [apiOrigin, authClient, loadPreferences]);
  const actionSource = useMemo(() => actions ?? createSeekerProfileActions({ apiOrigin, authorization: authClient }), [actions, apiOrigin, authClient]);
  const sessionSource = useMemo(() => loadSessions ?? createAccountSessionsLoader({ apiOrigin, authorization: authClient }), [apiOrigin, authClient, loadSessions]);
  const sessionRevoker = useMemo(() => revokeSession ?? createAccountSessionRevoker({ apiOrigin, authorization: authClient }), [apiOrigin, authClient, revokeSession]);
  const [profileState, setProfileState] = useState<SeekerProfileViewState>('loading');
  const [preferencesState, setPreferencesState] = useState<SeekerProfileViewState>('loading');
  const [profile, setProfile] = useState<SeekerProfileData | undefined>();
  const [preferences, setPreferences] = useState<SeekerPreferencesData | undefined>();
  const [profileDraft, setProfileDraft] = useState<ProfileDraft | undefined>();
  const [preferencesDraft, setPreferencesDraft] = useState<PreferencesDraft>({ propertyTypes: '', locations: '', purpose: '', minPrice: '', maxPrice: '', minArea: '', maxArea: '', bedroomsMin: '', bedroomsMax: '', paymentMethod: '' });
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<MutationFeedback | undefined>();
  const [validationError, setValidationError] = useState(false);
  const [mutationError, setMutationError] = useState(false);
  const sessionRole = session.status === 'authenticated' ? session.role : undefined;

  useEffect(() => {
    if (!isAuthenticatedSeekerSession(session)) {
      setProfileState('permission');
      setPreferencesState('permission');
      return undefined;
    }
    const controller = new AbortController();
    setMutationError(false);
    setProfileState('loading');
    if (activeTab === 'preferences') setPreferencesState('loading');
    void profileSource(controller.signal).then(nextProfile => {
      if (controller.signal.aborted) return;
      setProfile(nextProfile);
      setProfileDraft(profileDraftFor(nextProfile));
      setProfileState('success');
    }).catch(error => {
      if (!controller.signal.aborted) setProfileState(stateForError(error));
    });
    if (activeTab === 'preferences') {
      void preferencesSource(controller.signal).then(nextPreferences => {
        if (controller.signal.aborted) return;
        setPreferences(nextPreferences);
        setPreferencesDraft(preferencesDraftFor(nextPreferences));
        setPreferencesState('success');
      }).catch(error => {
        if (!controller.signal.aborted) setPreferencesState(stateForError(error));
      });
    }
    return () => controller.abort();
  }, [activeTab, attempt, preferencesSource, profileSource, sessionRole]);

  const pageState = !isAuthenticatedSeekerSession(session)
    ? 'permission'
    : profileState !== 'success'
      ? profileState
      : activeTab === 'preferences' && preferencesState !== 'success'
        ? preferencesState
        : 'success';

  const saveProfile = async (input: SeekerProfilePatch, success: MutationFeedback = 'profileSaved') => {
    setMutationError(false);
    const parsed = seekerProfilePatchSchema.safeParse(input);
    if (!parsed.success) {
      setValidationError(true);
      return;
    }
    setValidationError(false);
    setFeedback(undefined);
    setSaving(true);
    try {
      const nextProfile = await actionSource.updateProfile(parsed.data);
      setProfile(nextProfile);
      setProfileDraft(profileDraftFor(nextProfile));
      setFeedback(success);
    } catch (error) {
      const nextState = stateForError(error);
      if (nextState === 'permission') setProfileState('permission');
      else setMutationError(true);
    } finally {
      setSaving(false);
    }
  };

  const submitProfile = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (profileDraft === undefined) return;
    void saveProfile(profileDraft);
  };

  const submitPreferences = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMutationError(false);
    const parsed = seekerPreferencesPatchSchema.safeParse(preferencesPatchFor(preferencesDraft));
    if (!parsed.success) {
      setValidationError(true);
      return;
    }
    setValidationError(false);
    setFeedback(undefined);
    setSaving(true);
    void actionSource.updatePreferences(parsed.data).then(nextPreferences => {
      setPreferences(nextPreferences);
      setPreferencesDraft(preferencesDraftFor(nextPreferences));
      setFeedback('preferencesSaved');
    }).catch(error => {
      const nextState = stateForError(error);
      if (nextState === 'permission') setPreferencesState('permission');
      else setMutationError(true);
    }).finally(() => setSaving(false));
  };

  const signOut = () => {
    if (authClient?.logout === undefined) return;
    setSaving(true);
    void authClient.logout().then(() => setFeedback('signedOut')).catch(() => undefined).finally(() => setSaving(false));
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    setSaving(true);
    setFeedback(undefined);
    try {
      await actionSource.changePassword({ currentPassword, newPassword });
      setFeedback('signedOut');
      await authClient?.logout?.().catch(() => undefined);
    } finally {
      setSaving(false);
    }
  };

  const updateLocale = async (nextLocale: SupportedLocale) => {
    await saveProfile({ locale: nextLocale });
  };

  const activePath = activeTab === 'settings'
    ? '/seeker/settings'
    : activeTab === 'profile'
      ? '/seeker/profile?tab=personal'
      : '/seeker/profile?tab=preferences';
  const feedbackText = feedback === 'profileSaved'
    ? copy.profile.saved
    : feedback === 'preferencesSaved'
      ? copy.preferences.saved
      : feedback === 'signedOut'
        ? copy.settings.signedOut
        : undefined;

  return (
    <section className="seeker-dashboard seeker-profile" data-screen-id={activeTab === 'preferences' ? 'SEK-08' : activeTab === 'profile' ? 'SEK-09' : 'SEK-10'} data-route={activePath} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <SeekerNavigation locale={locale} activePath={activePath} authClient={authClient} apiOrigin={apiOrigin} />
      <div className="seeker-dashboard__content">
        {pageState === 'loading' || pageState === 'retry' || pageState === 'error' || pageState === 'permission' ? <StatePanel state={pageState} locale={locale} onRetry={() => setAttempt(value => value + 1)} /> : null}
        {pageState === 'success' && profile !== undefined && profileDraft !== undefined ? (
          <>
            <div className="seeker-dashboard__heading-row">
              <div>
                <p className="seeker-dashboard__eyebrow">{copy.eyebrow}</p>
                <h1>{activeTab === 'settings' ? copy.settings.heading : copy.title}</h1>
                <p>{activeTab === 'settings' ? copy.settings.description : copy.description}</p>
              </div>
            </div>
            {activeTab === 'settings' ? null : <ProfileTabs locale={locale} tab={activeTab} copy={copy} />}
            {feedbackText ? <p className="seeker-profile__feedback" data-state="success" role="status">{feedbackText}</p> : null}
            {validationError ? <p className="seeker-profile__feedback" data-state="error" role="alert">{copy.validation}</p> : null}
            {mutationError ? <p className="seeker-profile__feedback" data-state="error" role="alert">{copy.states.retry.body}</p> : null}
            {activeTab === 'preferences' ? (
              <section className="seeker-profile__panel" aria-label={copy.tabs.preferences}>
                {preferences !== undefined && Object.keys(preferences.preferences).length === 0 ? <p className="seeker-profile__empty-note" data-state="empty">{copy.preferences.noSavedPreferences}</p> : null}
                <PreferencesForm locale={locale} draft={preferencesDraft} copy={copy} saving={saving} onChange={patch => { setPreferencesDraft(current => ({ ...current, ...patch })); setValidationError(false); }} onSubmit={submitPreferences} />
              </section>
            ) : activeTab === 'profile' ? (
              <section className="seeker-profile__panel" aria-labelledby="seeker-profile-personal-panel-title">
                <h2 id="seeker-profile-personal-panel-title">{copy.profile.heading}</h2>
                <ProfileForm locale={locale} profile={profile} draft={profileDraft} copy={copy} saving={saving} onChange={patch => { setProfileDraft(current => current === undefined ? current : { ...current, ...patch }); setValidationError(false); }} onSubmit={submitProfile} />
              </section>
            ) : (
              <SettingsContent locale={locale} profile={profile} copy={copy} authClient={authClient} saving={saving} onChangePassword={changePassword} onUpdateLocale={updateLocale} onSignOut={signOut} loadSessions={sessionSource} revokeSession={sessionRevoker} />
            )}
          </>
        ) : null}
      </div>
    </section>
  );
}
