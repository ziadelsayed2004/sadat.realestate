import type { AccessTokenClaims } from '../auth/crypto.js';
import {
  adminSettingsDataSchema,
  adminSettingsNamespaceSchema,
  adminSettingsUpdateSchema,
  type AdminSettingsData,
  type AdminSettingsNamespace,
  type AdminSettingsUpdate
} from '@sadat-real-estate/contracts';

export interface SettingsAuthorization {
  authorize(adminId: string, permission: 'admin:settings.view' | 'admin:settings.manage'): Promise<boolean>;
}

export interface SettingsMutationContext {
  requestId: string;
  traceId: string;
}

export interface SettingsAuditWriter {
  record(input: {
    actorType: 'admin';
    actorId: string;
    targetType: string;
    targetId: string;
    action: string;
    reason: string;
    before: unknown;
    after: unknown;
    requestId: string;
    traceId: string;
    occurredAt: Date;
  }): Promise<string>;
}

export type SettingsWriteResult =
  | { kind: 'created'; setting: AdminSettingsData }
  | { kind: 'updated'; setting: AdminSettingsData }
  | { kind: 'version_conflict' };

export interface SettingsRepository {
  find(namespace: AdminSettingsNamespace): Promise<AdminSettingsData | undefined>;
  upsert(input: {
    namespace: AdminSettingsNamespace;
    actorId: string;
    expectedVersion: number;
    data: AdminSettingsUpdate;
    now: string;
  }): Promise<SettingsWriteResult>;
}

export interface SettingsServiceDependencies {
  authorization: SettingsAuthorization;
  repository: SettingsRepository;
  audit: SettingsAuditWriter;
  now?: () => Date;
}

export type SettingsServiceErrorCode =
  | 'SETTINGS_FORBIDDEN'
  | 'SETTINGS_NOT_FOUND'
  | 'SETTINGS_VERSION_CONFLICT'
  | 'SETTINGS_SCHEMA_VERSION_CONFLICT';

export class SettingsServiceError extends Error {
  constructor(readonly code: SettingsServiceErrorCode) {
    super(code);
    this.name = 'SettingsServiceError';
  }
}

function verifiedAdmin(claims: AccessTokenClaims): void {
  if (claims.role !== 'admin' || claims.status !== 'verified') {
    throw new SettingsServiceError('SETTINGS_FORBIDDEN');
  }
}

function namespace(value: unknown): AdminSettingsNamespace {
  return adminSettingsNamespaceSchema.parse(value);
}

async function requirePermission(
  dependencies: SettingsServiceDependencies,
  adminId: string,
  permission: 'admin:settings.view' | 'admin:settings.manage'
): Promise<void> {
  if (!/^[a-f0-9]{24}$/.test(adminId) || !await dependencies.authorization.authorize(adminId, permission)) {
    throw new SettingsServiceError('SETTINGS_FORBIDDEN');
  }
}

function output(value: AdminSettingsData): AdminSettingsData {
  return adminSettingsDataSchema.parse(value);
}

export function createSettingsService(dependencies: SettingsServiceDependencies) {
  const clock = dependencies.now ?? (() => new Date());
  const get = async (claims: AccessTokenClaims, unparsedNamespace: unknown): Promise<AdminSettingsData> => {
    verifiedAdmin(claims);
    await requirePermission(dependencies, claims.sub, 'admin:settings.view');
    const target = namespace(unparsedNamespace);
    const value = await dependencies.repository.find(target);
    if (!value) throw new SettingsServiceError('SETTINGS_NOT_FOUND');
    return output(value);
  };

  const update = async (
    claims: AccessTokenClaims,
    unparsedNamespace: unknown,
    unparsedInput: unknown,
    context: SettingsMutationContext
  ): Promise<AdminSettingsData> => {
    verifiedAdmin(claims);
    await requirePermission(dependencies, claims.sub, 'admin:settings.manage');
    const target = namespace(unparsedNamespace);
    const data = adminSettingsUpdateSchema.parse(unparsedInput);
    const before = await dependencies.repository.find(target);
    if (before && before.schemaVersion !== data.schemaVersion) {
      throw new SettingsServiceError('SETTINGS_SCHEMA_VERSION_CONFLICT');
    }
    if (!before && data.expectedVersion !== 0) {
      throw new SettingsServiceError('SETTINGS_VERSION_CONFLICT');
    }
    const result = await dependencies.repository.upsert({
      namespace: target,
      actorId: claims.sub,
      expectedVersion: data.expectedVersion,
      data,
      now: clock().toISOString()
    });
    if (result.kind === 'version_conflict') throw new SettingsServiceError('SETTINGS_VERSION_CONFLICT');
    const setting = output(result.setting);
    await dependencies.audit.record({
      actorType: 'admin',
      actorId: claims.sub,
      targetType: 'admin_settings',
      targetId: target,
      action: result.kind === 'created' ? 'settings.create' : 'settings.update',
      reason: data.reason,
      before: before ?? null,
      after: setting,
      requestId: context.requestId,
      traceId: context.traceId,
      occurredAt: clock()
    });
    return setting;
  };

  return {
    get,
    read: get,
    getNamespace: get,
    update,
    put: update,
    updateNamespace: update
  };
}

export const createAdminSettingsService = createSettingsService;
