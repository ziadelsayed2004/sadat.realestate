import { expect, test } from '@playwright/test';

function localeForProject(): 'ar' | 'en' {
  return test.info().project.name.endsWith('-en') ? 'en' : 'ar';
}

test.describe('Admin sidebar responsive shell', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/v1/auth/refresh', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            accessToken: 'admin.sidebar.responsive',
            tokenType: 'Bearer',
            expiresInSeconds: 900,
            user: { id: 'aaaaaaaaaaaaaaaaaaaaaaaa', roleType: 'admin', status: 'verified' }
          },
          meta: { requestId: 'admin-sidebar-responsive-refresh' }
        })
      });
    });
    await page.route('**/api/v1/admin/overview**', async route => {
      const url = new URL(route.request().url());
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            range: { from: url.searchParams.get('from'), to: url.searchParams.get('to') },
            metrics: { users: 1, seekers: 1, providers: 1, verifiedProviders: 1, publishedProperties: 1, openRequests: 1, pendingReviews: 1 },
            generatedAt: '2026-08-19T09:00:00.000Z'
          },
          meta: { requestId: 'admin-sidebar-responsive-data' }
        })
      });
    });
  });

  test('keeps the detailed navigation usable without page overflow', async ({ page }) => {
    const locale = localeForProject();
    await page.goto(`/admin?lang=${encodeURIComponent(locale)}`);
    await expect(page.getByTestId('admin-sidebar')).toBeVisible();
    await expect(page.getByTestId('admin-sidebar').locator('a')).toHaveCount(53);
    await expect(page.getByTestId('admin-sidebar').locator('.admin-dashboard__navigation-scroll')).toBeVisible();
    const dimensions = await page.evaluate(() => ({
      viewport: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth
    }));
    expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewport);
    expect(dimensions.bodyWidth).toBeLessThanOrEqual(dimensions.viewport);
  });

  test('keeps the admin logout action visible and functional', async ({ page }) => {
    const locale = localeForProject();
    await page.route('**/api/v1/auth/logout', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { loggedOut: true }, meta: { requestId: 'admin-sidebar-logout' } })
      });
    });
    await page.goto(`/admin?lang=${encodeURIComponent(locale)}`);
    const logout = page.locator('[data-testid="admin-logout-button"]:visible');
    await expect(logout).toHaveCount(1);
    await expect(logout).toBeEnabled();
    await logout.click();
    await expect(page).toHaveURL(new RegExp(`/auth/login\\?lang=${locale}$`, 'u'));
  });
});
