import { expect, test } from '@playwright/test';
import { adminPropertyId, adminPropertyReportId, localeForAdminProperties, routeAdminPropertyApis } from './admin-properties.fixtures.ts';

test('property management routes expose landmarks, labels, focus, and direction', async ({ page }) => {
  test.skip(!test.info().project.name.includes('desktop'), 'Admin dashboard is approved for desktop only.');
  await routeAdminPropertyApis(page);
  const locale = localeForAdminProperties(test.info().project.name);

  for (const route of [
    `/admin/properties?lang=${encodeURIComponent(locale)}`,
    `/admin/properties/review?propertyId=${adminPropertyId}&lang=${encodeURIComponent(locale)}`,
    `/admin/properties/possible-duplicates?propertyId=${adminPropertyId}&lang=${encodeURIComponent(locale)}`,
    `/admin/property-reports?reportId=${adminPropertyReportId}&lang=${encodeURIComponent(locale)}`
  ]) {
    await page.goto(route);
    await expect(page.locator('main#main-content')).toBeVisible();
    await expect(page.locator('.admin-dashboard__navigation[aria-label]')).toBeVisible();
    await expect(page.locator('[data-screen-id]').first()).toHaveAttribute('data-device-scope', 'desktop');
    await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();
  }
});
