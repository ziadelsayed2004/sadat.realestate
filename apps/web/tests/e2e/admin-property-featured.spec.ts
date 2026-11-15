import { expect, test } from '@playwright/test';
import { adminPropertyFixture, adminPropertyId, routeAdminPropertyApis } from './admin-properties.fixtures.ts';

test('adds and removes homepage selection using the real admin session and preserves the result after reload', async ({ page }, info) => {
  const ar = info.project.name.endsWith('-ar'), locale = ar ? 'ar' : 'en';
  await routeAdminPropertyApis(page);
  await page.route('**/api/v1/admin/properties**', route => route.fulfill({ json: { data: { items: [] }, meta: { requestId: 'featured-related', page: 1, limit: 20, total: 0 } } }));
  let property = { ...adminPropertyFixture(), status: 'published', active: true, featured: true, availableActions: ['update', 'hide'] };
  const writes: boolean[] = [];
  let renewals = 0, rejected = false;
  await page.route('**/api/v1/auth/refresh', route => route.fulfill({ json: { data: { accessToken: ++renewals === 1 ? 'admin.properties.qa' : 'admin.renewed.qa', tokenType: 'Bearer', expiresInSeconds: 900, user: { id: '9'.repeat(24), roleType: 'admin', status: 'verified' } }, meta: { requestId: 'featured-session' } } }));
  await page.route(`**/api/v1/admin/properties/${adminPropertyId}`, route => route.fulfill({ json: { data: property, meta: { requestId: 'featured-read' } } }));
  await page.route(`**/api/v1/admin/properties/${adminPropertyId}/featured`, route => {
    expect(route.request().method()).toBe('PUT');
    if (!rejected) {
      rejected = true;
      expect(route.request().headers().authorization).toBe('Bearer admin.properties.qa');
      return route.fulfill({ status: 401, json: { error: { code: 'AUTHENTICATION_REQUIRED', messageKey: 'errors.authenticationRequired', details: [], requestId: 'featured-expired' } } });
    }
    expect(route.request().headers().authorization).toBe('Bearer admin.renewed.qa');
    const input = route.request().postDataJSON();
    expect(input).toEqual({ version: property.version, featured: !property.featured, reason: 'Manage homepage featured property' });
    writes.push(input.featured);
    property = { ...property, featured: input.featured, version: property.version + 1 };
    return route.fulfill({ json: { data: property, meta: { requestId: 'featured-save' } } });
  });
  await page.goto(`/admin/properties/review?propertyId=${adminPropertyId}&lang=${locale}`);
  const control = page.locator('#property-homepage-featured');
  for (const selected of [false, true]) {
    await control.getByRole('checkbox').setChecked(selected);
    await control.getByRole('button', { name: ar ? 'حفظ التمييز' : 'Save featured selection' }).click();
    await expect.poll(() => writes.length).toBe(selected ? 2 : 1);
    await expect(control.getByRole('status')).toContainText(selected ? ar ? 'تمت إضافة' : 'Property added' : ar ? 'تم إلغاء' : 'selection removed');
    await page.reload();
    await expect(control.getByRole('checkbox')).toBeChecked({ checked: selected });
  }
  expect(writes).toEqual([false, true]);
});
