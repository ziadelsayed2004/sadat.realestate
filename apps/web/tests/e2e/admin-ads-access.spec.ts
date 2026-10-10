import { expect, test } from '@playwright/test';
import { adAdminRequestSchema } from '@sadat-real-estate/contracts';

test('renews an expired advertising session and lets authorized staff open their requests', async ({ page }, info) => {
  const locale = info.project.name.endsWith('-en') ? 'en' : 'ar';
  const id = 'aaaaaaaaaaaaaaaaaaaaaaaa';
  let refreshes = 0;
  const tokens: Array<string | undefined> = [];
  const row = adAdminRequestSchema.parse({ request: { id, providerId: 'bbbbbbbbbbbbbbbbbbbbbbbb', placementKey: 'homepage.hero', purpose: 'Advertising access check', intervalStart: '2026-10-20T09:00:00.000Z', intervalEnd: '2026-10-27T09:00:00.000Z', status: 'review', version: 0, createdAt: '2026-10-10T09:00:00.000Z', updatedAt: '2026-10-10T09:00:00.000Z' } });
  const envelope = (data: unknown) => ({ data, meta: { requestId: 'ads-access', page: 1, limit: 20, total: 1 } });
  await page.route('**/api/v1/auth/refresh', route => {
    refreshes++;
    return route.fulfill({ json: envelope({ accessToken: refreshes === 1 ? 'ads.expired.qa' : 'ads.renewed.qa', tokenType: 'Bearer', expiresInSeconds: 900, user: { id, roleType: 'admin', status: 'verified' } }) });
  });
  await page.route('**/api/v1/admin/ad-requests**', route => {
    const token = route.request().headers().authorization;
    tokens.push(token);
    if (token !== 'Bearer ads.renewed.qa') return route.fulfill({ status: 401, json: { error: { code: 'UNAUTHORIZED', messageKey: 'errors.unauthorized', requestId: 'expired' } } });
    return route.fulfill({ json: envelope({ items: [row], page: 1, limit: 20, total: 1 }) });
  });
  await page.goto(`/admin/ads/requests?lang=${locale}`);
  await expect(page.locator('.admin-ads')).toHaveAttribute('data-admin-ads-state', 'success');
  expect(refreshes).toBe(2);
  expect(tokens).toEqual(['Bearer ads.expired.qa', 'Bearer ads.renewed.qa']);
  await expect(page.locator('.admin-ads__content')).toContainText(id);
  await page.screenshot({ path: info.outputPath('advertising-staff-requests.png'), fullPage: true });
});
