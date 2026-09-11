import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { chromium, devices, expect } from '@playwright/test';

const base = 'http://127.0.0.1:4173';
assert.equal((await fetch(`${base}/health`)).status, 200);
const report = { status: 'RUNNING', environment: 'local-real-browser-api', mockedRoutes: false,
  journeys: ['GUIDE-22'], faultInjection: 'browser offline mode', runs: [],
  commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  startedAt: new Date().toISOString() };
const browser = await chromium.launch();
try {
  for (const [device, options] of [
    ['Desktop', { viewport: { width: 1440, height: 1000 } }],
    ['Tablet', { viewport: { width: 768, height: 1024 } }],
    ['Pixel 5', devices['Pixel 5']],
  ]) for (const locale of ['ar', 'en']) {
    const context = await browser.newContext(options);
    try {
      assert.equal((await context.request.post(`${base}/api/v1/auth/login`, {
        data: { email: 'admin.operations@example.invalid', password: 'LocalPreview-Admin-Only-2026!' },
      })).status(), 200);
      const page = await context.newPage();
      const requests = [];
      page.on('request', request => {
        if (request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/moderate')) requests.push(request.url());
      });
      await page.goto(`${base}/admin/community?lang=${locale}`, { waitUntil: 'networkidle' });
      const rows = page.locator('[data-testid^="admin-community-post-"]');
      await expect(rows.first()).toBeVisible();
      const timeOrigin = await page.evaluate(() => performance.timeOrigin);
      await rows.first().getByRole('button', { name: locale === 'ar' ? 'مراجعة' : 'Review', exact: true }).click();
      const reason = page.locator('#community-moderation-reason');
      const submit = page.locator('.admin-community__resolution button[type="submit"]');
      for (const value of ['', '    ', 'abcd']) {
        await reason.fill(value);
        await expect(submit).toBeDisabled();
      }
      await reason.fill('Valid local verification reason');
      await expect(submit).toBeEnabled();
      assert.equal(requests.length, 0);
      await page.locator('.admin-community__resolution').getByRole('button', { name: locale === 'ar' ? 'إغلاق' : 'Close', exact: true }).click();
      const load = () => page.waitForResponse(response => new URL(response.url()).pathname === '/api/v1/admin/community/posts');
      await page.locator('#admin-community-search').fill(`absent-${randomUUID()}`);
      let pending = load();
      await page.getByRole('button', { name: locale === 'ar' ? 'تطبيق' : 'Apply', exact: true }).click();
      assert.equal((await pending).status(), 200);
      await expect(page.locator('.admin-community__state[data-state="empty"]')).toBeVisible();
      pending = load();
      await page.getByRole('button', { name: locale === 'ar' ? 'مسح' : 'Clear', exact: true }).click();
      assert.equal((await pending).status(), 200);
      await expect(rows.first()).toBeVisible();
      await context.setOffline(true);
      await page.getByRole('button', { name: locale === 'ar' ? 'تطبيق' : 'Apply', exact: true }).click();
      await expect(page.locator('.admin-community__state[data-state="retry"]')).toBeVisible();
      await context.setOffline(false);
      pending = load();
      await page.getByRole('button', { name: locale === 'ar' ? 'إعادة المحاولة' : 'Retry', exact: true }).click();
      assert.equal((await pending).status(), 200);
      await expect(rows.first()).toBeVisible();
      assert.equal(await page.evaluate(() => performance.timeOrigin), timeOrigin);
      const dimensions = await page.evaluate(() => ({ innerWidth, scrollWidth: document.documentElement.scrollWidth }));
      assert.equal(dimensions.innerWidth, options.viewport.width);
      assert.equal(dimensions.scrollWidth, dimensions.innerWidth);
      report.runs.push({ device, locale, status: 'PASS', dimensions,
        checks: ['invalid_reason_blocks_browser_mutation', 'empty_search_clear_recovers_without_navigation', 'offline_retry_recovers_without_navigation'] });
    } finally {
      await context.setOffline(false);
      await context.request.post(`${base}/api/v1/auth/logout`);
      await context.close();
    }
  }
  report.status = 'PASS_LOCAL_SUBCASES';
} finally {
  await browser.close();
  if (report.status === 'RUNNING') report.status = 'FAIL_LOCAL';
  report.finishedAt = new Date().toISOString();
  await writeFile('docs/quality/guide-runs/community-browser-recovery-local-latest.json', `${JSON.stringify(report, null, 2)}\n`);
}
console.log(`COMMUNITY_BROWSER_RECOVERY_PASS runs=${report.runs.length}`);
