import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { AuthSnapshot } from '../auth/index.ts';
import { ApiClientError } from '../contracts/index.ts';
import { Button, Input, StateMessage } from '../design_system/index.ts';
import type { RouteSession } from '../routing/index.ts';
import { ProviderNavigation, type ProviderAuthorizationSource } from '../provider/index.ts';
import { propertyCoreStepSchema, propertyCreateSchema, propertyLocationStepSchema, type PropertyCoreStep, type PropertyData, type PropertyLocationStep, type SupportedLocale } from '@sadat-real-estate/contracts';
import {
  createProviderProperty,
  loadProviderPropertyLocations,
  loadProviderProperty,
  saveProviderPropertyStep,
  type ProviderPropertyCreate,
  type ProviderPropertyLocationOption,
  type ProviderPropertyStep,
  type ProviderPropertyStepInput
} from './data.ts';
import { getProviderPropertyCopy, type ProviderPropertyCopy, type ProviderPropertySourceType, type ProviderPropertyWizardState } from './copy.ts';
import { getProviderPropertyRailLabels, PROVIDER_PROPERTY_RAIL_STEPS } from './steps.ts';
import './styles.css';

export interface ProviderPropertyAuthClient extends ProviderAuthorizationSource {
  readonly getSnapshot: () => AuthSnapshot;
}

export type ProviderPropertyLoadAction = (propertyId: string) => Promise<PropertyData>;
export type ProviderPropertyCreateAction = (input: ProviderPropertyCreate) => Promise<PropertyData>;
export type ProviderPropertySaveAction = (propertyId: string, step: ProviderPropertyStep, input: ProviderPropertyStepInput) => Promise<PropertyData>;
export type ProviderPropertyLocationsLoadAction = (signal?: AbortSignal) => Promise<readonly ProviderPropertyLocationOption[]>;

export interface ProviderPropertyWizardProps {
  readonly locale: SupportedLocale;
  readonly session: RouteSession;
  readonly step: ProviderPropertyStep;
  readonly propertyId?: string | undefined;
  readonly authClient?: ProviderPropertyAuthClient | undefined;
  readonly apiOrigin?: string | undefined;
  readonly initialData?: PropertyData | undefined;
  readonly initialState?: 'loading' | 'retry' | undefined;
  readonly load?: ProviderPropertyLoadAction | undefined;
  readonly create?: ProviderPropertyCreateAction | undefined;
  readonly save?: ProviderPropertySaveAction | undefined;
  readonly loadLocations?: ProviderPropertyLocationsLoadAction | undefined;
}

interface BasicForm {
  readonly name: Record<SupportedLocale, string>;
  readonly slug: string;
  readonly kind: PropertyData['kind'];
  readonly transactionType: PropertyData['transactionType'];
  readonly sourceType: ProviderPropertySourceType | '';
  readonly organizationId: string;
  readonly projectId: string;
  readonly parentPropertyId: string;
  readonly reason: string;
}

interface LocationForm {
  readonly locationId: string;
  readonly mapUrl: string;
  readonly latitude: string;
  readonly longitude: string;
  readonly reason: string;
}

type MutationState = 'idle' | 'saving' | 'success' | 'error' | 'permission';

const LOCALES: readonly SupportedLocale[] = ['ar', 'en',];

function emptyName(): Record<SupportedLocale, string> {
  return { ar: '', en: '',};
}

function emptyBasic(copy: ProviderPropertyCopy): BasicForm {
  return {
    name: emptyName(),
    slug: '',
    kind: 'property',
    transactionType: 'sale',
    sourceType: '',
    organizationId: '',
    projectId: '',
    parentPropertyId: '',
    reason: copy.wizard.placeholders.reason
  };
}

function emptyLocation(copy: ProviderPropertyCopy): LocationForm {
  return { locationId: '', mapUrl: '', latitude: '', longitude: '', reason: copy.wizard.placeholders.reason };
}

function basicFromProperty(property: PropertyData, copy: ProviderPropertyCopy): BasicForm {
  const name = emptyName();
  for (const locale of LOCALES) name[locale] = property.name[locale] ?? '';
  return {
    name,
    slug: property.slug,
    kind: property.kind,
    transactionType: property.transactionType,
    sourceType: property.source.sourceType,
    organizationId: property.source.organizationId ?? '',
    projectId: property.projectId ?? '',
    parentPropertyId: property.parentPropertyId ?? '',
    reason: copy.wizard.placeholders.reason
  };
}

function locationFromProperty(property: PropertyData, copy: ProviderPropertyCopy): LocationForm {
  return {
    locationId: property.locationId ?? '',
    mapUrl: property.mapUrl ?? '',
    latitude: property.coordinates === undefined ? '' : String(property.coordinates.latitude),
    longitude: property.coordinates === undefined ? '' : String(property.coordinates.longitude),
    reason: copy.wizard.placeholders.reason
  };
}

function errorState(error: unknown): Exclude<ProviderPropertyWizardState, 'loading' | 'success'> {
  if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) return 'permission';
  if (error instanceof ApiClientError && error.status === 404) return 'not_found';
  if (error instanceof ApiClientError && (error.code === 'NETWORK_ERROR' || error.code === 'ABORTED')) return 'retry';
  return 'error';
}

function navigationPath(locale: SupportedLocale, path: string): string {
  const url = new URL(path, 'http://sadat-real-estate.local');
  url.searchParams.set('lang', locale);
  return `${url.pathname}${url.search}${url.hash}`;
}

function statusPath(locale: SupportedLocale, propertyId: string, step: ProviderPropertyStep): string {
  return navigationPath(locale, `/provider/properties/${encodeURIComponent(propertyId)}/${step}`);
}

function setBrowserPath(path: string, replace: boolean): void {
  if (typeof window === 'undefined') return;
  if (replace) window.history.replaceState({}, '', path);
  else window.location.assign(path);
}

function textMap(values: Record<SupportedLocale, string>): Record<string, string> {
  return Object.fromEntries(LOCALES.flatMap(locale => {
    const value = values[locale].trim();
    return value === '' ? [] : [[locale, value]];
  }));
}

function StatePanel({ state, copy, onRetry }: { readonly state: Exclude<ProviderPropertyWizardState, 'success'>; readonly copy: ProviderPropertyCopy; readonly onRetry: () => void }) {
  const message = copy.states[state];
  const componentState = state === 'not_found' ? 'error' : state;
  return (
    <section className="provider-property-wizard__state" data-state={state} aria-label={message.title}>
      <StateMessage state={componentState} title={message.title} message={message.body} onRetry={state === 'retry' ? onRetry : undefined} retryLabel={copy.retry} />
      {state === 'error' || state === 'not_found' ? <Button type="button" variant="secondary" size="sm" onClick={onRetry}>{copy.retry}</Button> : null}
    </section>
  );
}

function WizardSteps({ step, locale, copy }: { readonly step: ProviderPropertyStep; readonly locale: SupportedLocale; readonly copy: ProviderPropertyCopy }) {
  const labels = getProviderPropertyRailLabels(locale);
  const currentIndex = PROVIDER_PROPERTY_RAIL_STEPS.indexOf(step);
  return (
    <ol className="provider-property-wizard__steps" aria-label={copy.wizard.eyebrow}>
      {PROVIDER_PROPERTY_RAIL_STEPS.map((item, index) => {
        const complete = index < currentIndex;
        const active = index === currentIndex;
        return (
        <li key={item} aria-current={active ? 'step' : undefined} data-active={active || undefined} data-complete={complete || undefined}>
          <span aria-hidden="true">{complete ? '✓' : index + 1}</span>
          <strong>{labels[item]}</strong>
        </li>
        );
      })}
    </ol>
  );
}

function BasicFormView({
  locale,
  copy,
  form,
  setForm,
  onSubmit,
  mutationState,
  mutationMessage,
  validationError
}: {
  readonly locale: SupportedLocale;
  readonly copy: ProviderPropertyCopy;
  readonly form: BasicForm;
  readonly setForm: (next: BasicForm) => void;
  readonly onSubmit: (event: FormEvent<HTMLFormElement>, continueAfter: boolean) => void;
  readonly mutationState: MutationState;
  readonly mutationMessage: string | undefined;
  readonly validationError: boolean;
}) {
  const wizard = copy.wizard;
  const updateName = (value: string) => setForm({ ...form, name: { ...form.name, [locale]: value } });
  const saving = mutationState === 'saving';
  return (
    <form className="provider-property-wizard__form" onSubmit={event => onSubmit(event, (event.nativeEvent as SubmitEvent).submitter?.getAttribute('value') === 'continue')} noValidate>
      <div className="provider-property-wizard__intro">
        <p className="provider-dashboard__eyebrow">{wizard.eyebrow}</p>
        <h1 id="provider-property-wizard-title">{wizard.basicTitle}</h1>
        <p>{wizard.basicDescription}</p>
      </div>
      <section className="provider-property-wizard__card" aria-labelledby="provider-property-core-title">
        <div className="provider-property-wizard__card-heading"><h2 id="provider-property-core-title">{wizard.basicTitle}</h2><span>{wizard.steps.basic}</span></div>
        <div className="provider-property-wizard__grid">
          <Input id="provider-property-name" label={wizard.labels.name} value={form.name[locale]} placeholder={wizard.placeholders.name} onChange={event => updateName(event.target.value)} aria-invalid={validationError || undefined} required />
          <Input id="provider-property-slug" label={wizard.labels.slug} value={form.slug} placeholder={wizard.placeholders.slug} onChange={event => setForm({ ...form, slug: event.target.value })} aria-invalid={validationError || undefined} required />
          <div className="provider-property-wizard__field"><label htmlFor="provider-property-kind">{wizard.labels.kind}</label><select id="provider-property-kind" value={form.kind} onChange={event => setForm({ ...form, kind: event.target.value as BasicForm['kind'] })}><option value="property">{wizard.kindLabels.property}</option><option value="unit">{wizard.kindLabels.unit}</option></select></div>
          <div className="provider-property-wizard__field"><label htmlFor="provider-property-transaction">{wizard.labels.transaction}</label><select id="provider-property-transaction" value={form.transactionType} onChange={event => setForm({ ...form, transactionType: event.target.value as BasicForm['transactionType'] })}><option value="sale">{wizard.transactionLabels.sale}</option><option value="rent">{wizard.transactionLabels.rent}</option></select></div>
        </div>
      </section>
      <section className="provider-property-wizard__card" aria-labelledby="provider-property-source-title">
        <div className="provider-property-wizard__card-heading"><h2 id="provider-property-source-title">{wizard.labels.sourceType}</h2><span>{wizard.sourceHelp}</span></div>
        <div className="provider-property-wizard__grid">
          <div className="provider-property-wizard__field"><label htmlFor="provider-property-source-type">{wizard.labels.sourceType}</label><select id="provider-property-source-type" value={form.sourceType} onChange={event => setForm({ ...form, sourceType: event.target.value as BasicForm['sourceType'] })} required><option value="">{wizard.unavailable}</option>{(['individual_broker', 'brokerage_office', 'developer_company'] as const).map(value => <option key={value} value={value}>{wizard.sourceTypeLabels[value]}</option>)}</select></div>
          <Input id="provider-property-organization" label={wizard.labels.organizationId} value={form.organizationId} placeholder={wizard.placeholders.organizationId} onChange={event => setForm({ ...form, organizationId: event.target.value })} />
          <Input id="provider-property-project" label={wizard.labels.projectId} value={form.projectId} placeholder={wizard.placeholders.projectId} onChange={event => setForm({ ...form, projectId: event.target.value })} />
          {form.kind === 'unit' ? <Input id="provider-property-parent" label={wizard.labels.parentPropertyId} value={form.parentPropertyId} placeholder={wizard.placeholders.parentPropertyId} onChange={event => setForm({ ...form, parentPropertyId: event.target.value })} /> : null}
        </div>
      </section>
      <section className="provider-property-wizard__contract-note" aria-label={wizard.contractBoundaryTitle}>
        <strong>{wizard.contractBoundaryTitle}</strong><p>{wizard.contractBoundaryBody}</p>
      </section>
      <div className="provider-property-wizard__field provider-property-wizard__reason"><label htmlFor="provider-property-reason">{wizard.labels.reason}</label><textarea id="provider-property-reason" rows={2} value={form.reason} placeholder={wizard.placeholders.reason} onChange={event => setForm({ ...form, reason: event.target.value })} required /></div>
      {validationError ? <p className="provider-property-wizard__form-error" role="alert"><strong>{wizard.validationTitle}</strong> {wizard.validationBody}</p> : null}
      {mutationMessage !== undefined ? <p className={`provider-property-wizard__form-message provider-property-wizard__form-message--${mutationState}`} role={mutationState === 'error' || mutationState === 'permission' ? 'alert' : 'status'}>{mutationMessage}</p> : null}
      <div className="provider-property-wizard__actions"><Button type="submit" name="intent" value="save" disabled={saving}>{saving ? wizard.saving : wizard.saveDraft}</Button><Button type="submit" name="intent" value="continue" variant="secondary" disabled={saving}>{wizard.continue}</Button></div>
    </form>
  );
}

function LocationFormView({
  locale,
  copy,
  form,
  setForm,
  onSubmit,
  onBack,
  mutationState,
  mutationMessage,
  validationError,
  locations,
  locationsState,
  onRetryLocations
}: {
  readonly locale: SupportedLocale;
  readonly copy: ProviderPropertyCopy;
  readonly form: LocationForm;
  readonly setForm: (next: LocationForm) => void;
  readonly onSubmit: (event: FormEvent<HTMLFormElement>, continueAfter: boolean) => void;
  readonly onBack: () => void;
  readonly mutationState: MutationState;
  readonly mutationMessage: string | undefined;
  readonly validationError: boolean;
  readonly locations: readonly ProviderPropertyLocationOption[];
  readonly locationsState: 'loading' | 'success' | 'error';
  readonly onRetryLocations: () => void;
}) {
  const wizard = copy.wizard;
  const saving = mutationState === 'saving';
  const [locationSearch, setLocationSearch] = useState('');
  const normalizedSearch = locationSearch.trim().toLocaleLowerCase(locale);
  const visibleLocations = normalizedSearch === '' ? locations : locations.filter(location => {
    const name = location.name[locale] ?? location.name.ar ?? location.name.en ?? location.slug;
    return `${name} ${location.slug}`.toLocaleLowerCase(locale).includes(normalizedSearch);
  });
  return (
    <form className="provider-property-wizard__form" onSubmit={event => onSubmit(event, (event.nativeEvent as SubmitEvent).submitter?.getAttribute('value') === 'continue')} noValidate>
      <div className="provider-property-wizard__intro"><p className="provider-dashboard__eyebrow">{wizard.eyebrow}</p><h1 id="provider-property-wizard-title">{wizard.locationTitle}</h1><p>{wizard.locationDescription}</p></div>
      <section className="provider-property-wizard__card" aria-labelledby="provider-property-location-title">
        <div className="provider-property-wizard__card-heading"><h2 id="provider-property-location-title">{wizard.locationTitle}</h2><span>{wizard.steps.location}</span></div>
        <div className="provider-property-wizard__grid">
          <div className="provider-property-wizard__field provider-property-wizard__location-picker">
            <label htmlFor="provider-property-location-search">{wizard.locationSearchLabel}</label>
            <input id="provider-property-location-search" type="search" value={locationSearch} placeholder={wizard.locationSearchPlaceholder} onChange={event => setLocationSearch(event.target.value)} />
            <label htmlFor="provider-property-location-id">{wizard.labels.locationId}</label>
            {locationsState === 'error' ? <input id="provider-property-location-id" value={form.locationId} placeholder={wizard.placeholders.locationId} onChange={event => setForm({ ...form, locationId: event.target.value })} aria-invalid={validationError || undefined} /> : <select id="provider-property-location-id" value={form.locationId} onChange={event => setForm({ ...form, locationId: event.target.value })} aria-invalid={validationError || undefined} disabled={locationsState !== 'success'}>
              <option value="">{locationsState === 'loading' ? wizard.locationCatalogLoading : wizard.locationSelectPlaceholder}</option>
              {visibleLocations.map(location => <option key={location.id} value={location.id}>{location.name[locale] ?? location.name.ar ?? location.name.en ?? location.slug}</option>)}
            </select>}
            {locationsState === 'error' ? <button type="button" className="provider-property-wizard__catalog-retry" onClick={onRetryLocations}>{copy.retry}</button> : null}
          </div>
          <Input id="provider-property-map-url" label={wizard.labels.mapUrl} value={form.mapUrl} placeholder={wizard.placeholders.mapUrl} onChange={event => setForm({ ...form, mapUrl: event.target.value })} type="url" inputMode="url" aria-invalid={validationError || undefined} />
          <Input id="provider-property-latitude" label={wizard.labels.latitude} value={form.latitude} placeholder={wizard.placeholders.latitude} inputMode="decimal" onChange={event => setForm({ ...form, latitude: event.target.value })} aria-invalid={validationError || undefined} />
          <Input id="provider-property-longitude" label={wizard.labels.longitude} value={form.longitude} placeholder={wizard.placeholders.longitude} inputMode="decimal" onChange={event => setForm({ ...form, longitude: event.target.value })} aria-invalid={validationError || undefined} />
        </div>
        <p className="provider-property-wizard__help">{wizard.coordinateHelp}</p>
        {locationsState === 'success' && locations.length === 0 ? <div className="provider-property-wizard__location-placeholder" role="status"><strong>{wizard.locationCatalogEmptyTitle}</strong><p>{wizard.locationCatalogEmptyBody}</p></div> : null}
        {locationsState === 'error' ? <div className="provider-property-wizard__location-placeholder" role="status"><strong>{wizard.locationCatalogUnavailableTitle}</strong><p>{wizard.locationCatalogUnavailableBody}</p></div> : null}
      </section>
      <section className="provider-property-wizard__contract-note" aria-label={wizard.contractBoundaryTitle}><strong>{wizard.contractBoundaryTitle}</strong><p>{wizard.contractBoundaryBody}</p></section>
      <div className="provider-property-wizard__field provider-property-wizard__reason"><label htmlFor="provider-property-reason">{wizard.labels.reason}</label><textarea id="provider-property-reason" rows={2} value={form.reason} placeholder={wizard.placeholders.reason} onChange={event => setForm({ ...form, reason: event.target.value })} required /></div>
      {validationError ? <p className="provider-property-wizard__form-error" role="alert"><strong>{wizard.validationTitle}</strong> {wizard.validationBody}</p> : null}
      {mutationMessage !== undefined ? <p className={`provider-property-wizard__form-message provider-property-wizard__form-message--${mutationState}`} role={mutationState === 'error' || mutationState === 'permission' ? 'alert' : 'status'}>{mutationMessage}</p> : null}
      <div className="provider-property-wizard__actions"><Button type="button" variant="secondary" disabled={saving} onClick={onBack}>{wizard.back}</Button><Button type="submit" name="intent" value="save" disabled={saving}>{saving ? wizard.saving : wizard.saveDraft}</Button><Button type="submit" name="intent" value="continue" variant="secondary" disabled={saving}>{wizard.continue}</Button></div>
    </form>
  );
}

export function ProviderPropertyWizard({ locale, session, step, propertyId, authClient, apiOrigin, initialData, initialState = 'loading', load, create, save, loadLocations }: ProviderPropertyWizardProps) {
  const copy = getProviderPropertyCopy(locale);
  const isNew = propertyId === undefined;
  const [state, setState] = useState<ProviderPropertyWizardState>(() => isNew ? 'success' : initialData === undefined ? initialState : 'success');
  const [property, setProperty] = useState<PropertyData | undefined>(initialData);
  const [basic, setBasic] = useState<BasicForm>(() => initialData === undefined ? emptyBasic(copy) : basicFromProperty(initialData, copy));
  const [location, setLocation] = useState<LocationForm>(() => initialData === undefined ? emptyLocation(copy) : locationFromProperty(initialData, copy));
  const [attempt, setAttempt] = useState(0);
  const [mutationState, setMutationState] = useState<MutationState>('idle');
  const [mutationMessage, setMutationMessage] = useState<string | undefined>();
  const [validationError, setValidationError] = useState(false);
  const [locations, setLocations] = useState<readonly ProviderPropertyLocationOption[]>([]);
  const [locationsState, setLocationsState] = useState<'loading' | 'success' | 'error'>('loading');
  const [locationsAttempt, setLocationsAttempt] = useState(0);

  const loadAction = useMemo(() => load ?? ((id: string) => loadProviderProperty({ propertyId: id, apiOrigin, authorization: authClient })), [apiOrigin, authClient, load]);
  const createAction = useMemo(() => create ?? ((input: ProviderPropertyCreate) => createProviderProperty(input, { apiOrigin, authorization: authClient })), [apiOrigin, authClient, create]);
  const saveAction = useMemo(() => save ?? ((id: string, currentStep: ProviderPropertyStep, input: ProviderPropertyStepInput) => saveProviderPropertyStep(input, { propertyId: id, step: currentStep, apiOrigin, authorization: authClient })), [apiOrigin, authClient, save]);
  const locationsAction = useMemo(() => loadLocations ?? ((signal?: AbortSignal) => loadProviderPropertyLocations({ apiOrigin, ...(signal === undefined ? {} : { signal }) })), [apiOrigin, loadLocations]);
  const sessionRole = session.status === 'authenticated' ? session.role : undefined;

  useEffect(() => {
    if (session.status !== 'authenticated' || sessionRole !== 'provider') {
      setState('permission');
      return undefined;
    }
    if (isNew) {
      setState('success');
      return undefined;
    }
    if (initialData !== undefined && attempt === 0) {
      setProperty(initialData);
      setBasic(basicFromProperty(initialData, copy));
      setLocation(locationFromProperty(initialData, copy));
      setState('success');
      return undefined;
    }
    if (propertyId === undefined) return undefined;
    const controller = new AbortController();
    setState('loading');
    void loadAction(propertyId).then(next => {
      if (controller.signal.aborted) return;
      setProperty(next);
      setBasic(basicFromProperty(next, copy));
      setLocation(locationFromProperty(next, copy));
      setState('success');
    }).catch(error => {
      if (controller.signal.aborted) return;
      setState(errorState(error));
    });
    return () => controller.abort();
  }, [attempt, copy, initialData, isNew, loadAction, propertyId, session.status, sessionRole]);

  useEffect(() => {
    if (step !== 'location' || state !== 'success' || session.status !== 'authenticated' || sessionRole !== 'provider') return undefined;
    const controller = new AbortController();
    setLocationsState('loading');
    void locationsAction(controller.signal).then(items => {
      if (controller.signal.aborted) return;
      setLocations(items);
      setLocationsState('success');
    }).catch(() => {
      if (!controller.signal.aborted) setLocationsState('error');
    });
    return () => controller.abort();
  }, [locationsAction, locationsAttempt, session.status, sessionRole, state, step]);

  const onRetry = () => setAttempt(value => value + 1);
  const mutationFailure = (error: unknown) => {
    if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) {
      setMutationState('permission');
      setMutationMessage(copy.states.permission.body);
      return;
    }
    setMutationState('error');
    setMutationMessage(copy.wizard.mutationError);
  };

  const onBasicSubmit = async (event: FormEvent<HTMLFormElement>, continueAfter: boolean) => {
    event.preventDefault();
    setValidationError(false);
    setMutationMessage(undefined);
    const providerId = authClient?.getSnapshot().user?.id;
    const name = textMap(basic.name);
    const source = {
      providerId,
      sourceType: basic.sourceType,
      ...(basic.organizationId.trim() === '' ? {} : { organizationId: basic.organizationId.trim() })
    };
    const common = {
      kind: basic.kind,
      name,
      slug: basic.slug.trim().toLowerCase(),
      transactionType: basic.transactionType,
      ...(basic.projectId.trim() === '' ? {} : { projectId: basic.projectId.trim() }),
      ...(basic.parentPropertyId.trim() === '' ? {} : { parentPropertyId: basic.parentPropertyId.trim() })
    };
    const parsed = isNew
      ? propertyCreateSchema.safeParse({ ...common, source, reason: basic.reason.trim() })
      : propertyCoreStepSchema.safeParse({ version: property?.version ?? 0, ...common, reason: basic.reason.trim() });
    if (!parsed.success || (isNew && providerId === undefined)) {
      setValidationError(true);
      return;
    }
    setMutationState('saving');
    try {
      const next = isNew ? await createAction(parsed.data as ProviderPropertyCreate) : await saveAction(propertyId!, 'basic', parsed.data as PropertyCoreStep);
      setProperty(next);
      setBasic(basicFromProperty(next, copy));
      setLocation(locationFromProperty(next, copy));
      setMutationState('success');
      setMutationMessage(copy.wizard.saved);
      if (continueAfter) setBrowserPath(statusPath(locale, next.id, 'location'), false);
      else setBrowserPath(statusPath(locale, next.id, 'basic'), true);
    } catch (error) {
      mutationFailure(error);
    }
  };

  const onLocationSubmit = async (event: FormEvent<HTMLFormElement>, continueAfter: boolean) => {
    event.preventDefault();
    setValidationError(false);
    setMutationMessage(undefined);
    if (propertyId === undefined || property === undefined) {
      setState('not_found');
      return;
    }
    const hasLatitude = location.latitude.trim() !== '';
    const hasLongitude = location.longitude.trim() !== '';
    const coordinates = hasLatitude && hasLongitude ? { latitude: Number(location.latitude), longitude: Number(location.longitude) } : undefined;
    const parsed = propertyLocationStepSchema.safeParse({
      version: property.version,
      ...(location.locationId.trim() === '' ? {} : { locationId: location.locationId.trim().toLowerCase() }),
      ...(location.mapUrl.trim() === '' ? {} : { mapUrl: location.mapUrl.trim() }),
      ...(coordinates === undefined ? {} : { coordinates }),
      reason: location.reason.trim()
    });
    if (!parsed.success || hasLatitude !== hasLongitude) {
      setValidationError(true);
      return;
    }
    setMutationState('saving');
    try {
      const next = await saveAction(propertyId, 'location', parsed.data as PropertyLocationStep);
      setProperty(next);
      setLocation(locationFromProperty(next, copy));
      setMutationState('success');
      setMutationMessage(copy.wizard.saved);
      if (continueAfter) setBrowserPath(navigationPath(locale, `/provider/properties/${encodeURIComponent(next.id)}/details`), false);
    } catch (error) {
      mutationFailure(error);
    }
  };

  const path = typeof window === 'undefined' ? '/provider/properties' : '/provider/properties';
  return (
    <section className="provider-dashboard provider-property-wizard" data-screen-id={step === 'basic' ? 'PRV-03' : 'PRV-04'} data-route={step === 'basic' ? '/provider/properties/new/basic' : `/provider/properties/${propertyId === undefined ? '' : encodeURIComponent(propertyId)}/location`} data-device-scope="desktop">
      <ProviderNavigation locale={locale} activePath={path} authClient={authClient} />
      <div className="provider-dashboard__content provider-property-wizard__content">
        <WizardSteps step={step} locale={locale} copy={copy} />
        {state !== 'success' ? <StatePanel state={state} copy={copy} onRetry={onRetry} /> : null}
        {state === 'success' ? (
          step === 'basic' ? <BasicFormView locale={locale} copy={copy} form={basic} setForm={setBasic} onSubmit={onBasicSubmit} mutationState={mutationState} mutationMessage={mutationMessage} validationError={validationError} /> : <LocationFormView locale={locale} copy={copy} form={location} setForm={setLocation} onSubmit={onLocationSubmit} onBack={() => { if (propertyId !== undefined) setBrowserPath(statusPath(locale, propertyId, 'basic'), false); }} mutationState={mutationState} mutationMessage={mutationMessage} validationError={validationError} locations={locations} locationsState={locationsState} onRetryLocations={() => setLocationsAttempt(value => value + 1)} />
        ) : null}
      </div>
    </section>
  );
}
