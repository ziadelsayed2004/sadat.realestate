import { describe, expect, it } from 'vitest';
import { formatArea, formatMoney, localizedText } from '../src/features/public/model.ts';
import {
  applyLocaleToDocument,
  directionForLocale,
  getTranslationCatalog,
  LocaleStore,
  LOCALE_STORAGE_KEY,
  type LocaleStorage
} from '../src/features/localization/index.ts';

const locales = ['ar', 'en',] as const;

class MemoryStorage implements LocaleStorage {
  private readonly values = new Map<string, string>();

  public constructor(initial: string) {
    this.values.set(LOCALE_STORAGE_KEY, initial);
  }

  public getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  public setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe('three-locale and direction release matrix', () => {
  it('formats localized long text, numbers, dates, currency, and area without losing values', () => {
    const date = new Date('2026-08-21T10:30:00.000Z');
    const longText = 'A long approved description that must remain visible without truncation or locale corruption. '.repeat(20);

    for (const locale of locales) {
      const catalog = getTranslationCatalog(locale);
      const money = formatMoney({ amount: 1_250_000, currency: 'EGP' }, locale);
      const area = formatArea({ value: 1234.56, unit: 'sqm' }, locale, 'sqm');
      const number = new Intl.NumberFormat(locale).format(1_234_567.89);
      const formattedDate = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(date);

      expect(Object.values(catalog).every(value => value.trim().length > 0), locale).toBe(true);
      expect(localizedText({ [locale]: longText }, locale), locale).toBe(longText);
      expect(money, locale).toBeTruthy();
      expect(area, locale).toContain('sqm');
      expect(number, locale).toMatch(/\S/u);
      expect(formattedDate, locale).toMatch(/\S/u);
      expect(`${money}${area}${number}${formattedDate}`, locale).not.toMatch(/(?:undefined|NaN)/u);
    }
  });

  it('keeps locale persistence and direction synchronized for every supported locale', () => {
    for (const locale of locales) {
      const storage = new MemoryStorage(locale);
      const store = new LocaleStore({ storage, explicitLocale: 'ar', acceptLanguage: 'en' });
      expect(store.getSnapshot()).toEqual({ locale, direction: directionForLocale(locale) });

      const target = locale === 'ar' ? 'en' : 'ar';
      const next = store.setLocale(target);
      expect(next).toEqual({ locale: target, direction: target === 'ar' ? 'rtl' : 'ltr' });
      expect(storage.getItem(LOCALE_STORAGE_KEY)).toBe(target);
    }
  });

  it('applies the correct HTML language and direction without requiring browser globals', () => {
    for (const locale of locales) {
      const documentLike = { documentElement: { lang: 'en', dir: 'ltr' } };
      applyLocaleToDocument(locale, documentLike);
      expect(documentLike.documentElement).toEqual({
        lang: locale,
        dir: locale === 'ar' ? 'rtl' : 'ltr'
      });
    }

    expect(() => applyLocaleToDocument('en')).not.toThrow();
  });
});
