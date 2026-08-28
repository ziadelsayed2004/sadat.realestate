import { expect, test } from '@playwright/test';

const VERIFICATION_TOKEN = 'A'.repeat(43);

function localeForProject(): 'ar' | 'en' | 'zh-CN' {
  const projectName = test.info().project.name;
  if (projectName.endsWith('-zh')) return 'zh-CN';
  if (projectName.endsWith('-en')) return 'en';
  return 'ar';
}

function successMeta(requestId: string) {
  return { meta: { requestId } };
}

async function routeRegistrationApi(page: import('@playwright/test').Page) {
  await page.route('**/api/v1/auth/otp/send', async route => {
    expect(route.request().method()).toBe('POST');
    expect(route.request().postDataJSON()).toEqual({
      email: 'seeker@example.com',
      roleType: 'seeker',
      purpose: 'registration'
    });
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: { accepted: true, challengeId: '00000000-0000-4000-8000-000000000001', expiresInSeconds: 300, retryAfterSeconds: 30 },
        ...successMeta('e2e-seeker-registration-otp-send')
      })
    });
  });

  await page.route('**/api/v1/auth/otp/verify', async route => {
    expect(route.request().method()).toBe('POST');
    expect(route.request().postDataJSON()).toEqual({
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
        data: { outcome: 'verified', verificationToken: VERIFICATION_TOKEN, expiresInSeconds: 600, roleType: 'seeker' },
        ...successMeta('e2e-seeker-registration-otp-verify')
      })
    });
  });

  await page.route('**/api/v1/auth/register/seeker', async route => {
    expect(route.request().method()).toBe('POST');
    expect(route.request().postDataJSON()).toEqual({
      verificationToken: VERIFICATION_TOKEN,
      firstName: 'Mona',
      lastName: 'Hassan',
      locale: localeForProject()
    });
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          outcome: 'registered',
          session: {
            accessToken: 'header.payload.signature',
            tokenType: 'Bearer',
            expiresInSeconds: 900,
            user: { id: 'aaaaaaaaaaaaaaaaaaaaaaaa', roleType: 'seeker', status: 'verified' }
          }
        },
        ...successMeta('e2e-seeker-registration-create')
      })
    });
  });
}

async function hideSkipLink(page: import('@playwright/test').Page): Promise<void> {
  await page.locator('.a11y-skip-link').evaluate((element) => {
    (element as HTMLElement).style.visibility = 'hidden';
  });
}

async function chooseSeeker(page: import('@playwright/test').Page): Promise<void> {
  await page.locator('[data-screen-id="AUTH-02"] .auth-role-card').first().click();
  await expect(page.locator('[data-screen-id="AUTH-02"] .auth-role-card').first()).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: /continue|متابعة|继续/iu }).click();
  await expect(page).toHaveURL(/\/auth\/verify-email\?purpose=registration&roleType=seeker$/u);
}

async function completeVerification(page: import('@playwright/test').Page, locale: 'ar' | 'en' | 'zh-CN'): Promise<void> {
  await page.locator('#auth-otp-email').fill('seeker@example.com');
  await page.getByRole('button', { name: /send code|إرسال الرمز|发送验证码/iu }).click();
  await expect(page.locator('[data-screen-id="AUTH-05"]')).toBeVisible();

  const digits = page.locator('.auth-otp__digit');
  await expect(digits).toHaveCount(6);
  for (let position = 0; position < 6; position += 1) {
    await digits.nth(position).fill(String(position + 1));
  }
  await page.getByRole('button', { name: /verify code|تأكيد الرمز|验证验证码/iu }).click();
  await expect(page.locator('[data-screen-id="AUTH-03"]')).toBeVisible();
  await expect(page).toHaveURL(/\/auth\/register\/seeker$/u);
  await expect(page.locator('#auth-registration-email')).toHaveValue('seeker@example.com');
  await expect(page.locator('body')).not.toContainText(VERIFICATION_TOKEN);
  await expect(page.locator('body')).not.toContainText('verificationToken');
  await expect(page).toHaveTitle(/.+/u);
  void locale;
}

test('seeker registration follows the verified OTP authority through the implemented API and reaches truthful success', async ({ page }) => {
  const locale = localeForProject();
  await routeRegistrationApi(page);
  await page.goto(`/auth/register?lang=${encodeURIComponent(locale)}`);
  await expect(page.locator('html')).toHaveAttribute('lang', locale);
  await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
  await expect(page.locator('[data-screen-id="AUTH-02"]')).toBeVisible();

  await chooseSeeker(page);
  await completeVerification(page, locale);

  await page.getByLabel(/first name|الاسم الأول|名字/iu).fill('Mona');
  await page.getByLabel(/last name|اسم العائلة|姓氏/iu).fill('Hassan');
  await page.getByRole('button', { name: /create account|إنشاء الحساب|创建账号/iu }).click();
  await expect(page.locator('[data-screen-id="AUTH-06"]')).toBeVisible();
  await expect(page).toHaveURL(/\/auth\/register\/seeker\/success$/u);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('body')).not.toContainText(VERIFICATION_TOKEN);
  await expect(page.locator('body')).not.toContainText('verificationToken');
  await expect(page.url()).not.toContain(VERIFICATION_TOKEN);
});

test('seeker registration controls support keyboard focus and accessible form labels', async ({ page }) => {
  const locale = localeForProject();
  await routeRegistrationApi(page);
  await page.goto(`/auth/register?lang=${encodeURIComponent(locale)}`);
  await expect(page.locator('[data-screen-id="AUTH-02"]')).toBeVisible();

  const seekerCard = page.locator('[data-screen-id="AUTH-02"] .auth-role-card').first();
  await seekerCard.focus();
  await expect(seekerCard).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(seekerCard).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: /continue|متابعة|继续/iu }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#auth-otp-email')).toHaveAttribute('autocomplete', 'email');

  await completeVerification(page, locale);
  await expect(page.getByLabel(/first name|الاسم الأول|名字/iu)).toHaveAttribute('autocomplete', 'given-name');
  await expect(page.getByLabel(/last name|اسم العائلة|姓氏/iu)).toHaveAttribute('autocomplete', 'family-name');
});

test('seeker registration role, form, and success states have responsive visual baselines', async ({ page }) => {
  const locale = localeForProject();
  await routeRegistrationApi(page);
  await page.goto(`/auth/register?lang=${encodeURIComponent(locale)}`);
  await hideSkipLink(page);
  await expect(page).toHaveScreenshot(`seeker-registration-role-${locale}.png`, { fullPage: true });

  await chooseSeeker(page);
  await completeVerification(page, locale);
  await hideSkipLink(page);
  await expect(page).toHaveScreenshot(`seeker-registration-form-${locale}.png`, { fullPage: true });

  await page.getByLabel(/first name|الاسم الأول|名字/iu).fill('Mona');
  await page.getByLabel(/last name|اسم العائلة|姓氏/iu).fill('Hassan');
  await page.getByRole('button', { name: /create account|إنشاء الحساب|创建账号/iu }).click();
  await expect(page.locator('[data-screen-id="AUTH-06"]')).toBeVisible();
  await hideSkipLink(page);
  await expect(page).toHaveScreenshot(`seeker-registration-success-${locale}.png`, { fullPage: true });
});
