import { expect, test } from '@playwright/test';
import { routeAdminAdsApis, adminAdsRequestId, adminAdsRequestFixture } from './admin-ads.fixtures.ts';
import { getProviderAdvertisingCopy } from '../../src/features/provider/advertising-copy.ts';
import { getAdminAdsCopy } from '../../src/features/admin_ads/copy.ts';

test.use({ timezoneId: 'America/New_York' });
const providerId = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const localeForProject = () => test.info().project.name.endsWith('-en') ? 'en' : 'ar';
const success = (data: unknown) => ({ data, meta: { requestId: 'assisted-ad-test' } });

test('administrator selects the featured homepage card and sends its exact placement with the quote', async ({ page }) => {
  const locale = localeForProject();
  const copy = getAdminAdsCopy(locale);
  await routeAdminAdsApis(page);
  const request = { ...adminAdsRequestFixture(), requestMode: 'assisted', contactPhone: '+201234567890', status: 'waiting_pricing', placementKey: undefined, intervalStart: undefined, intervalEnd: undefined };
  await page.route(`**/api/v1/admin/ad-requests/${adminAdsRequestId}`, route => route.fulfill({ json: success({ request, pricingOptions: { placements: [
    { key: 'homepage.hero', label: { ar: 'بانر الرئيسية', en: 'Homepage banner' } },
    { key: 'homepage.featured', label: { ar: 'كارت الرئيسية المميز', en: 'Featured homepage card' } }
  ], adTypes: [] } }) }));
  let campaign: unknown;
  await page.route(`**/api/v1/admin/ad-requests/${adminAdsRequestId}/quote`, route => {
    campaign = route.request().postDataJSON().campaign;
    return route.fulfill({ status: 503, json: { error: { code: 'SERVICE_UNAVAILABLE', messageKey: 'errors.serviceUnavailable', details: [], requestId: 'featured-quote-test' } } });
  });
  await page.goto(`/admin/ads/requests?lang=${locale}&requestId=${adminAdsRequestId}`);
  const placement = page.locator('#admin-ad-placement');
  await expect(placement.locator('option[value="homepage.featured"]')).toHaveText(locale === 'ar' ? 'كارت الرئيسية المميز' : 'Featured homepage card');
  await placement.selectOption('homepage.featured');
  const form = page.locator('form').filter({ has: placement });
  await expect(form.locator('.ad-placement-guide li[data-selected="true"]')).toContainText(locale === 'ar' ? 'كارت أسفل البانر والبحث' : 'Card below the hero and search');
  await expect(form.locator('a[href*="#homepage-featured"]')).toHaveAttribute('href', `/?lang=${locale}#homepage-featured`);
  await page.locator('#admin-ad-start').fill('2030-11-10T12:00');
  await page.locator('#admin-ad-end').fill('2030-11-20T12:00');
  await page.locator('#admin-ad-quote-amount').fill('1250.50');
  await page.locator('#admin-ad-quote-valid').fill('2030-11-09T12:00');
  await page.locator('#admin-ad-quote-terms').fill('Featured homepage card for ten days');
  await page.getByRole('button', { name: copy.quoteIssue.submit, exact: true }).click();
  await expect(form.getByText(copy.quoteIssue.error)).toBeVisible();
  expect(campaign).toEqual({ placementKey: 'homepage.featured', intervalStart: '2030-11-10T10:00:00.000Z', intervalEnd: '2030-11-20T10:00:00.000Z' });
  await expect(placement).toHaveValue('homepage.featured');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('provider sends a two-field advertising request without technical codes or dates and retains inputs after failure', async ({ page }) => {
  const locale = localeForProject();
  const copy = getProviderAdvertisingCopy(locale);
  await page.route('**/api/v1/auth/refresh', route => route.fulfill({ json: success({ accessToken: 'provider.ad.test', tokenType: 'Bearer', expiresInSeconds: 900, user: { id: providerId, roleType: 'provider', status: 'verified' } }) }));
  await page.route('**/api/v1/provider/application/status', route => route.fulfill({ json: success({ applicationId: providerId, providerType: 'brokerage_office', status: 'approved', version: 1, availableActions: ['open_dashboard'] }) }));
  let failed = false;
  let created = false;
  await page.route('**/api/v1/provider/ads**', async route => {
    const request = { id: adminAdsRequestId, purpose: 'Promote my new property', contactPhone: '+201234567890', requestMode: 'assisted', status: 'review', version: 0, createdAt: '2026-10-07T12:00:00.000Z', updatedAt: '2026-10-07T12:00:00.000Z', history: [], paymentProofs: [] };
    if (route.request().method() === 'POST') {
      expect(route.request().postDataJSON()).toEqual({ requestMode: 'assisted', contactPhone: '+201234567890', purpose: request.purpose });
      if (!failed) { failed = true; await route.fulfill({ status: 503, json: { error: { code: 'SERVICE_UNAVAILABLE', messageKey: 'errors.serviceUnavailable', details: [], requestId: 'test-failure' } } }); return; }
      created = true;
      await route.fulfill({ status: 201, json: success({ ...request, history: undefined, paymentProofs: undefined, providerId }) });
      return;
    }
    await route.fulfill({ json: success({ items: created ? [request] : [], page: 1, limit: 5, total: created ? 1 : 0 }) });
  });
  await page.goto(`/provider/ads?lang=${locale}`);
  await page.locator('.provider-advertising__heading > .ui-button').click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.locator('input')).toHaveCount(1);
  await expect(dialog.locator('textarea')).toHaveCount(1);
  await dialog.getByLabel(copy.createForm.contactPhone).fill('01234567890');
  await dialog.getByLabel(copy.createForm.purpose).fill('Promote my new property');
  await dialog.getByRole('button', { name: copy.createForm.save }).click();
  await expect(dialog.getByRole('alert')).toBeVisible();
  await expect(dialog.getByLabel(copy.createForm.contactPhone)).toHaveValue('01234567890');
  await expect(dialog.getByLabel(copy.createForm.purpose)).toHaveValue('Promote my new property');
  const bounds = await dialog.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
  await dialog.screenshot({ path: test.info().outputPath('assisted-request.png') });
  await dialog.getByRole('button', { name: copy.createForm.save }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('.provider-advertising__feedback')).toContainText(locale === 'ar' ? 'تم إرسال طلب الإعلان بنجاح' : 'Advertising request sent successfully');
  await expect(page.getByTestId('provider-advertising-row')).toContainText('Promote my new property');
});

for (const season of [
  { name: 'summer', date: '2026-10-10', offsetHour: '09', end: '2026-10-10T11:15:00.000Z' },
  { name: 'winter', date: '2027-01-10', offsetHour: '10', end: '2027-01-10T12:15:00.000Z' }
]) {
  test(`admin prices and calculates a ${season.name} Egypt display period and rejects a reversed range`, async ({ page }) => {
    const locale = localeForProject();
    const copy = getAdminAdsCopy(locale);
    await routeAdminAdsApis(page);
    const request = { ...adminAdsRequestFixture(), requestMode: 'assisted', contactPhone: '+201234567890', placementKey: undefined, intervalStart: undefined, intervalEnd: undefined, status: 'waiting_pricing' };
    await page.route(`**/api/v1/admin/ad-requests/${adminAdsRequestId}`, route => route.fulfill({ json: success({ request, pricingOptions: { placements: [{ key: 'homepage.hero', label: { ar: 'بانر الرئيسية', en: 'Homepage banner' } }], adTypes: [] } }) }));
    let quoted = false;
    await page.route(`**/api/v1/admin/ad-requests/${adminAdsRequestId}/quote`, route => {
      quoted = true;
      const body = route.request().postDataJSON();
      expect(body.campaign).toEqual({ placementKey: 'homepage.hero', intervalStart: `${season.date}T${season.offsetHour}:00:00.000Z`, intervalEnd: season.end });
      expect(body.lineItems[0].unitAmountMinor).toBe(125050);
      return route.fulfill({ status: 503, json: { error: { code: 'SERVICE_UNAVAILABLE', messageKey: 'errors.serviceUnavailable', details: [], requestId: 'test-quote-failure' } } });
    });
    await page.goto(`/admin/ads/requests?lang=${locale}&requestId=${adminAdsRequestId}`);
    await page.locator('#admin-ad-placement').selectOption('homepage.hero');
    await page.locator('#admin-ad-start').fill(`${season.date}T12:00`);
    await page.locator('#admin-ad-end').fill(`${season.date}T11:00`);
    await page.locator('#admin-ad-quote-amount').fill('1250.50');
    await page.locator('#admin-ad-quote-valid').fill(`${season.date}T10:00`);
    await page.locator('#admin-ad-quote-terms').fill('Payment approval is required before scheduling');
    await page.getByRole('button', { name: copy.quoteIssue.submit, exact: true }).click();
    expect(quoted).toBe(false);
    await expect(page.getByText(locale === 'ar' ? 'نهاية العرض لازم تكون بعد بدايته. راجع التاريخ والوقت.' : 'Campaign end must be after its start. Check the date and time.')).toBeVisible();
    await page.locator('#admin-ad-end').fill(`${season.date}T14:15`);
    await expect(page.getByText(locale === 'ar' ? /مدة العرض: [٢2] ساعة و[١1][٥5] دقيقة/u : /Display duration: 2 hours, 15 minutes/u)).toBeVisible();
    await page.getByRole('button', { name: copy.quoteIssue.submit, exact: true }).click();
    await expect(page.locator('.admin-ads__review-card').getByText(copy.quoteIssue.error)).toBeVisible();
    await expect(page.locator('#admin-ad-start')).toHaveValue(`${season.date}T12:00`);
    await expect(page.locator('#admin-ad-end')).toHaveValue(`${season.date}T14:15`);
    expect(quoted).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
