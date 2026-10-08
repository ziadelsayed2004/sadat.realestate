import { expect, test } from '@playwright/test';
import { routePublicHomepageApi } from './public-fixtures';

for (const role of ['seeker', 'provider'] as const) {
  test(`${role} sees notifications on the homepage, including mobile, and opens the inbox`, async ({ page }) => {
    const locale = test.info().project.name.endsWith('-en') ? 'en' : 'ar';
    await page.addInitScript(() => localStorage.setItem('sadat-real-estate.auth.session-hint', 'authenticated'));
    await page.route('**/api/v1/auth/refresh', route => route.fulfill({ json: { data: { accessToken: 'public.notification.token', tokenType: 'Bearer', expiresInSeconds: 900, user: { id: 'aaaaaaaaaaaaaaaaaaaaaaaa', roleType: role, status: 'verified' } }, meta: { requestId: 'public-notification-session' } } }));
    await routePublicHomepageApi(page);
    let unreadCount = 2;
    const requests: string[] = [];
    await page.route(`**/api/v1/${role}/notifications?*`, route => {
      requests.push(route.request().headers().authorization ?? '');
      return route.fulfill({ json: { data: { items: [], unreadCount, page: 1, limit: 1, total: unreadCount }, meta: { requestId: 'public-inbox' } } });
    });
    await page.goto(`/?lang=${locale}`);
    const bell = page.locator('.public-homepage__notifications');
    await expect(bell).toBeVisible();
    await expect(bell).toHaveAttribute('href', `/${role}/notifications?lang=${locale}`);
    await expect(bell.locator('.public-homepage__notification-count')).toBeVisible();
    expect(requests[0]).toBe('Bearer public.notification.token');
    const bounds = await bell.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    unreadCount = 0;
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(bell.locator('.public-homepage__notification-count')).toHaveCount(0);
    await bell.click();
    await expect(page).toHaveURL(new RegExp(`/${role}/notifications\\?lang=${locale}$`, 'u'));
  });
}

test('guest homepage has no notification bell or inbox request', async ({ page }) => {
  const locale = test.info().project.name.endsWith('-en') ? 'en' : 'ar';
  await page.addInitScript(() => localStorage.setItem('sadat-real-estate.auth.session-hint', 'anonymous'));
  await routePublicHomepageApi(page);
  let inboxRequests = 0;
  page.on('request', request => { if (/\/api\/v1\/(seeker|provider|admin)\/notifications/u.test(request.url())) inboxRequests += 1; });
  await page.goto(`/?lang=${locale}`);
  await expect(page.locator('[data-page="public-home"][data-homepage-state="success"]')).toBeVisible();
  await expect(page.locator('.public-homepage__notifications')).toHaveCount(0);
  expect(inboxRequests).toBe(0);
});
