import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import mongoose from 'mongoose';
import { chromium, devices, expect } from '@playwright/test';

assert.match(process.env.MONGODB_URI ?? '', /^mongodb:\/\/(?:[^@/]+@)?(?:127\.0\.0\.1|localhost):\d+\//u);
const mongo = await mongoose.createConnection(process.env.MONGODB_URI).asPromise();
const browser = await chromium.launch();
const base = 'http://127.0.0.1:4173';
const report = { journeys: ['GUIDE-09'], environment: 'local', mockedRoutes: false,
  commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  faultInjection: 'browser offline mode', runs: [], status: 'RUNNING' };
try {
  const user = await mongo.collection('users').findOne({ roleType: 'seeker', normalizedEmail: /^guide04-/u }, { sort: { _id: -1 } });
  assert.ok(user?.normalizedEmail);
  for (const locale of ['ar', 'en']) {
    const context = await browser.newContext({ ...devices['Pixel 5'] });
    try {
      let authenticated = false;
      for (const password of ['LocalGuide04-Only!2026', 'LocalGuide10-Only!2026']) {
        const response = await context.request.post(`${base}/api/v1/auth/login`, { data: { email: user.normalizedEmail, password } });
        if (response.status() === 200) { authenticated = true; break; }
        assert.equal(response.status(), 401);
      }
      assert.ok(authenticated, 'LOCAL_FIXTURE_LOGIN_REQUIRED');
      const page = await context.newPage();
      await page.goto(`${base}/seeker/notifications?lang=${locale}`, { waitUntil: 'networkidle' });
      await expect(page.locator('.seeker-notifications__tab').first()).toBeVisible();
      const origin = await page.evaluate(() => performance.timeOrigin);
      await context.setOffline(true);
      await page.locator('.seeker-notifications__tab').nth(1).click();
      await expect(page.locator('.seeker-dashboard__state[data-state="retry"]')).toBeVisible();
      await context.setOffline(false);
      const loaded = page.waitForResponse(response => new URL(response.url()).pathname === '/api/v1/seeker/notifications');
      await page.getByRole('button', { name: locale === 'ar' ? 'إعادة المحاولة' : 'Retry', exact: true }).click();
      assert.equal((await loaded).status(), 200);
      await expect(page.locator('.seeker-notifications__tab').first()).toBeVisible();
      assert.equal(await page.evaluate(() => performance.timeOrigin), origin);
      const width = await page.evaluate(() => ({ innerWidth, scrollWidth: document.documentElement.scrollWidth }));
      assert.deepEqual(width, { innerWidth: 393, scrollWidth: 393 });
      report.runs.push({ locale, status: 'PASS', check: 'notification_filter_offline_retry_without_reload', width });
    } finally {
      await context.setOffline(false);
      await context.request.post(`${base}/api/v1/auth/logout`);
      await context.close();
    }
  }
  report.status = 'PASS_LOCAL_SUBCASES';
} finally { await browser.close(); await mongo.close(); }
report.finishedAt = new Date().toISOString();
await writeFile('docs/quality/guide-runs/notification-recovery-local-latest.json', `${JSON.stringify(report, null, 2)}\n`);
console.log(`NOTIFICATION_RECOVERY_PASS locales=${report.runs.length}`);
