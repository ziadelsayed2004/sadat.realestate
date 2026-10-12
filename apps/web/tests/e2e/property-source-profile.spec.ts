import { expect, test } from '@playwright/test';
import { publicOrganizationProfileSchema, publicPropertyDetailsSchema } from '@sadat-real-estate/contracts';

const organizationId = 'b'.repeat(24);
const name = { ar: 'مكتب السادات العقاري', en: 'Sadat real estate office' };
const envelope = (data: unknown) => ({ data, meta: { requestId: 'source-profile-browser' } });

test('opens gallery images on mobile and desktop without cropping or horizontal overflow', async ({ page }, info) => {
  const locale = info.project.name.endsWith('-en') ? 'en' : 'ar';
  const imageUrl = '/assets/canonical/public/listing-property-duplex.png';
  const details = publicPropertyDetailsSchema.parse({
    id: 'a'.repeat(24), slug: 'gallery-home', kind: 'property', name: { ar: 'عقار الصور', en: 'Gallery home' }, transactionType: 'sale',
    source: { sourceType: 'individual_broker' }, seo: { title: { en: 'Gallery home' }, slug: 'gallery-home' }, project: null,
    media: [{ id: 'c'.repeat(24), propertyId: 'a'.repeat(24), kind: 'image', imageUrl, originalFilename: 'front.png', detectedMime: 'image/png', byteSize: 10, sortOrder: 0, isCover: true }], features: [], services: [], relatedProperties: []
  });
  await page.route('**/api/v1/public/properties/gallery-home', route => route.fulfill({ json: envelope(details) }));
  await page.goto(`/properties/gallery-home?lang=${locale}`);
  const open = page.getByRole('button', { name: locale === 'ar' ? 'فتح الصورة بالحجم الكامل' : 'Open full image' });
  await open.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const image = dialog.locator('img');
  await expect(image).toHaveAttribute('src', imageUrl);
  await expect.poll(() => image.evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth > 0)).toBe(true);
  expect(await image.evaluate(node => getComputedStyle(node).objectFit)).toBe('contain');
  expect(await dialog.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('full-image-viewer.png') });
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(open).toBeFocused();
  const source = page.locator('.public-property-details__source-card');
  await source.scrollIntoViewIfNeeded();
  await source.screenshot({ path: info.outputPath('individual-source-card.png') });
  await expect(source.getByRole('link')).toHaveCount(0);
});

for (const kind of ['brokerage_office', 'developer_company'] as const) {
  test(`opens the ${kind} source profile by slug and preserves the language`, async ({ page }, info) => {
    const locale = info.project.name.endsWith('-en') ? 'en' : 'ar';
    const slug = `sadat-${kind.replace('_', '-')}`;
    const details = publicPropertyDetailsSchema.parse({
      id: 'a'.repeat(24), slug: 'office-home', kind: 'property', name: { ar: 'عقار المكتب', en: 'Office property' }, transactionType: 'sale',
      source: { sourceType: kind, organizationId, organizationSlug: slug, name, verified: true },
      seo: { title: { en: 'Office property' }, slug: 'office-home' }, project: null, media: [], features: [], services: [], relatedProperties: []
    });
    const profile = publicOrganizationProfileSchema.parse({
      id: organizationId, kind, slug, name, verified: true, projectCount: 0, propertyCount: 0, projects: [], properties: [],
      stats: { publishedProjects: 0, availableProperties: 0, saleProperties: 0, rentalProperties: 0 }
    });
    await page.route('**/api/v1/auth/refresh', route => route.fulfill({ status: 401, json: { error: { code: 'AUTHENTICATION_REQUIRED', messageKey: 'errors.authenticationRequired' } } }));
    await page.route('**/api/v1/public/properties/office-home', route => route.fulfill({ json: envelope(details) }));
    await page.route(`**/api/v1/public/developers/${slug}`, route => route.fulfill({ json: envelope(profile) }));
    await page.goto(`/properties/office-home?lang=${locale}`);
    const source = page.locator('.public-property-details__source-card');
    const label = locale === 'ar' ? kind === 'brokerage_office' ? 'عرض ملف المكتب' : 'عرض ملف المطور' : kind === 'brokerage_office' ? 'View office profile' : 'View developer profile';
    const link = source.getByRole('link', { name: label });
    await expect(link).toHaveAttribute('href', `/developers/${slug}?lang=${locale}`);
    await source.scrollIntoViewIfNeeded();
    await expect(source.getByRole('heading', { name: name[locale] })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    await source.screenshot({ path: info.outputPath('source-card.png') });
    await link.click();
    await expect(page).toHaveURL(new RegExp(`/developers/${slug}\\?lang=${locale}$`));
    await expect(page.getByRole('heading', { name: name[locale], level: 1 })).toBeVisible();
  });
}
