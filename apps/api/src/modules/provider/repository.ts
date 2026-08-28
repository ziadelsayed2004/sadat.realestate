import { Types, type Connection } from 'mongoose';
import {
  PROVIDER_DOCUMENT_CATEGORIES,
  PROVIDER_DOCUMENT_REVIEW_STATES,
  type AuthAccountState,
  type ProviderAccountPatch,
  type ProviderApplicationState,
  type ProviderBusinessPatch,
  type ProviderCompanyPatch,
  type ProviderDocumentCategory,
  type ProviderDocumentReviewState,
  type ProviderLocale,
  type ProviderRequirementSnapshot,
  type ProviderSocialLink,
  type ProviderType
} from '@sadat-real-estate/contracts';
import type { IdentityModels } from '../identity/models.js';
import type { ProviderModels } from './models.js';

export interface ProviderApplicationEntity {
  id: string;
  userId: string;
  providerType: ProviderType;
  status: ProviderApplicationState;
  version: number;
  requirementVersion: string;
  accountOwnerFullName?: string;
  displayName?: string;
  email: string;
  primaryLocationId?: string;
  serviceAreaIds?: string[];
  preferredLocale?: ProviderLocale;
  termsAcceptedAt?: Date;
  privacyAcceptedAt?: Date;
  secondaryPhone?: string;
  whatsappNumber?: string;
  profileAssetId?: string;
  biography?: string;
  website?: string;
  socialLinks?: ProviderSocialLink[];
  legalBusinessName?: string;
  tradeName?: string;
  businessAddress?: string;
  legalCompanyName?: string;
  brandName?: string;
  headOfficeAddress?: string;
  commercialRegistrationNumber?: string;
  taxRegistrationNumber?: string;
  authorizedRepresentativeFullName?: string;
  authorizedRepresentativeTitle?: string;
  accountOwnerHasRegisteredAuthority?: boolean;
  requirementsSnapshot?: ProviderRequirementSnapshot;
  submittedAt?: Date;
  reviewReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ProviderDraftPatch = Omit<ProviderAccountPatch, 'version'>
  | Omit<ProviderBusinessPatch, 'version'>
  | Omit<ProviderCompanyPatch, 'version'>;

export type ProviderWriteResult =
  | { kind: 'updated'; application: ProviderApplicationEntity }
  | { kind: 'not_found' }
  | { kind: 'version_conflict' }
  | { kind: 'not_editable' };

export interface ProviderRepository {
  createDraft(input: {
    email: string;
    providerType: ProviderType;
    requirementVersion: string;
  }): Promise<ProviderApplicationEntity>;
  findByUserId(userId: string): Promise<ProviderApplicationEntity | undefined>;
  updateDraft(userId: string, expectedVersion: number, patch: ProviderDraftPatch): Promise<ProviderWriteResult>;
  submit(
    userId: string,
    expectedVersion: number,
    snapshot: ProviderRequirementSnapshot,
    now: Date
  ): Promise<ProviderWriteResult>;
}

export interface ProviderDocumentInventoryItem {
  category: ProviderDocumentCategory;
  status: ProviderDocumentReviewState;
}

export interface ProviderDocumentInventory {
  list(applicationId: string): Promise<readonly ProviderDocumentInventoryItem[]>;
}

interface LeanUser {
  _id: Types.ObjectId;
  normalizedEmail?: string;
  roleType: 'seeker' | 'provider' | 'admin';
  status: AuthAccountState;
}

interface LeanApplication extends Omit<ProviderApplicationEntity, 'id' | 'userId' | 'primaryLocationId' | 'serviceAreaIds' | 'profileAssetId'> {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  primaryLocationId?: Types.ObjectId;
  serviceAreaIds?: Types.ObjectId[];
  profileAssetId?: Types.ObjectId;
}

function duplicateKey(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
}

function objectId(value: string): Types.ObjectId {
  return new Types.ObjectId(value);
}

function toEntity(user: LeanUser, application: LeanApplication): ProviderApplicationEntity | undefined {
  if (user.roleType !== 'provider' || !user.normalizedEmail) return undefined;
  const {
    _id,
    userId,
    primaryLocationId,
    serviceAreaIds,
    profileAssetId,
    ...data
  } = application;
  return {
    ...data,
    id: _id.toHexString(),
    userId: userId.toHexString(),
    email: application.email ?? user.normalizedEmail,
    ...(primaryLocationId ? { primaryLocationId: primaryLocationId.toHexString() } : {}),
    ...(serviceAreaIds ? { serviceAreaIds: serviceAreaIds.map((id) => id.toHexString()) } : {}),
    ...(profileAssetId ? { profileAssetId: profileAssetId.toHexString() } : {})
  };
}

function databasePatch(patch: ProviderDraftPatch): Record<string, unknown> {
  const value = { ...patch } as Record<string, unknown>;
  if (typeof value.primaryLocationId === 'string') value.primaryLocationId = objectId(value.primaryLocationId);
  if (Array.isArray(value.serviceAreaIds)) {
    value.serviceAreaIds = value.serviceAreaIds.map((id) => objectId(String(id)));
  }
  if (typeof value.profileAssetId === 'string') value.profileAssetId = objectId(value.profileAssetId);
  for (const key of ['termsAcceptedAt', 'privacyAcceptedAt']) {
    if (typeof value[key] === 'string') value[key] = new Date(value[key]);
  }
  return value;
}

async function classifyMiss(
  models: ProviderModels,
  userId: Types.ObjectId,
  expectedVersion: number
): Promise<Exclude<ProviderWriteResult, { kind: 'updated' }>> {
  const current = await models.ProviderApplication.findOne({ userId })
    .select('status version')
    .lean<Pick<LeanApplication, 'status' | 'version'>>()
    .exec();
  if (!current) return { kind: 'not_found' };
  if (current.status !== 'draft' && current.status !== 'needs_information') {
    return { kind: 'not_editable' };
  }
  return current.version !== expectedVersion ? { kind: 'version_conflict' } : { kind: 'not_found' };
}

export function createMongooseProviderRepository(
  connection: Connection,
  identityModels: IdentityModels,
  providerModels: ProviderModels
): ProviderRepository {
  const { User, ProviderProfile } = identityModels;
  const { ProviderApplication } = providerModels;

  async function load(userId: string): Promise<ProviderApplicationEntity | undefined> {
    if (!/^[a-f0-9]{24}$/.test(userId)) return undefined;
    const id = objectId(userId);
    const [user, application] = await Promise.all([
      User.findOne({ _id: id, roleType: 'provider' })
        .select('_id normalizedEmail roleType status')
        .lean<LeanUser>()
        .exec(),
      ProviderApplication.findOne({ userId: id }).lean<LeanApplication>().exec()
    ]);
    return user && application ? toEntity(user, application) : undefined;
  }

  return {
    async createDraft(input) {
      try {
        const userId = await connection.transaction(async (session) => {
          const [user] = await User.create([{
            normalizedEmail: input.email,
            roleType: 'provider',
            status: 'draft',
            locale: 'ar'
          }], { session });
          if (!user) throw new Error('PROVIDER_USER_CREATE_FAILED');
          await ProviderProfile.create([{
            userId: user._id,
            providerType: input.providerType,
            status: 'draft'
          }], { session });
          await ProviderApplication.create([{
            userId: user._id,
            providerType: input.providerType,
            status: 'draft',
            requirementVersion: input.requirementVersion,
            email: input.email
          }], { session });
          return user._id.toHexString();
        });
        const application = await load(userId);
        if (!application) throw new Error('PROVIDER_CREATE_FAILED');
        return application;
      } catch (error) {
        if (duplicateKey(error)) throw new Error('PROVIDER_ALREADY_EXISTS', { cause: error });
        throw new Error('PROVIDER_CREATE_FAILED', { cause: error });
      }
    },

    findByUserId: load,

    async updateDraft(userId, expectedVersion, patch) {
      if (!/^[a-f0-9]{24}$/.test(userId)) return { kind: 'not_found' };
      const id = objectId(userId);
      let updated = false;
      await connection.transaction(async (session) => {
        const application = await ProviderApplication.findOneAndUpdate(
          {
            userId: id,
            status: { $in: ['draft', 'needs_information'] },
            version: expectedVersion
          },
          { $set: databasePatch(patch), $inc: { version: 1 } },
          { new: true, session, runValidators: true }
        ).exec();
        if (!application) return;
        updated = true;
        if ('preferredLocale' in patch && patch.preferredLocale) {
          await User.updateOne(
            { _id: id, roleType: 'provider' },
            { $set: { locale: patch.preferredLocale } },
            { session }
          ).exec();
        }
      });
      if (!updated) return classifyMiss(providerModels, id, expectedVersion);
      const application = await load(userId);
      return application ? { kind: 'updated', application } : { kind: 'not_found' };
    },

    async submit(userId, expectedVersion, snapshot, now) {
      if (!/^[a-f0-9]{24}$/.test(userId)) return { kind: 'not_found' };
      const id = objectId(userId);
      let updated = false;
      await connection.transaction(async (session) => {
        const application = await ProviderApplication.findOneAndUpdate(
          {
            userId: id,
            status: { $in: ['draft', 'needs_information'] },
            version: expectedVersion
          },
          {
            $set: {
              status: 'pending_review',
              statusChangedAt: now,
              submittedAt: now,
              requirementsSnapshot: snapshot
            },
            $unset: { reviewReason: 1 },
            $inc: { version: 1 }
          },
          { new: true, session, runValidators: true }
        ).exec();
        if (!application) return;
        updated = true;
        await Promise.all([
          User.updateOne(
            { _id: id, roleType: 'provider' },
            { $set: { status: 'pending_review', statusChangedAt: now } },
            { session }
          ).exec(),
          ProviderProfile.updateOne(
            { userId: id },
            { $set: { status: 'pending_review', statusChangedAt: now } },
            { session }
          ).exec()
        ]);
      });
      if (!updated) return classifyMiss(providerModels, id, expectedVersion);
      const application = await load(userId);
      return application ? { kind: 'updated', application } : { kind: 'not_found' };
    }
  };
}

function isDocumentCategory(value: unknown): value is ProviderDocumentCategory {
  return typeof value === 'string'
    && (PROVIDER_DOCUMENT_CATEGORIES as readonly string[]).includes(value);
}

function isDocumentStatus(value: unknown): value is ProviderDocumentReviewState {
  return typeof value === 'string'
    && (PROVIDER_DOCUMENT_REVIEW_STATES as readonly string[]).includes(value);
}

export function createMongooseProviderDocumentInventory(
  connection: Connection
): ProviderDocumentInventory {
  return {
    async list(applicationId) {
      if (!/^[a-f0-9]{24}$/.test(applicationId)) return [];
      const documents = await connection.collection('provider_documents')
        .find({
          applicationId: objectId(applicationId),
          active: true,
          securityState: 'clean'
        })
        .project({ _id: 0, category: 1, reviewState: 1 })
        .toArray();
      return documents.flatMap((document) => (
        isDocumentCategory(document.category) && isDocumentStatus(document.reviewState)
          ? [{ category: document.category, status: document.reviewState }]
          : []
      ));
    }
  };
}
