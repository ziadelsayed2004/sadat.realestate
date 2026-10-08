import { expect, test } from '@playwright/test';
import { getAdminContentCopy } from '../../src/features/admin_content/copy.ts';

function localeForProject(): 'ar' | 'en' {
  const project = test.info().project.name;
  if (project.endsWith('-en')) return 'en';
  return 'ar';
}

function successMeta(requestId: string) {
  return { meta: { requestId } };
}

async function routeAdminSession(page: import('@playwright/test').Page, role: 'admin' | 'seeker' = 'admin'): Promise<void> {
  await page.route('**/api/v1/auth/refresh', async route => {
    expect(route.request().method()).toBe('POST');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          accessToken: 'admin.overview.e2e',
          tokenType: 'Bearer',
          expiresInSeconds: 900,
          user: { id: 'aaaaaaaaaaaaaaaaaaaaaaaa', roleType: role, status: 'verified' }
        },
        ...successMeta('admin-overview-refresh')
      })
    });
  });
}

async function routeAdminOverview(page: import('@playwright/test').Page): Promise<void> {
  await page.route('**/api/v1/admin/overview**', async route => {
    expect(route.request().method()).toBe('GET');
    expect(route.request().headers().authorization).toBe('Bearer admin.overview.e2e');
    const url = new URL(route.request().url());
    expect(url.searchParams.get('from')).toBeTruthy();
    expect(url.searchParams.get('to')).toBeTruthy();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          range: { from: '2026-07-22T09:00:00.000Z', to: '2026-08-21T09:00:00.000Z' },
          metrics: {
            users: 2847,
            seekers: 2104,
            providers: 318,
            verifiedProviders: 318,
            publishedProperties: 1089,
            openRequests: 28,
            pendingReviews: 23,
            publishedArticles: 4, communityPosts: 5, communityComments: 6, contentReports: 0,
            adRequests: 3, paymentProofs: 2, activeAds: 1, approvedAdPaymentsMinor: 50000
          },
          generatedAt: '2026-08-19T09:00:00.000Z'
        },
        ...successMeta('admin-overview-data')
      })
    });
  });
}

test('dashboard cards show real values and open their destination pages', async ({ page }) => {
  const locale = localeForProject();
  await routeAdminSession(page);
  await routeAdminOverview(page);
  await page.route('**/api/v1/admin/articles**', route => route.fulfill({ json: { data: { items: [] }, meta: { requestId: 'dashboard-articles', page: 1, limit: 20, total: 0 } } }));
  await page.route('**/api/v1/admin/article-categories**', route => route.fulfill({ json: { data: { items: [] }, meta: { requestId: 'dashboard-categories', page: 1, limit: 20, total: 0 } } }));
  await page.goto(`/admin?lang=${locale}`);
  await expect(page.getByTestId('admin-metric-adRequests')).toContainText('3');
  await expect(page.getByTestId('admin-metric-contentReports')).toContainText('0');
  await expect(page.getByTestId('admin-metric-approvedAdPaymentsMinor')).toContainText(new Intl.NumberFormat(locale, { style: 'currency', currency: 'EGP' }).format(500));
  await expect(page.locator('.admin-dashboard__extended [data-state="unavailable"]')).toHaveCount(0);
  for (const [key, path] of Object.entries({ publishedArticles: '/admin/articles', communityPosts: '/admin/community', communityComments: '/admin/community/comments', contentReports: '/admin/community/moderation', adRequests: '/admin/ads/requests', paymentProofs: '/admin/ads/payment-proofs/pending', activeAds: '/admin/ads/calendar', approvedAdPaymentsMinor: '/admin/ads/financial-review' })) {
    await expect(page.getByTestId(`admin-metric-${key}`)).toHaveAttribute('href', `${path}?lang=${locale}`);
  }
  await page.getByTestId('admin-metric-pendingReviews').click();
  await expect(page.locator('#admin-overview-queue-title')).toBeInViewport();
  const articleCard = page.getByTestId('admin-metric-publishedArticles');
  await articleCard.focus();
  await expect(articleCard).toBeFocused();
  await articleCard.press('Enter');
  await expect(page).toHaveURL(new RegExp(`/admin/articles\\?lang=${locale}`));
  await expect(page.getByRole('heading', { name: getAdminContentCopy(locale).articlesTitle, exact: true })).toBeVisible();
  await expect(page.locator('.admin-content [data-state="error"]')).toHaveCount(0);
});

test.describe('ADM-01 Admin Overview', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'screen-id', description: 'ADM-01' });
    testInfo.annotations.push({ type: 'design-source', description: 'docs/design_sources/final_screens/admin/ADM-01.png; Figma node 6017:61879; Drive folder 1s72HBu89r_FpVR9NWqyiN5N9kFfGfZJAa' });
    test.skip(!testInfo.project.name.includes('desktop'), 'Admin dashboard is approved for desktop only.');
    void page;
  });

  test('loads real KPI projections with locale direction and keyboard-safe navigation', async ({ page }) => {
    const locale = localeForProject();
    await routeAdminSession(page);
    await routeAdminOverview(page);
    const response = await page.goto(`/admin?lang=${encodeURIComponent(locale)}`);

    expect(response?.ok()).toBeTruthy();
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
    await expect(page.locator('[data-screen-id="ADM-01"]')).toBeVisible();
    await expect(page.locator('.route-shell--admin')).toHaveAttribute('data-device-scope', 'desktop');
    await expect(page.getByTestId('admin-metric-users')).toContainText('2,847');
    await expect(page.getByTestId('admin-metric-pendingReviews')).toContainText('23');
    await expect(page.locator('.admin-dashboard__navigation a[data-active="true"]')).toHaveAttribute('href', `/admin?lang=${locale}`);
    await expect(page.locator('body')).not.toContainText(/internalNotes|assignedTo|auditData|storageKey|accessToken|refreshToken/u);

    await page.locator('.a11y-skip-link').focus();
    await expect(page.locator('.a11y-skip-link')).toBeFocused();
    await page.locator('.admin-dashboard__navigation a').nth(1).focus();
    await expect(page.locator('.admin-dashboard__navigation a').nth(1)).toBeFocused();

    await page.locator('.a11y-skip-link').evaluate(element => { (element as HTMLElement).style.visibility = 'hidden'; });
    await page.evaluate(() => document.fonts.ready);
    await expect(page).toHaveScreenshot(`admin-overview-${locale}.png`, { fullPage: true });
  });

  test('keeps a non-admin session outside the admin surface', async ({ page }) => {
    const locale = localeForProject();
    await routeAdminSession(page, 'seeker');
    await page.goto(`/admin?lang=${encodeURIComponent(locale)}`);
    await expect(page.locator('[data-access="forbidden"]')).toBeVisible();
    await expect(page.locator('[data-screen-id="ADM-01"]')).toHaveCount(0);
  });
});
