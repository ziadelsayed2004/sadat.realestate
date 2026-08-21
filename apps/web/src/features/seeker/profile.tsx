import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  seekerPreferencesPatchSchema,
  seekerProfilePatchSchema,
  type SeekerPreferencesData,
  type SeekerPreferencesPatch,
  type SeekerProfileData,
  type SeekerProfilePatch,
  type SupportedLocale
} from '@sadat-real-estate/contracts';
import { ApiClientError } from '../contracts/index.ts';
import { Button, Input, Select, StateMessage } from '../design_system/index.ts';
import type { RouteSession } from '../routing/index.ts';
import {
  createSeekerProfileActions,
  createSeekerProfileLoader,
  createSeekerPreferencesLoader as createPreferencesLoader,
  localeForSeekerPath,
  type SeekerAuthorizationSource,
  type SeekerPreferencesLoader,
  type SeekerProfileActions,
  type SeekerProfileLoader
} from './data.ts';
import { SeekerNavigation } from './overview.tsx';
import { getSeekerProfileCopy } from './profile-copy.ts';
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
  bedroomsMin: string;
  bedroomsMax: string;
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
    bedroomsMin: preferences.bedroomsMin === undefined ? '' : String(preferences.bedroomsMin),
    bedroomsMax: preferences.bedroomsMax === undefined ? '' : String(preferences.bedroomsMax)
  };
}

function listValue(value: string): string[] {
  return value.split(',').map(item => item.trim()).filter(Boolean);
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
  return {
    propertyTypes: listValue(draft.propertyTypes),
    locations: listValue(draft.locations),
    ...(draft.purpose === '' ? {} : { purpose: draft.purpose }),
    ...(minPrice === undefined ? {} : { minPrice }),
    ...(maxPrice === undefined ? {} : { maxPrice }),
    ...(bedroomsMin === undefined ? {} : { bedroomsMin }),
    ...(bedroomsMax === undefined ? {} : { bedroomsMax })
  };
}

function StatePanel({ state, locale, onRetry }: { readonly state: Exclude<SeekerProfileViewState, 'success' | 'empty'>; readonly locale: SupportedLocale; readonly onRetry: () => void }) {
  const copy = getSeekerProfileCopy(locale);
  const message = copy.states[state];
  return (
    <section className="seeker-dashboard__state" data-state={state} aria-label={message.title}>
      <StateMessage state={state} title={message.title} message={message.body} onRetry={state === 'retry' ? onRetry : undefined} retryLabel={copy.retry} />
      {state === 'error' ? <Button variant="secondary" size="sm" onClick={onRetry}>{copy.retry}</Button> : null}
    </section>
  );
}

function ProfileTabs({ locale, tab, copy }: { readonly locale: SupportedLocale; readonly tab: SeekerProfileTab; readonly copy: ReturnType<typeof getSeekerProfileCopy> }) {
  return (
    <nav className="seeker-profile__tabs" aria-label={copy.title}>
      {(['preferences', 'profile'] as const).map(item => (
        <a key={item} href={localeForSeekerPath(locale, `/seeker/profile?tab=${item}`)} aria-current={tab === item ? 'page' : undefined} data-active={tab === item || undefined}>
          {copy.tabs[item]}
        </a>
      ))}
      <a href={localeForSeekerPath(locale, '/seeker/settings')} aria-current={tab === 'settings' ? 'page' : undefined} data-active={tab === 'settings' || undefined}>
        {copy.tabs.settings}
      </a>
    </nav>
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
  const languageOptions = [
    { value: 'ar', label: 'العربية / Arabic' },
    { value: 'en', label: 'English' },
    { value: 'zh-CN', label: '简体中文 / Simplified Chinese' }
  ];
  return (
    <form className="seeker-profile__form" onSubmit={onSubmit} noValidate>
      <div className="seeker-profile__form-grid">
        <Input id="seeker-profile-first-name" label={copy.profile.firstName} value={draft.firstName} autoComplete="given-name" onChange={event => onChange({ firstName: event.target.value })} required />
        <Input id="seeker-profile-last-name" label={copy.profile.lastName} value={draft.lastName} autoComplete="family-name" onChange={event => onChange({ lastName: event.target.value })} required />
        <Input id="seeker-profile-phone" label={copy.profile.phone} value={profile.phone} readOnly disabled aria-describedby="seeker-profile-phone-help" />
        <Select id="seeker-profile-language" label={copy.profile.language} value={draft.locale} options={languageOptions} onChange={event => onChange({ locale: event.target.value as SupportedLocale })} />
      </div>
      <p id="seeker-profile-phone-help" className="seeker-profile__field-note">{locale === 'ar' ? 'رقم الهاتف محفوظ من خلال عملية التحقق.' : locale === 'zh-CN' ? '电话号码来自已验证的身份。' : 'The phone number is controlled by the verified identity flow.'}</p>
      <Button type="submit" loading={saving}>{saving ? copy.saving : copy.profile.save}</Button>
    </form>
  );
}

function PreferencesForm({
  draft,
  copy,
  saving,
  onChange,
  onSubmit
}: {
  readonly draft: PreferencesDraft;
  readonly copy: ReturnType<typeof getSeekerProfileCopy>;
  readonly saving: boolean;
  readonly onChange: (patch: Partial<PreferencesDraft>) => void;
  readonly onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="seeker-profile__form" onSubmit={onSubmit} noValidate>
      <fieldset className="seeker-profile__fieldset">
        <legend>{copy.preferences.purpose}</legend>
        <div className="seeker-profile__choice-list" role="group" aria-label={copy.preferences.purpose}>
          {([
            ['', copy.preferences.anyPurpose],
            ['buy', copy.preferences.buy],
            ['rent', copy.preferences.rent]
          ] as const).map(([value, label]) => (
            <button key={value || 'any'} type="button" className="seeker-profile__choice" data-selected={draft.purpose === value || undefined} aria-pressed={draft.purpose === value} onClick={() => onChange({ purpose: value })}>{label}</button>
          ))}
        </div>
      </fieldset>
      <div className="seeker-profile__form-grid">
        <Input id="seeker-preferences-property-types" label={copy.preferences.propertyTypes} value={draft.propertyTypes} helpText={copy.preferences.propertyTypesHelp} onChange={event => onChange({ propertyTypes: event.target.value })} />
        <Input id="seeker-preferences-locations" label={copy.preferences.locations} value={draft.locations} helpText={copy.preferences.locationsHelp} onChange={event => onChange({ locations: event.target.value })} />
        <Input id="seeker-preferences-min-price" label={copy.preferences.minPrice} type="number" min="0" step="1" inputMode="numeric" value={draft.minPrice} onChange={event => onChange({ minPrice: event.target.value })} />
        <Input id="seeker-preferences-max-price" label={copy.preferences.maxPrice} type="number" min="0" step="1" inputMode="numeric" value={draft.maxPrice} onChange={event => onChange({ maxPrice: event.target.value })} />
        <Input id="seeker-preferences-bedrooms-min" label={copy.preferences.bedroomsMin} type="number" min="0" step="1" inputMode="numeric" value={draft.bedroomsMin} onChange={event => onChange({ bedroomsMin: event.target.value })} />
        <Input id="seeker-preferences-bedrooms-max" label={copy.preferences.bedroomsMax} type="number" min="0" step="1" inputMode="numeric" value={draft.bedroomsMax} onChange={event => onChange({ bedroomsMax: event.target.value })} />
      </div>
      <Button type="submit" loading={saving}>{saving ? copy.saving : copy.preferences.save}</Button>
    </form>
  );
}

function UnavailablePanel({ title, body, copy }: { readonly title: string; readonly body: string; readonly copy: ReturnType<typeof getSeekerProfileCopy> }) {
  return (
    <section className="seeker-profile__settings-card" data-state="unavailable" aria-labelledby="seeker-profile-unavailable-title">
      <h3 id="seeker-profile-unavailable-title">{title}</h3>
      <p>{body}</p>
      <span className="seeker-profile__unavailable-label">{copy.unavailable}</span>
    </section>
  );
}

function SettingsContent({
  locale,
  profile,
  copy,
  authClient,
  saving,
  onLocaleChange,
  onSignOut
}: {
  readonly locale: SupportedLocale;
  readonly profile: SeekerProfileData;
  readonly copy: ReturnType<typeof getSeekerProfileCopy>;
  readonly authClient: SeekerProfileAuthClient | undefined;
  readonly saving: boolean;
  readonly onLocaleChange: (nextLocale: SupportedLocale) => void;
  readonly onSignOut: () => void;
}) {
  const languageOptions = [
    { value: 'ar', label: 'العربية / Arabic' },
    { value: 'en', label: 'English' },
    { value: 'zh-CN', label: '简体中文 / Simplified Chinese' }
  ];
  return (
    <div className="seeker-profile__settings">
      <section className="seeker-profile__settings-card" aria-labelledby="seeker-profile-language-title">
        <h3 id="seeker-profile-language-title">{copy.settings.languageHeading}</h3>
        <p>{copy.settings.languageBody}</p>
        <Select id="seeker-profile-settings-language" label={copy.profile.language} value={profile.locale} options={languageOptions} disabled={saving} onChange={event => onLocaleChange(event.target.value as SupportedLocale)} />
      </section>
      <UnavailablePanel title={copy.settings.securityHeading} body={copy.settings.securityBody} copy={copy} />
      <UnavailablePanel title={copy.settings.notificationHeading} body={copy.settings.notificationBody} copy={copy} />
      <section className="seeker-profile__settings-card" aria-labelledby="seeker-profile-sessions-title" data-state="unavailable">
        <h3 id="seeker-profile-sessions-title">{copy.settings.sessionsHeading}</h3>
        <p>{copy.settings.sessionsBody}</p>
        <div className="seeker-profile__disabled-options" aria-label={copy.settings.sessionsHeading}>
          <label><input type="checkbox" disabled /> {copy.settings.sessionsHeading}</label>
        </div>
        <span className="seeker-profile__unavailable-label">{copy.unavailable}</span>
      </section>
      <section className="seeker-profile__settings-card seeker-profile__settings-card--account" aria-labelledby="seeker-profile-account-title">
        <h3 id="seeker-profile-account-title">{copy.settings.accountHeading}</h3>
        <p>{copy.settings.accountBody}</p>
        <Button variant="danger" disabled>{copy.settings.deleteAccount}</Button>
        {authClient?.logout ? <Button variant="secondary" loading={saving} onClick={onSignOut}>{copy.settings.signOut}</Button> : null}
      </section>
      <p className="seeker-profile__field-note">{locale === 'ar' ? `الحساب: ${profile.firstName} ${profile.lastName}` : locale === 'zh-CN' ? `账户：${profile.firstName} ${profile.lastName}` : `Account: ${profile.firstName} ${profile.lastName}`}</p>
    </div>
  );
}

export function SeekerProfile({ locale, session, tab = 'preferences', authClient, apiOrigin, loadProfile, loadPreferences, actions }: SeekerProfileProps) {
  const copy = getSeekerProfileCopy(locale);
  const profileSource = useMemo(() => loadProfile ?? createSeekerProfileLoader({ apiOrigin, authorization: authClient }), [apiOrigin, authClient, loadProfile]);
  const preferencesSource = useMemo(() => loadPreferences ?? createPreferencesLoader({ apiOrigin, authorization: authClient }), [apiOrigin, authClient, loadPreferences]);
  const actionSource = useMemo(() => actions ?? createSeekerProfileActions({ apiOrigin, authorization: authClient }), [actions, apiOrigin, authClient]);
  const [profileState, setProfileState] = useState<SeekerProfileViewState>('loading');
  const [preferencesState, setPreferencesState] = useState<SeekerProfileViewState>('loading');
  const [profile, setProfile] = useState<SeekerProfileData | undefined>();
  const [preferences, setPreferences] = useState<SeekerPreferencesData | undefined>();
  const [profileDraft, setProfileDraft] = useState<ProfileDraft | undefined>();
  const [preferencesDraft, setPreferencesDraft] = useState<PreferencesDraft>({ propertyTypes: '', locations: '', purpose: '', minPrice: '', maxPrice: '', bedroomsMin: '', bedroomsMax: '' });
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<MutationFeedback | undefined>();
  const [validationError, setValidationError] = useState(false);

  useEffect(() => {
    if (session.status !== 'authenticated') {
      setProfileState('permission');
      setPreferencesState('permission');
      return undefined;
    }
    const controller = new AbortController();
    setProfileState('loading');
    if (tab === 'preferences') setPreferencesState('loading');
    void profileSource(controller.signal).then(nextProfile => {
      if (controller.signal.aborted) return;
      setProfile(nextProfile);
      setProfileDraft(profileDraftFor(nextProfile));
      setProfileState('success');
    }).catch(error => {
      if (!controller.signal.aborted) setProfileState(stateForError(error));
    });
    if (tab === 'preferences') {
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
  }, [attempt, preferencesSource, profileSource, session.status, tab]);

  const pageState = session.status !== 'authenticated'
    ? 'permission'
    : profileState !== 'success'
      ? profileState
      : tab === 'preferences' && preferencesState !== 'success'
        ? preferencesState
        : 'success';

  const saveProfile = async (input: SeekerProfilePatch, success: MutationFeedback = 'profileSaved') => {
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
      else setProfileState(nextState);
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
      else setPreferencesState(nextState);
    }).finally(() => setSaving(false));
  };

  const signOut = () => {
    if (authClient?.logout === undefined) return;
    setSaving(true);
    void authClient.logout().then(() => setFeedback('signedOut')).catch(() => undefined).finally(() => setSaving(false));
  };

  const activePath = tab === 'settings' ? '/seeker/settings' : '/seeker/profile';
  const feedbackText = feedback === 'profileSaved'
    ? copy.profile.saved
    : feedback === 'preferencesSaved'
      ? copy.preferences.saved
      : feedback === 'signedOut'
        ? copy.settings.signedOut
        : undefined;

  return (
    <section className="seeker-dashboard seeker-profile" data-screen-id={tab === 'preferences' ? 'SEK-08' : tab === 'profile' ? 'SEK-09' : 'SEK-10'} data-route={activePath}>
      <SeekerNavigation locale={locale} activePath={activePath} />
      <div className="seeker-dashboard__content">
        {pageState === 'loading' || pageState === 'retry' || pageState === 'error' || pageState === 'permission' ? <StatePanel state={pageState} locale={locale} onRetry={() => setAttempt(value => value + 1)} /> : null}
        {pageState === 'success' && profile !== undefined && profileDraft !== undefined ? (
          <>
            <div className="seeker-dashboard__heading-row">
              <div>
                <p className="seeker-dashboard__eyebrow">{copy.eyebrow}</p>
                <h1>{tab === 'preferences' ? copy.preferences.heading : tab === 'profile' ? copy.profile.heading : copy.settings.heading}</h1>
                <p>{copy.description}</p>
              </div>
            </div>
            <ProfileTabs locale={locale} tab={tab} copy={copy} />
            {feedbackText ? <p className="seeker-profile__feedback" data-state="success" role="status">{feedbackText}</p> : null}
            {validationError ? <p className="seeker-profile__feedback" data-state="error" role="alert">{copy.validation}</p> : null}
            {tab === 'preferences' ? (
              <section className="seeker-profile__panel" aria-labelledby="seeker-profile-preferences-panel-title">
                <h2 id="seeker-profile-preferences-panel-title">{copy.preferences.heading}</h2>
                {preferences !== undefined && Object.keys(preferences.preferences).length === 0 ? <p className="seeker-profile__empty-note" data-state="empty">{copy.preferences.noSavedPreferences}</p> : null}
                <PreferencesForm draft={preferencesDraft} copy={copy} saving={saving} onChange={patch => { setPreferencesDraft(current => ({ ...current, ...patch })); setValidationError(false); }} onSubmit={submitPreferences} />
              </section>
            ) : tab === 'profile' ? (
              <section className="seeker-profile__panel" aria-labelledby="seeker-profile-personal-panel-title">
                <h2 id="seeker-profile-personal-panel-title">{copy.profile.heading}</h2>
                <ProfileForm locale={locale} profile={profile} draft={profileDraft} copy={copy} saving={saving} onChange={patch => { setProfileDraft(current => current === undefined ? current : { ...current, ...patch }); setValidationError(false); }} onSubmit={submitProfile} />
              </section>
            ) : (
              <SettingsContent locale={locale} profile={profile} copy={copy} authClient={authClient} saving={saving} onLocaleChange={nextLocale => { void saveProfile({ locale: nextLocale }); }} onSignOut={signOut} />
            )}
          </>
        ) : null}
      </div>
    </section>
  );
}
