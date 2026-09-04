import { expect, test } from '@playwright/test';

const seekerId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const requestId = '4123456789abcdef01234567';

function localeForProject(): 'ar' | 'en' {
  return test.info().project.name.endsWith('-en') ? 'en' : 'ar';
}

function meta(requestIdValue: string) {
  return { meta: { requestId: requestIdValue } };
}

async function routeSession(page: import('@playwright/test').Page): Promise<void> {
  await page.route('**/api/v1/auth/refresh', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          accessToken: 'seeker.responsive.token',
          tokenType: 'Bearer',
          expiresInSeconds: 900,
          user: { id: seekerId, roleType: 'seeker', status: 'verified' }
        },
        ...meta('seeker-responsive-refresh')
      })
    });
  });
}

async function routeSeekerApis(page: import('@playwright/test').Page): Promise<void> {
  await page.route('**/api/v1/seeker/overview', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { requests: 1, viewings: 1, savedProperties: 1, notifications: 1, unreadNotifications: 1 }, ...meta('seeker-responsive-overview') }) });
  });
  await page.route('**/api/v1/seeker/requests**', async route => {
    const detail = new URL(route.request().url()).pathname.endsWith(`/${requestId}`);
    const data = detail
      ? { id: requestId, type: 'contact', source: 'seeker', propertyId: 'bbbbbbbbbbbbbbbbbbbbbbbb', status: 'under_review', payload: { message: 'Responsive test request' }, version: 0, availableActions: [], createdAt: '2026-08-18T10:00:00.000Z', updatedAt: '2026-08-18T10:00:00.000Z' }
      : { items: [], page: 1, limit: 20, total: 0 };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data, ...meta('seeker-responsive-requests') }) });
  });
  await page.route('**/api/v1/seeker/viewings**', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { items: [], page: 1, limit: 20, total: 0 }, ...meta('seeker-responsive-viewings') }) });
  });
  await page.route('**/api/v1/seeker/favorites**', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { items: [], page: 1, limit: 20, total: 0 }, ...meta('seeker-responsive-favorites') }) });
  });
  await page.route('**/api/v1/seeker/notifications**', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { items: [], unreadCount: 0, page: 1, limit: 20, total: 0 }, ...meta('seeker-responsive-notifications') }) });
  });
  await page.route('**/api/v1/me**', async route => {
    const preferences = new URL(route.request().url()).pathname.endsWith('/preferences');
    const data = preferences
      ? { preferences: {}, updatedAt: '2026-08-18T10:00:00.000Z' }
      : { id: seekerId, roleType: 'seeker', status: 'verified', email: 'responsive@example.com', firstName: 'Responsive', lastName: 'Seeker', locale: localeForProject() };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data, ...meta('seeker-responsive-me') }) });
  });
}

const seekerRoutes = [
  '/seeker',
  '/seeker/requests',
  `/seeker/requests/${requestId}`,
  '/seeker/viewings',
  '/seeker/saved',
  '/seeker/notifications',
  '/seeker/profile?tab=preferences',
  '/seeker/profile?tab=personal',
  '/seeker/settings'
] as const;

function localizedPath(path: string, locale: 'ar' | 'en'): string {
  return `${path}${path.includes('?') ? '&' : '?'}lang=${locale}`;
}

test.describe('Seeker responsive shell', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes('mobile') && !testInfo.project.name.includes('tablet'), 'Responsive shell checks run on mobile and tablet projects.');
    await routeSession(page);
    await routeSeekerApis(page);
  });

  for (const path of seekerRoutes) {
    test(`keeps ${path} inside the viewport with a logical drawer`, async ({ page }) => {
      const locale = localeForProject();
      await page.goto(localizedPath(path, locale), { waitUntil: 'domcontentloaded' });
      await expect(page.locator('.seeker-dashboard')).toBeVisible();
      await expect(page.locator('.seeker-dashboard__nav')).toHaveCount(1);
      await expect(page.locator('.seeker-dashboard__nav-icon .seeker-dashboard__icon')).toHaveCount(7);

      const initial = await page.evaluate(() => ({
        viewport: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        search: document.querySelector<HTMLElement>('.seeker-dashboard__search')?.getBoundingClientRect().toJSON(),
        navTransform: getComputedStyle(document.querySelector<HTMLElement>('.seeker-dashboard__nav') as HTMLElement).transform
      }));
      expect(initial.documentWidth).toBeLessThanOrEqual(initial.viewport + 1);
      expect(initial.search?.left ?? -1).toBeGreaterThanOrEqual(-1);
      expect((initial.search?.right ?? initial.viewport + 1)).toBeLessThanOrEqual(initial.viewport + 1);
      expect(initial.navTransform).not.toBe('none');

      const menu = page.locator('.seeker-dashboard__menu-button');
      await expect(menu).toHaveAttribute('aria-expanded', 'false');
      await menu.click();
      await expect(menu).toHaveAttribute('aria-expanded', 'true');
      await expect(page.locator('.seeker-dashboard__nav')).toHaveClass(/is-open/u);
      await expect(page.locator('.seeker-dashboard__backdrop')).toHaveClass(/is-open/u);
      await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');
      await expect(page.locator('.seeker-dashboard__nav-close')).toBeVisible();
      await page.waitForTimeout(260);

      const openNav = await page.locator('.seeker-dashboard__nav').evaluate(element => {
        const rect = element.getBoundingClientRect();
        return { left: rect.left, right: rect.right, viewport: window.innerWidth };
      });
      if (locale === 'ar') expect(openNav.right).toBeGreaterThanOrEqual(openNav.viewport - 1);
      else expect(openNav.left).toBeLessThanOrEqual(1);

      await page.keyboard.press('Escape');
      await expect(menu).toHaveAttribute('aria-expanded', 'false');
      await expect(page.locator('.seeker-dashboard__nav')).not.toHaveClass(/is-open/u);
      await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
    });
  }
});
