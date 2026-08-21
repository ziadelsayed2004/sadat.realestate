import { expect, test } from '@playwright/test';
import { adminPropertyCandidateId, adminPropertyId, adminPropertyReportId, localeForAdminProperties, routeAdminPropertyApis } from './admin-properties.fixtures.ts';

test.describe('ADM-14 through ADM-17 property management', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'design-source', description: 'ADM-14..ADM-17 local final exports with approved desktop scope; Figma page 6017:4356 and Drive folders recorded in completion evidence.' });
    test.skip(!testInfo.project.name.includes('desktop'), 'Admin dashboard is approved for desktop only.');
    await routeAdminPropertyApis(page);
  });

  test('renders list, review, duplicate, and report flows with safe server projections', async ({ page }) => {
    const locale = localeForAdminProperties(test.info().project.name);
    await page.goto(`/admin/properties?lang=${encodeURIComponent(locale)}`);
    await expect(page.locator('[data-screen-id="ADM-14"]')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
    await expect(page.locator('.route-shell--admin')).toHaveAttribute('data-device-scope', 'desktop');
    await expect(page.getByTestId(`admin-property-${adminPropertyId}`)).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/reviewedBy|reporterId|internalNotes|assignedTo|auditData|storageKey|accessToken|refreshToken|privateUrl/u);

    await page.locator(`a[href^="/admin/properties/review?propertyId=${adminPropertyId}"]`).click();
    await expect(page.locator('[data-screen-id="ADM-15"]').first()).toBeVisible();
    await page.locator('#admin-property-reason').fill('Approved after evidence review');
    await page.locator('.admin-properties__action-card button[type="submit"]').click();
    await expect(page.locator('.admin-properties__feedback[role="status"]')).toBeVisible();

    await page.goto(`/admin/properties/possible-duplicates?propertyId=${adminPropertyId}&lang=${encodeURIComponent(locale)}`);
    await expect(page.locator('[data-screen-id="ADM-16"]').first()).toBeVisible();
    await expect(page.getByText(adminPropertyCandidateId)).toBeVisible();
    await expect(page.getByText('The slug and transaction location match.')).toBeVisible();

    await page.goto(`/admin/property-reports?reportId=${adminPropertyReportId}&lang=${encodeURIComponent(locale)}`);
    await expect(page.locator('[data-screen-id="ADM-17"]').first()).toBeVisible();
    await expect(page.getByText('The listing appears to duplicate another property.')).toBeVisible();
    await page.locator('#admin-property-report-reason').fill('Reviewed duplicate evidence');
    await page.locator('.admin-properties__action-card button[type="submit"]').click();
    await expect(page.locator('.admin-properties__feedback[role="status"]')).toBeVisible();
  });

  test('fails closed when the administrator session cannot refresh', async ({ page }) => {
    await routeAdminPropertyApis(page, false);
    await page.goto('/admin/properties?lang=en');
    await expect(page.locator('[data-state="permission"]')).toBeVisible();
  });
});
