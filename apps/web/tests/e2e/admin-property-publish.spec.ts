import { expect, test } from '@playwright/test';
import { adminPropertyFixture, routeAdminPropertyApis } from './admin-properties.fixtures.ts';

test('publication updates the status and exposes its public destination without reloading', async ({ page }, info) => {
  const ar = !info.project.name.endsWith('-en');
  await routeAdminPropertyApis(page);
  let property = { ...adminPropertyFixture(), status: 'approved', active: false, availableActions: ['publish'] };
  const writes: { action: string; version: number }[] = [];
  await page.route(`**/api/v1/admin/properties/${property.id}**`, async route => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON(); writes.push(body);
      expect(body.version).toBe(property.version);
      property = { ...property, version: property.version + 1, status: body.action === 'publish' ? 'published' : 'hidden', active: body.action === 'publish', availableActions: body.action === 'publish' ? ['hide'] : ['restore'] };
    }
    await route.fulfill({ json: { data: property, meta: { requestId: 'publication-test' } } });
  });
  await page.goto(`/admin/properties/review?propertyId=${property.id}&lang=${ar ? 'ar' : 'en'}`);
  const destination = page.getByRole('link', { name: ar ? 'فتح العقار المنشور' : 'View published property', exact: true });
  await expect(page.locator('#admin-property-action')).toHaveValue('publish');
  await expect(destination).toHaveCount(0);
  await page.locator('#admin-property-reason').fill('Publish the reviewed property');
  await page.locator('.admin-properties__action-card button[type=submit]').click();
  await expect(page.locator('[data-status=published]')).toBeVisible();
  await expect(destination).toHaveAttribute('href', `/properties/${property.slug}?lang=${ar ? 'ar' : 'en'}`);
  await destination.scrollIntoViewIfNeeded();
  await expect(destination).toBeInViewport();
  await page.locator('.admin-properties__review').screenshot({ path: info.outputPath('published-property-link.png') });
  await expect(page.locator('#admin-property-action')).toHaveValue('hide');
  await page.locator('.admin-properties__action-card button[type=submit]').click();
  await expect(page.locator('[data-status=hidden]')).toBeVisible();
  await expect(destination).toHaveCount(0);
  expect(writes.map(({ action, version }) => [action, version])).toEqual([['publish', 3], ['hide', 4]]);
});
