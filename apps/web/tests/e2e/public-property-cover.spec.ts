import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { publicPropertyCoverUrl } from '../../../api/src/modules/media/public-cover.js';

const propertyId = '6ac64eab4e6c35af7826580b';
const mediaId = '6ac6df9fb843f3ff7b26bc7d';
const name = { ar: 'شقة في الزيتون', en: 'Apartment in Zaton' };
const bytes = readFileSync(new URL('../../public/assets/canonical/public/property-home.png', import.meta.url));
const envelope = (data: unknown) => ({ data, meta: { requestId: 'public-cover-browser' } });

test('loads the uploaded property cover on the listing card and retains it in list mode', async ({ page }, info) => {
  const ar = !info.project.name.endsWith('-en');
  const imageUrl = publicPropertyCoverUrl(propertyId, [{ id: mediaId, kind: 'image', active: true, processingState: 'ready', isCover: true, sortOrder: 0 }]);
  await page.route('**/api/v1/auth/refresh', route => route.fulfill({ status: 401, json: { error: { code: 'AUTHENTICATION_REQUIRED', messageKey: 'errors.authenticationRequired' } } }));
  await page.route('**/api/v1/public/bootstrap', route => route.fulfill({ json: envelope({ defaultLocale: 'ar', supportedLocales: ['ar', 'en'], directions: { ar: 'rtl', en: 'ltr' }, display: {}, contact: {} }) }));
  await page.route('**/api/v1/public/properties?**', route => route.fulfill({ json: envelope({ items: [{ id: propertyId, slug: 'zaton', kind: 'property', name, transactionType: 'sale', imageUrl, price: { amount: 3333222, currency: 'EGP' } }], categories: [], propertyTypes: [], page: 1, limit: 20, total: 1 }) }));
  await page.route(`**${imageUrl}`, route => route.fulfill({ contentType: 'image/png', body: bytes }));
  await page.goto(`/properties?lang=${ar ? 'ar' : 'en'}`);
  const card = page.locator('.public-property-listing__card');
  const cover = card.getByRole('img', { name: ar ? name.ar : name.en, exact: true });
  await expect(cover).toBeVisible();
  await expect(cover).toHaveAttribute('src', imageUrl!);
  await expect.poll(() => cover.evaluate(node => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await card.screenshot({ path: info.outputPath('uploaded-cover-card.png') });
  await page.getByRole('button', { name: ar ? 'عرض قائمة' : 'List view', exact: true }).click();
  await expect(cover).toBeVisible();
  await expect.poll(() => cover.evaluate(node => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
});
