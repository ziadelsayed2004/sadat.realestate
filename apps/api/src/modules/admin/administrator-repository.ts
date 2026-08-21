import { Types, type ClientSession, type Connection } from 'mongoose';
import {
  adminUserDataSchema,
  type AdminUserData
} from '@sadat-real-estate/contracts';
import type { AuditWriter } from '../audit/writer.js';
import type { IdentityModels } from '../identity/models.js';
import type {
  AdministratorRepository,
  AdministratorWriteResult
} from './administrator-service.js';
import type { AdminAccountRecord, AdminBootstrapRecord, AdminModels } from './models.js';

type LeanUser = {
  _id: Types.ObjectId;
  normalizedEmail?: string;
  roleType: 'admin';
  status: string;
  statusChangedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  version?: number;
};

type LeanAdminAccount = AdminAccountRecord & { _id: Types.ObjectId; version?: number };
type LeanBootstrap = AdminBootstrapRecord & { _id: Types.ObjectId };

export interface AdministratorRepositoryDependencies {
  connection: Connection;
  identityModels: IdentityModels;
  adminModels: AdminModels;
  auditWriter?: AuditWriter;
}

function isDuplicateKey(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
}

function objectId(value: string): Types.ObjectId | undefined {
  return /^[a-f0-9]{24}$/.test(value) ? new Types.ObjectId(value) : undefined;
}

function fallbackDisplayName(email: string): string {
  const localPart = email.split('@', 1)[0]?.replace(/[._-]+/g, ' ').trim();
  return localPart && localPart.length >= 2 ? localPart : 'Administrator';
}

function accountFor(
  userId: Types.ObjectId,
  accounts: readonly LeanAdminAccount[],
  bootstraps: readonly LeanBootstrap[]
): { account?: LeanAdminAccount; bootstrap?: LeanBootstrap } {
  const key = userId.toHexString();
  const account = accounts.find((value) => value.userId.toHexString() === key);
  const bootstrap = bootstraps.find((value) => value.userId.toHexString() === key);
  return {
    ...(account ? { account } : {}),
    ...(bootstrap ? { bootstrap } : {})
  };
}

function administratorData(
  user: LeanUser,
  account: LeanAdminAccount | undefined,
  bootstrap: LeanBootstrap | undefined
): AdminUserData | undefined {
  if (!user.normalizedEmail) return undefined;
  const status = user.status === 'verified' ? 'active' : 'disabled';
  const disabledAt = status === 'disabled'
    ? (user.statusChangedAt ?? user.updatedAt).toISOString()
    : undefined;
  return adminUserDataSchema.parse({
    id: user._id.toHexString(),
    email: user.normalizedEmail,
    displayName: account?.displayName ?? fallbackDisplayName(user.normalizedEmail),
    accessLevel: account?.accessLevel ?? bootstrap?.accessLevel ?? 'standard_admin',
    status,
    version: user.version ?? 0,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    ...(disabledAt ? { disabledAt } : {}),
    availableActions: status === 'active' ? ['update', 'disable'] : ['update', 'enable']
  });
}

async function readAdministrators(
  dependencies: AdministratorRepositoryDependencies,
  session?: ClientSession
): Promise<AdminUserData[]> {
  const userQuery = dependencies.identityModels.User.find({ roleType: 'admin' })
    .select({ normalizedEmail: 1, roleType: 1, status: 1, statusChangedAt: 1, createdAt: 1, updatedAt: 1, version: 1 });
  const accountQuery = dependencies.adminModels.AdminAccount.find({})
    .select({ userId: 1, displayName: 1, accessLevel: 1, createdAt: 1, updatedAt: 1, version: 1 });
  const bootstrapQuery = dependencies.adminModels.AdminBootstrap.find({})
    .select({ userId: 1, accessLevel: 1 });
  if (session) {
    userQuery.session(session);
    accountQuery.session(session);
    bootstrapQuery.session(session);
  }
  const [users, accounts, bootstraps] = await Promise.all([
    userQuery.lean<LeanUser[]>(),
    accountQuery.lean<LeanAdminAccount[]>(),
    bootstrapQuery.lean<LeanBootstrap[]>()
  ]);
  return users.flatMap((user) => {
    const related = accountFor(user._id, accounts, bootstraps);
    const value = administratorData(user, related.account, related.bootstrap);
    return value ? [value] : [];
  });
}

async function readAdministrator(
  dependencies: AdministratorRepositoryDependencies,
  id: string,
  session?: ClientSession
): Promise<AdminUserData | undefined> {
  const userId = objectId(id);
  if (!userId) return undefined;
  const userQuery = dependencies.identityModels.User.findOne({ _id: userId, roleType: 'admin' })
    .select({ normalizedEmail: 1, roleType: 1, status: 1, statusChangedAt: 1, createdAt: 1, updatedAt: 1, version: 1 });
  const accountQuery = dependencies.adminModels.AdminAccount.findOne({ userId })
    .select({ userId: 1, displayName: 1, accessLevel: 1, createdAt: 1, updatedAt: 1, version: 1 });
  const bootstrapQuery = dependencies.adminModels.AdminBootstrap.findOne({ userId })
    .select({ userId: 1, accessLevel: 1 });
  if (session) {
    userQuery.session(session);
    accountQuery.session(session);
    bootstrapQuery.session(session);
  }
  const [user, account, bootstrap] = await Promise.all([
    userQuery.lean<LeanUser | null>(),
    accountQuery.lean<LeanAdminAccount | null>(),
    bootstrapQuery.lean<LeanBootstrap | null>()
  ]);
  return user ? administratorData(user, account ?? undefined, bootstrap ?? undefined) : undefined;
}

function auditProjection(value: AdminUserData): Record<string, unknown> {
  return {
    id: value.id,
    email: value.email,
    displayName: value.displayName,
    accessLevel: value.accessLevel,
    status: value.status,
    version: value.version
  };
}

async function recordAudit(
  writer: AuditWriter | undefined,
  input: {
    actorId: string;
    targetId: string;
    action: string;
    reason: string;
    before: Record<string, unknown>;
    after: Record<string, unknown>;
    requestId: string;
    traceId: string;
    occurredAt: Date;
  },
  session: ClientSession
): Promise<void> {
  if (!writer) return;
  await writer.record({
    actorType: 'admin',
    actorId: input.actorId,
    targetType: 'admin_user',
    targetId: input.targetId,
    action: input.action,
    reason: input.reason,
    before: input.before,
    after: input.after,
    requestId: input.requestId,
    traceId: input.traceId,
    occurredAt: input.occurredAt
  }, session);
}

export function createMongooseAdministratorRepository(
  dependencies: AdministratorRepositoryDependencies
): AdministratorRepository {
  const { connection, identityModels, adminModels, auditWriter } = dependencies;
  return {
    async list() {
      return readAdministrators(dependencies);
    },

    async findById(id) {
      return readAdministrator(dependencies, id);
    },

    async countActiveSuperAdmins() {
      const administrators = await readAdministrators(dependencies);
      return administrators.filter((value) => value.status === 'active' && value.accessLevel === 'super_admin').length;
    },

    async create(input): Promise<AdministratorWriteResult> {
      try {
        return await connection.transaction(async (session) => {
          const existing = await identityModels.User.exists({ normalizedEmail: input.data.email }).session(session);
          if (existing) return { kind: 'email_conflict' as const };
          const now = new Date(input.now);
          const [user] = await identityModels.User.create([{
            normalizedEmail: input.data.email,
            roleType: 'admin',
            status: 'verified',
            locale: 'ar',
            statusChangedAt: now,
            createdAt: now,
            updatedAt: now
          }], { session });
          if (!user) throw new Error('ADMINISTRATOR_NOT_CREATED');
          await identityModels.AdminProfile.create([{ userId: user._id, createdAt: now, updatedAt: now }], { session });
          const [account] = await adminModels.AdminAccount.create([{
            userId: user._id,
            displayName: input.data.displayName,
            accessLevel: input.data.accessLevel,
            createdAt: now,
            updatedAt: now
          }], { session });
          if (!account) throw new Error('ADMINISTRATOR_ACCOUNT_NOT_CREATED');
          const value = administratorData(
            user.toObject() as LeanUser,
            account.toObject() as LeanAdminAccount,
            undefined
          );
          if (!value) throw new Error('ADMINISTRATOR_PROJECTION_INVALID');
          await recordAudit(auditWriter, {
            actorId: input.actorId,
            targetId: value.id,
            action: 'admin.administrator_created',
            reason: 'Administrator account created',
            before: { exists: false },
            after: auditProjection(value),
            requestId: input.requestId,
            traceId: input.traceId,
            occurredAt: now
          }, session);
          return { kind: 'created' as const, administrator: value };
        });
      } catch (error) {
        if (isDuplicateKey(error)) return { kind: 'email_conflict' };
        throw error;
      }
    },

    async update(input): Promise<AdministratorWriteResult> {
      const userId = objectId(input.id);
      if (!userId) return { kind: 'not_found' };
      try {
        return await connection.transaction(async (session) => {
          const before = await readAdministrator(dependencies, input.id, session);
          if (!before) return { kind: 'not_found' as const };
          if (input.patch.email) {
            const duplicate = await identityModels.User.exists({
              _id: { $ne: userId },
              normalizedEmail: input.patch.email
            }).session(session);
            if (duplicate) return { kind: 'email_conflict' as const };
          }
          const userChanges: Record<string, unknown> = { updatedAt: new Date(input.now) };
          if (input.patch.email) userChanges.normalizedEmail = input.patch.email;
          if (input.patch.status) {
            userChanges.status = input.patch.status === 'active' ? 'verified' : 'suspended';
            userChanges.statusChangedAt = new Date(input.now);
          }
          const updatedUser = await identityModels.User.findOneAndUpdate(
            { _id: userId, roleType: 'admin', version: input.expectedVersion },
            { $set: userChanges, $inc: { version: 1 } },
            { new: true, runValidators: true, session }
          ).lean<LeanUser | null>();
          if (!updatedUser) {
            const stillExists = await identityModels.User.exists({ _id: userId, roleType: 'admin' }).session(session);
            return stillExists ? { kind: 'version_conflict' as const } : { kind: 'not_found' as const };
          }
          const account = await adminModels.AdminAccount.findOneAndUpdate(
            { userId },
            {
              $set: {
                displayName: input.patch.displayName ?? before.displayName,
                accessLevel: input.patch.accessLevel ?? before.accessLevel,
                updatedAt: new Date(input.now)
              },
              $setOnInsert: { userId, createdAt: before.createdAt }
            },
            { new: true, upsert: true, runValidators: true, session }
          ).lean<LeanAdminAccount>();
          const after = administratorData(updatedUser, account ?? undefined, undefined);
          if (!after) throw new Error('ADMINISTRATOR_PROJECTION_INVALID');
          await recordAudit(auditWriter, {
            actorId: input.actorId,
            targetId: after.id,
            action: 'admin.administrator_updated',
            reason: input.patch.reason,
            before: auditProjection(before),
            after: auditProjection(after),
            requestId: input.requestId,
            traceId: input.traceId,
            occurredAt: new Date(input.now)
          }, session);
          return { kind: 'updated' as const, administrator: after };
        });
      } catch (error) {
        if (isDuplicateKey(error)) return { kind: 'email_conflict' };
        throw error;
      }
    }
  };
}
