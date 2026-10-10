import { expect, test } from '@playwright/test';
import { adminPropertyFixture, adminPropertyId, routeAdminPropertyApis } from './admin-properties.fixtures.ts';

test('published property exposes an authenticated thumbnail, edit link, public link and versioned archive', async ({ page }, info) => {
  const ar = info.project.name.endsWith('-ar'), locale = ar ? 'ar' : 'en';
  const mediaId = 'c'.repeat(24);
  let property = { ...adminPropertyFixture(), status: 'published', availableActions: ['hide', 'archive', 'update'], imageUrl: `/api/v1/public/properties/${adminPropertyId}/media/${mediaId}/content` };
  await routeAdminPropertyApis(page);
  await page.route('**/api/v1/admin/properties**', async route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    expect(request.headers().authorization).toBe('Bearer admin.properties.qa');
    if (path.endsWith('/content')) { await route.fulfill({ contentType: 'image/png', path: './apps/web/public/assets/clone/pub08-g.png' }); return; }
    if (path.endsWith('/media')) { await route.fulfill({ json: { data: { items: [] }, meta: { requestId: 'media-list' } } }); return; }
    if (request.method() === 'POST') {
      expect(request.postDataJSON()).toEqual({ version: 3, action: 'archive', reason: 'Remove displayed property' });
      property = { ...property, status: 'archived', active: false, version: 4, availableActions: [] };
    }
    await route.fulfill({ json: { data: path.endsWith(adminPropertyId) || request.method() === 'POST' ? property : { items: [property] }, meta: { requestId: 'property-actions', page: 1, limit: 20, total: 1 } } });
  });
  await page.goto(`/admin/properties/review?lang=${locale}`);
  const row = page.getByTestId(`admin-property-${adminPropertyId}`);
  await expect(row.locator('img')).toBeVisible();
  await expect(row.locator('img')).toHaveAttribute('src', /^blob:/);
  await expect(row.getByRole('link', { name: ar ? 'عرض في الموقع' : 'View on website' })).toHaveAttribute('href', `/properties/nile-villa?lang=${locale}`);
  await row.scrollIntoViewIfNeeded();
  await expect(row.locator('.admin-properties__badge')).toBeInViewport();
  await expect(row.getByRole('link', { name: ar ? 'تعديل العقار والصور' : 'Edit property and photos' })).toBeInViewport();
  await expect(row.getByRole('link', { name: ar ? 'حذف من العرض (أرشفة)' : 'Remove from display (archive)' })).toBeInViewport();
  await page.screenshot({ path: info.outputPath('property-actions.png'), fullPage: true });
  await row.getByRole('link', { name: ar ? 'تعديل العقار والصور' : 'Edit property and photos' }).click();
  await expect(page.locator('#admin-property-editor')).toBeVisible();
  await page.goto(`/admin/properties/review?lang=${locale}`);
  await page.getByTestId(`admin-property-${adminPropertyId}`).getByRole('link', { name: ar ? 'حذف من العرض (أرشفة)' : 'Remove from display (archive)' }).click();
  await expect(page.locator('#admin-property-action')).toHaveValue('archive');
  await page.locator('#admin-property-reason').fill('Remove displayed property');
  await page.locator('#admin-property-actions button[type="submit"]').click();
  await expect(page.locator('.admin-properties__feedback')).toBeVisible();
  await expect(page.locator('#admin-property-editor')).toHaveCount(0);
  await expect(page.locator('.admin-properties__detail-card').first()).not.toContainText(ar ? 'تم نشر العقار' : 'Property published');
});
