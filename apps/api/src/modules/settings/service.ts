import type { AccessTokenClaims } from '../auth/crypto.js';
import {
  adminSettingsDataSchema,
  adminSettingsNamespaceSchema,
  adminSettingsUpdateSchema,
  publicSeoSettingsSchema,
  type AdminSettingsData,
  type AdminSettingsNamespace,
  type AdminSettingsUpdate,
  type PublicSeoSettings
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

function canonicalOrigin(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  try {
    const parsed = new URL(value);
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== '/') return undefined;
    return parsed.origin;
  } catch {
    return undefined;
  }
}

function publicSeoProjection(setting: AdminSettingsData | undefined): PublicSeoSettings | undefined {
  if (setting?.namespace !== 'seo') return undefined;
  const canonicalUrl = canonicalOrigin(setting.values.canonical_domain);
  const sitemapStatus = setting.values.sitemap_status;
  if (canonicalUrl === undefined || typeof setting.values.allow_indexing !== 'boolean' || (sitemapStatus !== 'active' && sitemapStatus !== 'inactive')) return undefined;
  const titleSeparator = typeof setting.values.title_separator === 'string' && setting.values.title_separator !== '' ? setting.values.title_separator : undefined;
  const googleSiteVerification = typeof setting.values.google_search_console_verification === 'string' && setting.values.google_search_console_verification !== '' ? setting.values.google_search_console_verification : undefined;
  const parsed = publicSeoSettingsSchema.safeParse({
    title: setting.values.default_seo_title,
    description: setting.values.default_meta_description,
    canonicalUrl,
    robots: setting.values.allow_indexing ? 'index,follow' : 'noindex,nofollow',
    sitemapStatus,
    ...(titleSeparator === undefined ? {} : { titleSeparator }),
    ...(googleSiteVerification === undefined ? {} : { googleSiteVerification })
  });
  return parsed.success ? parsed.data : undefined;
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
  const getPublicSeo = async (): Promise<PublicSeoSettings> => {
    const value = publicSeoProjection(await dependencies.repository.find('seo'));
    if (value === undefined) throw new SettingsServiceError('SETTINGS_NOT_FOUND');
    return value;
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
    getPublicSeo,
    read: get,
    getNamespace: get,
    update,
    put: update,
    updateNamespace: update
  };
}

export const createAdminSettingsService = createSettingsService;
