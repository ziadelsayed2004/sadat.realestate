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
  process.env.LOCAL_GUIDE_PROVIDER_PASSWORD,
  'LocalProvider-Journey-Only!2026',
].filter(Boolean))];
assert.ok(mongoUri, 'Local MongoDB configuration required');
assert.equal(new URL(mongoUri).hostname, '127.0.0.1', 'Local MongoDB required');

const report = {
  status: 'RUNNING', journeys: ['GUIDE-16'], mockedRoutes: false,
  environment: 'local-real-browser-api-mongodb',
  commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  runs: [], temporaryRequestRemoved: false, cleanup: false,
};
let activeStage = 'setup';
const mongo = await mongoose.createConnection(mongoUri).asPromise();
const browser = await chromium.launch();
let user;
const temporaryRequestIds = [];
let originalSessionIds = [];

try {
  user = await mongo.collection('users').findOne(
    { roleType: 'provider', normalizedEmail: /^guide-provider-/u, status: 'verified' },
    { sort: { _id: -1 } }
  );
  assert.ok(user, 'Existing local provider journey fixture required');
  originalSessionIds = (await mongo.collection('sessions').find({ userId: user._id }, { projection: { _id: 1 } }).toArray())
    .map(session => session._id.toHexString());

  let localPassword;
  const setupContext = await browser.newContext();
  try {
    for (const password of passwordCandidates) {
      const login = await setupContext.request.post(`${base}/api/v1/auth/login`, {
        data: { email: user.normalizedEmail, password },
      });
      if (login.status() !== 200) {
        assert.equal(login.status(), 401, 'Unexpected fixture login response');
        continue;
      }
      localPassword = password;
      const logout = await setupContext.request.post(`${base}/api/v1/auth/logout`, { data: {} });
      assert.ok([200, 204].includes(logout.status()), 'Setup logout failed');
      break;
    }
  } finally {
    await setupContext.close();
  }
  assert.ok(localPassword, 'No known local provider fixture password worked');

  for (const locale of ['ar', 'en']) {
    for (const [device, preset] of [['desktop', 'Desktop Chrome'], ['tablet', 'Galaxy Tab S4'], ['mobile', 'Pixel 5']]) {
      if (process.env.LOCAL_GUIDE_DEVICE && process.env.LOCAL_GUIDE_DEVICE !== device) continue;
      activeStage = `${locale}/${device}/login`;
      const context = await browser.newContext({ ...devices[preset] });
      let loggedIn = false;
      try {
        const login = await context.request.post(`${base}/api/v1/auth/login`, {
          data: { email: user.normalizedEmail, password: localPassword },
        });
        loggedIn = login.status() === 200;
        assert.ok(loggedIn, 'Local provider fixture login failed');
        const page = await context.newPage();
        activeStage = `${locale}/${device}/initial-load`;
        const initialRead = page.waitForResponse(response => response.request().method() === 'GET'
          && new URL(response.url()).pathname === '/api/v1/provider/customer-requests');
        await page.goto(`${base}/provider/customer-requests?lang=${locale}`, { waitUntil: 'networkidle' });
        assert.equal((await initialRead).status(), 200);
        await expect(page.locator('[data-screen-id="PRV-16"]')).toBeVisible();
        const timeOrigin = await page.evaluate(() => performance.timeOrigin);
        const filters = page.locator('.provider-customer-requests__filters');

        const noMatch = `no-match-${randomUUID()}`;
        activeStage = `${locale}/${device}/empty-search`;
        const emptyRead = page.waitForResponse(response => response.request().method() === 'GET'
          && new URL(response.url()).pathname === '/api/v1/provider/customer-requests'
          && new URL(response.url()).searchParams.get('search') === noMatch);
        await page.locator('#provider-customer-requests-search').fill(noMatch);
        await filters.locator('button[type="submit"]').click();
        assert.equal((await emptyRead).status(), 200);
        await expect(page.locator('.provider-customer-requests__empty[data-state="empty"]')).toBeVisible();

        const resetRead = page.waitForResponse(response => response.request().method() === 'GET'
          && new URL(response.url()).pathname === '/api/v1/provider/customer-requests'
          && !new URL(response.url()).searchParams.has('search'));
        await filters.locator('button[type="button"]').click();
        assert.equal((await resetRead).status(), 200);

        await context.setOffline(true);
        activeStage = `${locale}/${device}/offline-retry`;
        await page.locator('#provider-customer-requests-status').selectOption('contacted');
        await filters.locator('button[type="submit"]').click();
        const retryState = page.locator('.provider-customer-requests__state[data-state="retry"]');
        await expect(retryState).toBeVisible();
        await expect(retryState.locator('button')).toBeEnabled();
        await context.setOffline(false);
        const recoveredRead = page.waitForResponse(response => response.request().method() === 'GET'
          && new URL(response.url()).pathname === '/api/v1/provider/customer-requests'
          && new URL(response.url()).searchParams.get('status') === 'contacted');
        await retryState.locator('button').click();
        assert.equal((await recoveredRead).status(), 200);
        await expect(retryState).toHaveCount(0);
        await expect(page.locator('.provider-customer-requests__empty[data-state="empty"]')).toBeVisible();

        const clearAfterRetry = page.waitForResponse(response => response.request().method() === 'GET'
          && new URL(response.url()).pathname === '/api/v1/provider/customer-requests'
          && !new URL(response.url()).searchParams.has('status'));
        await filters.locator('button[type="button"]').click();
        assert.equal((await clearAfterRetry).status(), 200);

        activeStage = `${locale}/${device}/open-create`;
        let createRequests = 0;
        page.on('request', request => {
          if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/v1/provider/customer-requests') createRequests += 1;
        });
        await page.locator('.provider-customer-requests__heading-actions button').click();
        const submit = page.locator('button[form="provider-customer-request-form"][type="submit"]');
        activeStage = `${locale}/${device}/blank-validation`;
        await submit.click();
        await expect(page.locator('#provider-customer-request-form').getByRole('alert')).toBeVisible();
        assert.equal(createRequests, 0);
        const unique = randomUUID();
        await page.locator('#provider-customer-first-name').fill('Recovery');
        await page.locator('#provider-customer-last-name').fill('Customer');
        await page.locator('#provider-customer-phone').fill('+201001234567');
        await page.locator('#provider-customer-email').fill(`recovery-${unique}@example.invalid`);
        await page.locator('#provider-customer-message').fill(`GUIDE-16 recovery ${unique}`);
        activeStage = `${locale}/${device}/submit-create`;
        const createdResponse = page.waitForResponse(response => response.request().method() === 'POST'
          && new URL(response.url()).pathname === '/api/v1/provider/customer-requests');
        await submit.click();
        const created = await createdResponse;
        assert.equal(created.status(), 201);
        const createdId = (await created.json()).data.id;
        assert.ok(Types.ObjectId.isValid(createdId));
        temporaryRequestIds.push(createdId);
        await expect(page.getByTestId(`provider-customer-request-${createdId}`)).toBeVisible();
        const stored = await mongo.collection('requests').findOne({ _id: new Types.ObjectId(createdId), providerId: user._id });
        assert.equal(stored?.payload?.email, `recovery-${unique}@example.invalid`);
        assert.equal(createRequests, 1);
        assert.equal(await page.evaluate(() => performance.timeOrigin), timeOrigin);
        const geometry = await page.evaluate(() => ({ innerWidth, scrollWidth: document.documentElement.scrollWidth }));
        assert.equal(geometry.innerWidth, page.viewportSize().width);
        assert.ok(geometry.scrollWidth <= geometry.innerWidth);
        report.runs.push({
          locale, device,
          checks: ['empty_search_clear_recovers_without_navigation', 'offline_filter_retry_recovers_without_navigation',
            'invalid_form_blocks_request', 'browser_create_persists_owned_request'],
          httpStatuses: { initial: 200, empty: 200, reset: 200, recovered: 200, clearAfterRetry: 200, create: 201 },
          ...geometry,
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
  report.failure = {
    stage: activeStage,
    kind: error instanceof assert.AssertionError ? 'assertion' : 'browser-recovery',
    message: error instanceof Error ? error.message : String(error),
  };
  process.exitCode = 1;
} finally {
  try {
    if (temporaryRequestIds.length > 0) {
      const ids = temporaryRequestIds.map(id => new Types.ObjectId(id));
      await mongo.collection('audit_logs').deleteMany({ targetType: 'request', targetId: { $in: temporaryRequestIds } });
      await mongo.collection('requests').deleteMany({ _id: { $in: ids }, providerId: user?._id });
      report.temporaryRequestRemoved = (await mongo.collection('requests').countDocuments({ _id: { $in: ids } })) === 0;
    } else report.temporaryRequestRemoved = true;
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
  } catch (cleanupError) {
    report.status = 'FAIL_LOCAL';
    report.cleanupFailure = cleanupError instanceof Error ? cleanupError.message : String(cleanupError);
    process.exitCode = 1;
  } finally {
    await browser.close();
    await mongo.close();
    report.finishedAt = new Date().toISOString();
    await writeFile('docs/quality/guide-runs/provider-customer-recovery-local-latest.json', `${JSON.stringify(report, null, 2)}\n`);
  }
}

console.log(JSON.stringify({ status: report.status, cases: report.runs.length, temporaryRequestRemoved: report.temporaryRequestRemoved, cleanup: report.cleanup }));
