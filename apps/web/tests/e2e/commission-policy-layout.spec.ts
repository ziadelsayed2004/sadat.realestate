import { expect, test, type Locator } from '@playwright/test';
import { adminCommissionPolicyId, commissionPolicyFixture, routeAdminCommissionApis } from './admin-commissions.fixtures.ts';

async function expectControlsFit(card: Locator) {
  const layout = await card.evaluate(element => {
    const bounds = element.getBoundingClientRect();
    const controls = Array.from(element.querySelectorAll('button,input')).map(control => control.getBoundingClientRect());
    return {
      fits: controls.every(rect => rect.width >= 44 && rect.height >= 44 && rect.left >= bounds.left && rect.right <= bounds.right + 1),
      separate: controls.every((rect, index) => controls.slice(index + 1).every(other => rect.right <= other.left + 1 || other.right <= rect.left + 1 || rect.bottom <= other.top + 1 || other.bottom <= rect.top + 1)),
      documentFits: document.documentElement.scrollWidth <= innerWidth + 1
    };
  });
  expect(layout).toEqual({ fits: true, separate: true, documentFits: true });
}

test('long policy identifiers do not squeeze editing, reason or activation controls', async ({ page }, info) => {
  const ar = info.project.name.endsWith('-ar');
  await routeAdminCommissionApis(page);
  let policy = { ...commissionPolicyFixture(), key: `policy_${'25f18ba3d3de4c79ab3c53f29bfd5095'.repeat(2)}`, rentMonths: 0.5 };
  await page.route('**/api/v1/admin/commission-policies**', async route => {
    if (route.request().method() === 'PATCH') {
      const body = route.request().postDataJSON();
      expect(body).toMatchObject({ expectedVersion: 2, reason: 'Agreed commission', percentageBps: 200, rentMonths: 0.5 });
      policy = { ...policy, percentageBps: body.percentageBps, version: 3 };
      await route.fulfill({ json: { data: policy, meta: { requestId: 'policy-layout-save' } } });
    } else await route.fulfill({ json: { data: { items: [policy], total: 1, page: 1, limit: 20 }, meta: { requestId: 'policy-layout' } } });
  });
  await page.goto(`/admin/commissions?lang=${ar ? 'ar' : 'en'}`);
  const card = page.getByTestId(`admin-commission-policy-${adminCommissionPolicyId}`);
  await expect(card).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await expectControlsFit(card);
  await card.getByRole('button', { name: ar ? 'تعديل عمولة البيع والإيجار' : 'Edit sale and rental commission' }).click();
  await expectControlsFit(card);
  await card.getByRole('spinbutton').first().fill('2');
  await card.getByRole('textbox').fill('Agreed commission');
  await card.getByRole('button', { name: ar ? 'حفظ تعديل العمولة' : 'Save commission changes' }).click();
  await expect(card).toContainText('2.00%');
  await expectControlsFit(card);
  await card.screenshot({ path: info.outputPath('policy-layout.png') });
});
