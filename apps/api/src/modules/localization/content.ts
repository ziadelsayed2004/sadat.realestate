import {
  DEFAULT_CONTENT_LOCALE,
  LOCALE_DIRECTIONS,
  SUPPORTED_LOCALES,
  localizedTextSchema,
  supportedLocaleSchema,
  type LocalizedText,
  type SupportedLocale,
  type TextDirection
} from '@sadat-real-estate/contracts';

export type ResolvedLocalizedText = Readonly<{
  value: string;
  locale: SupportedLocale;
  direction: TextDirection;
  usedFallback: boolean;
}>;

export function getTextDirection(locale: SupportedLocale): TextDirection {
  return LOCALE_DIRECTIONS[supportedLocaleSchema.parse(locale)];
}

export function resolveLocalizedText(
  content: LocalizedText,
  requestedLocale: SupportedLocale,
  fallbackLocale: SupportedLocale = DEFAULT_CONTENT_LOCALE
): ResolvedLocalizedText {
  const parsedContent = localizedTextSchema.parse(content);
  const requested = supportedLocaleSchema.parse(requestedLocale);
  const configuredFallback = supportedLocaleSchema.parse(fallbackLocale);
  const candidates = [requested, configuredFallback, DEFAULT_CONTENT_LOCALE, ...SUPPORTED_LOCALES];

  for (const locale of new Set(candidates)) {
    const value = parsedContent[locale];
    if (value !== undefined) {
      return Object.freeze({
        value,
        locale,
        direction: LOCALE_DIRECTIONS[locale],
        usedFallback: locale !== requested
      });
    }
  }

  throw new Error('LocalizedText invariant violated: no supported locale value');
}
