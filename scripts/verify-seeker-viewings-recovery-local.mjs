import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import mongoose, { Types } from 'mongoose';
import { chromium, devices, expect } from '@playwright/test';
import { readEnvironmentFile } from './environment-file.mjs';

const localEnvironment = await readEnvironmentFile('.env.local');
const mongoUri = process.env.MONGODB_URI ?? localEnvironment.MONGODB_URI;
const base = process.env.LOCAL_GUIDE_BASE_URL ?? `http://127.0.0.1:${localEnvironment.WEB_PORT ?? '4173'}`;
const passwordCandidates = [...new Set([
  process.env.LOCAL_GUIDE_SEEKER_PASSWORD,
  'LocalGuide04-Only!2026',
  'LocalGuide10-Only!2026',
].filter(Boolean))];
assert.ok(mongoUri, 'Local MongoDB configuration required');
assert.equal(new URL(mongoUri).hostname, '127.0.0.1', 'Local MongoDB required');

const report = {
  status: 'RUNNING', journeys: ['GUIDE-07'], mockedRoutes: false,
  environment: 'local-real-browser-api-mongodb',
  commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  runs: [], viewingsUnchanged: false, cleanup: false,
};
const mongo = await mongoose.createConnection(mongoUri).asPromise();
const browser = await chromium.launch();
let user;
let originalSessionIds = [];
let viewingsBefore;

try {
  user = await mongo.collection('users').findOne(
    { roleType: 'seeker', normalizedEmail: /^guide04-/, status: 'verified' },
    { sort: { _id: -1 } }
  );
  assert.ok(user, 'Existing local GUIDE-04 fixture required');
  originalSessionIds = (await mongo.collection('sessions').find({ userId: user._id }, { projection: { _id: 1 } }).toArray())
    .map(session => session._id.toHexString());
  const viewingOwner = { $in: [user._id, user._id.toHexString()] };
  viewingsBefore = JSON.stringify(await mongo.collection('viewings').find({ seekerId: viewingOwner }).sort({ _id: 1 }).toArray());

  let localPassword;
  const credentialContext = await browser.newContext();
  try {
    for (const password of passwordCandidates) {
      const response = await credentialContext.request.post(`${base}/api/v1/auth/login`, {
        data: { email: user.normalizedEmail, password },
      });
      if (response.status() === 200) {
        localPassword = password;
        const logout = await credentialContext.request.post(`${base}/api/v1/auth/logout`, { data: {} });
        assert.ok([200, 204].includes(logout.status()), 'Credential check logout failed');
        break;
      }
      assert.equal(response.status(), 401, 'Unexpected fixture login response');
    }
  } finally {
    await credentialContext.close();
  }
  assert.ok(localPassword, 'No known local GUIDE-04 fixture password worked');

  for (const locale of ['ar', 'en']) {
    for (const [device, preset] of [['desktop', 'Desktop Chrome'], ['tablet', 'Galaxy Tab S4'], ['mobile', 'Pixel 5']]) {
      const context = await browser.newContext({ ...devices[preset] });
      let loggedIn = false;
      try {
        const login = await context.request.post(`${base}/api/v1/auth/login`, {
          data: { email: user.normalizedEmail, password: localPassword },
        });
        loggedIn = login.status() === 200;
        assert.ok(loggedIn, 'Local fixture login failed');
        const page = await context.newPage();
        const initialRead = page.waitForResponse(response => response.request().method() === 'GET'
          && new URL(response.url()).pathname === '/api/v1/seeker/viewings');
        await page.goto(`${base}/seeker/viewings?lang=${locale}`, { waitUntil: 'networkidle' });
        assert.equal((await initialRead).status(), 200);
        const settledContent = page.locator('.seeker-viewings__grid, .seeker-dashboard__empty[data-state="empty"]');
        await expect(settledContent).toBeVisible();
        const timeOrigin = await page.evaluate(() => performance.timeOrigin);

        await context.setOffline(true);
        await page.locator('.seeker-viewings__tab').nth(1).click();
        const retryState = page.locator('.seeker-dashboard__state[data-state="retry"]');
        await expect(retryState).toBeVisible();
        await expect(retryState.locator('button')).toBeEnabled();

        await context.setOffline(false);
        const recoveredRead = page.waitForResponse(response => response.request().method() === 'GET'
          && new URL(response.url()).pathname === '/api/v1/seeker/viewings');
        await retryState.locator('button').click();
        assert.equal((await recoveredRead).status(), 200);
        await expect(retryState).toHaveCount(0);
        await expect(settledContent).toBeVisible();
        assert.equal(await page.evaluate(() => performance.timeOrigin), timeOrigin);
        const geometry = await page.evaluate(() => ({ innerWidth, scrollWidth: document.documentElement.scrollWidth }));
        assert.equal(geometry.innerWidth, page.viewportSize().width);
        assert.ok(geometry.scrollWidth <= geometry.innerWidth);
        report.runs.push({
          locale, device, check: 'offline_tab_load_retry_recovers_without_navigation',
          initialHttpStatus: 200, recoveredHttpStatus: 200, retryVisible: true,
          documentReloaded: false, ...geometry,
        });
      } finally {
        await context.setOffline(false);
        if (loggedIn) {
          const logout = await context.request.post(`${base}/api/v1/auth/logout`, { data: {} });
          assert.ok([200, 204].includes(logout.status()), 'Fixture logout failed');
        }
        await context.close();
      }
    }
  }
  const viewingsAfter = JSON.stringify(await mongo.collection('viewings').find({ seekerId: viewingOwner }).sort({ _id: 1 }).toArray());
  assert.equal(viewingsAfter, viewingsBefore);
  report.viewingsUnchanged = true;
  report.status = 'PASS_LOCAL_SUBCASES';
} catch (error) {
  report.status = 'FAIL_LOCAL';
  report.failure = error instanceof assert.AssertionError ? 'Browser recovery assertion failed' : 'Browser recovery check failed';
  process.exitCode = 1;
} finally {
  try {
    if (user) {
      const newSessions = await mongo.collection('sessions').find({
        userId: user._id,
        ...(originalSessionIds.length > 0 ? { _id: { $nin: originalSessionIds.map(id => new Types.ObjectId(id)) } } : {}),
      }, { projection: { _id: 1 } }).toArray();
      const newSessionIds = newSessions.map(session => session._id.toHexString());
      if (newSessions.length > 0) await mongo.collection('sessions').deleteMany({ _id: { $in: newSessions.map(session => session._id) }, userId: user._id });
      if (newSessionIds.length > 0) await mongo.collection('audit_logs').deleteMany({ targetType: 'auth_session', targetId: { $in: newSessionIds } });
      const remainingNewSessions = await mongo.collection('sessions').countDocuments({
        userId: user._id,
        ...(originalSessionIds.length > 0 ? { _id: { $nin: originalSessionIds.map(id => new Types.ObjectId(id)) } } : {}),
      });
      report.cleanup = remainingNewSessions === 0;
      assert.ok(report.cleanup, 'Browser-created sessions were not cleaned up');
    }
  } catch {
    report.status = 'FAIL_LOCAL';
    report.failure = 'Local browser session cleanup failed';
    process.exitCode = 1;
  } finally {
    await browser.close();
    await mongo.close();
    report.finishedAt = new Date().toISOString();
    await writeFile('docs/quality/guide-runs/seeker-viewings-recovery-local-latest.json', `${JSON.stringify(report, null, 2)}\n`);
  }
}

console.log(JSON.stringify({ status: report.status, cases: report.runs.length, viewingsUnchanged: report.viewingsUnchanged, cleanup: report.cleanup }));
