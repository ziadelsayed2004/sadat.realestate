import { expect, test } from '@playwright/test';

function localeForProject(): 'ar' | 'en' {
  const projectName = test.info().project.name;
  if (projectName.endsWith('-en')) return 'en';
  return 'ar';
}

function successMeta(requestId: string) {
  return { meta: { requestId } };
}

async function routeAuthApi(page: import('@playwright/test').Page) {
  await page.route('**/api/v1/auth/login', async route => {
    expect(route.request().method()).toBe('POST');
    const body = route.request().postDataJSON() as { email?: string; password?: string };
    expect(body).toEqual({ email: 'admin@example.com', password: 'secret' });
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          accessToken: 'header.payload.signature',
          tokenType: 'Bearer',
          expiresInSeconds: 900,
          user: { id: 'aaaaaaaaaaaaaaaaaaaaaaaa', roleType: 'admin', status: 'verified' }
        },
        ...successMeta('e2e-auth-login')
      })
    });
  });
  await page.route('**/api/v1/auth/otp/send', async route => {
    expect(route.request().method()).toBe('POST');
    const body = route.request().postDataJSON() as { email?: string; roleType?: string; purpose?: string };
    expect(body).toEqual({
      email: 'seeker@example.com', roleType: 'seeker', purpose: 'registration'
    });
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: { accepted: true, challengeId: '00000000-0000-4000-8000-000000000001', expiresInSeconds: 300, retryAfterSeconds: 30 },
        ...successMeta('e2e-auth-otp-send')
      })
    });
  });
  await page.route('**/api/v1/auth/otp/verify', async route => {
    expect(route.request().method()).toBe('POST');
    const body = route.request().postDataJSON() as { email?: string; roleType?: string; purpose?: string; challengeId?: string; code?: string };
    expect(body).toEqual({
      email: 'seeker@example.com',
      roleType: 'seeker',
      purpose: 'registration',
      challengeId: '00000000-0000-4000-8000-000000000001',
      code: '123456'
    });
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: { outcome: 'verified', verificationToken: 'A'.repeat(43), expiresInSeconds: 600, roleType: 'seeker' },
        ...successMeta('e2e-auth-otp-verify')
      })
    });
  });
}

test('login screen renders approved locale, direction, responsive shell, and safe navigation', async ({ page }) => {
  const locale = localeForProject();
  await routeAuthApi(page);
  const response = await page.goto(`/auth/login?lang=${encodeURIComponent(locale)}&returnTo=${encodeURIComponent('/auth/verify-email?purpose=registration')}`);

  expect(response?.ok()).toBeTruthy();
  await expect(page.locator('html')).toHaveAttribute('lang', locale);
  await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
  await expect(page.locator('.route-shell')).toHaveAttribute('data-route-id', 'auth');
  await expect(page.locator('[data-screen-id="AUTH-01"]')).toBeVisible();
  await expect(page.locator('#auth-login-email')).toHaveAttribute('autocomplete', 'email');
  await expect(page.locator('#auth-login-password')).toHaveAttribute('autocomplete', 'current-password');
  await expect(page.locator('.auth-card__logo')).toHaveAttribute('src', '/assets/sadat-real-estate-logo.png');

  await page.locator('#auth-login-email').fill('admin@example.com');
  await page.locator('#auth-login-password').fill('secret');
  await page.locator('[data-screen-id="AUTH-01"] button[type="submit"]').click();
  await expect(page).toHaveURL(/\/auth\/verify-email\?purpose=registration$/);
  await expect(page.locator('[data-screen-id="AUTH-04"]')).toBeVisible();
  await expect(page.locator('body')).not.toContainText('header.payload.signature');
});

test('email verification sends, cools down, focuses digits, and verifies without exposing authority', async ({ page }) => {
  const locale = localeForProject();
  await routeAuthApi(page);
  await page.goto(`/auth/verify-email?lang=${encodeURIComponent(locale)}&purpose=registration&roleType=seeker`);

  await page.locator('#auth-otp-email').fill('seeker@example.com');
  await page.locator('[data-screen-id="AUTH-04"] button[type="submit"]').click();
  await expect(page.locator('[data-screen-id="AUTH-05"]')).toBeVisible();
  await expect(page.locator('.auth-otp__digit').first()).toBeFocused();
  await expect(page.getByRole('button', { name: /30/ })).toBeDisabled();

  const digits = page.locator('.auth-otp__digit');
  await expect(digits).toHaveCount(6);
  for (let position = 0; position < 6; position += 1) {
    await digits.nth(position).fill(String(position + 1));
  }
  await page.locator('[data-screen-id="AUTH-05"] button[type="submit"]').click();
  await expect(page.locator('[data-screen-id="AUTH-05"] [data-state="success"]')).toBeVisible();
  await expect(page.locator('body')).toContainText(/verified|تم التحقق|验证/);
  await expect(page.locator('body')).not.toContainText('verificationToken');
});

test('legacy phone verification alias redirects in the browser without preserving phone identity', async ({ page }) => {
  const locale = localeForProject();
  await page.goto(`/auth/verify-phone?lang=${encodeURIComponent(locale)}&purpose=registration&roleType=seeker&phone=%2B201000000000`);
  await page.waitForURL(/\/auth\/verify-email\?/u);

  const redirectedUrl = new URL(page.url());
  expect(redirectedUrl.pathname).toBe('/auth/verify-email');
  expect(redirectedUrl.searchParams.get('lang')).toBe(locale);
  expect(redirectedUrl.searchParams.get('purpose')).toBe('registration');
  expect(redirectedUrl.searchParams.get('roleType')).toBe('seeker');
  await expect(page.locator('[data-screen-id="AUTH-04"]')).toBeVisible();
  await expect(page.locator('#auth-otp-email')).toBeVisible();
  await expect(page.locator('#auth-phone')).toHaveCount(0);
  await expect(page.url()).not.toContain('phone');
  await expect(page.locator('body')).not.toContainText('+201000000000');
});

test('auth controls expose keyboard focus and accessible labels', async ({ page }) => {
  const locale = localeForProject();
  await routeAuthApi(page);
  await page.goto(`/auth/verify-email?lang=${encodeURIComponent(locale)}&purpose=registration&roleType=seeker`);

  await page.keyboard.press('Tab');
  await expect(page.locator('.a11y-skip-link')).toBeFocused();
  await expect(page.locator('main#main-content')).toBeVisible();
  await expect(page.locator('#auth-otp-email')).toHaveAttribute('autocomplete', 'email');
  await expect(page.locator('#auth-role-type')).toHaveAttribute('name', 'roleType');
  await expect(page.locator('.auth-card__prompt a')).toHaveAttribute('href', '/auth/login');
});

test('auth login and OTP approved states have responsive visual baselines', async ({ page }) => {
  const locale = localeForProject();
  await routeAuthApi(page);
  await page.goto(`/auth/login?lang=${encodeURIComponent(locale)}`);
  await expect(page).toHaveScreenshot(`auth-login-${locale}.png`, { fullPage: true });

  await page.goto(`/auth/verify-email?lang=${encodeURIComponent(locale)}&purpose=registration&roleType=seeker`);
  await page.locator('#auth-otp-email').fill('seeker@example.com');
  await page.locator('[data-screen-id="AUTH-04"] button[type="submit"]').click();
  await expect(page.locator('[data-screen-id="AUTH-05"]')).toBeVisible();
  await page.locator('.auth-otp__digit').first().blur();
  await page.locator('.a11y-skip-link').evaluate((element) => {
    (element as HTMLElement).style.visibility = 'hidden';
  });
  await expect(page).toHaveScreenshot(`auth-otp-${locale}.png`, {
    fullPage: true,
    mask: [page.locator('.auth-otp__actions')]
  });
});
