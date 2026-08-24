import { expect, test } from '@playwright/test';

const seekerId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const requestId = '4123456789abcdef01234567';

type QaLocale = 'ar' | 'en' | 'zh-CN';

function localeForProject(): QaLocale {
  const project = test.info().project.name;
  if (project.endsWith('-zh')) return 'zh-CN';
  if (project.endsWith('-en')) return 'en';
  return 'ar';
}

function successMeta(requestIdValue: string) {
  return { meta: { requestId: requestIdValue } };
}

function requestFixture() {
  return {
    id: requestId,
    type: 'contact',
    source: 'seeker',
    propertyId: 'bbbbbbbbbbbbbbbbbbbbbbbb',
    status: 'under_review',
    payload: { message: 'QA-owned request' },
    version: 0,
    availableActions: [],
    createdAt: '2026-08-18T10:00:00.000Z',
    updatedAt: '2026-08-18T10:00:00.000Z'
  };
}

async function routeSession(page: import('@playwright/test').Page, allowed = true): Promise<void> {
  await page.route('**/api/v1/auth/refresh', async route => {
    if (!allowed) {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            messageKey: 'errors.authenticationRequired',
            details: [],
            requestId: 'seeker-dashboard-qa-refresh-denied'
          }
        })
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          accessToken: 'seeker.qa.token',
          tokenType: 'Bearer',
          expiresInSeconds: 900,
          user: { id: seekerId, roleType: 'seeker', status: 'verified' }
        },
        ...successMeta('seeker-dashboard-qa-refresh')
      })
    });
  });
}

async function routeSeekerApis(page: import('@playwright/test').Page): Promise<void> {
  const expectAuthorization = (route: import('@playwright/test').Route) => {
    expect(route.request().headers().authorization).toBe('Bearer seeker.qa.token');
  };

  await page.route('**/api/v1/seeker/overview', async route => {
    expectAuthorization(route);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: { requests: 0, viewings: 0, savedProperties: 0, notifications: 0, unreadNotifications: 0 },
        ...successMeta('seeker-dashboard-qa-overview')
      })
    });
  });

  await page.route('**/api/v1/seeker/requests**', async route => {
    expectAuthorization(route);
    const pathname = new URL(route.request().url()).pathname;
    const isDetail = pathname.endsWith(`/${requestId}`);
    const data = isDetail
      ? requestFixture()
      : { items: [], page: 1, limit: 20, total: 0 };
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data, ...successMeta(isDetail ? 'seeker-dashboard-qa-request-detail' : 'seeker-dashboard-qa-requests') })
    });
  });

  await page.route('**/api/v1/seeker/viewings**', async route => {
    expectAuthorization(route);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { items: [], page: 1, limit: 20, total: 0 }, ...successMeta('seeker-dashboard-qa-viewings') })
    });
  });

  await page.route('**/api/v1/seeker/favorites**', async route => {
    expectAuthorization(route);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { items: [], page: 1, limit: 20, total: 0 }, ...successMeta('seeker-dashboard-qa-favorites') })
    });
  });

  await page.route('**/api/v1/seeker/notifications**', async route => {
    expectAuthorization(route);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { items: [], unreadCount: 0, page: 1, limit: 20, total: 0 }, ...successMeta('seeker-dashboard-qa-notifications') })
    });
  });

  await page.route('**/api/v1/me**', async route => {
    expectAuthorization(route);
    const isPreferences = new URL(route.request().url()).pathname.endsWith('/preferences');
    const data = isPreferences
      ? { preferences: {}, updatedAt: '2026-08-18T10:00:00.000Z' }
      : {
          id: seekerId,
          roleType: 'seeker',
          status: 'verified',
          phone: '+201012345678',
          firstName: 'QA',
          lastName: 'Seeker',
          locale: localeForProject()
        };
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data, ...successMeta(isPreferences ? 'seeker-dashboard-qa-preferences' : 'seeker-dashboard-qa-profile') })
    });
  });
}

const completedRoutes = [
  { path: '/seeker', selector: '[data-screen-id="SEK-01"]' },
  { path: '/seeker/requests', selector: '[data-screen-id="SEK-02"]' },
  { path: `/seeker/requests/${requestId}`, selector: '[data-route="/seeker/requests/:requestId"]' },
  { path: '/seeker/viewings', selector: '[data-screen-id="SEK-05"]' },
  { path: '/seeker/saved', selector: '[data-screen-id="SEK-06"]' },
  { path: '/seeker/notifications', selector: '[data-screen-id="SEK-07"]' },
  { path: '/seeker/profile?tab=preferences', selector: '[data-screen-id="SEK-08"]' },
  { path: '/seeker/profile?tab=profile', selector: '[data-screen-id="SEK-09"]' },
  { path: '/seeker/settings', selector: '[data-screen-id="SEK-10"]' }
] as const;

function localizedPath(path: string, locale: QaLocale): string {
  return `${path}${path.includes('?') ? '&' : '?'}lang=${encodeURIComponent(locale)}`;
}

test.describe('F3 Seeker Dashboard QA', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'design-source', description: 'SEK-01 through SEK-10 local final exports; Figma node 6027-3579' });
    test.skip(!testInfo.project.name.includes('desktop'), 'Seeker Dashboard is approved for desktop only.');
    await routeSession(page);
    await routeSeekerApis(page);
  });

  for (const routeCase of completedRoutes) {
    test(`covers ${routeCase.path} with locale direction, desktop scope, focus, and safe projection`, async ({ page }) => {
      const locale = localeForProject();
      const response = await page.goto(localizedPath(routeCase.path, locale), { waitUntil: 'domcontentloaded' });
      expect(response?.status()).toBe(200);
      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
      await expect(page.locator('.route-shell--seeker')).toHaveAttribute('data-device-scope', 'desktop');
      await expect(page.locator('#main-content')).toBeVisible();
      await expect(page.locator('.seeker-dashboard__nav')).toHaveAttribute('aria-label', /.+/u);
      await expect(page.locator(routeCase.selector)).toBeVisible();
      await expect(page.locator('body')).not.toContainText(/assignedTo|internalNotes|auditData|providerId|seekerId|recipientId|providerDocument|accessToken|refreshToken|password|secret/u);

      await page.locator('.a11y-skip-link').focus();
      await expect(page.locator('.a11y-skip-link')).toBeFocused();
      await page.locator('.seeker-dashboard__nav a').first().focus();
      await expect(page.locator('.seeker-dashboard__nav a').first()).toBeFocused();
    });
  }

  for (const path of ['/seeker', '/seeker/requests', '/seeker/viewings', '/seeker/saved', '/seeker/notifications', '/seeker/profile?tab=preferences']) {
    test(`preserves the truthful empty state for ${path}`, async ({ page }) => {
      const locale = localeForProject();
      await page.goto(localizedPath(path, locale), { waitUntil: 'domcontentloaded' });
      await expect(page.locator('[data-state="empty"]').first()).toBeVisible();
    });
  }

  test('recovers the overview from a truthful error state through retry', async ({ page }) => {
    const locale = localeForProject();
    await page.unroute('**/api/v1/seeker/overview');
    let failed = true;
    await page.route('**/api/v1/seeker/overview', async route => {
      expect(route.request().headers().authorization).toBe('Bearer seeker.qa.token');
      if (failed) {
        failed = false;
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ error: { code: 'SERVICE_UNAVAILABLE', messageKey: 'errors.serviceUnavailable', details: [], requestId: 'seeker-dashboard-qa-retry' } })
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { requests: 0, viewings: 0, savedProperties: 0, notifications: 0, unreadNotifications: 0 }, ...successMeta('seeker-dashboard-qa-retry-success') })
      });
    });
    await page.goto(localizedPath('/seeker', locale), { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.seeker-dashboard__state[data-state="error"]')).toBeVisible();
    await page.locator('.seeker-dashboard__state button').click();
    await expect(page.locator('[data-state="empty"]')).toBeVisible();
  });

  for (const routeCase of completedRoutes) {
    test(`fails closed for ${routeCase.path} when the session is denied`, async ({ page }) => {
      const locale = localeForProject();
      await page.unroute('**/api/v1/auth/refresh');
      await routeSession(page, false);
      await page.goto(localizedPath(routeCase.path, locale), { waitUntil: 'domcontentloaded' });
      await expect(page.locator('[data-access="authentication-required"]')).toBeVisible();
      await expect(page.locator('[data-screen-id]')).toHaveCount(0);
    });
  }
});
