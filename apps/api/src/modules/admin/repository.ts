import { Types, type ClientSession, type Connection } from 'mongoose';
import type { AdminBootstrapInput } from '@sadat-real-estate/contracts';
import { FIRST_SUPER_ADMIN_BOOTSTRAP_KEY } from '@sadat-real-estate/contracts';
import type { AuthModels } from '../auth/models.js';
import type { IdentityModels } from '../identity/models.js';
import type { AdminModels } from './models.js';

export interface CreateFirstSuperAdminInput {
  email: AdminBootstrapInput['email'];
  locale: AdminBootstrapInput['locale'];
  passwordHash: string;
  now: Date;
}

export type CreateFirstSuperAdminResult =
  | { kind: 'created'; adminId: string }
  | { kind: 'already_bootstrapped' }
  | { kind: 'administrator_exists' }
  | { kind: 'concurrent_conflict' };

export interface AdminRepository {
  createFirstSuperAdmin(input: CreateFirstSuperAdminInput): Promise<CreateFirstSuperAdminResult>;
}

export interface AdminBootstrapStore {
  bootstrapExists(): Promise<boolean>;
  administratorExists(): Promise<boolean>;
  create(input: CreateFirstSuperAdminInput): Promise<{ adminId: string }>;
}

export type AdminBootstrapTransaction = <T>(
  operation: (store: AdminBootstrapStore) => Promise<T>
) => Promise<T>;

function isDuplicateKey(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
}

export function createAdminRepository(transaction: AdminBootstrapTransaction): AdminRepository {
  return {
    async createFirstSuperAdmin(input) {
      try {
        return await transaction(async (store) => {
          if (await store.bootstrapExists()) return { kind: 'already_bootstrapped' } as const;
          if (await store.administratorExists()) return { kind: 'administrator_exists' } as const;
          const created = await store.create(input);
          return { kind: 'created', adminId: created.adminId } as const;
        });
      } catch (error) {
        if (isDuplicateKey(error)) return { kind: 'concurrent_conflict' };
        throw error;
      }
    }
  };
}

function mongooseStore(
  session: ClientSession,
  identityModels: IdentityModels,
  authModels: AuthModels,
  adminModels: AdminModels
): AdminBootstrapStore {
  return {
    async bootstrapExists() {
      return Boolean(await adminModels.AdminBootstrap.exists({
        bootstrapKey: FIRST_SUPER_ADMIN_BOOTSTRAP_KEY
      }).session(session));
    },
    async administratorExists() {
      return Boolean(await identityModels.User.exists({ roleType: 'admin' }).session(session));
    },
    async create(input) {
      const userId = new Types.ObjectId();
      await identityModels.User.create([{
        _id: userId,
        normalizedEmail: input.email,
        roleType: 'admin',
        status: 'verified',
        locale: input.locale,
        statusChangedAt: input.now
      }], { session });
      await identityModels.AdminProfile.create([{ userId }], { session });
      await authModels.AdminCredential.create([{
        userId,
        passwordHash: input.passwordHash,
        passwordChangedAt: input.now
      }], { session });
      await adminModels.AdminBootstrap.create([{
        bootstrapKey: FIRST_SUPER_ADMIN_BOOTSTRAP_KEY,
        userId,
        accessLevel: 'super_admin',
        completedAt: input.now
      }], { session });
      return { adminId: userId.toHexString() };
    }
  };
}

export function createMongooseAdminRepository(
  connection: Connection,
  identityModels: IdentityModels,
  authModels: AuthModels,
  adminModels: AdminModels
): AdminRepository {
  return createAdminRepository(async (operation) => {
    const session = await connection.startSession();
    try {
      let result: Awaited<ReturnType<typeof operation>> | undefined;
      await session.withTransaction(async () => {
        result = await operation(mongooseStore(session, identityModels, authModels, adminModels));
      });
      if (result === undefined) throw new Error('Admin bootstrap transaction did not complete');
      return result;
    } finally {
      await session.endSession();
    }
  });
}
