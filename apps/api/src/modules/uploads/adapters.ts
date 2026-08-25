import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import { createConnection, type Socket } from 'node:net';
import { once } from 'node:events';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

export interface StorageAdapter {
  readonly kind: 'memory' | 'local-filesystem' | 'unavailable';
  isReady(): boolean | Promise<boolean>;
  putPrivateQuarantine(objectKey: string, source: Readable): Promise<void>;
  openPrivate(objectKey: string): Promise<Readable>;
  deletePrivate(objectKey: string): Promise<void>;
}

export type MalwareScanOutcome = 'clean' | 'infected' | 'timeout' | 'failed';

export interface MalwareScannerAdapter {
  readonly kind: 'deterministic-fake' | 'clamav' | 'unavailable';
  isReady(): boolean | Promise<boolean>;
  scan(source: Readable): Promise<MalwareScanOutcome>;
}

export interface PrivateDownloadSigner {
  issue(documentId: string, expiresAt: Date): string;
  verify(documentId: string, expiresAtSeconds: string, signature: string, now?: Date): boolean;
}

const safeKeyPattern = /^quarantine\/[a-f0-9]{32}$/;

function assertObjectKey(value: string): void {
  if (!safeKeyPattern.test(value)) throw new Error('Storage object key is invalid');
}

export function createInMemoryStorageAdapter(): StorageAdapter & { has(key: string): boolean } {
  const objects = new Map<string, Buffer>();
  return {
    kind: 'memory',
    isReady: () => true,
    has: (key) => objects.has(key),
    async putPrivateQuarantine(objectKey, source) {
      assertObjectKey(objectKey);
      const chunks: Buffer[] = [];
      for await (const chunk of source) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      objects.set(objectKey, Buffer.concat(chunks));
    },
    async openPrivate(objectKey) {
      assertObjectKey(objectKey);
      const value = objects.get(objectKey);
      if (!value) throw new Error('PRIVATE_OBJECT_NOT_FOUND');
      return Readable.from(value);
    },
    async deletePrivate(objectKey) {
      assertObjectKey(objectKey);
      objects.delete(objectKey);
    }
  };
}

export function createLocalFilesystemStorageAdapter(root: string): StorageAdapter {
  const resolvedRoot = path.resolve(root);
  const objectPath = (key: string) => {
    assertObjectKey(key);
    const target = path.resolve(resolvedRoot, key);
    if (!target.startsWith(`${resolvedRoot}${path.sep}`)) throw new Error('Storage path escaped its root');
    return target;
  };
  return {
    kind: 'local-filesystem',
    async isReady() {
      try {
        await mkdir(path.join(resolvedRoot, 'quarantine'), { recursive: true });
        return true;
      } catch {
        return false;
      }
    },
    async putPrivateQuarantine(key, source) {
      const target = objectPath(key);
      await mkdir(path.dirname(target), { recursive: true });
      try {
        await pipeline(source, createWriteStream(target, { flags: 'wx', mode: 0o600 }));
      } catch (error) {
        await rm(target, { force: true });
        throw error;
      }
    },
    async openPrivate(key) {
      return createReadStream(objectPath(key));
    },
    async deletePrivate(key) {
      await rm(objectPath(key), { force: true });
    }
  };
}

export function createUnavailableStorageAdapter(): StorageAdapter {
  const unavailable = async (): Promise<never> => { throw new Error('PRIVATE_STORAGE_UNAVAILABLE'); };
  return {
    kind: 'unavailable',
    isReady: () => false,
    putPrivateQuarantine: unavailable,
    openPrivate: unavailable,
    deletePrivate: unavailable
  };
}

export function createDeterministicMalwareScanner(
  outcome: MalwareScanOutcome | ((bytes: Buffer) => MalwareScanOutcome) = 'clean'
): MalwareScannerAdapter {
  return {
    kind: 'deterministic-fake',
    isReady: () => true,
    async scan(source) {
      const chunks: Buffer[] = [];
      for await (const chunk of source) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      const bytes = Buffer.concat(chunks);
      const selected = typeof outcome === 'function' ? outcome(bytes) : outcome;
      if (selected === 'timeout') throw new Error('MALWARE_SCAN_TIMEOUT');
      if (selected === 'failed') throw new Error('MALWARE_SCAN_FAILED');
      return selected;
    }
  };
}

export function createUnavailableMalwareScanner(): MalwareScannerAdapter {
  return {
    kind: 'unavailable',
    isReady: () => false,
    async scan() { throw new Error('MALWARE_SCANNER_UNAVAILABLE'); }
  };
}

export interface ClamAvConfiguration {
  host: string;
  port: number;
  timeoutMs: number;
}

async function socketWrite(socket: Socket, value: Buffer | string): Promise<void> {
  if (!socket.write(value)) await once(socket, 'drain');
}

function readClamdReply(socket: Socket, timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    const cleanup = () => {
      socket.off('data', onData);
      socket.off('error', onError);
      socket.off('timeout', onTimeout);
      socket.off('close', onClose);
    };
    const fail = (error: Error) => {
      cleanup();
      reject(error);
    };
    const onData = (chunk: Buffer) => {
      chunks.push(chunk);
      total += chunk.byteLength;
      if (total > 16_384) {
        fail(new Error('CLAMAV_RESPONSE_TOO_LARGE'));
        return;
      }
      const combined = Buffer.concat(chunks);
      const terminator = combined.indexOf(0);
      if (terminator !== -1) {
        cleanup();
        resolve(combined.subarray(0, terminator).toString('utf8'));
      }
    };
    const onError = () => fail(new Error('CLAMAV_CONNECTION_FAILED'));
    const onTimeout = () => fail(new Error('CLAMAV_TIMEOUT'));
    const onClose = () => fail(new Error('CLAMAV_CONNECTION_CLOSED'));
    socket.setTimeout(timeoutMs);
    socket.on('data', onData);
    socket.once('error', onError);
    socket.once('timeout', onTimeout);
    socket.once('close', onClose);
  });
}

async function connectClamd(configuration: ClamAvConfiguration): Promise<Socket> {
  const socket = createConnection({ host: configuration.host, port: configuration.port });
  socket.setTimeout(configuration.timeoutMs);
  await once(socket, 'connect');
  return socket;
}

export function createClamAvMalwareScanner(
  configuration: ClamAvConfiguration
): MalwareScannerAdapter {
  return {
    kind: 'clamav',
    async isReady() {
      let socket: Socket | undefined;
      try {
        socket = await connectClamd(configuration);
        const reply = readClamdReply(socket, configuration.timeoutMs);
        await socketWrite(socket, 'zPING\0');
        return (await reply).trim() === 'PONG';
      } catch {
        return false;
      } finally {
        socket?.destroy();
      }
    },
    async scan(source) {
      let socket: Socket | undefined;
      try {
        socket = await connectClamd(configuration);
        const reply = readClamdReply(socket, configuration.timeoutMs);
        await socketWrite(socket, 'zINSTREAM\0');
        for await (const value of source) {
          const chunk = Buffer.isBuffer(value) ? value : Buffer.from(value);
          const length = Buffer.allocUnsafe(4);
          length.writeUInt32BE(chunk.byteLength);
          await socketWrite(socket, length);
          await socketWrite(socket, chunk);
        }
        await socketWrite(socket, Buffer.alloc(4));
        const result = (await reply).trim();
        if (/^stream:\s+OK$/u.test(result)) return 'clean';
        if (/^stream:\s+.+\s+FOUND$/u.test(result)) return 'infected';
        return 'failed';
      } catch (error) {
        return error instanceof Error && error.message === 'CLAMAV_TIMEOUT' ? 'timeout' : 'failed';
      } finally {
        socket?.destroy();
      }
    }
  };
}

function signature(secret: Uint8Array, documentId: string, expiresAtSeconds: string): Buffer {
  return createHmac('sha256', secret)
    .update(`provider-document\u0000${documentId}\u0000${expiresAtSeconds}`, 'utf8')
    .digest();
}

export function createPrivateDownloadSigner(
  secret: Uint8Array = randomBytes(32)
): PrivateDownloadSigner {
  if (secret.byteLength < 32) throw new Error('Private download signing key is invalid');
  const key = new Uint8Array(secret);
  return {
    issue(documentId, expiresAt) {
      const expires = String(Math.floor(expiresAt.getTime() / 1_000));
      const signed = signature(key, documentId, expires).toString('base64url');
      return `/api/v1/private/provider-documents/${documentId}?expires=${expires}&signature=${signed}`;
    },
    verify(documentId, expiresAtSeconds, supplied, now = new Date()) {
      if (!/^\d{10,}$/.test(expiresAtSeconds) || !/^[A-Za-z0-9_-]{43}$/.test(supplied)) return false;
      const expires = Number(expiresAtSeconds);
      if (!Number.isSafeInteger(expires) || expires <= Math.floor(now.getTime() / 1_000)) return false;
      const actual = Buffer.from(supplied, 'base64url');
      const expected = signature(key, documentId, expiresAtSeconds);
      return actual.byteLength === expected.byteLength && timingSafeEqual(actual, expected);
    }
  };
}
