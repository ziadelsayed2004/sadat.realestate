import { expect, test } from '@playwright/test';
import { adminHomeBannerFixture, adminHomeBannerId, routeAdminHomeApis } from './admin-home.fixtures.ts';
import { getBannerControlCopy } from '../../src/features/admin_home/banner-controls-copy.ts';
import { getAdminHomeCopy } from '../../src/features/admin_home/copy.ts';

const requestId = '6ac78353462f103b89499896';

test('placement controls fit the screen and preserve the other placement and global display', async ({ page }, info) => {
  const locale = info.project.name.endsWith('-ar') ? 'ar' : 'en';
  await routeAdminHomeApis(page);
  let config = { enabled: false, version: 2, placements: [{ key: 'homepage.hero', label: { ar: 'بانر الصفحة الرئيسية', en: 'Homepage hero' }, active: true }, { key: 'homepage.featured', label: { ar: 'إعلانات الرئيسية المميزة', en: 'Featured ads' }, active: true }] };
  const writes: Record<string, unknown>[] = [];
  await page.route('**/api/v1/admin/banners/config', route => {
    if (route.request().method() === 'PUT') {
      const patch = route.request().postDataJSON() as Record<string, unknown>;
      expect(patch.expectedVersion).toBe(config.version);
      writes.push(patch);
      config = { ...config, enabled: patch.enabled as boolean, version: config.version + 1,
        placements: config.placements.map(item => ({ ...item, active: (item.key === 'homepage.hero' ? patch.heroActive : patch.featuredActive) as boolean | undefined ?? item.active })) };
    }
    return route.fulfill({ json: { data: config, meta: { requestId: 'placement-controls' } } });
  });
  await page.goto(`/admin/banners?lang=${locale}`);
  const hero = page.locator('[data-placement="homepage.hero"]');
  const featured = page.locator('[data-placement="homepage.featured"]');
  await expect(hero.getByRole('link')).toHaveAttribute('href', `/admin/banners?lang=${locale}#banner-list`);
  await expect(featured.getByRole('link')).toHaveAttribute('href', `/admin/ads/featured?lang=${locale}`);
  for (const row of [hero, featured]) for (const action of await row.locator('a,button').all()) {
    const box = await action.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  }
  await hero.getByRole('button').click();
  await expect(hero.getByRole('button')).toHaveText(locale === 'ar' ? 'تشغيل الموضع' : 'Enable placement');
  expect(writes[0]).toEqual({ enabled: false, expectedVersion: 2, heroActive: false, reason: 'Stop placement homepage.hero' });
  expect(config.placements[1]!.active).toBe(true);
  await hero.getByRole('button').click();
  await expect(hero.getByRole('button')).toHaveText(locale === 'ar' ? 'إيقاف الموضع' : 'Stop placement');
  expect(config.enabled).toBe(false);
  expect(config.placements[0]!.active).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('request-linked banner actions fit the screen, open the editor and confirm removal', async ({ page }, info) => {
  const locale = info.project.name.endsWith('-ar') ? 'ar' : 'en';
  const copy = getBannerControlCopy(locale), home = getAdminHomeCopy(locale);
  await routeAdminHomeApis(page);
  let banner = adminHomeBannerFixture({ adRequestId: requestId, targetUrl: 'https://elsadatrealestate.com/properties/test-property', startAt: '2030-01-01T08:00:00.000Z', endAt: '2030-02-01T08:00:00.000Z' });
  const writes: Array<Record<string, unknown>> = [];
  await page.route('**/api/v1/admin/banners?*', route => {
    expect(new URL(route.request().url()).searchParams.get('adRequestId')).toBe(requestId);
    return route.fulfill({ json: { data: { items: [banner], page: 1, limit: 20, total: 1 }, meta: { requestId: 'linked-banner-list' } } });
  });
  await page.route(`**/api/v1/admin/banners/${adminHomeBannerId}`, route => {
    if (route.request().method() !== 'PATCH') return route.fallback();
    const input = route.request().postDataJSON() as Record<string, unknown>;
    expect(input.expectedVersion).toBe(banner.version);
    expect(input).not.toHaveProperty('adRequestId');
    writes.push(input);
    const changes = { ...input }; delete changes.expectedVersion; delete changes.reason;
    banner = { ...banner, ...changes, version: banner.version + 1 };
    for (const key of ['body', 'altText', 'targetUrl']) if (changes[key] === null) Reflect.deleteProperty(banner, key);
    return route.fulfill({ json: { data: banner, meta: { requestId: 'linked-banner-update' } } });
  });
  await page.goto(`/admin/banners?adRequestId=${requestId}&lang=${locale}`);
  const filter = page.locator('.admin-home__request-filter');
  await expect(filter).toContainText(requestId);
  await expect(filter.getByRole('link', { name: home.banners, exact: true })).toHaveAttribute('href', `/admin/banners?lang=${locale}`);
  await expect(page.getByRole('link', { name: home.newBanner, exact: true })).toHaveAttribute('href', `/admin/banners/new?lang=${locale}&requestId=${requestId}`);
  const row = page.getByTestId(`admin-home-banner-${adminHomeBannerId}`);
  await expect(row).toBeVisible();
  const rowBounds = await row.boundingBox();
  const settingsBounds = await page.locator('.admin-home__banner-settings').boundingBox();
  expect(rowBounds!.y + rowBounds!.height).toBeLessThan(settingsBounds!.y);
  for (const button of await row.getByRole('button').all()) {
    const bounds = await button.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('banner-management.png'), fullPage: true });
  await row.getByRole('button', { name: copy.edit, exact: true }).click();
  await expect(page.locator(`#admin-home-banner-title-${locale}`)).toBeFocused();
  await page.locator(`#admin-home-banner-title-${locale}`).fill('Edited linked homepage banner');
  await page.locator('#admin-home-banner-reason').fill('Correct linked banner title');
  await page.locator('button[type="submit"]').click();
  await expect(row).toContainText('Edited linked homepage banner');
  expect(writes).toHaveLength(2);
  await row.getByRole('button', { name: copy.archive, exact: true }).click();
  const dialog = page.getByRole('dialog', { name: copy.archive, exact: true });
  await expect(dialog).toBeInViewport();
  await expect(dialog).toContainText(copy.archiveNote);
  expect(writes).toHaveLength(2);
  await dialog.locator('.ui-modal__footer').getByRole('button', { name: home.cancel, exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(writes).toHaveLength(2);
  await row.getByRole('button', { name: copy.archive, exact: true }).click();
  await dialog.getByRole('button', { name: copy.confirm, exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(writes.at(-1)).toMatchObject({ status: 'archived', expectedVersion: 4 });
  await expect(row).toContainText(home.statuses.archived!);
  await expect(row.getByRole('button', { name: copy.edit, exact: true })).toHaveCount(0);
});

test('failed removal keeps the banner and explains the error inside confirmation', async ({ page }, info) => {
  const locale = info.project.name.endsWith('-ar') ? 'ar' : 'en';
  const copy = getBannerControlCopy(locale), home = getAdminHomeCopy(locale);
  await routeAdminHomeApis(page);
  await page.route(`**/api/v1/admin/banners/${adminHomeBannerId}`, route => route.fulfill({ status: 403, json: { error: { code: 'FORBIDDEN', messageKey: 'errors.forbidden', details: [], requestId: 'removal-denied' } } }));
  await page.goto(`/admin/banners?lang=${locale}`);
  const row = page.getByTestId(`admin-home-banner-${adminHomeBannerId}`);
  await row.getByRole('button', { name: copy.archive, exact: true }).click();
  const dialog = page.getByRole('dialog', { name: copy.archive, exact: true });
  await dialog.getByRole('button', { name: copy.confirm, exact: true }).click();
  await expect(dialog.getByRole('alert')).toHaveText(home.states.permission.body);
  await expect(row.getByRole('button', { name: copy.edit, exact: true })).toBeEnabled();
});

test('empty request filter preserves the creation link and can reveal all banners', async ({ page }, info) => {
  const locale = info.project.name.endsWith('-ar') ? 'ar' : 'en', home = getAdminHomeCopy(locale);
  await routeAdminHomeApis(page);
  await page.route('**/api/v1/admin/banners?*', route => {
    if (!new URL(route.request().url()).searchParams.has('adRequestId')) return route.fallback();
    return route.fulfill({ json: { data: { items: [], page: 1, limit: 20, total: 0 }, meta: { requestId: 'empty-linked-list' } } });
  });
  await page.goto(`/admin/banners?adRequestId=${requestId}&lang=${locale}`);
  await expect(page.locator('.admin-home__state[data-state="empty"]')).toBeVisible();
  const links = page.getByRole('link', { name: home.newBanner, exact: true });
  await expect(links).toHaveCount(2);
  for (const link of await links.all()) await expect(link).toHaveAttribute('href', `/admin/banners/new?lang=${locale}&requestId=${requestId}`);
  await page.locator('.admin-home__request-filter').getByRole('link', { name: home.banners, exact: true }).click();
  await expect(page.getByTestId(`admin-home-banner-${adminHomeBannerId}`)).toBeVisible();
  await expect(page.locator('.admin-home__request-filter')).toHaveCount(0);
});
