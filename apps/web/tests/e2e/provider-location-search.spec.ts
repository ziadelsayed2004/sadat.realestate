import { expect, test } from '@playwright/test';

test('finds regions despite spelling differences, restores the catalog and saves the selected registered ID', async ({ page }, info) => {
  const ar = info.project.name.endsWith('-ar');
  const locale = ar ? 'ar' : 'en';
  const providerId = 'a'.repeat(24), propertyId = 'b'.repeat(24);
  const firstId = '6700000000000000000000d0', seventhId = '6700000000000000000000d2';
  const locations = [
    { id: firstId, kind: 'neighborhood', name: { ar: 'الحي الأول', en: 'First District' }, slug: 'first-district', order: 1 },
    { id: seventhId, kind: 'neighborhood', name: { ar: 'الحي السابع', en: 'Seventh District' }, slug: 'seventh-district', order: 2 }
  ];
  const envelope = (data: unknown) => ({ data, meta: { requestId: 'location-search-e2e' } });
  const property = {
    id: propertyId, kind: 'property', name: { ar: 'عقار تجريبي', en: 'Test property' }, slug: 'test-property', transactionType: 'sale',
    source: { providerId, sourceType: 'individual_broker' }, locationId: firstId, status: 'draft', active: true, version: 3,
    createdAt: '2026-08-18T08:00:00.000Z', updatedAt: '2026-08-18T09:00:00.000Z', availableActions: ['update', 'submit']
  };
  await page.route('**/api/v1/auth/refresh', route => route.fulfill({ json: envelope({ accessToken: 'provider.locations.test', tokenType: 'Bearer', expiresInSeconds: 900, user: { id: providerId, roleType: 'provider', status: 'verified' } }) }));
  await page.route(`**/api/v1/provider/properties/${propertyId}`, route => route.fulfill({ json: envelope(property) }));
  await page.route('**/api/v1/public/properties**', route => route.fulfill({ json: envelope({ items: [], categories: [], propertyTypes: [], locations, page: 1, limit: 1, total: 0 }) }));
  await page.route(`**/api/v1/provider/properties/${propertyId}/steps/location`, async route => {
    expect(route.request().method()).toBe('PATCH');
    expect(route.request().headers().authorization).toBe('Bearer provider.locations.test');
    expect(route.request().postDataJSON()).toMatchObject({ version: 3, locationId: seventhId });
    await route.fulfill({ json: envelope({ ...property, locationId: seventhId, version: 4 }) });
  });
  await page.goto(`/provider/properties/${propertyId}/location?lang=${locale}`);
  const search = page.getByRole('searchbox', { name: ar ? 'البحث عن المنطقة' : 'Search locations' });
  const picker = page.getByRole('combobox', { name: ar ? 'المنطقة أو الحي' : 'Area or district' });
  await expect(picker).toBeEnabled();
  await search.fill('السباعه');
  await expect(picker.getByRole('option', { name: ar ? 'الحي السابع' : 'Seventh District' })).toHaveCount(1);
  await expect(picker).toHaveValue(firstId);
  await search.fill('منطقة غير مسجلة');
  await expect(page.getByText(ar ? 'لا توجد مناطق تطابق البحث. امسح البحث لعرض كل المناطق المتاحة.' : 'No areas match your search. Clear the search to see all available areas.')).toBeVisible();
  await expect(picker).toHaveValue(firstId);
  await page.getByRole('button', { name: ar ? 'مسح البحث وعرض كل المناطق' : 'Clear search and show all areas' }).click();
  await expect(search).toHaveValue('');
  await expect(picker.getByRole('option')).toHaveCount(3);
  await picker.selectOption(seventhId);
  await page.getByRole('button', { name: ar ? 'حفظ المسودة' : 'Save draft', exact: true }).click();
  await expect(page.locator('.provider-property-wizard__form-message--success')).toBeVisible();
  await expect(picker).toHaveValue(seventhId);
  await page.screenshot({ path: info.outputPath('regions-selected.png'), fullPage: true });
});
