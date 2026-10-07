import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { adminAdsProofFixture, adminAdsProofId, routeAdminAdsApis } from './admin-ads.fixtures.ts';

const image = readFileSync(new URL('../../public/assets/canonical/public/home-hero-sadat-city.png', import.meta.url));
const locale = (project: string) => project.endsWith('-en') ? 'en' : 'ar';

test('shows the private image and offers full-size viewing and download before review', async ({ page }, info) => {
  await routeAdminAdsApis(page);
  await page.route('**/api/v1/admin/payment-proofs?**', route => route.fulfill({ json: { data: { items: [{ ...adminAdsProofFixture(), originalFilename: 'receipt.png', normalizedExtension: '.png', detectedMime: 'image/png', byteSize: image.length }], page: 1, limit: 20, total: 1 }, meta: { requestId: 'image-proof' } } }));
  await page.route('**/api/v1/admin/payment-proofs/*/file', async route => {
    expect(route.request().headers().authorization).toBe('Bearer admin.ads.qa');
    await route.fulfill({ contentType: 'image/png', body: image });
  });
  await page.goto(`/admin/ads/payments/pending-review?proofId=${adminAdsProofId}&lang=${locale(info.project.name)}`);
  const preview = page.getByTestId('admin-payment-proof-preview');
  await expect(preview.locator('img')).toBeVisible();
  await expect.poll(() => preview.locator('img').evaluate(img => (img as HTMLImageElement).naturalWidth)).toBe(1080);
  const links = preview.locator('a');
  await expect(links.first()).toHaveAttribute('href', /^blob:/);
  await expect(links.first()).toHaveAttribute('target', '_blank');
  const download = page.waitForEvent('download');
  await links.last().click();
  expect((await download).suggestedFilename()).toBe('receipt.png');
  await preview.screenshot({ path: info.outputPath('payment-proof-preview.png') });
  expect(await preview.locator('img').evaluate(img => { const r = img.getBoundingClientRect(); const box = img.parentElement!.getBoundingClientRect(); return r.left >= box.left && r.right <= box.right && r.height <= innerHeight * .7 + 1; })).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('shows a missing-file message and retries into a PDF with file actions', async ({ page }, info) => {
  await routeAdminAdsApis(page);
  let missing = true;
  await page.route('**/api/v1/admin/payment-proofs/*/file', route => route.fulfill(missing ? { status: 404, json: {} } : { contentType: 'application/pdf', body: '%PDF-1.7\nreceipt\n%%EOF' }));
  await page.goto(`/admin/ads/payments/pending-review?proofId=${adminAdsProofId}&lang=${locale(info.project.name)}`);
  const preview = page.getByTestId('admin-payment-proof-preview');
  await expect(preview.getByRole('alert')).toContainText(locale(info.project.name) === 'ar' ? 'غير موجود' : 'missing');
  missing = false;
  await preview.getByRole('button').click();
  await expect(preview).toContainText('PDF');
  await expect(preview.locator('a')).toHaveCount(2);
});

test('loads a linked receipt outside the first page and never substitutes an unrelated receipt', async ({ page }, info) => {
  await routeAdminAdsApis(page);
  const id = 'f'.repeat(24);
  await page.route(`**/api/v1/admin/payment-proofs/${id}`, route => route.fulfill({ json: { data: { ...adminAdsProofFixture(), id, originalFilename: 'selected-receipt.pdf' }, meta: { requestId: 'proof-detail' } } }));
  await page.goto(`/admin/ads/payments/pending-review?proofId=${id}&lang=${locale(info.project.name)}`);
  await expect(page.locator('.admin-ads__review-card')).toContainText('selected-receipt.pdf');
  await expect(page.getByTestId('admin-payment-proof-preview').locator('a')).toHaveCount(2);
  await page.route(`**/api/v1/admin/payment-proofs/${id}`, route => route.fulfill({ status: 404, json: {} }));
  await page.reload();
  await expect(page.locator('[data-state="not_found"]')).toBeVisible();
  await expect(page.locator('.admin-ads__review-card')).toHaveCount(0);
});

test('does not request an unscanned file and explains permission failures for clean files', async ({ page }, info) => {
  await routeAdminAdsApis(page);
  await page.route('**/api/v1/admin/payment-proofs?**', route => route.fulfill({ json: { data: { items: [{ ...adminAdsProofFixture(), securityState: 'scan_pending' }], page: 1, limit: 20, total: 1 }, meta: { requestId: 'unscanned-proof' } } }));
  let reads = 0;
  await page.route('**/api/v1/admin/payment-proofs/*/file', route => { reads++; return route.fulfill({ status: 403, json: {} }); });
  await page.goto(`/admin/ads/payments/pending-review?proofId=${adminAdsProofId}&lang=${locale(info.project.name)}`);
  const preview = page.getByTestId('admin-payment-proof-preview');
  await expect(preview.getByRole('alert')).toContainText(locale(info.project.name) === 'ar' ? 'فحصه' : 'scan');
  expect(reads).toBe(0);
  await page.unroute('**/api/v1/admin/payment-proofs?**');
  await page.reload();
  await expect(preview.getByRole('alert')).toContainText(locale(info.project.name) === 'ar' ? 'صلاحية' : 'permissions');
  expect(reads).toBe(1);
});
