import { randomUUID } from 'node:crypto';
import type { Readable } from 'node:stream';
import type {
  ProviderDocumentAccessData,
  ProviderDocumentCategory,
  ProviderDocumentData,
  ProviderDocumentUploadHeaders
} from '@sadat-real-estate/contracts';
import type { AccessTokenClaims } from '../auth/crypto.js';
import { retentionDeadlineFor } from '../media/governance.js';
import { providerRequirementSnapshot } from '../provider/requirements.js';
import type { MalwareScannerAdapter, PrivateDownloadSigner, StorageAdapter } from './adapters.js';
import type { ProviderDocumentEntity, ProviderDocumentRepository } from './repository.js';
import { ProviderDocumentValidationTransform, UploadValidationError } from './validation.js';

export type UploadServiceErrorCode =
  | 'UPLOAD_CAPABILITY_UNAVAILABLE'
  | 'PROVIDER_APPLICATION_NOT_FOUND'
  | 'PROVIDER_APPLICATION_NOT_EDITABLE'
  | 'DOCUMENT_CATEGORY_NOT_APPLICABLE'
  | 'DOCUMENT_CATEGORY_LIMIT'
  | 'DOCUMENT_REPLACEMENT_LIMIT'
  | 'DOCUMENT_CONCURRENT_UPLOAD'
  | 'DOCUMENT_NOT_FOUND'
  | 'DOCUMENT_NOT_CLEAN'
  | 'DOCUMENT_REVIEW_FORBIDDEN'
  | 'INVALID_DOWNLOAD_GRANT'
  | 'MALWARE_SCAN_FAILED'
  | 'INVALID_FILENAME'
  | 'DOUBLE_EXTENSION_REJECTED'
  | 'FILE_TYPE_NOT_ALLOWED'
  | 'FILE_TOO_LARGE'
  | 'EMPTY_FILE'
  | 'ENCRYPTED_PDF_REJECTED'
  | 'INVALID_FILE_SIGNATURE';

export class UploadServiceError extends Error {
  constructor(readonly code: UploadServiceErrorCode) {
    super(code);
    this.name = 'UploadServiceError';
  }
}

export interface PrivateDocumentAccessAudit {
  record(event: {
    actorId: string;
    actorType: 'provider' | 'admin';
    documentId: string;
    action: 'private_document_download_granted';
    purpose: string;
    occurredAt: Date;
    requestId: string;
    traceId?: string;
  }): void | Promise<void>;
}

export interface AdminDocumentAuthorization {
  authorize(adminId: string, permission: 'admin:documents.review'): Promise<boolean>;
}

export interface ProviderDocumentServiceDependencies {
  repository: ProviderDocumentRepository;
  storage: StorageAdapter;
  scanner: MalwareScannerAdapter;
  signer: PrivateDownloadSigner;
  audit: PrivateDocumentAccessAudit;
  authorization: AdminDocumentAuthorization;
  now?: () => Date;
  createObjectKey?: () => string;
}

export interface ProviderDocumentService {
  list(claims: AccessTokenClaims): Promise<{ items: ProviderDocumentData[] }>;
  upload(
    claims: AccessTokenClaims,
    headers: ProviderDocumentUploadHeaders,
    source: Readable
  ): Promise<ProviderDocumentData>;
  createAccessGrant(
    claims: AccessTokenClaims,
    documentId: string,
    purpose: string,
    context: { requestId: string; traceId?: string }
  ): Promise<ProviderDocumentAccessData>;
  createAdminAccessGrant(
    claims: AccessTokenClaims,
    documentId: string,
    purpose: string,
    context: { requestId: string; traceId?: string }
  ): Promise<ProviderDocumentAccessData>;
  resolveDownload(
    documentId: string,
    expires: string,
    signature: string
  ): Promise<{ source: Readable; mime: string; filename: string }>;
  delete(claims: AccessTokenClaims, documentId: string): Promise<{ documentId: string; deleted: true }>;
  isReady(): Promise<boolean>;
}

function providerId(claims: AccessTokenClaims): string {
  if (claims.role !== 'provider') throw new UploadServiceError('PROVIDER_APPLICATION_NOT_FOUND');
  return claims.sub;
}

function adminId(claims: AccessTokenClaims): string {
  if (claims.role !== 'admin' || claims.status !== 'verified') {
    throw new UploadServiceError('DOCUMENT_REVIEW_FORBIDDEN');
  }
  return claims.sub;
}

function toData(document: ProviderDocumentEntity, idempotentReplay: boolean): ProviderDocumentData {
  return {
    id: document.id,
    applicationId: document.applicationId,
    category: document.category,
    requirementVersion: document.requirementVersion,
    originalFilename: document.originalFilename,
    normalizedExtension: document.normalizedExtension,
    detectedMime: document.detectedMime,
    byteSize: document.byteSize,
    sha256: document.sha256,
    version: document.version,
    securityState: document.securityState,
    reviewState: document.reviewState,
    uploadedAt: document.uploadedAt,
    active: document.active,
    idempotentReplay
  };
}

function isApplicableCategory(
  category: ProviderDocumentCategory,
  application: Awaited<ReturnType<ProviderDocumentRepository['findOwnedApplication']>>
): boolean {
  if (!application) return false;
  return providerRequirementSnapshot(
    application.providerType,
    application.accountOwnerHasRegisteredAuthority,
    application.requirementVersion
  ).requirements.some((requirement) => requirement.key === category && requirement.applies);
}

function mappedValidationError(error: unknown): never {
  if (error instanceof UploadValidationError) {
    throw new UploadServiceError(error.code as UploadServiceErrorCode);
  }
  throw error;
}

export function createProviderDocumentService(
  dependencies: ProviderDocumentServiceDependencies
): ProviderDocumentService {
  const now = dependencies.now ?? (() => new Date());
  const createObjectKey = dependencies.createObjectKey
    ?? (() => `quarantine/${randomUUID().replaceAll('-', '')}`);

  async function issueAccessGrant(
    document: ProviderDocumentEntity,
    actorId: string,
    actorType: 'provider' | 'admin',
    purpose: string,
    context: { requestId: string; traceId?: string }
  ): Promise<ProviderDocumentAccessData> {
    const occurredAt = now();
    const expiresAt = new Date(occurredAt.getTime() + 300 * 1_000);
    const url = dependencies.signer.issue(document.id, expiresAt);
    await dependencies.audit.record({
      actorId,
      actorType,
      documentId: document.id,
      action: 'private_document_download_granted',
      purpose,
      occurredAt,
      requestId: context.requestId,
      ...(context.traceId ? { traceId: context.traceId } : {})
    });
    return { url, expiresAt: expiresAt.toISOString(), method: 'GET' };
  }

  return {
    async list(claims) {
      const owner = providerId(claims);
      const application = await dependencies.repository.findOwnedApplication(owner);
      if (!application) throw new UploadServiceError('PROVIDER_APPLICATION_NOT_FOUND');
      const documents = await dependencies.repository.listOwned(owner, application.id);
      return { items: documents.map(document => toData(document, false)) };
    },
    async isReady() {
      const [storage, scanner] = await Promise.all([
        dependencies.storage.isReady(),
        dependencies.scanner.isReady()
      ]);
      return storage && scanner;
    },

    async upload(claims, headers, source) {
      if (!await this.isReady()) throw new UploadServiceError('UPLOAD_CAPABILITY_UNAVAILABLE');
      const ownerId = providerId(claims);
      const application = await dependencies.repository.findOwnedApplication(ownerId);
      if (!application) throw new UploadServiceError('PROVIDER_APPLICATION_NOT_FOUND');
      if (application.status !== 'draft' && application.status !== 'needs_information') {
        throw new UploadServiceError('PROVIDER_APPLICATION_NOT_EDITABLE');
      }
      if (!isApplicableCategory(headers.category, application)) {
        throw new UploadServiceError('DOCUMENT_CATEGORY_NOT_APPLICABLE');
      }

      const objectKey = createObjectKey();
      const validator = new ProviderDocumentValidationTransform(headers.filename, headers.contentType);
      try {
        await dependencies.storage.putPrivateQuarantine(objectKey, source.pipe(validator));
      } catch (error) {
        await dependencies.storage.deletePrivate(objectKey).catch(() => undefined);
        mappedValidationError(error);
      }

      let validated;
      try {
        validated = validator.result();
      } catch (error) {
        await dependencies.storage.deletePrivate(objectKey).catch(() => undefined);
        mappedValidationError(error);
      }

      const uploadedAt = now();
      let registered;
      try {
        registered = await dependencies.repository.register({
          application,
          category: headers.category,
          requirementVersion: application.requirementVersion,
          ...validated,
          declaredMime: headers.contentType,
          storageKey: objectKey,
          uploadedAt
        });
      } catch (error) {
        await dependencies.storage.deletePrivate(objectKey).catch(() => undefined);
        throw error;
      }
      if (registered.kind !== 'created') {
        await dependencies.storage.deletePrivate(objectKey).catch(() => undefined);
        if (registered.kind === 'replay') return toData(registered.document, true);
        throw new UploadServiceError(registered.kind === 'category_limit'
          ? 'DOCUMENT_CATEGORY_LIMIT'
          : registered.kind === 'replacement_limit'
            ? 'DOCUMENT_REPLACEMENT_LIMIT'
            : 'DOCUMENT_CONCURRENT_UPLOAD');
      }

      await dependencies.repository.updateSecurity(registered.document.id, 'scan_pending');
      try {
        const scan = await dependencies.scanner.scan(
          await dependencies.storage.openPrivate(registered.document.storageKey)
        );
        const completedAt = now();
        const updated = await dependencies.repository.updateSecurity(
          registered.document.id,
            scan === 'clean' ? 'clean' : 'infected',
            scan === 'infected'
              ? { scanCompletedAt: completedAt, deleteAfter: retentionDeadlineFor('infected', completedAt) }
            : { scanCompletedAt: completedAt }
        );
        if (!updated) throw new Error('PROVIDER_DOCUMENT_NOT_FOUND_AFTER_SCAN');
        return toData(updated, false);
      } catch (error) {
        await dependencies.repository.updateSecurity(registered.document.id, 'scan_failed', {
          scanCompletedAt: now(),
          scanFailureCode: error instanceof Error ? error.name.slice(0, 80) : 'SCAN_FAILED'
        });
        throw new UploadServiceError('MALWARE_SCAN_FAILED');
      }
    },

    async createAccessGrant(claims, documentId, purpose, context) {
      const ownerId = providerId(claims);
      const document = await dependencies.repository.findOwned(ownerId, documentId);
      if (!document || document.securityState === 'deleted') {
        throw new UploadServiceError('DOCUMENT_NOT_FOUND');
      }
      if (document.securityState !== 'clean') throw new UploadServiceError('DOCUMENT_NOT_CLEAN');
      return issueAccessGrant(document, ownerId, 'provider', purpose, context);
    },

    async createAdminAccessGrant(claims, documentId, purpose, context) {
      const reviewerId = adminId(claims);
      if (!await dependencies.authorization.authorize(reviewerId, 'admin:documents.review')) {
        throw new UploadServiceError('DOCUMENT_REVIEW_FORBIDDEN');
      }
      const document = await dependencies.repository.findById(documentId);
      if (!document || !document.active || document.securityState === 'deleted') {
        throw new UploadServiceError('DOCUMENT_NOT_FOUND');
      }
      if (document.securityState !== 'clean') throw new UploadServiceError('DOCUMENT_NOT_CLEAN');
      return issueAccessGrant(document, reviewerId, 'admin', purpose, context);
    },

    async resolveDownload(documentId, expires, signature) {
      if (!dependencies.signer.verify(documentId, expires, signature, now())) {
        throw new UploadServiceError('INVALID_DOWNLOAD_GRANT');
      }
      const document = await dependencies.repository.findById(documentId);
      if (!document || document.securityState === 'deleted') throw new UploadServiceError('DOCUMENT_NOT_FOUND');
      if (document.securityState !== 'clean') throw new UploadServiceError('DOCUMENT_NOT_CLEAN');
      return {
        source: await dependencies.storage.openPrivate(document.storageKey),
        mime: document.detectedMime,
        filename: document.originalFilename
      };
    },

    async delete(claims, documentId) {
      const ownerId = providerId(claims);
      const application = await dependencies.repository.findOwnedApplication(ownerId);
      if (!application) throw new UploadServiceError('PROVIDER_APPLICATION_NOT_FOUND');
      if (application.status !== 'draft' && application.status !== 'needs_information') {
        throw new UploadServiceError('PROVIDER_APPLICATION_NOT_EDITABLE');
      }
      const current = await dependencies.repository.findOwned(ownerId, documentId);
      if (!current) throw new UploadServiceError('DOCUMENT_NOT_FOUND');
      const deleted = await dependencies.repository.markDeleted(ownerId, documentId, now());
      if (!deleted) throw new UploadServiceError('DOCUMENT_NOT_FOUND');
      await dependencies.storage.deletePrivate(current.storageKey);
      return { documentId, deleted: true };
    }
  };
}
