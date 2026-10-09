import { expect, test } from '@playwright/test';
import type { RequestData } from '@sadat-real-estate/contracts';

test('seeker supplies requested information and can start another request from the same page', async ({ page }) => {
  const ar = test.info().project.name.endsWith('-ar');
  const locale = ar ? 'ar' : 'en';
  const id = 'ded3941b69fa407c4dbd8c01';
  const newId = 'e'.repeat(24);
  const stamp = '2026-10-09T00:13:00.000Z';
  let current: RequestData = { id, type: 'contact', source: 'seeker', seekerId: 'a'.repeat(24), status: 'needs_information', version: 3, payload: { message: 'Original request' }, availableActions: ['start_review', 'cancel'], customerUpdates: [{ status: 'needs_information', message: 'Please provide your budget.', createdAt: stamp }], createdAt: stamp, updatedAt: stamp };
  await page.addInitScript(() => localStorage.setItem('sadat-real-estate.auth.session-hint', 'authenticated'));
  await page.route('**/api/v1/auth/refresh', route => route.fulfill({ json: { data: { accessToken: 'seeker.information.token', tokenType: 'Bearer', expiresInSeconds: 900, user: { id: 'a'.repeat(24), roleType: 'seeker', status: 'verified' } }, meta: { requestId: 'seeker-information-session' } } }));
  await page.route(`**/api/v1/seeker/requests/${id}`, route => route.fulfill({ json: { data: current, meta: { requestId: 'request-read' } } }));
  let attempts = 0;
  await page.route(`**/api/v1/seeker/requests/${id}/transitions`, async route => {
    expect(route.request().headers().authorization).toBe('Bearer seeker.information.token');
    expect(route.request().postDataJSON()).toEqual({ transition: 'start_review', customerMessage: 'Budget: 2 million', expectedVersion: 3 });
    attempts += 1;
    if (attempts === 1) { await route.fulfill({ status: 500, json: { error: { code: 'INTERNAL_ERROR', messageKey: 'errors.internalError', details: [], requestId: 'reply-retry' } } }); return; }
    current = { ...current, status: 'under_review', version: 4, availableActions: ['cancel'], customerUpdates: [...(current.customerUpdates ?? []), { status: 'under_review', message: 'Budget: 2 million', authorRole: 'seeker', createdAt: stamp }] };
    await route.fulfill({ json: { data: current, meta: { requestId: 'reply-saved' } } });
  });
  await page.route('**/api/v1/seeker/contact-requests', async route => {
    expect(route.request().headers().authorization).toBe('Bearer seeker.information.token');
    expect(route.request().postDataJSON()).toMatchObject({ fullName: 'Example seeker', phone: '01039938831', message: 'Another property request', contactChannel: 'platform', locale });
    await route.fulfill({ status: 201, json: { data: { ...current, id: newId, status: 'new', version: 0, customerUpdates: [], payload: route.request().postDataJSON() }, meta: { requestId: 'new-request-saved' } } });
  });
  await page.goto(`/seeker/requests/${id}?lang=${locale}`);
  const reply = page.getByRole('form', { name: ar ? 'إرسال المعلومات المطلوبة' : 'Send requested information' });
  await expect(reply).toBeVisible();
  await reply.locator('textarea').fill('Budget: 2 million');
  await reply.screenshot({ path: test.info().outputPath('requested-information.png') });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await reply.getByRole('button').click();
  await expect(reply.getByRole('alert')).toBeVisible();
  await expect(reply.locator('textarea')).toHaveValue('Budget: 2 million');
  await reply.getByRole('button').click();
  await expect(page.getByText(ar ? 'ردك على الإدارة' : 'Your reply to the team', { exact: true })).toBeVisible();
  await expect(reply).toHaveCount(0);
  await expect(page).toHaveURL(new RegExp(`/seeker/requests/${id}`));
  await page.getByRole('button', { name: ar ? 'طلب جديد' : 'New request', exact: true }).click();
  const modal = page.getByRole('dialog');
  await modal.locator('#seeker-new-request-name').fill('Example seeker');
  await modal.locator('#seeker-new-request-phone').fill('01039938831');
  await modal.locator('#seeker-new-request-message').fill('Another property request');
  await modal.screenshot({ path: test.info().outputPath('new-request-form.png') });
  await modal.getByRole('button', { name: ar ? 'إرسال طلب جديد' : 'Send new request', exact: true }).click();
  await expect(modal.getByRole('link', { name: ar ? 'متابعة الطلب الجديد' : 'Track the new request' })).toHaveAttribute('href', `/seeker/requests/${newId}?lang=${locale}`);
});
