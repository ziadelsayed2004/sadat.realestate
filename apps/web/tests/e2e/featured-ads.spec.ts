import { expect, test } from '@playwright/test';
import { routeAdminHomeApis } from './admin-home.fixtures.ts';

test('creates the complete featured card, previews both sizes and saves fields and image before publication', async ({ page }, info) => {
  const ar = info.project.name.endsWith('-ar'), lang = ar ? 'ar' : 'en';
  const providerId = '1234567890abcdef12345678', propertyId = 'abcdef1234567890abcdef12';
  await routeAdminHomeApis(page);
  await page.route('**/api/v1/admin/banners/featured-options*', route => route.fulfill({ json: { data: { canManage: true, advertisers: [{ id: providerId, name: { ar: 'شركة الاختبار', en: 'Test developer' }, verified: true }], destinations: [{ kind: 'property', id: propertyId, name: { ar: 'عقار منشور', en: 'Published property' }, href: '/properties/published-property' }] }, meta: { requestId: 'featured-options' } } }));
  await page.goto(`/admin/ads/featured?lang=${lang}`);
  await page.getByRole('button', { name: ar ? 'إضافة إعلان مميز' : 'Add featured ad', exact: true }).click();
  const editor = page.getByRole('region', { name: ar ? 'تعديل الإعلان المميز' : 'Featured ad editor' });
  await editor.locator('select').nth(0).selectOption(providerId);
  await editor.getByRole('option', { name: ar ? 'عقار منشور' : 'Published property' }).waitFor({ state: 'attached' });
  await editor.locator('select').nth(1).selectOption(`property:${propertyId}`);
  const fields = editor.locator('.admin-featured__texts');
  const texts = [['عنوان الإعلان', 'Featured property'], ['وصف الإعلان', 'Modern homes with gardens'], ['مساحات تبدأ من 220 م²', 'From 220 sqm'], ['مقدم 10% وتقسيط', '10% deposit and installments'], ['اكتشف العقار', 'Explore property']];
  for (let i = 0; i < texts.length; i++) {
    const inputs = fields.nth(i).locator('input,textarea');
    await inputs.nth(0).fill(texts[i]![0]!); await inputs.nth(1).fill(texts[i]![1]!);
  }
  await editor.locator('input[type="datetime-local"]').nth(0).fill('2030-01-01T10:00');
  await editor.locator('input[type="datetime-local"]').nth(1).fill('2030-02-01T10:00');
  await editor.locator('input[type="file"]').setInputFiles('apps/web/public/assets/canonical/public/listing-property-rental.png');
  await expect(editor.locator('.public-homepage__banner-card')).toContainText(ar ? 'شركة الاختبار' : 'Test developer');
  await page.screenshot({ path: info.outputPath('featured-desktop-preview.png'), fullPage: true });
  await editor.locator('.public-homepage__banner-card').screenshot({ path: info.outputPath('featured-card-desktop.png') });
  await editor.getByRole('button', { name: ar ? 'موبايل' : 'Mobile', exact: true }).click();
  await expect(editor.locator('.admin-featured__preview')).toHaveAttribute('data-size', 'mobile');
  await page.screenshot({ path: info.outputPath('featured-mobile-preview.png'), fullPage: true });
  await editor.locator('.public-homepage__banner-card').screenshot({ path: info.outputPath('featured-card-mobile.png') });
  const writes: Array<{ method: string; body: Record<string, unknown> }> = [];
  page.on('request', request => { if (request.url().includes('/api/v1/admin/banners') && ['POST', 'PATCH'].includes(request.method())) { writes.push({ method: request.method(), body: request.headers()['content-type']?.includes('application/json') ? request.postDataJSON() ?? {} : {} }); } });
  await editor.getByRole('button', { name: ar ? 'حفظ ونشر' : 'Save and publish', exact: true }).click();
  await expect(editor.getByRole('status')).toContainText(ar ? 'نشر' : /published|scheduled/i);
  expect(writes[0]?.body).toMatchObject({ placementKey: 'homepage.featured', title: { ar: texts[0]![0], en: texts[0]![1] }, featured: { advertiserProviderId: providerId, destination: { kind: 'property', id: propertyId } } });
  expect(writes.at(-1)?.body.status).toBe('scheduled');
  expect(writes.findIndex(item => Array.isArray(item.body.mediaIds))).toBeGreaterThan(0);
  expect(writes.at(-1)?.body.expectedVersion).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
