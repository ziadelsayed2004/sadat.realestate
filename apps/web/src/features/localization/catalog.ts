import {
  supportedLocaleSchema,
  uiTranslationKeySchema,
  type SupportedLocale,
  type UiTranslationKey
} from '@sadat-real-estate/contracts';

export const TRANSLATION_KEYS = [
  'app.brand',
  'shell.title',
  'shell.description',
  'shell.unavailable',
  'shell.retry',
  'locale.label',
  'route.label',
  'surface.public',
  'surface.auth',
  'surface.seeker',
  'surface.provider',
  'surface.admin',
  'state.loading',
  'state.empty',
  'state.error',
  'state.retry',
  'state.success',
  'state.permission'
] as const satisfies readonly UiTranslationKey[];

export type TranslationKey = typeof TRANSLATION_KEYS[number];
export type TranslationCatalog = Readonly<Record<TranslationKey, string>>;

const translationKeySet = new Set<string>(TRANSLATION_KEYS);

const catalogs = {
  ar: {
    'app.brand': '\u0639\u0642\u0627\u0631\u0627\u062a \u0627\u0644\u0633\u0627\u062f\u0627\u062a',
    'shell.title': '\u0648\u0627\u062c\u0647\u0629 \u0627\u0644\u0645\u0646\u0635\u0629',
    'shell.description': '\u0627\u0644\u0648\u0627\u062c\u0647\u0629 \u0627\u0644\u0623\u0633\u0627\u0633\u064a\u0629 \u0644\u0645\u0646\u0635\u0629 \u0639\u0642\u0627\u0631\u0627\u062a \u0627\u0644\u0633\u0627\u062f\u0627\u062a.',
    'shell.unavailable': '\u0644\u0627 \u062a\u0648\u062c\u062f \u0628\u064a\u0627\u0646\u0627\u062a \u0645\u062a\u0627\u062d\u0629 \u0644\u0647\u0630\u0627 \u0627\u0644\u0645\u0633\u0627\u0631.',
    'shell.retry': '\u0625\u0639\u0627\u062f\u0629 \u0627\u0644\u0645\u062d\u0627\u0648\u0644\u0629',
    'locale.label': '\u0627\u0644\u0644\u063a\u0629',
    'route.label': '\u0627\u0644\u0645\u0633\u0627\u0631',
    'surface.public': '\u0639\u0627\u0645',
    'surface.auth': '\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644',
    'surface.seeker': '\u0627\u0644\u0628\u0627\u062d\u062b \u0639\u0646 \u0639\u0642\u0627\u0631',
    'surface.provider': '\u0645\u0632\u0648\u062f \u0627\u0644\u0639\u0642\u0627\u0631',
    'surface.admin': '\u0627\u0644\u0625\u062f\u0627\u0631\u0629',
    'state.loading': '\u062c\u0627\u0631\u064d \u0627\u0644\u062a\u062d\u0645\u064a\u0644',
    'state.empty': '\u0644\u0627 \u062a\u0648\u062c\u062f \u0628\u064a\u0627\u0646\u0627\u062a \u0628\u0639\u062f',
    'state.error': '\u062a\u0639\u0630\u0631 \u0627\u0644\u0639\u062b\u0648\u0631 \u0639\u0644\u0649 \u0627\u0644\u0635\u0641\u062d\u0629',
    'state.retry': '\u062a\u0639\u0630\u0631 \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0648\u0627\u062c\u0647\u0629',
    'state.success': '\u062a\u0645 \u0627\u0644\u062a\u062d\u0645\u064a\u0644',
    'state.permission': '\u064a\u062a\u0637\u0644\u0628 \u0647\u0630\u0627 \u0627\u0644\u0642\u0633\u0645 \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644'
  },
  en: {
    'app.brand': 'Sadat Real Estate',
    'shell.title': 'Platform shell',
    'shell.description': 'The shared frontend foundation for the Sadat Real Estate platform.',
    'shell.unavailable': 'No page data is available for this route yet.',
    'shell.retry': 'Retry',
    'locale.label': 'Locale',
    'route.label': 'Route',
    'surface.public': 'Public',
    'surface.auth': 'Authentication',
    'surface.seeker': 'Seeker',
    'surface.provider': 'Provider',
    'surface.admin': 'Administration',
    'state.loading': 'Loading',
    'state.empty': 'No data yet',
    'state.error': 'Page not found',
    'state.retry': 'The interface could not load',
    'state.success': 'Loaded',
    'state.permission': 'Authentication required'
  },
  'zh-CN': {
    'app.brand': '\u8428\u8FBE\u7279\u623F\u5730\u4EA7',
    'shell.title': '\u5E73\u53F0\u5916\u58F3',
    'shell.description': '\u8428\u8FBE\u7279\u623F\u5730\u4EA7\u5E73\u53F0\u7684\u5171\u4EAB\u524D\u7AEF\u57FA\u7840\u3002',
    'shell.unavailable': '\u6B64\u8DEF\u5F84\u6682\u65E0\u53EF\u7528\u7684\u9875\u9762\u6570\u636E\u3002',
    'shell.retry': '\u91CD\u8BD5',
    'locale.label': '\u8BED\u8A00',
    'route.label': '\u8DEF\u5F84',
    'surface.public': '\u516C\u5F00',
    'surface.auth': '\u8EAB\u4EFD\u9A8C\u8BC1',
    'surface.seeker': '\u8D2D\u623F\u8005',
    'surface.provider': '\u623F\u4EA7\u63D0\u4F9B\u65B9',
    'surface.admin': '\u7BA1\u7406',
    'state.loading': '\u52A0\u8F7D\u4E2D',
    'state.empty': '\u6682\u65E0\u6570\u636E',
    'state.error': '\u627E\u4E0D\u5230\u9875\u9762',
    'state.retry': '\u754C\u9762\u65E0\u6CD5\u52A0\u8F7D',
    'state.success': '\u5DF2\u52A0\u8F7D',
    'state.permission': '\u9700\u8981\u8EAB\u4EFD\u9A8C\u8BC1'
  }
} as const satisfies Readonly<Record<SupportedLocale, TranslationCatalog>>;

export const UI_TRANSLATIONS: Readonly<Record<SupportedLocale, TranslationCatalog>> = Object.freeze(catalogs);

export function isTranslationKey(value: unknown): value is TranslationKey {
  return typeof value === 'string'
    && translationKeySet.has(value)
    && uiTranslationKeySchema.safeParse(value).success;
}

function parseLocale(value: unknown): SupportedLocale {
  const parsed = supportedLocaleSchema.safeParse(value);
  if (!parsed.success) throw new RangeError('Unsupported locale');
  return parsed.data;
}

export function getTranslationCatalog(locale: unknown): TranslationCatalog {
  return UI_TRANSLATIONS[parseLocale(locale)];
}

export function translate(locale: unknown, key: unknown): string {
  if (!isTranslationKey(key)) throw new RangeError('Unknown UI translation key');
  return getTranslationCatalog(locale)[key];
}

export function createTranslator(locale: SupportedLocale): (key: TranslationKey) => string {
  return (key) => translate(locale, key);
}
