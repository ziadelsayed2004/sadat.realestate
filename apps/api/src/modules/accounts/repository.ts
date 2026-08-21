import { Types, type Connection, type QueryFilter } from 'mongoose';
import type {
  AdminAccountUserData,
  AdminAccountUserListData,
  AdminAccountUserListQuery,
  AdminProviderData,
  AdminProviderDocumentData,
  AdminProviderListData,
  AdminProviderListQuery,
  AccountTransitionAction,
  AuthAccountState,
  AuthRoleType,
  ProviderApplicationState,
  ProviderReviewAction,
  ProviderType
} from '@sadat-real-estate/contracts';
import {
  adminAccountUserDataSchema,
  adminAccountUserListDataSchema,
  adminProviderDataSchema,
  adminProviderDocumentDataSchema,
  adminProviderListDataSchema
} from '@sadat-real-estate/contracts';
import type { IdentityModels, UserRecord } from '../identity/models.js';
import type { ProviderApplicationRecord, ProviderModels } from '../provider/models.js';
import type { AuditWriter } from '../audit/writer.js';
import type { AccountModels } from './models.js';

export interface AccountTarget {
  userId: string;
  roleType: AuthRoleType;
  status: AuthAccountState;
  version: number;
}

export interface ProviderReviewTarget {
  providerApplicationId: string;
  userId: string;
  providerType: ProviderType;
  accountStatus: AuthAccountState;
  accountVersion: number;
  applicationStatus: ProviderApplicationState;
  applicationVersion: number;
  profileStatus: ProviderApplicationState;
  profileVersion: number;
}

export interface TransitionContext {
  actorAdminId: string;
  action: AccountTransitionAction;
  reason: string;
  requestId: string;
  traceId: string;
  changedAt: Date;
}

export interface AccountTransitionWriteInput extends TransitionContext {
  target: AccountTarget;
  toStatus: AuthAccountState;
}

export interface ProviderReviewWriteInput extends Omit<TransitionContext, 'action'> {
  action: ProviderReviewAction;
  target: ProviderReviewTarget;
  toAccountStatus: AuthAccountState;
  toProviderStatus: ProviderApplicationState;
}

export type AccountTransitionWriteResult =
  | { kind: 'written'; transitionId: string; version: number }
  | { kind: 'conflict' };

export type ProviderReviewWriteResult =
  | {
      kind: 'written';
      transitionId: string;
      accountVersion: number;
      applicationVersion: number;
    }
  | { kind: 'conflict' };

export interface AccountRepository {
  listUsers(query: AdminAccountUserListQuery): Promise<AdminAccountUserListData>;
  findUser(userId: string): Promise<AdminAccountUserData | undefined>;
  listProviders(query: AdminProviderListQuery): Promise<AdminProviderListData>;
  findProvider(providerId: string): Promise<AdminProviderData | undefined>;
  findAccount(userId: string): Promise<AccountTarget | undefined>;
  findProviderReviewTarget(providerApplicationId: string): Promise<ProviderReviewTarget | undefined>;
  isAccessSessionCurrent(input: {
    userId: string;
    sessionId: string;
    roleType: AuthRoleType;
    status: AuthAccountState;
    now: Date;
  }): Promise<boolean>;
  transitionAccount(input: AccountTransitionWriteInput): Promise<AccountTransitionWriteResult>;
  reviewProvider(input: ProviderReviewWriteInput): Promise<ProviderReviewWriteResult>;
}

interface LeanUser {
  _id: Types.ObjectId;
  normalizedEmail?: string;
  normalizedPhone?: string;
  roleType: AuthRoleType;
  status: AuthAccountState;
  locale: 'ar' | 'en' | 'zh-CN';
  statusChangedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  version?: number;
}

interface LeanUserProfile {
  userId: Types.ObjectId;
  firstName?: string;
  lastName?: string;
}

interface LeanProviderApplication extends Partial<ProviderApplicationRecord> {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  providerType: ProviderType;
  status: ProviderApplicationState;
  createdAt: Date;
  updatedAt: Date;
  version?: number;
}

interface LeanProviderDocument {
  _id: Types.ObjectId;
  applicationId: Types.ObjectId;
  category: string;
  originalFilename: string;
  detectedMime: string;
  byteSize: number;
  version: number;
  securityState: string;
  reviewState: string;
  uploadedAt: Date;
  active: boolean;
}

interface LeanProviderProfile {
  userId: Types.ObjectId;
  status: ProviderApplicationState;
  version?: number;
}

interface LeanSession {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  expiresAt: Date;
  revokedAt?: Date;
}

class ConcurrentAccountTransitionError extends Error {
  constructor() {
    super('ACCOUNT_TRANSITION_CONFLICT');
    this.name = 'ConcurrentAccountTransitionError';
  }
}

function validObjectId(value: string): boolean {
  return /^[a-f0-9]{24}$/.test(value);
}

function objectId(value: string): Types.ObjectId {
  return new Types.ObjectId(value);
}

function accountTarget(user: LeanUser): AccountTarget {
  return {
    userId: user._id.toHexString(),
    roleType: user.roleType,
    status: user.status,
    version: user.version ?? 0
  };
}

function accountActions(roleType: AuthRoleType, status: AuthAccountState): AccountTransitionAction[] {
  if (roleType === 'provider') {
    if (status === 'verified') return ['restrict'];
    if (status === 'restricted') return ['verify'];
    return [];
  }
  if (status === 'pending_review') return ['verify', 'reject', 'needs_information'];
  if (status === 'verified') return ['suspend', 'restrict'];
  if (status === 'restricted' || status === 'suspended') return ['verify'];
  return [];
}

function userData(
  user: LeanUser,
  displayName?: string
): AdminAccountUserData {
  return adminAccountUserDataSchema.parse({
    id: user._id.toHexString(),
    roleType: user.roleType,
    status: user.status,
    ...(user.normalizedEmail ? { email: user.normalizedEmail } : {}),
    ...(user.normalizedPhone ? { phone: user.normalizedPhone } : {}),
    locale: user.locale,
    ...(displayName ? { displayName } : {}),
    version: user.version ?? 0,
    statusChangedAt: user.statusChangedAt.toISOString(),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    availableActions: accountActions(user.roleType, user.status)
  });
}

function providerActions(status: ProviderApplicationState): ProviderReviewAction[] {
  if (status === 'pending_review') return ['verify', 'reject', 'needs_information'];
  if (status === 'approved') return ['suspend'];
  if (status === 'suspended') return ['verify'];
  return [];
}

function providerDocument(value: LeanProviderDocument): AdminProviderDocumentData | undefined {
  try {
    return adminProviderDocumentDataSchema.parse({
      id: value._id.toHexString(),
      applicationId: value.applicationId.toHexString(),
      category: value.category,
      originalFilename: value.originalFilename,
      detectedMime: value.detectedMime,
      byteSize: value.byteSize,
      version: value.version,
      securityState: value.securityState,
      reviewState: value.reviewState,
      uploadedAt: value.uploadedAt.toISOString(),
      active: value.active
    });
  } catch {
    return undefined;
  }
}

function providerData(
  application: LeanProviderApplication,
  user: LeanUser,
  documents: readonly AdminProviderDocumentData[]
): AdminProviderData {
  return adminProviderDataSchema.parse({
    id: application._id.toHexString(),
    userId: application.userId.toHexString(),
    providerType: application.providerType,
    applicationStatus: application.status,
    accountStatus: user.status,
    accountVersion: user.version ?? 0,
    applicationVersion: application.version ?? 0,
    ...(user.normalizedPhone ? { phone: user.normalizedPhone } : {}),
    ...(user.normalizedEmail ? { email: user.normalizedEmail } : {}),
    ...(application.accountOwnerFullName ? { accountOwnerFullName: application.accountOwnerFullName } : {}),
    ...(application.displayName ? { displayName: application.displayName } : {}),
    ...(application.legalBusinessName ? { legalBusinessName: application.legalBusinessName } : {}),
    ...(application.tradeName ? { tradeName: application.tradeName } : {}),
    ...(application.legalCompanyName ? { legalCompanyName: application.legalCompanyName } : {}),
    ...(application.brandName ? { brandName: application.brandName } : {}),
    ...(application.reviewReason ? { reviewReason: application.reviewReason } : {}),
    ...(application.submittedAt ? { submittedAt: application.submittedAt.toISOString() } : {}),
    createdAt: application.createdAt.toISOString(),
    updatedAt: application.updatedAt.toISOString(),
    documents,
    availableActions: providerActions(application.status)
  });
}

export function createMongooseAccountRepository(
  connection: Connection,
  identityModels: IdentityModels,
  providerModels: ProviderModels,
  accountModels: AccountModels,
  auditWriter: AuditWriter
): AccountRepository {
  const { User, ProviderProfile, Session } = identityModels;
  const { ProviderApplication } = providerModels;
  const { AccountStateTransition } = accountModels;

  async function providerDocuments(applicationId: string): Promise<AdminProviderDocumentData[]> {
    const documents = await connection.collection('provider_documents')
      .find({ applicationId: new Types.ObjectId(applicationId), active: true })
      .sort({ uploadedAt: -1, _id: 1 })
      .toArray();
    return documents.flatMap((document) => {
      const value = Object.fromEntries(Object.entries(document)) as LeanProviderDocument;
      const projected = providerDocument(value);
      return projected ? [projected] : [];
    });
  }

  async function usersFor(userIds: readonly Types.ObjectId[]): Promise<Map<string, LeanUser>> {
    const users = await User.find({ _id: { $in: userIds } })
      .select('_id normalizedEmail normalizedPhone roleType status locale statusChangedAt createdAt updatedAt version')
      .lean<LeanUser[]>()
      .exec();
    return new Map(users.map((user) => [user._id.toHexString(), user]));
  }

  return {
    async listUsers(query) {
      const filter: QueryFilter<UserRecord> = {
        roleType: query.roleType ? query.roleType : { $in: ['seeker', 'provider'] },
        ...(query.status ? { status: query.status } : {})
      };
      const [users, total] = await Promise.all([
        User.find(filter)
          .sort({ createdAt: -1, _id: 1 })
          .skip((query.page - 1) * query.limit)
          .limit(query.limit)
          .select('_id normalizedEmail normalizedPhone roleType status locale statusChangedAt createdAt updatedAt version')
          .lean<LeanUser[]>()
          .exec(),
        User.countDocuments(filter).exec()
      ]);
      const ids = users.map((user) => user._id);
      const [seekers, applications] = await Promise.all([
        identityModels.SeekerProfile.find({ userId: { $in: ids } })
          .select('userId firstName lastName')
          .lean<LeanUserProfile[]>()
          .exec(),
        ProviderApplication.find({ userId: { $in: ids } })
          .select('userId displayName')
          .lean<Array<Pick<LeanProviderApplication, 'userId' | 'displayName'>>>()
          .exec()
      ]);
      const names = new Map<string, string>();
      for (const profile of seekers) {
        const name = [profile.firstName, profile.lastName].filter(Boolean).join(' ').trim();
        if (name) names.set(profile.userId.toHexString(), name);
      }
      for (const application of applications) {
        if (application.displayName) names.set(application.userId.toHexString(), application.displayName);
      }
      return adminAccountUserListDataSchema.parse({
        items: users.map((user) => userData(user, names.get(user._id.toHexString()))),
        page: query.page,
        limit: query.limit,
        total
      });
    },

    async findUser(userId) {
      if (!validObjectId(userId)) return undefined;
      const user = await User.findOne({
        _id: objectId(userId),
        roleType: { $in: ['seeker', 'provider'] }
      })
        .select('_id normalizedEmail normalizedPhone roleType status locale statusChangedAt createdAt updatedAt version')
        .lean<LeanUser | null>()
        .exec();
      if (!user) return undefined;
      const [seeker, application] = await Promise.all([
        identityModels.SeekerProfile.findOne({ userId: user._id })
          .select('firstName lastName')
          .lean<Pick<LeanUserProfile, 'firstName' | 'lastName'> | null>()
          .exec(),
        ProviderApplication.findOne({ userId: user._id })
          .select('displayName')
          .lean<Pick<LeanProviderApplication, 'displayName'> | null>()
          .exec()
      ]);
      const displayName = application?.displayName
        ?? [seeker?.firstName, seeker?.lastName].filter(Boolean).join(' ').trim();
      return userData(user, displayName || undefined);
    },

    async listProviders(query) {
      const filter = {
        ...(query.status ? { status: query.status } : {}),
        ...(query.providerType ? { providerType: query.providerType } : {})
      };
      const [applications, total] = await Promise.all([
        ProviderApplication.find(filter)
          .sort({ updatedAt: -1, _id: 1 })
          .skip((query.page - 1) * query.limit)
          .limit(query.limit)
          .lean<LeanProviderApplication[]>()
          .exec(),
        ProviderApplication.countDocuments(filter).exec()
      ]);
      const users = await usersFor(applications.map((application) => application.userId));
      return adminProviderListDataSchema.parse({
        items: applications.flatMap((application) => {
          const user = users.get(application.userId.toHexString());
          if (!user) return [];
          return [providerData(application, user, [])];
        }),
        page: query.page,
        limit: query.limit,
        total
      });
    },

    async findProvider(providerId) {
      if (!validObjectId(providerId)) return undefined;
      const application = await ProviderApplication.findById(objectId(providerId))
        .lean<LeanProviderApplication | null>()
        .exec();
      if (!application) return undefined;
      const user = await User.findOne({ _id: application.userId, roleType: 'provider' })
        .select('_id normalizedEmail normalizedPhone roleType status locale statusChangedAt createdAt updatedAt version')
        .lean<LeanUser | null>()
        .exec();
      if (!user) return undefined;
      return providerData(application, user, await providerDocuments(providerId));
    },

    async findAccount(userId) {
      if (!validObjectId(userId)) return undefined;
      const user = await User.findById(userId)
        .select('_id roleType status version')
        .lean<LeanUser | null>()
        .exec();
      return user ? accountTarget(user) : undefined;
    },

    async findProviderReviewTarget(providerApplicationId) {
      if (!validObjectId(providerApplicationId)) return undefined;
      const application = await ProviderApplication.findById(providerApplicationId)
        .select('_id userId providerType status version')
        .lean<LeanProviderApplication | null>()
        .exec();
      if (!application) return undefined;
      const [user, profile] = await Promise.all([
        User.findOne({ _id: application.userId, roleType: 'provider' })
          .select('_id roleType status version')
          .lean<LeanUser | null>()
          .exec(),
        ProviderProfile.findOne({ userId: application.userId })
          .select('userId status version')
          .lean<LeanProviderProfile | null>()
          .exec()
      ]);
      if (!user || user.roleType !== 'provider' || !profile) return undefined;
      return {
        providerApplicationId: application._id.toHexString(),
        userId: user._id.toHexString(),
        providerType: application.providerType,
        accountStatus: user.status,
        accountVersion: user.version ?? 0,
        applicationStatus: application.status,
        applicationVersion: application.version ?? 0,
        profileStatus: profile.status,
        profileVersion: profile.version ?? 0
      };
    },

    async isAccessSessionCurrent(input) {
      if (!validObjectId(input.userId) || !validObjectId(input.sessionId)) return false;
      const userId = objectId(input.userId);
      const [user, session] = await Promise.all([
        User.findOne({
          _id: userId,
          roleType: input.roleType,
          status: input.status
        }).select('_id').lean<{ _id: Types.ObjectId } | null>().exec(),
        Session.findOne({
          _id: objectId(input.sessionId),
          userId,
          revokedAt: { $exists: false },
          expiresAt: { $gt: input.now }
        }).select('_id userId expiresAt revokedAt').lean<LeanSession | null>().exec()
      ]);
      return Boolean(user && session);
    },

    async transitionAccount(input) {
      try {
        return await connection.transaction(async (session) => {
          const userId = objectId(input.target.userId);
          const updated = await User.updateOne(
            {
              _id: userId,
              roleType: input.target.roleType,
              status: input.target.status,
              version: input.target.version
            },
            {
              $set: { status: input.toStatus, statusChangedAt: input.changedAt },
              $inc: { version: 1 }
            },
            { session, runValidators: true }
          ).exec();
          if (updated.modifiedCount !== 1) throw new ConcurrentAccountTransitionError();

          await Session.updateMany(
            { userId, revokedAt: { $exists: false } },
            { $set: { revokedAt: input.changedAt, lastUsedAt: input.changedAt } },
            { session }
          ).exec();

          const [transition] = await AccountStateTransition.create([{
            targetUserId: userId,
            actorAdminId: objectId(input.actorAdminId),
            targetRoleType: input.target.roleType,
            action: input.action,
            fromAccountStatus: input.target.status,
            toAccountStatus: input.toStatus,
            reason: input.reason,
            requestId: input.requestId,
            traceId: input.traceId,
            createdAt: input.changedAt
          }], { session });
          if (!transition) throw new Error('Account transition record was not created');
          await auditWriter.record({
            actorType: 'admin',
            actorId: input.actorAdminId,
            targetType: 'user',
            targetId: input.target.userId,
            action: `account.${input.action}`,
            reason: input.reason,
            before: {
              roleType: input.target.roleType,
              status: input.target.status,
              version: input.target.version
            },
            after: {
              roleType: input.target.roleType,
              status: input.toStatus,
              version: input.target.version + 1
            },
            requestId: input.requestId,
            traceId: input.traceId,
            occurredAt: input.changedAt
          }, session);
          return {
            kind: 'written' as const,
            transitionId: transition._id.toHexString(),
            version: input.target.version + 1
          };
        });
      } catch (error) {
        if (error instanceof ConcurrentAccountTransitionError) return { kind: 'conflict' };
        throw error;
      }
    },

    async reviewProvider(input) {
      try {
        return await connection.transaction(async (session) => {
          const userId = objectId(input.target.userId);
          const providerApplicationId = objectId(input.target.providerApplicationId);
          const [applicationWrite, profileWrite, accountWrite] = await Promise.all([
            ProviderApplication.updateOne(
              {
                _id: providerApplicationId,
                userId,
                status: input.target.applicationStatus,
                version: input.target.applicationVersion
              },
              {
                $set: {
                  status: input.toProviderStatus,
                  statusChangedAt: input.changedAt,
                  reviewReason: input.reason
                },
                $inc: { version: 1 }
              },
              { session, runValidators: true }
            ).exec(),
            ProviderProfile.updateOne(
              {
                userId,
                status: input.target.profileStatus,
                version: input.target.profileVersion
              },
              {
                $set: { status: input.toProviderStatus, statusChangedAt: input.changedAt },
                $inc: { version: 1 }
              },
              { session, runValidators: true }
            ).exec(),
            User.updateOne(
              {
                _id: userId,
                roleType: 'provider',
                status: input.target.accountStatus,
                version: input.target.accountVersion
              },
              {
                $set: { status: input.toAccountStatus, statusChangedAt: input.changedAt },
                $inc: { version: 1 }
              },
              { session, runValidators: true }
            ).exec()
          ]);
          if (
            applicationWrite.modifiedCount !== 1
            || profileWrite.modifiedCount !== 1
            || accountWrite.modifiedCount !== 1
          ) {
            throw new ConcurrentAccountTransitionError();
          }

          await Session.updateMany(
            { userId, revokedAt: { $exists: false } },
            { $set: { revokedAt: input.changedAt, lastUsedAt: input.changedAt } },
            { session }
          ).exec();

          const [transition] = await AccountStateTransition.create([{
            targetUserId: userId,
            providerApplicationId,
            actorAdminId: objectId(input.actorAdminId),
            targetRoleType: 'provider',
            action: input.action,
            fromAccountStatus: input.target.accountStatus,
            toAccountStatus: input.toAccountStatus,
            fromProviderStatus: input.target.applicationStatus,
            toProviderStatus: input.toProviderStatus,
            reason: input.reason,
            requestId: input.requestId,
            traceId: input.traceId,
            createdAt: input.changedAt
          }], { session });
          if (!transition) throw new Error('Provider review transition record was not created');
          await auditWriter.record({
            actorType: 'admin',
            actorId: input.actorAdminId,
            targetType: 'provider_application',
            targetId: input.target.providerApplicationId,
            action: `provider.${input.action}`,
            reason: input.reason,
            before: {
              userId: input.target.userId,
              providerType: input.target.providerType,
              accountStatus: input.target.accountStatus,
              applicationStatus: input.target.applicationStatus,
              profileStatus: input.target.profileStatus,
              accountVersion: input.target.accountVersion,
              applicationVersion: input.target.applicationVersion
            },
            after: {
              userId: input.target.userId,
              providerType: input.target.providerType,
              accountStatus: input.toAccountStatus,
              applicationStatus: input.toProviderStatus,
              profileStatus: input.toProviderStatus,
              accountVersion: input.target.accountVersion + 1,
              applicationVersion: input.target.applicationVersion + 1
            },
            requestId: input.requestId,
            traceId: input.traceId,
            occurredAt: input.changedAt
          }, session);
          return {
            kind: 'written' as const,
            transitionId: transition._id.toHexString(),
            accountVersion: input.target.accountVersion + 1,
            applicationVersion: input.target.applicationVersion + 1
          };
        });
      } catch (error) {
        if (error instanceof ConcurrentAccountTransitionError) return { kind: 'conflict' };
        throw error;
      }
    }
  };
}
