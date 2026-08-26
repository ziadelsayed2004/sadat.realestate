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
import { Button, Input, StateMessage } from '../design_system/index.ts';
import type { RouteSession } from '../routing/index.ts';
import {
  createSeekerProfileActions,
  createSeekerProfileLoader,
  createSeekerPreferencesLoader as createPreferencesLoader,
  isAuthenticatedSeekerSession,
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

interface PreferenceChoice {
  readonly value: string;
  readonly ar: string;
  readonly en: string;
}

const propertyTypeChoices: readonly PreferenceChoice[] = [
  { value: 'factory', ar: 'مصنع', en: 'Factory' },
  { value: 'commercial', ar: 'محل تجاري', en: 'Commercial shop' },
  { value: 'office', ar: 'مكتب', en: 'Office' },
  { value: 'land', ar: 'أرض', en: 'Land' },
  { value: 'roof', ar: 'رووف', en: 'Roof' },
  { value: 'duplex', ar: 'دوبلكس', en: 'Duplex' },
  { value: 'villa', ar: 'فيلا', en: 'Villa' },
  { value: 'apartment', ar: 'شقة', en: 'Apartment' }
];

const locationChoices: readonly PreferenceChoice[] = [
  { value: 'district-1', ar: 'الحي الأول', en: 'First district' },
  { value: 'district-2', ar: 'الحي الثاني', en: 'Second district' },
  { value: 'district-3', ar: 'الحي الثالث', en: 'Third district' },
  { value: 'district-4', ar: 'الحي الرابع', en: 'Fourth district' },
  { value: 'district-5', ar: 'الحي الخامس', en: 'Fifth district' },
  { value: 'district-6', ar: 'الحي السادس', en: 'Sixth district' },
  { value: 'district-7', ar: 'الحي السابع', en: 'Seventh district' },
  { value: 'industrial-zone', ar: 'المنطقة الصناعية', en: 'Industrial zone' },
  { value: 'upscale-zone', ar: 'المنطقة الراقية', en: 'Upscale zone' },
  { value: 'new-cairo', ar: 'القاهرة الجديدة', en: 'New Cairo' }
];

const bedroomChoices: readonly PreferenceChoice[] = [
  { value: '1', ar: '1', en: '1' },
  { value: '2', ar: '2', en: '2' },
  { value: '3', ar: '3', en: '3' },
  { value: '4', ar: '4', en: '4' },
  { value: '5+', ar: '5+', en: '5+' }
];

function preferenceChoiceLabel(locale: SupportedLocale, choice: PreferenceChoice): string {
  return locale === 'ar' ? choice.ar : choice.en;
}

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

function profileInitials(profile: SeekerProfileData): string {
  return `${profile.firstName.trim().slice(0, 1)}${profile.lastName.trim().slice(0, 1)}`.toUpperCase() || 'S';
}

function personalSurfaceCopy(locale: SupportedLocale) {
  return locale === 'ar'
    ? { role: 'باحث عن عقار', email: 'البريد الإلكتروني' }
    : { role: 'Property seeker', email: 'Email address' };
}

interface SettingsSurfaceCopy {
  readonly emailHeading: string;
  readonly currentEmail: string;
  readonly updateEmail: string;
  readonly phoneHeading: string;
  readonly currentPhone: string;
  readonly updatePhone: string;
  readonly passwordHeading: string;
  readonly currentPassword: string;
  readonly newPassword: string;
  readonly confirmPassword: string;
  readonly changePassword: string;
  readonly notificationsHeading: string;
  readonly requestUpdates: string;
  readonly requestUpdatesBody: string;
  readonly viewingReminders: string;
  readonly viewingRemindersBody: string;
  readonly savedPropertyAlerts: string;
  readonly savedPropertyAlertsBody: string;
  readonly accountAlerts: string;
  readonly accountAlertsBody: string;
  readonly marketingMessages: string;
  readonly marketingMessagesBody: string;
  readonly otherDevicesHeading: string;
  readonly otherDevicesBody: string;
  readonly signOutOtherDevices: string;
  readonly dangerHeading: string;
  readonly dangerBody: string;
}

function settingsSurfaceCopy(locale: SupportedLocale): SettingsSurfaceCopy {
  if (locale === 'ar') {
    return {
      emailHeading: 'البريد الإلكتروني',
      currentEmail: 'البريد الحالي',
      updateEmail: 'تحديث البريد',
      phoneHeading: 'رقم الهاتف',
      currentPhone: 'رقم الهاتف الحالي',
      updatePhone: 'تحديث الهاتف',
      passwordHeading: 'تغيير كلمة المرور',
      currentPassword: 'كلمة المرور الحالية',
      newPassword: 'كلمة المرور الجديدة',
      confirmPassword: 'تأكيد كلمة المرور الجديدة',
      changePassword: 'تغيير كلمة المرور',
      notificationsHeading: 'إعدادات الإشعارات',
      requestUpdates: 'تحديثات الطلبات',
      requestUpdatesBody: 'إشعار عند تغيير حالة أي طلب.',
      viewingReminders: 'مواعيد المعاينة',
      viewingRemindersBody: 'تذكيرك بكل موعد معاينة.',
      savedPropertyAlerts: 'العقارات المحفوظة',
      savedPropertyAlertsBody: 'إشعار عند تغيير سعر عقار محفوظ.',
      accountAlerts: 'إشعارات الحساب',
      accountAlertsBody: 'تنبيهات الأمان وتحديثات الحساب.',
      marketingMessages: 'الرسائل التسويقية',
      marketingMessagesBody: 'عروض وتوصيات من المنصة.',
      otherDevicesHeading: 'الأجهزة الأخرى',
      otherDevicesBody: 'تسجيل الخروج من جميع الأجهزة الأخرى التي يكون حسابك مسجلاً عليها.',
      signOutOtherDevices: 'تسجيل الخروج من الأجهزة الأخرى',
      dangerHeading: 'منطقة الخطر',
      dangerBody: 'حذف الحساب إجراء نهائي غير قابل للتراجع. ستُحذف جميع بياناتك وطلباتك نهائياً.',
    };
  }
  return {
    emailHeading: 'Email',
    currentEmail: 'Current email',
    updateEmail: 'Update email',
    phoneHeading: 'Phone number',
    currentPhone: 'Current phone number',
    updatePhone: 'Update phone',
    passwordHeading: 'Change password',
    currentPassword: 'Current password',
    newPassword: 'New password',
    confirmPassword: 'Confirm new password',
    changePassword: 'Change password',
    notificationsHeading: 'Notification settings',
    requestUpdates: 'Request updates',
    requestUpdatesBody: 'Notify me when a request status changes.',
    viewingReminders: 'Viewing reminders',
    viewingRemindersBody: 'Remind me about every viewing appointment.',
    savedPropertyAlerts: 'Saved properties',
    savedPropertyAlertsBody: 'Notify me when a saved property changes price.',
    accountAlerts: 'Account alerts',
    accountAlertsBody: 'Security notices and account updates.',
    marketingMessages: 'Marketing messages',
    marketingMessagesBody: 'Offers and recommendations from the platform.',
    otherDevicesHeading: 'Other devices',
    otherDevicesBody: 'Sign out from all other devices where your account is currently signed in.',
    signOutOtherDevices: 'Sign out from other devices',
    dangerHeading: 'Danger zone',
    dangerBody: 'Account deletion is final and cannot be undone. All of your data and requests will be permanently removed.'
  };
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
        <a key={item} href={localeForSeekerPath(locale, `/seeker/profile?tab=${item === 'profile' ? 'personal' : item}`)} aria-current={tab === item ? 'page' : undefined} data-active={tab === item || undefined}>
          {copy.tabs[item]}
        </a>
      ))}
    </nav>
  );
}

function PreferenceChoiceField({ locale, label, value, choices, onChange }: { readonly locale: SupportedLocale; readonly label: string; readonly value: string; readonly choices: readonly PreferenceChoice[]; readonly onChange: (value: string) => void }) {
  const selected = listValue(value);
  const customChoices = selected
    .filter(item => !choices.some(choice => choice.value === item))
    .map(item => ({ value: item, ar: item, en: item }));
  const visibleChoices = [...customChoices, ...choices];
  return (
    <fieldset className="seeker-profile__fieldset seeker-profile__chip-field">
      <legend>{label}</legend>
      <div className="seeker-profile__choice-list seeker-profile__choice-list--chips" role="group" aria-label={label}>
        {visibleChoices.map(choice => (
          <button key={choice.value} type="button" className="seeker-profile__choice seeker-profile__choice--chip" data-selected={selected.includes(choice.value) || undefined} aria-pressed={selected.includes(choice.value)} onClick={() => onChange(toggleListValue(value, choice.value))}>
            {preferenceChoiceLabel(locale, choice)}{selected.includes(choice.value) ? <span aria-hidden="true"> ✓</span> : null}
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
        <span className="seeker-profile__identity-avatar" aria-hidden="true">{profileInitials(profile)}</span>
        <span><strong>{profile.firstName} {profile.lastName}</strong><small>{surfaceCopy.role}</small></span>
      </div>
      <div className="seeker-profile__form-grid">
        <Input id="seeker-profile-first-name" label={copy.profile.firstName} value={draft.firstName} autoComplete="given-name" onChange={event => onChange({ firstName: event.target.value })} required />
        <Input id="seeker-profile-last-name" label={copy.profile.lastName} value={draft.lastName} autoComplete="family-name" onChange={event => onChange({ lastName: event.target.value })} required />
        <Input id="seeker-profile-phone" label={copy.profile.phone} value={profile.phone} readOnly disabled aria-describedby="seeker-profile-phone-help" />
        <Input id="seeker-profile-email" label={surfaceCopy.email} value={profile.email} readOnly disabled />
      </div>
      <p id="seeker-profile-phone-help" className="seeker-profile__field-note">{locale === 'ar' ? 'رقم الهاتف محفوظ من خلال عملية التحقق.' : locale === 'zh-CN' ? '电话号码来自已验证的身份。' : 'The phone number is controlled by the verified identity flow.'}</p>
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
      <div className="seeker-profile__preference-stack">
        <PreferenceChoiceField locale={locale} label={copy.preferences.propertyTypes} value={draft.propertyTypes} choices={propertyTypeChoices} onChange={propertyTypes => onChange({ propertyTypes })} />
        <PreferenceChoiceField locale={locale} label={copy.preferences.locations} value={draft.locations} choices={locationChoices} onChange={locations => onChange({ locations })} />
      </div>
      <div className="seeker-profile__form-grid seeker-profile__form-grid--numeric">
        <Input id="seeker-preferences-min-price" label={copy.preferences.minPrice} type="number" min="0" step="1" inputMode="numeric" value={draft.minPrice} onChange={event => onChange({ minPrice: event.target.value })} />
        <Input id="seeker-preferences-max-price" label={copy.preferences.maxPrice} type="number" min="0" step="1" inputMode="numeric" value={draft.maxPrice} onChange={event => onChange({ maxPrice: event.target.value })} />
      </div>
      <fieldset className="seeker-profile__fieldset seeker-profile__chip-field">
        <legend>{copy.preferences.bedroomsMin}</legend>
        <div className="seeker-profile__choice-list seeker-profile__choice-list--bedrooms" role="group" aria-label={copy.preferences.bedroomsMin}>
          {bedroomChoices.map(choice => {
            const selectedBedroom = choice.value === '5+' ? draft.bedroomsMin === '5' && draft.bedroomsMax === '' : draft.bedroomsMin === choice.value && draft.bedroomsMax === choice.value;
            return <button key={choice.value} type="button" className="seeker-profile__choice seeker-profile__choice--bedroom" data-selected={selectedBedroom || undefined} aria-pressed={selectedBedroom} onClick={() => onChange(choice.value === '5+' ? { bedroomsMin: '5', bedroomsMax: '' } : { bedroomsMin: choice.value, bedroomsMax: choice.value })}>{preferenceChoiceLabel(locale, choice)}</button>;
          })}
        </div>
        {draft.bedroomsMin !== '' && draft.bedroomsMax !== '' && draft.bedroomsMin !== draft.bedroomsMax ? <p className="seeker-profile__field-note">{copy.preferences.bedroomsMin}: {draft.bedroomsMin} · {copy.preferences.bedroomsMax}: {draft.bedroomsMax}</p> : null}
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
  onSignOut
}: {
  readonly locale: SupportedLocale;
  readonly profile: SeekerProfileData;
  readonly copy: ReturnType<typeof getSeekerProfileCopy>;
  readonly authClient: SeekerProfileAuthClient | undefined;
  readonly saving: boolean;
  readonly onSignOut: () => void;
}) {
  const surfaceCopy = settingsSurfaceCopy(locale);
  const notificationSettings = [
    { id: 'request-updates', label: surfaceCopy.requestUpdates, body: surfaceCopy.requestUpdatesBody, enabled: true },
    { id: 'viewing-reminders', label: surfaceCopy.viewingReminders, body: surfaceCopy.viewingRemindersBody, enabled: true },
    { id: 'saved-property-alerts', label: surfaceCopy.savedPropertyAlerts, body: surfaceCopy.savedPropertyAlertsBody, enabled: true },
    { id: 'account-alerts', label: surfaceCopy.accountAlerts, body: surfaceCopy.accountAlertsBody, enabled: true },
    { id: 'marketing-messages', label: surfaceCopy.marketingMessages, body: surfaceCopy.marketingMessagesBody, enabled: false }
  ];
  return (
    <div className="seeker-profile__settings">
      <section className="seeker-profile__settings-card seeker-profile__settings-card--value" data-state="unavailable" aria-labelledby="seeker-profile-email-title">
        <h3 id="seeker-profile-email-title">{surfaceCopy.emailHeading}</h3>
        <Input id="seeker-profile-settings-email" label={surfaceCopy.currentEmail} value={profile.email} readOnly disabled />
        <div className="seeker-profile__settings-actions">
          <Button type="button" disabled>{surfaceCopy.updateEmail}</Button>
          <span className="seeker-profile__unavailable-label">{copy.unavailable}</span>
        </div>
      </section>
      <section className="seeker-profile__settings-card seeker-profile__settings-card--value" data-state="unavailable" aria-labelledby="seeker-profile-phone-title">
        <h3 id="seeker-profile-phone-title">{surfaceCopy.phoneHeading}</h3>
        <Input id="seeker-profile-settings-phone" label={surfaceCopy.currentPhone} value={profile.phone} readOnly disabled />
        <div className="seeker-profile__settings-actions">
          <Button type="button" disabled>{surfaceCopy.updatePhone}</Button>
          <span className="seeker-profile__unavailable-label">{copy.unavailable}</span>
        </div>
      </section>
      <section className="seeker-profile__settings-card seeker-profile__settings-card--password" data-state="unavailable" aria-labelledby="seeker-profile-password-title">
        <h3 id="seeker-profile-password-title">{surfaceCopy.passwordHeading}</h3>
        <div className="seeker-profile__password-fields">
          <Input id="seeker-profile-current-password" label={surfaceCopy.currentPassword} type="password" value="" placeholder="••••••••" disabled />
          <Input id="seeker-profile-new-password" label={surfaceCopy.newPassword} type="password" value="" placeholder="••••••••" disabled />
          <Input id="seeker-profile-confirm-password" label={surfaceCopy.confirmPassword} type="password" value="" placeholder="••••••••" disabled />
        </div>
        <div className="seeker-profile__settings-actions">
          <Button type="button" disabled>{surfaceCopy.changePassword}</Button>
          <span className="seeker-profile__unavailable-label">{copy.unavailable}</span>
        </div>
      </section>
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
      <section className="seeker-profile__settings-card" data-state="unavailable" aria-labelledby="seeker-profile-sessions-title">
        <h3 id="seeker-profile-sessions-title">{surfaceCopy.otherDevicesHeading}</h3>
        <p>{surfaceCopy.otherDevicesBody}</p>
        <div className="seeker-profile__settings-actions">
          <Button type="button" variant="secondary" disabled>{surfaceCopy.signOutOtherDevices}</Button>
          <span className="seeker-profile__unavailable-label">{copy.unavailable}</span>
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

export function SeekerProfile({ locale, session, tab = 'preferences', authClient, apiOrigin, loadProfile, loadPreferences, actions }: SeekerProfileProps) {
  const copy = getSeekerProfileCopy(locale);
  const activeTab = profileTabForLocation(tab);
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
  const sessionRole = session.status === 'authenticated' ? session.role : undefined;

  useEffect(() => {
    if (!isAuthenticatedSeekerSession(session)) {
      setProfileState('permission');
      setPreferencesState('permission');
      return undefined;
    }
    const controller = new AbortController();
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
    <section className="seeker-dashboard seeker-profile" data-screen-id={activeTab === 'preferences' ? 'SEK-08' : activeTab === 'profile' ? 'SEK-09' : 'SEK-10'} data-route={activePath}>
      <SeekerNavigation locale={locale} activePath={activePath} />
      <div className="seeker-dashboard__content">
        {pageState === 'loading' || pageState === 'retry' || pageState === 'error' || pageState === 'permission' ? <StatePanel state={pageState} locale={locale} onRetry={() => setAttempt(value => value + 1)} /> : null}
        {pageState === 'success' && profile !== undefined && profileDraft !== undefined ? (
          <>
            <div className="seeker-dashboard__heading-row">
              <div>
                <p className="seeker-dashboard__eyebrow">{copy.eyebrow}</p>
                <h1>{activeTab === 'settings' ? copy.settings.heading : copy.title}</h1>
                <p>{copy.description}</p>
              </div>
            </div>
            <ProfileTabs locale={locale} tab={activeTab} copy={copy} />
            {feedbackText ? <p className="seeker-profile__feedback" data-state="success" role="status">{feedbackText}</p> : null}
            {validationError ? <p className="seeker-profile__feedback" data-state="error" role="alert">{copy.validation}</p> : null}
            {activeTab === 'preferences' ? (
              <section className="seeker-profile__panel" aria-labelledby="seeker-profile-preferences-panel-title">
                <h2 id="seeker-profile-preferences-panel-title">{copy.preferences.heading}</h2>
                {preferences !== undefined && Object.keys(preferences.preferences).length === 0 ? <p className="seeker-profile__empty-note" data-state="empty">{copy.preferences.noSavedPreferences}</p> : null}
                <PreferencesForm locale={locale} draft={preferencesDraft} copy={copy} saving={saving} onChange={patch => { setPreferencesDraft(current => ({ ...current, ...patch })); setValidationError(false); }} onSubmit={submitPreferences} />
              </section>
            ) : activeTab === 'profile' ? (
              <section className="seeker-profile__panel" aria-labelledby="seeker-profile-personal-panel-title">
                <h2 id="seeker-profile-personal-panel-title">{copy.profile.heading}</h2>
                <ProfileForm locale={locale} profile={profile} draft={profileDraft} copy={copy} saving={saving} onChange={patch => { setProfileDraft(current => current === undefined ? current : { ...current, ...patch }); setValidationError(false); }} onSubmit={submitProfile} />
              </section>
            ) : (
              <SettingsContent locale={locale} profile={profile} copy={copy} authClient={authClient} saving={saving} onSignOut={signOut} />
            )}
          </>
        ) : null}
      </div>
    </section>
  );
}
