import { expect, test } from '@playwright/test';
import { adminAdsRequestFixture, adminAdsRequestId, routeAdminAdsApis } from './admin-ads.fixtures.ts';

test('schedules an advertisement with its current version and reloads the request', async ({ page }) => {
  await routeAdminAdsApis(page);
  const interval = { start: '2099-01-01T08:00:00.000Z', end: '2099-01-01T10:00:00.000Z' };
  let scheduled = false;
  await page.route(`**/api/v1/admin/ad-requests/${adminAdsRequestId}`, route => route.fulfill({ json: {
    data: { request: { ...adminAdsRequestFixture(), intervalStart: interval.start, intervalEnd: interval.end, status: scheduled ? 'scheduled' : 'waiting_payment', version: scheduled ? 4 : 3 } }, meta: { requestId: 'schedule-detail' }
  } }));
  await page.route(`**/api/v1/admin/ad-requests/${adminAdsRequestId}/schedule`, async route => {
    expect(route.request().method()).toBe('POST');
    expect(route.request().postDataJSON()).toEqual({ expectedVersion: 3, interval });
    scheduled = true;
    await route.fulfill({ json: { data: {
      requestId: adminAdsRequestId, placementKey: 'homepage.hero', providerId: adminAdsRequestFixture().providerId,
      status: 'scheduled', startsAt: interval.start, endsAt: interval.end,
      timezone: 'Africa/Cairo', localStart: '2099-01-01T10:00:00', localEnd: '2099-01-01T12:00:00', version: 4
    }, meta: { requestId: 'schedule-save' } } });
  });
  const locale = test.info().project.name.endsWith('-en') ? 'en' : 'ar';
  await page.goto(`/admin/ads/requests?requestId=${adminAdsRequestId}&lang=${locale}`);
  const button = page.getByRole('button', { name: locale === 'ar' ? 'حفظ موعد العرض بعد اعتماد الدفع' : 'Save display period after payment approval' });
  await expect(button).toBeVisible();
  await button.click();
  await expect(button).toHaveCount(0);
  expect(scheduled).toBe(true);
  await expect(page.locator('.admin-ads__detail [data-status="scheduled"]')).toBeVisible();
});

test('explains waiver validation and preserves the form through a placement conflict before scheduling', async ({ page }) => {
  const locale = test.info().project.name.endsWith('-en') ? 'en' : 'ar';
  const ar = locale === 'ar';
  await routeAdminAdsApis(page);
  const request = { ...adminAdsRequestFixture(), intervalStart: '2099-01-01T08:00:00.000Z', intervalEnd: '2099-01-01T10:00:00.000Z' };
  let scheduled = false;
  await page.route(`**/api/v1/admin/ad-requests/${adminAdsRequestId}`, route => route.fulfill({ json: { data: { request: { ...request, status: scheduled ? 'scheduled' : request.status, version: scheduled ? 4 : request.version } }, meta: { requestId: 'schedule-detail' } } }));
  const submissions: Record<string, unknown>[] = [];
  await page.route(`**/api/v1/admin/ad-requests/${adminAdsRequestId}/schedule`, route => {
    submissions.push(route.request().postDataJSON() as Record<string, unknown>);
    if (submissions.length === 1) return route.fulfill({ status: 409, json: { error: { code: 'AD_PLACEMENT_CONFLICT', messageKey: 'errors.conflict', details: [], requestId: 'schedule-conflict' } } });
    scheduled = true;
    return route.fulfill({ json: { data: {
      requestId: request.id, providerId: request.providerId, placementKey: request.placementKey, status: 'scheduled',
      startsAt: request.intervalStart, endsAt: request.intervalEnd, timezone: 'Africa/Cairo',
      localStart: '2099-01-01T10:00:00', localEnd: '2099-01-01T12:00:00', version: 4
    }, meta: { requestId: 'schedule-success' } } });
  });
  await page.goto(`/admin/ads/requests?requestId=${request.id}&lang=${locale}`);
  const form = page.locator('.admin-ads__schedule');
  await expect(form).toBeVisible();
  await form.getByRole('radio', { name: ar ? 'إعلان مجاني — إعفاء من الدفع' : 'Free advertisement — waive payment' }).check();
  const reason = form.getByLabel(ar ? 'سبب الإعفاء من الدفع (مطلوب)' : 'Payment waiver reason (required)');
  await reason.fill('هه');
  await expect(reason).toHaveAttribute('aria-invalid', 'true');
  await expect(form.getByRole('button')).toBeDisabled();
  await expect(page.locator('#admin-ad-waiver-help')).toContainText(ar ? '٣ حروف على الأقل' : 'at least 3 characters');
  expect(submissions).toHaveLength(0);
  await reason.fill('Complimentary promotional campaign');
  await page.screenshot({ path: test.info().outputPath('schedule-form.png'), fullPage: true });
  await form.getByRole('button').click();
  await expect(form.getByRole('alert')).toContainText(ar ? 'مكان العرض محجوز' : 'Another advertisement occupies');
  await expect(reason).toHaveValue('Complimentary promotional campaign');
  await form.getByRole('button').click();
  await expect.poll(() => submissions.length).toBe(2);
  expect(submissions[1]).toEqual({ expectedVersion: 3, waiverReason: 'Complimentary promotional campaign', interval: { start: request.intervalStart, end: request.intervalEnd } });
  await expect(form.getByRole('alert')).toHaveCount(0);
  await expect(page.locator('.admin-ads__detail [data-status="scheduled"]')).toBeVisible();
});
