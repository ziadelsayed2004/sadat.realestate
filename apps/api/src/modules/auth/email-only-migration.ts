import { createHash } from 'node:crypto';
import type { Connection } from 'mongoose';
import type {
  DatabaseMigrationContext,
  DatabaseMigrationDefinition
} from '../database/migrations.js';

type Query = Record<string, unknown>;
type Update = {
  $set?: Record<string, unknown>;
  $unset?: Record<string, unknown>;
};

interface UpdateResult {
  matchedCount?: number;
  modifiedCount?: number;
}

interface IndexDescription {
  name?: string;
  key?: Record<string, unknown>;
}

interface EmailOnlyMigrationCollection {
  countDocuments(filter: Query): Promise<number>;
  updateMany(filter: Query, update: Update): Promise<UpdateResult>;
  listIndexes(): { toArray(): Promise<IndexDescription[]> };
  dropIndex(name: string): Promise<unknown>;
  createIndex(key: Record<string, 1 | -1>, options: { name: string }): Promise<string>;
}

interface EmailOnlyMigrationUserCollection {
  countDocuments(filter: Query): Promise<number>;
}

export interface EmailOnlyMigrationCollections {
  otpChallenges: EmailOnlyMigrationCollection;
  users: EmailOnlyMigrationUserCollection;
}

export interface EmailOnlyMigrationInspection {
  pendingPhoneChallenges: number;
  otpRecordsWithLegacyPhone: number;
  usersWithoutEmail: number;
  legacyPhoneIndexes: string[];
  emailTargetIndexPresent: boolean;
}

export interface EmailOnlyMigrationResult extends EmailOnlyMigrationInspection {
  invalidatedPendingPhoneChallenges: number;
  removedLegacyPhoneFields: number;
  droppedLegacyPhoneIndexes: string[];
  createdEmailTargetIndex: boolean;
}

export const EMAIL_OTP_TARGET_INDEX_NAME = 'otp_challenges_email_target_created';
const EMAIL_OTP_TARGET_INDEX_KEY = Object.freeze({
  normalizedEmail: 1 as const,
  roleType: 1 as const,
  purpose: 1 as const,
  createdAt: -1 as const
});

function hasLegacyPhoneField(index: IndexDescription): boolean {
  return Object.keys(index.key ?? {}).some((key) => key === 'normalizedPhone' || key === 'phone');
}

function stableKey(key: Record<string, unknown> | undefined): string {
  return JSON.stringify(Object.entries(key ?? {}).sort(([left], [right]) => left.localeCompare(right)));
}

function legacyPhoneFilter(): Query {
  return {
    $or: [
      { normalizedPhone: { $type: 'string' } },
      { phone: { $type: 'string' } }
    ]
  };
}

function pendingLegacyPhoneFilter(): Query {
  return {
    $and: [
      legacyPhoneFilter(),
      { $or: [{ status: 'pending' }, { status: { $exists: false } }] }
    ]
  };
}

function missingEmailUserFilter(): Query {
  return {
    roleType: { $in: ['seeker', 'provider'] },
    $or: [
      { normalizedEmail: { $exists: false } },
      { normalizedEmail: null },
      { normalizedEmail: '' }
    ]
  };
}

export function getEmailOnlyMigrationCollections(connection: Connection): EmailOnlyMigrationCollections {
  if (!connection.db) throw new Error('Database connection is not ready');
  const database = connection.db as unknown as {
    collection(name: string): EmailOnlyMigrationCollection;
  };
  return {
    otpChallenges: database.collection('otp_challenges'),
    users: database.collection('users')
  };
}

export async function inspectEmailOnlyAuthMigration(
  collections: EmailOnlyMigrationCollections
): Promise<EmailOnlyMigrationInspection> {
  const indexes = await collections.otpChallenges.listIndexes().toArray();
  return {
    pendingPhoneChallenges: await collections.otpChallenges.countDocuments(pendingLegacyPhoneFilter()),
    otpRecordsWithLegacyPhone: await collections.otpChallenges.countDocuments(legacyPhoneFilter()),
    usersWithoutEmail: await collections.users.countDocuments(missingEmailUserFilter()),
    legacyPhoneIndexes: indexes
      .filter(hasLegacyPhoneField)
      .flatMap(({ name }) => name && name !== '_id_' ? [name] : []),
    emailTargetIndexPresent: indexes.some(({ key }) => stableKey(key) === stableKey(EMAIL_OTP_TARGET_INDEX_KEY))
  };
}

export async function applyEmailOnlyAuthMigration(
  collections: EmailOnlyMigrationCollections,
  now: Date
): Promise<EmailOnlyMigrationResult> {
  const before = await inspectEmailOnlyAuthMigration(collections);
  const invalidated = await collections.otpChallenges.updateMany(
    pendingLegacyPhoneFilter(),
    {
      $set: { status: 'replaced', consumedAt: now, updatedAt: now },
      $unset: { normalizedPhone: '', phone: '' }
    }
  );
  const removedFields = await collections.otpChallenges.updateMany(
    legacyPhoneFilter(),
    { $unset: { normalizedPhone: '', phone: '' } }
  );

  const droppedLegacyPhoneIndexes: string[] = [];
  for (const indexName of before.legacyPhoneIndexes) {
    await collections.otpChallenges.dropIndex(indexName);
    droppedLegacyPhoneIndexes.push(indexName);
  }

  let createdEmailTargetIndex = false;
  if (!before.emailTargetIndexPresent) {
    await collections.otpChallenges.createIndex(EMAIL_OTP_TARGET_INDEX_KEY, {
      name: EMAIL_OTP_TARGET_INDEX_NAME
    });
    createdEmailTargetIndex = true;
  }

  const after = await inspectEmailOnlyAuthMigration(collections);
  return {
    ...after,
    invalidatedPendingPhoneChallenges: invalidated.modifiedCount ?? invalidated.matchedCount ?? 0,
    removedLegacyPhoneFields: removedFields.modifiedCount ?? removedFields.matchedCount ?? 0,
    droppedLegacyPhoneIndexes,
    createdEmailTargetIndex
  };
}

const MIGRATION_CHECKSUM_INPUT = [
  'auth_email_only_otp_identity',
  '1',
  'Invalidate legacy phone OTP challenges and rebuild email target indexes'
].join(':');

export const EMAIL_ONLY_AUTH_MIGRATION_CHECKSUM = createHash('sha256')
  .update(MIGRATION_CHECKSUM_INPUT)
  .digest('hex');

export const EMAIL_ONLY_AUTH_MIGRATION: DatabaseMigrationDefinition = {
  id: 'auth_email_only_otp_identity',
  version: 1,
  checksum: EMAIL_ONLY_AUTH_MIGRATION_CHECKSUM,
  description: 'Invalidate legacy phone OTP challenges and rebuild email target indexes',
  async up({ connection, now }: DatabaseMigrationContext): Promise<void> {
    await applyEmailOnlyAuthMigration(getEmailOnlyMigrationCollections(connection), now);
  }
};
