import assert from 'node:assert/strict';
import test from 'node:test';
import { executeBackupRestoreDrill, planBackupRestoreDrill, type BackupProvider } from '../../src/modules/database/backup-restore.js';

const now = new Date('2026-01-01T00:00:00.000Z');

function provider(verified: boolean): BackupProvider & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    async createBackup() {
      calls.push('backup');
      return { backupId: 'synthetic-backup-1', source: 'provider', createdAt: now.toISOString(), collectionCount: 2 };
    },
    async restoreBackup() { calls.push('restore'); },
    async verifyRestore() { calls.push('verify'); return verified; }
  };
}

test('plans a non-destructive drill without a provider', () => {
  assert.deepEqual(planBackupRestoreDrill({ environment: 'production', restoreTarget: 'isolated-uat-1', now }), {
    status: 'planned', restoreTarget: 'isolated-uat-1', startedAt: now.toISOString()
  });
});

test('blocks execution without an approved provider and requires explicit confirmation', async () => {
  const blocked = await executeBackupRestoreDrill({ environment: 'production', restoreTarget: 'isolated-uat-1', mode: 'execute', confirm: true, now });
  assert.equal(blocked.status, 'blocked');
  assert.equal(blocked.reason, 'BACKUP_PROVIDER_UNAVAILABLE');
  await assert.rejects(executeBackupRestoreDrill({ environment: 'production', restoreTarget: 'isolated-uat-1', mode: 'execute', now }), /explicit confirmation/);
  assert.throws(() => planBackupRestoreDrill({ environment: 'production', restoreTarget: '../production', now }), /opaque isolated identifier/);
  assert.throws(() => planBackupRestoreDrill({ environment: 'production', restoreTarget: 'production', now }), /opaque isolated identifier/);
});

test('verifies an isolated restore and reports failed verification without claiming success', async () => {
  const good = provider(true);
  const verified = await executeBackupRestoreDrill({ environment: 'uat', restoreTarget: 'isolated-uat-1', mode: 'execute', confirm: true, now, provider: good });
  assert.equal(verified.status, 'verified');
  assert.equal(verified.backupId, 'synthetic-backup-1');
  assert.deepEqual(good.calls, ['backup', 'restore', 'verify']);
  const bad = provider(false);
  const failed = await executeBackupRestoreDrill({ environment: 'uat', restoreTarget: 'isolated-uat-2', mode: 'execute', confirm: true, now, provider: bad });
  assert.equal(failed.status, 'failed');
  assert.equal(failed.reason, 'BACKUP_RESTORE_VERIFICATION_FAILED');
});
