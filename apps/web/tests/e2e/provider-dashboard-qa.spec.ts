import { expect, test } from '@playwright/test';

const providerId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const propertyId = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const adRequestId = 'cccccccccccccccccccccccc';

type QaLocale = 'ar' | 'en' | 'zh-CN';

function localeForProject(): QaLocale {
  const project = test.info().project.name;
  if (project.endsWith('-zh')) return 'zh-CN';
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
    testInfo.annotations.push({ type: 'design-source', description: 'Provider QA covers PRV-01 through PRV-22-3 using the approved local provider exports and Figma prototype node 6017:19032 recorded in DESIGN_SOURCE_MANIFEST.json.' });
    test.skip(!testInfo.project.name.startsWith('desktop-'), 'Provider Dashboard is approved for desktop only.');
    await routeSession(page);
    await routeProviderApis(page);
  });

  for (const routeCase of providerRoutes) {
    test(`covers the ${routeCase.label} route, locale direction, desktop scope, keyboard landmarks, and safe projection`, async ({ page }) => {
      const locale = localeForProject();
      const response = await page.goto(localizedPath(routeCase.path, locale), { waitUntil: 'domcontentloaded' });
      expect(response?.status(), routeCase.label).toBe(200);
      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
      await expect(page.locator('.route-shell--provider'), routeCase.label).toHaveAttribute('data-device-scope', 'desktop');
      await expect(page.locator('#main-content'), routeCase.label).toBeVisible();
      await expect(page.locator('.provider-dashboard__navigation'), routeCase.label).toHaveAttribute('aria-label', /.+/u);
      await expect(page.locator('[data-screen-id]'), routeCase.label).toHaveCount(1);
      await expect(page.locator('[data-screen-id][data-device-scope="desktop"]'), routeCase.label).toHaveCount(1);
      await expect(page.locator('body')).not.toContainText(/internalNotes|assignedTo|auditData|providerId|storageKey|accessToken|refreshToken|password|secret/u);

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
});
