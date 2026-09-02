import { Types } from 'mongoose';
import type {
  AuthAccountState,
  AuthRoleType,
  OtpPurpose,
  OtpRoleType
} from '@sadat-real-estate/contracts';
import type { IdentityModels } from '../identity/models.js';
import type { AuthModels } from './models.js';

export interface AuthAccount {
  id: string;
  roleType: AuthRoleType;
  status: AuthAccountState;
}

export interface AdminLoginRecord extends AuthAccount {
  roleType: 'admin';
  passwordHash: string;
}

export interface CreateSessionInput {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface RotateSessionInput {
  currentTokenHash: string;
  replacementTokenHash: string;
  replacementExpiresAt: Date;
  now: Date;
}

export type SessionRotationResult =
  | { kind: 'rotated'; account: AuthAccount; sessionId: string }
  | { kind: 'invalid' }
  | { kind: 'reuse_detected' }
  | { kind: 'account_not_active' };

export interface AuthRepository {
  findAdminLogin(email: string): Promise<AdminLoginRecord | undefined>;
  updateAdminPassword(email: string, passwordHash: string, now: Date): Promise<boolean>;
  createSession(input: CreateSessionInput): Promise<{ sessionId: string }>;
  rotateSession(input: RotateSessionInput): Promise<SessionRotationResult>;
  revokeSession(tokenHash: string, now: Date): Promise<boolean>;
}

export interface OtpChallengeContext {
  email: string;
  roleType: OtpRoleType | 'admin';
  purpose: OtpPurpose | 'password_reset';
}

export interface CreateOtpChallengeInput extends OtpChallengeContext {
  publicId: string;
  codeHash: string;
  attempts: number;
  now: Date;
  expiresAt: Date;
  resendAfterSeconds: number;
}

export type CreateOtpChallengeResult =
  | { kind: 'created' }
  | { kind: 'cooldown'; retryAfterSeconds: number };

export interface OtpChallenge extends OtpChallengeContext {
  id: string;
  codeHash: string;
  attemptsRemaining: number;
}

export type FailedOtpAttemptResult =
  | { kind: 'retry'; attemptsRemaining: number }
  | { kind: 'exhausted' }
  | { kind: 'invalid' };

export interface RedeemedOtpGrant {
  email: string;
  roleType: OtpRoleType;
  purpose: 'registration';
}

export interface RedeemedPasswordResetGrant {
  email: string;
  roleType: 'admin';
  purpose: 'password_reset';
}

export interface OtpRepository {
  createChallenge(input: CreateOtpChallengeInput): Promise<CreateOtpChallengeResult>;
  cancelChallenge(publicId: string, now: Date): Promise<void>;
  findChallenge(publicId: string, context: OtpChallengeContext, now: Date): Promise<OtpChallenge | undefined>;
  recordFailedAttempt(challengeId: string, now: Date): Promise<FailedOtpAttemptResult>;
  consumeLoginChallenge(challengeId: string, now: Date): Promise<boolean>;
  verifyRegistrationChallenge(
    challengeId: string,
    verificationTokenHash: string,
    now: Date,
    expiresAt: Date,
    purpose?: 'registration' | 'password_reset'
  ): Promise<boolean>;
  findOtpAccount(
    email: string,
    roleType: OtpRoleType
  ): Promise<AuthAccount | undefined>;
  redeemRegistrationGrant(
    verificationTokenHash: string,
    roleType: OtpRoleType,
    now: Date
  ): Promise<RedeemedOtpGrant | undefined>;
  redeemPasswordResetGrant?(
    verificationTokenHash: string,
    now: Date
  ): Promise<RedeemedPasswordResetGrant | undefined>;
}

interface LeanUser {
  _id: Types.ObjectId;
  roleType: AuthRoleType;
  status: AuthAccountState;
}

interface LeanCredential {
  userId: Types.ObjectId;
  passwordHash: string;
}

interface LeanSession {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  expiresAt: Date;
  revokedAt?: Date;
  replacedBySessionId?: Types.ObjectId;
}

interface LeanOtpChallenge {
  _id: Types.ObjectId;
  publicId: string;
  normalizedEmail: string;
  roleType: OtpRoleType | 'admin';
  purpose: OtpPurpose | 'password_reset';
  codeHash: string;
  attemptsRemaining: number;
  createdAt: Date;
  expiresAt: Date;
  status: string;
}

function toAccount(user: LeanUser): AuthAccount {
  return {
    id: user._id.toHexString(),
    roleType: user.roleType,
    status: user.status
  };
}

function sessionEligible(account: AuthAccount): boolean {
  return account.status !== 'rejected' && account.status !== 'suspended';
}

export function createMongooseAuthRepository(
  identityModels: IdentityModels,
  authModels: AuthModels
): AuthRepository {
  const { User, Session } = identityModels;
  const { AdminCredential } = authModels;

  async function findAccount(userId: Types.ObjectId): Promise<AuthAccount | undefined> {
    const user = await User.findById(userId)
      .select('_id roleType status')
      .lean<LeanUser>()
      .exec();
    return user ? toAccount(user) : undefined;
  }

  async function revokeAll(userId: Types.ObjectId, now: Date): Promise<void> {
    await Session.updateMany(
      { userId, revokedAt: { $exists: false } },
      { $set: { revokedAt: now } }
    ).exec();
  }

  return {
    async findAdminLogin(email) {
      const user = await User.findOne({ normalizedEmail: email, roleType: 'admin' })
        .select('_id roleType status')
        .lean<LeanUser>()
        .exec();
      if (!user || user.roleType !== 'admin') return undefined;
      const credential = await AdminCredential.findOne({ userId: user._id })
        .select('+passwordHash userId')
        .lean<LeanCredential>()
        .exec();
      return credential
        ? { ...toAccount(user), roleType: 'admin', passwordHash: credential.passwordHash }
        : undefined;
    },

    async updateAdminPassword(email, passwordHash, now) {
      const user = await User.findOne({ normalizedEmail: email, roleType: 'admin', status: 'verified' })
        .select('_id')
        .lean<{ _id: Types.ObjectId }>()
        .exec();
      if (!user) return false;
      const result = await AdminCredential.updateOne(
        { userId: user._id },
        { $set: { passwordHash, passwordChangedAt: now, updatedAt: now } }
      ).exec();
      if (result.matchedCount !== 1) return false;
      await revokeAll(user._id, now);
      return true;
    },

    async createSession(input) {
      const session = await Session.create({
        userId: new Types.ObjectId(input.userId),
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt
      });
      return { sessionId: session._id.toString() };
    },

    async rotateSession(input) {
      const current = await Session.findOne({ tokenHash: input.currentTokenHash })
        .select('+tokenHash _id userId expiresAt revokedAt replacedBySessionId')
        .lean<LeanSession>()
        .exec();
      if (!current) return { kind: 'invalid' };

      if (current.revokedAt) {
        if (current.replacedBySessionId) {
          await revokeAll(current.userId, input.now);
          return { kind: 'reuse_detected' };
        }
        return { kind: 'invalid' };
      }
      if (current.expiresAt.getTime() <= input.now.getTime()) {
        await Session.updateOne(
          { _id: current._id, revokedAt: { $exists: false } },
          { $set: { revokedAt: input.now, lastUsedAt: input.now } }
        ).exec();
        return { kind: 'invalid' };
      }

      const account = await findAccount(current.userId);
      if (!account) {
        await revokeAll(current.userId, input.now);
        return { kind: 'invalid' };
      }
      if (!sessionEligible(account)) {
        await revokeAll(current.userId, input.now);
        return { kind: 'account_not_active' };
      }

      const replacementId = new Types.ObjectId();
      await Session.create({
        _id: replacementId,
        userId: current.userId,
        tokenHash: input.replacementTokenHash,
        expiresAt: input.replacementExpiresAt
      });
      const rotation = await Session.updateOne(
        {
          _id: current._id,
          revokedAt: { $exists: false },
          expiresAt: { $gt: input.now }
        },
        {
          $set: {
            revokedAt: input.now,
            lastUsedAt: input.now,
            replacedBySessionId: replacementId
          }
        }
      ).exec();
      if (rotation.modifiedCount !== 1) {
        await revokeAll(current.userId, input.now);
        return { kind: 'reuse_detected' };
      }
      return {
        kind: 'rotated',
        account,
        sessionId: replacementId.toHexString()
      };
    },

    async revokeSession(tokenHash, now) {
      const result = await Session.updateOne(
        { tokenHash, revokedAt: { $exists: false }, expiresAt: { $gt: now } },
        { $set: { revokedAt: now, lastUsedAt: now } }
      ).exec();
      return result.modifiedCount === 1;
    }
  };
}

function activeOtpKey(context: OtpChallengeContext): string {
  return `${context.roleType}:${context.purpose}:${context.email}`;
}

function duplicateKey(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
}

export function createMongooseOtpRepository(
  identityModels: IdentityModels,
  authModels: AuthModels
): OtpRepository {
  const { User } = identityModels;
  const { OtpChallenge } = authModels;

  return {
    async createChallenge(input) {
      const activeKey = activeOtpKey(input);
      const active = await OtpChallenge.findOne({
        activeKey,
        status: 'pending',
        expiresAt: { $gt: input.now }
      })
        .select('+activeKey createdAt expiresAt')
        .lean<Pick<LeanOtpChallenge, 'createdAt' | 'expiresAt'>>()
        .exec();
      if (active) {
        const availableAt = active.createdAt.getTime() + input.resendAfterSeconds * 1000;
        if (availableAt > input.now.getTime()) {
          return {
            kind: 'cooldown',
            retryAfterSeconds: Math.max(1, Math.ceil((availableAt - input.now.getTime()) / 1000))
          };
        }
      }

      await OtpChallenge.updateMany(
        { activeKey, status: 'pending' },
        { $set: { status: 'replaced' }, $unset: { activeKey: 1 } }
      ).exec();
      try {
        await OtpChallenge.create({
          publicId: input.publicId,
          activeKey,
          normalizedEmail: input.email,
          roleType: input.roleType,
          purpose: input.purpose,
          codeHash: input.codeHash,
          attemptsRemaining: input.attempts,
          status: 'pending',
          expiresAt: input.expiresAt
        });
        return { kind: 'created' };
      } catch (error) {
        if (duplicateKey(error)) {
          return { kind: 'cooldown', retryAfterSeconds: input.resendAfterSeconds };
        }
        throw error;
      }
    },

    async cancelChallenge(publicId, now) {
      await OtpChallenge.updateOne(
        { publicId, status: 'pending' },
        {
          $set: { status: 'delivery_failed', consumedAt: now },
          $unset: { activeKey: 1 }
        }
      ).exec();
    },

    async findChallenge(publicId, context, now) {
      const challenge = await OtpChallenge.findOne({
        publicId,
        normalizedEmail: context.email,
        roleType: context.roleType,
        purpose: context.purpose,
        status: 'pending',
        expiresAt: { $gt: now }
      })
        .select('+codeHash _id publicId normalizedEmail roleType purpose attemptsRemaining')
        .lean<LeanOtpChallenge>()
        .exec();
      return challenge
        ? {
            id: challenge._id.toHexString(),
            email: challenge.normalizedEmail,
            roleType: challenge.roleType,
            purpose: challenge.purpose,
            codeHash: challenge.codeHash,
            attemptsRemaining: challenge.attemptsRemaining
          }
        : undefined;
    },

    async recordFailedAttempt(challengeId, now) {
      const retry = await OtpChallenge.findOneAndUpdate(
        {
          _id: new Types.ObjectId(challengeId),
          status: 'pending',
          expiresAt: { $gt: now },
          attemptsRemaining: { $gt: 1 }
        },
        { $inc: { attemptsRemaining: -1 } },
        { new: true }
      )
        .select('attemptsRemaining')
        .lean<Pick<LeanOtpChallenge, 'attemptsRemaining'>>()
        .exec();
      if (retry) return { kind: 'retry', attemptsRemaining: retry.attemptsRemaining };

      const exhausted = await OtpChallenge.updateOne(
        {
          _id: new Types.ObjectId(challengeId),
          status: 'pending',
          expiresAt: { $gt: now },
          attemptsRemaining: 1
        },
        {
          $set: { attemptsRemaining: 0, status: 'failed', consumedAt: now },
          $unset: { activeKey: 1 }
        }
      ).exec();
      return exhausted.modifiedCount === 1 ? { kind: 'exhausted' } : { kind: 'invalid' };
    },

    async consumeLoginChallenge(challengeId, now) {
      const result = await OtpChallenge.updateOne(
        {
          _id: new Types.ObjectId(challengeId),
          status: 'pending',
          purpose: 'login',
          expiresAt: { $gt: now }
        },
        {
          $set: { status: 'consumed', consumedAt: now },
          $unset: { activeKey: 1 }
        }
      ).exec();
      return result.modifiedCount === 1;
    },

    async verifyRegistrationChallenge(challengeId, verificationTokenHash, now, expiresAt, purpose = 'registration') {
      const result = await OtpChallenge.updateOne(
        {
          _id: new Types.ObjectId(challengeId),
          status: 'pending',
          purpose,
          expiresAt: { $gt: now }
        },
        {
          $set: {
            status: 'verified',
            verifiedAt: now,
            verificationTokenHash,
            expiresAt
          },
          $unset: { activeKey: 1 }
        }
      ).exec();
      return result.modifiedCount === 1;
    },

    async findOtpAccount(email, roleType) {
      const user = await User.findOne({
        normalizedEmail: email,
        roleType
      })
        .select('_id roleType status')
        .lean<LeanUser>()
        .exec();
      return user ? toAccount(user) : undefined;
    },

    async redeemRegistrationGrant(verificationTokenHash, roleType, now) {
      const challenge = await OtpChallenge.findOneAndUpdate(
        {
          verificationTokenHash,
          roleType,
          purpose: 'registration',
          status: 'verified',
          expiresAt: { $gt: now },
          consumedAt: { $exists: false }
        },
        { $set: { status: 'consumed', consumedAt: now } },
        { new: true }
      )
        .select('+verificationTokenHash normalizedEmail roleType purpose')
        .lean<LeanOtpChallenge>()
        .exec();
          return challenge
        ? {
            email: challenge.normalizedEmail,
            roleType,
            purpose: 'registration'
          }
          : undefined;
    },

    async redeemPasswordResetGrant(verificationTokenHash, now) {
      const challenge = await OtpChallenge.findOneAndUpdate(
        {
          verificationTokenHash,
          roleType: 'admin',
          purpose: 'password_reset',
          status: 'verified',
          expiresAt: { $gt: now },
          consumedAt: { $exists: false }
        },
        { $set: { status: 'consumed', consumedAt: now } },
        { new: true }
      )
        .select('+verificationTokenHash normalizedEmail roleType purpose')
        .lean<LeanOtpChallenge>()
        .exec();
      return challenge
        ? { email: challenge.normalizedEmail, roleType: 'admin', purpose: 'password_reset' }
        : undefined;
    }
  };
}
