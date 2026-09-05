import {
  type ProviderApplicationData,
  type ProviderDocumentCategory,
  type ProviderDocumentData,
  type ProviderDocumentRequirement,
  type ProviderType,
  type SupportedLocale
} from '@sadat-real-estate/contracts';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiClientError } from '../contracts/index.ts';
import { Button, StateMessage } from '../design_system/index.ts';
import { missingRequiredDocumentCategories } from './completeness.ts';
import { getProviderDocumentsCopy, type ProviderDocumentsCopy } from './documents-copy.ts';
import './styles.css';
import { getProviderAccountCopy } from './account-copy.ts';

export interface ProviderDocumentsFlowClient {
  readonly getProviderApplication?: (() => Promise<ProviderApplicationData>) | undefined;
  readonly uploadProviderDocument?: ((category: ProviderDocumentCategory, file: File) => Promise<ProviderDocumentData>) | undefined;
  readonly deleteProviderDocument?: ((documentId: string) => Promise<{ readonly documentId: string; readonly deleted: true }>) | undefined;
  readonly refresh?: (() => Promise<unknown>) | undefined;
}

interface ProviderDocumentsPageProps {
  readonly client: ProviderDocumentsFlowClient;
  readonly locale: SupportedLocale;
  readonly providerType: ProviderType;
  readonly initialApplication?: ProviderApplicationData | undefined;
  readonly onBack: () => void;
  readonly onContinue?: ((application: ProviderApplicationData) => void) | undefined;
}

type LoadState = 'loading' | 'ready' | 'error' | 'retry' | 'permission';
type UploadState = 'idle' | 'loading' | 'success';

interface DocumentUiError {
  readonly state: 'error' | 'retry' | 'permission';
  readonly title: string;
  readonly message: string;
}

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png']);
const ALLOWED_EXTENSIONS = new Set(['.pdf', '.jpg', '.jpeg', '.png']);
const MIME_EXTENSIONS: Readonly<Record<'application/pdf' | 'image/jpeg' | 'image/png', readonly string[]>> = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png']
};

function extension(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot <= 0 ? '' : filename.slice(dot).toLowerCase();
}

function canEditDocuments(application: ProviderApplicationData, providerType: ProviderType): boolean {
  const action = providerType === 'brokerage_office'
    ? 'edit_business'
    : providerType === 'developer_company'
      ? 'edit_company'
      : 'edit_account';
  return application.availableActions.includes(action);
}

function isUnauthorized(error: unknown): boolean {
  if (error instanceof ApiClientError) return error.status === 401 || error.status === 403;
  return typeof error === 'object' && error !== null && 'status' in error && ((error as { status?: unknown }).status === 401 || (error as { status?: unknown }).status === 403);
}

function loadError(error: unknown, copy: ProviderDocumentsCopy): DocumentUiError {
  const code = error instanceof ApiClientError ? error.apiError?.code : undefined;
  if (code === 'PROVIDER_APPLICATION_NOT_FOUND' || (error instanceof ApiClientError && error.status === 404)) {
    return { state: 'permission', title: copy.notFoundTitle, message: copy.notFoundBody };
  }
  if (code === 'PROVIDER_APPLICATION_NOT_EDITABLE' || (error instanceof ApiClientError && error.status === 403)) {
    return { state: 'permission', title: copy.permissionTitle, message: copy.permissionBody };
  }
  if (error instanceof ApiClientError && (error.code === 'NETWORK_ERROR' || error.status === 503)) {
    return { state: 'retry', title: copy.networkTitle, message: copy.networkBody };
  }
  return { state: 'error', title: copy.unavailableTitle, message: copy.unavailableBody };
}

function uploadError(error: unknown, copy: ProviderDocumentsCopy): DocumentUiError {
  const code = error instanceof ApiClientError ? error.apiError?.code : undefined;
  if (code === 'FILE_TOO_LARGE') return { state: 'error', title: copy.fileTooLargeTitle, message: copy.fileTooLargeBody };
  if (code === 'FILE_TYPE_NOT_ALLOWED' || code === 'INVALID_FILE_SIGNATURE' || code === 'INVALID_FILENAME' || code === 'DOUBLE_EXTENSION_REJECTED') {
    return { state: 'error', title: copy.fileTypeTitle, message: copy.fileTypeBody };
  }
  if (code === 'PROVIDER_APPLICATION_NOT_EDITABLE' || (error instanceof ApiClientError && (error.status === 401 || error.status === 403))) {
    return { state: 'permission', title: copy.permissionTitle, message: copy.permissionBody };
  }
  if (error instanceof ApiClientError && (error.code === 'NETWORK_ERROR' || error.status === 503 || error.status === 429)) {
    return { state: 'retry', title: copy.networkTitle, message: copy.networkBody };
  }
  return { state: 'error', title: copy.uploadErrorTitle, message: copy.uploadErrorBody };
}

function reviewStateLabel(document: ProviderDocumentData, copy: ProviderDocumentsCopy): string {
  if (document.reviewState === 'pending_review') return copy.pendingReviewLabel;
  if (document.reviewState === 'needs_replacement') return copy.needsReplacementLabel;
  if (document.reviewState === 'approved') return copy.approvedLabel;
  if (document.reviewState === 'rejected') return copy.rejectedLabel;
  return copy.uploadedLabel;
}

function securityStateLabel(document: ProviderDocumentData, copy: ProviderDocumentsCopy): string {
  if (document.securityState === 'clean') return copy.securityCleanLabel;
  if (document.securityState === 'quarantined' || document.securityState === 'scan_pending') return copy.securityPendingLabel;
  return copy.securityFailedLabel;
}

function validateFile(file: File, copy: ProviderDocumentsCopy): DocumentUiError | undefined {
  if (file.size <= 0) return { state: 'error', title: copy.invalidFileTitle, message: copy.invalidFileBody };
  if (file.size > MAX_FILE_BYTES) return { state: 'error', title: copy.fileTooLargeTitle, message: copy.fileTooLargeBody };
  const filename = file.name.trim();
  const fileExtension = extension(filename);
  const mimeExtensions = MIME_EXTENSIONS[file.type as keyof typeof MIME_EXTENSIONS];
  const typeAllowed = file.type === ''
    ? ALLOWED_EXTENSIONS.has(fileExtension)
    : ALLOWED_MIME_TYPES.has(file.type) && mimeExtensions !== undefined && mimeExtensions.includes(fileExtension);
  const filenameAllowed = filename.length > 0
    && filename.length <= 120
    && !/[\\/\u0000-\u001f\u007f]/u.test(filename);
  if (!filenameAllowed || !typeAllowed) {
    return { state: 'error', title: copy.fileTypeTitle, message: copy.fileTypeBody };
  }
  return undefined;
}

function DocumentCard({
  requirement,
  document,
  uploadState,
  error,
  canEdit,
  copy,
  onFile,
  onDelete
}: {
  readonly requirement: ProviderDocumentRequirement;
  readonly document: ProviderDocumentData | undefined;
  readonly uploadState: UploadState;
  readonly error: DocumentUiError | undefined;
  readonly canEdit: boolean;
  readonly copy: ProviderDocumentsCopy;
  readonly onFile: (file: File | undefined) => void;
  readonly onDelete: () => void;
}) {
  const category = requirement.key;
  return (
    <article className="provider-document-card" data-testid={`provider-document-${category}`} data-category={category} data-upload-state={uploadState}>
      <header className="provider-document-card__heading">
        <div>
          <h2>{copy.categoryLabels[category]}</h2>
          <span className={`provider-document-card__classification provider-document-card__classification--${requirement.classification}`}>
            {requirement.classification === 'optional' ? copy.optionalLabel : copy.requiredLabel}
          </span>
        </div>
        {document === undefined ? null : <span className="provider-document-card__status" role="status">{reviewStateLabel(document, copy)}</span>}
      </header>
      {document === undefined ? null : (
        <div className="provider-document-card__file" data-testid={`provider-document-file-${category}`}>
          <strong>{document.originalFilename}</strong>
          <span>{Math.ceil(document.byteSize / 1024)} KB · {securityStateLabel(document, copy)}</span>
        </div>
      )}
      {error === undefined ? null : <StateMessage state={error.state} title={error.title} message={error.message} />}
      {canEdit ? (
        <div className="provider-document-card__actions">
          <label className="provider-document-upload" htmlFor={`provider-document-input-${category}`}>
            <span>{uploadState === 'loading' ? copy.uploadingAction : document === undefined ? copy.chooseFileAction : copy.replaceAction}</span>
            <input
              id={`provider-document-input-${category}`}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              disabled={uploadState === 'loading'}
              onChange={event => {
                onFile(event.currentTarget.files?.[0]);
                event.currentTarget.value = '';
              }}
              aria-label={`${document === undefined ? copy.chooseFileAction : copy.replaceAction}: ${copy.categoryLabels[category]}`}
            />
          </label>
          {document === undefined ? null : <Button type="button" variant="ghost" size="sm" onClick={onDelete} disabled={uploadState === 'loading'}>{copy.removeAction}</Button>}
        </div>
      ) : null}
    </article>
  );
}

export function ProviderDocumentsPage({ client, locale, providerType, initialApplication, onBack, onContinue }: ProviderDocumentsPageProps) {
  const copy = getProviderDocumentsCopy(locale);
  const [application, setApplication] = useState<ProviderApplicationData | undefined>(initialApplication);
  const [documents, setDocuments] = useState<Readonly<Record<string, ProviderDocumentData>>>({});
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [error, setError] = useState<DocumentUiError | undefined>();
  const [cardErrors, setCardErrors] = useState<Readonly<Record<string, DocumentUiError | undefined>>>({});
  const [uploadStates, setUploadStates] = useState<Readonly<Record<string, UploadState>>>({});

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
      setApplication(initialApplication);
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
      if (nextApplication.providerType !== providerType || !canEditDocuments(nextApplication, providerType)) {
        setApplication(nextApplication);
        setLoadState('permission');
        setError({ state: 'permission', title: copy.permissionTitle, message: copy.permissionBody });
        return;
      }
      setApplication(nextApplication);
      setLoadState('ready');
    } catch (requestError: unknown) {
      const nextError = loadError(requestError, copy);
      setLoadState(nextError.state);
      setError(nextError);
    }
  }, [client, copy, initialApplication, providerType]);

  useEffect(() => {
    void loadApplication();
  }, [loadApplication]);

  const requirements = useMemo(() => application?.requirementsSnapshot?.requirements.filter(requirement => requirement.applies) ?? [], [application]);

  const upload = useCallback(async (category: ProviderDocumentCategory, file: File | undefined) => {
    if (file === undefined) return;
    const validationError = validateFile(file, copy);
    if (validationError !== undefined) {
      setCardErrors(previous => ({ ...previous, [category]: validationError }));
      return;
    }
    if (client.uploadProviderDocument === undefined) {
      setCardErrors(previous => ({ ...previous, [category]: { state: 'permission', title: copy.permissionTitle, message: copy.permissionBody } }));
      return;
    }
    setCardErrors(previous => ({ ...previous, [category]: undefined }));
    setUploadStates(previous => ({ ...previous, [category]: 'loading' }));
    try {
      const document = await client.uploadProviderDocument(category, file);
      setDocuments(previous => ({ ...previous, [category]: document }));
      setApplication(previous => previous === undefined
        ? previous
        : { ...previous, missingDocuments: previous.missingDocuments.filter(item => item !== category) });
      setUploadStates(previous => ({ ...previous, [category]: 'success' }));
      if (client.getProviderApplication !== undefined) {
        try {
          const refreshed = await client.getProviderApplication();
          if (refreshed.providerType === providerType) {
            setApplication({ ...refreshed, missingDocuments: refreshed.missingDocuments.filter(item => item !== category) });
          }
        } catch {
          // The uploaded document remains visible locally; the server response is authoritative for this card.
        }
      }
    } catch (requestError: unknown) {
      setUploadStates(previous => ({ ...previous, [category]: 'idle' }));
      setCardErrors(previous => ({ ...previous, [category]: uploadError(requestError, copy) }));
    }
  }, [client, copy, providerType]);

  const remove = useCallback(async (category: ProviderDocumentCategory) => {
    const document = documents[category];
    if (document === undefined) return;
    if (client.deleteProviderDocument === undefined) {
      setCardErrors(previous => ({ ...previous, [category]: { state: 'permission', title: copy.permissionTitle, message: copy.permissionBody } }));
      return;
    }
    setUploadStates(previous => ({ ...previous, [category]: 'loading' }));
    setCardErrors(previous => ({ ...previous, [category]: undefined }));
    try {
      await client.deleteProviderDocument(document.id);
      setDocuments(previous => {
        const next = { ...previous };
        delete next[category];
        return next;
      });
      const requirement = requirements.find(item => item.key === category);
      if (requirement !== undefined && requirement.classification !== 'optional') {
        setApplication(previous => previous === undefined || previous.missingDocuments.includes(category)
          ? previous
          : { ...previous, missingDocuments: [...previous.missingDocuments, category] });
      }
      setUploadStates(previous => ({ ...previous, [category]: 'success' }));
      if (client.getProviderApplication !== undefined) {
        try {
          const refreshed = await client.getProviderApplication();
          if (refreshed.providerType === providerType) {
            setApplication(requirement === undefined || requirement.classification === 'optional'
              ? refreshed
              : { ...refreshed, missingDocuments: refreshed.missingDocuments.includes(category) ? refreshed.missingDocuments : [...refreshed.missingDocuments, category] });
          }
        } catch {
          // The deleted document is removed locally; a later reload can reconcile the server state.
        }
      }
    } catch (requestError: unknown) {
      setUploadStates(previous => ({ ...previous, [category]: 'idle' }));
      setCardErrors(previous => ({ ...previous, [category]: uploadError(requestError, copy) }));
    }
  }, [client, copy, documents, providerType, requirements]);

  if (loadState === 'loading') {
    return <section className="auth-page provider-documents-page" data-testid="provider-documents" data-screen-id="AUTH-12" data-state="loading" dir={locale === 'ar' ? 'rtl' : 'ltr'}><div className="auth-card auth-card--form provider-documents-card"><div className="provider-account-state"><StateMessage state="loading" title={copy.title} message={copy.description} /></div></div></section>;
  }

  if (loadState === 'permission' || loadState === 'error' || loadState === 'retry') {
    return (
      <section className="auth-page provider-documents-page" data-testid="provider-documents" data-screen-id="AUTH-12" data-state={loadState} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
        <div className="auth-card auth-card--form provider-documents-card"><div className="provider-account-state">
          {error === undefined ? null : <StateMessage state={error.state} title={error.title} message={error.message} retryLabel={copy.retryAction} onRetry={error.state === 'retry' ? () => void loadApplication() : undefined} />}
          <Button type="button" variant="ghost" onClick={onBack}>{copy.backAction}</Button>
        </div></div>
      </section>
    );
  }

  if (requirements.length === 0) {
    return (
      <section className="auth-page provider-documents-page" data-testid="provider-documents" data-screen-id="AUTH-12" data-state="empty" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
        <div className="auth-card auth-card--form provider-documents-card"><div className="provider-account-state">
          <StateMessage state="empty" title={copy.emptyTitle} message={copy.emptyBody} />
          <Button type="button" variant="ghost" onClick={onBack}>{copy.backAction}</Button>
        </div></div>
      </section>
    );
  }

  const canEdit = application !== undefined && canEditDocuments(application, providerType);
  const missingRequiredDocuments = application === undefined ? [] : missingRequiredDocumentCategories(application);
  const canSubmit = canEdit
    && application !== undefined
    && application.availableActions.includes('submit')
    && application.missingFields.length === 0
    && missingRequiredDocuments.length === 0;
  return (
    <section className="auth-page provider-documents-page" data-testid="provider-documents" data-screen-id="AUTH-12" data-state="ready" data-can-edit={canEdit} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <div className="auth-card auth-card--form provider-documents-card">
        <header className="auth-card__heading provider-documents-card__heading">
          <span className="auth-card__icon provider-organization-card__step" aria-hidden="true">4</span>
          <p className="provider-organization-card__step-label">{copy.stepLabel}</p>
          <h1>{copy.title}</h1>
          <p>{copy.description}</p>
        </header>
        <div className="auth-card__body provider-documents-card__body">
          <div className="provider-account-progress" aria-label={copy.stepLabel}>
            <span className="provider-account-progress__item provider-account-progress__item--complete">1</span>
            <span className="provider-account-progress__line provider-account-progress__line--complete" aria-hidden="true" />
            <span className="provider-account-progress__item provider-account-progress__item--complete">2</span>
            <span className="provider-account-progress__line provider-account-progress__line--complete" aria-hidden="true" />
            <span className="provider-account-progress__item provider-account-progress__item--complete">3</span>
            <span className="provider-account-progress__line provider-account-progress__line--complete" aria-hidden="true" />
            <span className="provider-account-progress__item provider-account-progress__item--active">4</span>
          </div>
          <aside className="provider-account-guidance" role="note"><strong>{copy.requirementsTitle}</strong><span>{copy.requirementsBody}</span></aside>
          {!canEdit ? <StateMessage state="permission" title={copy.permissionTitle} message={copy.permissionBody} /> : null}
          <div className="provider-document-list">
            {requirements.map(requirement => (
              <DocumentCard
                key={requirement.key}
                requirement={requirement}
                document={documents[requirement.key]}
                uploadState={uploadStates[requirement.key] ?? 'idle'}
                error={cardErrors[requirement.key]}
                canEdit={canEdit}
                copy={copy}
                onFile={file => void upload(requirement.key, file)}
                onDelete={() => void remove(requirement.key)}
              />
            ))}
          </div>
          <aside className="provider-documents-privacy" role="note"><strong>{copy.privacyNote}</strong><span>{copy.noPublicUrlNote}</span></aside>
          {!canSubmit ? <StateMessage state="empty" title={copy.reviewUnavailableTitle} message={copy.reviewUnavailableBody} /> : null}
          {application !== undefined && application.missingFields.length > 0 ? (
            <aside role="status">
              <p>{locale === 'ar' ? 'ارجع لاستكمال بيانات الحساب الناقصة؛ الملفات المرفوعة محفوظة:' : 'Go back to complete the missing account details; uploaded files are saved:'}</p>
              <ul>{application.missingFields.map(field => <li key={field}>{getProviderAccountCopy(locale).missingFieldLabels[field] ?? field}</li>)}</ul>
            </aside>
          ) : null}
          <div className="provider-documents-card__footer">
            <Button type="button" variant="ghost" onClick={onBack}>{copy.backAction}</Button>
            <Button type="button" variant="primary" disabled={!canSubmit} onClick={() => {
              if (application !== undefined && canSubmit) onContinue?.(application);
            }}>{copy.reviewAction}</Button>
          </div>
        </div>
      </div>
    </section>
  );
}

export { validateFile, canEditDocuments, loadError, uploadError };
