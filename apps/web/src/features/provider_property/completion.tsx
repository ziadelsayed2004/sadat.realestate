import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  propertyContactStepSchema,
  type PropertyContact,
  type PropertyData,
  type PropertyMediaData,
  type PropertyMediaKind,
  type PropertyMediaMime,
  type PropertySubmit,
  type SupportedLocale
} from '@sadat-real-estate/contracts';
import { ApiClientError } from '../contracts/index.ts';
import { Button, Input, StateMessage } from '../design_system/index.ts';
import type { RouteSession } from '../routing/index.ts';
import { ProviderNavigation } from '../provider/index.ts';
import type { ProviderPropertyAuthClient, ProviderPropertyLoadAction, ProviderPropertySaveAction } from './wizard.tsx';
import {
  deleteProviderPropertyMedia,
  loadProviderProperty,
  reorderProviderPropertyMedia,
  saveProviderPropertyStep,
  submitProviderProperty,
  uploadProviderPropertyMedia,
  type ProviderPropertyMediaDeleteOptions,
  type ProviderPropertyMediaOrderOptions,
  type ProviderPropertyMediaUploadOptions,
  type ProviderPropertySubmitOptions,
  type ProviderPropertyStepInput
} from './data.ts';
import { getProviderPropertyCompletionCopy, type ProviderPropertyCompletionStep } from './completion-copy.ts';
import { getProviderPropertyCopy } from './copy.ts';
import { getProviderPropertyStateCopy, getProviderPropertyValidationIssues, type ProviderPropertyValidationIssue } from './state-copy.ts';
import { getProviderPropertyRailLabels, PROVIDER_PROPERTY_RAIL_STEPS } from './steps.ts';
import './styles.css';

const MAX_MEDIA_BYTES = 10 * 1024 * 1024;
const MEDIA_MIMES: readonly PropertyMediaMime[] = ['application/pdf', 'image/jpeg', 'image/png'];
type ViewState = 'loading' | 'success' | 'retry' | 'error' | 'permission' | 'not_found';
type MutationState = 'idle' | 'saving' | 'success' | 'error' | 'permission';

interface ContactForm {
  readonly contactName: string;
  readonly phone: string;
  readonly whatsappNumber: string;
  readonly email: string;
  readonly preferredLocale: SupportedLocale;
  readonly reason: string;
}

interface Checks {
  readonly data: boolean;
  readonly authority: boolean;
  readonly review: boolean;
}

export type ProviderPropertyMediaUploadAction = (options: ProviderPropertyMediaUploadOptions) => Promise<PropertyMediaData>;
export type ProviderPropertyMediaOrderAction = (options: ProviderPropertyMediaOrderOptions) => Promise<readonly PropertyMediaData[]>;
export type ProviderPropertyMediaDeleteAction = (options: ProviderPropertyMediaDeleteOptions) => Promise<PropertyMediaData>;
export type ProviderPropertySubmitAction = (input: PropertySubmit, options: ProviderPropertySubmitOptions) => Promise<PropertyData>;

export interface ProviderPropertyCompletionWizardProps {
  readonly locale: SupportedLocale;
  readonly session: RouteSession;
  readonly step: ProviderPropertyCompletionStep;
  readonly propertyId: string;
  readonly authClient?: ProviderPropertyAuthClient | undefined;
  readonly apiOrigin?: string | undefined;
  readonly initialData?: PropertyData | undefined;
  readonly load?: ProviderPropertyLoadAction | undefined;
  readonly save?: ProviderPropertySaveAction | undefined;
  readonly upload?: ProviderPropertyMediaUploadAction | undefined;
  readonly reorder?: ProviderPropertyMediaOrderAction | undefined;
  readonly remove?: ProviderPropertyMediaDeleteAction | undefined;
  readonly submit?: ProviderPropertySubmitAction | undefined;
}

function errorState(error: unknown): Exclude<ViewState, 'loading' | 'success'> {
  if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) return 'permission';
  if (error instanceof ApiClientError && error.status === 404) return 'not_found';
  if (error instanceof ApiClientError && (error.code === 'NETWORK_ERROR' || error.code === 'ABORTED')) return 'retry';
  return 'error';
}

function mutationError(error: unknown): MutationState {
  return error instanceof ApiClientError && (error.status === 401 || error.status === 403) ? 'permission' : 'error';
}

function pathFor(locale: SupportedLocale, propertyId: string, step: ProviderPropertyCompletionStep): string {
  const url = new URL(`/provider/properties/${encodeURIComponent(propertyId)}/${step}`, 'http://sadat-real-estate.local');
  url.searchParams.set('lang', locale);
  return `${url.pathname}${url.search}`;
}

function navigate(locale: SupportedLocale, propertyId: string, step: ProviderPropertyCompletionStep | 'features-services'): void {
  if (typeof window !== 'undefined') window.location.assign(pathFor(locale, propertyId, step as ProviderPropertyCompletionStep));
}

function contactFromProperty(property: PropertyData | undefined, locale: SupportedLocale): ContactForm {
  const contact = property?.contact;
  return {
    contactName: contact?.contactName ?? '',
    phone: contact?.phone ?? '',
    whatsappNumber: contact?.whatsappNumber ?? '',
    email: contact?.email ?? '',
    preferredLocale: contact?.preferredLocale ?? locale,
    reason: 'Provider updated contact details'
  };
}

function optionalValue(value: string): string | undefined {
  const normalized = value.trim();
  return normalized === '' ? undefined : normalized;
}

function mediaMimeFor(file: File, kind: PropertyMediaKind): PropertyMediaMime | undefined {
  const mime = file.type as PropertyMediaMime;
  if (!MEDIA_MIMES.includes(mime)) return undefined;
  if (kind === 'floor_plan' && mime !== 'application/pdf') return undefined;
  if (kind === 'image' && mime === 'application/pdf') return undefined;
  return mime;
}

function safeName(property: PropertyData, locale: SupportedLocale): string {
  return property.name[locale] ?? property.name.en ?? property.name.ar ?? property.slug;
}

function statusLabel(property: PropertyData): string {
  return property.status.replaceAll('_', ' ');
}

function reorderItems(items: readonly PropertyMediaData[]): PropertyMediaOrderInput[] {
  return items.map((item, index) => ({ mediaId: item.id, sortOrder: index, isCover: item.isCover }));
}

interface PropertyMediaOrderInput {
  readonly mediaId: string;
  readonly sortOrder: number;
  readonly isCover: boolean;
}

function StatePanel({ state, onRetry, copy }: { readonly state: ViewState; readonly onRetry: () => void; readonly copy: ReturnType<typeof getProviderPropertyCopy> }) {
  if (state === 'success') return null;
  const messages = copy.states;
  const message = state === 'not_found' ? messages.not_found : messages[state];
  const componentState = state === 'not_found' ? 'error' : state;
  return (
    <section className="provider-property-completion__state">
      <StateMessage state={componentState} title={message.title} message={message.body} retryLabel={copy.retry} onRetry={state === 'retry' ? onRetry : undefined} />
      {(state === 'error' || state === 'not_found') ? <Button type="button" variant="secondary" size="sm" onClick={onRetry}>{copy.retry}</Button> : null}
    </section>
  );
}

function StepRail({ step, locale }: { readonly step: ProviderPropertyCompletionStep; readonly locale: SupportedLocale }) {
  const labels = getProviderPropertyRailLabels(locale);
  const currentIndex = PROVIDER_PROPERTY_RAIL_STEPS.indexOf(step);
  return (
    <ol className="provider-property-completion__steps" aria-label="Property completion steps">
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

function ContactView({
  locale,
  copy,
  form,
  onChange,
  onSubmit,
  onBack,
  mutationState,
  mutationMessage,
  validationError
}: {
  readonly locale: SupportedLocale;
  readonly copy: ReturnType<typeof getProviderPropertyCompletionCopy>;
  readonly form: ContactForm;
  readonly onChange: (field: keyof ContactForm, value: string) => void;
  readonly onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  readonly onBack: () => void;
  readonly mutationState: MutationState;
  readonly mutationMessage: string | undefined;
  readonly validationError: boolean;
}) {
  const fields = copy.contact;
  const saving = mutationState === 'saving';
  return (
    <form className="provider-property-completion__form" onSubmit={onSubmit} noValidate>
      <div className="provider-property-wizard__intro">
        <p className="provider-dashboard__eyebrow">{copy.steps.contact}</p>
        <h1 id="provider-property-completion-title">{copy.titles.contact}</h1>
        <p>{copy.descriptions.contact}</p>
      </div>
      <section className="provider-property-completion__card" aria-labelledby="provider-property-contact-fields">
        <h2 id="provider-property-contact-fields">{fields.supportedFieldsTitle}</h2>
        <p>{fields.supportedFieldsBody}</p>
        <div className="provider-property-wizard__grid">
          <Input id="provider-property-contact-name" label={fields.contactName} value={form.contactName} placeholder={fields.contactNamePlaceholder} onChange={event => onChange('contactName', event.target.value)} />
          <Input id="provider-property-contact-phone" label={fields.phone} value={form.phone} placeholder={fields.phonePlaceholder} onChange={event => onChange('phone', event.target.value)} inputMode="tel" />
          <Input id="provider-property-contact-whatsapp" label={fields.whatsapp} value={form.whatsappNumber} placeholder={fields.whatsappPlaceholder} onChange={event => onChange('whatsappNumber', event.target.value)} inputMode="tel" />
          <Input id="provider-property-contact-email" label={fields.email} value={form.email} placeholder={fields.emailPlaceholder} onChange={event => onChange('email', event.target.value)} type="email" />
          <div className="provider-property-completion__field">
            <label htmlFor="provider-property-contact-locale">{fields.preferredLocale}</label>
            <select id="provider-property-contact-locale" value={form.preferredLocale} onChange={event => onChange('preferredLocale', event.target.value)}>
              {(['ar', 'en', 'zh-CN'] as const).map(value => <option key={value} value={value}>{fields.preferredLocaleLabels[value]}</option>)}
            </select>
          </div>
        </div>
      </section>
      <section className="provider-property-completion__notice" aria-label={fields.internalNotesTitle}>
        <strong>{fields.internalNotesTitle}</strong><p>{fields.internalNotesBody}</p>
      </section>
      {validationError ? <p className="provider-property-wizard__form-error" role="alert"><strong>{copy.validationTitle}</strong> {copy.validationBody}</p> : null}
      {mutationMessage !== undefined ? <p className={`provider-property-wizard__form-message provider-property-wizard__form-message--${mutationState}`} role={mutationState === 'error' || mutationState === 'permission' ? 'alert' : 'status'}>{mutationMessage}</p> : null}
      <div className="provider-property-wizard__actions">
        <Button type="button" variant="secondary" onClick={onBack} disabled={saving}>{copy.back}</Button>
        <Button type="submit" loading={saving}>{saving ? copy.saving : copy.continue}</Button>
      </div>
      <input type="hidden" value={locale} readOnly aria-hidden="true" />
    </form>
  );
}

function MediaView({
  copy,
  media,
  onFile,
  onRemove,
  onMove,
  busy,
  message,
  onBack,
  onContinue
}: {
  readonly copy: ReturnType<typeof getProviderPropertyCompletionCopy>;
  readonly media: readonly PropertyMediaData[];
  readonly onFile: (kind: PropertyMediaKind, event: ChangeEvent<HTMLInputElement>) => void;
  readonly onRemove: (item: PropertyMediaData) => void;
  readonly onMove: (index: number, direction: -1 | 1) => void;
  readonly busy: boolean;
  readonly message: string | undefined;
  readonly onBack: () => void;
  readonly onContinue: () => void;
}) {
  const labels = copy.media;
  return (
    <div className="provider-property-completion__form">
      <div className="provider-property-wizard__intro">
        <p className="provider-dashboard__eyebrow">{copy.steps.media}</p>
        <h1 id="provider-property-completion-title">{copy.titles.media}</h1>
        <p>{copy.descriptions.media}</p>
      </div>
      <section className="provider-property-completion__card" aria-labelledby="provider-property-media-upload">
        <h2 id="provider-property-media-upload">{labels.count}: {media.length}</h2>
        <p>{labels.acceptedTypes}</p>
        <div className="provider-property-completion__upload-actions">
          <label className="provider-property-completion__file-button" htmlFor="provider-property-media-image">{labels.chooseImage}</label>
          <input id="provider-property-media-image" type="file" accept="image/jpeg,image/png" onChange={event => onFile('image', event)} disabled={busy} />
          <label className="provider-property-completion__file-button" htmlFor="provider-property-media-floor-plan">{labels.chooseFloorPlan}</label>
          <input id="provider-property-media-floor-plan" type="file" accept="application/pdf" onChange={event => onFile('floor_plan', event)} disabled={busy} />
        </div>
        {media.length === 0 ? <div className="provider-property-completion__empty" role="status"><strong>{labels.emptyTitle}</strong><p>{labels.emptyBody}</p></div> : (
          <ul className="provider-property-completion__media-list" aria-label={labels.count}>
            {media.map((item, index) => (
              <li key={item.id} className="provider-property-completion__media-item">
                <div><strong>{item.originalFilename}</strong><span>{item.kind === 'image' ? labels.imageKind : labels.floorPlanKind} · {item.processingState}</span></div>
                <div className="provider-property-completion__item-actions">
                  <Button type="button" size="xs" variant="ghost" onClick={() => onMove(index, -1)} disabled={busy || index === 0} aria-label={`${labels.moveUp}: ${item.originalFilename}`}>{labels.moveUp}</Button>
                  <Button type="button" size="xs" variant="ghost" onClick={() => onMove(index, 1)} disabled={busy || index === media.length - 1} aria-label={`${labels.moveDown}: ${item.originalFilename}`}>{labels.moveDown}</Button>
                  <Button type="button" size="xs" variant="danger" onClick={() => onRemove(item)} disabled={busy}>{labels.remove}</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="provider-property-completion__notice">{labels.existingUnavailableBody}</p>
        <p className="provider-property-completion__privacy">{labels.privacyNote}</p>
        {message !== undefined ? <p className="provider-property-wizard__form-message provider-property-wizard__form-message--error" role="alert">{message}</p> : null}
      </section>
      <div className="provider-property-wizard__actions">
        <Button type="button" variant="secondary" onClick={onBack} disabled={busy}>{copy.back}</Button>
        <Button type="button" onClick={onContinue} disabled={busy}>{copy.continue}</Button>
      </div>
    </div>
  );
}

function ValidationView({ locale, property, issues }: { readonly locale: SupportedLocale; readonly property: PropertyData; readonly issues: readonly ProviderPropertyValidationIssue[] }) {
  const copy = getProviderPropertyStateCopy(locale).validation;
  const propertyCopy = getProviderPropertyCopy(locale);
  const editAvailable = property.availableActions.includes('update');
  const editUrl = new URL(`/provider/properties/${encodeURIComponent(property.id)}/location`, 'http://sadat-real-estate.local');
  editUrl.searchParams.set('lang', locale);
  const backUrl = new URL('/provider/properties', 'http://sadat-real-estate.local');
  backUrl.searchParams.set('lang', locale);
  const propertyName = property.name[locale] ?? property.name.en ?? property.name.ar ?? property.slug;
  return (
    <main className="provider-property-state__main provider-property-validation" aria-labelledby="provider-property-validation-title">
      <div className="provider-property-state__intro">
        <p className="provider-dashboard__eyebrow">{propertyCopy.navLabel}</p>
        <h1 id="provider-property-validation-title">{copy.title}</h1>
        <p>{copy.body}</p>
      </div>
      <section className="provider-property-state__notice provider-property-state__notice--validation" role="alert" aria-labelledby="provider-property-validation-issues">
        <h2 id="provider-property-validation-issues">{copy.title}</h2>
        <ul>
          {issues.map(issue => <li key={issue}>{copy.issueLabels[issue]}</li>)}
        </ul>
        <p><strong>{copy.reasonLabel}:</strong> {property.reviewReason ?? copy.reasonUnavailable}</p>
      </section>
      <section className="provider-property-state__card" aria-labelledby="provider-property-validation-summary">
        <h2 id="provider-property-validation-summary">{propertyName}</h2>
        <dl className="provider-property-state__summary">
          <div><dt>{copy.issueLabels.status}</dt><dd>{propertyCopy.wizard.statusLabels[property.status]}</dd></div>
          <div><dt>{copy.issueLabels.location}</dt><dd>{property.locationId ?? propertyCopy.wizard.unavailable}</dd></div>
          <div><dt>{copy.issueLabels.price}</dt><dd>{property.price === undefined ? propertyCopy.wizard.unavailable : `${property.price.amount} ${property.price.currency}`}</dd></div>
          <div><dt>{copy.issueLabels.contact}</dt><dd>{property.contact?.contactName ?? property.contact?.email ?? property.contact?.phone ?? propertyCopy.wizard.unavailable}</dd></div>
        </dl>
      </section>
      <section className="provider-property-state__safe" aria-labelledby="provider-property-validation-safe-title">
        <h2 id="provider-property-validation-safe-title">{copy.safeTitle}</h2>
        <p>{copy.safeBody}</p>
      </section>
      <div className="provider-property-state__actions">
        <a className="provider-dashboard__secondary-action" href={backUrl.pathname + backUrl.search}>{copy.back}</a>
        {editAvailable ? <a className="provider-dashboard__primary-action" href={editUrl.pathname + editUrl.search}>{copy.edit}</a> : <Button type="button" disabled>{copy.editUnavailable}</Button>}
      </div>
    </main>
  );
}

function ReviewView({
  locale,
  copy,
  property,
  media,
  checks,
  onCheck,
  reason,
  onReason,
  onSubmit,
  onBack,
  mutationState,
  mutationMessage,
  validationError,
  submitted
}: {
  readonly locale: SupportedLocale;
  readonly copy: ReturnType<typeof getProviderPropertyCompletionCopy>;
  readonly property: PropertyData;
  readonly media: readonly PropertyMediaData[];
  readonly checks: Checks;
  readonly onCheck: (field: keyof Checks) => void;
  readonly reason: string;
  readonly onReason: (value: string) => void;
  readonly onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  readonly onBack: () => void;
  readonly mutationState: MutationState;
  readonly mutationMessage: string | undefined;
  readonly validationError: boolean;
  readonly submitted: boolean;
}) {
  const review = copy.review;
  const missing: string[] = [];
  if (property.locationId === undefined) missing.push(review.location);
  if (property.price === undefined) missing.push(review.price);
  if (property.contact?.phone === undefined && property.contact?.whatsappNumber === undefined && property.contact?.email === undefined) missing.push(review.contact);
  const serverCanSubmit = property.availableActions.includes('submit');
  const canSubmit = serverCanSubmit && missing.length === 0 && checks.data && checks.authority && checks.review;
  const submittedView = submitted || property.status === 'pending_review';
  return (
    <form className="provider-property-completion__form" onSubmit={onSubmit} noValidate>
      <div className="provider-property-wizard__intro">
        <p className="provider-dashboard__eyebrow">{copy.steps.review}</p>
        <h1 id="provider-property-completion-title">{copy.titles.review}</h1>
        <p>{copy.descriptions.review}</p>
      </div>
      {submittedView ? <section className="provider-property-completion__submitted" role="status"><h2>{review.submittedTitle}</h2><p>{review.submittedBody}</p><strong>{review.submittedStatus}</strong></section> : null}
      <section className="provider-property-completion__card" aria-labelledby="provider-property-review-summary">
        <h2 id="provider-property-review-summary">{review.safeProjectionTitle}</h2>
        <p>{review.safeProjectionBody}</p>
        <dl className="provider-property-completion__summary">
          <div><dt>{review.status}</dt><dd>{statusLabel(property)}</dd></div>
          <div><dt>{review.location}</dt><dd>{property.locationId ?? '—'}</dd></div>
          <div><dt>{review.price}</dt><dd>{property.price === undefined ? '—' : `${property.price.amount} ${property.price.currency}`}</dd></div>
          <div><dt>{review.contact}</dt><dd>{property.contact?.contactName ?? property.contact?.email ?? property.contact?.phone ?? '—'}</dd></div>
          <div><dt>{review.media}</dt><dd>{media.length === 0 ? review.noMedia : `${media.length} ${review.mediaCount}`}</dd></div>
          <div><dt>Property</dt><dd>{safeName(property, locale)}</dd></div>
        </dl>
      </section>
      {!submittedView && missing.length > 0 ? <section className="provider-property-completion__missing" role="alert"><h2>{review.missingTitle}</h2><p>{review.missingBody}</p><ul>{missing.map(item => <li key={item}>{item}</li>)}</ul></section> : null}
      {!submittedView && !serverCanSubmit ? <section className="provider-property-completion__notice" role="status"><strong>{review.notSubmittableTitle}</strong><p>{review.notSubmittableBody}</p></section> : null}
      {!submittedView ? <>
        <fieldset className="provider-property-completion__checks"><legend>{review.requiredConfirmationsTitle}</legend>
          <label><input type="checkbox" checked={checks.data} onChange={() => onCheck('data')} /> {review.accurateData}</label>
          <label><input type="checkbox" checked={checks.authority} onChange={() => onCheck('authority')} /> {review.authority}</label>
          <label><input type="checkbox" checked={checks.review} onChange={() => onCheck('review')} /> {review.reviewProcess}</label>
        </fieldset>
        <div className="provider-property-completion__field"><label htmlFor="provider-property-submit-reason">{review.reviewReason}</label><textarea id="provider-property-submit-reason" rows={3} value={reason} onChange={event => onReason(event.target.value)} /></div>
        {validationError ? <p className="provider-property-wizard__form-error" role="alert"><strong>{review.missingTitle}</strong> {review.missingBody}</p> : null}
      </> : null}
      {mutationMessage !== undefined ? <p className={`provider-property-wizard__form-message provider-property-wizard__form-message--${mutationState}`} role={mutationState === 'error' || mutationState === 'permission' ? 'alert' : 'status'}>{mutationMessage}</p> : null}
      <div className="provider-property-wizard__actions"><Button type="button" variant="secondary" onClick={onBack} disabled={mutationState === 'saving'}>{copy.back}</Button>{!submittedView && serverCanSubmit ? <Button type="submit" loading={mutationState === 'saving'} disabled={!canSubmit}>{mutationState === 'saving' ? review.submitting : review.submit}</Button> : null}</div>
    </form>
  );
}

export function ProviderPropertyCompletionWizard({ locale, session, step, propertyId, authClient, apiOrigin, initialData, load, save, upload, reorder, remove, submit }: ProviderPropertyCompletionWizardProps) {
  const copy = getProviderPropertyCompletionCopy(locale);
  const propertyCopy = getProviderPropertyCopy(locale);
  const [state, setState] = useState<ViewState>('loading');
  const [property, setProperty] = useState<PropertyData | undefined>(initialData);
  const [media, setMedia] = useState<readonly PropertyMediaData[]>([]);
  const [contact, setContact] = useState<ContactForm>(() => contactFromProperty(initialData, locale));
  const [checks, setChecks] = useState<Checks>({ data: false, authority: false, review: false });
  const [reason, setReason] = useState('Provider submitted property for review');
  const [attempt, setAttempt] = useState(0);
  const [mutationState, setMutationState] = useState<MutationState>('idle');
  const [mutationMessage, setMutationMessage] = useState<string | undefined>();
  const [mediaMessage, setMediaMessage] = useState<string | undefined>();
  const [validationError, setValidationError] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const sessionRole = session.status === 'authenticated' ? session.role : undefined;

  const loadAction = useMemo(() => load ?? ((id: string) => loadProviderProperty({ propertyId: id, apiOrigin, authorization: authClient })), [apiOrigin, authClient, load]);
  const saveAction = useMemo(() => save ?? ((id: string, currentStep: 'contact', input: ProviderPropertyStepInput) => saveProviderPropertyStep(input, { propertyId: id, step: currentStep, apiOrigin, authorization: authClient })), [apiOrigin, authClient, save]);
  const uploadAction = useMemo(() => upload ?? ((options: ProviderPropertyMediaUploadOptions) => uploadProviderPropertyMedia(options)), [upload]);
  const reorderAction = useMemo(() => reorder ?? ((options: ProviderPropertyMediaOrderOptions) => reorderProviderPropertyMedia(options)), [reorder]);
  const removeAction = useMemo(() => remove ?? ((options: ProviderPropertyMediaDeleteOptions) => deleteProviderPropertyMedia(options)), [remove]);
  const submitAction = useMemo(() => submit ?? ((input: PropertySubmit, options: ProviderPropertySubmitOptions) => submitProviderProperty(input, options)), [submit]);

  useEffect(() => {
    if (session.status !== 'authenticated' || session.role !== 'provider') {
      setState('permission');
      return undefined;
    }
    if (initialData !== undefined && attempt === 0) {
      setProperty(initialData);
      setContact(contactFromProperty(initialData, locale));
      setState('success');
      return undefined;
    }
    const controller = new AbortController();
    setState('loading');
    void loadAction(propertyId).then(next => {
      if (controller.signal.aborted) return;
      setProperty(next);
      setContact(contactFromProperty(next, locale));
      setMedia([]);
      setSubmitted(next.status === 'pending_review');
      setState('success');
    }).catch(error => {
      if (!controller.signal.aborted) setState(errorState(error));
    });
    return () => controller.abort();
  }, [attempt, initialData, loadAction, locale, propertyId, sessionRole, session.status]);

  const retry = () => setAttempt(value => value + 1);
  const goBack = () => navigate(locale, propertyId, step === 'media' ? 'features-services' : step === 'contact' ? 'media' : 'contact');
  const goForward = () => { if (step === 'media') navigate(locale, propertyId, 'contact'); else if (step === 'contact') navigate(locale, propertyId, 'review'); };

  const handleContactChange = (field: keyof ContactForm, value: string) => setContact(current => ({ ...current, [field]: value }));
  const handleContactSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (property === undefined) return;
    setValidationError(false);
    setMutationMessage(undefined);
    const contactValue: PropertyContact = {
      ...(optionalValue(contact.contactName) === undefined ? {} : { contactName: optionalValue(contact.contactName) }),
      ...(optionalValue(contact.phone) === undefined ? {} : { phone: optionalValue(contact.phone) }),
      ...(optionalValue(contact.whatsappNumber) === undefined ? {} : { whatsappNumber: optionalValue(contact.whatsappNumber) }),
      ...(optionalValue(contact.email) === undefined ? {} : { email: optionalValue(contact.email) }),
      preferredLocale: contact.preferredLocale
    };
    const parsed = propertyContactStepSchema.safeParse({ version: property.version, contact: contactValue, reason: contact.reason.trim() });
    if (!parsed.success) { setValidationError(true); return; }
    setMutationState('saving');
    try {
      const next = await saveAction(propertyId, 'contact', parsed.data);
      setProperty(next);
      setContact(contactFromProperty(next, locale));
      setMutationState('success');
      setMutationMessage(copy.saved);
      navigate(locale, propertyId, 'review');
    } catch (error) {
      setMutationState(mutationError(error));
      setMutationMessage(error instanceof ApiClientError && error.status === 409 ? copy.versionConflict : mutationError(error) === 'permission' ? copy.permissionBody : copy.mutationError);
    }
  };

  const handleFile = async (kind: PropertyMediaKind, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file === undefined) return;
    setMediaMessage(undefined);
    const mime = mediaMimeFor(file, kind);
    if (file.size <= 0 || mime === undefined) { setMediaMessage(copy.media.invalidFileBody); return; }
    if (file.size > MAX_MEDIA_BYTES) { setMediaMessage(copy.media.tooLargeBody); return; }
    setMutationState('saving');
    try {
      const item = await uploadAction({ propertyId, file, filename: file.name, kind, contentType: mime, apiOrigin, authorization: authClient });
      setMedia(items => [...items, item]);
      setMutationState('success');
    } catch (error) {
      setMutationState(mutationError(error));
      setMediaMessage(error instanceof ApiClientError && error.status === 503 ? copy.media.storageUnavailableBody : mutationError(error) === 'permission' ? copy.media.permissionBody : copy.media.uploadErrorBody);
    }
  };

  const changeOrder = async (next: readonly PropertyMediaData[]) => {
    if (next.length === 0) return;
    setMediaMessage(undefined);
    setMutationState('saving');
    try {
      const updated = await reorderAction({ propertyId, input: { version: media[0]?.version ?? property?.version ?? 0, items: reorderItems(next), reason: 'Provider updated media order' }, apiOrigin, authorization: authClient });
      setMedia(updated);
      setMutationState('success');
    } catch (error) {
      setMutationState(mutationError(error));
      setMediaMessage(error instanceof ApiClientError && error.status === 409 ? copy.media.versionConflictBody : copy.media.uploadErrorBody);
    }
  };

  const moveMedia = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= media.length) return;
    const current = media[index];
    const targetItem = media[target];
    if (current === undefined || targetItem === undefined) return;
    const next = [...media];
    next[index] = targetItem;
    next[target] = current;
    void changeOrder(next);
  };

  const removeMedia = async (item: PropertyMediaData) => {
    setMediaMessage(undefined);
    setMutationState('saving');
    try {
      await removeAction({ propertyId, mediaId: item.id, apiOrigin, authorization: authClient });
      setMedia(items => items.filter(current => current.id !== item.id));
      setMutationState('success');
    } catch (error) {
      setMutationState(mutationError(error));
      setMediaMessage(mutationError(error) === 'permission' ? copy.media.permissionBody : copy.media.uploadErrorBody);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (property === undefined) return;
    const currentMissing = property.locationId === undefined || property.price === undefined || (property.contact?.phone === undefined && property.contact?.whatsappNumber === undefined && property.contact?.email === undefined);
    if (currentMissing || !property.availableActions.includes('submit') || !checks.data || !checks.authority || !checks.review) { setValidationError(true); return; }
    const parsed = propertySubmitInput(property.version, reason);
    if (parsed === undefined) { setValidationError(true); return; }
    setValidationError(false);
    setMutationState('saving');
    setMutationMessage(undefined);
    try {
      const next = await submitAction(parsed, { propertyId, apiOrigin, authorization: authClient });
      setProperty(next);
      setSubmitted(true);
      setMutationState('success');
      setMutationMessage(copy.review.submittedBody);
    } catch (error) {
      setMutationState(mutationError(error));
      setMutationMessage(error instanceof ApiClientError && error.status === 409 ? copy.versionConflict : mutationError(error) === 'permission' ? copy.permissionBody : copy.mutationError);
    }
  };

  const validationIssues = property === undefined ? [] : getProviderPropertyValidationIssues(property);
  const validationState = step === 'review' && property !== undefined && (property.status === 'draft' || property.status === 'needs_changes') && validationIssues.length > 0;
  const content = state === 'success' && property !== undefined ? (
    step === 'media' ? <MediaView copy={copy} media={media} onFile={handleFile} onRemove={removeMedia} onMove={moveMedia} busy={mutationState === 'saving'} message={mediaMessage} onBack={goBack} onContinue={goForward} />
      : step === 'contact' ? <ContactView locale={locale} copy={copy} form={contact} onChange={handleContactChange} onSubmit={handleContactSubmit} onBack={goBack} mutationState={mutationState} mutationMessage={mutationMessage} validationError={validationError} />
        : validationState ? <ValidationView locale={locale} property={property} issues={validationIssues} /> : <ReviewView locale={locale} copy={copy} property={property} media={media} checks={checks} onCheck={field => setChecks(current => ({ ...current, [field]: !current[field] }))} reason={reason} onReason={setReason} onSubmit={handleSubmit} onBack={goBack} mutationState={mutationState} mutationMessage={mutationMessage} validationError={validationError} submitted={submitted} />
  ) : null;

  return (
    <section className="provider-dashboard provider-property-completion" data-screen-id={step === 'media' ? 'PRV-08' : step === 'contact' ? 'PRV-09' : validationState ? 'PRV-11' : 'PRV-10'} data-route={`/provider/properties/${propertyId}/${step}`} data-device-scope="desktop">
      <ProviderNavigation locale={locale} activePath="/provider/properties" />
      <div className="provider-dashboard__content provider-property-wizard__content">
        <StepRail step={step} locale={locale} />
        <StatePanel state={state} onRetry={retry} copy={propertyCopy} />
        {content}
      </div>
    </section>
  );
}

function propertySubmitInput(version: number, reason: string): PropertySubmit | undefined {
  const trimmed = reason.trim();
  return trimmed.length >= 5 ? { version, reason: trimmed } : undefined;
}
