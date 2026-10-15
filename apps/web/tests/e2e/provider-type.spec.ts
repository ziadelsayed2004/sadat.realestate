import { expect, test } from '@playwright/test';
import { getProviderTypeCopy } from '../../src/features/provider_auth/copy.ts';

const PASSWORD = 'Provider1!';

function localeForProject(): 'ar' | 'en' {
  const projectName = test.info().project.name;
  if (projectName.endsWith('-en')) return 'en';
  return 'ar';
}

async function hideSkipLink(page: import('@playwright/test').Page): Promise<void> {
  await expect(page.locator('.a11y-skip-link')).toHaveCount(0);
}

test('provider type selection renders the approved contract options and safe direction', async ({ page }) => {
  const locale = localeForProject();
  await page.goto(`/auth/register/provider/type?lang=${encodeURIComponent(locale)}`);

  await expect(page.locator('html')).toHaveAttribute('lang', locale);
  await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
  await expect(page.locator('[data-screen-id="AUTH-07"]')).toBeVisible();
  await expect(page.locator('[data-provider-type]')).toHaveCount(3);
  await expect(page.getByRole('button', { name: /continue|متابعة|继续/iu })).toBeDisabled();
  await expect(page.locator('body')).not.toContainText(/verificationToken|accessToken/iu);
});

test('provider type selection supports keyboard choice and preserves only the selected type', async ({ page }) => {
  const locale = localeForProject();
  await page.goto(`/auth/register/provider/type?lang=${encodeURIComponent(locale)}`);

  const developerCard = page.locator('[data-provider-type="developer_company"]');
  await developerCard.focus();
  await expect(developerCard).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-screen-id="AUTH-08"]')).toBeVisible();
  await expect(developerCard).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#provider-registration-password').fill(PASSWORD);
  await page.locator('#provider-registration-password-confirmation').fill(PASSWORD);
  await expect(page.getByRole('button', { name: /continue|متابعة|继续/iu })).toBeEnabled();

  await Promise.all([
    page.waitForURL(/\/auth\/verify-email\?purpose=registration&roleType=provider&lang=.*&providerType=developer_company/u),
    page.getByRole('button', { name: /continue|متابعة|继续/iu }).click()
  ]);
  expect(new URL(page.url()).searchParams.get('providerType')).toBe('developer_company');
  expect(new URL(page.url()).searchParams.get('verificationToken')).toBeNull();
  expect(page.url()).not.toContain('verificationToken');
});

test('shows password rule and confirmation errors before allowing provider registration', async ({ page }, info) => {
  const locale = localeForProject();
  const copy = getProviderTypeCopy(locale);
  await page.goto(`/auth/register/provider/type?lang=${locale}`);
  await page.locator('[data-provider-type="developer_company"]').click();
  const password = page.locator('#provider-registration-password');
  const confirmation = page.locator('#provider-registration-password-confirmation');
  const next = page.getByRole('button', { name: copy.continueAction, exact: true });
  await expect(page.getByRole('alert')).toHaveCount(0);
  await password.fill('Ab1!');
  await confirmation.fill('Different1!');
  await expect(password).toHaveAttribute('aria-invalid', 'true');
  await expect(confirmation).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#provider-registration-password-message')).toHaveText(copy.passwordInvalid);
  await expect(page.locator('#provider-registration-password-confirmation-message')).toHaveText(copy.passwordMismatch);
  await expect(next).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await hideSkipLink(page);
  await page.locator('.provider-type-card .auth-form').screenshot({ path: info.outputPath('password-validation.png') });
  await password.fill(PASSWORD);
  await expect(password).not.toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#provider-registration-password-message')).toHaveCount(0);
  await expect(next).toBeDisabled();
  await confirmation.fill(PASSWORD);
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(next).toBeEnabled();
  await next.click();
  await expect(page).toHaveURL(/\/auth\/verify-email\?purpose=registration&roleType=provider&lang=.*&providerType=developer_company/u);
  expect(page.url()).not.toContain(PASSWORD);
});

test('provider type default and selected screens have responsive visual baselines', async ({ page }) => {
  const locale = localeForProject();
  await page.goto(`/auth/register/provider/type?lang=${encodeURIComponent(locale)}`);
  await hideSkipLink(page);
  await expect(page).toHaveScreenshot(`provider-type-default-${locale}.png`, { fullPage: true });

  await page.locator('[data-provider-type="brokerage_office"]').click();
  await expect(page.locator('[data-screen-id="AUTH-08"]')).toBeVisible();
  await expect(page.locator('[data-provider-type="brokerage_office"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page).toHaveScreenshot(`provider-type-selected-${locale}.png`, {
    fullPage: true,
    maxDiffPixels: 300
  });
});
