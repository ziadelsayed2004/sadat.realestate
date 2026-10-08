import { expect, test } from '@playwright/test';
import { adminCommissionAccountId, adminCommissionExceptionId, commissionExceptionFixture, routeAdminCommissionApis } from './admin-commissions.fixtures.ts';

test('an admin draft is approved and the provider can refresh the applied exception and open its notification', async ({ page }, testInfo) => {
  const locale = testInfo.project.name.endsWith('-en') ? 'en' : 'ar';
  let active = false;
  let creates = 0;
  let refreshes = 0;
  const envelope = (data: unknown) => ({ data, meta: { requestId: 'commission-delivery-qa' } });
  await routeAdminCommissionApis(page);
  await page.route('**/api/v1/admin/users**', route => route.fulfill({ json: envelope({ items: [], page: 1, limit: 20, total: 0 }) }));
  await page.route('**/api/v1/admin/commission-exceptions**', async route => {
    const request = route.request();
    if (request.method() === 'POST') {
      creates++;
      expect(request.postDataJSON()).toMatchObject({ accountId: adminCommissionAccountId, percentageBps: 100 });
      await route.fulfill({ json: envelope({ ...commissionExceptionFixture(), percentageBps: 100 }) });
    } else if (request.method() === 'PATCH') {
      expect(request.url()).toContain(adminCommissionExceptionId);
      expect(request.postDataJSON()).toMatchObject({ expectedVersion: 1, status: 'active' });
      active = true;
      await route.fulfill({ json: envelope({ ...commissionExceptionFixture(), percentageBps: 100, status: 'active', version: 2, approvedBy: 'ffffffffffffffffffffffff', approvedAt: '2026-10-08T10:00:00.000Z', approvalReason: 'Approved partner rate' }) });
    } else await route.fulfill({ json: envelope({ items: [], page: 1, limit: 20, total: 0 }) });
  });
  await page.goto(`/admin/commissions/exceptions/new?lang=${locale}`);
  await page.locator('#admin-commission-exception-account').fill(adminCommissionAccountId);
  await page.locator('#admin-commission-exception-percentage').fill('1');
  await page.locator('#admin-commission-exception-reason').fill('Approved partner rate');
  await page.getByRole('button', { name: locale === 'ar' ? 'حفظ مسودة' : 'Save draft', exact: true }).click();
  const activate = page.getByRole('button', { name: locale === 'ar' ? 'اعتماد وتفعيل الاستثناء' : 'Approve and activate exception', exact: true });
  await expect(activate).toBeVisible();
  await expect(page.locator('#admin-commission-exception-account')).toBeDisabled();
  expect(active).toBe(false);
  await activate.click();
  await expect(page.getByRole('status')).toContainText(locale === 'ar' ? 'تم اعتماد الاستثناء' : 'Exception approved');
  expect(creates).toBe(1);
  expect(active).toBe(true);

  await page.route('**/api/v1/auth/refresh', route => route.fulfill({ json: envelope({ accessToken: 'provider.delivery.token', tokenType: 'Bearer', expiresInSeconds: 900, user: { id: adminCommissionAccountId, roleType: 'provider', status: 'verified' } }) }));
  await page.route('**/api/v1/provider/application/status', route => route.fulfill({ json: envelope({ applicationId: adminCommissionAccountId, providerType: 'brokerage_office', status: 'approved', version: 1, availableActions: ['open_dashboard'] }) }));
  await page.route('**/api/v1/provider/commission', route => {
    refreshes++;
    return route.fulfill({ json: envelope({ accountId: adminCommissionAccountId, source: refreshes === 1 ? 'policy' : 'exception', effectiveAt: '2026-10-08T10:00:00.000Z', policyVersion: 2, kind: 'percentage', percentageBps: refreshes === 1 ? 250 : 100, readOnly: true }) });
  });
  const noticeId = '111111111111111111111111';
  await page.route('**/api/v1/provider/notifications**', route => route.fulfill({ json: envelope({ items: [{ id: noticeId, type: 'commission.exception_activated', title: { ar: 'تم تعديل عمولتك', en: 'Your commission has changed' }, message: { ar: 'اعتمدت الإدارة استثناء بقيمة 1%.', en: 'An exception of 1% was approved.' }, link: '/provider/commission', createdAt: '2026-10-08T10:00:00.000Z', readAt: null }], unreadCount: 1, page: 1, limit: 20, total: 1 }) }));
  await page.goto(`/provider/commission?lang=${locale}`);
  await expect(page.locator('.provider-commission__hero strong')).toHaveText('2.5%');
  await page.getByRole('button', { name: locale === 'ar' ? 'تحديث العمولة' : 'Refresh commission', exact: true }).click();
  await expect(page.locator('.provider-commission__hero strong')).toHaveText('1%');
  await expect(page.locator('.provider-advertising__definition-list')).toContainText(locale === 'ar' ? 'استثناء معتمد' : 'Approved exception');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('applied-exception.png'), fullPage: true });
  await page.goto(`/provider/notifications?lang=${locale}`);
  const notice = page.getByTestId(`provider-notification-${noticeId}`);
  await expect(notice).toHaveAttribute('data-state', 'unread');
  await expect(notice).toContainText(locale === 'ar' ? 'تم تعديل عمولتك' : 'Your commission has changed');
  await expect(notice.locator('a')).toHaveAttribute('href', `/provider/commission?lang=${locale}`);
});
