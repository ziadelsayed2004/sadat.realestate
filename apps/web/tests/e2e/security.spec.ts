import { expect, test } from '@playwright/test';

function localeForProject(): 'ar' | 'en' {
  const project = test.info().project.name;
  return project.endsWith('-en') ? 'en' : 'ar';
}

function authLoginEnvelope() {
  return {
    data: {
      accessToken: 'header.payload.signature',
      tokenType: 'Bearer',
      expiresInSeconds: 900,
      user: { id: 'aaaaaaaaaaaaaaaaaaaaaaaa', roleType: 'admin', status: 'verified' }
    },
    meta: { requestId: 'security-login' }
  };
}

test('HTML responses expose browser security headers and private pages are not cacheable', async ({ page }) => {
  const locale = localeForProject();
  const response = await page.goto(`/auth/login?lang=${encodeURIComponent(locale)}`);

  expect(response?.status()).toBe(200);
  expect(response?.headers()).toMatchObject({
    'cache-control': 'no-store',
    'content-security-policy': expect.stringContaining("default-src 'self'"),
    'cross-origin-opener-policy': 'same-origin',
    'cross-origin-resource-policy': 'same-origin',
    'permissions-policy': 'camera=(), geolocation=(), microphone=(), payment=()',
    'referrer-policy': 'strict-origin-when-cross-origin',
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY'
  });
  expect(response?.headers()['content-security-policy']).toContain("object-src 'none'");
  expect(response?.headers()['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(response?.headers()['content-security-policy']).toContain("form-action 'self'");
  await expect(page.locator('body')).not.toContainText(/accessToken|refreshToken|storageKey|privateUrl/u);
});

test('access tokens stay out of browser storage and hostile returnTo values fail closed', async ({ page }) => {
  const locale = localeForProject();
  await page.route('**/api/v1/auth/login', async route => {
    expect(route.request().method()).toBe('POST');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(authLoginEnvelope())
    });
  });

  const hostileReturnTo = encodeURIComponent('https://attacker.invalid/steal');
  await page.goto(`/auth/login?lang=${encodeURIComponent(locale)}&returnTo=${hostileReturnTo}`);
  await page.locator('#auth-login-email').fill('admin@example.com');
  await page.locator('#auth-login-password').fill('secret');
  await page.locator('[data-screen-id="AUTH-01"] button[type="submit"]').click();

  await expect(page).toHaveURL(new RegExp(`/admin\\?lang=${locale}$`, 'u'));
  const storage = await page.evaluate(() => ({
    local: window.localStorage.length,
    session: window.sessionStorage.length,
    localValues: Object.values(window.localStorage),
    sessionValues: Object.values(window.sessionStorage)
  }));
  expect(storage.session).toBe(0);
  expect(storage.sessionValues).toEqual([]);
  expect(storage.localValues).not.toContain('header.payload.signature');
  expect(storage.localValues.join('|')).not.toMatch(/accessToken|refreshToken|secret/iu);
  await expect(page.locator('body')).not.toContainText(/header\.payload\.signature|accessToken|refreshToken/u);
});

test('protected dashboard routes fail closed for an anonymous browser session', async ({ page }) => {
  const locale = localeForProject();
  const response = await page.goto(`/admin/settings/requests?lang=${encodeURIComponent(locale)}`);

  expect(response?.status()).toBe(200);
  await expect(page.locator('[data-state="permission"]')).toBeVisible();
  await expect(page.locator('.route-shell')).toHaveAttribute('data-auth-required', 'true');
  await expect(page.locator('body')).not.toContainText(/accessToken|refreshToken|storageKey|privateUrl|internalNotes|auditData/u);
});
