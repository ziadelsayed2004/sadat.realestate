import { randomBytes } from 'node:crypto';
import type { Readable } from 'node:stream';
import {
  PAYMENT_PROOF_MAX_BYTES,
  paymentProofDataSchema,
  paymentProofReviewSchema,
  paymentProofUploadHeadersSchema,
  type PaymentProofData,
  type PaymentProofReview,
  type PaymentProofUploadHeaders
} from '@sadat-real-estate/contracts';
import type { AccessTokenClaims } from '../auth/crypto.js';
import type { MalwareScanOutcome, MalwareScannerAdapter, StorageAdapter } from '../uploads/adapters.js';
import { ProviderDocumentValidationTransform, UploadValidationError } from '../uploads/validation.js';

export type PaymentProofServiceErrorCode =
  | 'FORBIDDEN'
  | 'PAYMENT_PROOF_CAPABILITY_UNAVAILABLE'
  | 'AD_REQUEST_NOT_FOUND'
  | 'AD_REQUEST_NOT_PAYABLE'
  | 'DUPLICATE'
  | 'MALWARE_SCAN_FAILED'
  | 'PAYMENT_PROOF_AUDIT_UNAVAILABLE'
  | 'PAYMENT_PROOF_AUDIT_FAILED'
  | 'NOT_FOUND'
  | 'VERSION_CONFLICT'
  | 'INVALID_STORAGE_KEY'
  | 'INVALID_FILENAME'
  | 'DOUBLE_EXTENSION_REJECTED'
  | 'FILE_TYPE_NOT_ALLOWED'
  | 'FILE_TOO_LARGE'
  | 'EMPTY_FILE'
  | 'ENCRYPTED_PDF_REJECTED'
  | 'INVALID_FILE_SIGNATURE';

export class PaymentProofServiceError extends Error {
  constructor(readonly code: PaymentProofServiceErrorCode) {
    super(code);
    this.name = 'PaymentProofServiceError';
  }
}

export interface PayableAdRequest {
  id: string;
  providerId: string;
  status: string;
}

export interface PaymentProofServiceDependencies {
  storage: StorageAdapter;
  scanner: MalwareScannerAdapter;
  findPayableAdRequest(providerId: string, adRequestId: string): Promise<PayableAdRequest | undefined> | PayableAdRequest | undefined;
  authorization?: PaymentProofAuthorization;
  audit?: PaymentProofAuditWriter;
  now?: () => Date;
  createObjectKey?: () => string;
}

export interface PaymentProofAuthorization {
  authorize(adminId: string, permission: 'admin:payments.review'): Promise<boolean>;
}

export interface PaymentProofAuditWriter {
  record(event: {
    actorType: 'admin';
    actorId: string;
    targetType: 'payment_proof';
    targetId: string;
    action: 'payment_proof.approve' | 'payment_proof.reject';
    reason: string;
    before: PaymentProofData;
    after: PaymentProofData;
    requestId: string;
    traceId: string;
    occurredAt: Date;
  }): Promise<void> | void;
}

export interface PaymentProofReviewContext {
  requestId: string;
  traceId: string;
}

interface StoredPaymentProof extends PaymentProofData {
  storageKey: string;
}

const id = () => randomBytes(12).toString('hex');
const generatedObjectKey = () => `quarantine/${randomBytes(16).toString('hex')}`;
const isObjectKey = (value: string): boolean => /^quarantine\/[a-f0-9]{32}$/.test(value);

function mapValidationError(error: unknown): never {
  if (error instanceof UploadValidationError) {
    throw new PaymentProofServiceError(error.code as PaymentProofServiceErrorCode);
  }
  throw error;
}

function scanFailureCode(outcome: MalwareScanOutcome): PaymentProofServiceErrorCode {
  return outcome === 'clean' ? 'MALWARE_SCAN_FAILED' : 'MALWARE_SCAN_FAILED';
}

export function createPaymentProofService(dependencies: PaymentProofServiceDependencies) {
  const records = new Map<string, StoredPaymentProof>();
  const now = dependencies.now ?? (() => new Date());
  const createObjectKey = dependencies.createObjectKey ?? generatedObjectKey;

  const isReady = async () => Boolean(
    await dependencies.storage.isReady() && await dependencies.scanner.isReady()
  );

  const project = (record: StoredPaymentProof, idempotentReplay: boolean): PaymentProofData => {
    const { storageKey, ...data } = record;
    void storageKey;
    return paymentProofDataSchema.parse({ ...data, idempotentReplay });
  };

  const requireReviewer = async (claims: AccessTokenClaims): Promise<void> => {
    if (
      claims.role !== 'admin'
      || claims.status !== 'verified'
      || !dependencies.authorization
      || !await dependencies.authorization.authorize(claims.sub, 'admin:payments.review')
    ) throw new PaymentProofServiceError('FORBIDDEN');
  };

  return {
    isReady,

    async upload(
      claims: AccessTokenClaims,
      adRequestId: string,
      input: PaymentProofUploadHeaders | unknown,
      source: Readable
    ): Promise<PaymentProofData> {
      if (claims.role !== 'provider' || claims.status !== 'verified') {
        throw new PaymentProofServiceError('FORBIDDEN');
      }
      const headers = paymentProofUploadHeadersSchema.parse(input);
      const request = await dependencies.findPayableAdRequest(claims.sub, adRequestId);
      if (!request) throw new PaymentProofServiceError('AD_REQUEST_NOT_FOUND');
      if (request.providerId !== claims.sub) throw new PaymentProofServiceError('FORBIDDEN');
      if (request.status !== 'waiting_payment') throw new PaymentProofServiceError('AD_REQUEST_NOT_PAYABLE');
      if (headers.contentLength !== undefined && headers.contentLength > PAYMENT_PROOF_MAX_BYTES) {
        throw new PaymentProofServiceError('FILE_TOO_LARGE');
      }
      if (!await isReady()) throw new PaymentProofServiceError('PAYMENT_PROOF_CAPABILITY_UNAVAILABLE');

      const objectKey = createObjectKey();
      if (!isObjectKey(objectKey)) throw new PaymentProofServiceError('INVALID_STORAGE_KEY');
      const validator = new ProviderDocumentValidationTransform(headers.filename, headers.contentType);
      try {
        await dependencies.storage.putPrivateQuarantine(objectKey, source.pipe(validator));
      } catch (error) {
        await dependencies.storage.deletePrivate(objectKey).catch(() => undefined);
        mapValidationError(error);
      }

      let validated;
      try {
        validated = validator.result();
      } catch (error) {
        await dependencies.storage.deletePrivate(objectKey).catch(() => undefined);
        mapValidationError(error);
      }

      const replay = [...records.values()].find((record) => (
        record.adRequestId === request.id
        && record.providerId === claims.sub
        && record.sha256 === validated.sha256
        && record.active
      ));
      if (replay) {
        await dependencies.storage.deletePrivate(objectKey).catch(() => undefined);
        return project(replay, true);
      }

      const uploadedAt = now();
      const record = paymentProofDataSchema.parse({
        id: id(),
        adRequestId: request.id,
        providerId: claims.sub,
        ...validated,
        version: 1,
        securityState: 'scan_pending',
        status: 'uploaded',
        reviewHistory: [],
        uploadedAt: uploadedAt.toISOString(),
        active: true,
        idempotentReplay: false
      });
      const stored: StoredPaymentProof = { ...record, storageKey: objectKey };
      records.set(record.id, stored);

      try {
        const outcome = await dependencies.scanner.scan(await dependencies.storage.openPrivate(objectKey));
        if (outcome !== 'clean') {
          records.set(record.id, { ...stored, securityState: outcome === 'infected' ? 'infected' : 'scan_failed', version: 2, active: false });
          await dependencies.storage.deletePrivate(objectKey).catch(() => undefined);
          throw new PaymentProofServiceError(scanFailureCode(outcome));
        }
        const pending = paymentProofDataSchema.parse({
          ...record,
          securityState: 'clean',
          status: 'pending_review',
          version: 2,
          idempotentReplay: false
        });
        const updated: StoredPaymentProof = { ...pending, storageKey: objectKey };
        records.set(record.id, updated);
        return pending;
      } catch (error) {
        if (error instanceof PaymentProofServiceError) throw error;
        records.set(record.id, { ...stored, securityState: 'scan_failed', version: 2, active: false });
        await dependencies.storage.deletePrivate(objectKey).catch(() => undefined);
        throw new PaymentProofServiceError('MALWARE_SCAN_FAILED');
      }
    },

    async review(
      claims: AccessTokenClaims,
      proofId: string,
      input: PaymentProofReview | unknown,
      context: PaymentProofReviewContext
    ): Promise<PaymentProofData> {
      await requireReviewer(claims);
      const parsed = paymentProofReviewSchema.parse(input);
      const record = records.get(proofId);
      if (!record) throw new PaymentProofServiceError('NOT_FOUND');
      const targetStatus = parsed.action === 'approve' ? 'approved' : 'rejected';
      if (record.status === targetStatus) return project(record, false);
      if (record.status !== 'pending_review') throw new PaymentProofServiceError('VERSION_CONFLICT');
      if (parsed.expectedVersion !== record.version) throw new PaymentProofServiceError('VERSION_CONFLICT');
      if (!dependencies.audit) throw new PaymentProofServiceError('PAYMENT_PROOF_AUDIT_UNAVAILABLE');
      const stamp = now();
      const { storageKey, ...recordData } = record;
      const updated = paymentProofDataSchema.parse({
        ...recordData,
        status: targetStatus,
        version: record.version + 1,
        reviewHistory: [...record.reviewHistory, {
          action: parsed.action,
          actorId: claims.sub,
          reason: parsed.reason,
          version: record.version + 1,
          createdAt: stamp.toISOString()
        }]
      });
      const before = project(record, false);
      const after = paymentProofDataSchema.parse(updated);
      try {
        await dependencies.audit.record({
          actorType: 'admin',
          actorId: claims.sub,
          targetType: 'payment_proof',
          targetId: record.id,
          action: parsed.action === 'approve' ? 'payment_proof.approve' : 'payment_proof.reject',
          reason: parsed.reason,
          before,
          after,
          requestId: context.requestId,
          traceId: context.traceId,
          occurredAt: stamp
        });
      } catch {
        throw new PaymentProofServiceError('PAYMENT_PROOF_AUDIT_FAILED');
      }
      records.set(record.id, { ...updated, storageKey });
      return after;
    },

    get(idValue: string): PaymentProofData | undefined {
      const record = records.get(idValue);
      return record ? project(record, false) : undefined;
    }
  };
}
