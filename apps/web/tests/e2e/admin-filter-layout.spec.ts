import { expect, test } from '@playwright/test';
import { routeAdminAccounts, adminProviderFixture } from './admin-accounts.fixtures.ts';
import { routeAdminPropertyApis } from './admin-properties.fixtures.ts';
import { adminProjectFixture } from './admin-projects.fixtures.ts';
import { adminRequestFixture, routeAdminRequestApis } from './admin-requests.fixtures.ts';

test('request filters recover after removing a search with no results', async ({ page }) => {
  await routeAdminRequestApis(page);
  await page.route('**/api/v1/admin/requests?**', route => {
    const empty = new URL(route.request().url()).searchParams.has('search');
    return route.fulfill({ json: { data: { items: empty ? [] : [adminRequestFixture()], page: 1, limit: 20, total: empty ? 0 : 1 }, meta: { requestId: 'request-filter-recovery' } } });
  });
  await page.goto('/admin/customer-requests?lang=en');
  const search = page.locator('#admin-requests-search');
  await search.fill('no results');
  await page.locator('form[role="search"] button[type="submit"]').click();
  await expect(page.locator('[data-admin-requests-state="empty"]')).toBeVisible();
  await expect(page.getByRole('tablist')).toBeVisible();
  await search.fill('');
  await page.locator('form[role="search"] button[type="submit"]').click();
  await expect(page.getByRole('table')).toBeVisible();
});

test('sidebar review routes show selectable lists without a record id', async ({ page }) => {
  await routeAdminAccounts(page, 'admin', 'admin.properties.qa');
  await routeAdminPropertyApis(page);
  await page.route('**/api/v1/admin/projects**', route => route.fulfill({ json: { data: { items: [adminProjectFixture()] }, meta: { requestId: 'review-entry', page: 1, limit: 20, total: 1 } } }));
  for (const path of ['properties/review', 'properties/possible-duplicates', 'projects/review']) {
    await page.goto(`/admin/${path}?lang=${test.info().project.name.endsWith('-en') ? 'en' : 'ar'}`);
    await expect(page.getByRole('table')).toBeVisible();
    await expect(page.getByRole('table').locator('tbody tr')).toHaveCount(1);
    await expect(page.locator('form[role="search"]')).toBeVisible();
  }
});

test('admin list filters remain spaced and fit each device', async ({ page }) => {
  await routeAdminAccounts(page, 'admin', 'admin.properties.qa');
  await routeAdminPropertyApis(page);
  await page.route('**/api/v1/admin/projects**', route => route.fulfill({ json: { data: { items: [adminProjectFixture()] }, meta: { requestId: 'layout', page: 1, limit: 20, total: 1 } } }));
  for (const name of ['providers', 'properties', 'projects']) {
    await page.goto(`/admin/${name}?lang=${test.info().project.name.endsWith('-en') ? 'en' : 'ar'}`);
    const metrics = page.locator('.admin-dashboard__metric-section');
    await expect(metrics).toBeVisible();
    const spacing = await metrics.evaluate(element => element.nextElementSibling!.getBoundingClientRect().top - element.getBoundingClientRect().bottom);
    expect(spacing).toBeGreaterThanOrEqual(20);
    const widths = await page.evaluate(() => ({ inner: innerWidth, scroll: document.documentElement.scrollWidth }));
    expect(widths.inner).toBe(page.viewportSize()!.width);
    expect(widths.scroll).toBeLessThanOrEqual(widths.inner);
    if (name === 'projects') {
      const input = await page.locator('#admin-projects-search').boundingBox();
      const apply = await page.locator('.admin-projects__filters button[type="submit"]').boundingBox();
      expect(apply!.y).toBeGreaterThanOrEqual(input!.y - 2);
    }
    await page.screenshot({ path: test.info().outputPath(`${name}.png`), fullPage: false });
  }
});

test('provider empty results can be cleared without a browser refresh', async ({ page }) => {
  await routeAdminAccounts(page);
  let empty = true;
  await page.route('**/api/v1/admin/providers**', route => route.fulfill({ json: { data: { items: empty ? [] : [adminProviderFixture()], page: 1, limit: 20, total: empty ? 0 : 1 }, meta: { requestId: 'empty-recovery' } } }));
  await page.goto('/admin/providers?lang=en');
  await expect(page.locator('[data-admin-accounts-state="empty"]')).toBeVisible();
  empty = false;
  await page.getByRole('button', { name: /clear/i }).click();
  await expect(page.locator('[data-admin-accounts-state="success"]')).toBeVisible();
});
