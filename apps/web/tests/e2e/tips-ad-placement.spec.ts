import { expect, test } from '@playwright/test';
import { routeAdminHomeApis } from './admin-home.fixtures.ts';
import { getAdminHomeCopy } from '../../src/features/admin_home/copy.ts';

test('creates a tip with optional order and keeps the editor within the viewport', async ({ page }, info) => {
  const locale = info.project.name.endsWith('-ar') ? 'ar' : 'en';
  const copy = getAdminHomeCopy(locale);
  await routeAdminHomeApis(page);
  await page.goto(`/admin/content/tips?lang=${locale}`);
  await page.getByRole('button', { name: copy.add, exact: true }).click();
  const editor = page.getByTestId('admin-home-tips-editor');
  const order = editor.locator('#admin-home-tips-order');
  await expect(order).toHaveValue('');
  await expect(order).not.toHaveAttribute('required');
  await editor.locator('#admin-home-tips-key').fill('last_tip');
  await editor.locator(`#admin-home-tips-title-${locale}`).fill(locale === 'ar' ? 'نصيحة جديدة' : 'New advice');
  await editor.locator(`#admin-home-tips-body-${locale}`).fill(locale === 'ar' ? 'راجع مستندات العقار قبل الشراء.' : 'Check the property documents before buying.');
  await editor.locator('#admin-home-tips-reason').fill('Add reviewed advice');
  await editor.scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath('optional-tip-order.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  const saved = page.waitForRequest(request => request.method() === 'PUT' && request.url().includes('/admin/content/tips'));
  await editor.locator('button[type="submit"]').click();
  expect((await saved).postDataJSON()).not.toHaveProperty('order');
  await expect(editor).not.toBeVisible();
});

test('shows the exact homepage section beside each ad editor in both screen sizes', async ({ page }, info) => {
  const ar = info.project.name.endsWith('-ar'), locale = ar ? 'ar' : 'en';
  await routeAdminHomeApis(page);
  await page.route('**/api/v1/admin/banners/featured-options*', route => route.fulfill({ json: { data: { canManage: true, advertisers: [], destinations: [] }, meta: { requestId: 'placements' } } }));
  await page.goto(`/admin/banners/new?lang=${locale}`);
  const hero = page.locator('.ad-placement-guide');
  await expect(hero.locator('[data-selected]')).toHaveText(ar ? /بانر أعلى الرئيسية/ : /Homepage hero banner/);
  await expect(hero.getByRole('link')).toHaveAttribute('href', `/?lang=${locale}#homepage-hero`);
  await hero.scrollIntoViewIfNeeded();
  await hero.screenshot({ path: info.outputPath('hero-location.png') });
  await page.goto(`/admin/ads/featured?lang=${locale}`);
  await page.getByRole('button', { name: ar ? 'إضافة إعلان مميز' : 'Add featured ad', exact: true }).click();
  const featured = page.locator('.ad-placement-guide');
  await expect(featured.locator('[data-selected]')).toHaveText(ar ? /إعلانات الرئيسية المميزة/ : /Featured homepage ads/);
  await expect(featured.getByRole('link')).toHaveAttribute('href', `/?lang=${locale}#homepage-featured`);
  await featured.scrollIntoViewIfNeeded();
  await featured.screenshot({ path: info.outputPath('featured-location.png') });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});
