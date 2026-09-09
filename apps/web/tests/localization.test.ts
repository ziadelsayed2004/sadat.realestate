import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  createTranslator,
  getTranslationCatalog,
  getEditableCopyCatalog,
  isTranslationKey,
  LocaleStore,
  LOCALE_STORAGE_KEY,
  applyLocaleToDocument,
  directionForLocale,
  isSupportedLocale,
  localizeCopy,
  normalizeLocale,
  replaceLocaleInUrl,
  resolveLocale,
  TRANSLATION_KEYS,
  translate
} from '../src/features/localization/index.ts';
import arMessages from '../src/features/localization/messages/ar.json';
import enMessages from '../src/features/localization/messages/en.json';

function translationLeafPaths(value: unknown, prefix = '', result: string[] = []): string[] {
  if (typeof value === 'string') {
    result.push(prefix);
  } else if (Array.isArray(value)) {
    value.forEach((item, index) => translationLeafPaths(item, `${prefix}[${index}]`, result));
  } else if (value !== null && typeof value === 'object') {
    Object.entries(value).forEach(([key, item]) => translationLeafPaths(item, prefix === '' ? key : `${prefix}.${key}`, result));
  }
  return result;
}

class MemoryStorage {
  private readonly values = new Map<string, string>();

  public constructor(initial: Record<string, string> = {}) {
    for (const [key, value] of Object.entries(initial)) this.values.set(key, value);
  }

  public getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  public setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

test('all supported locales expose the same validated UI translation keys', () => {
  for (const locale of ['ar', 'en',] as const) {
    const catalog = getTranslationCatalog(locale);
    assert.deepEqual(Object.keys(catalog).sort(), [...TRANSLATION_KEYS].sort());
    assert.equal(translate(locale, 'app.brand'), catalog['app.brand']);
  }

  assert.equal(isTranslationKey('shell.title'), true);
  assert.equal(isTranslationKey('shell.unknown'), false);
  assert.throws(() => translate('unsupported', 'surface.public'), /Unsupported locale/);
  assert.equal(createTranslator('en')('shell.retry'), 'Retry');
  assert.throws(() => translate('fr', 'app.brand'), /Unsupported locale/);
  assert.throws(() => translate('en', 'shell.unknown'), /Unknown UI translation key/);
});

test('editable Arabic and English JSON catalogs cover every static screen copy key', () => {
  const arabicKeys = translationLeafPaths(arMessages).sort();
  const englishKeys = translationLeafPaths(enMessages).sort();
  assert.deepEqual(arabicKeys, englishKeys);
  assert.ok(arabicKeys.length >= 3_200);
  assert.equal(Object.keys(arMessages).length, 48);
  assert.equal(Object.keys(enMessages).length, 48);
});

test('localized copy keeps referential identity for render effect dependencies', () => {
  assert.equal(getEditableCopyCatalog('ar'), getEditableCopyCatalog('ar'));
  const fallback = { title: 'fallback' };
  assert.equal(localizeCopy('test.identity', 'ar', fallback), localizeCopy('test.identity', 'ar', fallback));
});

test('the early locale guard and transition skeleton are present before hydration', () => {
  const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(indexHtml, /classList\.add\('app-booting'\)/);
  assert.match(indexHtml, /sadat-real-estate\\\.locale=\(ar\|en\)/);
  assert.match(indexHtml, /id="app-transition-loader"/);
  assert.ok(indexHtml.indexOf('app-booting') < indexHtml.indexOf('id="app"'));
});

test('locale normalization preserves approved direction rules and falls back safely', () => {
  assert.equal(normalizeLocale('ar-EG'), 'ar');
  assert.equal(normalizeLocale('en-US'), 'en');
  assert.equal(normalizeLocale('zh'), undefined);
  assert.equal(normalizeLocale('fr-FR'), undefined);
  assert.equal(isSupportedLocale('zh-Hans'), false);
  assert.equal(resolveLocale(undefined, 'fr-FR, zh;q=0.8'), 'ar');
  assert.equal(resolveLocale('en-US', 'ar'), 'en');
  assert.equal(resolveLocale(undefined, 'fr-FR'), 'ar');
  assert.equal(directionForLocale('ar'), 'rtl');
  assert.equal(directionForLocale('en'), 'ltr');
  assert.throws(() => directionForLocale('fr'), /Unsupported locale/);
});

test('locale store prefers persisted locale, persists safe changes, and notifies subscribers', () => {
  const storage = new MemoryStorage({ [LOCALE_STORAGE_KEY]: 'en' });
  const store = new LocaleStore({ storage, explicitLocale: 'ar', acceptLanguage: 'fr-FR' });
  const observed: string[] = [];
  const unsubscribe = store.subscribe((snapshot) => observed.push(`${snapshot.locale}:${snapshot.direction}`));

  assert.deepEqual(store.getSnapshot(), { locale: 'en', direction: 'ltr' });
  assert.deepEqual(store.setLocale('ar'), { locale: 'ar', direction: 'rtl' });
  assert.equal(storage.getItem(LOCALE_STORAGE_KEY), 'ar');
  assert.deepEqual(observed, ['ar:rtl']);

  assert.throws(() => store.setLocale('fr'), /Unsupported locale/);
  assert.equal(storage.getItem(LOCALE_STORAGE_KEY), 'ar');
  unsubscribe();
  store.setLocale('ar');
  assert.deepEqual(observed, ['ar:rtl']);
});

test('locale store ignores invalid or unavailable storage without breaking the fallback', () => {
  const brokenStorage = {
    getItem: () => { throw new Error('storage blocked'); },
    setItem: () => { throw new Error('storage blocked'); }
  };
  const store = new LocaleStore({ storage: brokenStorage, explicitLocale: 'en-US' });

  assert.deepEqual(store.getSnapshot(), { locale: 'en', direction: 'ltr' });
  assert.doesNotThrow(() => store.setLocale('ar'));
  assert.equal(store.getSnapshot().locale, 'ar');
});

test('document locale application is SSR-safe and updates both language and direction', () => {
  const fakeDocument = { documentElement: { lang: 'ar', dir: 'rtl' } };
  applyLocaleToDocument('en', fakeDocument);
  assert.deepEqual(fakeDocument.documentElement, { lang: 'en', dir: 'ltr' });
  assert.doesNotThrow(() => applyLocaleToDocument('en'));
});

test('locale URL replacement preserves route, query and hash while changing only lang', () => {
  assert.equal(
    replaceLocaleInUrl('/properties/featured?lang=ar&sort=price#contact', 'en'),
    '/properties/featured?lang=en&sort=price#contact'
  );
  assert.equal(
    replaceLocaleInUrl('https://sadat.example/properties?filter=sale#results', 'ar'),
    'https://sadat.example/properties?filter=sale&lang=ar#results'
  );
});

test('client bootstrap and design tokens include a CJK-capable fallback font', () => {
  const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const cssTokens = readFileSync(new URL('../src/features/design_system/tokens.css', import.meta.url), 'utf8');
  const jsTokens = readFileSync(new URL('../src/features/design_system/tokens.ts', import.meta.url), 'utf8');
  assert.match(indexHtml, /family=Noto\+Sans\+SC/);
  assert.match(cssTokens, /"Noto Sans SC"/);
  assert.match(jsTokens, /"Noto Sans SC"/);
});
