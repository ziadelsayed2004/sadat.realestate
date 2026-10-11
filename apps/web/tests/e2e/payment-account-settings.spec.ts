import { expect, test } from '@playwright/test';
import { routeAdminHomeApis } from './admin-home.fixtures.ts';
import { getAdminSettingsCopy } from '../../src/features/admin_settings/copy.ts';
import { getAdminAdsCopy } from '../../src/features/admin_ads/copy.ts';

test('administrator must configure the recipient name and account before enabling wallet payments', async ({ page }, info) => {
  const locale = info.project.name.endsWith('-ar') ? 'ar' : 'en', copy = getAdminSettingsCopy(locale);
  await routeAdminHomeApis(page);
  let writes = 0;
  let stored = { namespace: 'advertising', schemaVersion: 1, values: { payment_proof_methods: [] } as Record<string, unknown>, version: 4, updatedAt: '2026-10-12T08:00:00.000Z', updatedBy: 'c'.repeat(24) };
  await page.route('**/api/v1/admin/settings/advertising', route => {
    if (route.request().method() === 'PUT') {
      writes++;
      const input = route.request().postDataJSON();
      expect(input.expectedVersion).toBe(stored.version);
      expect(input.values).toMatchObject({ payment_proof_methods: ['vodafone_cash'], vodafone_cash_recipient_name: 'Test beneficiary', vodafone_cash_recipient_account: '+201000000001' });
      expect(input.values).not.toHaveProperty('primary_phone');
      stored = { ...stored, values: input.values, version: stored.version + 1 };
    }
    return route.fulfill({ json: { data: stored, meta: { requestId: 'payment-account-settings' } } });
  });
  await page.goto(`/admin/settings/advertising?lang=${locale}`);
  await page.getByRole('checkbox', { name: getAdminAdsCopy(locale).paymentMethodLabels.vodafone_cash!, exact: true }).check();
  const fields = page.getByRole('group', { name: copy.fields.vodafone_cash_payment_details!, exact: true });
  const name = fields.getByLabel(copy.fields.payment_recipient_name!, { exact: true }), account = fields.getByLabel(copy.fields.payment_recipient_account!, { exact: true });
  await expect(name).toHaveAttribute('required', ''); await expect(account).toHaveAttribute('required', '');
  await page.getByLabel(copy.reason, { exact: true }).fill('Configure wallet transfer recipient');
  await page.getByRole('button', { name: copy.save, exact: true }).click();
  expect(writes).toBe(0);
  await name.fill('Test beneficiary');
  await account.fill('invalid account');
  await page.getByRole('button', { name: copy.save, exact: true }).click();
  await expect(page.getByRole('alert')).toContainText(copy.fields.vodafone_cash_payment_details!);
  expect(writes).toBe(0);
  await account.fill('+201000000001');
  await page.getByRole('button', { name: copy.save, exact: true }).click();
  await expect.poll(() => writes).toBe(1);
  await expect(account).toHaveValue('+201000000001');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await fields.evaluate(element => element.scrollIntoView({ block: 'center' }));
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
  await fields.screenshot({ path: info.outputPath('recipient-account-settings.png') });
});
