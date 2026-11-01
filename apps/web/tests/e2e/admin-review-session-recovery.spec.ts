import { expect, test } from '@playwright/test';
import { adminPropertyFixture, adminPropertyId, routeAdminPropertyApis } from './admin-properties.fixtures.ts';

test('a review stays editable after token expiry and saves once with the renewed session', async ({ page }) => {
  await routeAdminPropertyApis(page);
  let refreshes = 0;
  await page.route('**/api/v1/auth/refresh', route => route.fulfill({ json: {
    data: { accessToken: `review.session.${++refreshes}`, tokenType: 'Bearer', expiresInSeconds: 900, user: { id: '9'.repeat(24), roleType: 'admin', status: 'verified' } }, meta: { requestId: 'review-refresh' }
  } }));
  const property = { ...adminPropertyFixture(), providerDisplayName: 'Actual provider office', availableActions: ['update'], price: { amount: 3250000, currency: 'EGP' } };
  const attempts: { token: string | undefined; body: Record<string, unknown> }[] = [];
  let writes = 0;
  await page.route('**/api/v1/admin/properties**', async route => {
    const request = route.request();
    if (new URL(request.url()).pathname.endsWith('/media')) return route.fulfill({ json: { data: { items: [] }, meta: { requestId: 'review-media' } } });
    if (request.method() === 'PATCH') {
      const body = request.postDataJSON() as Record<string, unknown>;
      attempts.push({ token: request.headers().authorization, body });
      if (attempts.length === 1) return route.fulfill({ status: 401, json: { error: { code: 'AUTHENTICATION_REQUIRED', messageKey: 'errors.authenticationRequired', details: [], requestId: 'review-expired' } } });
      writes++;
      return route.fulfill({ json: { data: { ...property, name: body.name, version: 4 }, meta: { requestId: 'review-saved' } } });
    }
    return route.fulfill({ json: { data: property, meta: { requestId: 'review-detail' } } });
  });
  await page.goto(`/admin/properties/review?propertyId=${adminPropertyId}&lang=en`);
  await expect(page.getByRole('heading', { name: 'Actual provider office' })).toBeVisible();
  await page.getByLabel('Property title EN', { exact: true }).fill('Corrected listing title');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.locator('#admin-property-editor [role="status"]')).toContainText('Changes saved.');
  expect(writes).toBe(1);
  expect(attempts).toHaveLength(2);
  expect(attempts[0]!.token).not.toBe(attempts[1]!.token);
  expect(attempts[0]!.body).toEqual(attempts[1]!.body);
  expect(attempts[1]!.body).not.toHaveProperty('price');
  await expect(page.getByLabel('Price', { exact: true })).toHaveValue('3250000');
});
