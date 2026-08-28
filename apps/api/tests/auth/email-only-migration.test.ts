import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyEmailOnlyAuthMigration,
  EMAIL_ONLY_AUTH_MIGRATION,
  EMAIL_OTP_TARGET_INDEX_NAME,
  inspectEmailOnlyAuthMigration,
  type EmailOnlyMigrationCollections,
  type EmailOnlyMigrationCollection
} from '../../src/modules/auth/email-only-migration.js';

function fakeCollections(): EmailOnlyMigrationCollections {
  let pendingPhoneChallenges = 2;
  let otpRecordsWithLegacyPhone = 3;
  const indexes = [
    { name: '_id_', key: { _id: 1 } },
    { name: 'otp_challenges_phone_target_created', key: { normalizedPhone: 1, createdAt: -1 } }
  ];
  const otpChallenges = {
    async countDocuments(filter: Record<string, unknown>): Promise<number> {
      if ('$and' in filter) return pendingPhoneChallenges;
      return otpRecordsWithLegacyPhone;
    },
    async updateMany(filter: Record<string, unknown>, _update: Record<string, unknown>) {
      if ('$and' in filter) {
        const changed = pendingPhoneChallenges;
        pendingPhoneChallenges = 0;
        otpRecordsWithLegacyPhone -= changed;
        return { matchedCount: changed, modifiedCount: changed };
      }
      const changed = otpRecordsWithLegacyPhone;
      otpRecordsWithLegacyPhone = 0;
      return { matchedCount: changed, modifiedCount: changed };
    },
    listIndexes() {
      return { toArray: async () => indexes.map((index) => ({ ...index, key: { ...index.key } })) };
    },
    async dropIndex(name: string) {
      const position = indexes.findIndex((index) => index.name === name);
      if (position >= 0) indexes.splice(position, 1);
    },
    async createIndex(key: Record<string, 1 | -1>, options: { name: string }) {
      indexes.push({ name: options.name, key: { ...key } });
      return options.name;
    }
  } as unknown as EmailOnlyMigrationCollection;

  return {
    otpChallenges,
    users: {
      async countDocuments(filter: Record<string, unknown>) {
        assert.deepEqual(filter.roleType, { $in: ['seeker', 'provider'] });
        return 1;
      }
    }
  };
}

test('email-only migration invalidates legacy phone OTP state and rebuilds the email target index', async () => {
  const collections = fakeCollections();
  const before = await inspectEmailOnlyAuthMigration(collections);
  assert.equal(before.pendingPhoneChallenges, 2);
  assert.equal(before.otpRecordsWithLegacyPhone, 3);
  assert.equal(before.usersWithoutEmail, 1);
  assert.deepEqual(before.legacyPhoneIndexes, ['otp_challenges_phone_target_created']);
  assert.equal(before.emailTargetIndexPresent, false);

  const result = await applyEmailOnlyAuthMigration(collections, new Date('2026-08-27T00:00:00.000Z'));
  assert.equal(result.invalidatedPendingPhoneChallenges, 2);
  assert.equal(result.removedLegacyPhoneFields, 1);
  assert.deepEqual(result.droppedLegacyPhoneIndexes, ['otp_challenges_phone_target_created']);
  assert.equal(result.createdEmailTargetIndex, true);
  assert.equal(result.pendingPhoneChallenges, 0);
  assert.equal(result.otpRecordsWithLegacyPhone, 0);
  assert.equal(result.usersWithoutEmail, 1);
  assert.equal(result.emailTargetIndexPresent, true);

  const replay = await inspectEmailOnlyAuthMigration(collections);
  assert.equal(replay.emailTargetIndexPresent, true);
  assert.deepEqual(replay.legacyPhoneIndexes, []);
  assert.equal(EMAIL_ONLY_AUTH_MIGRATION.id, 'auth_email_only_otp_identity');
  assert.match(EMAIL_ONLY_AUTH_MIGRATION.checksum, /^[a-f0-9]{64}$/u);
  assert.equal(EMAIL_OTP_TARGET_INDEX_NAME, 'otp_challenges_email_target_created');
});
