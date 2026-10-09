import { expect, test } from '@playwright/test';
import { adminPropertyFixture, routeAdminPropertyApis } from './admin-properties.fixtures.ts';

test('edits a published property twice and removes a photo while retaining administrative edit access', async ({ page }, info) => {
  const ar = !info.project.name.endsWith('-en');
  await routeAdminPropertyApis(page);
  let property = { ...adminPropertyFixture(), status: 'published', availableActions: ['update', 'hide', 'archive'] };
  const photo = { id: 'd'.repeat(24), propertyId: property.id, kind: 'image', originalFilename: 'property-photo.jpg', detectedMime: 'image/jpeg', byteSize: 6, sha256: 'f'.repeat(64), sortOrder: 0, isCover: true, processingState: 'ready', active: true, version: 1, createdAt: property.createdAt, updatedAt: property.updatedAt };
  let photos = [photo];
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=', 'base64');
  function syncCover() { const cover = photos.find(item => item.isCover) ?? photos[0]; Object.assign(property, { imageUrl: cover ? `/api/v1/public/properties/${property.id}/media/${cover.id}/content` : undefined }); }
  const envelope = (data: unknown) => ({ data, meta: { requestId: 'owner-property-editor' } });
  await page.route('**/api/v1/admin/properties/**', async route => {
    const request = route.request(); const path = new URL(request.url()).pathname;
    if (path.endsWith('/content')) { await route.fulfill({ contentType: 'image/png', body: png }); return; }
    if (path.includes('/media')) {
      if (request.method() === 'DELETE') { photos = photos.filter(item => !path.endsWith(item.id)); syncCover(); await route.fulfill({ json: envelope({ ...photo, active: false, processingState: 'deleted' }) }); }
      else if (request.method() === 'POST') { const added = { ...photo, id: 'e'.repeat(24), isCover: false, originalFilename: 'new.png' }; photos.push(added); syncCover(); await route.fulfill({ status: 201, json: envelope(added) }); }
      else { if (request.method() === 'PATCH') { const body = request.postDataJSON(); photos = photos.map(item => ({ ...item, ...body.items.find((entry: { mediaId: string }) => entry.mediaId === item.id) })); syncCover(); } await route.fulfill({ json: envelope({ items: photos }) }); }
      return;
    }
    if (request.method() === 'PATCH') {
      const input = request.postDataJSON();
      expect(input.version).toBe(property.version);
      expect(input.providerId).toBeUndefined();
      expect(input.status).toBeUndefined();
      property = { ...property, ...input, version: property.version + 1 };
      delete (property as Record<string, unknown>).reason;
    }
    await route.fulfill({ json: envelope(property) });
  });
  await page.goto(`/admin/properties/review?propertyId=${property.id}&lang=${ar ? 'ar' : 'en'}`);
  const editor = page.locator('.admin-property-editor');
  await expect(editor).toBeVisible();
  await editor.getByLabel(ar ? 'سبب التعديل' : 'Edit reason').fill('Correct property details and photos');
  await editor.getByLabel(`${ar ? 'عنوان العقار' : 'Property title'} EN`, { exact: true }).fill('Updated published villa');
  await editor.getByRole('button', { name: ar ? 'حفظ العنوان' : 'Save title', exact: true }).click();
  await expect(editor.getByRole('status')).toBeVisible();
  await editor.getByLabel(`${ar ? 'وصف العقار' : 'Property description'} EN`, { exact: true }).fill('New property description');
  await editor.getByRole('button', { name: ar ? 'حفظ الوصف' : 'Save description', exact: true }).click();
  await expect.poll(() => property.version).toBe(5);
  await editor.locator('input[type=file]').setInputFiles({ name: 'new.png', mimeType: 'image/png', buffer: png });
  await expect(editor.locator('article')).toHaveCount(2);
  await editor.getByRole('button', { name: ar ? 'تعيين كغلاف' : 'Use as cover', exact: true }).click();
  await expect.poll(() => (property as Record<string, unknown>).imageUrl).toContain('/media/' + 'e'.repeat(24));
  await editor.getByRole('button', { name: ar ? 'إزالة' : 'Remove', exact: true }).last().click();
  await expect(editor.locator('article')).toHaveCount(1);
  await expect.poll(() => (property as Record<string, unknown>).imageUrl).toContain('/media/' + photo.id);
  await editor.getByRole('button', { name: ar ? 'إزالة' : 'Remove', exact: true }).click();
  await expect(editor.locator('article')).toHaveCount(0);
  expect((property as Record<string, unknown>).imageUrl).toBeUndefined();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await editor.locator('h2').click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await editor.screenshot({ path: info.outputPath('administrative-property-editor.png') });
});
