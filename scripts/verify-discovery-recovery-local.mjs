import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { chromium, devices, expect } from '@playwright/test';

const base = 'http://127.0.0.1:4173';
assert.equal((await fetch(`${base}/health`)).status, 200);
const report = { status: 'RUNNING', environment: 'local', mockedRoutes: false,
  faultInjection: 'browser offline mode only; recovery uses real HTTP API',
  commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  journeys: ['GUIDE-01', 'GUIDE-02'], runs: [], startedAt: new Date().toISOString() };
const browser = await chromium.launch();
try {
  for (const locale of ['ar', 'en']) {
    const context = await browser.newContext({ ...devices['Pixel 5'] });
    try {
      const page = await context.newPage();
      await page.goto(`${base}/properties?lang=${locale}`, { waitUntil: 'networkidle' });
      await expect(page.locator('[data-listing-state="success"]')).toBeVisible();
      const timeOrigin = await page.evaluate(() => performance.timeOrigin);
      await context.setOffline(true);
      await page.locator('input[name="transactionType"][value="rent"]').check();
      await expect(page.locator('[data-listing-state="retry"]')).toBeVisible();
      await context.setOffline(false);
      const response = page.waitForResponse(item => new URL(item.url()).pathname === '/api/v1/public/properties');
      await page.getByRole('button', { name: locale === 'ar' ? 'إعادة المحاولة' : 'Retry', exact: true }).click();
      assert.equal((await response).status(), 200);
      await expect(page.locator('[data-listing-state="success"]')).toBeVisible();
      assert.equal(await page.evaluate(() => performance.timeOrigin), timeOrigin);
      const dimensions = await page.evaluate(() => ({ innerWidth, scrollWidth: document.documentElement.scrollWidth }));
      assert.equal(dimensions.innerWidth, 393);
      assert.equal(dimensions.scrollWidth, 393);
      report.runs.push({ locale, device: 'Pixel 5', dimensions, check: 'offline_filter_retry_recovers_without_navigation', status: 'PASS' });
    } finally { await context.close(); }
  }
  report.status = 'PASS_LOCAL_SUBCASES';
} finally { await browser.close(); }
report.finishedAt = new Date().toISOString();
await writeFile('docs/quality/guide-runs/discovery-recovery-local-latest.json', `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report));
