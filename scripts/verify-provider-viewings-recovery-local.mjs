import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import mongoose, { Types } from 'mongoose';
import { chromium, devices, expect } from '@playwright/test';
import { readEnvironmentFile } from './environment-file.mjs';

const env = await readEnvironmentFile('.env.local');
const mongoUri = process.env.MONGODB_URI ?? env.MONGODB_URI;
const base = process.env.LOCAL_GUIDE_BASE_URL ?? `http://127.0.0.1:${env.WEB_PORT ?? '4173'}`;
const passwords = [...new Set([process.env.LOCAL_GUIDE_PROVIDER_PASSWORD, 'LocalProvider-Journey-Only!2026'].filter(Boolean))];
assert.ok(mongoUri);
assert.equal(new URL(mongoUri).hostname, '127.0.0.1');

const report = {
  status: 'RUNNING', journeys: ['GUIDE-16'], mockedRoutes: false,
  environment: 'local-real-browser-api-mongodb',
  commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  runs: [], viewingsUnchanged: false, cleanup: false,
};
const mongo = await mongoose.createConnection(mongoUri).asPromise();
const browser = await chromium.launch();
let user;
let password;
let emptyStatus;
let originalSessionIds = [];
let viewingsBefore;
let activeStage = 'setup';

try {
  user = await mongo.collection('users').findOne(
    { roleType: 'provider', normalizedEmail: /^guide-provider-/u, status: 'verified' },
    { sort: { _id: -1 } }
  );
  assert.ok(user);
  const owner = { $in: [user._id, user._id.toHexString()] };
  const statuses = new Set(await mongo.collection('viewings').distinct('status', { providerId: owner }));
  emptyStatus = ['completed', 'cancelled', 'rescheduled', 'confirmed', 'requested'].find(status => !statuses.has(status));
  assert.ok(emptyStatus, 'Provider fixture needs one unused viewing status for honest empty-state verification');
  viewingsBefore = JSON.stringify(await mongo.collection('viewings').find({ providerId: owner }).sort({ _id: 1 }).toArray());
  originalSessionIds = (await mongo.collection('sessions').find({ userId: user._id }, { projection: { _id: 1 } }).toArray())
    .map(session => session._id.toHexString());

  const setup = await browser.newContext();
  try {
    for (const candidate of passwords) {
      const response = await setup.request.post(`${base}/api/v1/auth/login`, { data: { email: user.normalizedEmail, password: candidate } });
      if (response.status() === 200) {
        password = candidate;
        const logout = await setup.request.post(`${base}/api/v1/auth/logout`, { data: {} });
        assert.ok([200, 204].includes(logout.status()));
        break;
      }
      assert.equal(response.status(), 401);
    }
  } finally {
    await setup.close();
  }
  assert.ok(password);

  for (const locale of ['ar', 'en']) {
    for (const [device, preset] of [['desktop', 'Desktop Chrome'], ['tablet', 'Galaxy Tab S4'], ['mobile', 'Pixel 5']]) {
      const context = await browser.newContext({ ...devices[preset] });
      let loggedIn = false;
      try {
        activeStage = `${locale}/${device}/login`;
        const login = await context.request.post(`${base}/api/v1/auth/login`, { data: { email: user.normalizedEmail, password } });
        loggedIn = login.status() === 200;
        assert.ok(loggedIn);
        const page = await context.newPage();
        activeStage = `${locale}/${device}/initial-load`;
        const [initialRead] = await Promise.all([
          page.waitForResponse(response => response.request().method() === 'GET'
            && new URL(response.url()).pathname === '/api/v1/provider/viewings'),
          page.goto(`${base}/provider/viewings?lang=${locale}`, { waitUntil: 'networkidle' }),
        ]);
        assert.equal(initialRead.status(), 200);
        await expect(page.locator('[data-screen-id="PRV-18"]')).toBeVisible();
        const settled = page.locator('.provider-viewings__groups, .provider-viewings__empty[data-state="empty"]');
        await expect(settled).toBeVisible();
        const timeOrigin = await page.evaluate(() => performance.timeOrigin);
        const disclosure = page.locator('.provider-viewings__filter-disclosure');
        await disclosure.locator('summary').click();
        const filters = disclosure.locator('.provider-viewings__filters');

        activeStage = `${locale}/${device}/empty-filter`;
        await page.locator('#provider-viewings-status').selectOption(emptyStatus);
        const [emptyRead] = await Promise.all([
          page.waitForResponse(response => response.request().method() === 'GET'
            && new URL(response.url()).pathname === '/api/v1/provider/viewings'
            && new URL(response.url()).searchParams.get('status') === emptyStatus),
          filters.locator('button[type="submit"]').click(),
        ]);
        assert.equal(emptyRead.status(), 200);
        await expect(page.locator('.provider-viewings__empty[data-state="empty"]')).toBeVisible();
        await disclosure.locator('summary').click();
        const [clearRead] = await Promise.all([
          page.waitForResponse(response => response.request().method() === 'GET'
            && new URL(response.url()).pathname === '/api/v1/provider/viewings'
            && !new URL(response.url()).searchParams.has('status')),
          filters.locator('button[type="button"]').click(),
        ]);
        assert.equal(clearRead.status(), 200);
        await expect(settled).toBeVisible();

        activeStage = `${locale}/${device}/offline-retry`;
        await disclosure.locator('summary').click();
        await context.setOffline(true);
        await page.locator('#provider-viewings-status').selectOption(emptyStatus);
        await filters.locator('button[type="submit"]').click();
        const retry = page.locator('.provider-viewings__state[data-state="retry"]');
        await expect(retry).toBeVisible();
        await expect(retry.locator('button')).toBeEnabled();
        await context.setOffline(false);
        const [recoveredRead] = await Promise.all([
          page.waitForResponse(response => response.request().method() === 'GET'
            && new URL(response.url()).pathname === '/api/v1/provider/viewings'
            && new URL(response.url()).searchParams.get('status') === emptyStatus),
          retry.locator('button').click(),
        ]);
        assert.equal(recoveredRead.status(), 200);
        await expect(retry).toHaveCount(0);
        await expect(page.locator('.provider-viewings__empty[data-state="empty"]')).toBeVisible();
        assert.equal(await page.evaluate(() => performance.timeOrigin), timeOrigin);
        const geometry = await page.evaluate(() => ({ innerWidth, scrollWidth: document.documentElement.scrollWidth }));
        assert.equal(geometry.innerWidth, page.viewportSize().width);
        assert.ok(geometry.scrollWidth <= geometry.innerWidth);
        report.runs.push({ locale, device, emptyStatus,
          checks: ['empty_status_filter_clear_recovers_without_navigation', 'offline_filter_retry_recovers_without_navigation'],
          httpStatuses: { initial: 200, empty: 200, clear: 200, recovered: 200 }, ...geometry });
      } finally {
        await context.setOffline(false);
        if (loggedIn) {
          const logout = await context.request.post(`${base}/api/v1/auth/logout`, { data: {} });
          assert.ok([200, 204].includes(logout.status()));
        }
        await context.close();
      }
    }
  }
  assert.equal(JSON.stringify(await mongo.collection('viewings').find({ providerId: owner }).sort({ _id: 1 }).toArray()), viewingsBefore);
  report.viewingsUnchanged = true;
  report.status = 'PASS_LOCAL_SUBCASES';
} catch (error) {
  report.status = 'FAIL_LOCAL';
  report.failure = { stage: activeStage, message: error instanceof Error ? error.message : String(error) };
  process.exitCode = 1;
} finally {
  try {
    if (user) {
      const newSessions = await mongo.collection('sessions').find({ userId: user._id,
        ...(originalSessionIds.length > 0 ? { _id: { $nin: originalSessionIds.map(id => new Types.ObjectId(id)) } } : {}) }).toArray();
      const sessionIds = newSessions.map(session => session._id.toHexString());
      if (newSessions.length > 0) await mongo.collection('sessions').deleteMany({ _id: { $in: newSessions.map(session => session._id) } });
      if (sessionIds.length > 0) await mongo.collection('audit_logs').deleteMany({ targetType: 'auth_session', targetId: { $in: sessionIds } });
      report.cleanup = await mongo.collection('sessions').countDocuments({ userId: user._id,
        ...(originalSessionIds.length > 0 ? { _id: { $nin: originalSessionIds.map(id => new Types.ObjectId(id)) } } : {}) }) === 0;
      assert.ok(report.cleanup);
    }
  } catch (error) {
    report.status = 'FAIL_LOCAL';
    report.cleanupFailure = error instanceof Error ? error.message : String(error);
    process.exitCode = 1;
  } finally {
    await browser.close();
    await mongo.close();
    report.finishedAt = new Date().toISOString();
    await writeFile('docs/quality/guide-runs/provider-viewings-recovery-local-latest.json', `${JSON.stringify(report, null, 2)}\n`);
  }
}

console.log(JSON.stringify({ status: report.status, cases: report.runs.length, viewingsUnchanged: report.viewingsUnchanged, cleanup: report.cleanup }));
