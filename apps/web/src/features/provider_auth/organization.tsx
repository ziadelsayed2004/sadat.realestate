import {
  providerBusinessPatchSchema,
  providerCompanyPatchSchema,
  type ProviderApplicationData,
  type ProviderBusinessPatch,
  type ProviderCompanyPatch,
  type ProviderType,
  type SupportedLocale
} from '@sadat-real-estate/contracts';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { ApiClientError } from '../contracts/index.ts';
import { Button, Input, Select, StateMessage } from '../design_system/index.ts';
import { getProviderTypeCopy } from './copy.ts';
import {
  getProviderOrganizationCopy,
  organizationVariant,
  type OrganizationVariant,
  type ProviderOrganizationCopy
} from './organization-copy.ts';
import './styles.css';

export interface ProviderOrganizationFlowClient {
  readonly getProviderApplication?: (() => Promise<ProviderApplicationData>) | undefined;
  readonly updateProviderBusiness?: ((patch: ProviderBusinessPatch) => Promise<ProviderApplicationData>) | undefined;
  readonly updateProviderCompany?: ((patch: ProviderCompanyPatch) => Promise<ProviderApplicationData>) | undefined;
  readonly refresh?: (() => Promise<unknown>) | undefined;
}

interface ProviderOrganizationPageProps {
  readonly client: ProviderOrganizationFlowClient;
  readonly locale: SupportedLocale;
  readonly providerType: ProviderType;
  readonly initialApplication?: ProviderApplicationData | undefined;
  readonly onBack: () => void;
  readonly onContinue?: ((application: ProviderApplicationData) => void) | undefined;
}

type LoadState = 'loading' | 'ready' | 'error' | 'retry' | 'permission';
type SaveState = 'idle' | 'loading' | 'error' | 'retry' | 'success';

type OrganizationField =
  | 'legalBusinessName'
  | 'tradeName'
  | 'businessAddress'
  | 'legalCompanyName'
  | 'brandName'
  | 'headOfficeAddress'
  | 'commercialRegistrationNumber'
  | 'taxRegistrationNumber'
  | 'authorizedRepresentativeFullName'
  | 'authorizedRepresentativeTitle';

interface OrganizationFormState {
  readonly legalBusinessName: string;
  readonly tradeName: string;
  readonly businessAddress: string;
  readonly legalCompanyName: string;
  readonly brandName: string;
  readonly headOfficeAddress: string;
  readonly commercialRegistrationNumber: string;
  readonly taxRegistrationNumber: string;
  readonly authorizedRepresentativeFullName: string;
  readonly authorizedRepresentativeTitle: string;
  readonly accountOwnerHasRegisteredAuthority: boolean | undefined;
}

interface OrganizationUiError {
  readonly state: 'error' | 'retry' | 'permission';
  readonly title: string;
  readonly message: string;
}

function emptyForm(): OrganizationFormState {
  return {
    legalBusinessName: '',
    tradeName: '',
    businessAddress: '',
    legalCompanyName: '',
    brandName: '',
    headOfficeAddress: '',
    commercialRegistrationNumber: '',
    taxRegistrationNumber: '',
    authorizedRepresentativeFullName: '',
    authorizedRepresentativeTitle: '',
    accountOwnerHasRegisteredAuthority: undefined
  };
}

function formFromApplication(application: ProviderApplicationData): OrganizationFormState {
  return {
    legalBusinessName: application.legalBusinessName ?? '',
    tradeName: application.tradeName ?? '',
    businessAddress: application.businessAddress ?? '',
    legalCompanyName: application.legalCompanyName ?? '',
    brandName: application.brandName ?? '',
    headOfficeAddress: application.headOfficeAddress ?? '',
    commercialRegistrationNumber: application.commercialRegistrationNumber ?? '',
    taxRegistrationNumber: application.taxRegistrationNumber ?? '',
    authorizedRepresentativeFullName: application.authorizedRepresentativeFullName ?? '',
    authorizedRepresentativeTitle: application.authorizedRepresentativeTitle ?? '',
    accountOwnerHasRegisteredAuthority: application.accountOwnerHasRegisteredAuthority
  };
}

function hasValues(form: OrganizationFormState): boolean {
  return Object.entries(form).some(([key, value]) => key === 'accountOwnerHasRegisteredAuthority'
    ? value !== undefined
    : typeof value === 'string' && value.trim() !== '');
}

function buildPatch(application: ProviderApplicationData, form: OrganizationFormState, variant: OrganizationVariant): Record<string, unknown> {
  const patch: Record<string, unknown> = { version: application.version };
  const fields: readonly OrganizationField[] = variant === 'business'
    ? ['legalBusinessName', 'tradeName', 'businessAddress', 'commercialRegistrationNumber', 'taxRegistrationNumber', 'authorizedRepresentativeFullName', 'authorizedRepresentativeTitle']
    : ['legalCompanyName', 'brandName', 'headOfficeAddress', 'commercialRegistrationNumber', 'taxRegistrationNumber', 'authorizedRepresentativeFullName', 'authorizedRepresentativeTitle'];
  for (const field of fields) {
    const value = form[field].trim();
    if (value !== '') patch[field] = value;
  }
  if (form.accountOwnerHasRegisteredAuthority !== undefined) {
    patch.accountOwnerHasRegisteredAuthority = form.accountOwnerHasRegisteredAuthority;
  }
  return patch;
}

function isUnauthorized(error: unknown): boolean {
  if (error instanceof ApiClientError) return error.status === 401 || error.status === 403;
  return typeof error === 'object' && error !== null && 'status' in error && ((error as { status?: unknown }).status === 401 || (error as { status?: unknown }).status === 403);
}

function organizationError(error: unknown, copy: ProviderOrganizationCopy): OrganizationUiError {
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
  return { state: 'error', title: copy.unavailableTitle, message: copy.unavailableBody };
}

function FormNotice({ error, copy, onRetry }: { readonly error: OrganizationUiError; readonly copy: ProviderOrganizationCopy; readonly onRetry: () => void }) {
  return <StateMessage state={error.state} title={error.title} message={error.message} retryLabel={copy.retryAction} onRetry={error.state === 'retry' ? onRetry : undefined} />;
}

export function ProviderOrganizationPage({ client, locale, providerType, initialApplication, onBack, onContinue }: ProviderOrganizationPageProps) {
  const copy = getProviderOrganizationCopy(locale);
  const typeCopy = getProviderTypeCopy(locale);
  const variant = organizationVariant(providerType);
  const [application, setApplication] = useState<ProviderApplicationData | undefined>(initialApplication);
  const [form, setForm] = useState<OrganizationFormState>(() => initialApplication === undefined ? emptyForm() : formFromApplication(initialApplication));
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [error, setError] = useState<OrganizationUiError | undefined>();
  const continueAfterSave = useRef(false);

  const loadApplication = useCallback(async () => {
    if (variant === undefined) {
      setLoadState('permission');
      setError({ state: 'permission', title: copy.permissionTitle, message: copy.permissionBody });
      return;
    }
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
      setApplication(initialApplication);
      setForm(formFromApplication(initialApplication));
      setLoadState('ready');
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
      const nextError = organizationError(requestError, copy);
      setLoadState(nextError.state);
      setError(nextError);
    }
  }, [client, copy, initialApplication, providerType, variant]);

  useEffect(() => {
    void loadApplication();
  }, [loadApplication]);

  const patchPreview = useMemo(() => {
    if (application === undefined || variant === undefined) return undefined;
    const patch = buildPatch(application, form, variant);
    return variant === 'business' ? providerBusinessPatchSchema.safeParse(patch) : providerCompanyPatchSchema.safeParse(patch);
  }, [application, form, variant]);

  const save = useCallback(async () => {
    if (application === undefined || variant === undefined) {
      setSaveState('error');
      setError({ state: 'permission', title: copy.permissionTitle, message: copy.permissionBody });
      return;
    }
    if (!hasValues(form) || patchPreview?.success !== true) {
      setSaveState('error');
      setError({ state: 'error', title: copy.invalidFormTitle, message: copy.invalidFormBody });
      return;
    }
    const update = variant === 'business' ? client.updateProviderBusiness : client.updateProviderCompany;
    if (update === undefined) {
      setSaveState('error');
      setError({ state: 'permission', title: copy.permissionTitle, message: copy.permissionBody });
      return;
    }

    setSaveState('loading');
    setError(undefined);
    try {
      const updated = await update(patchPreview.data);
      setApplication(updated);
      setForm(formFromApplication(updated));
      setSaveState('success');
      if (continueAfterSave.current) onContinue?.(updated);
      continueAfterSave.current = false;
    } catch (requestError: unknown) {
      const nextError = organizationError(requestError, copy);
      setSaveState(nextError.state === 'permission' ? 'error' : nextError.state);
      setError(nextError);
    }
  }, [application, client.updateProviderBusiness, client.updateProviderCompany, copy, form, onContinue, patchPreview, variant]);

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    void save();
  }

  function updateField<K extends keyof OrganizationFormState>(key: K, value: OrganizationFormState[K]): void {
    setForm(previous => ({ ...previous, [key]: value }));
    setSaveState('idle');
    if (error?.state === 'error') setError(undefined);
  }

  const screenId = variant === 'business' ? (hasValues(form) ? 'AUTH-10+' : 'AUTH-10') : 'AUTH-11';
  const state = loadState === 'ready' ? saveState : loadState;

  if (loadState === 'loading') {
    return <section className="auth-page provider-organization-page" data-testid="provider-organization-details" data-screen-id="AUTH-10" data-state="loading" dir={locale === 'ar' ? 'rtl' : 'ltr'}><div className="auth-card auth-card--form provider-organization-card"><div className="provider-account-state"><StateMessage state="loading" title={copy.businessTitle} message={copy.businessDescription} /></div></div></section>;
  }

  if (variant === undefined || loadState === 'permission' || loadState === 'error' || loadState === 'retry') {
    return (
      <section className="auth-page provider-organization-page" data-testid="provider-organization-details" data-screen-id={screenId} data-state={loadState} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
        <div className="auth-card auth-card--form provider-organization-card">
          <div className="provider-account-state">
            {error === undefined ? null : <FormNotice error={error} copy={copy} onRetry={() => void loadApplication()} />}
            <Button type="button" variant="ghost" onClick={onBack}>{copy.backAction}</Button>
          </div>
        </div>
      </section>
    );
  }

  const title = variant === 'business' ? copy.businessTitle : copy.companyTitle;
  const description = variant === 'business' ? copy.businessDescription : copy.companyDescription;
  const organizationFields = new Set(application?.missingFields ?? []);
  const inputState = (field: OrganizationField): 'default' | 'error' => saveState === 'error' && form[field].trim() === '' && organizationFields.has(field) ? 'error' : 'default';

  return (
    <section className="auth-page provider-organization-page" data-testid="provider-organization-details" data-screen-id={screenId} data-state={state} data-provider-variant={variant} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <div className="auth-card auth-card--form provider-organization-card">
        <header className="auth-card__heading provider-organization-card__heading">
          <span className="auth-card__icon provider-organization-card__step" aria-hidden="true">3</span>
          <p className="provider-organization-card__step-label">{copy.stepLabel}</p>
          <h1>{title}</h1>
          <p>{description}</p>
          <div className="provider-account-type" role="status"><span>{copy.providerTypeLabel}</span><strong>{typeCopy.options[providerType].title}</strong></div>
        </header>
        <div className="auth-card__body provider-organization-card__body">
          {error === undefined ? null : <FormNotice error={error} copy={copy} onRetry={() => void save()} />}
          {saveState === 'success' ? <StateMessage state="success" title={copy.savedTitle} message={copy.savedBody} /> : null}
          <form className="auth-form provider-organization-form" onSubmit={submit} noValidate>
            <div className="provider-account-progress" aria-label={copy.stepLabel}>
              <span className="provider-account-progress__item provider-account-progress__item--complete">1</span>
              <span className="provider-account-progress__line provider-account-progress__line--complete" aria-hidden="true" />
              <span className="provider-account-progress__item provider-account-progress__item--complete">2</span>
              <span className="provider-account-progress__line provider-account-progress__line--complete" aria-hidden="true" />
              <span className="provider-account-progress__item provider-account-progress__item--active">3</span>
              <span className="provider-account-progress__line" aria-hidden="true" />
              <span className="provider-account-progress__item">4</span>
            </div>
            {variant === 'business' ? (
              <>
                <Input id="provider-business-legal-name" label={copy.legalBusinessNameLabel} name="legalBusinessName" placeholder={copy.legalBusinessNamePlaceholder} value={form.legalBusinessName} onChange={event => updateField('legalBusinessName', event.currentTarget.value)} required={organizationFields.has('legalBusinessName')} state={inputState('legalBusinessName')} />
                <Input id="provider-business-trade-name" label={copy.tradeNameLabel} name="tradeName" placeholder={copy.tradeNamePlaceholder} value={form.tradeName} onChange={event => updateField('tradeName', event.currentTarget.value)} required={organizationFields.has('tradeName')} state={inputState('tradeName')} />
                <Input id="provider-business-address" label={copy.addressLabel} name="businessAddress" placeholder={copy.addressPlaceholder} value={form.businessAddress} onChange={event => updateField('businessAddress', event.currentTarget.value)} required={organizationFields.has('businessAddress')} state={inputState('businessAddress')} />
              </>
            ) : (
              <>
                <Input id="provider-company-legal-name" label={copy.legalCompanyNameLabel} name="legalCompanyName" placeholder={copy.legalCompanyNamePlaceholder} value={form.legalCompanyName} onChange={event => updateField('legalCompanyName', event.currentTarget.value)} required={organizationFields.has('legalCompanyName')} state={inputState('legalCompanyName')} />
                <Input id="provider-company-brand-name" label={copy.brandNameLabel} name="brandName" placeholder={copy.brandNamePlaceholder} value={form.brandName} onChange={event => updateField('brandName', event.currentTarget.value)} required={organizationFields.has('brandName')} state={inputState('brandName')} />
                <Input id="provider-company-address" label={copy.addressLabel} name="headOfficeAddress" placeholder={copy.addressPlaceholder} value={form.headOfficeAddress} onChange={event => updateField('headOfficeAddress', event.currentTarget.value)} required={organizationFields.has('headOfficeAddress')} state={inputState('headOfficeAddress')} />
              </>
            )}
            <div className="provider-organization-grid">
              <Input id="provider-organization-commercial-registration" label={copy.commercialRegistrationNumberLabel} name="commercialRegistrationNumber" placeholder={copy.commercialRegistrationNumberPlaceholder} value={form.commercialRegistrationNumber} onChange={event => updateField('commercialRegistrationNumber', event.currentTarget.value)} required={organizationFields.has('commercialRegistrationNumber')} state={inputState('commercialRegistrationNumber')} />
              <Input id="provider-organization-tax-registration" label={copy.taxRegistrationNumberLabel} name="taxRegistrationNumber" placeholder={copy.taxRegistrationNumberPlaceholder} value={form.taxRegistrationNumber} onChange={event => updateField('taxRegistrationNumber', event.currentTarget.value)} required={organizationFields.has('taxRegistrationNumber')} state={inputState('taxRegistrationNumber')} />
              <Input id="provider-organization-representative" label={copy.authorizedRepresentativeFullNameLabel} name="authorizedRepresentativeFullName" placeholder={copy.authorizedRepresentativeFullNamePlaceholder} value={form.authorizedRepresentativeFullName} onChange={event => updateField('authorizedRepresentativeFullName', event.currentTarget.value)} required={organizationFields.has('authorizedRepresentativeFullName')} state={inputState('authorizedRepresentativeFullName')} />
              <Input id="provider-organization-representative-title" label={copy.authorizedRepresentativeTitleLabel} name="authorizedRepresentativeTitle" placeholder={copy.authorizedRepresentativeTitlePlaceholder} value={form.authorizedRepresentativeTitle} onChange={event => updateField('authorizedRepresentativeTitle', event.currentTarget.value)} required={organizationFields.has('authorizedRepresentativeTitle')} state={inputState('authorizedRepresentativeTitle')} />
            </div>
            <Select
              id="provider-organization-authority"
              label={copy.authorityLabel}
              name="accountOwnerHasRegisteredAuthority"
              value={form.accountOwnerHasRegisteredAuthority === undefined ? '' : String(form.accountOwnerHasRegisteredAuthority)}
              onChange={event => updateField('accountOwnerHasRegisteredAuthority', event.currentTarget.value === '' ? undefined : event.currentTarget.value === 'true')}
              options={[{ value: 'true', label: copy.authorityYes }, { value: 'false', label: copy.authorityNo }]}
              placeholder={copy.authorityPlaceholder}
              required={organizationFields.has('accountOwnerHasRegisteredAuthority')}
              state={saveState === 'error' && organizationFields.has('accountOwnerHasRegisteredAuthority') && form.accountOwnerHasRegisteredAuthority === undefined ? 'error' : 'default'}
            />
            <p className="provider-organization-contract-note">{copy.unsupportedFieldNote}</p>
            <aside className="provider-account-guidance" role="note"><strong>{copy.requirementsTitle}</strong><span>{copy.requirementsBody}</span></aside>
            {(application?.missingFields.length ?? 0) > 0 ? (
              <aside className="provider-account-missing" role="status">
                <strong>{copy.requirementsTitle}</strong>
                <ul>{application?.missingFields.map(field => <li key={field}>{copy.missingFieldLabels[field] ?? field}</li>)}</ul>
              </aside>
            ) : null}
            <div className="provider-account-actions">
              <Button type="submit" variant="secondary" size="lg" loading={saveState === 'loading'} disabled={saveState === 'loading'} onClick={() => { continueAfterSave.current = false; }}>{saveState === 'loading' ? copy.savingAction : copy.saveDraftAction}</Button>
              <Button type="submit" size="lg" loading={saveState === 'loading'} disabled={saveState === 'loading'} onClick={() => { continueAfterSave.current = true; }}>{saveState === 'loading' ? copy.savingAction : copy.saveContinueAction}</Button>
            </div>
          </form>
          <Button type="button" variant="ghost" onClick={onBack}>{copy.backAction}</Button>
        </div>
      </div>
    </section>
  );
}

export { buildPatch, formFromApplication, organizationError };
