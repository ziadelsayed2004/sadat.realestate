import assert from 'node:assert/strict';
import os from 'node:os';
import test from 'node:test';
import {
  parseUploadEnvironment,
  UploadEnvironmentValidationError
} from '../../src/modules/uploads/environment.js';

test('uses isolated deterministic Local/Test storage modes', () => {
  const local = parseUploadEnvironment({}, 'local');
  assert.equal(local.mode, 'local-filesystem');
  assert.equal(local.scannerMode, 'deterministic-fake');
  assert.ok(local.localRoot?.startsWith(os.tmpdir()));
  assert.equal(parseUploadEnvironment({}, 'test').mode, 'memory');
});

test('fails closed in Preview/UAT/Production unless persistent storage, ClamAV, and signing are configured', () => {
  for (const environment of ['preview', 'uat', 'production'] as const) {
    assert.throws(() => parseUploadEnvironment({}, environment), UploadEnvironmentValidationError);
  }
  const value = parseUploadEnvironment({
    PRIVATE_STORAGE_MODE: 'local-filesystem',
    PRIVATE_STORAGE_LOCAL_ROOT: '/var/lib/sadat/private',
    MALWARE_SCANNER_MODE: 'clamav',
    CLAMAV_HOST: 'clamav',
    CLAMAV_PORT: '3310',
    PRIVATE_DOWNLOAD_SIGNING_SECRET: Buffer.alloc(32, 9).toString('base64url')
  }, 'production');
  assert.equal(value.mode, 'local-filesystem');
  assert.equal(value.scannerMode, 'clamav');
  assert.equal(value.productionConfigurationPresent, true);
});
