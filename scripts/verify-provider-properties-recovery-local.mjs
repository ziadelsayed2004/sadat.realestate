import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import mongoose from 'mongoose';
import { chromium, devices, expect } from '@playwright/test';
import { readEnvironmentFile } from './environment-file.mjs';

const env = await readEnvironmentFile('.env.local');
const mongoUri = process.env.MONGODB_URI ?? env.MONGODB_URI;
const base = process.env.LOCAL_GUIDE_BASE_URL ?? `http://127.0.0.1:${env.WEB_PORT ?? '4173'}`;
const passwords = [...new Set([process.env.LOCAL_GUIDE_PROVIDER_PASSWORD, 'LocalProvider-Journey-Only!2026'].filter(Boolean))];
assert.ok(mongoUri);
assert.equal(new URL(mongoUri).hostname, '127.0.0.1');
const report = {
  status: 'RUNNING', journeys: ['GUIDE-14', 'GUIDE-15'], mockedRoutes: false,
  environment: 'local-real-browser-api-mongodb',
  commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  startedAt: new Date().toISOString(), runs: [], cleanup: false
};
const mongo = await mongoose.createConnection(mongoUri).asPromise();
const browser = await chromium.launch();
let user;
let password;
let originalSessionIds = [];
let stage = 'setup';

try {
  user = await mongo.collection('users').findOne({ roleType: 'provider', status: 'verified' }, { sort: { _id: -1 } });
  assert.ok(user);
  originalSessionIds = (await mongo.collection('sessions').find({ userId: user._id }, { projection: { _id: 1 } }).toArray()).map(row => row._id.toHexString());
  const probe = await browser.newContext();
  try {
    for (const candidate of passwords) {
      const response = await probe.request.post(`${base}/api/v1/auth/login`, { data: { email: user.normalizedEmail, password: candidate } });
      if (response.status() === 200) { password = candidate; await probe.request.post(`${base}/api/v1/auth/logout`, { data: {} }); break; }
    }
  } finally { await probe.close(); }
  assert.ok(password, 'No verified provider fixture accepted the configured local password');

  for (const locale of ['ar', 'en']) for (const [device, preset] of [['desktop', 'Desktop Chrome'], ['tablet', 'Galaxy Tab S4'], ['mobile', 'Pixel 5']]) {
    const context = await browser.newContext({ ...devices[preset] });
    try {
      stage = `${locale}/${device}/login`;
      assert.equal((await context.request.post(`${base}/api/v1/auth/login`, { data: { email: user.normalizedEmail, password } })).status(), 200);
      const page = await context.newPage();
      const initial = page.waitForResponse(response => response.request().method() === 'GET' && new URL(response.url()).pathname === '/api/v1/provider/properties');
      await page.goto(`${base}/provider/properties?lang=${locale}`, { waitUntil: 'networkidle' });
      assert.equal((await initial).status(), 200);
      await expect(page.locator('[data-screen-id="PRV-02"]')).toBeVisible();
      const timeOrigin = await page.evaluate(() => performance.timeOrigin);
      const filters = page.locator('.provider-properties__filters');

      stage = `${locale}/${device}/empty`;
      const noMatch = `no-match-${randomUUID()}`;
      const empty = page.waitForResponse(response => response.request().method() === 'GET'
        && new URL(response.url()).pathname === '/api/v1/provider/properties'
        && new URL(response.url()).searchParams.get('search') === noMatch);
      await page.locator('#provider-properties-search').fill(noMatch);
      await filters.locator('button[type="submit"]').click();
      assert.equal((await empty).status(), 200);
      await expect(page.locator('.provider-dashboard__empty[data-state="empty"]')).toBeVisible();
      const clear = page.waitForResponse(response => response.request().method() === 'GET'
        && new URL(response.url()).pathname === '/api/v1/provider/properties'
        && !new URL(response.url()).searchParams.has('search'));
      await filters.locator('button[type="button"]').click();
      assert.equal((await clear).status(), 200);
      await expect(filters).toBeVisible();

      stage = `${locale}/${device}/offline-retry`;
      const retrySearch = `retry-${randomUUID()}`;
      await context.setOffline(true);
      await page.locator('#provider-properties-search').fill(retrySearch);
      await filters.locator('button[type="submit"]').click();
      const retry = page.locator('.provider-dashboard__state[data-state="retry"]');
      await expect(retry).toBeVisible();
      await context.setOffline(false);
      const recovered = page.waitForResponse(response => response.request().method() === 'GET'
        && new URL(response.url()).pathname === '/api/v1/provider/properties'
        && new URL(response.url()).searchParams.get('search') === retrySearch);
      await retry.getByRole('button').click();
      assert.equal((await recovered).status(), 200);
      await expect(retry).toHaveCount(0);
      const geometry = await page.evaluate(() => ({ innerWidth, scrollWidth: document.documentElement.scrollWidth }));
      assert.ok(geometry.scrollWidth <= geometry.innerWidth);
      assert.equal(await page.evaluate(() => performance.timeOrigin), timeOrigin);
      report.runs.push({ locale, device, status: 'PASS', checks: [
        'empty_search_clear_recovers_without_navigation', 'offline_filter_retry_recovers_without_navigation'
      ], httpStatuses: { initial: 200, empty: 200, clear: 200, recovered: 200 }, ...geometry });
    } finally {
      await context.setOffline(false);
      await context.request.post(`${base}/api/v1/auth/logout`, { data: {} }).catch(() => undefined);
      await context.close();
    }
  }
  assert.equal(report.runs.length, 6);
  report.status = 'PASS_LOCAL_SUBCASES';
} catch (error) {
  report.status = 'FAIL_LOCAL';
  report.failure = { stage, message: error instanceof Error ? error.message : String(error) };
  process.exitCode = 1;
} finally {
  try {
    if (user) {
      const filter = { userId: user._id, ...(originalSessionIds.length ? { _id: { $nin: originalSessionIds.map(id => new mongoose.Types.ObjectId(id)) } } : {}) };
      const sessions = await mongo.collection('sessions').find(filter).toArray();
      const ids = sessions.map(row => row._id);
      if (ids.length) await mongo.collection('sessions').deleteMany({ _id: { $in: ids } });
      const targetIds = ids.map(id => id.toHexString());
      if (targetIds.length) await mongo.collection('audit_logs').deleteMany({ targetType: 'auth_session', targetId: { $in: targetIds } });
      report.cleanup = await mongo.collection('sessions').countDocuments(filter) === 0;
      assert.equal(report.cleanup, true);
    }
  } catch (error) {
    report.status = 'FAIL_LOCAL';
    report.cleanup = false;
    report.cleanupFailure = error instanceof Error ? error.message : String(error);
    process.exitCode = 1;
  }
  await browser.close();
  await mongo.close();
  report.finishedAt = new Date().toISOString();
  await writeFile('docs/quality/guide-runs/provider-properties-recovery-local-latest.json', `${JSON.stringify(report, null, 2)}\n`);
}
console.log(JSON.stringify({ status: report.status, runs: report.runs.length, cleanup: report.cleanup }));
