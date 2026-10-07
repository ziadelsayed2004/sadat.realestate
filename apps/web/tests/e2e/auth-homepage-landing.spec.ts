import { expect, test, type Page } from '@playwright/test';
import { routePublicHomepageApi } from './public-fixtures';

function envelope(data: unknown) {
  return { data, meta: { requestId: 'e2e-homepage-landing' } };
}

async function sessionRoutes(page: Page, roleType: 'seeker' | 'provider' | 'admin') {
  const session = envelope({ accessToken: 'landing.session.token', tokenType: 'Bearer', expiresInSeconds: 900, user: { id: 'aaaaaaaaaaaaaaaaaaaaaaaa', roleType, status: 'verified' } });
  await page.route('**/api/v1/auth/refresh', route => route.fulfill({ json: session }));
  await page.route('**/api/v1/auth/login', route => route.fulfill({ json: session }));
  await routePublicHomepageApi(page);
  return session;
}

for (const role of ['seeker', 'provider', 'admin'] as const) {
  test(`${role} login lands on the homepage instead of a saved viewing destination`, async ({ page }) => {
    const locale = test.info().project.name.endsWith('-en') ? 'en' : 'ar';
    await sessionRoutes(page, role);
    await page.goto(`/auth/login?lang=${locale}&returnTo=${encodeURIComponent('/seeker/viewings?lang=ar')}`);
    await page.locator('#auth-login-email').fill(`${role}@example.com`);
    await page.locator('#auth-login-password').fill('secret');
    await page.locator('[data-screen-id="AUTH-01"] button[type="submit"]').click();
    await expect(page).toHaveURL(new RegExp(`/\\?lang=${locale}$`, 'u'));
    await expect(page.locator('[data-page="public-home"][data-homepage-state="success"]')).toBeVisible();
    await expect(page.locator('.public-homepage__account').first()).toHaveAttribute('href', new RegExp(`^/${role}(?:\\?|$)`, 'u'));
    await page.reload();
    await expect(page).toHaveURL(new RegExp(`/\\?lang=${locale}$`, 'u'));
    await expect(page.locator('[data-page="public-home"][data-homepage-state="success"]')).toBeVisible();
    await expect(page.locator('.public-homepage__account').first()).toHaveAttribute('href', new RegExp(`^/${role}(?:\\?|$)`, 'u'));
  });
}

test('new seeker registration opens the homepage and a later site visit stays there', async ({ page }) => {
  const locale = test.info().project.name.endsWith('-en') ? 'en' : 'ar';
  const session = await sessionRoutes(page, 'seeker');
  await page.route('**/api/v1/auth/otp/send', route => route.fulfill({ json: envelope({ accepted: true, challengeId: '00000000-0000-4000-8000-000000000001', expiresInSeconds: 300, retryAfterSeconds: 30 }) }));
  await page.route('**/api/v1/auth/otp/verify', route => route.fulfill({ json: envelope({ outcome: 'verified', verificationToken: 'A'.repeat(43), expiresInSeconds: 600, roleType: 'seeker' }) }));
  await page.route('**/api/v1/auth/register/seeker', route => route.fulfill({ json: envelope({ outcome: 'registered', session: session.data }) }));
  await page.goto(`/auth/register?lang=${locale}`);
  await page.locator('.auth-role-card').first().click();
  await page.locator('.auth-role-actions button').click();
  await page.locator('#auth-otp-email').fill('new@example.com');
  await page.locator('form button[type="submit"]').click();
  const digits = page.locator('.auth-otp__digit');
  for (let index = 0; index < 6; index += 1) await digits.nth(index).fill(String(index + 1));
  await page.locator('[data-screen-id="AUTH-05"] button[type="submit"]').click();
  await page.locator('#auth-registration-first-name').fill('New');
  await page.locator('#auth-registration-last-name').fill('Customer');
  await page.locator('#auth-registration-password').fill('NewPassword1!');
  await page.locator('#auth-registration-password-confirmation').fill('NewPassword1!');
  await page.locator('[data-screen-id="AUTH-03"] button[type="submit"]').click();
  await expect(page).toHaveURL(new RegExp(`/\\?lang=${locale}$`, 'u'));
  await expect(page.locator('[data-page="public-home"][data-homepage-state="success"]')).toBeVisible();
  await page.goto(`/?lang=${locale}`);
  await expect(page).toHaveURL(new RegExp(`/\\?lang=${locale}$`, 'u'));
  await expect(page.locator('[data-page="public-home"][data-homepage-state="success"]')).toBeVisible();
  await expect(page.locator('.public-homepage__account').first()).toHaveAttribute('href', /^\/seeker(?:\?|$)/u);
});
