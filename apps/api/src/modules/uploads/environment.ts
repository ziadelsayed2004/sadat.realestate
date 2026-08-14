import os from 'node:os';
import path from 'node:path';
import type { AppEnvironment } from '../config/environment.js';

export interface UploadEnvironment {
  appEnvironment: AppEnvironment;
  mode: 'memory' | 'local-filesystem' | 's3-compatible-unavailable';
  localRoot?: string;
  productionConfigurationPresent: boolean;
}

const productionKeys = [
  'PRIVATE_STORAGE_ENDPOINT',
  'PRIVATE_STORAGE_REGION',
  'PRIVATE_STORAGE_BUCKET',
  'PRIVATE_STORAGE_ACCESS_KEY_ID',
  'PRIVATE_STORAGE_SECRET_ACCESS_KEY',
  'MALWARE_SCANNER_ENDPOINT'
] as const;

export function parseUploadEnvironment(
  source: Record<string, string | undefined>,
  appEnvironment: AppEnvironment
): UploadEnvironment {
  if (appEnvironment === 'test') {
    return { appEnvironment, mode: 'memory', productionConfigurationPresent: false };
  }
  if (appEnvironment === 'local') {
    const configuredRoot = source.PRIVATE_STORAGE_LOCAL_ROOT?.trim();
    return {
      appEnvironment,
      mode: 'local-filesystem',
      localRoot: configuredRoot
        ? path.resolve(configuredRoot)
        : path.join(os.tmpdir(), 'sadat-real-estate-private-storage'),
      productionConfigurationPresent: false
    };
  }
  return {
    appEnvironment,
    mode: 's3-compatible-unavailable',
    productionConfigurationPresent: productionKeys.every((key) => Boolean(source[key]?.trim()))
  };
}
