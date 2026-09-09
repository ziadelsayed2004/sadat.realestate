import type { SupportedLocale } from '@sadat-real-estate/contracts';
import arMessages from './messages/ar.json';
import enMessages from './messages/en.json';

type TranslationBranch = string | readonly TranslationBranch[] | { readonly [key: string]: TranslationBranch };

const catalogs: Readonly<Record<SupportedLocale, Readonly<Record<string, TranslationBranch>>>> = {
  ar: arMessages,
  en: enMessages
};
const localizedCopyCache = new Map<string, unknown>();

function mergeCopy(fallback: unknown, translated: TranslationBranch | undefined): unknown {
  if (typeof fallback === 'string') return typeof translated === 'string' ? translated : fallback;
  if (Array.isArray(fallback)) {
    const translatedItems = Array.isArray(translated) ? translated : [];
    return fallback.map((item, index) => mergeCopy(item, translatedItems[index]));
  }
  if (fallback === null || typeof fallback !== 'object') return fallback;
  const translatedRecord: Readonly<Record<string, TranslationBranch>> = translated !== null && typeof translated === 'object' && !Array.isArray(translated)
    ? translated as Readonly<Record<string, TranslationBranch>>
    : {};
  return Object.fromEntries(Object.entries(fallback).map(([key, value]) => [key, mergeCopy(value, translatedRecord[key])]));
}

export function localizeCopy<T>(namespace: string, locale: SupportedLocale, fallback: T): T {
  const cacheKey = `${locale}:${namespace}`;
  if (localizedCopyCache.has(cacheKey)) return localizedCopyCache.get(cacheKey) as T;
  const localized = mergeCopy(fallback, catalogs[locale][namespace]) as T;
  localizedCopyCache.set(cacheKey, localized);
  return localized;
}

export function getEditableCopyCatalog(locale: SupportedLocale): Readonly<Record<string, TranslationBranch>> {
  return catalogs[locale];
}
