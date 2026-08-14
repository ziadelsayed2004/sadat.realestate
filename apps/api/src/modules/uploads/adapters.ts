import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
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
  readonly kind: 'deterministic-fake' | 'unavailable';
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
