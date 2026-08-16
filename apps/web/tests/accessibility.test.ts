import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  ACCESSIBILITY_CONTRACT,
  ACCESSIBILITY_DIRECTIONS,
  ACCESSIBILITY_LOCALES,
  ACCESSIBLE_CONTRAST_PAIRS,
  APPROVED_DEVICE_SCOPES,
  FOCUSABLE_ELEMENT_SELECTOR,
  SkipLink,
  contrastRatio,
  getAccessibilityCopy,
  getNextRovingTabId,
  meetsContrast
} from '../src/features/accessibility/index.ts';
import { Button, Modal, Tabs } from '../src/features/design_system/index.ts';
import { getFoundationCopy } from '../src/features/frontend_foundation/locale.ts';
import { ROUTE_DEFINITIONS, resolveRoute } from '../src/routes/route-table.ts';
import { RouteShell } from '../src/features/routing/index.ts';

test('accessibility model preserves supported locale directions and approved device scopes', () => {
  assert.deepEqual([...ACCESSIBILITY_LOCALES], ['ar', 'en', 'zh-CN']);
  assert.deepEqual(ACCESSIBILITY_DIRECTIONS, { ar: 'rtl', en: 'ltr', 'zh-CN': 'ltr' });
  assert.deepEqual(APPROVED_DEVICE_SCOPES, {
    public: 'desktop/tablet/mobile',
    auth: 'desktop/tablet/mobile',
    seeker: 'desktop',
    provider: 'desktop',
    admin: 'desktop'
  });

  for (const route of ROUTE_DEFINITIONS) {
    assert.equal(route.deviceScope, APPROVED_DEVICE_SCOPES[route.surface]);
  }
  assert.equal(ACCESSIBILITY_CONTRACT.minimumTargetSize, '2.5rem');
});

test('approved contrast pairs meet the normal-text threshold', () => {
  for (const pair of ACCESSIBLE_CONTRAST_PAIRS) {
    assert.equal(meetsContrast(pair), true, `${pair.name} ratio was ${contrastRatio(pair.foreground, pair.background)}`);
  }
  assert.throws(() => contrastRatio('not-a-color', '#ffffff'), /Unsupported color value/);
});

test('roving tabs move in the visual direction and wrap without disabled items', () => {
  const ids = ['first', 'second', 'third'];
  assert.equal(getNextRovingTabId(ids, 'second', 'ArrowRight', 'ltr'), 'third');
  assert.equal(getNextRovingTabId(ids, 'third', 'ArrowRight', 'ltr'), 'first');
  assert.equal(getNextRovingTabId(ids, 'second', 'ArrowRight', 'rtl'), 'first');
  assert.equal(getNextRovingTabId(ids, 'first', 'ArrowLeft', 'rtl'), 'second');
  assert.equal(getNextRovingTabId(ids, 'second', 'Home', 'ltr'), 'first');
  assert.equal(getNextRovingTabId(ids, 'second', 'End', 'ltr'), 'third');
  assert.equal(getNextRovingTabId(ids, 'second', 'Tab', 'ltr'), undefined);
});

test('skip link, main landmark, navigation landmark, and locale direction are rendered', () => {
  const route = resolveRoute('/seeker/overview');
  const markup = renderToStaticMarkup(createElement(RouteShell, {
    route,
    locale: 'ar',
    copy: getFoundationCopy('ar'),
    children: createElement('p', null, 'content')
  }));

  assert.match(markup, /class="a11y-skip-link" href="#main-content"/);
  assert.match(markup, /<main[^>]+id="main-content"[^>]+tabindex="-1"/);
  assert.match(markup, /<nav[^>]+aria-label=/);
  assert.match(markup, /dir="rtl"/);
  assert.match(markup, new RegExp(getAccessibilityCopy('ar').skipToContent));

  const ltrMarkup = renderToStaticMarkup(createElement(SkipLink, { label: getAccessibilityCopy('zh-CN').skipToContent }));
  assert.match(ltrMarkup, /跳转到主要内容/);
});

test('modal has a focus target and tabs expose a roving keyboard structure', () => {
  const modal = renderToStaticMarkup(createElement(Modal, {
    open: true,
    title: 'Dialog',
    closeLabel: 'Close',
    onClose: () => undefined,
    children: createElement(Button, { children: 'Confirm' })
  }));
  assert.match(modal, /role="dialog"/);
  assert.match(modal, /aria-modal="true"/);
  assert.match(modal, /tabindex="-1"/);

  const tabs = renderToStaticMarkup(createElement(Tabs, {
    label: 'Sections',
    direction: 'rtl',
    items: [
      { id: 'one', label: 'One', panel: 'First' },
      { id: 'two', label: 'Two', panel: 'Second' }
    ]
  }));
  assert.match(tabs, /role="tablist"/);
  assert.match(tabs, /aria-orientation="horizontal"/);
  assert.match(tabs, /tabindex="0"/);
  assert.match(tabs, /tabindex="-1"/);
});

test('accessibility stylesheet includes focus, contrast, reduced-motion, and high-contrast safeguards', () => {
  const css = readFileSync(new URL('../src/features/accessibility/styles.css', import.meta.url), 'utf8');
  assert.match(css, /a11y-skip-link/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /prefers-contrast/);
  assert.match(css, /ui-button--danger/);
  assert.match(css, /focus-visible/);
});

test('focusable selector excludes disabled controls and explicit negative tabindex values', () => {
  assert.match(FOCUSABLE_ELEMENT_SELECTOR, /button:not\(\[disabled\]\)/);
  assert.match(FOCUSABLE_ELEMENT_SELECTOR, /\[tabindex="-1"\]/);
});

