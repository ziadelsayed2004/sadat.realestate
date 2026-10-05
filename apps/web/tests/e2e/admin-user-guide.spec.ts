import { expect, test } from '@playwright/test';
import { getUserGuideCopy } from '../../src/features/admin_user_guide/copy.ts';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/v1/auth/refresh', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { accessToken: 'guide.local.qa', tokenType: 'Bearer', expiresInSeconds: 900, user: { id: 'cccccccccccccccccccccccc', roleType: 'admin', status: 'verified' } }, meta: { requestId: 'guide-local-refresh' } }) }));
});

test('searches, filters, expands, shares a deep link and restores saved reading state', async ({ page }, testInfo) => {
  const locale = testInfo.project.name.endsWith('-en') ? 'en' : 'ar';
  const copy = getUserGuideCopy(locale);
  await page.goto(`/admin/user-guide?lang=${locale}`);
  await expect(page.getByTestId('admin-user-guide')).toBeVisible();
  await expect(page.locator('.admin-dashboard__navigation a[data-active="true"]')).toHaveAttribute('href', `/admin/user-guide?lang=${locale}`);
  await page.getByLabel(copy.search, { exact: true }).fill('homepage.hero');
  await expect(page.locator('#guide-toggle-banner-create')).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#guide-banner-create')).toContainText('نشر / جدولة');
  await page.getByRole('button', { name: copy.clear, exact: true }).click();
  await page.getByLabel(copy.category, { exact: true }).selectOption('content');
  await page.getByRole('button', { name: copy.openAll, exact: true }).click();
  await expect(page.locator('#guide-body-team')).toBeVisible();
  await expect(page.locator('#guide-banner-create')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('#guide-toggle-team')).toHaveAttribute('aria-expanded', 'true');
  await page.goto(`/admin/user-guide?lang=${locale}#guide-commission-account`);
  await expect(page.locator('#guide-toggle-commission-account')).toBeFocused();
  await expect(page.locator('#guide-body-commission-account .user-guide__limit')).toContainText('لا توفر تعديل سجل سابق');
  await expect(page.locator('#guide-body-commission-account .user-guide__links a').first()).toHaveAttribute('href', `/admin/commissions/account?lang=${locale}`);
});

test('supports maximize, keyboard containment, Escape, minimize and print on desktop and mobile', async ({ page }, testInfo) => {
  const locale = testInfo.project.name.endsWith('-en') ? 'en' : 'ar';
  const copy = getUserGuideCopy(locale);
  await page.goto(`/admin/user-guide?lang=${locale}#guide-banner-create`);
  const maximize = page.getByRole('button', { name: copy.maximize, exact: true });
  await maximize.click();
  await expect(page.getByRole('dialog', { name: copy.title })).toBeVisible();
  await expect(page.getByRole('button', { name: copy.restore, exact: true })).toBeFocused();
  await page.locator('.user-guide').evaluate(element => {
    const focusable = [...element.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input,select')].filter(item => !item.closest('[hidden]'));
    focusable.at(-1)?.focus();
  });
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: copy.minimize, exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(maximize).toBeFocused();
  await page.getByRole('button', { name: copy.minimize, exact: true }).click();
  await expect(page.locator('#user-guide-reading')).toBeHidden();
  await page.getByRole('button', { name: copy.expand, exact: true }).click();
  await expect(page.locator('#user-guide-reading')).toBeVisible();
  await page.getByLabel(copy.category, { exact: true }).selectOption('banners');
  await page.getByRole('button', { name: copy.closeAll, exact: true }).click();
  await expect(page.locator('#guide-body-banner-create')).toBeHidden();
  const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(horizontalOverflow).toBe(false);
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('#guide-body-banner-create')).toBeVisible();
  await expect(page.locator('.user-guide__toolbar')).toBeHidden();
  await page.emulateMedia({ media: 'screen' });
  await page.locator('#guide-toggle-banner-create').click();
  await page.locator('.user-guide').evaluate(element => element.scrollIntoView({ block: 'start' }));
  await page.screenshot({ path: testInfo.outputPath('user-guide.png'), fullPage: false });
});
