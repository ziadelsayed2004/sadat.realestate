import { expect, test } from '@playwright/test';

const providerId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const propertyId = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const adRequestId = 'cccccccccccccccccccccccc';

type QaLocale = 'ar' | 'en';

function localeForProject(): QaLocale {
  const project = test.info().project.name;
  if (project.endsWith('-en')) return 'en';
  return 'ar';
}

function localizedPath(path: string, locale: QaLocale): string {
  return `${path}${path.includes('?') ? '&' : '?'}lang=${encodeURIComponent(locale)}`;
}

function envelope(data: unknown, requestId: string): string {
  return JSON.stringify({ data, meta: { requestId } });
}

const providerRoutes = [
  { path: '/provider', label: 'overview' },
  { path: '/provider/properties', label: 'properties' },
  { path: '/provider/properties/new/basic', label: 'new property' },
  { path: `/provider/properties/${propertyId}/basic`, label: 'property basic' },
  { path: `/provider/properties/${propertyId}/location`, label: 'property location' },
  { path: `/provider/properties/${propertyId}/details`, label: 'property details' },
  { path: `/provider/properties/${propertyId}/price-payment`, label: 'property price' },
  { path: `/provider/properties/${propertyId}/features-services`, label: 'property features' },
  { path: `/provider/properties/${propertyId}/media`, label: 'property media' },
  { path: `/provider/properties/${propertyId}/contact`, label: 'property contact' },
  { path: `/provider/properties/${propertyId}/review`, label: 'property review' },
  { path: `/provider/properties/${propertyId}/submitted`, label: 'property submitted' },
  { path: `/provider/properties/${propertyId}/rejected`, label: 'property rejected' },
  { path: `/provider/properties/${propertyId}/published`, label: 'property published' },
  { path: '/provider/projects', label: 'projects' },
  { path: '/provider/customer-requests', label: 'customer requests' },
  { path: '/provider/viewings', label: 'viewings' },
  { path: '/provider/ads', label: 'advertising' },
  { path: `/provider/ads/${adRequestId}`, label: 'advertising detail' },
  { path: '/provider/commission', label: 'commission' },
  { path: '/provider/notifications', label: 'notifications' },
  { path: '/provider/settings?tab=account', label: 'account settings' },
  { path: '/provider/settings?tab=contact', label: 'contact settings' },
  { path: '/provider/settings?tab=security', label: 'security settings' }
] as const;

async function routeSession(page: import('@playwright/test').Page, allowed = true): Promise<void> {
  await page.route('**/api/v1/auth/refresh', async route => {
    if (!allowed) {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: { code: 'AUTHENTICATION_REQUIRED', messageKey: 'errors.authenticationRequired', details: [], requestId: 'provider-dashboard-qa-denied' } })
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: envelope({ accessToken: 'provider.dashboard.qa', tokenType: 'Bearer', expiresInSeconds: 900, user: { id: providerId, roleType: 'provider', status: 'verified' } }, 'provider-dashboard-qa-refresh')
    });
  });
}

async function routeProviderApis(page: import('@playwright/test').Page, status = 200): Promise<void> {
  await page.route('**/api/v1/provider/**', async route => {
    expect(route.request().headers().authorization).toBe('Bearer provider.dashboard.qa');
    if (status !== 200) {
      await route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify({ error: { code: 'FORBIDDEN', messageKey: 'errors.forbidden', details: [], requestId: 'provider-dashboard-qa-forbidden' } })
      });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: envelope({}, 'provider-dashboard-qa-empty-contract') });
  });
}

test.describe('F4 Provider Dashboard QA', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'design-source', description: 'Provider QA covers PRV-01 through PRV-22-3 using approved local provider exports and the canonical Figma nodes recorded in the Provider Wave 2 ledger: 6017:19032, 6017:19308, 6017:19499, 6017:19679, 6017:19858, 6017:20034, 6017:20229, 6017:20391, 6017:20561, 6017:20737, 6017:21064, 6017:21012, 6017:21123, 6017:20973, 6017:21162, 6017:21368, 6017:21747, 6017:21613, 6017:22088, 6028:10071, 6028:10830, 6028:11337, 6028:11875, 6028:12067; DESIGN_SOURCE_MANIFEST.json.' });
    if (testInfo.project.name.startsWith('tablet-')) await page.setViewportSize({ width: 768, height: 1024 });
    if (testInfo.project.name.startsWith('mobile-')) await page.setViewportSize({ width: 390, height: 844 });
    await routeSession(page);
    await routeProviderApis(page);
  });

  for (const routeCase of providerRoutes) {
    test(`covers the ${routeCase.label} route, locale direction, adaptive viewport, keyboard landmarks, and safe projection`, async ({ page }) => {
      const locale = localeForProject();
      const response = await page.goto(localizedPath(routeCase.path, locale), { waitUntil: 'domcontentloaded' });
      expect(response?.status(), routeCase.label).toBe(200);
      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
      await expect(page.locator('.route-shell--provider'), routeCase.label).toHaveAttribute('data-device-scope', 'desktop');
      await expect(page.locator('#main-content'), routeCase.label).toBeVisible();
      await expect(page.locator('.provider-dashboard__navigation'), routeCase.label).toHaveAttribute('aria-label', /.+/u);
      await expect(page.locator('.provider-dashboard__topbar'), routeCase.label).toBeVisible();
      await expect(page.locator('[data-screen-id]'), routeCase.label).toHaveCount(1);
      await expect(page.locator('[data-screen-id][data-device-scope="desktop"]'), routeCase.label).toHaveCount(1);
      await expect(page.locator('body')).not.toContainText(/internalNotes|assignedTo|auditData|providerId|storageKey|accessToken|refreshToken|password|secret/u);

      const shellGeometry = await page.evaluate(() => ({
        navWidth: document.querySelector('.provider-dashboard__navigation')?.getBoundingClientRect().width ?? 0,
        navScrollWidth: document.querySelector('.provider-dashboard__navigation')?.scrollWidth ?? 0,
        contentWidth: document.querySelector('.provider-dashboard__content')?.getBoundingClientRect().width ?? 0,
        dashboardWidth: document.querySelector('.provider-dashboard')?.getBoundingClientRect().width ?? 0,
        overflowers: Array.from(document.querySelectorAll('body *')).map(element => {
          const rect = element.getBoundingClientRect();
          return { tag: element.tagName, className: element.className, left: rect.left, right: rect.right, width: rect.width };
        }).filter(rect => rect.left < -1 || rect.right > document.documentElement.clientWidth + 1).slice(0, 8),
        scrollables: Array.from(document.querySelectorAll('html, body, body *')).map(element => ({
          tag: element.tagName, className: element.className, clientWidth: element.clientWidth, scrollWidth: element.scrollWidth
        })).filter(item => item.scrollWidth > item.clientWidth + 1).slice(0, 12),
        scrollX: window.scrollX,
        topbarHeight: document.querySelector('.provider-dashboard__topbar')?.getBoundingClientRect().height ?? 0,
        viewportWidth: document.documentElement.clientWidth,
        documentWidth: document.documentElement.scrollWidth
      }));
      const compactNavigation = shellGeometry.viewportWidth <= 900;
      if (!compactNavigation) {
        await expect(page.locator('.provider-dashboard__brand'), routeCase.label).toBeVisible();
        await expect(page.locator('.provider-dashboard__navigation-footer button'), routeCase.label).toBeVisible();
        expect(shellGeometry.navWidth, routeCase.label).toBeCloseTo(240, 0);
      } else {
        await expect(page.locator('.provider-dashboard__navigation-footer'), routeCase.label).toBeHidden();
        expect(shellGeometry.navWidth, routeCase.label).toBeCloseTo(shellGeometry.viewportWidth, 0);
      }
      expect(shellGeometry.topbarHeight, routeCase.label).toBeCloseTo(56, 0);
      expect(shellGeometry.documentWidth, `${routeCase.label}: ${JSON.stringify(shellGeometry)}`).toBeLessThanOrEqual(shellGeometry.viewportWidth);

      const skipLink = page.locator('.a11y-skip-link');
      await skipLink.focus();
      await expect(skipLink).toBeFocused();
      const firstNavigationLink = page.locator('.provider-dashboard__navigation a').first();
      await firstNavigationLink.focus();
      await expect(firstNavigationLink).toBeFocused();
    });
  }

  for (const routeCase of providerRoutes) {
    test(`fails closed for the ${routeCase.label} route when authentication is denied`, async ({ page }) => {
      const locale = localeForProject();
      await page.unroute('**/api/v1/auth/refresh');
      await routeSession(page, false);
      await page.goto(localizedPath(routeCase.path, locale), { waitUntil: 'domcontentloaded' });
      await expect(page.locator('[data-access="authentication-required"]'), routeCase.label).toBeVisible();
      await expect(page.locator('[data-screen-id]'), routeCase.label).toHaveCount(0);
      await expect(page.locator('body')).not.toContainText(/accessToken|refreshToken|internalNotes|assignedTo|auditData|storageKey/u);
    });
  }

  test('renders safe permission states for provider API denial and keeps upload/private boundaries closed', async ({ page }) => {
    const locale = localeForProject();
    await page.unroute('**/api/v1/provider/**');
    await routeProviderApis(page, 403);

    await page.goto(localizedPath(`/provider/properties/${propertyId}/media`, locale), { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-screen-id="PRV-08"]')).toBeVisible();
    await expect(page.locator('[data-screen-id="PRV-08"] [data-state="permission"]').first()).toBeVisible();
    await expect(page.locator('input[type="file"]')).toHaveCount(0);
    await expect(page.locator('body')).not.toContainText(/storageKey|temporaryUrl|privateUrl|providerDocument|paymentProof/u);

    await page.goto(localizedPath('/provider/ads', locale), { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-screen-id="PRV-19"]')).toBeVisible();
    await expect(page.locator('[data-screen-id="PRV-19"] [data-state="permission"]').first()).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/commissionRate|paymentProof|bankVerified|internalNotes|assignedTo/u);
  });

  test('signs out through the canonical provider footer action', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.startsWith('desktop-'), 'The canonical provider footer is intentionally replaced by compact navigation below 900px.');
    const locale = localeForProject();
    await page.route('**/api/v1/auth/logout', route => route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ loggedOut: true }, 'provider-dashboard-qa-logout') }));
    await page.goto(localizedPath('/provider', locale), { waitUntil: 'domcontentloaded' });
    await page.locator('.provider-dashboard__navigation-footer button').click();
    await page.waitForURL(url => url.pathname === '/auth/login' && url.searchParams.get('lang') === locale);
  });
});
