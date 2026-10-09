import { expect, test } from '@playwright/test';
import { adminRequestFixture, routeAdminRequestApis } from './admin-requests.fixtures.ts';

test('accepts a contact request from its deep link and retains the accepted status after reopening', async ({ page }, info) => {
  const ar = info.project.name.endsWith('-ar');
  await routeAdminRequestApis(page);
  let request = { ...adminRequestFixture(), status: 'under_review', version: 3, availableActions: ['contact', 'start_progress', 'cancel'] };
  let writes = 0;
  const envelope = (data: unknown) => ({ data, meta: { requestId: 'contact-acceptance-test' } });
  await page.route('**/api/v1/admin/requests**', async route => {
    const http = route.request();
    expect(http.headers().authorization).toBe('Bearer admin.requests.qa');
    if (http.method() === 'POST') {
      const body = http.postDataJSON();
      expect(body).toEqual({ transition: 'start_progress', expectedVersion: 3, reason: 'Accept request for follow-up' });
      writes++;
      request = { ...request, status: 'in_progress', version: 4, availableActions: ['resolve', 'needs_information', 'cancel'] };
      await route.fulfill({ json: envelope(request) });
    } else {
      const detail = new URL(http.url()).pathname.endsWith(request.id);
      await route.fulfill({ json: envelope(detail ? request : { items: [request], page: 1, limit: 20, total: 1 }) });
    }
  });
  const path = `/admin/contact-requests?lang=${ar ? 'ar' : 'en'}&requestId=${request.id}`;
  await page.goto(path);
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: ar ? 'قبول طلب التواصل وبدء المتابعة' : 'Accept contact request and start follow-up', exact: true }).click();
  expect(writes).toBe(0);
  await dialog.locator('#admin-request-transition-reason').fill('Accept request for follow-up');
  await dialog.getByRole('button', { name: ar ? 'قبول الطلب وبدء المتابعة' : 'Accept and start follow-up', exact: true }).click();
  await expect.poll(() => writes).toBe(1);
  await expect(dialog.getByRole('button', { name: ar ? 'قبول طلب التواصل وبدء المتابعة' : 'Accept contact request and start follow-up', exact: true })).toHaveCount(0);
  await expect(dialog.locator('#admin-request-transition')).toHaveValue('resolve');
  await page.reload();
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('#admin-request-transition')).toHaveValue('resolve');
  expect(request.status).toBe('in_progress');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('accepted-contact-request.png') });
});
