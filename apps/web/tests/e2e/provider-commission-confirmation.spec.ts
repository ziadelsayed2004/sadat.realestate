import { expect, test } from '@playwright/test';
import { getProviderAdvertisingCopy } from '../../src/features/provider/advertising-copy.ts';

test('acknowledges the current commission after renewing an expired session without leaving the page', async ({ page }, info) => {
  const locale = info.project.name.endsWith('-ar') ? 'ar' : 'en';
  const copy = getProviderAdvertisingCopy(locale).commission;
  const accountId = 'a'.repeat(24);
  const envelope = (data: unknown) => ({ data, meta: { requestId: 'commission-renewal' } });
  let refreshes = 0, confirmations = 0;
  await page.route('**/api/v1/auth/refresh', route => route.fulfill({ json: envelope({ accessToken: ++refreshes === 1 ? 'provider.expired.qa' : 'provider.renewed.qa', tokenType: 'Bearer', expiresInSeconds: 900, user: { id: accountId, roleType: 'provider', status: 'verified' } }) }));
  await page.route('**/api/v1/provider/application/status', route => route.fulfill({ json: envelope({ applicationId: accountId, providerType: 'brokerage_office', status: 'approved', version: 1, availableActions: ['open_dashboard'] }) }));
  await page.route('**/api/v1/provider/commission', route => route.fulfill({ json: envelope({ accountId, source: 'policy', policyVersion: 1, kind: 'percentage', percentageBps: 150, rentMonths: 0.5, effectiveAt: '2026-10-01T00:00:00.000Z', readOnly: true }) }));
  await page.route('**/api/v1/provider/commission/confirm', route => {
    confirmations++;
    expect(route.request().postDataJSON()).toEqual({ policyVersion: 1, acknowledge: true });
    expect(route.request().headers().authorization).toBe(confirmations === 1 ? 'Bearer provider.expired.qa' : 'Bearer provider.renewed.qa');
    if (confirmations === 1) return route.fulfill({ status: 401, json: { error: { code: 'AUTHENTICATION_REQUIRED', messageKey: 'errors.authenticationRequired', details: [], requestId: 'expired-commission' } } });
    return route.fulfill({ json: envelope({ confirmationId: 'b'.repeat(24), policyVersion: 1, status: 'acknowledged', effectiveAt: '2026-10-01T00:00:00.000Z', acknowledgedAt: '2026-11-07T00:00:00.000Z' }) });
  });
  await page.goto(`/provider/commission?lang=${locale}`);
  await page.getByRole('button', { name: copy.confirm, exact: true }).click();
  await expect(page.getByRole('status')).toContainText(copy.confirmed);
  await expect(page.getByRole('button', { name: copy.confirm, exact: true })).toBeDisabled();
  expect(refreshes).toBe(2);
  expect(confirmations).toBe(2);
  await expect(page).toHaveURL(new RegExp(`/provider/commission\\?lang=${locale}$`));
});
