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
const seekerPasswordCandidates = [...new Set([
  process.env.LOCAL_GUIDE_SEEKER_PASSWORD,
  'LocalGuide04-Only!2026',
  'LocalGuide10-Only!2026',
].filter(Boolean))];
const adminEmail = 'admin.demo@example.invalid';
const adminPassword = 'LocalPreview-Admin-Only-2026!';
assert.ok(mongoUri, 'Local MongoDB configuration required');
assert.equal(new URL(mongoUri).hostname, '127.0.0.1', 'Local MongoDB required');

const routes = [
  ['/admin/customer-requests', 'ADM-19', '/api/v1/admin/requests'],
  ['/admin/overdue-requests', 'ADM-20', '/api/v1/admin/requests/overdue'],
  ['/admin/viewing-requests', 'ADM-22', '/api/v1/admin/viewings'],
  ['/admin/search-requests', 'ADM-23', '/api/v1/admin/requests'],
  ['/admin/request-issues', 'ADM-24', '/api/v1/admin/request-issues'],
  ['/admin/contact-requests', 'ADM-21', '/api/v1/admin/requests'],
];
const report = {
  status: 'RUNNING', journeys: ['GUIDE-21'], mockedRoutes: false,
  environment: 'local-real-browser-api-mongodb',
  commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  routes: routes.map(([route, screenId]) => ({ route, screenId })),
  runs: [], limitedAdmin: [], temporaryRequestRemoved: false, cleanup: false,
};
const mongo = await mongoose.createConnection(mongoUri).asPromise();
const browser = await chromium.launch();
let seeker;
let admin;
let viewer;
let temporaryRequestId;
const originalSessions = new Map();
let stage = 'setup';

async function rememberSessions(user) {
  const ids = (await mongo.collection('sessions').find({ userId: user._id }, { projection: { _id: 1 } }).toArray())
    .map(session => session._id.toHexString());
  originalSessions.set(user._id.toHexString(), ids);
}

async function removeNewSessions(user) {
  const original = originalSessions.get(user._id.toHexString()) ?? [];
  const filter = {
    userId: user._id,
    ...(original.length > 0 ? { _id: { $nin: original.map(id => new Types.ObjectId(id)) } } : {}),
  };
  const sessions = await mongo.collection('sessions').find(filter, { projection: { _id: 1 } }).toArray();
  const ids = sessions.map(session => session._id.toHexString());
  if (sessions.length > 0) await mongo.collection('sessions').deleteMany({ _id: { $in: sessions.map(session => session._id) }, userId: user._id });
  if (ids.length > 0) await mongo.collection('audit_logs').deleteMany({ targetType: 'auth_session', targetId: { $in: ids } });
  return mongo.collection('sessions').countDocuments(filter);
}

try {
  seeker = await mongo.collection('users').findOne(
    { roleType: 'seeker', normalizedEmail: /^guide04-/u, status: 'verified' },
    { sort: { _id: -1 } },
  );
  admin = await mongo.collection('users').findOne({ roleType: 'admin', normalizedEmail: adminEmail, status: 'verified' });
  viewer = await mongo.collection('users').findOne({ roleType: 'admin', normalizedEmail: 'admin.viewer@example.invalid', status: 'verified' });
  assert.ok(seeker, 'Existing local GUIDE-04 fixture required');
  assert.ok(admin, 'Existing local demo Super Admin required');
  assert.ok(viewer, 'Existing local read-only Admin fixture required');
  await rememberSessions(seeker);
  await rememberSessions(admin);
  await rememberSessions(viewer);

  const setupContext = await browser.newContext();
  try {
    for (const password of seekerPasswordCandidates) {
      const login = await setupContext.request.post(`${base}/api/v1/auth/login`, {
        data: { email: seeker.normalizedEmail, password },
      });
      if (login.status() === 200) {
        const session = (await login.json()).data;
        const created = await setupContext.request.post(`${base}/api/v1/seeker/contact-requests`, {
          headers: { authorization: `Bearer ${session.accessToken}` },
          data: { message: `Local GUIDE-21 recovery ${randomUUID()}`, locale: 'en' },
        });
        assert.equal(created.status(), 201);
        temporaryRequestId = (await created.json()).data.id;
        assert.ok(Types.ObjectId.isValid(temporaryRequestId));
        break;
      }
      assert.equal(login.status(), 401, 'Unexpected seeker fixture login response');
    }
  } finally {
    await setupContext.close();
  }
  assert.ok(temporaryRequestId, 'Temporary contact request was not created');

  async function authenticatedStorageState(email) {
    const context = await browser.newContext();
    try {
      const login = await context.request.post(`${base}/api/v1/auth/login`, {
        data: { email, password: adminPassword },
      });
      assert.equal(login.status(), 200, `Local admin login failed for ${email}`);
      return context.storageState();
    } finally {
      await context.close();
    }
  }
  let adminStorageState = await authenticatedStorageState(adminEmail);
  let viewerStorageState = await authenticatedStorageState(viewer.normalizedEmail);

  for (const locale of ['ar', 'en']) {
    for (const [device, preset] of [['desktop', 'Desktop Chrome'], ['tablet', 'Galaxy Tab S4'], ['mobile', 'Pixel 5']]) {
      stage = `${locale}/${device}/login`;
      const context = await browser.newContext({ ...devices[preset], storageState: adminStorageState });
      try {
        const page = await context.newPage();
        const routeChecks = [];
        let transitionRequests = 0;
        page.on('request', request => {
          if (request.method() === 'POST' && new URL(request.url()).pathname === `/api/v1/admin/requests/${temporaryRequestId}/transitions`) transitionRequests += 1;
        });

        for (const [route, screenId, apiPath] of routes) {
          stage = `${locale}/${device}/${screenId}`;
          const read = page.waitForResponse(response => response.request().method() === 'GET'
            && new URL(response.url()).pathname === apiPath);
          await page.goto(`${base}${route}?lang=${locale}`, { waitUntil: 'networkidle' });
          assert.equal((await read).status(), 200);
          await expect(page.locator(`[data-screen-id="${screenId}"]`)).toBeVisible();
          await expect(page.locator(`[data-screen-id="${screenId}"]`)).toHaveAttribute('data-admin-requests-state', /success|empty/u);
          const geometry = await page.evaluate(() => ({ innerWidth, scrollWidth: document.documentElement.scrollWidth }));
          assert.equal(geometry.innerWidth, page.viewportSize().width);
          assert.ok(geometry.scrollWidth <= geometry.innerWidth);
          routeChecks.push({ route, screenId, httpStatus: 200, state: await page.locator(`[data-screen-id="${screenId}"]`).getAttribute('data-admin-requests-state'), ...geometry });
        }

        const requestRow = page.getByTestId(`admin-request-${temporaryRequestId}`);
        await expect(requestRow).toBeVisible();
        const timeOrigin = await page.evaluate(() => performance.timeOrigin);

        stage = `${locale}/${device}/empty`;
        const noMatch = `no-match-${randomUUID()}`;
        const emptyRead = page.waitForResponse(response => response.request().method() === 'GET'
          && new URL(response.url()).pathname === '/api/v1/admin/requests'
          && new URL(response.url()).searchParams.get('search') === noMatch);
        await page.locator('#admin-requests-search').fill(noMatch);
        await page.locator('#admin-requests-search').press('Enter');
        assert.equal((await emptyRead).status(), 200);
        await expect(page.locator('.admin-requests__empty[data-state="empty"]')).toBeVisible();

        const resetRead = page.waitForResponse(response => response.request().method() === 'GET'
          && new URL(response.url()).pathname === '/api/v1/admin/requests'
          && !new URL(response.url()).searchParams.has('search'));
        await page.locator('.admin-requests__filter-actions button[type="button"]').click();
        assert.equal((await resetRead).status(), 200);
        await expect(requestRow).toBeVisible();
        assert.equal(await page.evaluate(() => performance.timeOrigin), timeOrigin);

        stage = `${locale}/${device}/network-retry`;
        await context.setOffline(true);
        await page.locator('#admin-requests-search').press('Enter');
        const retryState = page.locator('.admin-requests__state[data-state="retry"]');
        await expect(retryState).toBeVisible();
        await expect(retryState.locator('button')).toBeEnabled();
        await context.setOffline(false);
        const recoveredRead = page.waitForResponse(response => response.request().method() === 'GET'
          && new URL(response.url()).pathname === '/api/v1/admin/requests');
        await retryState.locator('button').click();
        assert.equal((await recoveredRead).status(), 200);
        await expect(retryState).toHaveCount(0);
        await expect(requestRow).toBeVisible();
        assert.equal(await page.evaluate(() => performance.timeOrigin), timeOrigin);

        stage = `${locale}/${device}/validation`;
        await requestRow.getByRole('button').click();
        const detail = page.getByTestId('admin-request-detail');
        await expect(detail).toBeVisible();
        const reason = detail.locator('#admin-request-transition-reason');
        const submit = reason.locator('xpath=ancestor::form').locator('button[type="submit"]');
        for (const invalid of ['', '   ', 'ab']) {
          await reason.fill(invalid);
          await submit.click();
          await expect(detail.locator('.admin-requests__feedback')).toBeVisible();
        }
        assert.equal(transitionRequests, 0);
        assert.equal(await page.evaluate(() => performance.timeOrigin), timeOrigin);
        const stored = await mongo.collection('requests').findOne({ _id: new Types.ObjectId(temporaryRequestId) });
        assert.equal(stored?.status, 'new');
        assert.equal(stored?.version, 0);
        const auditWrites = await mongo.collection('audit_logs').countDocuments({ targetType: 'request', targetId: temporaryRequestId });
        assert.equal(auditWrites, 0);
        const geometry = await page.evaluate(() => ({ innerWidth, scrollWidth: document.documentElement.scrollWidth }));
        assert.ok(geometry.scrollWidth <= geometry.innerWidth);
        report.runs.push({
          locale, device, routeChecks,
          checks: ['six_admin_request_routes_real_api', 'empty_search_clear_recovers_without_navigation', 'offline_filter_retry_recovers_without_navigation', 'invalid_transition_reason_blocks_mutation'],
          httpStatuses: { contact: 200, empty: 200, reset: 200, recovered: 200 },
          transitionRequests: 0, requestUnchanged: true, auditWrites: 0, documentReloaded: false, ...geometry,
        });
      } finally {
        await context.setOffline(false);
        adminStorageState = await context.storageState();
        await context.close();
      }
    }
  }

  for (const locale of ['ar', 'en']) {
    stage = `${locale}/limited-admin`;
    const context = await browser.newContext({ ...devices['Desktop Chrome'], storageState: viewerStorageState });
    try {
      const page = await context.newPage();
      const routeChecks = [];
      const allowedScreens = new Set(['ADM-19', 'ADM-20', 'ADM-21', 'ADM-23']);
      for (const [route, screenId, apiPath] of routes) {
        stage = `${locale}/limited-admin/${screenId}`;
        const expectedStatus = allowedScreens.has(screenId) ? 200 : 403;
        const matchingStatuses = [];
        const recordResponse = response => {
          if (response.request().method() === 'GET' && new URL(response.url()).pathname === apiPath) {
            matchingStatuses.push(response.status());
          }
        };
        page.on('response', recordResponse);
        await page.goto(`${base}${route}?lang=${locale}`, { waitUntil: 'networkidle' });
        const screen = page.locator(`[data-screen-id="${screenId}"]`);
        await expect(screen).toBeVisible();
        await expect(screen).toHaveAttribute('data-admin-requests-state', expectedStatus === 200 ? /success|empty/u : 'permission');
        page.off('response', recordResponse);
        assert.equal(matchingStatuses.at(-1), expectedStatus);
        routeChecks.push({ route, screenId, httpStatus: expectedStatus,
          state: await screen.getAttribute('data-admin-requests-state') });
      }

      await page.goto(`${base}/admin/contact-requests?lang=${locale}`, { waitUntil: 'networkidle' });
      const row = page.getByTestId(`admin-request-${temporaryRequestId}`);
      await expect(row).toBeVisible();
      await row.getByRole('button').click();
      const detail = page.getByTestId('admin-request-detail');
      await expect(detail).toBeVisible();
      await expect(detail.locator('#admin-request-transition')).toHaveCount(0);
      await expect(detail.locator('#admin-request-assignee')).toHaveCount(0);
      await expect(detail.locator('#admin-request-note')).toHaveCount(0);

      const directStatuses = [];
      for (const [suffix, data] of [
        ['transitions', { transition: 'start_review', expectedVersion: 0, reason: 'Forbidden viewer transition' }],
        ['assign', { assigneeId: admin._id.toHexString(), expectedVersion: 0, reason: 'Forbidden viewer assignment' }],
        ['notes', { body: 'Forbidden viewer note', expectedVersion: 0 }],
      ]) {
        const response = await context.request.post(`${base}/api/v1/admin/requests/${temporaryRequestId}/${suffix}`, { data });
        directStatuses.push(response.status());
      }
      assert.deepEqual(directStatuses, [403, 403, 403]);
      const stored = await mongo.collection('requests').findOne({ _id: new Types.ObjectId(temporaryRequestId) });
      assert.equal(stored?.status, 'new');
      assert.equal(stored?.version, 0);
      assert.equal(await mongo.collection('audit_logs').countDocuments({ targetType: 'request', targetId: temporaryRequestId }), 0);
      report.limitedAdmin.push({ locale, routeChecks, directMutationStatuses: directStatuses,
        mutationControlsHidden: true, requestUnchanged: true, auditWrites: 0 });
    } finally {
      viewerStorageState = await context.storageState();
      await context.close();
    }
  }
  report.status = 'PASS_LOCAL_SUBCASES';
} catch (error) {
  report.status = 'FAIL_LOCAL';
  report.failure = error instanceof Error ? `${stage}: ${error.message}` : `${stage}: Admin request browser recovery check failed`;
  process.exitCode = 1;
} finally {
  try {
    if (temporaryRequestId && Types.ObjectId.isValid(temporaryRequestId)) {
      const id = new Types.ObjectId(temporaryRequestId);
      await mongo.collection('request_events').deleteMany({ requestId: { $in: [id, temporaryRequestId] } });
      await mongo.collection('request_issues').deleteMany({ requestId: { $in: [id, temporaryRequestId] } });
      await mongo.collection('audit_logs').deleteMany({ targetType: 'request', targetId: temporaryRequestId });
      await mongo.collection('requests').deleteOne({ _id: id, seekerId: seeker?._id });
      report.temporaryRequestRemoved = (await mongo.collection('requests').countDocuments({ _id: id })) === 0;
    }
    const remainingSessions = (await Promise.all([seeker, admin, viewer].filter(Boolean).map(removeNewSessions))).reduce((sum, count) => sum + count, 0);
    report.cleanup = remainingSessions === 0 && (temporaryRequestId === undefined || report.temporaryRequestRemoved);
    assert.ok(report.cleanup, 'Temporary request or browser sessions were not cleaned up');
  } catch (error) {
    report.status = 'FAIL_LOCAL';
    report.failure = `${report.failure ? `${report.failure}; ` : ''}Local temporary data cleanup failed${error instanceof Error ? `: ${error.message}` : ''}`;
    process.exitCode = 1;
  } finally {
    await browser.close();
    await mongo.close();
    report.finishedAt = new Date().toISOString();
    await writeFile('docs/quality/guide-runs/admin-requests-recovery-local-latest.json', `${JSON.stringify(report, null, 2)}\n`);
  }
}

console.log(JSON.stringify({ status: report.status, cases: report.runs.length, temporaryRequestRemoved: report.temporaryRequestRemoved, cleanup: report.cleanup }));
