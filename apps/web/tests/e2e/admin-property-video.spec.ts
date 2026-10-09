import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { adminPropertyFixture, routeAdminPropertyApis } from './admin-properties.fixtures.ts';

const bytes = readFileSync(new URL('../fixtures/property-tour.mp4', import.meta.url));
test('retries and plays a private property video inside administrative review', async ({ page, browserName }, info) => {
  const ar = !info.project.name.endsWith('-en');
  await routeAdminPropertyApis(page);
  const property = { ...adminPropertyFixture(), availableActions: ['update', 'approve', 'reject'] };
  const media = { id: 'd'.repeat(24), propertyId: property.id, kind: 'video', originalFilename: 'WhatsApp Video 2026-09-16 at 11.16.39 AM.mp4', detectedMime: 'video/mp4', byteSize: bytes.length, sha256: 'f'.repeat(64), sortOrder: 0, isCover: false, processingState: 'ready', active: true, version: 1, createdAt: property.createdAt, updatedAt: property.updatedAt };
  const envelope = (data: unknown) => ({ data, meta: { requestId: 'admin-video-browser' } });
  let attempts = 0;
  await page.route(`**/api/v1/admin/properties/${property.id}`, route => route.fulfill({ json: envelope(property) }));
  await page.route(`**/api/v1/admin/properties/${property.id}/media`, route => route.fulfill({ json: envelope({ items: [media] }) }));
  await page.route(`**/api/v1/admin/properties/${property.id}/media/${media.id}/content`, async route => {
    expect(route.request().headers().authorization).toBe('Bearer admin.properties.qa');
    if (++attempts === 1) { await route.fulfill({ status: 503 }); return; }
    await route.fulfill({ contentType: 'video/mp4', body: bytes });
  });
  const response = await page.goto(`/admin/properties/review?propertyId=${property.id}&lang=${ar ? 'ar' : 'en'}`);
  expect(response?.headers()['content-security-policy']).toMatch(/media-src 'self'[^;]*blob:/);
  const editor = page.locator('.admin-property-editor');
  await expect(editor.getByRole('alert')).toContainText(ar ? 'تعذر تشغيل الفيديو' : 'Video could not play');
  await editor.getByRole('button', { name: ar ? 'إعادة تحميل الفيديو' : 'Reload video' }).click();
  const player = editor.locator('video');
  await expect(player).toBeVisible();
  await expect(player).toHaveAttribute('controls', '');
  await expect(player).toHaveAttribute('src', /^blob:/);
  await expect(player).toHaveAccessibleName(media.originalFilename);
  await expect(editor.getByRole('link', { name: ar ? 'تنزيل الفيديو' : 'Download video' })).toHaveAttribute('download', media.originalFilename);
  if (browserName !== 'webkit') {
    await player.evaluate(async node => { const video = node as HTMLVideoElement; video.muted = true; await video.play(); });
    await expect.poll(() => player.evaluate(node => (node as HTMLVideoElement).currentTime)).toBeGreaterThan(0);
    await player.evaluate(node => (node as HTMLVideoElement).pause());
  }
  expect(attempts).toBe(2);
  await expect(editor.getByRole('button', { name: ar ? 'تعيين كغلاف' : 'Use as cover' })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await player.locator('..').screenshot({ path: info.outputPath('private-video-player.png') });
});
