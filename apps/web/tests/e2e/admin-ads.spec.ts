import { expect, test } from '@playwright/test';
import { adminAdsProofId, adminAdsRequestId, expectNoPrivateAdminAdsFields, routeAdminAdsApis } from './admin-ads.fixtures.ts';

function localeForProject(): 'ar' | 'en' {
  const project = test.info().project.name;
  return project.endsWith('-en') ? 'en' : 'ar';
}

const routes = [
  ['/admin/ads/requests', 'ADM-33'],
  ['/admin/ads/payment-proofs/pending', 'ADM-34'],
  ['/admin/ads/payment-proofs/approved', 'ADM-35'],
  ['/admin/ads/calendar', 'ADM-36'],
  ['/admin/ads/payments/pending-review', 'ADM-37'],
  ['/admin/ads/financial-review', 'ADM-38']
] as const;

test.describe('ADM-33 through ADM-38 advertising administration', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'design-source', description: 'ADM-33..ADM-38 checked-in local final exports; shared Figma prototype node 6017:61879; per-screen Drive references in DESIGN_SOURCE_MANIFEST.json' });
    test.skip(!testInfo.project.name.includes('desktop'), 'Admin dashboard is approved for desktop only.');
    await routeAdminAdsApis(page);
  });

  test('renders every approved route with locale direction, desktop scope, and safe projections', async ({ page }) => {
    const locale = localeForProject();
    for (const [path, screenId] of routes) {
      await page.goto(`${path}?lang=${encodeURIComponent(locale)}`, { waitUntil: 'domcontentloaded' });
      await expect(page.locator(`[data-screen-id="${screenId}"]`)).toBeVisible();
      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
      await expect(page.locator('.route-shell--admin')).toHaveAttribute('data-device-scope', 'desktop');
      await expect(page.locator('.admin-ads__tabs[aria-label]')).toBeVisible();
      await expectNoPrivateAdminAdsFields(page);
    }
  });

  test('renders request and financial detail projections without leaking internal fields', async ({ page }) => {
    const locale = localeForProject();
    await page.goto(`/admin/ads/requests?requestId=${adminAdsRequestId}&lang=${encodeURIComponent(locale)}`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-screen-id="ADM-33"]')).toBeVisible();
    await expect(page.locator('.admin-ads__detail')).toBeVisible();
    await expectNoPrivateAdminAdsFields(page);
    await page.goto(`/admin/ads/financial-review?requestId=${adminAdsRequestId}&lang=${encodeURIComponent(locale)}`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-screen-id="ADM-38"]')).toBeVisible();
    await expect(page.locator('.admin-ads__detail')).toBeVisible();
    const nonRealizedPattern = locale === 'ar' ? /\u0645\u062d\u0642\u0642/u :/realized/u;
    await expect(page.locator('.admin-ads__notice')).toContainText(nonRealizedPattern);
    await expectNoPrivateAdminAdsFields(page);
  });

  test('requires a reason and sends the expected proof version for manual review', async ({ page }) => {
    const locale = localeForProject();
    await page.goto(`/admin/ads/payments/pending-review?lang=${encodeURIComponent(locale)}`, { waitUntil: 'domcontentloaded' });
    const row = page.getByTestId(`admin-payment-proof-${adminAdsProofId}`);
    await expect(row).toBeVisible();
    await row.getByRole('button').click();
    await expect(page.locator('.admin-ads__review-card')).toBeVisible();
    await page.locator('#admin-ads-review-reason').fill('Reviewed against the submitted proof');
    await page.locator('.admin-ads__review-card button[type="submit"]').click();
    await expect(page.locator('.admin-ads__feedback[data-tone="success"]')).toBeVisible();
    await expectNoPrivateAdminAdsFields(page);
  });

  test('fails closed when the administrator session cannot refresh', async ({ page }) => {
    await routeAdminAdsApis(page, false);
    await page.goto('/admin/ads/requests?lang=en', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-state="permission"]')).toBeVisible();
  });
});
