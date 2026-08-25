import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createServer, type AddressInfo } from 'node:net';
import { Readable } from 'node:stream';
import test from 'node:test';
import {
  createClamAvMalwareScanner,
  createLocalFilesystemStorageAdapter,
  createUnavailableMalwareScanner,
  createUnavailableStorageAdapter
} from '../../src/modules/uploads/adapters.js';

test('uses the framed ClamAV PING and INSTREAM protocol over a private TCP boundary', async () => {
  const server = createServer((socket) => {
    let received = Buffer.alloc(0);
    socket.on('data', (chunk: Buffer) => {
      received = Buffer.concat([received, chunk]);
      if (received.includes(Buffer.from('zPING\0'))) {
        socket.end(Buffer.from('PONG\0'));
        return;
      }
      const command = Buffer.from('zINSTREAM\0');
      if (!received.subarray(0, command.byteLength).equals(command)) return;
      let offset = command.byteLength;
      const content: Buffer[] = [];
      while (received.byteLength >= offset + 4) {
        const length = received.readUInt32BE(offset);
        if (received.byteLength < offset + 4 + length) return;
        offset += 4;
        if (length === 0) {
          const body = Buffer.concat(content).toString('utf8');
          socket.end(Buffer.from(body.includes('synthetic-virus')
            ? 'stream: Synthetic-Test-Signature FOUND\0'
            : 'stream: OK\0'));
          return;
        }
        content.push(received.subarray(offset, offset + length));
        offset += length;
      }
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address() as AddressInfo;
  const scanner = createClamAvMalwareScanner({
    host: '127.0.0.1', port: address.port, timeoutMs: 5_000
  });
  try {
    assert.equal(await scanner.isReady(), true);
    assert.equal(await scanner.scan(Readable.from(Buffer.from('clean synthetic bytes'))), 'clean');
    assert.equal(await scanner.scan(Readable.from(Buffer.from('synthetic-virus'))), 'infected');
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

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
