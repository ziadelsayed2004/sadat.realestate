import { Types, type ClientSession, type Connection } from 'mongoose';
import { paymentProofDataSchema, type PaymentProofData } from '@sadat-real-estate/contracts';
import { createProviderAdvertisingModels, type AdRequestRecord, type PaymentProofRecord, type ProviderAdvertisingModels } from '../provider/advertising-models.js';
import { PaymentProofServiceError, type PayableAdRequest, type PaymentProofRegistrationInput, type PaymentProofRepository, type StoredPaymentProof } from './service.js';

type AdRequestRow = AdRequestRecord & { _id: Types.ObjectId };
type PaymentProofRow = PaymentProofRecord & { _id: Types.ObjectId };

function objectId(value: string, errorCode: 'AD_REQUEST_NOT_FOUND' | 'FORBIDDEN' | 'NOT_FOUND'): Types.ObjectId {
  if (!Types.ObjectId.isValid(value)) throw new PaymentProofServiceError(errorCode);
  return new Types.ObjectId(value);
}

function toPayableAdRequest(row: AdRequestRow): PayableAdRequest {
  return {
    id: row._id.toHexString(),
    providerId: row.providerId.toHexString(),
    status: row.status
  };
}

function toStoredPaymentProof(row: PaymentProofRow): StoredPaymentProof {
  if (!row.storageKey) throw new PaymentProofServiceError('INVALID_STORAGE_KEY');
  const data = paymentProofDataSchema.parse({
    id: row._id.toHexString(),
    adRequestId: row.adRequestId.toHexString(),
    providerId: row.providerId.toHexString(),
    originalFilename: row.originalFilename,
    normalizedExtension: row.normalizedExtension,
    detectedMime: row.detectedMime,
    byteSize: row.byteSize,
    sha256: row.sha256,
    version: row.version,
    securityState: row.securityState,
    status: row.status,
    reviewHistory: row.reviewHistory.map((entry) => ({
      action: entry.action,
      actorId: entry.actorId.toHexString(),
      reason: entry.reason,
      version: entry.version,
      createdAt: entry.createdAt.toISOString()
    })),
    uploadedAt: row.uploadedAt.toISOString(),
    active: row.active,
    idempotentReplay: row.idempotentReplay
  }) as PaymentProofData;
  return { ...data, storageKey: row.storageKey };
}

async function transaction<T>(connection: Connection, run: (session: ClientSession) => Promise<T>): Promise<T> {
  const session = await connection.startSession();
  try {
    return await session.withTransaction(() => run(session));
  } finally {
    await session.endSession();
  }
}

export function createMongoosePaymentProofRepository(
  connection: Connection,
  models: ProviderAdvertisingModels = createProviderAdvertisingModels(connection)
): PaymentProofRepository {
  return {
    async findPayableAdRequest(providerId, adRequestId) {
      if (!Types.ObjectId.isValid(providerId) || !Types.ObjectId.isValid(adRequestId)) return undefined;
      const row = await models.AdRequest.findOne({
        _id: new Types.ObjectId(adRequestId),
        providerId: new Types.ObjectId(providerId)
      }).lean<AdRequestRow>().exec();
      return row ? toPayableAdRequest(row) : undefined;
    },

    async find(id) {
      if (!Types.ObjectId.isValid(id)) return undefined;
      const row = await models.PaymentProof.findOne({ _id: new Types.ObjectId(id) })
        .select('+storageKey')
        .lean<PaymentProofRow>()
        .exec();
      return row ? toStoredPaymentProof(row) : undefined;
    },

    async list(query) {
      const filter: { active: true; status?: PaymentProofData['status'] } = { active: true };
      if (query.status) filter.status = query.status;
      const [rows, total] = await Promise.all([
        models.PaymentProof.find(filter)
          .select('+storageKey')
          .sort({ uploadedAt: -1, _id: -1 })
          .skip((query.page - 1) * query.limit)
          .limit(query.limit)
          .lean<PaymentProofRow[]>()
          .exec(),
        models.PaymentProof.countDocuments(filter).exec()
      ]);
      return { items: rows.map(toStoredPaymentProof), total };
    },

    async register(input: PaymentProofRegistrationInput) {
      const providerId = objectId(input.providerId, 'FORBIDDEN');
      const adRequestId = objectId(input.adRequestId, 'AD_REQUEST_NOT_FOUND');
      try {
        return await transaction(connection, async (session) => {
          const request = await models.AdRequest.findOne({ _id: adRequestId, providerId })
            .session(session)
            .lean<AdRequestRow>()
            .exec();
          if (!request) throw new PaymentProofServiceError('AD_REQUEST_NOT_FOUND');
          if (request.status !== 'waiting_payment') throw new PaymentProofServiceError('AD_REQUEST_NOT_PAYABLE');

          const replay = await models.PaymentProof.findOne({
            adRequestId,
            providerId,
            sha256: input.sha256,
            active: true
          })
            .select('+storageKey')
            .session(session)
            .lean<PaymentProofRow>()
            .exec();
          if (replay) return { kind: 'replay' as const, proof: toStoredPaymentProof(replay) };

          const [created] = await models.PaymentProof.create([{
            adRequestId,
            providerId,
            originalFilename: input.originalFilename,
            normalizedExtension: input.normalizedExtension,
            detectedMime: input.detectedMime,
            byteSize: input.byteSize,
            sha256: input.sha256,
            storageKey: input.storageKey,
            version: 1,
            securityState: 'scan_pending',
            status: 'uploaded',
            reviewHistory: [],
            uploadedAt: input.uploadedAt,
            active: true,
            idempotentReplay: false
          }], { session });
          if (!created) throw new PaymentProofServiceError('VERSION_CONFLICT');
          return { kind: 'created' as const, proof: toStoredPaymentProof(created.toObject() as PaymentProofRow) };
        });
      } catch (error) {
        if (error instanceof PaymentProofServiceError) throw error;
        if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
          const replay = await models.PaymentProof.findOne({
            adRequestId,
            providerId,
            sha256: input.sha256,
            active: true
          }).select('+storageKey').lean<PaymentProofRow>().exec();
          if (replay) return { kind: 'replay' as const, proof: toStoredPaymentProof(replay) };
        }
        throw error;
      }
    },

    async updateScan(id, expectedVersion, update) {
      if (!Types.ObjectId.isValid(id)) return undefined;
      const row = await models.PaymentProof.findOneAndUpdate(
        { _id: new Types.ObjectId(id), version: expectedVersion },
        { $set: update, $inc: { version: 1 } },
        { new: true, runValidators: true }
      ).select('+storageKey').lean<PaymentProofRow>().exec();
      return row ? toStoredPaymentProof(row) : undefined;
    },

    async review(id, expectedVersion, update) {
      if (!Types.ObjectId.isValid(id)) return undefined;
      const row = await models.PaymentProof.findOneAndUpdate(
        {
          _id: new Types.ObjectId(id),
          status: 'pending_review',
          version: expectedVersion
        },
        {
          $set: { status: update.status },
          $inc: { version: 1 },
          $push: { reviewHistory: update.reviewHistoryEntry }
        },
        { new: true, runValidators: true }
      ).select('+storageKey').lean<PaymentProofRow>().exec();
      return row ? toStoredPaymentProof(row) : undefined;
    }
  };
}
