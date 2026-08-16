import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  createTranslator,
  getTranslationCatalog,
  isTranslationKey,
  LocaleStore,
  LOCALE_STORAGE_KEY,
  applyLocaleToDocument,
  directionForLocale,
  isSupportedLocale,
  normalizeLocale,
  resolveLocale,
  TRANSLATION_KEYS,
  translate
} from '../src/features/localization/index.ts';

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
  for (const locale of ['ar', 'en', 'zh-CN'] as const) {
    const catalog = getTranslationCatalog(locale);
    assert.deepEqual(Object.keys(catalog).sort(), [...TRANSLATION_KEYS].sort());
    assert.equal(translate(locale, 'app.brand'), catalog['app.brand']);
  }

  assert.equal(isTranslationKey('shell.title'), true);
  assert.equal(isTranslationKey('shell.unknown'), false);
  assert.equal(translate('zh-CN', 'surface.public'), '\u516c\u5f00');
  assert.equal(createTranslator('en')('shell.retry'), 'Retry');
  assert.throws(() => translate('fr', 'app.brand'), /Unsupported locale/);
  assert.throws(() => translate('en', 'shell.unknown'), /Unknown UI translation key/);
});

test('locale normalization preserves approved direction rules and falls back safely', () => {
  assert.equal(normalizeLocale('ar-EG'), 'ar');
  assert.equal(normalizeLocale('en-US'), 'en');
  assert.equal(normalizeLocale('zh'), 'zh-CN');
  assert.equal(normalizeLocale('fr-FR'), undefined);
  assert.equal(isSupportedLocale('zh-Hans'), true);
  assert.equal(resolveLocale(undefined, 'fr-FR, zh-CN;q=0.8'), 'zh-CN');
  assert.equal(resolveLocale('en-US', 'ar'), 'en');
  assert.equal(resolveLocale(undefined, 'fr-FR'), 'ar');
  assert.equal(directionForLocale('ar'), 'rtl');
  assert.equal(directionForLocale('en'), 'ltr');
  assert.equal(directionForLocale('zh-CN'), 'ltr');
});

test('locale store prefers persisted locale, persists safe changes, and notifies subscribers', () => {
  const storage = new MemoryStorage({ [LOCALE_STORAGE_KEY]: 'en' });
  const store = new LocaleStore({ storage, explicitLocale: 'ar', acceptLanguage: 'zh-CN' });
  const observed: string[] = [];
  const unsubscribe = store.subscribe((snapshot) => observed.push(`${snapshot.locale}:${snapshot.direction}`));

  assert.deepEqual(store.getSnapshot(), { locale: 'en', direction: 'ltr' });
  assert.deepEqual(store.setLocale('zh'), { locale: 'zh-CN', direction: 'ltr' });
  assert.equal(storage.getItem(LOCALE_STORAGE_KEY), 'zh-CN');
  assert.deepEqual(observed, ['zh-CN:ltr']);

  assert.throws(() => store.setLocale('fr'), /Unsupported locale/);
  assert.equal(storage.getItem(LOCALE_STORAGE_KEY), 'zh-CN');
  unsubscribe();
  store.setLocale('ar');
  assert.deepEqual(observed, ['zh-CN:ltr']);
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
  applyLocaleToDocument('zh-CN', fakeDocument);
  assert.deepEqual(fakeDocument.documentElement, { lang: 'zh-CN', dir: 'ltr' });
  assert.doesNotThrow(() => applyLocaleToDocument('en'));
});

test('client bootstrap and design tokens include a CJK-capable fallback font', () => {
  const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const cssTokens = readFileSync(new URL('../src/features/design_system/tokens.css', import.meta.url), 'utf8');
  const jsTokens = readFileSync(new URL('../src/features/design_system/tokens.ts', import.meta.url), 'utf8');
  assert.match(indexHtml, /family=Noto\+Sans\+SC/);
  assert.match(cssTokens, /"Noto Sans SC"/);
  assert.match(jsTokens, /"Noto Sans SC"/);
});
