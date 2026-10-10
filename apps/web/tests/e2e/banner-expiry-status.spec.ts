import { expect, test } from '@playwright/test';
import { adminHomeBannerFixture, routeAdminHomeApis } from './admin-home.fixtures.ts';
import { getAdminHomeCopy } from '../../src/features/admin_home/copy.ts';

test.use({ timezoneId: 'America/New_York' });
const instant = new Date('2026-10-11T12:00:00Z');
const localeFor = () => test.info().project.name.endsWith('-en') ? 'en' : 'ar';

test('shows stopped for expired published banners while preserving drafts, archives and future schedules', async ({ page }) => {
  const locale = localeFor();
  const copy = getAdminHomeCopy(locale);
  await page.clock.install({ time: instant });
  await page.clock.pauseAt(instant);
  await routeAdminHomeApis(page);
  const cases = [
    { status: 'active', endAt: '2026-10-10T12:00:00Z', displayed: 'ended' },
    { status: 'scheduled', endAt: '2026-10-10T12:00:00Z', displayed: 'ended' },
    { status: 'ended', endAt: '2026-10-10T12:00:00Z', displayed: 'ended' },
    { status: 'active', endAt: instant.toISOString(), displayed: 'ended' },
    { status: 'draft', endAt: '2026-10-10T12:00:00Z', displayed: 'draft' },
    { status: 'archived', endAt: '2026-10-10T12:00:00Z', displayed: 'archived' },
    { status: 'active', endAt: '2026-10-12T12:00:00Z', displayed: 'active' },
    { status: 'scheduled', startAt: '2026-10-12T11:00:00Z', endAt: '2026-10-12T12:00:00Z', displayed: 'scheduled' }
  ];
  const items = cases.map(({ status, endAt, ...item }, index) => adminHomeBannerFixture({
    status, endAt, ...('startAt' in item ? { startAt: item.startAt } : {}), id: index.toString(16).padStart(24, '0')
  }));
  await page.route('**/api/v1/admin/banners?*', route => route.fulfill({ json: { data: { items, page: 1, limit: 20, total: items.length }, meta: { requestId: 'expiry-status' } } }));
  await page.goto(`/admin/banners?lang=${locale}`);
  for (const [index, item] of cases.entries()) {
    await expect(page.getByTestId(`admin-home-banner-${items[index]!.id}`).locator('.admin-home__badge')).toHaveText(copy.statuses[item.displayed]!);
  }
  await page.getByTestId(`admin-home-banner-${items[0]!.id}`).scrollIntoViewIfNeeded();
  await page.screenshot({ path: test.info().outputPath('expired-banners.png') });
});

test('updates the status exactly at expiry without reloading or changing stored banner data', async ({ page }) => {
  const locale = localeFor();
  const copy = getAdminHomeCopy(locale);
  await page.clock.install({ time: instant });
  await page.clock.pauseAt(instant);
  await routeAdminHomeApis(page);
  const items = ['active', 'scheduled'].map((status, index) => adminHomeBannerFixture({
    id: index.toString(16).padStart(24, '0'), status, endAt: '2026-10-11T12:00:10Z'
  }));
  const mutations: string[] = [];
  page.on('request', request => { if (request.url().includes('/admin/banners') && request.method() !== 'GET') mutations.push(request.method()); });
  await page.route('**/api/v1/admin/banners?*', route => route.fulfill({ json: { data: { items, page: 1, limit: 20, total: items.length }, meta: { requestId: 'expiry-boundary' } } }));
  await page.goto(`/admin/banners?lang=${locale}`);
  for (const item of items) await expect(page.getByTestId(`admin-home-banner-${item.id}`).locator('.admin-home__badge')).toHaveText(copy.statuses[item.status]!);
  await page.clock.runFor(9_999);
  for (const item of items) await expect(page.getByTestId(`admin-home-banner-${item.id}`).locator('.admin-home__badge')).toHaveText(copy.statuses[item.status]!);
  await page.clock.runFor(1);
  for (const item of items) {
    const badge = page.getByTestId(`admin-home-banner-${item.id}`).locator('.admin-home__badge');
    await expect(badge).toHaveText(copy.statuses.ended!);
    await expect(badge).toHaveAttribute('data-tone', 'neutral');
  }
  await page.reload();
  for (const item of items) await expect(page.getByTestId(`admin-home-banner-${item.id}`).locator('.admin-home__badge')).toHaveText(copy.statuses.ended!);
  expect(mutations).toEqual([]);
});
