import { expect, test } from '@playwright/test';

function localeForProject(): 'ar' | 'en' {
  const projectName = test.info().project.name;
  if (projectName.endsWith('-en')) return 'en';
  return 'ar';
}

async function hideSkipLink(page: import('@playwright/test').Page): Promise<void> {
  await page.locator('.a11y-skip-link').evaluate((element) => {
    (element as HTMLElement).style.visibility = 'hidden';
  });
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
  await expect(page.getByRole('button', { name: /continue|متابعة|继续/iu })).toBeEnabled();

  await Promise.all([
    page.waitForURL(/\/auth\/verify-email\?purpose=registration&roleType=provider&lang=.*&providerType=developer_company/u),
    page.getByRole('button', { name: /continue|متابعة|继续/iu }).click()
  ]);
  expect(new URL(page.url()).searchParams.get('providerType')).toBe('developer_company');
  expect(new URL(page.url()).searchParams.get('verificationToken')).toBeNull();
  expect(page.url()).not.toContain('verificationToken');
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
