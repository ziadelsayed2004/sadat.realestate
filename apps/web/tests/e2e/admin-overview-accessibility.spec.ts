import { expect, test } from '@playwright/test';

function localeForProject(): 'ar' | 'en' | 'zh-CN' {
  const project = test.info().project.name;
  if (project.endsWith('-zh')) return 'zh-CN';
  if (project.endsWith('-en')) return 'en';
  return 'ar';
}

test.describe('ADM-01 Admin Overview accessibility', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'screen-id', description: 'ADM-01' });
    testInfo.annotations.push({ type: 'design-source', description: 'docs/design_sources/final_screens/admin/ADM-01.png; Figma node 6017:61879' });
    test.skip(!testInfo.project.name.includes('desktop'), 'Admin dashboard is approved for desktop only.');
    await page.route('**/api/v1/auth/refresh', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            accessToken: 'admin.overview.a11y',
            tokenType: 'Bearer',
            expiresInSeconds: 900,
            user: { id: 'aaaaaaaaaaaaaaaaaaaaaaaa', roleType: 'admin', status: 'verified' }
          },
          meta: { requestId: 'admin-overview-a11y-refresh' }
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
          meta: { requestId: 'admin-overview-a11y-data' }
        })
      });
    });
  });

  test('exposes landmarks, labels, focus order, and no sensitive fields', async ({ page }) => {
    const locale = localeForProject();
    await page.goto(`/admin?lang=${encodeURIComponent(locale)}`);
    await expect(page.locator('main#main-content')).toBeVisible();
    await expect(page.locator('.admin-dashboard__navigation')).toHaveAttribute('aria-label', /.+/u);
    await expect(page.locator('.admin-dashboard__metric-section')).toHaveCount(2);
    await expect(page.locator('.admin-dashboard__metric-section .admin-dashboard__metric')).toHaveCount(7);
    await expect(page.locator('.admin-dashboard__navigation a')).toHaveCount(11);
    await expect(page.locator('.admin-dashboard__navigation a[href^="/admin/audit-logs"]')).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/internalNotes|assignedTo|auditData|storageKey|accessToken|refreshToken/u);

    await page.keyboard.press('Tab');
    await expect(page.locator('.a11y-skip-link')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('main#main-content')).toBeFocused();
    await page.locator('.admin-dashboard__navigation a').first().focus();
    await expect(page.locator('.admin-dashboard__navigation a').first()).toBeFocused();
  });
});
