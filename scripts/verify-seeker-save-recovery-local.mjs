import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import mongoose from 'mongoose';
import { chromium, devices, expect } from '@playwright/test';

const base = 'http://127.0.0.1:4174';
assert.ok(process.env.LOCAL_GUIDE_SEEKER_PASSWORD, 'LOCAL_GUIDE_SEEKER_PASSWORD is required');
assert.equal(new URL(process.env.MONGODB_URI).hostname, '127.0.0.1', 'Local MongoDB required');
const report = { status: 'RUNNING', journeys: ['GUIDE-10'], mockedRoutes: false,
  environment: 'local-real-browser-api-mongodb', commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), runs: [], restored: false };
const connection = await mongoose.createConnection(process.env.MONGODB_URI).asPromise();
const browser = await chromium.launch();
let original;
try {
  const user = await connection.collection('users').findOne({ roleType: 'seeker', normalizedEmail: /^guide04-/, status: 'verified' }, { sort: { _id: -1 } });
  assert.ok(user, 'Existing local GUIDE-04 fixture required');
  original = await connection.collection('seeker_profiles').findOne({ userId: user._id });
  assert.ok(original);
  for (const locale of ['ar', 'en']) for (const [device, preset] of [['desktop', 'Desktop Chrome'], ['tablet', 'Galaxy Tab S4'], ['mobile', 'Pixel 5']]) {
    const context = await browser.newContext({ ...devices[preset] });
    let loggedIn = false;
    try {
      const response = await context.request.post(`${base}/api/v1/auth/login`, { data: { email: user.normalizedEmail, password: process.env.LOCAL_GUIDE_SEEKER_PASSWORD } });
      loggedIn = response.status() === 200;
      assert.ok(loggedIn, 'Local fixture login failed');
      const page = await context.newPage();
      for (const tab of ['personal', 'preferences']) {
        await page.goto(`${base}/seeker/profile?tab=${tab}&lang=${locale}`, { waitUntil: 'networkidle' });
        const field = page.locator(tab === 'personal' ? '#seeker-profile-first-name' : '#seeker-preferences-max-price');
        const value = tab === 'personal' ? `Recovery ${locale} ${device}` : '2500000';
        await field.fill(value);
        const origin = await page.evaluate(() => performance.timeOrigin);
        const save = page.locator('.seeker-profile__form > button');
        await context.setOffline(true);
        await save.click();
        await expect(page.getByRole('alert')).toBeVisible();
        await expect(field).toHaveValue(value);
        await expect(save).toBeEnabled();
        await context.setOffline(false);
        const endpoint = tab === 'personal' ? '/api/v1/me' : '/api/v1/me/preferences';
        const saved = page.waitForResponse(response => response.request().method() === 'PATCH' && new URL(response.url()).pathname === endpoint);
        await save.click();
        assert.equal((await saved).status(), 200);
        await expect(page.locator('.seeker-profile__feedback[data-state="success"]')).toBeVisible();
        await expect(page.getByRole('alert')).toHaveCount(0);
        assert.equal(await page.evaluate(() => performance.timeOrigin), origin);
        const stored = await connection.collection('seeker_profiles').findOne({ _id: original._id });
        assert.equal(tab === 'personal' ? stored.firstName : String(stored.preferences.maxPrice), value);
        const geometry = await page.evaluate(() => ({ innerWidth, scrollWidth: document.documentElement.scrollWidth }));
        assert.equal(geometry.innerWidth, page.viewportSize().width);
        assert.ok(geometry.scrollWidth <= geometry.innerWidth);
        report.runs.push({ locale, device, tab, check: 'offline_save_keeps_draft_then_persists_without_navigation', httpStatus: 200, mongoVerified: true, ...geometry });
      }
    } finally {
      await context.setOffline(false);
      if (loggedIn) {
        const logout = await context.request.post(`${base}/api/v1/auth/logout`, { data: {} });
        assert.ok([200, 204].includes(logout.status()), 'Fixture logout failed');
      }
      await context.close();
    }
  }
  report.status = 'PASS_LOCAL_SUBCASES';
} catch (error) {
  report.status = 'FAIL_LOCAL';
  // Keep authentication and database details out of the persisted report.
  report.failure = error instanceof assert.AssertionError ? 'Browser or persistence assertion failed' : 'Browser recovery check failed';
  process.exitCode = 1;
} finally {
  try {
    if (original) {
      await connection.collection('seeker_profiles').replaceOne({ _id: original._id, userId: original.userId }, original);
      assert.deepEqual(await connection.collection('seeker_profiles').findOne({ _id: original._id }), original);
      report.restored = true;
    }
  } catch {
    report.status = 'FAIL_LOCAL';
    report.failure = 'Local fixture restoration failed';
    process.exitCode = 1;
  } finally {
    await browser.close();
    await connection.close();
    report.finishedAt = new Date().toISOString();
    await writeFile('docs/quality/guide-runs/seeker-save-recovery-local-latest.json', `${JSON.stringify(report, null, 2)}\n`);
  }
}
console.log(JSON.stringify({ status: report.status, cases: report.runs.length, restored: report.restored }));
