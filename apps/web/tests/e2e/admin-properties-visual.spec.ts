import { expect, test } from '@playwright/test';
import { adminPropertyCandidateId, adminPropertyId, adminPropertyReportId, localeForAdminProperties, routeAdminPropertyApis } from './admin-properties.fixtures.ts';

test('ADM-14 through ADM-17 match the approved desktop visual baseline', async ({ page }) => {
  test.skip(!test.info().project.name.includes('desktop'), 'Admin dashboard is approved for desktop only.');
  await routeAdminPropertyApis(page);
  const locale = localeForAdminProperties(test.info().project.name);
  const routes = [
    ['list', `/admin/properties?lang=${encodeURIComponent(locale)}`, 'ADM-14'],
    ['review', `/admin/properties/review?propertyId=${adminPropertyId}&lang=${encodeURIComponent(locale)}`, 'ADM-15'],
    ['duplicates', `/admin/properties/possible-duplicates?propertyId=${adminPropertyId}&lang=${encodeURIComponent(locale)}`, 'ADM-16'],
    ['reports', `/admin/property-reports?reportId=${adminPropertyReportId}&lang=${encodeURIComponent(locale)}`, 'ADM-17']
  ] as const;
  for (const [name, route, screenId] of routes) {
    await page.goto(route);
    await expect(page.locator(`[data-screen-id="${screenId}"]`).first()).toBeVisible();
    if (name === 'list') await expect(page.getByTestId(`admin-property-${adminPropertyId}`)).toBeVisible();
    if (name === 'review') await expect(page.locator('#admin-property-reason')).toBeVisible();
    if (name === 'duplicates') await expect(page.getByText(adminPropertyCandidateId)).toBeVisible();
    if (name === 'reports') await expect(page.locator('#admin-property-report-reason')).toBeVisible();
    const maxDiffPixels = name === 'list' && locale === 'en' ? 400 : 300;
    await expect(page).toHaveScreenshot(`admin-properties-${locale}-${name}.png`, { fullPage: true, maxDiffPixels });
  }
});
