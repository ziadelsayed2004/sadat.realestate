import { z } from 'zod';
import { messageKeySchema } from '../contracts/envelopes.js';

export const SUPPORTED_LOCALES = ['ar', 'en', 'zh-CN'] as const;
export const supportedLocaleSchema = z.enum(SUPPORTED_LOCALES);

export const TEXT_DIRECTIONS = ['rtl', 'ltr'] as const;
export const textDirectionSchema = z.enum(TEXT_DIRECTIONS);

export const DEFAULT_CONTENT_LOCALE = 'ar' as const;

export const LOCALE_DIRECTIONS = Object.freeze({
  ar: 'rtl',
  en: 'ltr',
  'zh-CN': 'ltr'
} as const satisfies Readonly<Record<SupportedLocale, TextDirection>>);

const localizedContentValueSchema = z.string()
  .trim()
  .min(1)
  .max(20_000)
  .regex(/^[^\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]*$/u);

export const localizedTextSchema = z.object({
  ar: localizedContentValueSchema.optional(),
  en: localizedContentValueSchema.optional(),
  'zh-CN': localizedContentValueSchema.optional()
}).strict().refine(
  (value) => SUPPORTED_LOCALES.some((locale) => value[locale] !== undefined),
  { message: 'At least one supported locale value is required' }
);

// UI translation keys are stable logical identifiers. They are intentionally
// not interchangeable with localized CMS content values.
export const uiTranslationKeySchema = messageKeySchema;

export type SupportedLocale = z.infer<typeof supportedLocaleSchema>;
export type TextDirection = z.infer<typeof textDirectionSchema>;
export type LocalizedText = z.infer<typeof localizedTextSchema>;
export type UiTranslationKey = z.infer<typeof uiTranslationKeySchema>;
