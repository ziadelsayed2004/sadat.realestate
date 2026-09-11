import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
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
  status: 'RUNNING', journeys: ['GUIDE-06'], mockedRoutes: false,
  environment: 'local-real-browser-api-mongodb',
  commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  runs: [], temporaryRequestRemoved: false, cleanup: false,
};
const mongo = await mongoose.createConnection(mongoUri).asPromise();
const browser = await chromium.launch();
let user;
let temporaryRequestId;
let originalSessionIds = [];

try {
  user = await mongo.collection('users').findOne(
    { roleType: 'seeker', normalizedEmail: /^guide04-/, status: 'verified' },
    { sort: { _id: -1 } }
  );
  assert.ok(user, 'Existing local GUIDE-04 fixture required');
  originalSessionIds = (await mongo.collection('sessions').find({ userId: user._id }, { projection: { _id: 1 } }).toArray())
    .map(session => session._id.toHexString());

  let localPassword;
  const setupContext = await browser.newContext();
  try {
    for (const password of passwordCandidates) {
      const response = await setupContext.request.post(`${base}/api/v1/auth/login`, {
        data: { email: user.normalizedEmail, password },
      });
      if (response.status() === 200) {
        localPassword = password;
        const session = (await response.json()).data;
        const created = await setupContext.request.post(`${base}/api/v1/seeker/contact-requests`, {
          headers: { authorization: `Bearer ${session.accessToken}` },
          data: { message: `Local GUIDE-06 recovery ${randomUUID()}`, locale: 'en' },
        });
        assert.equal(created.status(), 201);
        temporaryRequestId = (await created.json()).data.id;
        assert.ok(Types.ObjectId.isValid(temporaryRequestId));
        const logout = await setupContext.request.post(`${base}/api/v1/auth/logout`, { data: {} });
        assert.ok([200, 204].includes(logout.status()), 'Setup logout failed');
        break;
      }
      assert.equal(response.status(), 401, 'Unexpected fixture login response');
    }
  } finally {
    await setupContext.close();
  }
  assert.ok(localPassword, 'No known local GUIDE-04 fixture password worked');
  assert.ok(temporaryRequestId, 'Temporary request was not created');

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
        let transitionRequests = 0;
        page.on('request', request => {
          if (request.method() === 'POST' && new URL(request.url()).pathname === `/api/v1/seeker/requests/${temporaryRequestId}/transitions`) transitionRequests += 1;
        });

        const initialRead = page.waitForResponse(response => response.request().method() === 'GET'
          && new URL(response.url()).pathname === '/api/v1/seeker/requests');
        await page.goto(`${base}/seeker/requests?lang=${locale}`, { waitUntil: 'networkidle' });
        assert.equal((await initialRead).status(), 200);
        const requestLink = page.locator(`a[href*="/seeker/requests/${temporaryRequestId}"]`);
        await expect(requestLink).toBeVisible();
        const listTimeOrigin = await page.evaluate(() => performance.timeOrigin);

        const noMatch = `no-match-${randomUUID()}`;
        const emptyRead = page.waitForResponse(response => response.request().method() === 'GET'
          && new URL(response.url()).pathname === '/api/v1/seeker/requests'
          && new URL(response.url()).searchParams.get('search') === noMatch);
        await page.locator('#seeker-requests-search').fill(noMatch);
        assert.equal((await emptyRead).status(), 200);
        await expect(page.locator('.seeker-dashboard__empty[data-state="empty"]')).toBeVisible();

        const resetRead = page.waitForResponse(response => response.request().method() === 'GET'
          && new URL(response.url()).pathname === '/api/v1/seeker/requests'
          && !new URL(response.url()).searchParams.has('search'));
        await page.locator('#seeker-requests-search').fill('');
        assert.equal((await resetRead).status(), 200);
        await expect(requestLink).toBeVisible();
        assert.equal(await page.evaluate(() => performance.timeOrigin), listTimeOrigin);

        await context.setOffline(true);
        await page.locator('.seeker-requests__filter').nth(1).click();
        const retryState = page.locator('.seeker-dashboard__state[data-state="retry"]');
        await expect(retryState).toBeVisible();
        await expect(retryState.locator('button')).toBeEnabled();
        await context.setOffline(false);
        const recoveredRead = page.waitForResponse(response => response.request().method() === 'GET'
          && new URL(response.url()).pathname === '/api/v1/seeker/requests');
        await retryState.locator('button').click();
        assert.equal((await recoveredRead).status(), 200);
        await expect(retryState).toHaveCount(0);
        await expect(requestLink).toBeVisible();
        assert.equal(await page.evaluate(() => performance.timeOrigin), listTimeOrigin);

        const detailRead = page.waitForResponse(response => response.request().method() === 'GET'
          && new URL(response.url()).pathname === `/api/v1/seeker/requests/${temporaryRequestId}`);
        await page.goto(`${base}/seeker/requests/${temporaryRequestId}?lang=${locale}`, { waitUntil: 'networkidle' });
        assert.equal((await detailRead).status(), 200);
        const detailTimeOrigin = await page.evaluate(() => performance.timeOrigin);
        await page.locator('.seeker-request-detail__cancel > button').click();
        const cancelForm = page.locator('.seeker-request-detail__cancel form');
        await cancelForm.locator('button[type="submit"]').click();
        await expect(cancelForm.getByRole('alert')).toBeVisible();
        await cancelForm.locator('textarea').fill('   ');
        await cancelForm.locator('button[type="submit"]').click();
        await expect(cancelForm.getByRole('alert')).toBeVisible();
        assert.equal(transitionRequests, 0);
        assert.equal(await page.evaluate(() => performance.timeOrigin), detailTimeOrigin);

        const stored = await mongo.collection('requests').findOne({ _id: new Types.ObjectId(temporaryRequestId) });
        assert.equal(stored?.status, 'new');
        assert.equal(stored?.version, 0);
        const geometry = await page.evaluate(() => ({ innerWidth, scrollWidth: document.documentElement.scrollWidth }));
        assert.equal(geometry.innerWidth, page.viewportSize().width);
        assert.ok(geometry.scrollWidth <= geometry.innerWidth);
        report.runs.push({
          locale, device,
          checks: ['empty_search_clear_recovers_without_navigation', 'offline_filter_retry_recovers_without_navigation', 'empty_cancel_reason_blocks_mutation'],
          httpStatuses: { initial: 200, empty: 200, reset: 200, recovered: 200, detail: 200 },
          transitionRequests: 0, requestUnchanged: true, ...geometry,
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
  report.status = 'PASS_LOCAL_SUBCASES';
} catch (error) {
  report.status = 'FAIL_LOCAL';
  report.failure = error instanceof assert.AssertionError ? 'Browser request assertion failed' : 'Browser request recovery check failed';
  process.exitCode = 1;
} finally {
  try {
    if (temporaryRequestId && Types.ObjectId.isValid(temporaryRequestId)) {
      const id = new Types.ObjectId(temporaryRequestId);
      await mongo.collection('request_events').deleteMany({ requestId: { $in: [id, temporaryRequestId] } });
      await mongo.collection('request_issues').deleteMany({ requestId: { $in: [id, temporaryRequestId] } });
      await mongo.collection('audit_logs').deleteMany({ targetType: 'request', targetId: temporaryRequestId });
      await mongo.collection('requests').deleteOne({ _id: id, seekerId: user?._id });
      report.temporaryRequestRemoved = (await mongo.collection('requests').countDocuments({ _id: id })) === 0;
    }
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
      report.cleanup = remainingNewSessions === 0 && report.temporaryRequestRemoved;
      assert.ok(report.cleanup, 'Temporary request or browser sessions were not cleaned up');
    }
  } catch {
    report.status = 'FAIL_LOCAL';
    report.failure = 'Local temporary data cleanup failed';
    process.exitCode = 1;
  } finally {
    await browser.close();
    await mongo.close();
    report.finishedAt = new Date().toISOString();
    await writeFile('docs/quality/guide-runs/seeker-requests-recovery-local-latest.json', `${JSON.stringify(report, null, 2)}\n`);
  }
}

console.log(JSON.stringify({ status: report.status, cases: report.runs.length, temporaryRequestRemoved: report.temporaryRequestRemoved, cleanup: report.cleanup }));
