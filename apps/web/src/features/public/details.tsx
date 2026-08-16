import { useEffect, useState, type FormEvent } from 'react';
import type {
  PublicPropertyDetails as PublicPropertyDetailsData,
  PublicPropertyMedia,
  SupportedLocale
} from '@sadat-real-estate/contracts';
import { ApiClientError } from '../contracts/index.ts';
import { Badge, Button, Modal, PropertyCard } from '../design_system/index.ts';
import { UxStateView, type UxState } from '../ux_states/index.ts';
import { getPublicHomepageCopy } from './copy.ts';
import { PublicSiteHeader } from './components.tsx';
import {
  defaultPublicPropertyDetailsActions,
  defaultPublicPropertyDetailsLoader,
  propertyDetailsSlugFromUrl,
  type PublicContactRequestInput,
  type PublicPropertyDetailsActions,
  type PublicPropertyDetailsLoader
} from './details-data.ts';
import { getPublicPropertyDetailsCopy, type PublicPropertyDetailsCopy } from './details-copy.ts';
import { formatArea, formatMoney, localizedText } from './model.ts';
import './details.css';

export type PublicPropertyDetailsInitialState = 'loading' | 'retry' | 'not_found';
export type PublicPropertyDetailsViewState = Extract<UxState, 'loading' | 'empty' | 'error' | 'retry' | 'success' | 'permission'> | 'not_found';

export interface PublicPropertyDetailsProps {
  readonly url?: string | undefined;
  readonly locale: SupportedLocale;
  readonly initialData?: PublicPropertyDetailsData | undefined;
  readonly initialState?: PublicPropertyDetailsInitialState | undefined;
  readonly load?: PublicPropertyDetailsLoader | undefined;
  readonly actions?: PublicPropertyDetailsActions | undefined;
}

function errorState(error: unknown): PublicPropertyDetailsViewState {
  if (error instanceof ApiClientError && error.status === 404) return 'not_found';
  if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) return 'permission';
  if (error instanceof ApiClientError && error.code === 'NETWORK_ERROR') return 'retry';
  return 'error';
}

function stateCopy(
  state: Exclude<PublicPropertyDetailsViewState, 'success' | 'not_found'>,
  copy: PublicPropertyDetailsCopy
): { readonly title: string; readonly body: string } {
  switch (state) {
    case 'loading': return { title: copy.loadingTitle, body: copy.loadingBody };
    case 'empty': return { title: copy.emptyTitle, body: copy.emptyBody };
    case 'error': return { title: copy.errorTitle, body: copy.errorBody };
    case 'retry': return { title: copy.retryTitle, body: copy.retryBody };
    case 'permission': return { title: copy.permissionTitle, body: copy.permissionBody };
  }
}

function returnToUrl(url: string | undefined): string {
  if (url !== undefined) return url;
  if (typeof window !== 'undefined') return `${window.location.pathname}${window.location.search}`;
  return '/properties';
}

function loginUrl(url: string | undefined): string {
  return `/auth/login?returnTo=${encodeURIComponent(returnToUrl(url))}`;
}

function Footer({ locale }: { readonly locale: SupportedLocale }) {
  const homepageCopy = getPublicHomepageCopy(locale);
  return (
    <footer className="public-homepage__footer public-property-details__footer">
      <div>
        <p className="public-homepage__eyebrow">{homepageCopy.brand}</p>
        <p>{homepageCopy.footerDescription}</p>
      </div>
      <div>
        <p className="public-homepage__footer-title">{homepageCopy.footerLinks}</p>
        <div className="public-homepage__footer-links">
          <a href="/">{homepageCopy.nav.home}</a>
          <a href="/properties">{homepageCopy.nav.properties}</a>
          <a href="/developers">{homepageCopy.nav.developers}</a>
          <a href="/about">{homepageCopy.nav.about}</a>
        </div>
      </div>
    </footer>
  );
}

function StateNotice({
  state,
  copy,
  url,
  onRetry
}: {
  readonly state: Exclude<PublicPropertyDetailsViewState, 'success' | 'not_found'>;
  readonly copy: PublicPropertyDetailsCopy;
  readonly url?: string | undefined;
  readonly onRetry: () => void;
}) {
  const text = stateCopy(state, copy);
  return (
    <UxStateView
      className="public-property-details__state"
      state={state}
      title={text.title}
      message={text.body}
      retryLabel={copy.retryLabel}
      onRetry={onRetry}
    >
      {state === 'empty' || state === 'error' ? <button type="button" onClick={onRetry}>{copy.retryLabel}</button> : null}
      {state === 'permission' ? <a href="/" className="public-property-details__state-link">{copy.permissionLink}</a> : null}
      {state === 'permission' ? <a href={loginUrl(url)} className="public-property-details__state-link">{copy.actionPermissionLink}</a> : null}
    </UxStateView>
  );
}

function NotFoundNotice({ copy }: { readonly copy: PublicPropertyDetailsCopy }) {
  return (
    <section className="public-property-details__state" data-state="error" data-details-not-found="true" role="alert">
      <h1>{copy.notFoundTitle}</h1>
      <p>{copy.notFoundBody}</p>
      <a className="public-property-details__state-link" href="/properties">{copy.notFoundLink}</a>
    </section>
  );
}

function Gallery({
  media,
  copy
}: {
  readonly media: readonly PublicPropertyMedia[];
  readonly copy: PublicPropertyDetailsCopy;
}) {
  const [selectedId, setSelectedId] = useState<string | undefined>(media[0]?.id);
  const selected = media.find(item => item.id === selectedId) ?? media[0];

  useEffect(() => {
    setSelectedId(media[0]?.id);
  }, [media]);

  return (
    <section className="public-property-details__gallery" aria-labelledby="public-property-details-gallery-title" data-gallery="true">
      <h2 id="public-property-details-gallery-title" className="public-property-details__visually-hidden">{copy.galleryTitle}</h2>
      <div className="public-property-details__gallery-main">
        <UxStateView
          state="missing_image"
          title={copy.imageUnavailable}
          message={selected?.kind === 'floor_plan' ? copy.mediaUnavailable : undefined}
        />
      </div>
      {media.length > 0 ? (
        <div className="public-property-details__gallery-thumbnails" role="list" aria-label={copy.galleryTitle}>
          {media.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={item.id === selected?.id ? 'is-selected' : undefined}
              aria-label={copy.mediaItem(index + 1)}
              aria-pressed={item.id === selected?.id}
              onClick={() => setSelectedId(item.id)}
              role="listitem"
            >
              <span aria-hidden="true">{index + 1}</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="public-property-details__media-note">{copy.mediaUnavailable}</p>
      )}
    </section>
  );
}

function PropertySummary({
  data,
  locale,
  copy
}: {
  readonly data: PublicPropertyDetailsData;
  readonly locale: SupportedLocale;
  readonly copy: PublicPropertyDetailsCopy;
}) {
  const title = localizedText(data.name, locale) ?? data.slug;
  const facts = [
    ...(data.area === undefined ? [] : [{ label: copy.area, value: formatArea(data.area, locale, copy.sqm) ?? '—' }]),
    ...(data.layout?.bedrooms === undefined ? [] : [{ label: copy.bedrooms, value: String(data.layout.bedrooms) }]),
    ...(data.layout?.bathrooms === undefined ? [] : [{ label: copy.bathrooms, value: String(data.layout.bathrooms) }]),
    ...(data.layout?.floor === undefined ? [] : [{ label: copy.floor, value: String(data.layout.floor) }])
  ];

  return (
    <section className="public-property-details__card public-property-details__summary" aria-labelledby="public-property-details-title">
      <div className="public-property-details__badges">
        <Badge tone="gold">{data.transactionType === 'sale' ? copy.sale : copy.rent}</Badge>
        <Badge tone="neutral">{data.kind === 'property' ? copy.property : copy.unit}</Badge>
      </div>
      <p className="public-property-details__location">{copy.code}: {data.slug}</p>
      <h1 id="public-property-details-title">{title}</h1>
      {data.price === undefined ? null : <p className="public-property-details__price">{formatMoney(data.price, locale)}</p>}
      {facts.length === 0 ? null : (
        <dl className="public-property-details__facts">
          {facts.map(fact => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}
        </dl>
      )}
    </section>
  );
}

function SourceAndProject({
  data,
  locale,
  copy
}: {
  readonly data: PublicPropertyDetailsData;
  readonly locale: SupportedLocale;
  readonly copy: PublicPropertyDetailsCopy;
}) {
  const projectName = data.project === null ? undefined : localizedText(data.project.name, locale);
  const projectDescription = data.project === null ? undefined : localizedText(data.project.description, locale);
  return (
    <>
      <section className="public-property-details__card public-property-details__source" aria-labelledby="public-property-details-source-title">
        <div>
          <p className="public-property-details__eyebrow">{copy.publishedSource}</p>
          <h2 id="public-property-details-source-title">{copy.sourceTitle}</h2>
          <p>{copy.sourceTypes[data.source.sourceType]}</p>
        </div>
        <Badge tone="success">{copy.publishedSource}</Badge>
      </section>
      <section className="public-property-details__card public-property-details__project" aria-labelledby="public-property-details-project-title">
        <h2 id="public-property-details-project-title">{copy.projectTitle}</h2>
        {data.project === null || projectName === undefined ? <p>{copy.projectUnavailable}</p> : (
          <>
            <h3>{projectName}</h3>
            {projectDescription === undefined ? null : <p><strong>{copy.projectDescription}:</strong> {projectDescription}</p>}
            <p className="public-property-details__project-slug">{data.project.slug}</p>
          </>
        )}
      </section>
    </>
  );
}

function Description({
  data,
  locale,
  copy
}: {
  readonly data: PublicPropertyDetailsData;
  readonly locale: SupportedLocale;
  readonly copy: PublicPropertyDetailsCopy;
}) {
  const description = localizedText(data.description, locale);
  return (
    <section className="public-property-details__card public-property-details__description" aria-labelledby="public-property-details-description-title">
      <h2 id="public-property-details-description-title">{copy.descriptionTitle}</h2>
      {description === undefined ? <p>{copy.noDescription}</p> : <p data-text-wrap="safe">{description}</p>}
    </section>
  );
}

function RelatedProperties({
  properties,
  locale,
  copy
}: {
  readonly properties: PublicPropertyDetailsData['relatedProperties'];
  readonly locale: SupportedLocale;
  readonly copy: PublicPropertyDetailsCopy;
}) {
  if (properties.length === 0) return null;
  return (
    <section className="public-property-details__related" aria-labelledby="public-property-details-related-title">
      <h2 id="public-property-details-related-title">{copy.relatedTitle}</h2>
      <div className="public-property-details__related-grid">
        {properties.map(property => (
          <PropertyCard
            key={property.id}
            title={localizedText(property.name, locale) ?? property.slug}
            href={`/properties/${property.slug}`}
            price={formatMoney(property.price, locale)}
            badges={[property.transactionType === 'sale' ? copy.sale : copy.rent]}
            image={<UxStateView state="missing_image" title={copy.imageUnavailable} />}
            imageAlt={copy.imageUnavailable}
          />
        ))}
      </div>
    </section>
  );
}

type ActionState = 'idle' | 'submitting' | 'success' | 'permission' | 'error';

function ActionFeedback({
  state,
  copy,
  url
}: {
  readonly state: Exclude<ActionState, 'idle' | 'submitting'>;
  readonly copy: PublicPropertyDetailsCopy;
  readonly url?: string | undefined;
}) {
  if (state === 'success') {
    return <UxStateView state="success" title={copy.actionSuccessTitle} message={copy.actionSuccessBody} />;
  }
  if (state === 'permission') {
    return <UxStateView state="permission" title={copy.actionPermissionTitle} message={copy.actionPermissionBody}><a href={loginUrl(url)}>{copy.actionPermissionLink}</a></UxStateView>;
  }
  return <UxStateView state="error" title={copy.actionErrorTitle} message={copy.actionErrorBody}><button type="button">{copy.retryLabel}</button></UxStateView>;
}

function RequestPanel({
  data,
  locale,
  copy,
  url,
  actions
}: {
  readonly data: PublicPropertyDetailsData;
  readonly locale: SupportedLocale;
  readonly copy: PublicPropertyDetailsCopy;
  readonly url?: string | undefined;
  readonly actions: PublicPropertyDetailsActions;
}) {
  const [message, setMessage] = useState('');
  const [contactValidation, setContactValidation] = useState(false);
  const [contactState, setContactState] = useState<ActionState>('idle');
  const [viewingOpen, setViewingOpen] = useState(false);
  const [requestedAt, setRequestedAt] = useState('');
  const [timezone, setTimezone] = useState('');
  const [note, setNote] = useState('');
  const [viewingValidation, setViewingValidation] = useState(false);
  const [viewingState, setViewingState] = useState<ActionState>('idle');

  const submitContact = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedMessage = message.trim();
    if (trimmedMessage.length === 0) {
      setContactValidation(true);
      return;
    }
    setContactValidation(false);
    setContactState('submitting');
    const input: PublicContactRequestInput = {
      message: trimmedMessage,
      propertyId: data.id,
      ...(data.project?.id === undefined ? {} : { projectId: data.project.id }),
      locale
    };
    try {
      await actions.submitContact(input);
      setContactState('success');
      setMessage('');
    } catch (error) {
      setContactState(error instanceof ApiClientError && (error.status === 401 || error.status === 403) ? 'permission' : 'error');
    }
  };

  const submitViewing = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedDate = new Date(requestedAt);
    if (!requestedAt || !timezone.trim() || Number.isNaN(parsedDate.getTime()) || parsedDate.getTime() <= Date.now()) {
      setViewingValidation(true);
      return;
    }
    setViewingValidation(false);
    setViewingState('submitting');
    try {
      await actions.submitViewing({
        propertyId: data.id,
        requestedAt: parsedDate.toISOString(),
        timezone: timezone.trim(),
        ...(note.trim().length === 0 ? {} : { note: note.trim() })
      });
      setViewingState('success');
      setViewingOpen(false);
      setRequestedAt('');
      setTimezone('');
      setNote('');
    } catch (error) {
      setViewingState(error instanceof ApiClientError && (error.status === 401 || error.status === 403) ? 'permission' : 'error');
    }
  };

  return (
    <aside className="public-property-details__actions" aria-labelledby="public-property-details-contact-title">
      <section className="public-property-details__card public-property-details__contact">
        <h2 id="public-property-details-contact-title">{copy.contactTitle}</h2>
        <p>{copy.contactBody}</p>
        {contactState === 'success' || contactState === 'permission' || contactState === 'error' ? <ActionFeedback state={contactState} copy={copy} url={url} /> : null}
        <form aria-label={copy.contactTitle} onSubmit={submitContact}>
          <label htmlFor="public-property-contact-message">{copy.messageLabel}</label>
          <textarea
            id="public-property-contact-message"
            name="message"
            rows={5}
            required
            value={message}
            placeholder={copy.messagePlaceholder}
            onChange={event => setMessage(event.target.value)}
          />
          {contactValidation ? <p className="public-property-details__validation" role="alert">{copy.contactValidation}</p> : null}
          <Button type="submit" fullWidth loading={contactState === 'submitting'}>{contactState === 'submitting' ? copy.actionLoading : copy.submitContact}</Button>
        </form>
        <Button type="button" variant="secondary" fullWidth data-action="request-viewing" onClick={() => {
          setViewingState('idle');
          setViewingOpen(true);
        }}>{copy.requestViewing}</Button>
      </section>
      {viewingState === 'success' || viewingState === 'permission' || viewingState === 'error' ? <ActionFeedback state={viewingState} copy={copy} url={url} /> : null}
      <Modal
        open={viewingOpen}
        title={copy.viewingTitle}
        description={copy.viewingBody}
        closeLabel={copy.close}
        onClose={() => setViewingOpen(false)}
        footer={(
          <>
            <Button type="button" variant="ghost" onClick={() => setViewingOpen(false)}>{copy.cancel}</Button>
            <Button type="submit" form="public-property-viewing-form" loading={viewingState === 'submitting'}>{viewingState === 'submitting' ? copy.actionLoading : copy.submitViewing}</Button>
          </>
        )}
      >
        <form id="public-property-viewing-form" className="public-property-details__viewing-form" onSubmit={submitViewing}>
          <label htmlFor="public-property-viewing-requested-at">{copy.requestedAt}</label>
          <input id="public-property-viewing-requested-at" name="requestedAt" type="datetime-local" required value={requestedAt} onChange={event => setRequestedAt(event.target.value)} />
          <label htmlFor="public-property-viewing-timezone">{copy.timezone}</label>
          <input id="public-property-viewing-timezone" name="timezone" type="text" required placeholder={copy.timezonePlaceholder} value={timezone} onChange={event => setTimezone(event.target.value)} />
          <label htmlFor="public-property-viewing-note">{copy.note}</label>
          <textarea id="public-property-viewing-note" name="note" rows={4} placeholder={copy.notePlaceholder} value={note} onChange={event => setNote(event.target.value)} />
          {viewingValidation ? <p className="public-property-details__validation" role="alert">{copy.viewingValidation}</p> : null}
        </form>
      </Modal>
    </aside>
  );
}

function SuccessDetails({
  data,
  locale,
  copy,
  url,
  actions
}: {
  readonly data: PublicPropertyDetailsData;
  readonly locale: SupportedLocale;
  readonly copy: PublicPropertyDetailsCopy;
  readonly url?: string | undefined;
  readonly actions: PublicPropertyDetailsActions;
}) {
  return (
    <>
      <div className="public-property-details__content">
        <a className="public-property-details__back" href="/properties">{copy.backToResults}</a>
        <div className="public-property-details__layout">
          <div className="public-property-details__main-column">
            <Gallery media={data.media} copy={copy} />
            <PropertySummary data={data} locale={locale} copy={copy} />
            <SourceAndProject data={data} locale={locale} copy={copy} />
            <Description data={data} locale={locale} copy={copy} />
            <RelatedProperties properties={data.relatedProperties} locale={locale} copy={copy} />
          </div>
          <RequestPanel data={data} locale={locale} copy={copy} url={url} actions={actions} />
        </div>
      </div>
    </>
  );
}

export function PublicPropertyDetails({
  url,
  locale,
  initialData,
  initialState,
  load = defaultPublicPropertyDetailsLoader,
  actions = defaultPublicPropertyDetailsActions
}: PublicPropertyDetailsProps) {
  const copy = getPublicPropertyDetailsCopy(locale);
  const sourceUrl = url ?? (typeof window === 'undefined' ? '/' : window.location.href);
  const slug = propertyDetailsSlugFromUrl(sourceUrl);
  const initialView: PublicPropertyDetailsViewState = initialData !== undefined ? 'success' : initialState ?? 'loading';
  const [data, setData] = useState<PublicPropertyDetailsData | undefined>(initialData);
  const [view, setView] = useState<PublicPropertyDetailsViewState>(initialView);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (initialData !== undefined && attempt === 0) return;
    if (slug === undefined) {
      setView('not_found');
      return;
    }
    const controller = new AbortController();
    setView('loading');
    void load(slug, controller.signal)
      .then(nextData => {
        if (controller.signal.aborted) return;
        setData(nextData);
        setView('success');
      })
      .catch(error => {
        if (controller.signal.aborted || (error instanceof ApiClientError && error.code === 'ABORTED')) return;
        setView(errorState(error));
      });
    return () => controller.abort();
  }, [attempt, initialData, load, slug]);

  const retry = () => setAttempt(value => value + 1);

  return (
    <div className="public-property-details" data-page="public-property-details" data-details-state={view}>
      <PublicSiteHeader locale={locale} copy={getPublicHomepageCopy(locale)} activePath="/properties" />
      {view === 'success' && data !== undefined ? <SuccessDetails data={data} locale={locale} copy={copy} url={url} actions={actions} /> : view === 'not_found' ? <NotFoundNotice copy={copy} /> : <StateNotice state={view === 'success' ? 'empty' : view} copy={copy} url={url} onRetry={retry} />}
      <Footer locale={locale} />
    </div>
  );
}
