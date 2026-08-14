import { Types, type Connection } from 'mongoose';
import type {
  AccountTransitionAction,
  AuthAccountState,
  AuthRoleType,
  ProviderApplicationState,
  ProviderReviewAction,
  ProviderType
} from '@sadat-real-estate/contracts';
import type { IdentityModels } from '../identity/models.js';
import type { ProviderModels } from '../provider/models.js';
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
  roleType: AuthRoleType;
  status: AuthAccountState;
  version?: number;
}

interface LeanProviderApplication {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  providerType: ProviderType;
  status: ProviderApplicationState;
  version?: number;
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

  return {
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
