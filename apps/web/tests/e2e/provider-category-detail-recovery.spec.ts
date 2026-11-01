import { expect, test } from '@playwright/test';
import { getProviderPropertyStateCopy } from '../../src/features/provider_property/state-copy.ts';

const providerId = 'a'.repeat(24), propertyId = 'b'.repeat(24), residentialId = '1'.repeat(24), commercialId = '2'.repeat(24), apartmentId = '3'.repeat(24), shopId = '4'.repeat(24);
const property = { id: propertyId, kind: 'property', name: { ar: 'عقار منشور', en: 'Published property' }, slug: 'published-property', transactionType: 'sale', source: { providerId, sourceType: 'individual_broker' }, status: 'published', active: true, version: 2, propertyTypeId: apartmentId, area: { value: 100, unit: 'sqm' }, createdAt: '2026-08-18T08:00:00.000Z', updatedAt: '2026-08-18T09:00:00.000Z', availableActions: ['update'] };

test('opens a published dashboard detail URL and selects its category by name', async ({ page }, info) => {
  const locale = info.project.name.endsWith('-en') ? 'en' : 'ar';
  let savedType: string | undefined;
  await page.route('**/api/v1/**', async route => {
    const url = new URL(route.request().url());
    const reply = (data: unknown) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data, meta: { requestId: 'category-detail-regression' } }) });
    if (url.pathname.endsWith('/auth/refresh')) return reply({ accessToken: 'provider.category.token', tokenType: 'Bearer', expiresInSeconds: 900, user: { id: providerId, roleType: 'provider', status: 'verified' } });
    if (url.pathname.endsWith(`/provider/properties/${propertyId}`)) {
      expect(route.request().headers().authorization).toBe('Bearer provider.category.token');
      return reply(property);
    }
    if (url.pathname.endsWith('/public/properties')) return reply({ items: [], categories: [
      { id: residentialId, slug: 'residential', name: { ar: 'سكني', en: 'Residential' }, propertyCount: 0, order: 0 },
      { id: commercialId, slug: 'commercial', name: { ar: 'تجاري', en: 'Commercial' }, propertyCount: 0, order: 1 }
    ], propertyTypes: [
      { id: apartmentId, categoryId: residentialId, slug: 'apartment', name: { ar: 'شقة', en: 'Apartment' }, propertyCount: 0, order: 0 },
      { id: shopId, categoryId: commercialId, slug: 'shop', name: { ar: 'محل', en: 'Shop' }, propertyCount: 0, order: 1 }
    ], page: 1, limit: 1, total: 0 });
    if (url.pathname.endsWith(`/provider/properties/${propertyId}/steps/details`)) {
      expect(route.request().method()).toBe('PATCH');
      savedType = (route.request().postDataJSON() as { propertyTypeId: string }).propertyTypeId;
      return reply({ ...property, propertyTypeId: savedType, version: 3 });
    }
    return route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ error: { code: 'NOT_FOUND', messageKey: 'errors.notFound', details: [], requestId: 'irrelevant-navigation' } }) });
  });
  await page.goto(`/provider/properties/${propertyId}?lang=${locale}`);
  await expect(page.getByRole('heading', { name: getProviderPropertyStateCopy(locale).statuses.published.title, level: 1 })).toBeVisible();
  await expect(page.getByRole('link', { name: getProviderPropertyStateCopy(locale).actions.viewPublic })).toHaveAttribute('href', `/properties/published-property?lang=${locale}`);
  await page.goto(`/provider/properties/${propertyId}/location?lang=${locale}`);
  await page.getByRole('link', { name: locale === 'ar' ? 'اختيار التصنيف ونوع العقار' : 'Choose property category and type' }).click();
  const category = page.locator('#provider-property-category');
  await expect(category).toHaveValue(residentialId);
  await category.selectOption(commercialId);
  const type = page.locator('#provider-property-type-id');
  await expect(type).toHaveValue('');
  await expect(type.locator(`option[value="${apartmentId}"]`)).toHaveCount(0);
  await type.selectOption(shopId);
  await page.screenshot({ path: info.outputPath('provider-category.png'), fullPage: true });
  await page.locator('button[value="save"]').click();
  await expect.poll(() => savedType).toBe(shopId);
  await expect(page.locator('.provider-property-wizard__form-message--success')).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
