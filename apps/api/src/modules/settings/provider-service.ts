import type { AccessTokenClaims } from '../auth/crypto.js';
import {
  providerSettingsDataSchema,
  providerSettingsPatchSchema,
  type ProviderSettingsData,
  type ProviderSettingsPatch
} from '@sadat-real-estate/contracts';
import type { AuditWriter } from '../audit/writer.js';
import type { ClientSession } from 'mongoose';

export type ProviderSettingsWriteResult =
  | { kind: 'updated'; settings: ProviderSettingsData }
  | { kind: 'not_found' }
  | { kind: 'version_conflict' };

export interface ProviderSettingsRepository {
  find(userId: string, session?: ClientSession): Promise<ProviderSettingsData | undefined>;
  update(input: {
    userId: string;
    expectedVersion: number;
    patch: ProviderSettingsPatch;
    now: Date;
    session?: ClientSession;
  }): Promise<ProviderSettingsWriteResult>;
}

export interface ProviderSettingsMutationContext {
  requestId: string;
  traceId: string;
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
  audit?: AuditWriter;
  transaction?: <T>(operation: (session?: ClientSession) => Promise<T>) => Promise<T>;
  now?: () => Date;
}) {
  const clock = dependencies.now ?? (() => new Date());
  const get = async (claims: AccessTokenClaims): Promise<ProviderSettingsData> => {
    verifiedProvider(claims);
    const settings = await dependencies.repository.find(claims.sub);
    if (!settings) throw new ProviderSettingsServiceError('PROVIDER_SETTINGS_NOT_FOUND');
    return output(settings);
  };

  const update = async (
    claims: AccessTokenClaims,
    unparsedInput: unknown,
    context: ProviderSettingsMutationContext = { requestId: 'provider-settings-update', traceId: '11111111111111111111111111111111' }
  ): Promise<ProviderSettingsData> => {
    verifiedProvider(claims);
    const patch = providerSettingsPatchSchema.parse(unparsedInput);
    const operation = async (session?: ClientSession): Promise<ProviderSettingsData> => {
      const before = await dependencies.repository.find(claims.sub, session);
      if (!before) throw new ProviderSettingsServiceError('PROVIDER_SETTINGS_NOT_FOUND');
      const changedAt = clock();
      const result = await dependencies.repository.update({
        userId: claims.sub,
        expectedVersion: patch.expectedVersion,
        patch,
        now: changedAt,
        ...(session ? { session } : {})
      });
      if (result.kind === 'not_found') throw new ProviderSettingsServiceError('PROVIDER_SETTINGS_NOT_FOUND');
      if (result.kind === 'version_conflict') throw new ProviderSettingsServiceError('PROVIDER_SETTINGS_VERSION_CONFLICT');
      const settings = output(result.settings);
      await dependencies.audit?.record({
        actorType: 'provider', actorId: claims.sub, targetType: 'provider_settings', targetId: claims.sub,
        action: 'provider.settings.update', reason: 'Provider updated owned account settings',
        before, after: settings, requestId: context.requestId, traceId: context.traceId, occurredAt: changedAt
      }, session);
      return settings;
    };
    return dependencies.transaction ? dependencies.transaction(operation) : operation();
  };

  return { get, update };
}
