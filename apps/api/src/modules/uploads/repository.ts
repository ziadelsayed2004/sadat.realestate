import { Types, type Connection } from 'mongoose';
import type {
  ProviderApplicationState,
  ProviderDocumentCategory,
  ProviderDocumentData,
  ProviderDocumentMime,
  ProviderDocumentReviewState,
  ProviderDocumentSecurityState,
  ProviderType
} from '@sadat-real-estate/contracts';
import type { UploadModels } from './models.js';
import { canTransitionProviderDocumentSecurity } from './models.js';
import { retentionDeadlineFor } from '../media/governance.js';

export interface OwnedProviderApplication {
  id: string;
  providerId: string;
  providerType: ProviderType;
  status: ProviderApplicationState;
  requirementVersion: string;
  accountOwnerHasRegisteredAuthority?: boolean;
}

export interface ProviderDocumentEntity extends Omit<ProviderDocumentData, 'idempotentReplay'> {
  providerId: string;
  storageKey: string;
  declaredMime: ProviderDocumentMime;
  deletedAt?: Date;
}

export interface RegisterProviderDocumentInput {
  application: OwnedProviderApplication;
  category: ProviderDocumentCategory;
  requirementVersion: string;
  originalFilename: string;
  normalizedExtension: '.pdf' | '.jpg' | '.jpeg' | '.png';
  declaredMime: ProviderDocumentMime;
  detectedMime: ProviderDocumentMime;
  byteSize: number;
  sha256: string;
  storageKey: string;
  uploadedAt: Date;
}

export type RegisterProviderDocumentResult =
  | { kind: 'created'; document: ProviderDocumentEntity }
  | { kind: 'replay'; document: ProviderDocumentEntity }
  | { kind: 'category_limit' }
  | { kind: 'replacement_limit' }
  | { kind: 'concurrency_conflict' };

export interface ProviderDocumentRepository {
  listOwned(providerId: string, applicationId: string): Promise<ProviderDocumentEntity[]>;
  findOwnedApplication(providerId: string): Promise<OwnedProviderApplication | undefined>;
  register(input: RegisterProviderDocumentInput): Promise<RegisterProviderDocumentResult>;
  updateSecurity(
    id: string,
    securityState: ProviderDocumentSecurityState,
    details?: { scanCompletedAt?: Date; scanFailureCode?: string; deleteAfter?: Date }
  ): Promise<ProviderDocumentEntity | undefined>;
  findOwned(providerId: string, documentId: string): Promise<ProviderDocumentEntity | undefined>;
  findById(documentId: string): Promise<ProviderDocumentEntity | undefined>;
  markDeleted(providerId: string, documentId: string, now: Date): Promise<ProviderDocumentEntity | undefined>;
}

interface LeanApplication {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  providerType: ProviderType;
  status: ProviderApplicationState;
  requirementVersion: string;
  accountOwnerHasRegisteredAuthority?: boolean;
}

interface LeanDocument {
  _id: Types.ObjectId;
  applicationId: Types.ObjectId;
  providerId: Types.ObjectId;
  category: ProviderDocumentCategory;
  requirementVersion: string;
  originalFilename: string;
  normalizedExtension: '.pdf' | '.jpg' | '.jpeg' | '.png';
  declaredMime: ProviderDocumentMime;
  detectedMime: ProviderDocumentMime;
  byteSize: number;
  sha256: string;
  storageKey: string;
  uploadedAt: Date;
  version: number;
  active: boolean;
  securityState: ProviderDocumentSecurityState;
  reviewState: ProviderDocumentReviewState;
  deletedAt?: Date;
}

function validObjectId(value: string): boolean {
  return /^[a-f0-9]{24}$/.test(value);
}

function entity(document: LeanDocument): ProviderDocumentEntity {
  return {
    id: document._id.toHexString(),
    applicationId: document.applicationId.toHexString(),
    providerId: document.providerId.toHexString(),
    category: document.category,
    requirementVersion: document.requirementVersion,
    originalFilename: document.originalFilename,
    normalizedExtension: document.normalizedExtension,
    declaredMime: document.declaredMime,
    detectedMime: document.detectedMime,
    byteSize: document.byteSize,
    sha256: document.sha256,
    storageKey: document.storageKey,
    version: document.version,
    securityState: document.securityState,
    reviewState: document.reviewState,
    uploadedAt: document.uploadedAt.toISOString(),
    active: document.active,
    ...(document.deletedAt ? { deletedAt: document.deletedAt } : {})
  };
}

export function createMongooseProviderDocumentRepository(
  connection: Connection,
  models: UploadModels
): ProviderDocumentRepository {
  const { ProviderDocument } = models;
  const loadDocument = async (filter: Record<string, unknown>): Promise<ProviderDocumentEntity | undefined> => {
    const document = await ProviderDocument.findOne(filter)
      .select('+storageKey')
      .lean<LeanDocument>()
      .exec();
    return document ? entity(document) : undefined;
  };

  return {
    async findOwnedApplication(providerId) {
      if (!validObjectId(providerId)) return undefined;
      const providerObjectId = new Types.ObjectId(providerId);
      const application = await connection.collection('provider_applications').findOne({
        userId: providerObjectId
      }) as LeanApplication | null;
      if (!application) return undefined;
      return {
        id: application._id.toHexString(),
        providerId,
        providerType: application.providerType,
        status: application.status,
        requirementVersion: application.requirementVersion,
        ...(application.accountOwnerHasRegisteredAuthority !== undefined
          ? { accountOwnerHasRegisteredAuthority: application.accountOwnerHasRegisteredAuthority }
          : {})
      };
    },

    async listOwned(providerId, applicationId) {
      if (!validObjectId(providerId) || !validObjectId(applicationId)) return [];
      const rows = await ProviderDocument.find({
        providerId: new Types.ObjectId(providerId), applicationId: new Types.ObjectId(applicationId),
        active: true, deletedAt: { $exists: false }, securityState: { $ne: 'deleted' }
      }).sort({ uploadedAt: -1, _id: -1 }).lean<LeanDocument[]>().exec();
      return rows.map(entity);
    },
    async register(input) {
      const applicationId = new Types.ObjectId(input.application.id);
      const providerId = new Types.ObjectId(input.application.providerId);
      let result: RegisterProviderDocumentResult | undefined;
      try {
        await connection.transaction(async (session) => {
        const replay = await ProviderDocument.findOne({
          applicationId,
          providerId,
          category: input.category,
          sha256: input.sha256,
          active: true
        }).select('+storageKey').session(session).lean<LeanDocument>().exec();
        if (replay) {
          result = { kind: 'replay', document: entity(replay) };
          return;
        }

        const current = await ProviderDocument.findOne({
          applicationId,
          category: input.category,
          active: true
        }).select('+storageKey').session(session).lean<LeanDocument>().exec();
        if (!current) {
          const activeCategories = await ProviderDocument.countDocuments({ applicationId, active: true })
            .session(session).exec();
          if (activeCategories >= 12) {
            result = { kind: 'category_limit' };
            return;
          }
        } else {
          const since = new Date(input.uploadedAt.getTime() - 24 * 60 * 60 * 1_000);
          const replacements = await ProviderDocument.countDocuments({
            applicationId,
            category: input.category,
            uploadedAt: { $gte: since },
            supersedesId: { $exists: true }
          }).session(session).exec();
          if (replacements >= 5) {
            result = { kind: 'replacement_limit' };
            return;
          }
          await ProviderDocument.updateOne(
            { _id: current._id, active: true },
            {
              $set: {
                active: false,
                supersededAt: input.uploadedAt,
                deleteAfter: retentionDeadlineFor('superseded', input.uploadedAt),
                retentionReason: 'superseded'
              }
            },
            { session }
          ).exec();
        }

        const [created] = await ProviderDocument.create([{
          applicationId,
          providerId,
          category: input.category,
          requirementVersion: input.requirementVersion,
          originalFilename: input.originalFilename,
          normalizedExtension: input.normalizedExtension,
          declaredMime: input.declaredMime,
          detectedMime: input.detectedMime,
          byteSize: input.byteSize,
          sha256: input.sha256,
          storageKey: input.storageKey,
          uploadActorId: providerId,
          uploadedAt: input.uploadedAt,
          version: (current?.version ?? 0) + 1,
          active: true,
          ...(current ? { supersedesId: current._id } : {}),
          securityState: 'quarantined',
          reviewState: 'uploaded'
        }], { session });
        if (!created) throw new Error('PROVIDER_DOCUMENT_CREATE_FAILED');
        result = {
          kind: 'created',
          document: entity(created.toObject() as unknown as LeanDocument)
        };
        });
      } catch (error) {
        if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
          const winner = await loadDocument({ applicationId, category: input.category, active: true });
          if (winner?.sha256 === input.sha256) return { kind: 'replay', document: winner };
          return { kind: 'concurrency_conflict' };
        }
        throw error;
      }
      if (!result) throw new Error('PROVIDER_DOCUMENT_CREATE_FAILED');
      return result;
    },

    async updateSecurity(id, securityState, details = {}) {
      if (!validObjectId(id)) return undefined;
      const current = await loadDocument({ _id: new Types.ObjectId(id) });
      if (!current || !canTransitionProviderDocumentSecurity(current.securityState, securityState)) {
        return undefined;
      }
      const set: Record<string, unknown> = { securityState };
      if (details.scanCompletedAt) set.scanCompletedAt = details.scanCompletedAt;
      if (details.scanFailureCode) set.scanFailureCode = details.scanFailureCode;
      if (details.deleteAfter) {
        set.deleteAfter = details.deleteAfter;
        set.retentionReason = 'infected';
      }
      await ProviderDocument.updateOne(
        { _id: new Types.ObjectId(id), securityState: current.securityState },
        { $set: set }
      ).exec();
      return loadDocument({ _id: new Types.ObjectId(id) });
    },

    findOwned(providerId, documentId) {
      if (!validObjectId(providerId) || !validObjectId(documentId)) return Promise.resolve(undefined);
      return loadDocument({ _id: new Types.ObjectId(documentId), providerId: new Types.ObjectId(providerId) });
    },

    findById(documentId) {
      if (!validObjectId(documentId)) return Promise.resolve(undefined);
      return loadDocument({ _id: new Types.ObjectId(documentId) });
    },

    async markDeleted(providerId, documentId, now) {
      if (!validObjectId(providerId) || !validObjectId(documentId)) return undefined;
      const filter = { _id: new Types.ObjectId(documentId), providerId: new Types.ObjectId(providerId) };
      const current = await loadDocument(filter);
      if (!current) return undefined;
      if (current.securityState !== 'deleted') {
        await ProviderDocument.updateOne(filter, {
          $set: { securityState: 'deleted', active: false, deletedAt: now },
          $unset: { deleteAfter: 1 }
        }).exec();
      }
      return { ...current, securityState: 'deleted', active: false, deletedAt: current.deletedAt ?? now };
    }
  };
}
