import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { directionForLocale, getFoundationCopy, isSupportedLocale, resolveLocale } from '../src/features/frontend_foundation/locale.ts';
import { RouteStateView } from '../src/features/frontend_foundation/route-state.ts';
import { FOUNDATION_STATES } from '../src/features/frontend_foundation/state-model.ts';
import { ROUTE_DEFINITIONS, resolveRoute } from '../src/routes/route-table.ts';

test('locale resolution keeps Arabic RTL and maps supported LTR locales', () => {
  assert.equal(resolveLocale(undefined, 'ar-EG, en;q=0.8'), 'ar');
  assert.equal(resolveLocale(undefined, 'en-US,en;q=0.8'), 'en');
  assert.equal(resolveLocale(undefined, 'fr-FR,fr;q=0.8'), 'ar');
  assert.equal(directionForLocale('ar'), 'rtl');
  assert.equal(directionForLocale('en'), 'ltr');
  assert.equal(isSupportedLocale('ar'), true);
  assert.equal(isSupportedLocale('fr'), false);
  assert.equal(getFoundationCopy('ar').brand, 'عقارات السادات');
});

test('route foundation maps canonical surfaces without inventing API paths', () => {
  assert.equal(resolveRoute('/').surface, 'public');
  assert.equal(resolveRoute('/properties/example-home?lang=en').id, 'public-property-details');
  assert.equal(resolveRoute('/community?create=1').id, 'public-community');
  assert.equal(resolveRoute('/auth/login').surface, 'auth');
  assert.equal(resolveRoute('/provider-application/status').requiresAuthentication, true);
  assert.equal(resolveRoute('/seeker/requests').requiresAuthentication, true);
  assert.equal(resolveRoute('/provider/properties/new/basic').deviceScope, 'desktop');
  assert.equal(resolveRoute('/admin/audit-logs').surface, 'admin');
});

test('unknown URLs remain a truthful 404 shell', () => {
  const route = resolveRoute('/not-a-canonical-screen');
  assert.equal(route.kind, 'not_found');
  assert.equal(route.id, 'not-found');
});

test('the reusable foundation state model covers every required UI state', () => {
  assert.deepEqual([...FOUNDATION_STATES], ['loading', 'empty', 'error', 'retry', 'success', 'permission']);
});

test('renders every reusable UI state with its accessible state marker', () => {
  const copy = getFoundationCopy('en');
  for (const state of FOUNDATION_STATES) {
    const html = renderToStaticMarkup(createElement(RouteStateView, {
      state,
      copy,
      onRetry: () => undefined
    }));
    assert.match(html, new RegExp(`data-state="${state}"`));
  }

  const retryHtml = renderToStaticMarkup(createElement(RouteStateView, {
    state: 'retry',
    copy
  }));
  assert.match(retryHtml, /<button[^>]*disabled=""/);
});

test('route metadata preserves the approved device scope', () => {
  for (const route of ROUTE_DEFINITIONS) {
    if (route.surface === 'public' || route.surface === 'auth') {
      assert.equal(route.deviceScope, 'desktop/tablet/mobile');
    } else {
      assert.equal(route.deviceScope, 'desktop');
    }
  }
});
