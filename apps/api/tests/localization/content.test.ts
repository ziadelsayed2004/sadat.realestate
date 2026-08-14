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

test('publishes the approved locale and direction contract', () => {
  assert.deepEqual(SUPPORTED_LOCALES, ['ar', 'en', 'zh-CN']);
  assert.equal(DEFAULT_CONTENT_LOCALE, 'ar');
  assert.deepEqual(LOCALE_DIRECTIONS, { ar: 'rtl', en: 'ltr', 'zh-CN': 'ltr' });
  assert.equal(getTextDirection('ar'), 'rtl');
  assert.equal(getTextDirection('en'), 'ltr');
  assert.equal(getTextDirection('zh-CN'), 'ltr');
});

test('validates strict partial LocalizedText without inventing missing translations', () => {
  assert.deepEqual(localizedTextSchema.parse({ ar: '  محتوى موثق  ', en: 'Verified content' }), {
    ar: 'محتوى موثق',
    en: 'Verified content'
  });
  assert.equal(localizedTextSchema.safeParse({}).success, false);
  assert.equal(localizedTextSchema.safeParse({ ar: '   ' }).success, false);
  assert.equal(localizedTextSchema.safeParse({ ar: 'Valid', fr: 'Non autorisé' }).success, false);
  assert.equal(localizedTextSchema.safeParse({ ar: 'Invalid\u0000value' }).success, false);
});

test('resolves the requested locale directly and reports its direction', () => {
  assert.deepEqual(resolveLocalizedText({ ar: 'عربي', en: 'English' }, 'en'), {
    value: 'English', locale: 'en', direction: 'ltr', usedFallback: false
  });
});

test('falls back deterministically to Arabic and then another available locale', () => {
  assert.deepEqual(resolveLocalizedText({ ar: 'عربي', en: 'English' }, 'zh-CN'), {
    value: 'عربي', locale: 'ar', direction: 'rtl', usedFallback: true
  });
  assert.deepEqual(resolveLocalizedText({ en: 'English only' }, 'zh-CN'), {
    value: 'English only', locale: 'en', direction: 'ltr', usedFallback: true
  });
  assert.deepEqual(resolveLocalizedText({ 'zh-CN': '简体中文' }, 'en'), {
    value: '简体中文', locale: 'zh-CN', direction: 'ltr', usedFallback: true
  });
});

test('supports an explicit validated fallback locale', () => {
  assert.deepEqual(resolveLocalizedText({ ar: 'عربي', en: 'English' }, 'zh-CN', 'en'), {
    value: 'English', locale: 'en', direction: 'ltr', usedFallback: true
  });
  assert.equal(supportedLocaleSchema.safeParse('zh').success, false);
});

test('keeps stable UI translation keys separate from CMS content values', () => {
  assert.equal(uiTranslationKeySchema.parse('navigation.home'), 'navigation.home');
  assert.equal(uiTranslationKeySchema.safeParse('واجهة المستخدم').success, false);
  assert.equal(localizedTextSchema.safeParse('navigation.home').success, false);
});
