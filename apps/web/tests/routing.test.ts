import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { getFoundationCopy } from '../src/features/frontend_foundation/locale.ts';
import {
  ANONYMOUS_ROUTE_SESSION,
  AdminShell,
  ForbiddenPage,
  NotFoundPage,
  RouteErrorBoundary,
  RouteShell,
  SeekerShell,
  guardRoute,
  shellKindForRoute
} from '../src/features/routing/index.ts';
import { resolveRoute } from '../src/routes/route-table.ts';

test('route guards keep public routes open and protect each dashboard surface by role', () => {
  const publicRoute = resolveRoute('/properties');
  const seekerRoute = resolveRoute('/seeker/requests');
  const providerRoute = resolveRoute('/provider/properties');
  const adminRoute = resolveRoute('/admin/audit-logs');

  assert.equal(guardRoute(publicRoute, ANONYMOUS_ROUTE_SESSION).allowed, true);
  const anonymousSeeker = guardRoute(seekerRoute, ANONYMOUS_ROUTE_SESSION);
  assert.equal(anonymousSeeker.allowed, false);
  if (anonymousSeeker.allowed) throw new Error('anonymous seeker route unexpectedly allowed');
  assert.equal(anonymousSeeker.reason, 'authentication_required');

  const providerOnSeekerRoute = guardRoute(seekerRoute, { status: 'authenticated', role: 'provider' });
  assert.equal(providerOnSeekerRoute.allowed, false);
  if (providerOnSeekerRoute.allowed) throw new Error('provider unexpectedly allowed on seeker route');
  assert.equal(providerOnSeekerRoute.reason, 'forbidden');
  assert.equal(guardRoute(providerRoute, { status: 'authenticated', role: 'provider' }).allowed, true);
  assert.equal(guardRoute(adminRoute, { status: 'authenticated', role: 'admin' }).allowed, true);
});

test('authenticated provider application routes do not invent a dashboard role requirement', () => {
  const route = resolveRoute('/provider-application/status');
  assert.equal(guardRoute(route, { status: 'authenticated', role: 'seeker' }).allowed, true);
});

test('shell selection maps public, auth, seeker, provider, and admin surfaces explicitly', () => {
  assert.equal(shellKindForRoute(resolveRoute('/')), 'public');
  assert.equal(shellKindForRoute(resolveRoute('/auth/login')), 'auth');
  assert.equal(shellKindForRoute(resolveRoute('/seeker')), 'seeker');
  assert.equal(shellKindForRoute(resolveRoute('/provider')), 'provider');
  assert.equal(shellKindForRoute(resolveRoute('/admin')), 'admin');
  assert.equal(shellKindForRoute(resolveRoute('/missing')), 'public');
});

test('dashboard shells expose a scoped navigation landmark and preserve locale direction', () => {
  const copy = getFoundationCopy('ar');
  const route = resolveRoute('/admin/audit-logs');
  const markup = renderToStaticMarkup(createElement(AdminShell, {
    route,
    locale: 'ar',
    copy,
    children: createElement('p', null, 'content')
  }));
  assert.match(markup, /data-shell="admin"/);
  assert.match(markup, /data-shell-navigation="true"/);
  assert.match(markup, /dir="rtl"/);

  const seekerMarkup = renderToStaticMarkup(createElement(SeekerShell, {
    route: resolveRoute('/seeker'),
    locale: 'en',
    copy: getFoundationCopy('en'),
    children: createElement('p', null, 'content')
  }));
  assert.match(seekerMarkup, /data-shell="seeker"/);
  assert.match(seekerMarkup, /dir="ltr"/);
});

test('404 and 403 pages expose truthful status markers without protected details', () => {
  const notFound = renderToStaticMarkup(createElement(NotFoundPage, { copy: getFoundationCopy('en'), url: '/missing' }));
  assert.match(notFound, /data-page="not-found"/);
  assert.match(notFound, /data-status-code="404"/);

  const forbidden = renderToStaticMarkup(createElement(ForbiddenPage, { copy: getFoundationCopy('en') }));
  assert.match(forbidden, /data-access="forbidden"/);
  assert.match(forbidden, /data-status-code="403"/);
  assert.doesNotMatch(forbidden, /internal|assignment|audit data/i);

  const page = renderToStaticMarkup(createElement(ForbiddenPage, { copy: getFoundationCopy('zh-CN') }));
  assert.match(page, /data-status-code="403"/);
});

test('route error boundary switches to a localized safe fallback', () => {
  const copy = getFoundationCopy('en');
  const boundary = new RouteErrorBoundary({ copy, children: createElement('p', null, 'content') });
  boundary.state = RouteErrorBoundary.getDerivedStateFromError(new Error('private failure'));
  const markup = renderToStaticMarkup(boundary.render());
  assert.match(markup, /data-error-boundary="true"/);
  assert.match(markup, /data-state="error"/);
  assert.doesNotMatch(markup, /private failure/);
});

test('RouteShell renders the selected route surface without adding route data', () => {
  const markup = renderToStaticMarkup(createElement(RouteShell, {
    route: resolveRoute('/provider/properties'),
    locale: 'zh-CN',
    copy: getFoundationCopy('zh-CN'),
    children: createElement('p', null, 'empty state')
  }));
  assert.match(markup, /data-shell="provider"/);
  assert.match(markup, /data-surface="provider"/);
  assert.match(markup, /dir="ltr"/);
  assert.match(markup, />empty state</);
});
