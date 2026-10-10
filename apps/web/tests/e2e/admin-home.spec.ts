import { expect, test } from '@playwright/test';
import { adminHomeBannerId, adminHomeSectionId, adminHomeTipId, routeAdminHomeApis } from './admin-home.fixtures.ts';
import { getBannerControlCopy } from '../../src/features/admin_home/banner-controls-copy.ts';

function localeForProject(): 'ar' | 'en' {
  const project = test.info().project.name;
  return project.endsWith('-en') ? 'en' : 'ar';
}

test.describe('ADM-46 through ADM-49 homepage administration', () => {
  test('shows the advertising placement codes and the matching administration settings', async ({ page }, testInfo) => {
    const locale = localeForProject();
    const copy = getBannerControlCopy(locale);
    await page.route('**/api/v1/admin/banners/config', route => route.fulfill({ json: { data: { enabled: true, version: 1, placements: [{ key: 'homepage.hero', label: { ar: 'بانر الرئيسية', en: 'Homepage banner' }, active: true }, { key: 'search.sidebar', label: { ar: 'جانب البحث', en: 'Search sidebar' }, active: false }] }, meta: { requestId: 'placement-guide' } } }));
    await page.goto(`/admin/banners?lang=${locale}#banner-placements`);
    const placements = page.locator('#banner-placements');
    await expect(placements.getByRole('heading', { name: copy.placementsTitle })).toBeVisible();
    await expect(placements.getByRole('row', { name: /homepage.hero/u })).toContainText(copy.placementActive);
    await expect(placements.getByRole('row', { name: /search.sidebar/u })).toContainText(copy.placementInactive);
    await expect(placements.getByRole('link', { name: copy.advertisingSettings })).toHaveAttribute('href', `/admin/settings/advertising?lang=${locale}`);
    await page.screenshot({ path: testInfo.outputPath('advertising-placement-codes.png'), fullPage: true });
  });
  test('uploads, schedules, edits, stops and archives a banner', async ({ page }) => {
    const locale = localeForProject();
    const copy = getBannerControlCopy(locale);
    await page.goto(`/admin/banners/new?lang=${locale}`);
    await page.locator('#admin-home-banner-title-en').fill('Scheduled device banner');
    await page.locator('#admin-home-banner-start').fill('2030-01-01');
    await page.locator('#admin-home-banner-end').fill('2030-01-02');
    await page.locator('#admin-home-banner-file').setInputFiles({ name: 'banner.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64') });
    await page.locator('#admin-home-banner-reason').fill('Create scheduled banner');
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('.admin-home__feedback[role="status"]')).toContainText(copy.draftSaved);
    await page.getByRole('button', { name: copy.publish, exact: true }).click();
    await expect(page.locator('.admin-home__feedback[role="status"]')).toContainText(copy.published);
    await page.goto(`/admin/banners?lang=${locale}`);
    const row = page.getByTestId(`admin-home-banner-${adminHomeBannerId}`);
    await row.getByRole('button', { name: copy.edit, exact: true }).click();
    await page.locator('#admin-home-banner-title-en').fill('Edited scheduled banner');
    await page.locator('#admin-home-banner-reason').fill('Correct banner title');
    await page.locator('button[type="submit"]').click();
    await expect(row).toContainText('Edited scheduled banner');
    await row.getByRole('button', { name: copy.stop, exact: true }).click();
    await expect(row.getByRole('button', { name: copy.publish, exact: true })).toBeVisible();
    await row.getByRole('button', { name: copy.archive, exact: true }).click();
    await page.getByRole('button', { name: copy.confirm, exact: true }).click();
    await expect(row.getByRole('button', { name: copy.edit, exact: true })).toHaveCount(0);
  });
  test.beforeEach(async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'design-source', description: 'ADM-46 docs/design_sources/final_screens/admin/ADM-46.png; ADM-47 ADM-47.png; ADM-48 ADM-48.png; ADM-49 ADM-49.png; approved desktop scope, Drive folders and Figma prototype node 6017:61879.' });
    test.skip(!testInfo.project.name.includes('desktop'), 'Admin dashboard is approved for desktop only.');
    await routeAdminHomeApis(page);
  });

  test('renders each approved route with locale direction and safe projections', async ({ page }) => {
    const locale = localeForProject();
    const routes = [
      ['/admin/banners', 'ADM-46', `admin-home-banner-${adminHomeBannerId}`],
      ['/admin/banners/new', 'ADM-47', 'admin-home-banner-editor'],
      ['/admin/content/tips', 'ADM-48', `admin-home-tips-${adminHomeTipId}`],
      ['/admin/content/homepage', 'ADM-49', `admin-home-homepage-${adminHomeSectionId}`]
    ] as const;
    for (const [path, screenId, testId] of routes) {
      await page.goto(`${path}?lang=${encodeURIComponent(locale)}`, { waitUntil: 'domcontentloaded' });
      await expect(page.locator(`[data-screen-id="${screenId}"]`)).toBeVisible();
      await expect(page.getByTestId(testId)).toBeVisible();
      await expect(page.locator('main#main-content')).toBeVisible();
      await expect(page.locator('.admin-dashboard__navigation[aria-label]')).toBeVisible();
      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
      await expect(page.locator('body')).not.toContainText(/accessToken|refreshToken|storageKey|privateUrl|internalNotes|assignedTo|auditData/u);
    }
  });

  test('requires localized title and creates a banner through the implemented routes', async ({ page }) => {
    const locale = localeForProject();
    await page.goto(`/admin/banners/new?lang=${encodeURIComponent(locale)}`);
    await page.locator('#admin-home-banner-title-en').fill('New homepage banner');
    await page.locator('#admin-home-banner-start').fill('2026-08-20');
    await page.locator('#admin-home-banner-start-time').fill('10:00');
    await page.locator('#admin-home-banner-end').fill('2026-09-20');
    await page.locator('#admin-home-banner-end-time').fill('10:00');
    const create = page.waitForRequest(request => request.method() === 'POST' && request.url().endsWith('/api/v1/admin/banners'));
    await page.getByRole('button', { name: /save|حفظ|保存/iu }).click();
    await create;
    await expect(page.locator('.admin-home__feedback[role="status"]')).toContainText(/saved|\u062a\u0645.*\u062d\u0641\u0638|تم الحفظ|已保存/iu);
  });

  test('fails closed when the administrator session cannot refresh', async ({ page }) => {
    await routeAdminHomeApis(page, false);
    await page.goto('/admin/content/tips?lang=en');
    await expect(page.locator('[data-state="permission"]')).toBeVisible();
  });

  test('accepts date-only entry with complete default times', async ({ page }) => {
    const locale = localeForProject();
    await page.goto(`/admin/banners/new?lang=${encodeURIComponent(locale)}`);
    await page.locator('#admin-home-banner-title-en').fill('Date picker banner');
    await page.locator('#admin-home-banner-start').fill('2026-10-05');
    await page.locator('#admin-home-banner-end').fill('2026-10-06');
    await expect(page.locator('#admin-home-banner-start-time')).toHaveValue('');
    await expect(page.locator('#admin-home-banner-end-time')).toHaveValue('');
    const create = page.waitForRequest(request => request.method() === 'POST' && request.url().endsWith('/api/v1/admin/banners'));
    await page.getByRole('button', { name: /save|حفظ/iu }).click();
    await create;
    await expect(page.locator('.admin-home__feedback[role="status"]')).toContainText(/saved|\u062a\u0645.*\u062d\u0641\u0638|تم الحفظ/iu);
  });
});
