import { expect, test } from '@playwright/test';
import { publicHomepageFixture, publicPropertyListFixture, routePublicHomepageApi } from './public-fixtures.ts';
import { adminPropertyFixture, adminPropertyId, routeAdminPropertyApis } from './admin-properties.fixtures.ts';

for (const square of [false, true]) test(`company logos stay circular and readable with ${square ? 'square' : 'wide'} artwork`, async ({ page }, info) => {
  const lang = info.project.name.endsWith('-en') ? 'en' : 'ar';
  await routePublicHomepageApi(page);
  const logo = `/api/v1/public/organization-photos/${'8'.repeat(24)}`;
  await page.route(`**${logo}`, route => route.fulfill({ contentType: 'image/svg+xml', body: square
    ? '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><rect width="300" height="300" fill="#f1e6c9"/><text x="150" y="170" text-anchor="middle" font-size="56" fill="#145649">LOGO</text></svg>'
    : '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="80" viewBox="0 0 300 80"><rect width="300" height="80" fill="white"/><path fill="#145649" d="M0 0h30v80H0zM270 0h30v80h-30z"/><text x="150" y="57" text-anchor="middle" font-size="56" fill="#145649">LOGO</text></svg>' }));
  const home = publicHomepageFixture();
  home.data.properties = home.data.properties.map(item => ({ ...item, sourceImageUrl: logo, sourceName: { ar: 'اسم الشركة', en: 'Company identity' } }));
  const listing = publicPropertyListFixture();
  listing.data.items = listing.data.items.map(item => ({ ...item, sourceImageUrl: logo, sourceName: { ar: 'اسم الشركة', en: 'Company identity' } }));
  await page.route('**/api/v1/public/home', route => route.fulfill({ json: home }));
  await page.route('**/api/v1/public/properties?**', route => route.fulfill({ json: listing }));
  for (const [url, selector, minimum] of [
    [`/?lang=${lang}`, '.public-homepage__source-logo > img', 52],
    [`/properties?lang=${lang}`, '.public-property-listing__source-identity > img', 44]
  ] as const) {
    await page.goto(url);
    const image = page.locator(selector).first();
    await image.scrollIntoViewIfNeeded();
    await expect(image).toHaveAttribute('src', logo);
    await expect(image).toHaveCSS('object-fit', 'contain');
    await expect(image).toHaveCSS('padding', '0px');
    await expect(image).toHaveCSS('border-radius', '50%');
    await expect.poll(() => image.evaluate(element => (element as HTMLImageElement).naturalWidth)).toBe(300);
    expect((await image.boundingBox())!.width).toBeGreaterThanOrEqual(minimum - 2);
    await image.locator('..').screenshot({ path: info.outputPath(`company-logo-${minimum}.png`) });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test('admin can change the category of a published property without changing its publication state', async ({ page }, info) => {
  const lang = info.project.name.endsWith('-en') ? 'en' : 'ar';
  await routeAdminPropertyApis(page);
  const categoryId = '1'.repeat(24), typeId = '2'.repeat(24);
  let current = { ...adminPropertyFixture(), status: 'published', availableActions: ['update'], propertyTypeId: '3'.repeat(24) };
  let saved = false;
  await page.route('**/api/v1/public/properties?**', route => route.fulfill({ json: { data: { items: [], categories: [{ id: categoryId, name: { en: 'Commercial', ar: 'تجاري' }, slug: 'commercial', order: 0, propertyCount: 0 }], propertyTypes: [{ id: typeId, categoryId, name: { en: 'Shop', ar: 'محل' }, slug: 'shop', order: 0, propertyCount: 0 }], total: 0, page: 1, limit: 1 }, meta: { requestId: 'taxonomy' } } }));
  await page.route('**/api/v1/admin/properties**', async route => {
    if (new URL(route.request().url()).pathname.endsWith('/media')) return route.fulfill({ json: { data: { items: [] }, meta: { requestId: 'media' } } });
    if (route.request().method() === 'PATCH') {
      expect(route.request().postDataJSON()).toEqual({ version: 3, propertyTypeId: typeId, reason: 'Administrative property edit' });
      current = { ...current, propertyTypeId: typeId, version: 4 };
      saved = true;
    }
    return route.fulfill({ json: { data: current, meta: { requestId: 'admin-property' } } });
  });
  await page.goto(`/admin/properties/review?propertyId=${adminPropertyId}&lang=${lang}`);
  const editor = page.locator('#admin-property-editor');
  const category = editor.getByRole('combobox', { name: lang === 'ar' ? 'تصنيف العقار' : 'Property category', exact: true });
  await expect(category).toBeEnabled();
  await category.selectOption(categoryId);
  await editor.getByRole('combobox', { name: lang === 'ar' ? 'نوع العقار' : 'Property type', exact: true }).selectOption(typeId);
  await editor.getByRole('button', { name: lang === 'ar' ? 'حفظ التعديلات' : 'Save changes', exact: true }).click();
  await expect.poll(() => saved).toBe(true);
  await expect(editor.getByRole('status')).toContainText(lang === 'ar' ? 'تم حفظ' : 'Changes saved');
  expect(current.status).toBe('published');
  await page.reload();
  await expect(editor.getByRole('combobox', { name: lang === 'ar' ? 'نوع العقار' : 'Property type', exact: true })).toHaveValue(typeId);
});
