import { expect, test } from '@playwright/test';

const VERIFICATION_TOKEN = 'V'.repeat(43);
const ACCESS_TOKEN = 'header.payload.signature';
const EMAIL = 'provider@example.com';
const PASSWORD = 'Provider1!';
const APPLICATION_ID = 'a'.repeat(24);
const USER_ID = 'b'.repeat(24);

function localeForProject(): 'ar' | 'en' {
  const projectName = test.info().project.name;
  if (projectName.endsWith('-en')) return 'en';
  return 'ar';
}

function application(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: APPLICATION_ID,
    providerType: 'developer_company',
    status: 'draft',
    version: 0,
    requirementVersion: '2026-08-13.1',
    email: 'provider@example.com',
    missingFields: ['accountOwnerFullName', 'displayName', 'email', 'primaryLocationId', 'serviceAreaIds', 'preferredLocale', 'termsAcceptedAt', 'privacyAcceptedAt'],
    missingDocuments: [],
    availableActions: ['edit_account', 'edit_company', 'submit', 'view_status'],
    createdAt: '2026-08-13T00:00:00.000Z',
    updatedAt: '2026-08-13T00:00:00.000Z',
    ...overrides
  };
}

function envelope(data: unknown): string {
  return JSON.stringify({ data, meta: { requestId: 'provider-account-e2e' } });
}

async function hideSkipLink(page: import('@playwright/test').Page): Promise<void> {
  await page.locator('.a11y-skip-link').evaluate((element) => {
    (element as HTMLElement).style.visibility = 'hidden';
  });
}

async function mockProviderApplicationApi(page: import('@playwright/test').Page): Promise<void> {
  let savedApplication = application();

  await page.route('**/api/v1/auth/otp/send', async route => {
    const body = route.request().postDataJSON() as Record<string, unknown>;
    expect(body).toMatchObject({ roleType: 'provider', purpose: 'registration', email: EMAIL });
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: envelope({
        accepted: true,
        challengeId: '00000000-0000-4000-8000-000000000001',
        expiresInSeconds: 300,
        retryAfterSeconds: 1
      })
    });
  });

  await page.route('**/api/v1/auth/otp/verify', async route => {
    const body = route.request().postDataJSON() as Record<string, unknown>;
    expect(body).toMatchObject({ roleType: 'provider', purpose: 'registration', email: EMAIL, code: '123456' });
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: envelope({ outcome: 'verified', verificationToken: VERIFICATION_TOKEN, expiresInSeconds: 600, roleType: 'provider' })
    });
  });

  await page.route('**/api/v1/provider/application', async route => {
    const request = route.request();
    if (request.method() === 'POST') {
      const body = request.postDataJSON() as Record<string, unknown>;
      expect(body).toEqual({ verificationToken: VERIFICATION_TOKEN, providerType: 'developer_company', password: PASSWORD });
      savedApplication = application();
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        headers: { 'set-cookie': 'sadat_refresh=test; Path=/; HttpOnly' },
        body: envelope({
          outcome: 'registered_draft',
          session: {
            accessToken: ACCESS_TOKEN,
            tokenType: 'Bearer',
            expiresInSeconds: 900,
            user: { id: USER_ID, roleType: 'provider', status: 'draft' }
          },
          application: savedApplication
        })
      });
      return;
    }

    expect(request.method()).toBe('GET');
    expect(request.headers().authorization).toBe(`Bearer ${ACCESS_TOKEN}`);
    await route.fulfill({ status: 200, contentType: 'application/json', body: envelope(savedApplication) });
  });

  await page.route('**/api/v1/provider/application/account', async route => {
    const request = route.request();
    expect(request.method()).toBe('PATCH');
    expect(request.headers().authorization).toBe(`Bearer ${ACCESS_TOKEN}`);
    const body = request.postDataJSON() as Record<string, unknown>;
    expect(body).not.toHaveProperty('password');
    expect(body).not.toHaveProperty('verificationToken');
    savedApplication = application({
      version: Number(body.version) + 1,
      accountOwnerFullName: body.accountOwnerFullName,
      displayName: body.displayName,
      email: body.email,
      whatsappNumber: body.whatsappNumber,
      preferredLocale: body.preferredLocale,
      termsAcceptedAt: body.termsAcceptedAt,
      privacyAcceptedAt: body.privacyAcceptedAt,
      missingFields: ['primaryLocationId', 'serviceAreaIds']
    });
    await route.fulfill({ status: 200, contentType: 'application/json', body: envelope(savedApplication) });
  });
}

async function reachAccountDetails(page: import('@playwright/test').Page, locale: string): Promise<void> {
  await page.goto(`/auth/register/provider/type?lang=${encodeURIComponent(locale)}`);
  await page.locator('[data-provider-type="developer_company"]').click();
  await page.locator('#provider-registration-password').fill(PASSWORD);
  await page.locator('#provider-registration-password-confirmation').fill(PASSWORD);
  await page.getByRole('button', { name: /continue|متابعة|继续/iu }).click();
  await expect(page.locator('[data-screen-id="AUTH-04"]')).toBeVisible();
  await page.locator('#auth-otp-email').fill(EMAIL);
  await page.locator('[data-screen-id="AUTH-04"] button[type="submit"]').click();
  await expect(page.locator('[data-screen-id="AUTH-05"]')).toBeVisible();
  for (let position = 0; position < 6; position += 1) {
    await page.locator('.auth-otp__digit').nth(position).fill(String(position + 1));
  }
  await page.locator('[data-screen-id="AUTH-05"] button[type="submit"]').click();
  await expect(page.locator('[data-screen-id="AUTH-09"]')).toBeVisible();
}

test('provider account details saves a strict patch and resumes with the server projection', async ({ page }) => {
  const locale = localeForProject();
  await mockProviderApplicationApi(page);
  await reachAccountDetails(page, locale);

  await expect(page.locator('html')).toHaveAttribute('lang', locale);
  await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
  await page.locator('#provider-account-owner-name').fill('Mona Hassan');
  await page.locator('#provider-account-display-name').fill('Mona Properties');
  await page.locator('#provider-account-email').fill('Mona@Example.com');
  await page.locator('.provider-account-checkbox input').nth(0).check();
  await page.locator('#provider-account-locale').selectOption('en');
  await page.locator('.provider-account-consents input').nth(0).check();
  await page.locator('.provider-account-consents input').nth(1).check();
  await page.locator('.provider-account-actions button').nth(0).click();

  await expect(page.locator('.ui-state-message[data-state="success"]')).toBeVisible();
  await expect(page.locator('[data-screen-id="AUTH-09+"]')).toBeVisible();
  await expect(page).not.toHaveURL(/verificationToken|accessToken/iu);
  await expect(page.locator('body')).not.toContainText(VERIFICATION_TOKEN);
  await expect(page.locator('body')).not.toContainText(ACCESS_TOKEN);

  await page.locator('.provider-account-actions button').nth(1).click();
  await expect(page.locator('[data-testid="provider-organization-details"]')).toBeVisible();
  await expect(page.locator('[data-screen-id="AUTH-11"]')).toBeVisible();
});

test('provider account default and filled variants have responsive visual baselines', async ({ page }) => {
  const locale = localeForProject();
  await mockProviderApplicationApi(page);
  await reachAccountDetails(page, locale);
  await hideSkipLink(page);
  await expect(page).toHaveScreenshot(`provider-account-default-${locale}.png`, { fullPage: true });

  await page.locator('#provider-account-owner-name').fill('Mona Hassan');
  await page.locator('#provider-account-display-name').fill('Mona Properties');
  await page.locator('#provider-account-email').fill('mona@example.com');
  await page.locator('.provider-account-consents input').nth(0).check();
  await page.locator('.provider-account-consents input').nth(1).check();
  await expect(page.locator('[data-screen-id="AUTH-09+"]')).toBeVisible();
  await expect(page).toHaveScreenshot(`provider-account-filled-${locale}.png`, { fullPage: true });
});

test('provider account deep link fails closed without an authenticated provider session', async ({ page }) => {
  const locale = localeForProject();
  await page.route('**/api/v1/provider/application', async route => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          messageKey: 'errors.auth.authenticationRequired',
          details: [],
          requestId: 'provider-account-deep-link'
        }
      })
    });
  });
  await page.route('**/api/v1/auth/refresh', async route => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({
        error: {
          code: 'INVALID_REFRESH_TOKEN',
          messageKey: 'errors.auth.invalidRefreshToken',
          details: [],
          requestId: 'provider-account-refresh'
        }
      })
    });
  });
  await page.goto(`/auth/register/provider/account?providerType=individual_broker&lang=${encodeURIComponent(locale)}`);
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.locator('body')).not.toContainText(/verificationToken|accessToken/iu);
});

test('provider account form exposes accessible labels, keyboard order, and validation errors', async ({ page }) => {
  const locale = localeForProject();
  await mockProviderApplicationApi(page);
  await reachAccountDetails(page, locale);

  const form = page.locator('form.provider-account-form');
  for (const id of [
    'provider-account-owner-name',
    'provider-account-display-name',
    'provider-account-email',
    'provider-account-whatsapp',
    'provider-account-locale'
  ]) {
    await expect(form.locator(`label[for="${id}"]`)).toHaveCount(1);
  }
  await expect(form.locator('[id*="phone"], [name*="phone"]')).toHaveCount(0);
  await expect(form.getByRole('checkbox')).toHaveCount(2);
  await expect(form.getByRole('checkbox', { name: /.+/ })).toHaveCount(2);

  await page.locator('#provider-account-owner-name').focus();
  await page.keyboard.press('Tab');
  await expect(page.locator('#provider-account-display-name')).toBeFocused();

  await form.locator('.provider-account-actions button').nth(1).click();
  await expect(page.locator('#provider-account-owner-name')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#provider-account-display-name')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#provider-account-email')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('.provider-account-missing[role="status"]')).toBeVisible();
});
