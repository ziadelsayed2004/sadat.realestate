import { chromium } from '@playwright/test';

const baseUrl = process.env.WEB_BASE_URL ?? 'http://127.0.0.1:4175';
const locales = ['ar', 'en'];
const seekerId = '0123456789abcdef01234567';
const requestIdUnderReview = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const requestIdContacted = 'cccccccccccccccccccccccc';
const session = { accessToken: 'seeker.evidence.token', tokenType: 'Bearer', expiresInSeconds: 900, user: { id: seekerId, roleType: 'seeker', status: 'verified' } };
const profile = { id: seekerId, roleType: 'seeker', status: 'verified', email: 'seeker@example.com', firstName: 'QA', lastName: 'Seeker', locale: 'ar' };
const envelope = data => JSON.stringify({ data, meta: { requestId: 'seeker-interaction-a11y-evidence' } });
const cases = [
  { id: 'SEK-01', path: '/seeker', selector: '[data-screen-id="SEK-01"]' },
  { id: 'SEK-02', path: '/seeker/requests', selector: '[data-screen-id="SEK-02"]' },
  { id: 'SEK-03', path: `/seeker/requests/${requestIdUnderReview}`, selector: '[data-screen-id="SEK-03"]' },
  { id: 'SEK-04', path: `/seeker/requests/${requestIdContacted}`, selector: '[data-screen-id="SEK-04"]' },
  { id: 'SEK-05', path: '/seeker/viewings', selector: '[data-screen-id="SEK-05"]' },
  { id: 'SEK-06', path: '/seeker/saved', selector: '[data-screen-id="SEK-06"]' },
  { id: 'SEK-07', path: '/seeker/notifications', selector: '[data-screen-id="SEK-07"]' },
  { id: 'SEK-08', path: '/seeker/profile?tab=preferences', selector: '[data-screen-id="SEK-08"]' },
  { id: 'SEK-09', path: '/seeker/profile?tab=personal', selector: '[data-screen-id="SEK-09"]' },
  { id: 'SEK-10', path: '/seeker/settings', selector: '[data-screen-id="SEK-10"]' }
];

const browser = await chromium.launch({ headless: true });
const results = [];
for (const locale of locales) {
  const context = await browser.newContext({ viewport: { width: 1551, height: 900 }, locale, colorScheme: 'light' });
  const page = await context.newPage();
  const apiRequests = [];
  const apiBodies = [];
  page.on('request', event => { if (event.url().includes('/api/v1/')) apiRequests.push({ method: event.method(), url: event.url() }); });
  await page.route('**/api/v1/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname.replace('/api/v1', '');
    if (pathname === '/auth/refresh') return route.fulfill({ status: 200, contentType: 'application/json', body: envelope(session) });
    if (pathname === '/seeker/overview') return route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ requests: 2, viewings: 1, savedProperties: 3, notifications: 2, unreadNotifications: 1 }) });
    if (pathname === '/seeker/requests') return route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ items: [], page: 1, limit: 20, total: 0 }) });
    if (pathname === `/seeker/requests/${requestIdUnderReview}` || pathname === `/seeker/requests/${requestIdContacted}`) {
      const status = pathname.endsWith(requestIdContacted) ? 'contacted' : 'under_review';
      return route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ id: pathname.endsWith(requestIdContacted) ? requestIdContacted : requestIdUnderReview, type: 'contact', source: 'seeker', propertyId: 'aaaaaaaaaaaaaaaaaaaaaaaa', status, payload: { message: 'QA-owned request' }, version: 0, availableActions: [], createdAt: '2026-08-18T10:00:00.000Z', updatedAt: '2026-08-18T10:00:00.000Z' }) });
    }
    if (pathname === '/seeker/viewings') return route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ items: [], page: 1, limit: 20, total: 0 }) });
    if (pathname === '/seeker/favorites') return route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ items: [{ id: 'aaaaaaaaaaaaaaaaaaaaaaaa', slug: 'saved-home', kind: 'property', name: { ar: 'شقة في مدينة السادات', en: 'Apartment in Sadat City' }, transactionType: 'sale', area: { value: 145, unit: 'sqm' }, layout: { bedrooms: 3, bathrooms: 2, floor: 4 }, price: { amount: 1900000, currency: 'EGP' }, savedAt: '2026-08-18T10:00:00.000Z' }], page: 1, limit: 20, total: 1 }) });
    if (pathname === '/seeker/notifications') return route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ items: [], unreadCount: 0, page: 1, limit: 20, total: 0 }) });
    if (pathname === '/me/preferences') return route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ preferences: {}, updatedAt: '2026-08-18T10:00:00.000Z' }) });
    if (pathname === '/me') {
      if (request.method() === 'PATCH') apiBodies.push({ pathname, method: request.method(), body: request.postDataJSON?.() ?? null });
      return route.fulfill({ status: 200, contentType: 'application/json', body: envelope(profile) });
    }
    return route.continue();
  });

  for (const item of cases) {
    const target = new URL(item.path, baseUrl);
    target.searchParams.set('lang', locale);
    await page.goto(target.toString(), { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.locator(item.selector).waitFor({ state: 'visible', timeout: 30_000 });
    await page.locator('.a11y-skip-link').focus();
    const skipFocused = await page.locator('.a11y-skip-link').evaluate(node => document.activeElement === node);
    await page.locator('.seeker-dashboard__nav a').first().focus();
    const navFocused = await page.locator('.seeker-dashboard__nav a').first().evaluate(node => document.activeElement === node);
    const base = await page.evaluate(() => {
      const sensitive = /\b(?:assignedTo|internalNotes|auditData|providerId|seekerId|recipientId|providerDocument|accessToken|refreshToken|password|secret)\s*[:=]/u;
      const unnamed = [...document.querySelectorAll('a[href], button, input, select, textarea')]
        .filter(node => {
          const style = getComputedStyle(node);
          return style.display !== 'none' && style.visibility !== 'hidden' && !node.closest('[aria-hidden="true"]');
        })
        .filter(node => {
          const label = node.getAttribute('aria-label') ?? node.getAttribute('title') ?? '';
          const text = node.textContent?.trim() ?? '';
          if (label || text) return false;
          if (node instanceof HTMLInputElement || node instanceof HTMLSelectElement || node instanceof HTMLTextAreaElement) return !node.labels?.length && !node.getAttribute('placeholder');
          return true;
        })
        .map(node => node.outerHTML.slice(0, 160));
      return { lang: document.documentElement.lang, dir: document.documentElement.dir, mainVisible: Boolean(document.querySelector('#main-content')), unnamed, sensitiveProjectionVisible: sensitive.test(document.body.innerText) };
    });
    const interactions = {};
    if (item.id === 'SEK-01') interactions.searchLink = await page.locator('.seeker-dashboard__primary-link').getAttribute('href');
    if (item.id === 'SEK-02') {
      await page.locator('#seeker-requests-search').fill('qa');
      await page.waitForTimeout(250);
      interactions.searchQueryObserved = apiRequests.some(request => request.url.includes('search=qa'));
    }
    if (item.id === 'SEK-03' || item.id === 'SEK-04') interactions.backLink = await page.locator('.seeker-dashboard__back-link').getAttribute('href');
    if (item.id === 'SEK-05') {
      const pastTab = page.locator('[role="tab"]').nth(1);
      await pastTab.click();
      interactions.tabSelection = await pastTab.getAttribute('aria-selected');
    }
    if (item.id === 'SEK-06') {
      const listButton = page.locator('.seeker-saved__view-toggle button').last();
      await listButton.click();
      interactions.listView = await page.locator('.seeker-saved__grid').getAttribute('data-view');
    }
    if (item.id === 'SEK-07') {
      const unreadTab = page.locator('.seeker-notifications__tab').nth(1);
      await unreadTab.click();
      interactions.filterSelection = await unreadTab.getAttribute('aria-pressed');
    }
    if (item.id === 'SEK-08') interactions.personalTab = await page.locator('.seeker-profile__tabs a').last().getAttribute('href');
    if (item.id === 'SEK-09') {
      await page.locator('#seeker-profile-first-name').fill('Mariam');
      await page.locator('#seeker-profile-last-name').fill('QA');
      await page.locator('button[type="submit"]').click();
      await page.waitForTimeout(250);
      interactions.profilePatchObserved = apiBodies.some(body => body.method === 'PATCH' && body.pathname === '/me' && body.body?.firstName === 'Mariam' && body.body?.lastName === 'QA');
    }
    if (item.id === 'SEK-10') interactions.phoneControlCount = await page.locator('input[id*="phone"], [name*="phone" i]').count();
    results.push({ screenId: item.id, locale, direction: locale === 'ar' ? 'rtl' : 'ltr', route: target.pathname + target.search, accessibility: { ...base, skipFocused, navFocused }, interactions, apiRequests: apiRequests.splice(0) });
  }
  await context.close();
}
await browser.close();
console.log(JSON.stringify({ schemaVersion: 1, generatedAt: new Date().toISOString(), baseUrl, results }, null, 2));
