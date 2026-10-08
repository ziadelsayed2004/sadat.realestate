import { expect, test } from '@playwright/test';
import { adminCommissionAccountId, adminCommissionActorId, adminCommissionExceptionId, commissionExceptionFixture, routeAdminCommissionApis } from './admin-commissions.fixtures.ts';

test('exception cards keep approval, stopping and account links usable across screen sizes', async ({ page }, testInfo) => {
  const ar = !testInfo.project.name.endsWith('-en');
  const locale = ar ? 'ar' : 'en';
  const envelope = (data: unknown) => ({ data, meta: { requestId: 'exception-cards-qa' } });
  let status = 'draft';
  let version = 1;
  let mutations = 0;
  const record = () => ({ ...commissionExceptionFixture(), status, version,
    reason: ar ? 'نسبة خاصة متفق عليها لهذا الحساب، مستمرة حتى إيقافها أو تغييرها بواسطة الإدارة.' : 'A special rate agreed for this account, continuing until the administration stops or changes it.',
    ...(version > 1 ? { approvedBy: adminCommissionActorId, approvedAt: '2026-10-09T10:00:00.000Z', approvalReason: 'Approved partner rate' } : {})
  });
  await routeAdminCommissionApis(page);
  await page.route('**/api/v1/admin/commission-exceptions**', async route => {
    if (route.request().method() === 'PATCH') {
      expect(route.request().url()).toContain(adminCommissionExceptionId);
      expect(route.request().postDataJSON()).toEqual({ expectedVersion: version, status: status === 'active' ? 'inactive' : 'active', reason: mutations === 0 ? 'Approve partner rate' : 'Stop partner rate' });
      status = status === 'active' ? 'inactive' : 'active';
      version++;
      mutations++;
      await route.fulfill({ json: envelope(record()) });
    } else {
      await route.fulfill({ json: envelope({ items: [record(), { ...commissionExceptionFixture(), id: '111111111111111111111111', status: 'archived', effectiveTo: '2026-10-12T09:00:00.000Z', percentageBps: 600 }], page: 1, limit: 20, total: 2 }) });
    }
  });
  await page.goto(`/admin/commissions/exceptions?lang=${locale}`);
  const card = page.getByTestId(`admin-commission-exception-${adminCommissionExceptionId}`);
  await expect(card).toHaveAttribute('data-status', 'draft');
  await expect(card).toContainText('1.50%');
  await expect(card.getByRole('link')).toHaveAttribute('href', `/admin/commissions/account?lang=${locale}&accountId=${adminCommissionAccountId}`);
  await expect(card).toContainText(ar ? 'مستمر حتى إيقافه أو تغييره' : 'Continues until stopped or changed');
  await expect(page.locator('.admin-commission-exception[data-status="archived"] form')).toHaveCount(0);
  const reason = card.getByRole('textbox');
  const approve = card.getByRole('button', { name: ar ? 'اعتماد وتفعيل' : 'Approve and activate', exact: true });
  await expect(approve).toBeVisible();
  expect(await reason.evaluate(element => element.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  for (const element of [card, card.locator('h3'), reason, approve]) {
    const bounds = await element.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
  }
  await page.screenshot({ path: testInfo.outputPath('exception-cards.png'), fullPage: true });
  await reason.fill('Approve partner rate');
  await approve.click();
  await expect(card).toHaveAttribute('data-status', 'active');
  await reason.fill('Stop partner rate');
  await card.getByRole('button', { name: ar ? 'إيقاف الاستثناء' : 'Stop exception', exact: true }).click();
  await expect(card).toHaveAttribute('data-status', 'inactive');
  expect(mutations).toBe(2);
});
