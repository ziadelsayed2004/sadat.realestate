import {
  DEFAULT_CONTENT_LOCALE,
  LOCALE_DIRECTIONS,
  SUPPORTED_LOCALES,
  supportedLocaleSchema,
  type SupportedLocale,
  type TextDirection
} from '@sadat-real-estate/contracts';

export const LOCALE_STORAGE_KEY = 'sadat-real-estate.locale';

export interface LocaleStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface LocaleDocument {
  documentElement: {
    lang: string;
    dir: string;
  };
}

export interface LocaleSnapshot {
  readonly locale: SupportedLocale;
  readonly direction: TextDirection;
}

export interface LocaleStoreOptions {
  readonly storage?: LocaleStorage | null;
  readonly explicitLocale?: unknown;
  readonly acceptLanguage?: string | null;
}

export type LocaleListener = (snapshot: LocaleSnapshot) => void;

const supportedLocaleSet = new Set<string>(SUPPORTED_LOCALES);

export function normalizeLocale(value: unknown): SupportedLocale | undefined {
  if (typeof value !== 'string') return undefined;

  const trimmed = value.trim();
  if (supportedLocaleSet.has(trimmed)) return trimmed as SupportedLocale;

  const normalized = trimmed.toLowerCase();
  if (normalized === 'zh' || normalized.startsWith('zh-cn') || normalized.startsWith('zh-hans')) return 'zh-CN';
  if (normalized.startsWith('ar')) return 'ar';
  if (normalized.startsWith('en')) return 'en';
  return undefined;
}

export function isSupportedLocale(value: unknown): value is SupportedLocale {
  return normalizeLocale(value) !== undefined;
}

export function resolveLocale(explicitLocale?: unknown, acceptLanguage?: string | null): SupportedLocale {
  const explicit = normalizeLocale(explicitLocale);
  if (explicit !== undefined) return explicit;

  for (const candidate of (acceptLanguage ?? '').split(',')) {
    const locale = normalizeLocale(candidate.split(';', 1)[0]);
    if (locale !== undefined) return locale;
  }

  return DEFAULT_CONTENT_LOCALE;
}

export function directionForLocale(locale: unknown): TextDirection {
  const parsed = supportedLocaleSchema.safeParse(locale);
  if (!parsed.success) throw new RangeError('Unsupported locale');
  return LOCALE_DIRECTIONS[parsed.data];
}

function readPersistedLocale(storage: LocaleStorage | null | undefined): SupportedLocale | undefined {
  if (storage === null || storage === undefined) return undefined;
  try {
    return normalizeLocale(storage.getItem(LOCALE_STORAGE_KEY));
  } catch {
    return undefined;
  }
}

function persistLocale(storage: LocaleStorage | null | undefined, locale: SupportedLocale): void {
  if (storage === null || storage === undefined) return;
  try {
    storage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Storage can be unavailable in private browsing or a restricted iframe.
  }
}

function snapshotFor(locale: SupportedLocale): LocaleSnapshot {
  return Object.freeze({ locale, direction: directionForLocale(locale) });
}

export class LocaleStore {
  private snapshot: LocaleSnapshot;
  private readonly storage: LocaleStorage | null | undefined;
  private readonly listeners = new Set<LocaleListener>();

  public constructor(options: LocaleStoreOptions = {}) {
    this.storage = options.storage;
    const persisted = readPersistedLocale(this.storage);
    this.snapshot = snapshotFor(persisted ?? resolveLocale(options.explicitLocale, options.acceptLanguage));
  }

  public getSnapshot(): LocaleSnapshot {
    return this.snapshot;
  }

  public setLocale(value: unknown): LocaleSnapshot {
    const locale = normalizeLocale(value);
    if (locale === undefined) throw new RangeError('Unsupported locale');
    if (locale === this.snapshot.locale) return this.snapshot;

    this.snapshot = snapshotFor(locale);
    persistLocale(this.storage, locale);
    for (const listener of this.listeners) listener(this.snapshot);
    return this.snapshot;
  }

  public subscribe(listener: LocaleListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export function getBrowserStorage(): LocaleStorage | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

export function createBrowserLocaleStore(options: Omit<LocaleStoreOptions, 'storage'> & { readonly storage?: LocaleStorage | null } = {}): LocaleStore {
  const storage = Object.prototype.hasOwnProperty.call(options, 'storage')
    ? options.storage
    : getBrowserStorage();
  const storeOptions: { explicitLocale?: unknown; acceptLanguage?: string | null; storage?: LocaleStorage | null } = {};
  if (options.explicitLocale !== undefined) storeOptions.explicitLocale = options.explicitLocale;
  if (options.acceptLanguage !== undefined) storeOptions.acceptLanguage = options.acceptLanguage;
  if (storage !== undefined) storeOptions.storage = storage;
  return new LocaleStore(storeOptions);
}

export function applyLocaleToDocument(locale: SupportedLocale, target?: LocaleDocument): void {
  const documentLike = target ?? (typeof document === 'undefined' ? undefined : document);
  if (documentLike === undefined) return;

  const parsed = supportedLocaleSchema.safeParse(locale);
  if (!parsed.success) throw new RangeError('Unsupported locale');
  documentLike.documentElement.lang = parsed.data;
  documentLike.documentElement.dir = directionForLocale(parsed.data);
}
