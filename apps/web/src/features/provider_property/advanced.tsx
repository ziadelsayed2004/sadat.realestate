import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  propertyDetailsStepSchema,
  propertyFeaturesServicesStepSchema,
  propertyPricingStepSchema,
  type PropertyData,
  type PublicPropertyAmenity,
  type ProviderCommissionProjection,
  type SupportedLocale
} from '@sadat-real-estate/contracts';
import { ApiClientError } from '../contracts/index.ts';
import { Button, Input, StateMessage } from '../design_system/index.ts';
import type { RouteSession } from '../routing/index.ts';
import { ProviderNavigation } from '../provider/index.ts';
import { loadProviderCommission } from '../provider/advertising-data.ts';
import type { ProviderPropertyAuthClient, ProviderPropertyLoadAction, ProviderPropertySaveAction } from './wizard.tsx';
import { loadProviderProperty, loadProviderPropertyTypes, loadProviderPropertyAmenities, saveProviderPropertyStep, type ProviderPropertyStep, type ProviderPropertyTypeOption } from './data.ts';
import { getProviderPropertyCopy, type ProviderPropertyCopy, type ProviderPropertyWizardState } from './copy.ts';
import { getProviderPropertyAdvancedCopy, type ProviderPropertyAdvancedCopy, type ProviderPropertyAdvancedStep } from './steps-copy.ts';
import { getProviderPropertyRailLabels, PROVIDER_PROPERTY_RAIL_STEPS } from './steps.ts';
import './styles.css';

export interface ProviderPropertyAdvancedWizardProps {
  readonly locale: SupportedLocale;
  readonly session: RouteSession;
  readonly step: ProviderPropertyAdvancedStep;
  readonly propertyId: string;
  readonly authClient?: ProviderPropertyAuthClient | undefined;
  readonly apiOrigin?: string | undefined;
  readonly initialData?: PropertyData | undefined;
  readonly load?: ProviderPropertyLoadAction | undefined;
  readonly save?: ProviderPropertySaveAction | undefined;
  readonly loadPropertyTypes?: (signal?: AbortSignal) => Promise<readonly ProviderPropertyTypeOption[]>;
  readonly loadCommission?: (signal?: AbortSignal) => Promise<ProviderCommissionProjection>;
  readonly loadAmenities?: (signal?: AbortSignal) => Promise<readonly PublicPropertyAmenity[]>;
}

interface DetailsForm {
  readonly description: Record<SupportedLocale, string>;
  readonly propertyTypeId: string;
  readonly deliveryStatus: PropertyData['deliveryStatus'] | '';
  readonly area: string;
  readonly bedrooms: string;
  readonly bathrooms: string;
  readonly floor: string;
  readonly totalFloors: string;
  readonly reason: string;
}

interface PricingForm {
  readonly amount: string;
  readonly currency: string;
  readonly planEnabled: boolean;
  readonly planName: Record<SupportedLocale, string>;
  readonly installments: string;
  readonly frequency: 'monthly' | 'quarterly' | 'annually';
  readonly downPaymentAmount: string;
  readonly installmentAmount: string;
  readonly reason: string;
}

interface FeaturesForm {
  readonly featureIds: readonly string[];
  readonly serviceIds: readonly string[];
  readonly reason: string;
}

type AdvancedForm = DetailsForm | PricingForm | FeaturesForm;
type MutationState = 'idle' | 'saving' | 'success' | 'error' | 'permission';

const LOCALES: readonly SupportedLocale[] = ['ar', 'en',];

function emptyLocalized(): Record<SupportedLocale, string> {
  return { ar: '', en: '',};
}

function textMap(values: Record<SupportedLocale, string>): Record<string, string> {
  return Object.fromEntries(LOCALES.flatMap(locale => {
    const value = values[locale].trim();
    return value === '' ? [] : [[locale, value]];
  }));
}

function numberValue(value: string): number | undefined {
  if (value.trim() === '') return undefined;
  return Number(value);
}

function detailsForm(property: PropertyData | undefined, copy: ProviderPropertyCopy): DetailsForm {
  const description = emptyLocalized();
  if (property?.description !== undefined) {
    for (const locale of LOCALES) description[locale] = property.description[locale] ?? '';
  }
  return {
    description,
    propertyTypeId: property?.propertyTypeId ?? '',
    deliveryStatus: property?.deliveryStatus ?? '',
    area: property?.area === undefined ? '' : String(property.area.value),
    bedrooms: property?.layout?.bedrooms === undefined ? '' : String(property.layout.bedrooms),
    bathrooms: property?.layout?.bathrooms === undefined ? '' : String(property.layout.bathrooms),
    floor: property?.layout?.floor === undefined ? '' : String(property.layout.floor),
    totalFloors: property?.layout?.totalFloors === undefined ? '' : String(property.layout.totalFloors),
    reason: copy.wizard.placeholders.reason
  };
}

function pricingForm(property: PropertyData | undefined, copy: ProviderPropertyCopy): PricingForm {
  const plan = property?.paymentPlans?.[0];
  const planName = emptyLocalized();
  if (plan !== undefined) {
    for (const locale of LOCALES) planName[locale] = plan.name[locale] ?? '';
  }
  return {
    amount: property?.price === undefined ? '' : String(property.price.amount),
    currency: property?.price?.currency ?? 'EGP',
    planEnabled: plan !== undefined,
    planName,
    installments: plan === undefined ? '' : String(plan.installments),
    frequency: plan?.frequency ?? 'monthly',
    downPaymentAmount: plan?.downPayment === undefined ? '' : String(plan.downPayment.amount),
    installmentAmount: plan === undefined ? '' : String(plan.installmentAmount.amount),
    reason: copy.wizard.placeholders.reason
  };
}

function featuresForm(property: PropertyData | undefined, copy: ProviderPropertyCopy): FeaturesForm {
  return {
    featureIds: property?.featureIds ?? [],
    serviceIds: property?.serviceIds ?? [],
    reason: copy.wizard.placeholders.reason
  };
}

function formForStep(step: ProviderPropertyAdvancedStep, property: PropertyData | undefined, copy: ProviderPropertyCopy): AdvancedForm {
  if (step === 'details') return detailsForm(property, copy);
  if (step === 'price-payment') return pricingForm(property, copy);
  return featuresForm(property, copy);
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

function setBrowserPath(path: string): void {
  if (typeof window !== 'undefined') window.location.assign(path);
}

function routeSegment(step: ProviderPropertyStep): string {
  return step === 'features-services' ? 'features' : step;
}

function stepPath(locale: SupportedLocale, propertyId: string, step: ProviderPropertyStep): string {
  return navigationPath(locale, `/provider/properties/${encodeURIComponent(propertyId)}/${routeSegment(step)}`);
}

function screenId(step: ProviderPropertyAdvancedStep): string {
  return step === 'details' ? 'PRV-05' : step === 'price-payment' ? 'PRV-06' : 'PRV-07';
}

function stateForStep(): ProviderPropertyWizardState {
  return 'loading';
}

function WizardSteps({ step, locale, copy }: { readonly step: ProviderPropertyAdvancedStep; readonly locale: SupportedLocale; readonly copy: ProviderPropertyCopy }) {
  const currentIndex = PROVIDER_PROPERTY_RAIL_STEPS.indexOf(step);
  const labels = getProviderPropertyRailLabels(locale);
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

function StatePanel({ state, copy, onRetry }: { readonly state: Exclude<ProviderPropertyWizardState, 'success'>; readonly copy: ProviderPropertyCopy; readonly onRetry: () => void }) {
  const message = copy.states[state];
  const componentState = state === 'not_found' ? 'error' : state;
  return (
    <section className="provider-property-wizard__state" data-state={state} aria-label={message.title}>
      <StateMessage state={componentState} loadingVariant="form" title={message.title} message={message.body} onRetry={state === 'retry' ? onRetry : undefined} retryLabel={copy.retry} />
      {state === 'error' || state === 'not_found' ? <Button type="button" variant="secondary" size="sm" onClick={onRetry}>{copy.retry}</Button> : null}
    </section>
  );
}

function DetailsFormView({ locale, copy, advancedCopy, form, setForm, onSubmit, mutationState, mutationMessage, validationError, propertyTypes, propertyTypesState, onRetryPropertyTypes, validationFields, validationMessage }: {
  readonly locale: SupportedLocale;
  readonly copy: ProviderPropertyCopy;
  readonly advancedCopy: ProviderPropertyAdvancedCopy;
  readonly form: DetailsForm;
  readonly setForm: (next: DetailsForm) => void;
  readonly onSubmit: (event: FormEvent<HTMLFormElement>, continueAfter: boolean) => void;
  readonly mutationState: MutationState;
  readonly mutationMessage: string | undefined;
  readonly validationError: boolean;
  readonly validationFields: readonly string[];
  readonly validationMessage: string | undefined;
  readonly propertyTypes: readonly ProviderPropertyTypeOption[];
  readonly propertyTypesState: 'loading' | 'success' | 'error';
  readonly onRetryPropertyTypes: () => void;
}) {
  const saving = mutationState === 'saving';
  const invalid = (field: string) => validationFields.includes(field) || undefined;
  const updateDescription = (value: string) => setForm({ ...form, description: { ...form.description, [locale]: value } });
  return (
    <form className="provider-property-wizard__form" data-form-step="details" onSubmit={event => onSubmit(event, (event.nativeEvent as SubmitEvent).submitter?.getAttribute('value') === 'continue')} noValidate>
      <div className="provider-property-wizard__intro"><p className="provider-dashboard__eyebrow">{copy.wizard.eyebrow}</p><h1 id="provider-property-wizard-title">{copy.wizard.createTitle}</h1><p>{copy.wizard.createDescription}</p></div>
      <WizardSteps step="details" locale={locale} copy={copy} />
      <section className="provider-property-wizard__card" aria-labelledby="provider-property-details-title">
        <div className="provider-property-wizard__card-heading"><h2 id="provider-property-details-title">{advancedCopy.titles.details}</h2><span>{advancedCopy.steps.details}</span></div>
        <div className="provider-property-wizard__field"><label htmlFor="provider-property-description">{advancedCopy.labels.description}</label><textarea id="provider-property-description" rows={5} value={form.description[locale]} placeholder={advancedCopy.placeholders.description} onChange={event => updateDescription(event.target.value)} aria-invalid={invalid('description')} /></div>
        <div className="provider-property-wizard__grid provider-property-wizard__grid--details">
          <Input id="provider-property-area" type="number" min="0" step="0.01" label={advancedCopy.labels.area} value={form.area} placeholder={advancedCopy.placeholders.area} onChange={event => setForm({ ...form, area: event.target.value })} aria-invalid={invalid('area')} />
          <Input id="provider-property-bedrooms" type="number" min="0" step="1" label={advancedCopy.labels.bedrooms} value={form.bedrooms} placeholder={advancedCopy.placeholders.bedrooms} onChange={event => setForm({ ...form, bedrooms: event.target.value })} aria-invalid={invalid('bedrooms')} />
          <Input id="provider-property-bathrooms" type="number" min="0" step="1" label={advancedCopy.labels.bathrooms} value={form.bathrooms} placeholder={advancedCopy.placeholders.bathrooms} onChange={event => setForm({ ...form, bathrooms: event.target.value })} aria-invalid={invalid('bathrooms')} />
          <Input id="provider-property-floor" type="number" min="0" step="1" label={advancedCopy.labels.floor} value={form.floor} placeholder={advancedCopy.placeholders.floor} onChange={event => setForm({ ...form, floor: event.target.value })} aria-invalid={invalid('floor')} />
          <Input id="provider-property-total-floors" type="number" min="1" step="1" label={advancedCopy.labels.totalFloors} value={form.totalFloors} placeholder={advancedCopy.placeholders.totalFloors} onChange={event => setForm({ ...form, totalFloors: event.target.value })} aria-invalid={invalid('totalFloors')} />
          <div className="provider-property-wizard__field">
            <label htmlFor="provider-property-type-id">{advancedCopy.labels.propertyTypeId}</label>
            <select id="provider-property-type-id" value={form.propertyTypeId} onChange={event => setForm({ ...form, propertyTypeId: event.target.value })} aria-invalid={invalid('propertyTypeId')} disabled={propertyTypesState !== 'success'}>
              <option value="">{propertyTypesState === 'loading' ? advancedCopy.propertyTypeCatalogLoading : advancedCopy.propertyTypeSelectPlaceholder}</option>
              {form.propertyTypeId && !propertyTypes.some(type => type.id === form.propertyTypeId) ? <option value={form.propertyTypeId}>{locale === 'ar' ? 'النوع المحفوظ غير متاح حاليًا' : 'Saved property type currently unavailable'}</option> : null}
              {propertyTypes.map(type => <option key={type.id} value={type.id}>{type.name[locale] ?? type.name.ar ?? type.name.en ?? type.slug}</option>)}
            </select>
            {propertyTypesState === 'error' ? <button type="button" className="provider-property-wizard__catalog-retry" onClick={onRetryPropertyTypes}>{copy.retry}</button> : null}
          </div>
          <div className="provider-property-wizard__field"><label htmlFor="provider-property-delivery-status">{advancedCopy.labels.deliveryStatus}</label><select id="provider-property-delivery-status" value={form.deliveryStatus} onChange={event => setForm({ ...form, deliveryStatus: event.target.value as DetailsForm['deliveryStatus'] })}><option value="">{copy.wizard.unavailable}</option><option value="ready_to_move">{locale === 'ar' ? 'جاهز للسكن' : 'Ready to move'}</option><option value="under_construction">{locale === 'ar' ? 'تحت الإنشاء' : 'Under construction'}</option><option value="future_delivery">{locale === 'ar' ? 'تسليم مستقبلي' : 'Future delivery'}</option></select></div>
        </div>
        {propertyTypesState === 'success' && propertyTypes.length === 0 ? <div className="provider-property-wizard__location-placeholder" role="status"><strong>{advancedCopy.propertyTypeCatalogEmptyTitle}</strong><p>{advancedCopy.propertyTypeCatalogEmptyBody}</p></div> : null}
        {propertyTypesState === 'error' ? <div className="provider-property-wizard__location-placeholder" role="status"><strong>{advancedCopy.propertyTypeCatalogUnavailableTitle}</strong><p>{advancedCopy.propertyTypeCatalogUnavailableBody}</p></div> : null}
      </section>
      <ReasonAndMessage copy={copy} formReason={form.reason} onReasonChange={reason => setForm({ ...form, reason })} mutationState={mutationState} mutationMessage={mutationMessage} validationError={validationError} validationBody={validationMessage} />
      <WizardActions copy={copy} saving={saving} showBack={false} />
    </form>
  );
}

function PricingFormView({ locale, copy, advancedCopy, form, setForm, onSubmit, mutationState, mutationMessage, validationError, commission, commissionState, onRetryCommission }: {
  readonly locale: SupportedLocale;
  readonly copy: ProviderPropertyCopy;
  readonly advancedCopy: ProviderPropertyAdvancedCopy;
  readonly form: PricingForm;
  readonly setForm: (next: PricingForm) => void;
  readonly onSubmit: (event: FormEvent<HTMLFormElement>, continueAfter: boolean) => void;
  readonly mutationState: MutationState;
  readonly mutationMessage: string | undefined;
  readonly validationError: boolean;
  readonly commission: ProviderCommissionProjection | undefined;
  readonly commissionState: 'loading' | 'success' | 'error';
  readonly onRetryCommission: () => void;
}) {
  const saving = mutationState === 'saving';
  const updatePlanName = (value: string) => setForm({ ...form, planName: { ...form.planName, [locale]: value } });
  return (
    <form className="provider-property-wizard__form" data-form-step="price-payment" onSubmit={event => onSubmit(event, (event.nativeEvent as SubmitEvent).submitter?.getAttribute('value') === 'continue')} noValidate>
      <div className="provider-property-wizard__intro"><p className="provider-dashboard__eyebrow">{copy.wizard.eyebrow}</p><h1 id="provider-property-wizard-title">{copy.wizard.createTitle}</h1><p>{copy.wizard.createDescription}</p></div>
      <WizardSteps step="price-payment" locale={locale} copy={copy} />
      <section className="provider-property-wizard__card" aria-labelledby="provider-property-pricing-title">
        <div className="provider-property-wizard__card-heading"><h2 id="provider-property-pricing-title">{advancedCopy.titles['price-payment']}</h2><span>{advancedCopy.steps['price-payment']}</span></div>
        <div className="provider-property-wizard__grid">
          <Input id="provider-property-price" type="number" min="0" step="0.01" label={advancedCopy.labels.priceAmount} value={form.amount} placeholder={advancedCopy.placeholders.priceAmount} onChange={event => setForm({ ...form, amount: event.target.value })} aria-invalid={validationError || undefined} required />
          <Input id="provider-property-currency" label={advancedCopy.labels.currency} value={form.currency} placeholder={advancedCopy.placeholders.currency} maxLength={3} onChange={event => setForm({ ...form, currency: event.target.value.toUpperCase() })} aria-invalid={validationError || undefined} required />
        </div>
        <label className="provider-property-wizard__toggle" htmlFor="provider-property-payment-plan"><input id="provider-property-payment-plan" type="checkbox" checked={form.planEnabled} onChange={event => setForm({ ...form, planEnabled: event.target.checked })} /> <span>{advancedCopy.labels.paymentPlan}</span></label>
        <p className="provider-property-wizard__help">{advancedCopy.paymentPlanHelp}</p>
        {form.planEnabled ? <section className="provider-property-wizard__nested-card" aria-labelledby="provider-property-payment-plan-title">
          <h3 id="provider-property-payment-plan-title">{advancedCopy.labels.paymentPlan}</h3>
          <div className="provider-property-wizard__grid">
            <Input id="provider-property-plan-name" label={advancedCopy.labels.planName} value={form.planName[locale]} placeholder={advancedCopy.placeholders.planName} onChange={event => updatePlanName(event.target.value)} aria-invalid={validationError || undefined} required />
            <Input id="provider-property-installments" type="number" min="1" step="1" label={advancedCopy.labels.installments} value={form.installments} placeholder={advancedCopy.placeholders.installments} onChange={event => setForm({ ...form, installments: event.target.value })} aria-invalid={validationError || undefined} required />
            <div className="provider-property-wizard__field"><label htmlFor="provider-property-frequency">{advancedCopy.labels.frequency}</label><select id="provider-property-frequency" value={form.frequency} onChange={event => setForm({ ...form, frequency: event.target.value as PricingForm['frequency'] })}><option value="monthly">{advancedCopy.frequencyLabels.monthly}</option><option value="quarterly">{advancedCopy.frequencyLabels.quarterly}</option><option value="annually">{advancedCopy.frequencyLabels.annually}</option></select></div>
            <Input id="provider-property-down-payment" type="number" min="0" step="0.01" label={advancedCopy.labels.downPaymentAmount} value={form.downPaymentAmount} placeholder={advancedCopy.placeholders.downPaymentAmount} onChange={event => setForm({ ...form, downPaymentAmount: event.target.value })} aria-invalid={validationError || undefined} />
            <Input id="provider-property-installment-amount" type="number" min="0" step="0.01" label={advancedCopy.labels.installmentAmount} value={form.installmentAmount} placeholder={advancedCopy.placeholders.installmentAmount} onChange={event => setForm({ ...form, installmentAmount: event.target.value })} aria-invalid={validationError || undefined} required />
          </div>
        </section> : null}
      </section>
      <section className="provider-property-wizard__commission" role="region" data-state={commissionState} aria-label={advancedCopy.commissionTitle} aria-labelledby="provider-property-commission-title">
        <h2 id="provider-property-commission-title">{advancedCopy.commissionTitle}</h2>
        {commissionState === 'loading' ? <p role="status">{advancedCopy.commissionLoading}</p> : null}
        {commissionState === 'error' ? <div><p role="alert">{advancedCopy.commissionError}</p><button type="button" className="provider-property-wizard__catalog-retry" onClick={onRetryCommission}>{copy.retry}</button></div> : null}
        {commissionState === 'success' && commission?.source === 'none' ? <p>{advancedCopy.commissionNone}</p> : null}
        {commissionState === 'success' && commission !== undefined && commission.source !== 'none' ? <dl>
          <div><dt>{advancedCopy.commissionSource}</dt><dd>{advancedCopy.commissionSources[commission.source]}</dd></div>
          <div><dt>{advancedCopy.commissionKind}</dt><dd>{commission.kind === undefined ? '—' : advancedCopy.commissionKinds[commission.kind]}</dd></div>
          <div><dt>{advancedCopy.commissionValue}</dt><dd>{commission.kind === 'percentage' ? `${(commission.percentageBps ?? 0) / 100}%` : commission.kind === 'fixed' ? new Intl.NumberFormat(locale, { style: 'currency', currency: commission.currency ?? 'EGP' }).format((commission.fixedAmountMinor ?? 0) / 100) : advancedCopy.commissionExempt}</dd></div>
          <div><dt>{advancedCopy.commissionEffective}</dt><dd><time dateTime={commission.effectiveAt}>{new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(commission.effectiveAt))}</time></dd></div>
          <div><dt>{advancedCopy.commissionVersion}</dt><dd>{commission.policyVersion ?? '—'}</dd></div>
        </dl> : null}
        <p className="provider-property-wizard__help">{advancedCopy.commissionBoundaryBody}</p>
      </section>
      <ReasonAndMessage copy={copy} formReason={form.reason} onReasonChange={reason => setForm({ ...form, reason })} mutationState={mutationState} mutationMessage={mutationMessage} validationError={validationError} />
      <WizardActions copy={copy} saving={saving} showBack={false} />
    </form>
  );
}

function FeaturesFormView({ locale, copy, advancedCopy, form, setForm, onSubmit, mutationState, mutationMessage, validationError, amenities, catalogState, onRetryCatalog }: {
  readonly locale: SupportedLocale;
  readonly copy: ProviderPropertyCopy;
  readonly advancedCopy: ProviderPropertyAdvancedCopy;
  readonly form: FeaturesForm;
  readonly setForm: (next: FeaturesForm) => void;
  readonly onSubmit: (event: FormEvent<HTMLFormElement>, continueAfter: boolean) => void;
  readonly mutationState: MutationState;
  readonly mutationMessage: string | undefined;
  readonly validationError: boolean;
  readonly amenities: readonly PublicPropertyAmenity[];
  readonly catalogState: 'loading' | 'success' | 'error';
  readonly onRetryCatalog: () => void;
}) {
  const saving = mutationState === 'saving';
  const toggle = (key: 'featureIds' | 'serviceIds', id: string) => setForm({ ...form, [key]: form[key].includes(id) ? form[key].filter(value => value !== id) : [...form[key], id] });
  return (
    <form className="provider-property-wizard__form" data-form-step="features-services" onSubmit={event => onSubmit(event, (event.nativeEvent as SubmitEvent).submitter?.getAttribute('value') === 'continue')} noValidate>
      <div className="provider-property-wizard__intro"><p className="provider-dashboard__eyebrow">{copy.wizard.eyebrow}</p><h1 id="provider-property-wizard-title">{copy.wizard.createTitle}</h1><p>{copy.wizard.createDescription}</p></div>
      <WizardSteps step="features-services" locale={locale} copy={copy} />
      <section className="provider-property-wizard__card" aria-labelledby="provider-property-features-title">
        <div className="provider-property-wizard__card-heading"><h2 id="provider-property-features-title">{advancedCopy.titles['features-services']}</h2><span>{advancedCopy.steps['features-services']}</span></div>
        <p className="provider-property-wizard__help">{advancedCopy.referenceHelp}</p>
        {catalogState === 'loading' ? <p role="status">{locale === 'ar' ? 'جارٍ تحميل الاختيارات…' : 'Loading choices…'}</p> : null}
        {catalogState === 'error' ? <div className="provider-property-wizard__location-placeholder" role="status"><strong>{advancedCopy.featureCatalogUnavailableTitle}</strong><p>{advancedCopy.featureCatalogUnavailableBody}</p><Button type="button" variant="secondary" onClick={onRetryCatalog}>{copy.retry}</Button></div> : null}
        <div className="provider-property-wizard__amenity-groups">
          {(['feature', 'service'] as const).map(kind => {
            const key = kind === 'feature' ? 'featureIds' : 'serviceIds';
            const options = amenities.filter(item => item.kind === kind);
            const missing = form[key].filter(id => !options.some(item => item.id === id));
            return <fieldset key={kind}><legend>{advancedCopy.labels[key]}</legend>
              {catalogState === 'success' && options.length === 0 ? <p>{locale === 'ar' ? 'لا توجد اختيارات متاحة حاليًا. يمكنك المتابعة بدونها.' : 'No choices are available yet. You can continue without them.'}</p> : null}
              <div className="provider-property-wizard__amenity-options">
                {options.map(item => <label key={item.id} className="provider-property-wizard__amenity-option" data-selected={form[key].includes(item.id)}><input type="checkbox" checked={form[key].includes(item.id)} disabled={saving} onChange={() => toggle(key, item.id)} /><span>{item.name[locale] ?? item.name.ar ?? item.name.en}<small>{item.detail?.[locale] ?? item.detail?.ar ?? item.detail?.en}</small></span></label>)}
                {missing.map((id, index) => <label key={id} className="provider-property-wizard__amenity-option" data-selected="true"><input type="checkbox" checked disabled={saving} onChange={() => toggle(key, id)} /><span>{locale === 'ar' ? `اختيار محفوظ غير متاح حاليًا (${index + 1})` : `Saved choice currently unavailable (${index + 1})`}</span></label>)}
              </div>
            </fieldset>;
          })}
        </div>
      </section>
      <ReasonAndMessage copy={copy} formReason={form.reason} onReasonChange={reason => setForm({ ...form, reason })} mutationState={mutationState} mutationMessage={mutationMessage} validationError={validationError} validationBody={advancedCopy.invalidReference} />
      <WizardActions copy={copy} saving={saving} showBack={false} />
    </form>
  );
}

function ReasonAndMessage({ copy, formReason, onReasonChange, mutationState, mutationMessage, validationError, validationBody }: {
  readonly copy: ProviderPropertyCopy;
  readonly formReason: string;
  readonly onReasonChange: (reason: string) => void;
  readonly mutationState: MutationState;
  readonly mutationMessage: string | undefined;
  readonly validationError: boolean;
  readonly validationBody?: string | undefined;
}) {
  return <>
    <div className="provider-property-wizard__field provider-property-wizard__reason"><label htmlFor="provider-property-reason">{copy.wizard.labels.reason}</label><textarea id="provider-property-reason" rows={2} value={formReason} placeholder={copy.wizard.placeholders.reason} onChange={event => onReasonChange(event.target.value)} required /></div>
    {validationError ? <p className="provider-property-wizard__form-error" role="alert"><strong>{copy.wizard.validationTitle}</strong> {validationBody ?? copy.wizard.validationBody}</p> : null}
    {mutationMessage !== undefined ? <p className={`provider-property-wizard__form-message provider-property-wizard__form-message--${mutationState}`} role={mutationState === 'error' || mutationState === 'permission' ? 'alert' : 'status'}>{mutationMessage}</p> : null}
  </>;
}

function WizardActions({ copy, saving, showBack }: { readonly copy: ProviderPropertyCopy; readonly saving: boolean; readonly showBack: boolean }) {
  return <div className="provider-property-wizard__actions">
    {showBack ? <Button type="button" variant="secondary" disabled={saving}>{copy.wizard.back}</Button> : null}
    <Button type="submit" name="intent" value="save" disabled={saving}>{saving ? copy.wizard.saving : copy.wizard.saveDraft}</Button>
    <Button type="submit" name="intent" value="continue" variant="secondary" disabled={saving}>{copy.wizard.continue}</Button>
  </div>;
}

export function ProviderPropertyAdvancedWizard({ locale, session, step, propertyId, authClient, apiOrigin, initialData, load, save, loadPropertyTypes, loadCommission, loadAmenities }: ProviderPropertyAdvancedWizardProps) {
  const copy = getProviderPropertyCopy(locale);
  const advancedCopy = getProviderPropertyAdvancedCopy(locale);
  const [state, setState] = useState<ProviderPropertyWizardState>(() => session.status !== 'authenticated' || session.role !== 'provider' ? 'permission' : initialData === undefined ? stateForStep() : 'success');
  const [property, setProperty] = useState<PropertyData | undefined>(initialData);
  const [form, setForm] = useState<AdvancedForm>(() => formForStep(step, initialData, copy));
  const [attempt, setAttempt] = useState(0);
  const [mutationState, setMutationState] = useState<MutationState>('idle');
  const [mutationMessage, setMutationMessage] = useState<string | undefined>();
  const [validationError, setValidationError] = useState(false);
  const [validationFields, setValidationFields] = useState<readonly string[]>([]);
  const [validationMessage, setValidationMessage] = useState<string>();
  const [propertyTypes, setPropertyTypes] = useState<readonly ProviderPropertyTypeOption[]>([]);
  const [propertyTypesState, setPropertyTypesState] = useState<'loading' | 'success' | 'error'>('loading');
  const [propertyTypesAttempt, setPropertyTypesAttempt] = useState(0);
  const [commission, setCommission] = useState<ProviderCommissionProjection>();
  const [commissionState, setCommissionState] = useState<'loading' | 'success' | 'error'>('loading');
  const [commissionAttempt, setCommissionAttempt] = useState(0);
  const [amenities, setAmenities] = useState<readonly PublicPropertyAmenity[]>([]);
  const [amenitiesState, setAmenitiesState] = useState<'loading' | 'success' | 'error'>('loading');
  const [amenitiesAttempt, setAmenitiesAttempt] = useState(0);
  const sessionRole = session.status === 'authenticated' ? session.role : undefined;
  const loadAction = useMemo(() => load ?? ((id: string) => loadProviderProperty({ propertyId: id, apiOrigin, authorization: authClient })), [apiOrigin, authClient, load]);
  const saveAction = useMemo(() => save ?? ((id: string, currentStep: ProviderPropertyStep, input: Parameters<ProviderPropertySaveAction>[2]) => saveProviderPropertyStep(input, { propertyId: id, step: currentStep, apiOrigin, authorization: authClient })), [apiOrigin, authClient, save]);
  const propertyTypesAction = useMemo(() => loadPropertyTypes ?? ((signal?: AbortSignal) => loadProviderPropertyTypes({ apiOrigin, ...(signal === undefined ? {} : { signal }) })), [apiOrigin, loadPropertyTypes]);
  const commissionAction = useMemo(() => loadCommission ?? ((signal?: AbortSignal) => loadProviderCommission({ apiOrigin, authorization: authClient, ...(signal === undefined ? {} : { signal }) })), [apiOrigin, authClient, loadCommission]);
  const amenitiesAction = useMemo(() => loadAmenities ?? ((signal?: AbortSignal) => loadProviderPropertyAmenities({ apiOrigin, ...(signal === undefined ? {} : { signal }) })), [apiOrigin, loadAmenities]);

  useEffect(() => {
    if (step !== 'features-services' || state !== 'success' || sessionRole !== 'provider') return undefined;
    const controller = new AbortController();
    setAmenitiesState('loading');
    void amenitiesAction(controller.signal).then(items => {
      if (controller.signal.aborted) return;
      setAmenities(items);
      setAmenitiesState('success');
    }).catch(() => { if (!controller.signal.aborted) setAmenitiesState('error'); });
    return () => controller.abort();
  }, [amenitiesAction, amenitiesAttempt, sessionRole, state, step]);

  useEffect(() => {
    if (session.status !== 'authenticated' || sessionRole !== 'provider') {
      setState('permission');
      return undefined;
    }
    if (initialData !== undefined && attempt === 0) {
      setProperty(initialData);
      setForm(formForStep(step, initialData, copy));
      setState('success');
      return undefined;
    }
    const controller = new AbortController();
    setState('loading');
    void loadAction(propertyId).then(next => {
      if (controller.signal.aborted) return;
      setProperty(next);
      setForm(formForStep(step, next, copy));
      setState('success');
    }).catch(error => {
      if (!controller.signal.aborted) setState(errorState(error));
    });
    return () => controller.abort();
  }, [attempt, copy, initialData, loadAction, propertyId, session.status, sessionRole, step]);

  useEffect(() => {
    if (step !== 'details' || state !== 'success' || session.status !== 'authenticated' || sessionRole !== 'provider') return undefined;
    const controller = new AbortController();
    setPropertyTypesState('loading');
    void propertyTypesAction(controller.signal).then(items => {
      if (controller.signal.aborted) return;
      setPropertyTypes(items);
      setPropertyTypesState('success');
    }).catch(() => {
      if (!controller.signal.aborted) setPropertyTypesState('error');
    });
    return () => controller.abort();
  }, [propertyTypesAction, propertyTypesAttempt, session.status, sessionRole, state, step]);

  useEffect(() => {
    if (step !== 'price-payment' || state !== 'success' || session.status !== 'authenticated' || sessionRole !== 'provider') return undefined;
    const controller = new AbortController();
    setCommissionState('loading');
    void commissionAction(controller.signal).then(value => {
      if (controller.signal.aborted) return;
      setCommission(value);
      setCommissionState('success');
    }).catch(() => {
      if (!controller.signal.aborted) setCommissionState('error');
    });
    return () => controller.abort();
  }, [commissionAction, commissionAttempt, session.status, sessionRole, state, step]);

  const onRetry = () => setAttempt(value => value + 1);
  const mutationFailure = (error: unknown) => {
    if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) {
      setMutationState('permission');
      setMutationMessage(copy.states.permission.body);
    } else if (error instanceof ApiClientError && error.status === 409) {
      setMutationState('error');
      setMutationMessage(advancedCopy.versionConflict);
    } else {
      setMutationState('error');
      setMutationMessage(copy.wizard.mutationError);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>, continueAfter: boolean) => {
    event.preventDefault();
    setValidationError(false);
    setValidationFields([]);
    setValidationMessage(undefined);
    setMutationMessage(undefined);
    if (property === undefined) {
      setState('not_found');
      return;
    }
    const parsed = step === 'details'
      ? detailsInput(form as DetailsForm, property.version)
      : step === 'price-payment'
        ? pricingInput(form as PricingForm, property.version)
        : featuresInput(form as FeaturesForm, property.version);
    if (!parsed.success) {
      const fields = parsed.error.issues.map(issue => String(issue.path[0] === 'layout' ? issue.path.at(-1) : issue.path[0]));
      setValidationFields(fields);
      if (step === 'details') {
        const fieldLabels: Record<string, string> = { ...advancedCopy.labels, reason: copy.wizard.labels.reason };
        const labels = [...new Set(fields.map(field => fieldLabels[field] ?? advancedCopy.labels.description))].join(locale === 'ar' ? '، ' : ', ');
        const floorInvalid = parsed.error.issues.some(issue => issue.message === 'Floor cannot exceed total floors');
        setValidationMessage(floorInvalid
          ? locale === 'ar' ? 'الطابق أكبر من إجمالي طوابق المبنى. صحح الطابق أو إجمالي الطوابق ثم احفظ.' : 'The floor exceeds the total number of building floors. Correct the floor or total floors, then save.'
          : locale === 'ar' ? `راجع: ${labels}. أدخل قيمة صحيحة ثم احفظ.` : `Check: ${labels}. Enter a valid value, then save.`);
      }
      setValidationError(true);
      return;
    }
    setMutationState('saving');
    try {
      const next = await saveAction(propertyId, step, parsed.data);
      setProperty(next);
      setForm(formForStep(step, next, copy));
      setMutationState('success');
      setMutationMessage(copy.wizard.saved);
      if (continueAfter && step === 'details') setBrowserPath(stepPath(locale, propertyId, 'price-payment'));
      if (continueAfter && step === 'price-payment') setBrowserPath(stepPath(locale, propertyId, 'features-services'));
      if (continueAfter && step === 'features-services') setBrowserPath(`/provider/properties/${encodeURIComponent(propertyId)}/media?lang=${locale}`);
    } catch (error) {
      mutationFailure(error);
    }
  };

  const goBack = () => {
    const previous: ProviderPropertyStep = step === 'details' ? 'location' : step === 'price-payment' ? 'details' : 'price-payment';
    setBrowserPath(stepPath(locale, propertyId, previous));
  };

  if (state !== 'success') {
    return <section className="provider-dashboard provider-property-wizard" data-screen-id={screenId(step)} data-route={`/provider/properties/${encodeURIComponent(propertyId)}/${routeSegment(step)}`} data-device-scope="desktop"><ProviderNavigation locale={locale} activePath="/provider/properties" authClient={authClient} /><div className="provider-dashboard__content provider-property-wizard__content"><WizardSteps step={step} locale={locale} copy={copy} /><StatePanel state={state} copy={copy} onRetry={onRetry} /></div></section>;
  }

  return (
    <section className="provider-dashboard provider-property-wizard" data-screen-id={screenId(step)} data-route={`/provider/properties/${encodeURIComponent(propertyId)}/${routeSegment(step)}`} data-device-scope="desktop/tablet/mobile">
      <ProviderNavigation locale={locale} activePath="/provider/properties/new/basic" authClient={authClient} />
      <div className="provider-dashboard__content provider-property-wizard__content">
        {step === 'details' ? <DetailsFormView locale={locale} copy={copy} advancedCopy={advancedCopy} form={form as DetailsForm} setForm={next => setForm(next)} onSubmit={submit} mutationState={mutationState} mutationMessage={mutationMessage} validationError={validationError} validationFields={validationFields} validationMessage={validationMessage} propertyTypes={propertyTypes} propertyTypesState={propertyTypesState} onRetryPropertyTypes={() => setPropertyTypesAttempt(value => value + 1)} /> : null}
        {step === 'price-payment' ? <PricingFormView locale={locale} copy={copy} advancedCopy={advancedCopy} form={form as PricingForm} setForm={next => setForm(next)} onSubmit={submit} mutationState={mutationState} mutationMessage={mutationMessage} validationError={validationError} commission={commission} commissionState={commissionState} onRetryCommission={() => setCommissionAttempt(value => value + 1)} /> : null}
        {step === 'features-services' ? <FeaturesFormView locale={locale} copy={copy} advancedCopy={advancedCopy} form={form as FeaturesForm} setForm={next => setForm(next)} onSubmit={submit} mutationState={mutationState} mutationMessage={mutationMessage} validationError={validationError} amenities={amenities} catalogState={amenitiesState} onRetryCatalog={() => setAmenitiesAttempt(value => value + 1)} /> : null}
        <div className="provider-property-wizard__back-row"><Button type="button" variant="secondary" disabled={mutationState === 'saving'} onClick={goBack}>{copy.wizard.back}</Button></div>
      </div>
    </section>
  );
}

function detailsInput(form: DetailsForm, version: number) {
  const area = numberValue(form.area);
  const layoutEntries = [['bedrooms', numberValue(form.bedrooms)], ['bathrooms', numberValue(form.bathrooms)], ['floor', numberValue(form.floor)], ['totalFloors', numberValue(form.totalFloors)]] as const;
  const layout = Object.fromEntries(layoutEntries.filter(([, value]) => value !== undefined));
  return propertyDetailsStepSchema.safeParse({
    version,
    ...(Object.keys(textMap(form.description)).length ? { description: textMap(form.description) } : {}),
    propertyTypeId: form.propertyTypeId.trim() === '' ? null : form.propertyTypeId.trim().toLowerCase(),
    deliveryStatus: form.deliveryStatus === '' ? null : form.deliveryStatus,
    ...(area === undefined ? {} : { area: { value: area, unit: 'sqm' } }),
    ...(Object.keys(layout).length ? { layout } : {}),
    reason: form.reason.trim()
  });
}

function pricingInput(form: PricingForm, version: number) {
  const amount = numberValue(form.amount);
  const currency = form.currency.trim().toUpperCase();
  const plan = form.planEnabled ? {
    name: textMap(form.planName),
    installments: numberValue(form.installments),
    frequency: form.frequency,
    ...(numberValue(form.downPaymentAmount) === undefined ? {} : { downPayment: { amount: numberValue(form.downPaymentAmount), currency } }),
    installmentAmount: { amount: numberValue(form.installmentAmount), currency }
  } : undefined;
  return propertyPricingStepSchema.safeParse({
    version,
    ...(amount === undefined ? {} : { price: { amount, currency } }),
    paymentPlans: form.planEnabled ? [plan] : [],
    reason: form.reason.trim()
  });
}

function featuresInput(form: FeaturesForm, version: number) {
  return propertyFeaturesServicesStepSchema.safeParse({ version, featureIds: form.featureIds, serviceIds: form.serviceIds, reason: form.reason.trim() });
}
