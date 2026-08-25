import os from 'node:os';
import path from 'node:path';
import type { AppEnvironment } from '../config/environment.js';

export interface UploadEnvironment {
  appEnvironment: AppEnvironment;
  mode: 'memory' | 'local-filesystem' | 's3-compatible-unavailable';
  localRoot?: string;
  scannerMode: 'deterministic-fake' | 'clamav' | 'unavailable';
  clamav?: { host: string; port: number; timeoutMs: number };
  downloadSigningSecret?: Uint8Array;
  productionConfigurationPresent: boolean;
}

export interface SafeUploadEnvironmentSummary {
  privateStorageMode: UploadEnvironment['mode'];
  malwareScannerMode: UploadEnvironment['scannerMode'];
  productionUploadConfigurationPresent: boolean;
  downloadSigningSecretConfigured: boolean;
}

export class UploadEnvironmentValidationError extends Error {
  readonly code = 'UPLOAD_ENVIRONMENT_INVALID';

  constructor() {
    super('Invalid upload configuration: private storage, ClamAV, and download signing settings are required');
    this.name = 'UploadEnvironmentValidationError';
  }
}

const productionKeys = [
  'PRIVATE_STORAGE_LOCAL_ROOT',
  'CLAMAV_HOST',
  'CLAMAV_PORT',
  'PRIVATE_DOWNLOAD_SIGNING_SECRET'
] as const;

function signingSecret(value: string | undefined): Uint8Array | undefined {
  const encoded = value?.trim();
  if (!encoded || !/^[A-Za-z0-9_-]{43,128}$/.test(encoded)) return undefined;
  const decoded = Buffer.from(encoded, 'base64url');
  return decoded.byteLength >= 32 && decoded.toString('base64url') === encoded
    ? new Uint8Array(decoded)
    : undefined;
}

function clamav(source: Record<string, string | undefined>): UploadEnvironment['clamav'] | undefined {
  const host = source.CLAMAV_HOST?.trim();
  const portValue = source.CLAMAV_PORT?.trim();
  const timeoutValue = source.CLAMAV_TIMEOUT_MS?.trim() ?? '30000';
  if (!host || /[\s/?#]/u.test(host) || !/^\d+$/.test(portValue ?? '') || !/^\d+$/.test(timeoutValue)) {
    return undefined;
  }
  const port = Number(portValue);
  const timeoutMs = Number(timeoutValue);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) return undefined;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1_000 || timeoutMs > 120_000) return undefined;
  return { host, port, timeoutMs };
}

export function parseUploadEnvironment(
  source: Record<string, string | undefined>,
  appEnvironment: AppEnvironment
): UploadEnvironment {
  if (appEnvironment === 'test') {
    return {
      appEnvironment,
      mode: 'memory',
      scannerMode: 'deterministic-fake',
      productionConfigurationPresent: false
    };
  }
  if (appEnvironment === 'local') {
    const configuredRoot = source.PRIVATE_STORAGE_LOCAL_ROOT?.trim();
    const clamavConfiguration = source.MALWARE_SCANNER_MODE?.trim() === 'clamav'
      ? clamav(source)
      : undefined;
    const secret = signingSecret(source.PRIVATE_DOWNLOAD_SIGNING_SECRET);
    return {
      appEnvironment,
      mode: 'local-filesystem',
      localRoot: configuredRoot
        ? path.resolve(configuredRoot)
        : path.join(os.tmpdir(), 'sadat-real-estate-private-storage'),
      scannerMode: clamavConfiguration ? 'clamav' : 'deterministic-fake',
      ...(clamavConfiguration ? { clamav: clamavConfiguration } : {}),
      ...(secret ? { downloadSigningSecret: secret } : {}),
      productionConfigurationPresent: false
    };
  }
  const localFilesystem = source.PRIVATE_STORAGE_MODE?.trim() === 'local-filesystem';
  const configuredRoot = source.PRIVATE_STORAGE_LOCAL_ROOT?.trim();
  const clamavConfiguration = source.MALWARE_SCANNER_MODE?.trim() === 'clamav'
    ? clamav(source)
    : undefined;
  const secret = signingSecret(source.PRIVATE_DOWNLOAD_SIGNING_SECRET);
  const configured = localFilesystem
    && Boolean(configuredRoot)
    && productionKeys.every((key) => Boolean(source[key]?.trim()))
    && clamavConfiguration !== undefined
    && secret !== undefined;
  if (!configured) throw new UploadEnvironmentValidationError();
  return {
    appEnvironment,
    mode: configured ? 'local-filesystem' : 's3-compatible-unavailable',
    ...(configuredRoot ? { localRoot: path.resolve(configuredRoot) } : {}),
    scannerMode: configured ? 'clamav' : 'unavailable',
    ...(clamavConfiguration ? { clamav: clamavConfiguration } : {}),
    ...(secret ? { downloadSigningSecret: secret } : {}),
    productionConfigurationPresent: configured
  };
}

export function toSafeUploadEnvironmentSummary(
  environment: UploadEnvironment
): SafeUploadEnvironmentSummary {
  return {
    privateStorageMode: environment.mode,
    malwareScannerMode: environment.scannerMode,
    productionUploadConfigurationPresent: environment.productionConfigurationPresent,
    downloadSigningSecretConfigured: environment.downloadSigningSecret !== undefined
  };
}
