import { expect, test } from '@playwright/test';
import { routeAdminNotificationsAuditApis } from './admin-notifications-audit.fixtures.ts';
import { routeAdminSettingsApis } from './admin-settings.fixtures.ts';
import { routeAdminAdsApis } from './admin-ads.fixtures.ts';

test('admin settings, audit, notifications and advertising use the available page width', async ({ page }) => {
  const locale = test.info().project.name.endsWith('-en') ? 'en' : 'ar';
  for (const route of ['settings', 'settings/seo', 'settings/contact', 'audit-logs', 'notifications', 'ads/requests', 'ads/payments/pending-review', 'ads/financial-review']) {
    await page.unrouteAll({ behavior: 'wait' });
    if (route.startsWith('settings')) await routeAdminSettingsApis(page);
    else if (route.startsWith('ads')) await routeAdminAdsApis(page);
    else await routeAdminNotificationsAuditApis(page);
    await page.goto(`/admin/${route}?lang=${locale}`);
    const screen = page.locator('[data-screen-id]').first();
    await expect(screen).toBeVisible();
    await expect.poll(async () => Math.round((await screen.boundingBox())!.width)).toBe(page.viewportSize()!.width);
    await expect(page.getByTestId('admin-sidebar').locator('[aria-current="page"]')).toHaveCount(1);
    if (page.viewportSize()!.width > 1100) {
      const visible = await page.locator('.admin-dashboard__navigation-scroll').evaluate(element => {
        const item = element.querySelector('[aria-current="page"]')!.getBoundingClientRect();
        const rect = element.getBoundingClientRect();
        return item.top >= rect.top && item.bottom <= rect.bottom;
      });
      expect(visible).toBe(true);
    }
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
    if (route.startsWith('ads')) {
      const metrics = page.locator('.admin-ads__metrics').first();
      await expect(metrics).toBeVisible();
      const boxes = await metrics.locator('article').evaluateAll(items => items.map(item => { const r = item.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom }; }));
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i]!, b = boxes[j]!;
        expect(a.right <= b.x || b.right <= a.x || a.bottom <= b.y || b.bottom <= a.y).toBe(true);
      }
    }
    await page.screenshot({ path: test.info().outputPath(`${route.replaceAll('/', '-')}.png`) });
  }
});
