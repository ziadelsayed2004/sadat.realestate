import {
  providerAccountPatchSchema,
  providerLocaleSchema,
  type ProviderAccountPatch,
  type ProviderApplicationData,
  type ProviderType,
  type SupportedLocale
} from '@sadat-real-estate/contracts';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { ApiClientError } from '../contracts/index.ts';
import { Button, Input, Select, StateMessage } from '../design_system/index.ts';
import { getProviderTypeCopy } from './copy.ts';
import { getProviderAccountCopy, type ProviderAccountCopy } from './account-copy.ts';
import './styles.css';

export interface ProviderAccountFlowClient {
  readonly getProviderApplication?: (() => Promise<ProviderApplicationData>) | undefined;
  readonly updateProviderAccount?: ((patch: ProviderAccountPatch) => Promise<ProviderApplicationData>) | undefined;
  readonly refresh?: (() => Promise<unknown>) | undefined;
}

interface ProviderAccountPageProps {
  readonly client: ProviderAccountFlowClient;
  readonly locale: SupportedLocale;
  readonly providerType: ProviderType;
  readonly initialApplication?: ProviderApplicationData | undefined;
  readonly onBack: () => void;
  readonly onContinue?: ((application: ProviderApplicationData) => void) | undefined;
}

type LoadState = 'loading' | 'ready' | 'error' | 'retry' | 'permission';
type SaveState = 'idle' | 'loading' | 'error' | 'retry' | 'success';

interface AccountFormState {
  readonly accountOwnerFullName: string;
  readonly displayName: string;
  readonly email: string;
  readonly whatsappNumber: string;
  readonly preferredLocale: SupportedLocale;
  readonly termsAccepted: boolean;
  readonly privacyAccepted: boolean;
}

interface AccountUiError {
  readonly state: 'error' | 'retry' | 'permission';
  readonly title: string;
  readonly message: string;
}

function formFromApplication(application: ProviderApplicationData): AccountFormState {
  return {
    accountOwnerFullName: application.accountOwnerFullName ?? '',
    displayName: application.displayName ?? '',
    email: application.email ?? '',
    whatsappNumber: application.whatsappNumber ?? '',
    preferredLocale: application.preferredLocale ?? 'ar',
    termsAccepted: application.termsAcceptedAt !== undefined,
    privacyAccepted: application.privacyAcceptedAt !== undefined
  };
}

function emptyForm(locale: SupportedLocale): AccountFormState {
  return {
    accountOwnerFullName: '',
    displayName: '',
    email: '',
    whatsappNumber: '',
    preferredLocale: locale,
    termsAccepted: false,
    privacyAccepted: false
  };
}

function isUnauthorized(error: unknown): boolean {
  if (error instanceof ApiClientError) return error.status === 401 || error.status === 403;
  return typeof error === 'object' && error !== null && 'status' in error
    && ((error as { readonly status?: unknown }).status === 401 || (error as { readonly status?: unknown }).status === 403);
}

function accountError(error: unknown, copy: ProviderAccountCopy): AccountUiError {
  const code = error instanceof ApiClientError ? error.apiError?.code : undefined;
  const status = error instanceof ApiClientError
    ? error.status
    : typeof error === 'object' && error !== null && 'status' in error
      ? (error as { readonly status?: unknown }).status
      : undefined;
  if (code === 'PROVIDER_APPLICATION_NOT_FOUND' || status === 404) {
    return { state: 'permission', title: copy.notFoundTitle, message: copy.notFoundBody };
  }
  if (code === 'PROVIDER_APPLICATION_NOT_EDITABLE' || status === 403) {
    return { state: 'permission', title: copy.permissionTitle, message: copy.permissionBody };
  }
  if (code === 'PROVIDER_APPLICATION_VERSION_CONFLICT') {
    return { state: 'retry', title: copy.conflictTitle, message: copy.conflictBody };
  }
  if ((error instanceof ApiClientError && error.code === 'NETWORK_ERROR') || status === 503) {
    return { state: 'retry', title: copy.networkTitle, message: copy.networkBody };
  }
  return { state: 'error', title: copy.permissionTitle, message: copy.permissionBody };
}

function registrationError(error: unknown, copy: ProviderAccountCopy): AccountUiError {
  const code = error instanceof ApiClientError ? error.apiError?.code : undefined;
  if (code === 'INVALID_REGISTRATION_TOKEN') {
    return { state: 'error', title: copy.invalidRegistrationTitle, message: copy.invalidRegistrationBody };
  }
  if (code === 'PROVIDER_ALREADY_EXISTS') {
    return { state: 'permission', title: copy.duplicateRegistrationTitle, message: copy.duplicateRegistrationBody };
  }
  if (error instanceof ApiClientError && (error.code === 'NETWORK_ERROR' || error.status === 503)) {
    return { state: 'retry', title: copy.networkTitle, message: copy.networkBody };
  }
  return { state: 'error', title: copy.unavailableTitle, message: copy.unavailableBody };
}

function missingFieldLabel(copy: ProviderAccountCopy, field: string): string {
  return copy.missingFieldLabels[field] ?? copy.requirementsTitle;
}

function hasAccountValues(form: AccountFormState): boolean {
  return form.accountOwnerFullName.trim() !== ''
    || form.displayName.trim() !== ''
    // The verified email is prefilled by the registration authority; it must
    // not turn an otherwise untouched account form into the filled variant.
    || form.whatsappNumber.trim() !== ''
    || form.termsAccepted
    || form.privacyAccepted;
}

function buildPatch(application: ProviderApplicationData, form: AccountFormState): unknown {
  const patch: Record<string, unknown> = {
    version: application.version,
    accountOwnerFullName: form.accountOwnerFullName,
    displayName: form.displayName,
    email: form.email,
    preferredLocale: form.preferredLocale
  };
  if (form.whatsappNumber.trim() !== '') patch.whatsappNumber = form.whatsappNumber;
  if (form.termsAccepted) patch.termsAcceptedAt = new Date().toISOString();
  if (form.privacyAccepted) patch.privacyAcceptedAt = new Date().toISOString();
  return patch;
}

function FormNotice({ error, copy, onRetry }: { readonly error: AccountUiError; readonly copy: ProviderAccountCopy; readonly onRetry?: (() => void) | undefined }) {
  return (
    <StateMessage
      state={error.state}
      title={error.title}
      message={error.message}
      retryLabel={copy.retryAction}
      onRetry={error.state === 'retry' ? onRetry : undefined}
    />
  );
}

export function ProviderAccountPage({ client, locale, providerType, initialApplication, onBack, onContinue }: ProviderAccountPageProps) {
  const copy = getProviderAccountCopy(locale);
  const typeCopy = getProviderTypeCopy(locale);
  const [application, setApplication] = useState<ProviderApplicationData | undefined>(initialApplication);
  const [form, setForm] = useState<AccountFormState>(() => initialApplication === undefined ? emptyForm(locale) : formFromApplication(initialApplication));
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [error, setError] = useState<AccountUiError | undefined>();
  const continueAfterSave = useRef(false);

  const loadApplication = useCallback(async () => {
    if (client.getProviderApplication === undefined) {
      if (initialApplication === undefined) {
        setLoadState('permission');
        setError({ state: 'permission', title: copy.permissionTitle, message: copy.permissionBody });
        return;
      }
      if (initialApplication.providerType !== providerType) {
        setLoadState('permission');
        setError({ state: 'permission', title: copy.permissionTitle, message: copy.permissionBody });
        return;
      }
      setLoadState('ready');
      setForm(formFromApplication(initialApplication));
      return;
    }

    setLoadState('loading');
    setError(undefined);
    try {
      let nextApplication: ProviderApplicationData;
      try {
        nextApplication = await client.getProviderApplication();
      } catch (requestError: unknown) {
        if (!isUnauthorized(requestError) || client.refresh === undefined) throw requestError;
        await client.refresh();
        nextApplication = await client.getProviderApplication();
      }
      if (nextApplication.providerType !== providerType) {
        setLoadState('permission');
        setError({ state: 'permission', title: copy.permissionTitle, message: copy.permissionBody });
        return;
      }
      setApplication(nextApplication);
      setForm(formFromApplication(nextApplication));
      setSaveState('idle');
      setLoadState('ready');
    } catch (requestError: unknown) {
      const nextError = accountError(requestError, copy);
      setLoadState(nextError.state);
      setError(nextError);
    }
  }, [client, copy, initialApplication, providerType]);

  useEffect(() => {
    void loadApplication();
  }, [loadApplication]);

  const patchPreview = useMemo(() => {
    if (application === undefined) return undefined;
    return providerAccountPatchSchema.safeParse(buildPatch(application, form));
  }, [application, form]);

  const save = useCallback(async () => {
    if (application === undefined || client.updateProviderAccount === undefined) {
      setSaveState('error');
      setError({ state: 'permission', title: copy.permissionTitle, message: copy.permissionBody });
      return;
    }
    if (!form.termsAccepted || !form.privacyAccepted || patchPreview?.success !== true) {
      setSaveState('error');
      setError({ state: 'error', title: copy.invalidFormTitle, message: copy.invalidFormBody });
      return;
    }

    setSaveState('loading');
    setError(undefined);
    try {
      const updated = await client.updateProviderAccount(patchPreview.data);
      setApplication(updated);
      setForm(formFromApplication(updated));
      setSaveState('success');
      if (continueAfterSave.current) onContinue?.(updated);
      continueAfterSave.current = false;
    } catch (requestError: unknown) {
      const nextError = accountError(requestError, copy);
      setSaveState(nextError.state === 'permission' ? 'error' : nextError.state);
      setError(nextError);
    }
  }, [application, client, copy, form.privacyAccepted, form.termsAccepted, onContinue, patchPreview]);

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    void save();
  }

  function update<K extends keyof AccountFormState>(key: K, value: AccountFormState[K]): void {
    setForm(previous => ({ ...previous, [key]: value }));
    setSaveState('idle');
    if (error?.state === 'error') setError(undefined);
  }

  const screenId = hasAccountValues(form) ? 'AUTH-09+' : 'AUTH-09';
  const missingFields = application?.missingFields ?? [];
  const locationMissing = missingFields.includes('primaryLocationId') || missingFields.includes('serviceAreaIds');
  const state = loadState === 'ready' ? saveState : loadState;

  if (loadState === 'loading') {
    return (
      <section className="auth-page provider-account-page" data-testid="provider-account-details" data-screen-id="AUTH-09" data-state="loading" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
        <div className="auth-card auth-card--form provider-account-card">
          <div className="provider-account-state"><StateMessage state="loading" title={copy.loadingTitle} message={copy.loadingBody} /></div>
        </div>
      </section>
    );
  }

  if (loadState === 'permission' || loadState === 'error' || loadState === 'retry') {
    return (
      <section className="auth-page provider-account-page" data-testid="provider-account-details" data-screen-id="AUTH-09" data-state={loadState} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
        <div className="auth-card auth-card--form provider-account-card">
          <div className="provider-account-state">
            {error === undefined ? null : <FormNotice error={error} copy={copy} onRetry={() => void loadApplication()} />}
            <Button type="button" variant="ghost" onClick={onBack}>{copy.backAction}</Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="auth-page provider-account-page" data-testid="provider-account-details" data-screen-id={screenId} data-state={state} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <div className="auth-card auth-card--form provider-account-card">
        <header className="auth-card__heading provider-account-card__heading">
          <span className="auth-card__icon provider-account-card__step" aria-hidden="true">3</span>
          <p className="provider-account-card__step-label">{copy.stepLabel}</p>
          <h1>{copy.title}</h1>
          <p>{copy.description}</p>
          <div className="provider-account-type" role="status">
            <span>{copy.providerTypeLabel}</span>
            <strong>{typeCopy.options[providerType].title}</strong>
          </div>
        </header>
        <div className="auth-card__body provider-account-card__body">
          {error === undefined ? null : <FormNotice error={error} copy={copy} onRetry={() => void save()} />}
          {saveState === 'success' ? <StateMessage state="success" title={copy.savedTitle} message={copy.savedBody} /> : null}
          <form className="auth-form provider-account-form" onSubmit={submit} noValidate>
            <div className="provider-account-progress" aria-label={copy.stepLabel}>
              <span className="provider-account-progress__item provider-account-progress__item--complete">1</span>
              <span className="provider-account-progress__line provider-account-progress__line--complete" aria-hidden="true" />
              <span className="provider-account-progress__item provider-account-progress__item--active">2</span>
              <span className="provider-account-progress__line" aria-hidden="true" />
              <span className="provider-account-progress__item">3</span>
              <span className="provider-account-progress__line" aria-hidden="true" />
              <span className="provider-account-progress__item">4</span>
            </div>
            <Input
              id="provider-account-owner-name"
              label={copy.accountOwnerFullNameLabel}
              name="accountOwnerFullName"
              autoComplete="name"
              placeholder={copy.accountOwnerFullNamePlaceholder}
              value={form.accountOwnerFullName}
              onChange={event => update('accountOwnerFullName', event.currentTarget.value)}
              required
              state={saveState === 'error' && form.accountOwnerFullName.trim() === '' ? 'error' : 'default'}
            />
            <Input
              id="provider-account-display-name"
              label={copy.displayNameLabel}
              name="displayName"
              autoComplete="organization"
              placeholder={copy.displayNamePlaceholder}
              value={form.displayName}
              onChange={event => update('displayName', event.currentTarget.value)}
              required
              state={saveState === 'error' && form.displayName.trim() === '' ? 'error' : 'default'}
            />
            <Input
              id="provider-account-email"
              label={copy.emailLabel}
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder={copy.emailPlaceholder}
              value={form.email}
              onChange={event => update('email', event.currentTarget.value)}
              required
              state={saveState === 'error' && patchPreview?.success !== true ? 'error' : 'default'}
            />
            <div className="provider-account-business-contact">
              <Input
                id="provider-account-whatsapp"
                label={copy.whatsappLabel}
                name="whatsappNumber"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                value={form.whatsappNumber}
                onChange={event => update('whatsappNumber', event.currentTarget.value)}
                dir="ltr"
              />
            </div>
            <Select
              id="provider-account-locale"
              label={copy.preferredLocaleLabel}
              name="preferredLocale"
              value={form.preferredLocale}
              onChange={event => {
                const next = providerLocaleSchema.safeParse(event.currentTarget.value);
                if (next.success) update('preferredLocale', next.data);
              }}
              options={(['ar', 'en', 'zh-CN'] as const).map(value => ({ value, label: copy.localeOptions[value] }))}
            />
            <div className="provider-account-consents">
              <label className="provider-account-checkbox">
                <input type="checkbox" checked={form.termsAccepted} onChange={event => update('termsAccepted', event.currentTarget.checked)} />
                <span>{copy.termsLabel}</span>
              </label>
              <label className="provider-account-checkbox">
                <input type="checkbox" checked={form.privacyAccepted} onChange={event => update('privacyAccepted', event.currentTarget.checked)} />
                <span>{copy.privacyLabel}</span>
              </label>
            </div>
            <p className="provider-account-contract-note">{copy.unsupportedFieldNote}</p>
            {locationMissing ? (
              <aside className="provider-account-guidance" role="note">
                <strong>{copy.requirementsTitle}</strong>
                <span>{copy.unavailableLocationBody}</span>
              </aside>
            ) : null}
            {missingFields.length > 0 ? (
              <aside className="provider-account-missing" role="status">
                <strong>{copy.requirementsTitle}</strong>
                <p>{copy.requirementsBody}</p>
                <ul>
                  {missingFields.map(field => <li key={field}>{missingFieldLabel(copy, field)}</li>)}
                </ul>
              </aside>
            ) : null}
            <div className="provider-account-actions">
              <Button type="submit" variant="secondary" size="lg" loading={saveState === 'loading'} disabled={saveState === 'loading'} onClick={() => { continueAfterSave.current = false; }}>
                {saveState === 'loading' ? copy.savingAction : copy.saveDraftAction}
              </Button>
              <Button type="submit" size="lg" loading={saveState === 'loading'} disabled={saveState === 'loading'} onClick={() => { continueAfterSave.current = true; }}>
                {saveState === 'loading' ? copy.savingAction : copy.saveContinueAction}
              </Button>
            </div>
          </form>
          <Button type="button" variant="ghost" onClick={onBack}>{copy.backAction}</Button>
        </div>
      </div>
    </section>
  );
}

export { accountError, registrationError, buildPatch, formFromApplication };
