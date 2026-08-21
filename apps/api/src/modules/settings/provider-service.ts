import type { AccessTokenClaims } from '../auth/crypto.js';
import {
  providerSettingsDataSchema,
  providerSettingsPatchSchema,
  type ProviderSettingsData,
  type ProviderSettingsPatch
} from '@sadat-real-estate/contracts';

export type ProviderSettingsWriteResult =
  | { kind: 'updated'; settings: ProviderSettingsData }
  | { kind: 'not_found' }
  | { kind: 'version_conflict' };

export interface ProviderSettingsRepository {
  find(userId: string): Promise<ProviderSettingsData | undefined>;
  update(input: {
    userId: string;
    expectedVersion: number;
    patch: ProviderSettingsPatch;
    now: Date;
  }): Promise<ProviderSettingsWriteResult>;
}

export type ProviderSettingsServiceErrorCode =
  | 'PROVIDER_SETTINGS_FORBIDDEN'
  | 'PROVIDER_SETTINGS_NOT_FOUND'
  | 'PROVIDER_SETTINGS_VERSION_CONFLICT';

export class ProviderSettingsServiceError extends Error {
  constructor(readonly code: ProviderSettingsServiceErrorCode) {
    super(code);
    this.name = 'ProviderSettingsServiceError';
  }
}

function verifiedProvider(claims: AccessTokenClaims): void {
  if (claims.role !== 'provider' || claims.status !== 'verified') {
    throw new ProviderSettingsServiceError('PROVIDER_SETTINGS_FORBIDDEN');
  }
}

function output(value: ProviderSettingsData): ProviderSettingsData {
  return providerSettingsDataSchema.parse(value);
}

export function createProviderSettingsService(dependencies: {
  repository: ProviderSettingsRepository;
}) {
  const get = async (claims: AccessTokenClaims): Promise<ProviderSettingsData> => {
    verifiedProvider(claims);
    const settings = await dependencies.repository.find(claims.sub);
    if (!settings) throw new ProviderSettingsServiceError('PROVIDER_SETTINGS_NOT_FOUND');
    return output(settings);
  };

  const update = async (
    claims: AccessTokenClaims,
    unparsedInput: unknown
  ): Promise<ProviderSettingsData> => {
    verifiedProvider(claims);
    const patch = providerSettingsPatchSchema.parse(unparsedInput);
    const result = await dependencies.repository.update({
      userId: claims.sub,
      expectedVersion: patch.expectedVersion,
      patch,
      now: new Date()
    });
    if (result.kind === 'not_found') throw new ProviderSettingsServiceError('PROVIDER_SETTINGS_NOT_FOUND');
    if (result.kind === 'version_conflict') throw new ProviderSettingsServiceError('PROVIDER_SETTINGS_VERSION_CONFLICT');
    return output(result.settings);
  };

  return { get, update };
}
