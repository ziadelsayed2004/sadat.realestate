import { expect, test } from '@playwright/test';
import { routeAdminHomeApis } from './admin-home.fixtures.ts';

for (const clock of ['', '12:00']) {
  test(`banner times are optional with explicit AM and PM (${clock || 'blank'})`, async ({ page }, info) => {
    const locale = info.project.name.endsWith('-en') ? 'en' : 'ar';
    await routeAdminHomeApis(page);
    await page.goto(`/admin/banners/new?lang=${locale}`);
    await page.locator('#admin-home-banner-title-en').fill('Optional time banner');
    await page.locator('#admin-home-banner-start').fill('2027-01-05');
    await page.locator('#admin-home-banner-end').fill(clock ? '2027-01-05' : '2027-01-06');
    const start = page.locator('#admin-home-banner-start-time');
    const end = page.locator('#admin-home-banner-end-time');
    await expect(start).toHaveValue('');
    await expect(end).toHaveValue('');
    await expect(start).not.toHaveAttribute('required', '');
    await expect(end).not.toHaveAttribute('required', '');
    if (clock) {
      await start.fill(clock);
      await end.fill(clock);
      await page.locator('#admin-home-banner-end-time-period').selectOption('pm');
    }
    await expect(page.locator('#admin-home-banner-schedule-hint')).toContainText(locale === 'ar' ? 'الوقت اختياري' : 'times are optional');
    for (const side of ['start', 'end']) {
      const bounds = await page.locator(`#admin-home-banner-${side}-time-period`).boundingBox();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    }
    await page.screenshot({ path: info.outputPath(`optional-time-${clock ? 'noon' : 'blank'}.png`), fullPage: true });
    const created = page.waitForRequest(request => request.method() === 'POST' && request.url().endsWith('/api/v1/admin/banners'));
    await page.locator('.admin-home__editor button[type=submit]').click();
    expect((await created).postDataJSON()).toMatchObject({ startAt: '2027-01-04T22:00:00.000Z', endAt: clock ? '2027-01-05T10:00:00.000Z' : '2027-01-05T22:00:00.000Z' });
    await expect(page.locator('.admin-home__feedback[role=status]')).toBeVisible();
  });
}
