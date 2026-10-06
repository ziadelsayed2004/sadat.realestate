import { expect, test } from '@playwright/test';
import { adminRequestFixture, adminRequestId, localeForAdminRequests, routeAdminRequestApis } from './admin-requests.fixtures.ts';

test('continues contact-request follow-up without closing the dialog and keeps the customer response visible', async ({ page, context }) => {
  const locale = localeForAdminRequests(test.info().project.name);
  await routeAdminRequestApis(page);
  let current = { ...adminRequestFixture(), customerUpdates: [] as Array<{ status: string; message?: string; createdAt: string }> };
  const calls: Array<{ transition: string; expectedVersion: number; customerMessage?: string }> = [];
  await page.route('**/api/v1/admin/requests**', async route => {
    const url = new URL(route.request().url());
    if (route.request().method() === 'POST' && url.pathname.endsWith('/transitions')) {
      const input = route.request().postDataJSON(); calls.push(input);
      expect(input.expectedVersion).toBe(current.version);
      expect(current.availableActions).toContain(input.transition);
      const target = input.transition === 'start_review' ? 'under_review' : input.transition === 'contact' ? 'contacted' : 'resolved';
      current = { ...current, status: target, version: current.version + 1, availableActions: target === 'under_review' ? ['contact', 'needs_information', 'cancel'] : target === 'contacted' ? ['schedule', 'start_progress', 'resolve', 'cancel'] : ['reopen', 'close'], customerUpdates: [...current.customerUpdates, { status: target, message: input.customerMessage, createdAt: '2026-10-06T18:00:00.000Z' }] };
      await route.fulfill({ json: { data: current, meta: { requestId: 'follow-up-save' } } }); return;
    }
    await route.fulfill({ json: { data: url.pathname.endsWith(adminRequestId) ? current : { items: [current], total: 1, page: 1, limit: 20 }, meta: { requestId: 'follow-up-load' } } });
  });
  await page.goto(`/admin/contact-requests?lang=${locale}`);
  await page.getByTestId(`admin-request-${adminRequestId}`).getByRole('button').click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('link', { name: locale === 'ar' ? 'فتح العقار في الإدارة' : 'Open property in administration' })).toHaveAttribute('href', `/admin/properties/${current.propertyId}?lang=${locale}`);
  for (const [index, action] of ['start_review', 'contact', 'resolve'].entries()) {
    if (action === 'resolve') await dialog.locator('#admin-request-transition').selectOption(action);
    await dialog.locator('#admin-request-transition-reason').fill('Private administrative reason');
    await dialog.locator('#admin-request-customer-message').fill('We will call you tomorrow');
    await dialog.getByRole('button', { name: locale === 'ar' ? 'حفظ الانتقال' : 'Save transition' }).click();
    await expect(dialog.locator('#admin-request-transition-reason')).toHaveValue('');
    expect(calls[index]?.transition).toBe(action);
    await expect(dialog).toBeVisible();
  }
  const seeker = await context.newPage();
  await seeker.route('**/api/v1/auth/refresh', route => route.fulfill({ json: { data: { accessToken: 'seeker.requests.qa', tokenType: 'Bearer', expiresInSeconds: 900, user: { id: current.seekerId, roleType: 'seeker', status: 'verified' } }, meta: { requestId: 'seeker-refresh' } } }));
  await seeker.route('**/api/v1/seeker/**', route => route.fulfill({ json: { data: { ...current, capabilities: undefined, availableActions: [] }, meta: { requestId: 'seeker-detail' } } }));
  await seeker.goto(`/seeker/requests/${adminRequestId}?lang=${locale}`);
  await expect(seeker.getByText('We will call you tomorrow').first()).toBeVisible();
  await expect(seeker.locator('body')).not.toContainText('Private administrative reason');
  await seeker.close();
});
