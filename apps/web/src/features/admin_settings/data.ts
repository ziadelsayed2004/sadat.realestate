import {
  adminSettingsDataSchema,
  adminSettingsNamespaceSchema,
  adminSettingsSuccessEnvelopeSchema,
  adminSettingsUpdateSchema,
  type AdminSettingsData,
  type AdminSettingsNamespace,
  type AdminSettingsUpdate,
  type AdminSettingsValues,
  type LocalizedText
} from '@sadat-real-estate/contracts';
import { ApiClient, type ApiClientOptions } from '../contracts/index.ts';

export const ADMIN_SETTINGS_ROUTE = '/admin/settings' as const;
export const ADMIN_SETTINGS_PLATFORM_ROUTE = `${ADMIN_SETTINGS_ROUTE}/platform` as const;
export const ADMIN_SETTINGS_CONTACT_ROUTE = `${ADMIN_SETTINGS_ROUTE}/contact` as const;
export const ADMIN_SETTINGS_SOCIAL_ROUTE = `${ADMIN_SETTINGS_ROUTE}/social` as const;
export const ADMIN_SETTINGS_PROPERTIES_ROUTE = `${ADMIN_SETTINGS_ROUTE}/properties` as const;
export const ADMIN_SETTINGS_REQUESTS_ROUTE = `${ADMIN_SETTINGS_ROUTE}/requests` as const;
export const ADMIN_SETTINGS_ADVERTISING_ROUTE = `${ADMIN_SETTINGS_ROUTE}/advertising` as const;
export const ADMIN_SETTINGS_SEO_ROUTE = `${ADMIN_SETTINGS_ROUTE}/seo` as const;
export const ADMIN_SETTINGS_PRIVACY_SECURITY_ROUTE = `${ADMIN_SETTINGS_ROUTE}/privacy-security` as const;
export const ADMIN_SETTINGS_DISPLAY_ROUTE = `${ADMIN_SETTINGS_ROUTE}/display` as const;

export const ADMIN_SETTINGS_NAMESPACES = [
  'platform',
  'contact',
  'social',
  'properties',
  'requests',
  'advertising',
  'seo',
  'privacy-security',
  'display'
] as const satisfies readonly AdminSettingsNamespace[];

export type AdminSettingsAuthorizationSource = {
  readonly getAuthorizationHeader: () => string | undefined;
};

interface CommonOptions {
  readonly apiClient?: ApiClient | undefined;
  readonly apiOrigin?: string | undefined;
  readonly authorization?: AdminSettingsAuthorizationSource | undefined;
  readonly signal?: AbortSignal | undefined;
}

export type AdminSettingsLoader = (namespace: AdminSettingsNamespace, signal?: AbortSignal) => Promise<AdminSettingsData>;
export type AdminSettingsMutation = (namespace: AdminSettingsNamespace, input: AdminSettingsUpdate, signal?: AbortSignal) => Promise<AdminSettingsData>;

export interface AdminSettingsSource {
  readonly load: AdminSettingsLoader;
  readonly update: AdminSettingsMutation;
}

function clientFor(options: Pick<CommonOptions, 'apiClient' | 'apiOrigin'>): ApiClient {
  if (options.apiClient !== undefined) return options.apiClient;
  const clientOptions: ApiClientOptions = options.apiOrigin === undefined ? {} : { baseUrl: options.apiOrigin };
  return new ApiClient(clientOptions);
}

function requestOptions(options: CommonOptions): { readonly headers?: HeadersInit; readonly signal?: AbortSignal } {
  const authorization = options.authorization?.getAuthorizationHeader();
  return {
    ...(authorization === undefined ? {} : { headers: { authorization } }),
    ...(options.signal === undefined ? {} : { signal: options.signal })
  };
}

function namespace(value: AdminSettingsNamespace): AdminSettingsNamespace {
  return adminSettingsNamespaceSchema.parse(value);
}

export async function loadAdminSettings(namespaceValue: AdminSettingsNamespace, options: CommonOptions = {}): Promise<AdminSettingsData> {
  const parsedNamespace = namespace(namespaceValue);
  const response = await clientFor(options).request(`${ADMIN_SETTINGS_ROUTE}/${parsedNamespace}`, {
    responseSchema: adminSettingsSuccessEnvelopeSchema,
    ...requestOptions(options)
  });
  return adminSettingsDataSchema.parse(response.data.data);
}

export async function updateAdminSettings(namespaceValue: AdminSettingsNamespace, input: unknown, options: CommonOptions = {}): Promise<AdminSettingsData> {
  const parsedNamespace = namespace(namespaceValue);
  const body = adminSettingsUpdateSchema.parse(input);
  const response = await clientFor(options).request(`${ADMIN_SETTINGS_ROUTE}/${parsedNamespace}`, {
    method: 'PUT',
    responseSchema: adminSettingsSuccessEnvelopeSchema,
    json: body,
    ...requestOptions(options)
  });
  return adminSettingsDataSchema.parse(response.data.data);
}

export function createAdminSettingsSource(options: Omit<CommonOptions, 'signal'> = {}): AdminSettingsSource {
  return {
    load: (namespaceValue, signal) => loadAdminSettings(namespaceValue, { ...options, ...(signal === undefined ? {} : { signal }) }),
    update: (namespaceValue, input, signal) => updateAdminSettings(namespaceValue, input, { ...options, ...(signal === undefined ? {} : { signal }) })
  };
}

export type AdminSettingsAtom = AdminSettingsValues[string];
export type SettingsDraft = Record<string, AdminSettingsAtom>;

export function isLocalizedText(value: AdminSettingsAtom | undefined): value is LocalizedText {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && Object.keys(value).some(key => key === 'ar' || key === 'en' || key === 'zh-CN');
}

export function localizedDraft(value: AdminSettingsAtom | undefined): Record<'ar' | 'en' | 'zh-CN', string> {
  if (isLocalizedText(value)) {
    return { ar: value.ar ?? '', en: value.en ?? '', 'zh-CN': value['zh-CN'] ?? '' };
  }
  const fallback = typeof value === 'string' ? value : '';
  return { ar: fallback, en: '', 'zh-CN': '' };
}

export function stringDraft(value: AdminSettingsAtom | undefined): string {
  return typeof value === 'string' ? value : '';
}

export function copySettingsValues(values: AdminSettingsValues | SettingsDraft): SettingsDraft {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [
    key,
    Array.isArray(value) ? [...value] : isLocalizedText(value) ? { ...value } : value
  ])) as SettingsDraft;
}

export function setTextValue(values: SettingsDraft, key: string, value: string): SettingsDraft {
  const next = { ...values };
  if (value.trim() === '') delete next[key];
  else next[key] = value;
  return next;
}

export function setLocalizedValue(values: SettingsDraft, key: string, locale: 'ar' | 'en' | 'zh-CN', value: string): SettingsDraft {
  const next = { ...values };
  const current = localizedDraft(next[key]);
  const updated = { ...current, [locale]: value };
  const entries = Object.entries(updated).filter(([, entry]) => entry.trim() !== '');
  if (entries.length === 0) delete next[key];
  else next[key] = Object.fromEntries(entries) as LocalizedText;
  return next;
}

export function arrayDraft(value: AdminSettingsAtom | undefined): string {
  return Array.isArray(value) ? value.join('\n') : '';
}

export function setArrayValue(values: SettingsDraft, key: string, value: string): SettingsDraft {
  const entries = value.split(/\r?\n/u).map(entry => entry.trim()).filter(Boolean);
  const next = { ...values };
  if (entries.length === 0) delete next[key];
  else next[key] = entries;
  return next;
}

export function numberDraft(value: AdminSettingsAtom | undefined): string {
  return typeof value === 'number' ? String(value) : '';
}

export function setNumberValue(values: SettingsDraft, key: string, value: string): SettingsDraft {
  const next = { ...values };
  if (value.trim() === '') {
    delete next[key];
    return next;
  }
  const parsed = Number(value);
  if (Number.isFinite(parsed)) next[key] = parsed;
  return next;
}

export function booleanDraft(value: AdminSettingsAtom | undefined): boolean {
  return value === true;
}

export function setBooleanValue(values: SettingsDraft, key: string, value: boolean): SettingsDraft {
  return { ...values, [key]: value };
}
