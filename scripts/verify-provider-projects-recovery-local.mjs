import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
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
  runs: [], temporaryProjectsRemoved: false, cleanup: false,
};
const mongo = await mongoose.createConnection(mongoUri).asPromise();
const browser = await chromium.launch();
const projectIds = [];
let user;
let password;
let originalSessionIds = [];
let activeStage = 'setup';

try {
  user = await mongo.collection('users').findOne(
    { roleType: 'provider', normalizedEmail: /^guide-provider-/u, status: 'verified' },
    { sort: { _id: -1 } }
  );
  assert.ok(user);
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
      if (process.env.LOCAL_GUIDE_DEVICE && process.env.LOCAL_GUIDE_DEVICE !== device) continue;
      activeStage = `${locale}/${device}/login`;
      const context = await browser.newContext({ ...devices[preset] });
      let loggedIn = false;
      try {
        const login = await context.request.post(`${base}/api/v1/auth/login`, { data: { email: user.normalizedEmail, password } });
        loggedIn = login.status() === 200;
        assert.ok(loggedIn);
        const page = await context.newPage();
        activeStage = `${locale}/${device}/initial-load`;
        const initialRead = page.waitForResponse(response => response.request().method() === 'GET'
          && new URL(response.url()).pathname === '/api/v1/provider/projects');
        await page.goto(`${base}/provider/projects?lang=${locale}`, { waitUntil: 'networkidle' });
        assert.equal((await initialRead).status(), 200);
        await expect(page.locator('[data-screen-id="PRV-15"]')).toBeVisible();
        const timeOrigin = await page.evaluate(() => performance.timeOrigin);
        const filters = page.locator('.provider-projects__filters');

        activeStage = `${locale}/${device}/empty-search`;
        const noMatch = `no-match-${randomUUID()}`;
        const emptyRead = page.waitForResponse(response => response.request().method() === 'GET'
          && new URL(response.url()).pathname === '/api/v1/provider/projects'
          && new URL(response.url()).searchParams.get('search') === noMatch);
        await page.locator('#provider-projects-search').fill(noMatch);
        await filters.locator('button[type="submit"]').click();
        assert.equal((await emptyRead).status(), 200);
        await expect(page.locator('.provider-projects__empty[data-state="empty"]')).toBeVisible();
        const resetRead = page.waitForResponse(response => response.request().method() === 'GET'
          && new URL(response.url()).pathname === '/api/v1/provider/projects'
          && !new URL(response.url()).searchParams.has('search'));
        await filters.locator('button[type="button"]').click();
        assert.equal((await resetRead).status(), 200);

        activeStage = `${locale}/${device}/offline-retry`;
        await context.setOffline(true);
        await page.locator('#provider-projects-status').selectOption('published');
        await filters.locator('button[type="submit"]').click();
        const retry = page.locator('.provider-projects__state[data-state="retry"]');
        await expect(retry).toBeVisible();
        await context.setOffline(false);
        const recoveredRead = page.waitForResponse(response => response.request().method() === 'GET'
          && new URL(response.url()).pathname === '/api/v1/provider/projects'
          && new URL(response.url()).searchParams.get('status') === 'published');
        await retry.locator('button').click();
        assert.equal((await recoveredRead).status(), 200);
        await expect(retry).toHaveCount(0);
        const clearRead = page.waitForResponse(response => response.request().method() === 'GET'
          && new URL(response.url()).pathname === '/api/v1/provider/projects'
          && !new URL(response.url()).searchParams.has('status'));
        await filters.locator('button[type="button"]').click();
        assert.equal((await clearRead).status(), 200);

        activeStage = `${locale}/${device}/create-modal`;
        let creates = 0;
        page.on('request', request => {
          if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/v1/provider/projects') creates += 1;
        });
        await page.locator('.provider-projects__heading > button').click();
        const submit = page.locator('button[form="provider-project-form"][type="submit"]');
        await submit.click();
        await expect(page.locator('#provider-project-form').getByRole('alert')).toBeVisible();
        assert.equal(creates, 0);
        const unique = randomUUID();
        await page.locator('#provider-project-name-ar').fill(`مشروع تحقق ${unique.slice(0, 8)}`);
        await page.locator('#provider-project-name-en').fill(`Recovery project ${unique.slice(0, 8)}`);
        await page.locator('#provider-project-slug').fill(`recovery-project-${unique}`);
        await page.locator('#provider-project-reason').fill('Temporary GUIDE-16 browser evidence');
        activeStage = `${locale}/${device}/submit-create`;
        const createdResponse = page.waitForResponse(response => response.request().method() === 'POST'
          && new URL(response.url()).pathname === '/api/v1/provider/projects');
        await submit.click();
        const created = await createdResponse;
        assert.equal(created.status(), 201);
        const id = (await created.json()).data.id;
        assert.ok(Types.ObjectId.isValid(id));
        projectIds.push(id);
        await expect(page.getByTestId(`provider-project-${id}`)).toBeVisible();
        const stored = await mongo.collection('projects').findOne({ _id: new Types.ObjectId(id), providerId: user._id });
        assert.equal(stored?.slug, `recovery-project-${unique}`);
        assert.equal(creates, 1);
        assert.equal(await page.evaluate(() => performance.timeOrigin), timeOrigin);
        const geometry = await page.evaluate(() => ({ innerWidth, scrollWidth: document.documentElement.scrollWidth }));
        assert.equal(geometry.innerWidth, page.viewportSize().width);
        assert.ok(geometry.scrollWidth <= geometry.innerWidth);
        report.runs.push({ locale, device,
          checks: ['empty_search_clear_recovers_without_navigation', 'offline_filter_retry_recovers_without_navigation',
            'invalid_form_blocks_request', 'browser_create_persists_owned_project'],
          httpStatuses: { initial: 200, empty: 200, reset: 200, recovered: 200, clear: 200, create: 201 }, ...geometry });
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
  report.status = 'PASS_LOCAL_SUBCASES';
} catch (error) {
  report.status = 'FAIL_LOCAL';
  report.failure = { stage: activeStage, message: error instanceof Error ? error.message : String(error) };
  process.exitCode = 1;
} finally {
  try {
    const ids = projectIds.map(id => new Types.ObjectId(id));
    if (ids.length > 0) {
      await mongo.collection('audit_logs').deleteMany({ targetType: 'project', targetId: { $in: projectIds } });
      await mongo.collection('projects').deleteMany({ _id: { $in: ids }, providerId: user?._id });
    }
    report.temporaryProjectsRemoved = ids.length === 0 || await mongo.collection('projects').countDocuments({ _id: { $in: ids } }) === 0;
    if (user) {
      const newSessions = await mongo.collection('sessions').find({ userId: user._id,
        ...(originalSessionIds.length > 0 ? { _id: { $nin: originalSessionIds.map(id => new Types.ObjectId(id)) } } : {}) }).toArray();
      const sessionIds = newSessions.map(session => session._id.toHexString());
      if (newSessions.length > 0) await mongo.collection('sessions').deleteMany({ _id: { $in: newSessions.map(session => session._id) } });
      if (sessionIds.length > 0) await mongo.collection('audit_logs').deleteMany({ targetType: 'auth_session', targetId: { $in: sessionIds } });
      report.cleanup = report.temporaryProjectsRemoved && await mongo.collection('sessions').countDocuments({ userId: user._id,
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
    await writeFile('docs/quality/guide-runs/provider-projects-recovery-local-latest.json', `${JSON.stringify(report, null, 2)}\n`);
  }
}

console.log(JSON.stringify({ status: report.status, cases: report.runs.length, temporaryProjectsRemoved: report.temporaryProjectsRemoved, cleanup: report.cleanup }));
