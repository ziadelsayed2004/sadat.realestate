import { expect, test } from '@playwright/test';

function localeForProject(): 'ar' | 'en' | 'zh-CN' {
  const projectName = test.info().project.name;
  if (projectName.endsWith('-zh')) return 'zh-CN';
  if (projectName.endsWith('-en')) return 'en';
  return 'ar';
}

test('public route shell has a locale-aware visual snapshot', async ({ page }) => {
  const locale = localeForProject();
  const direction = locale === 'ar' ? 'rtl' : 'ltr';
  const response = await page.goto(`/properties?lang=${encodeURIComponent(locale)}`);

  expect(response?.ok()).toBeTruthy();
  await expect(page.locator('html')).toHaveAttribute('lang', locale);
  await expect(page.locator('html')).toHaveAttribute('dir', direction);
  await expect(page.locator('.route-shell')).toHaveAttribute('data-device-scope', 'desktop/tablet/mobile');
  const logo = page.locator('img.brand-image');
  await expect(logo).toBeVisible();
  await expect(logo).toHaveJSProperty('complete', true);
  await expect(logo).toHaveJSProperty('naturalWidth', 636);
  await expect(page).toHaveScreenshot(`public-properties-${locale}.png`, { fullPage: true });
});
