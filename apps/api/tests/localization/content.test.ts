import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_CONTENT_LOCALE,
  LOCALE_DIRECTIONS,
  SUPPORTED_LOCALES,
  localizedTextSchema,
  supportedLocaleSchema,
  uiTranslationKeySchema
} from '@sadat-real-estate/contracts';
import { getTextDirection, resolveLocalizedText } from '../../src/modules/localization/content.js';

test('publishes the approved Arabic and English locale contract', () => {
  assert.deepEqual(SUPPORTED_LOCALES, ['ar', 'en']);
  assert.equal(DEFAULT_CONTENT_LOCALE, 'ar');
  assert.deepEqual(LOCALE_DIRECTIONS, { ar: 'rtl', en: 'ltr' });
  assert.equal(getTextDirection('ar'), 'rtl');
  assert.equal(getTextDirection('en'), 'ltr');
});

test('validates strict partial LocalizedText without inventing missing translations', () => {
  assert.deepEqual(localizedTextSchema.parse({ ar: '\u0645\u062d\u062a\u0648\u0649 \u0645\u0648\u062b\u0642', en: 'Verified content' }), {
    ar: '\u0645\u062d\u062a\u0648\u0649 \u0645\u0648\u062b\u0642',
    en: 'Verified content'
  });
  assert.equal(localizedTextSchema.safeParse({}).success, false);
  assert.equal(localizedTextSchema.safeParse({ ar: '   ' }).success, false);
  assert.equal(localizedTextSchema.safeParse({ ar: 'Valid', fr: 'Not authorized' }).success, false);
  assert.equal(localizedTextSchema.safeParse({ ar: 'Invalid\u0000value' }).success, false);
});

test('resolves the requested locale directly and reports its direction', () => {
  assert.deepEqual(resolveLocalizedText({ ar: '\u0639\u0631\u0628\u064a', en: 'English' }, 'en'), {
    value: 'English', locale: 'en', direction: 'ltr', usedFallback: false
  });
});

test('falls back deterministically to Arabic and then English', () => {
  assert.deepEqual(resolveLocalizedText({ ar: '\u0639\u0631\u0628\u064a' }, 'en'), {
    value: '\u0639\u0631\u0628\u064a', locale: 'ar', direction: 'rtl', usedFallback: true
  });
  assert.deepEqual(resolveLocalizedText({ en: 'English only' }, 'ar'), {
    value: 'English only', locale: 'en', direction: 'ltr', usedFallback: true
  });
});

test('supports an explicit validated fallback locale', () => {
  assert.deepEqual(resolveLocalizedText({ en: 'English' }, 'ar', 'en'), {
    value: 'English', locale: 'en', direction: 'ltr', usedFallback: true
  });
  assert.equal(supportedLocaleSchema.safeParse('zh').success, false);
});

test('keeps stable UI translation keys separate from CMS content values', () => {
  assert.equal(uiTranslationKeySchema.parse('navigation.home'), 'navigation.home');
  assert.equal(uiTranslationKeySchema.safeParse('\u0648\u0627\u062c\u0647\u0629 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645').success, false);
  assert.equal(localizedTextSchema.safeParse('navigation.home').success, false);
});
