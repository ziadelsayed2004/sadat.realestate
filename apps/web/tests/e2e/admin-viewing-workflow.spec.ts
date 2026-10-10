import { expect, test } from '@playwright/test';
import { adminViewingFixture, adminViewingId, localeForAdminRequests, routeAdminRequestApis } from './admin-requests.fixtures.ts';

test('viewing appointments stay usable and persist actions with the current version', async ({ page }, testInfo) => {
  const locale = localeForAdminRequests(testInfo.project.name);
  const ar = locale === 'ar';
  await page.clock.install({ time: new Date('2026-10-09T09:00:00Z') });
  await routeAdminRequestApis(page);
  let item = { ...adminViewingFixture(), status: 'requested', requestedAt: '2026-10-10T10:00:00Z',
    availableActions: ['confirm', 'reschedule', 'cancel'], customerName: 'Ahmed Hassan',
    property: { id: 'cccccccccccccccccccccccc', slug: 'test-apartment', kind: 'property', transactionType: 'sale', name: { ar: 'شقة في الحي الأول', en: 'First district apartment' }, publicCode: 'SDT-1234' } };
  const posts: Record<string, unknown>[] = [];
  await page.route('**/api/v1/admin/viewings**', async route => {
    if (route.request().method() === 'POST') {
      const input = route.request().postDataJSON() as Record<string, unknown>;
      posts.push(input);
      const status = input.action === 'confirm' ? 'confirmed' : input.action === 'reschedule' ? 'rescheduled' : 'completed';
      item = { ...item, status, version: item.version + 1,
        requestedAt: typeof input.requestedAt === 'string' ? input.requestedAt : item.requestedAt,
        availableActions: status === 'completed' ? [] : status === 'confirmed' ? ['reschedule', 'cancel', 'complete'] : ['confirm', 'reschedule', 'cancel'] };
      await route.fulfill({ json: { data: item, meta: { requestId: 'viewing-save' } } });
    } else await route.fulfill({ json: { data: { items: [item], page: 1, limit: 20, total: 1 }, meta: { requestId: 'viewing-list' } } });
  });
  await page.goto(`/admin/viewing-requests?lang=${locale}`);
  await expect(page.getByRole('heading', { name: ar ? 'إيه دور طلبات المعاينة؟' : 'What are viewing requests for?' })).toBeVisible();
  await page.getByTestId(`admin-viewing-${adminViewingId}`).getByRole('button').click();
  const dialog = page.getByRole('dialog');
  const message = dialog.getByRole('textbox', { name: ar ? 'رسالة للعميل وسبب الإجراء' : 'Customer message and action reason' });
  await message.fill('Appointment agreed with customer');
  await page.screenshot({ path: testInfo.outputPath('viewing-actions.png') });
  const bounds = await dialog.boundingBox();
  expect(bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  expect(bounds!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  const form = dialog.locator('form');
  expect((await message.boundingBox())!.width).toBeGreaterThan((await form.boundingBox())!.width * 0.85);
  await dialog.getByRole('button', { name: ar ? 'تأكيد الموعد' : 'Confirm appointment', exact: true }).click();
  await expect.poll(() => posts.length).toBe(1);
  expect(posts[0]).toEqual({ action: 'confirm', expectedVersion: 1, reason: 'Appointment agreed with customer' });
  await expect(dialog).toHaveCount(0);
  await expect(page.getByTestId(`admin-viewing-${adminViewingId}`)).toContainText(ar ? 'موعد مؤكد' : 'Appointment confirmed');
  await page.getByTestId(`admin-viewing-${adminViewingId}`).getByRole('button').click();
  await dialog.getByRole('radio', { name: ar ? /تغيير الموعد/ : /Change appointment/ }).check();
  await dialog.getByLabel(ar ? 'التاريخ الجديد' : 'New date', { exact: true }).fill('2026-10-11');
  await dialog.getByLabel(ar ? 'الساعة بتوقيت مصر' : 'Time in Egypt', { exact: true }).fill('14:30');
  await message.fill('Customer requested a later visit');
  await dialog.getByRole('button', { name: ar ? 'تغيير الموعد' : 'Change appointment', exact: true }).click();
  await expect.poll(() => posts.length).toBe(2);
  expect(posts[1]).toEqual({ action: 'reschedule', expectedVersion: 2, reason: 'Customer requested a later visit', requestedAt: '2026-10-11T11:30:00.000Z', timezone: 'Africa/Cairo' });
  await message.fill('New appointment agreed with customer');
  await dialog.getByRole('button', { name: ar ? 'تأكيد الموعد' : 'Confirm appointment', exact: true }).click();
  await expect.poll(() => posts.length).toBe(3);
  await expect(dialog).toHaveCount(0);
  await page.getByTestId(`admin-viewing-${adminViewingId}`).getByRole('button').click();
  await dialog.getByRole('radio', { name: ar ? /تمت المعاينة/ : /Viewing completed/ }).check();
  await message.fill('The customer visited the property');
  await dialog.getByRole('button', { name: ar ? 'تمت المعاينة' : 'Viewing completed', exact: true }).click();
  await expect(dialog.getByText(ar ? 'هذه المعاينة انتهت ولا توجد إجراءات أخرى عليها.' : 'This viewing has ended and has no further actions.')).toBeVisible();
  expect(posts[3]).toMatchObject({ action: 'complete', expectedVersion: 4 });
});
