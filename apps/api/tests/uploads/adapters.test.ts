import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import test from 'node:test';
import {
  createLocalFilesystemStorageAdapter,
  createUnavailableMalwareScanner,
  createUnavailableStorageAdapter
} from '../../src/modules/uploads/adapters.js';

test('streams local private objects with restrictive generated keys and idempotent deletion', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'sadat-private-storage-test-'));
  const storage = createLocalFilesystemStorageAdapter(root);
  const key = `quarantine/${'a'.repeat(32)}`;
  try {
    assert.equal(await storage.isReady(), true);
    await storage.putPrivateQuarantine(key, Readable.from(Buffer.from('synthetic-private-bytes')));
    const chunks: Buffer[] = [];
    for await (const chunk of await storage.openPrivate(key)) chunks.push(Buffer.from(chunk));
    assert.equal(Buffer.concat(chunks).toString('utf8'), 'synthetic-private-bytes');
    await storage.deletePrivate(key);
    await storage.deletePrivate(key);
    await assert.rejects(storage.openPrivate('../public/file'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('unavailable higher-environment adapters fail readiness and operations closed', async () => {
  const storage = createUnavailableStorageAdapter();
  const scanner = createUnavailableMalwareScanner();
  assert.equal(await storage.isReady(), false);
  assert.equal(await scanner.isReady(), false);
  await assert.rejects(storage.putPrivateQuarantine(
    `quarantine/${'a'.repeat(32)}`,
    Readable.from(Buffer.from('synthetic'))
  ), /PRIVATE_STORAGE_UNAVAILABLE/);
  await assert.rejects(scanner.scan(Readable.from(Buffer.from('synthetic'))), /MALWARE_SCANNER_UNAVAILABLE/);
});
