import type {
  ProviderApplicationData,
  ProviderApplicationState,
  ProviderApplicationStatusData,
  ProviderSubmitRequest,
  ProviderType,
  SupportedLocale
} from '@sadat-real-estate/contracts';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ApiClientError } from '../contracts/index.ts';
import { Button, StateMessage } from '../design_system/index.ts';
import { getProviderReviewCopy, type ProviderReviewCopy } from './review-copy.ts';
import './styles.css';

export interface ProviderReviewFlowClient {
  readonly getProviderApplication?: (() => Promise<ProviderApplicationData>) | undefined;
  readonly getProviderApplicationStatus?: (() => Promise<ProviderApplicationStatusData>) | undefined;
  readonly submitProviderApplication?: ((input: ProviderSubmitRequest) => Promise<ProviderApplicationData>) | undefined;
  readonly refresh?: (() => Promise<unknown>) | undefined;
}

export interface ProviderReviewPageProps {
  readonly client: ProviderReviewFlowClient;
  readonly locale: SupportedLocale;
  readonly providerType?: ProviderType | undefined;
  readonly initialApplication?: ProviderApplicationData | undefined;
  readonly onBack: () => void;
  readonly onEdit?: ((application: ProviderApplicationData) => void) | undefined;
}

type LoadState = 'loading' | 'ready' | 'error' | 'retry' | 'permission';
type ActionState = 'idle' | 'loading' | 'success' | 'error' | 'retry';

interface ReviewUiError {
  readonly state: 'error' | 'retry' | 'permission';
  readonly title: string;
  readonly message: string;
}

function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiClientError
    ? error.status === 401 || error.status === 403
    : typeof error === 'object' && error !== null && 'status' in error
      && ((error as { readonly status?: unknown }).status === 401 || (error as { readonly status?: unknown }).status === 403);
}

function toReviewError(error: unknown, copy: ProviderReviewCopy, submit = false): ReviewUiError {
  const code = error instanceof ApiClientError ? error.apiError?.code : undefined;
  const status = error instanceof ApiClientError
    ? error.status
    : typeof error === 'object' && error !== null && 'status' in error
      ? (error as { readonly status?: unknown }).status
      : undefined;
  if (code === 'PROVIDER_APPLICATION_NOT_FOUND' || (error instanceof ApiClientError && error.status === 404)) {
    return { state: 'permission', title: copy.notFoundTitle, message: copy.notFoundBody };
  }
  if (code === 'PROVIDER_APPLICATION_NOT_EDITABLE' || (error instanceof ApiClientError && error.status === 403)) {
    return { state: 'permission', title: copy.permissionTitle, message: copy.permissionBody };
  }
  if (code === 'PROVIDER_APPLICATION_INCOMPLETE' || code === 'PROVIDER_APPLICATION_VERSION_CONFLICT') {
    return { state: 'retry', title: copy.submitUnavailableTitle, message: copy.submitUnavailableBody };
  }
  if ((error instanceof ApiClientError && error.code === 'NETWORK_ERROR') || status === 503 || status === 429) {
    return { state: 'retry', title: copy.networkTitle, message: copy.networkBody };
  }
  return submit
    ? { state: 'error', title: copy.submitUnavailableTitle, message: copy.submitUnavailableBody }
    : { state: 'error', title: copy.unavailableTitle, message: copy.unavailableBody };
}

function formatDate(value: string | undefined, locale: SupportedLocale): string | undefined {
  if (value === undefined) return undefined;
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  } catch {
    return value;
  }
}

function organizationName(application: ProviderApplicationData): string | undefined {
  return application.providerType === 'brokerage_office'
    ? application.legalBusinessName ?? application.tradeName
    : application.providerType === 'developer_company'
      ? application.legalCompanyName ?? application.brandName
      : application.displayName;
}

function organizationAddress(application: ProviderApplicationData): string | undefined {
  return application.providerType === 'brokerage_office'
    ? application.businessAddress
    : application.providerType === 'developer_company'
      ? application.headOfficeAddress
      : undefined;
}

function PageFrame({
  locale,
  screenId,
  state,
  status,
  children
}: {
  readonly locale: SupportedLocale;
  readonly screenId: string;
  readonly state: LoadState | 'ready';
  readonly status?: ProviderApplicationState | undefined;
  readonly children: ReactNode;
}) {
  return (
    <section
      className="auth-page provider-review-page"
      data-testid="provider-review"
      data-screen-id={screenId}
      data-state={state}
      data-application-status={status}
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
    >
      {children}
    </section>
  );
}

function Progress({ copy }: { readonly copy: ProviderReviewCopy }) {
  return (
    <div className="provider-account-progress" aria-label={copy.stepLabel}>
      <span className="provider-account-progress__item provider-account-progress__item--complete">1</span>
      <span className="provider-account-progress__line provider-account-progress__line--complete" aria-hidden="true" />
      <span className="provider-account-progress__item provider-account-progress__item--complete">2</span>
      <span className="provider-account-progress__line provider-account-progress__line--complete" aria-hidden="true" />
      <span className="provider-account-progress__item provider-account-progress__item--complete">3</span>
      <span className="provider-account-progress__line provider-account-progress__line--complete" aria-hidden="true" />
      <span className="provider-account-progress__item provider-account-progress__item--complete">4</span>
      <span className="provider-account-progress__line provider-account-progress__line--complete" aria-hidden="true" />
      <span className="provider-account-progress__item provider-account-progress__item--active">5</span>
    </div>
  );
}

function Detail({ label, value }: { readonly label: string; readonly value: string | undefined }) {
  if (value === undefined || value.trim() === '') return null;
  return (
    <div className="provider-review-detail">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function ApplicationSummary({ application, copy }: { readonly application: ProviderApplicationData; readonly copy: ProviderReviewCopy }) {
  return (
    <section className="provider-review-section" aria-labelledby="provider-review-details-title">
      <h2 id="provider-review-details-title">{copy.applicationDetailsTitle}</h2>
      <dl className="provider-review-details">
        <Detail label={copy.applicationNumberLabel} value={application.id} />
        <Detail label={copy.providerTypeLabel} value={copy.providerTypeLabels[application.providerType]} />
        <Detail label={copy.phoneLabel} value={application.phone} />
        <Detail label={copy.emailLabel} value={application.email} />
        <Detail label={copy.accountOwnerLabel} value={application.accountOwnerFullName} />
        <Detail label={copy.displayNameLabel} value={application.displayName} />
        <Detail label={copy.organizationLabel} value={organizationName(application)} />
        <Detail label={copy.addressLabel} value={organizationAddress(application)} />
      </dl>
    </section>
  );
}

function MissingList({ application, copy }: { readonly application: ProviderApplicationData; readonly copy: ProviderReviewCopy }) {
  const complete = application.missingFields.length === 0 && application.missingDocuments.length === 0;
  return (
    <section className="provider-review-section" aria-labelledby="provider-review-documents-title">
      <h2 id="provider-review-documents-title">{copy.documentsTitle}</h2>
      <p className="provider-review-status" data-complete={complete}>{complete ? copy.documentsCompleteLabel : copy.documentsIncompleteLabel}</p>
      {!complete ? (
        <div className="provider-review-missing">
          {application.missingFields.length === 0 ? null : (
            <div>
              <strong>{copy.missingFieldsLabel}</strong>
              <ul>{application.missingFields.map(field => <li key={field}>{field}</li>)}</ul>
            </div>
          )}
          {application.missingDocuments.length === 0 ? null : (
            <div>
              <strong>{copy.missingDocumentsLabel}</strong>
              <ul>{application.missingDocuments.map(document => <li key={document}>{document}</li>)}</ul>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}

function ApplicationMeta({ application, copy, locale }: { readonly application: ProviderApplicationData; readonly copy: ProviderReviewCopy; readonly locale: SupportedLocale }) {
  return (
    <dl className="provider-review-meta">
      <Detail label={copy.applicationNumberLabel} value={application.id} />
      <Detail label={copy.statusLabel} value={copy.statusLabels[application.status]} />
      <Detail label={copy.submittedAtLabel} value={formatDate(application.submittedAt, locale)} />
      <Detail label={copy.updatedAtLabel} value={formatDate(application.updatedAt, locale)} />
    </dl>
  );
}

function TrackingTimeline({ application, copy }: { readonly application: ProviderApplicationData; readonly copy: ProviderReviewCopy }) {
  const currentIndex = application.status === 'approved' || application.status === 'rejected' || application.status === 'suspended'
    ? 3
    : application.status === 'needs_information'
      ? 2
      : 1;
  const steps = [copy.submittedStep, copy.reviewStep, copy.informationStep, copy.decisionStep];
  return (
    <ol className="provider-review-timeline" aria-label={copy.trackingTitle}>
      {steps.map((step, index) => (
        <li key={step} className={index <= currentIndex ? 'provider-review-timeline__item provider-review-timeline__item--complete' : 'provider-review-timeline__item'} data-current={index === currentIndex}>
          <span aria-hidden="true">{index + 1}</span>
          <strong>{step}</strong>
          {index === currentIndex ? <small>{copy.currentStepLabel}</small> : null}
        </li>
      ))}
    </ol>
  );
}

function ReviewDraft({
  application,
  copy,
  locale,
  submitState,
  submitError,
  onSubmit,
  onBack
}: {
  readonly application: ProviderApplicationData;
  readonly copy: ProviderReviewCopy;
  readonly locale: SupportedLocale;
  readonly submitState: ActionState;
  readonly submitError?: ReviewUiError | undefined;
  readonly onSubmit: () => void;
  readonly onBack: () => void;
}) {
  const complete = application.missingFields.length === 0 && application.missingDocuments.length === 0;
  return (
    <PageFrame locale={locale} screenId="AUTH-13" state="ready" status={application.status}>
      <div className="auth-card auth-card--form provider-review-card">
        <header className="auth-card__heading provider-review-card__heading">
          <span className="auth-card__icon provider-organization-card__step" aria-hidden="true">5</span>
          <p className="provider-organization-card__step-label">{copy.stepLabel}</p>
          <h1>{copy.title}</h1>
          <p>{copy.description}</p>
        </header>
        <div className="auth-card__body provider-review-card__body">
          <Progress copy={copy} />
          <aside className="provider-account-guidance" role="note"><strong>{copy.reviewTitle}</strong><span>{copy.reviewBody}</span></aside>
          {submitError === undefined ? null : <StateMessage state={submitError.state} title={submitError.title} message={submitError.message} retryLabel={copy.retryAction} onRetry={submitError.state === 'retry' ? onSubmit : undefined} />}
          <ApplicationSummary application={application} copy={copy} />
          <MissingList application={application} copy={copy} />
          {!complete ? <StateMessage state="empty" title={copy.submitUnavailableTitle} message={copy.submitUnavailableBody} /> : null}
          <div className="provider-review-card__footer">
            <Button type="button" variant="ghost" onClick={onBack}>{copy.backAction}</Button>
            <Button type="button" data-testid="provider-review-submit" variant="primary" loading={submitState === 'loading'} disabled={!complete || submitState === 'loading'} onClick={onSubmit}>
              {submitState === 'loading' ? copy.submittingAction : copy.submitAction}
            </Button>
          </div>
          <aside className="provider-documents-privacy" role="note"><strong>{copy.privacyNote}</strong></aside>
        </div>
      </div>
    </PageFrame>
  );
}

function UnderReview({ application, copy, locale, tracking, onTrack, onRefresh, refreshing, refreshError, onBack }: {
  readonly application: ProviderApplicationData;
  readonly copy: ProviderReviewCopy;
  readonly locale: SupportedLocale;
  readonly tracking: boolean;
  readonly onTrack: () => void;
  readonly onRefresh: () => void;
  readonly refreshing: boolean;
  readonly refreshError?: ReviewUiError | undefined;
  readonly onBack: () => void;
}) {
  if (tracking) {
    return (
      <PageFrame locale={locale} screenId="AUTH-15" state="ready" status={application.status}>
        <div className="auth-card auth-card--form provider-review-card">
          <header className="auth-card__heading provider-review-card__heading"><p className="provider-organization-card__step-label">{copy.trackingTitle}</p><h1>{copy.trackingTitle}</h1><p>{copy.underReviewBody}</p></header>
          <div className="auth-card__body provider-review-card__body">
            {refreshError === undefined ? null : <StateMessage state={refreshError.state} title={refreshError.title} message={refreshError.message} retryLabel={copy.retryAction} onRetry={refreshError.state === 'retry' ? onRefresh : undefined} />}
            <ApplicationMeta application={application} copy={copy} locale={locale} />
            <TrackingTimeline application={application} copy={copy} />
            <div className="provider-review-card__footer">
              <Button type="button" data-testid="provider-review-refresh" variant="secondary" loading={refreshing} onClick={onRefresh}>{copy.retryAction}</Button>
              <Button type="button" variant="ghost" onClick={onBack}>{copy.backAction}</Button>
            </div>
            <aside className="provider-documents-privacy" role="note"><strong>{copy.privacyNote}</strong></aside>
          </div>
        </div>
      </PageFrame>
    );
  }
  return (
    <PageFrame locale={locale} screenId="AUTH-14" state="ready" status={application.status}>
      <div className="auth-card auth-card--form provider-review-card">
        <header className="auth-card__heading provider-review-card__heading"><p className="provider-organization-card__step-label">{copy.statusLabels.pending_review}</p><h1>{copy.underReviewTitle}</h1><p>{copy.underReviewBody}</p></header>
        <div className="auth-card__body provider-review-card__body">
          <div className="provider-review-status-mark" aria-hidden="true">✓</div>
          <ApplicationMeta application={application} copy={copy} locale={locale} />
          <Button type="button" data-testid="provider-review-track" variant="secondary" onClick={onTrack}>{copy.trackingAction}</Button>
          <Button type="button" variant="ghost" onClick={onBack}>{copy.backAction}</Button>
          <aside className="provider-documents-privacy" role="note"><strong>{copy.privacyNote}</strong></aside>
        </div>
      </div>
    </PageFrame>
  );
}

function NeedsInformation({ application, copy, locale, onEdit, onBack }: {
  readonly application: ProviderApplicationData;
  readonly copy: ProviderReviewCopy;
  readonly locale: SupportedLocale;
  readonly onEdit: () => void;
  readonly onBack: () => void;
}) {
  return (
    <PageFrame locale={locale} screenId="AUTH-16" state="ready" status={application.status}>
      <div className="auth-card auth-card--form provider-review-card">
        <header className="auth-card__heading provider-review-card__heading"><p className="provider-organization-card__step-label">{copy.statusLabels.needs_information}</p><h1>{copy.needsInformationTitle}</h1><p>{copy.needsInformationBody}</p></header>
        <div className="auth-card__body provider-review-card__body">
          <div className="provider-review-status-mark provider-review-status-mark--warning" aria-hidden="true">!</div>
          <ApplicationMeta application={application} copy={copy} locale={locale} />
          {application.reviewReason === undefined ? null : <aside className="provider-account-guidance" role="note"><strong>{copy.reviewReasonLabel}</strong><span>{application.reviewReason}</span></aside>}
          <MissingList application={application} copy={copy} />
          <div className="provider-review-card__footer">
            {application.availableActions.includes('edit_account') || application.availableActions.includes('edit_business') || application.availableActions.includes('edit_company')
              ? <Button type="button" data-testid="provider-review-edit" variant="primary" onClick={onEdit}>{copy.editApplicationAction}</Button>
              : null}
            <Button type="button" variant="ghost" onClick={onBack}>{copy.backAction}</Button>
          </div>
          <aside className="provider-documents-privacy" role="note"><strong>{copy.privacyNote}</strong></aside>
        </div>
      </div>
    </PageFrame>
  );
}

function Approved({ application, copy, locale, onBack }: { readonly application: ProviderApplicationData; readonly copy: ProviderReviewCopy; readonly locale: SupportedLocale; readonly onBack: () => void }) {
  return (
    <PageFrame locale={locale} screenId="AUTH-17" state="ready" status={application.status}>
      <div className="auth-card auth-card--form provider-review-card">
        <header className="auth-card__heading provider-review-card__heading"><p className="provider-organization-card__step-label">{copy.statusLabels.approved}</p><h1>{copy.approvedTitle}</h1><p>{copy.approvedBody}</p></header>
        <div className="auth-card__body provider-review-card__body">
          <div className="provider-review-status-mark provider-review-status-mark--success" aria-hidden="true">✓</div>
          <ApplicationMeta application={application} copy={copy} locale={locale} />
          <div className="provider-review-card__footer">
            {application.availableActions.includes('open_dashboard') ? <a data-testid="provider-review-dashboard" className="ui-button ui-button--primary ui-button--md" href="/provider"><span className="ui-button__label">{copy.openDashboardAction}</span></a> : null}
            <Button type="button" variant="ghost" onClick={onBack}>{copy.backAction}</Button>
          </div>
          <aside className="provider-documents-privacy" role="note"><strong>{copy.privacyNote}</strong></aside>
        </div>
      </div>
    </PageFrame>
  );
}

function Restricted({ application, copy, locale, onBack }: { readonly application: ProviderApplicationData; readonly copy: ProviderReviewCopy; readonly locale: SupportedLocale; readonly onBack: () => void }) {
  const approved = application.status === 'approved';
  const suspended = application.status === 'suspended';
  const title = suspended ? copy.suspendedTitle : copy.rejectedTitle;
  const body = suspended ? copy.suspendedBody : copy.rejectedBody;
  return (
    <PageFrame locale={locale} screenId="AUTH-16" state="ready" status={application.status}>
      <div className="auth-card auth-card--form provider-review-card">
        <header className="auth-card__heading provider-review-card__heading"><p className="provider-organization-card__step-label">{copy.statusLabels[application.status]}</p><h1>{title}</h1><p>{body}</p></header>
        <div className="auth-card__body provider-review-card__body">
          <div className={`provider-review-status-mark ${approved ? 'provider-review-status-mark--success' : 'provider-review-status-mark--warning'}`} aria-hidden="true">!</div>
          <ApplicationMeta application={application} copy={copy} locale={locale} />
          {application.reviewReason === undefined ? null : <aside className="provider-account-guidance" role="note"><strong>{copy.reviewReasonLabel}</strong><span>{application.reviewReason}</span></aside>}
          <Button type="button" variant="ghost" onClick={onBack}>{copy.backAction}</Button>
          <aside className="provider-documents-privacy" role="note"><strong>{copy.privacyNote}</strong></aside>
        </div>
      </div>
    </PageFrame>
  );
}

export function ProviderReviewPage({ client, locale, providerType, initialApplication, onBack, onEdit }: ProviderReviewPageProps) {
  const copy = useMemo(() => getProviderReviewCopy(locale), [locale]);
  const [application, setApplication] = useState<ProviderApplicationData | undefined>(initialApplication);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [loadError, setLoadError] = useState<ReviewUiError | undefined>();
  const [actionState, setActionState] = useState<ActionState>('idle');
  const [actionError, setActionError] = useState<ReviewUiError | undefined>();
  const [showTracking, setShowTracking] = useState(false);

  const loadApplication = useCallback(async () => {
    setLoadState('loading');
    setLoadError(undefined);
    try {
      let nextApplication: ProviderApplicationData;
      if (client.getProviderApplication === undefined) {
        if (initialApplication === undefined) {
          setLoadState('ready');
          setApplication(undefined);
          return;
        }
        nextApplication = initialApplication;
      } else {
        try {
          nextApplication = await client.getProviderApplication();
        } catch (requestError: unknown) {
          if (!isUnauthorized(requestError) || client.refresh === undefined) throw requestError;
          await client.refresh();
          nextApplication = await client.getProviderApplication();
        }
      }
      if (providerType !== undefined && nextApplication.providerType !== providerType) {
        setLoadState('permission');
        setLoadError({ state: 'permission', title: copy.permissionTitle, message: copy.permissionBody });
        return;
      }
      setApplication(nextApplication);
      setShowTracking(false);
      setLoadState('ready');
    } catch (requestError: unknown) {
      const nextError = toReviewError(requestError, copy);
      setLoadState(nextError.state);
      setLoadError(nextError);
    }
  }, [client, copy, initialApplication, providerType]);

  useEffect(() => {
    void loadApplication();
  }, [loadApplication]);

  const mergeStatus = useCallback((current: ProviderApplicationData, status: ProviderApplicationStatusData): ProviderApplicationData => ({
    ...current,
    status: status.status,
    version: status.version,
    submittedAt: status.submittedAt,
    reviewReason: status.reviewReason,
    availableActions: status.availableActions
  }), []);

  const refreshStatus = useCallback(async () => {
    if (client.getProviderApplicationStatus === undefined) {
      await loadApplication();
      return;
    }
    setActionState('loading');
    setActionError(undefined);
    try {
      const status = await client.getProviderApplicationStatus();
      setApplication(current => current === undefined || current.id !== status.applicationId ? current : mergeStatus(current, status));
      setActionState('success');
    } catch (requestError: unknown) {
      const nextError = toReviewError(requestError, copy);
      setActionState(nextError.state === 'permission' ? 'error' : nextError.state);
      setActionError(nextError);
    }
  }, [client, copy, loadApplication, mergeStatus]);

  const submit = useCallback(async () => {
    if (application === undefined || client.submitProviderApplication === undefined) {
      setActionState('error');
      setActionError({ state: 'error', title: copy.submitUnavailableTitle, message: copy.submitUnavailableBody });
      return;
    }
    if (application.missingFields.length > 0 || application.missingDocuments.length > 0 || !application.availableActions.includes('submit')) {
      setActionState('error');
      setActionError({ state: 'error', title: copy.submitUnavailableTitle, message: copy.submitUnavailableBody });
      return;
    }
    setActionState('loading');
    setActionError(undefined);
    try {
      const nextApplication = await client.submitProviderApplication({ version: application.version });
      setApplication(nextApplication);
      setShowTracking(false);
      setActionState('success');
    } catch (requestError: unknown) {
      const nextError = toReviewError(requestError, copy, true);
      setActionState(nextError.state === 'permission' ? 'error' : nextError.state);
      setActionError(nextError);
    }
  }, [application, client, copy]);

  if (loadState === 'loading') {
    return <PageFrame locale={locale} screenId="AUTH-13" state="loading"><div className="auth-card auth-card--form provider-review-card"><div className="provider-account-state"><StateMessage state="loading" title={copy.title} message={copy.description} /></div></div></PageFrame>;
  }

  if (loadState !== 'ready') {
    return (
      <PageFrame locale={locale} screenId="AUTH-13" state={loadState}>
        <div className="auth-card auth-card--form provider-review-card"><div className="provider-account-state">
          {loadError === undefined ? null : <StateMessage state={loadError.state} title={loadError.title} message={loadError.message} retryLabel={copy.retryAction} onRetry={loadError.state === 'retry' ? () => void loadApplication() : undefined} />}
          <Button type="button" variant="ghost" onClick={onBack}>{copy.backAction}</Button>
        </div></div>
      </PageFrame>
    );
  }

  if (application === undefined) {
    return <PageFrame locale={locale} screenId="AUTH-13" state="ready"><div className="auth-card auth-card--form provider-review-card"><div className="provider-account-state"><StateMessage state="empty" title={copy.emptyTitle} message={copy.emptyBody} /><Button type="button" variant="ghost" onClick={onBack}>{copy.backAction}</Button></div></div></PageFrame>;
  }

  if (application.status === 'draft') {
    return <ReviewDraft application={application} copy={copy} locale={locale} submitState={actionState} submitError={actionError} onSubmit={() => void submit()} onBack={onBack} />;
  }
  if (application.status === 'pending_review') {
    return <UnderReview application={application} copy={copy} locale={locale} tracking={showTracking} onTrack={() => setShowTracking(true)} onRefresh={() => void refreshStatus()} refreshing={actionState === 'loading'} refreshError={actionError} onBack={onBack} />;
  }
  if (application.status === 'needs_information') {
    return <NeedsInformation application={application} copy={copy} locale={locale} onEdit={() => onEdit?.(application)} onBack={onBack} />;
  }
  if (application.status === 'approved') {
    return <Approved application={application} copy={copy} locale={locale} onBack={onBack} />;
  }
  return <Restricted application={application} copy={copy} locale={locale} onBack={onBack} />;
}
