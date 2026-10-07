import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { adminAdsProofFixture, adminAdsProofId, adminAdsProviderId, adminAdsRequestId, routeAdminAdsApis } from './admin-ads.fixtures.ts';
import { getAdminAdsCopy } from '../../src/features/admin_ads/copy.ts';

const image = readFileSync(new URL('../../public/assets/canonical/public/home-hero-sadat-city.png', import.meta.url));
const locale = (project: string) => project.endsWith('-en') ? 'en' : 'ar';

for (const action of ['approve', 'reject'] as const) {
  test(`opens payment details from the pending list and saves ${action} for the selected receipt`, async ({ page }, info) => {
    await routeAdminAdsApis(page);
    const lang = locale(info.project.name);
    const copy = getAdminAdsCopy(lang);
    const filename = `receipt_${'1234567890_'.repeat(9)}.png`;
    let status: 'pending_review' | 'approved' | 'rejected' = 'pending_review';
    let posts = 0;
    const receipt = () => ({ ...adminAdsProofFixture(), originalFilename: filename, normalizedExtension: '.png', detectedMime: 'image/png', paymentMethod: 'instapay', byteSize: image.length, status, version: status === 'pending_review' ? 2 : 3 });
    await page.route('**/api/v1/admin/payment-proofs**', async route => {
      expect(route.request().headers().authorization).toBe('Bearer admin.ads.qa');
      const path = new URL(route.request().url()).pathname;
      if (path.endsWith('/file')) return route.fulfill({ contentType: 'image/png', body: image });
      if (path.endsWith('/review')) {
        expect(route.request().method()).toBe('POST');
        expect(path).toBe(`/api/v1/admin/payment-proofs/${adminAdsProofId}/review`);
        expect(route.request().postDataJSON()).toEqual({ action, expectedVersion: 2, reason: 'Checked the selected receipt' });
        posts++;
        status = action === 'approve' ? 'approved' : 'rejected';
        return route.fulfill({ json: { data: receipt(), meta: { requestId: 'pending-review-saved' } } });
      }
      const data = path.endsWith(`/${adminAdsProofId}`) ? receipt() : { items: status === 'pending_review' ? [receipt()] : [], page: 1, limit: 20, total: status === 'pending_review' ? 1 : 0 };
      return route.fulfill({ json: { data, meta: { requestId: 'pending-review-details' } } });
    });
    await page.goto(`/admin/ads/payment-proofs/pending?lang=${lang}`);
    const row = page.getByTestId(`admin-payment-proof-${adminAdsProofId}`);
    const open = row.getByRole('button', { name: copy.viewPaymentReview, exact: true });
    await expect(open).toBeVisible();
    const bounds = await open.boundingBox();
    expect(bounds!.height).toBeGreaterThanOrEqual(44);
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
    if (action === 'approve') await page.screenshot({ path: info.outputPath('pending-payment-list.png') });
    await page.locator('.admin-ads__proof-table').locator('..').evaluate(element => { element.scrollLeft = getComputedStyle(element).direction === 'rtl' ? -element.scrollWidth : element.scrollWidth; });
    const scrolledBounds = await open.boundingBox();
    expect(Math.abs(scrolledBounds!.x - bounds!.x)).toBeLessThan(2);
    await open.click();
    await expect(page).toHaveURL(new RegExp(`/admin/ads/payments/pending-review\\?proofId=${adminAdsProofId}&lang=${lang}$`));
    const panel = page.locator('.admin-ads__review-card');
    await expect(panel.locator('.admin-ads__proof-details')).toContainText(copy.paymentMethodLabels.instapay!);
    await expect(panel.getByRole('link', { name: adminAdsRequestId })).toHaveAttribute('href', `/admin/ads/requests?requestId=${adminAdsRequestId}&lang=${lang}`);
    await expect(panel.getByRole('link', { name: adminAdsProviderId })).toHaveAttribute('href', `/admin/providers/${adminAdsProviderId}?lang=${lang}`);
    await expect(panel.getByTestId('admin-payment-proof-preview').locator('img')).toBeVisible();
    const submit = panel.getByRole('button', { name: copy.reviewAction, exact: true });
    await submit.click();
    expect(posts).toBe(0);
    await panel.getByRole('radio', { name: action === 'approve' ? copy.approve : copy.reject, exact: true }).check();
    await page.locator('#admin-ads-review-reason').fill('Checked the selected receipt');
    if (action === 'approve') await panel.screenshot({ path: info.outputPath('payment-review-details.png') });
    await submit.click();
    await expect(page.getByRole('status').filter({ hasText: copy.reviewSaved })).toBeVisible();
    expect(posts).toBe(1);
    await expect(panel.locator('.admin-ads__proof-details')).toContainText(copy.proofStatus[status]!);
    await expect(panel.getByRole('button', { name: copy.reviewAction, exact: true })).toBeDisabled();
    await expect(page.getByTestId(`admin-payment-proof-${adminAdsProofId}`)).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  });
}

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
