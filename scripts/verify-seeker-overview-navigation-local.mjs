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
  status: 'RUNNING',
  journeys: ['GUIDE-05'],
  environment: 'local-real-browser-api-mongodb',
  mockedRoutes: false,
  commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  runs: [],
  startedAt: new Date().toISOString(),
  sessionsRemoved: false,
  favoritesUnchanged: false,
};
const mongo = await mongoose.createConnection(mongoUri).asPromise();
const browser = await chromium.launch();
let seeker;
let temporaryViewingId;
let originalSessionIds = [];
let stage = 'setup';

async function login(context, email) {
  for (const password of passwordCandidates) {
    const response = await context.request.post(`${base}/api/v1/auth/login`, { data: { email, password } });
    if (response.status() === 200) return (await response.json()).data;
    assert.equal(response.status(), 401, 'Unexpected local fixture login response');
  }
  throw new Error('No known local seeker password accepted');
}

async function removeNewSessions() {
  if (!seeker) return;
  const filter = {
    userId: seeker._id,
    ...(originalSessionIds.length > 0 ? { _id: { $nin: originalSessionIds.map(id => new Types.ObjectId(id)) } } : {}),
  };
  const sessions = await mongo.collection('sessions').find(filter, { projection: { _id: 1 } }).toArray();
  const ids = sessions.map(session => session._id.toHexString());
  if (sessions.length > 0) {
    await mongo.collection('sessions').deleteMany({ _id: { $in: sessions.map(session => session._id) }, userId: seeker._id });
  }
  if (ids.length > 0) await mongo.collection('audit_logs').deleteMany({ targetType: 'auth_session', targetId: { $in: ids } });
  report.sessionsRemoved = await mongo.collection('sessions').countDocuments(filter) === 0;
}

try {
  assert.equal((await fetch(`${base}/health`)).status, 200);
  const seekers = await mongo.collection('users').find(
    { roleType: 'seeker', status: 'verified', normalizedEmail: /^guide04-/u },
    { projection: { normalizedEmail: 1, roleType: 1, status: 1 } },
  ).sort({ _id: -1 }).toArray();
  for (const candidate of seekers) {
    if (await mongo.collection('requests').countDocuments({ seekerId: candidate._id }) > 0 && await mongo.collection('viewings').countDocuments({ seekerId: candidate._id }) > 0 && await mongo.collection('notifications').countDocuments({ recipientId: candidate._id }) > 0) {
      seeker = candidate;
      break;
    }
  }
  assert.ok(seeker, 'A verified local GUIDE-04 seeker with zero favorites is required');
  const template = await mongo.collection('viewings').findOne({ seekerId: seeker._id });
  assert.ok(template);
  temporaryViewingId = new Types.ObjectId();
  await mongo.collection('viewings').insertOne({ ...template, _id: temporaryViewingId, status: 'requested', requestedAt: new Date(Date.now() + 86400000), createdAt: new Date(), updatedAt: new Date() });
  const initialFavoriteCount = await mongo.collection('favorites').countDocuments({ seekerId: seeker._id });

  originalSessionIds = (await mongo.collection('sessions').find({ userId: seeker._id }, { projection: { _id: 1 } }).toArray())
    .map(session => session._id.toHexString());

  for (const locale of ['ar', 'en']) {
    for (const [device, preset] of [['desktop', 'Desktop Chrome'], ['tablet', 'Galaxy Tab S4'], ['mobile', 'Pixel 5']]) {
      stage = `${locale}/${device}`;
      const context = await browser.newContext({ ...devices[preset] });
      try {
        const session = await login(context, seeker.normalizedEmail);
        const page = await context.newPage();
        const transitions = [];
        for (const [panel, expectedPath, target] of [
          ['requests', /^\/seeker\/requests\/[a-f0-9]{24}$/, '.seeker-request-detail'],
          ['viewings', /^\/seeker\/viewings$/, '.seeker-viewings'],
          ['notifications', /^\/seeker\/notifications$/, '.seeker-notifications']
        ]) {
          await page.goto(`${base}/seeker?lang=${locale}`, { waitUntil: 'networkidle' });
          const section = page.locator(`.seeker-overview__activity-panel--${panel}`);
          const link = panel === 'notifications' ? section.locator('a').first() : section.locator('.seeker-overview__activity-row').first();
          await expect(link).toBeVisible();
          const href = new URL(await link.getAttribute('href'), base);
          assert.match(href.pathname, expectedPath);
          assert.equal(href.searchParams.get('lang'), locale);
          const failures = [];
          const listener = response => { if (new URL(response.url()).pathname.startsWith('/api/v1/') && response.status() >= 400) failures.push(response.status()); };
          page.on('response', listener);
          await link.click();
          await page.waitForLoadState('networkidle');
          await expect(page.locator(target)).toBeVisible();
          assert.match(new URL(page.url()).pathname, expectedPath);
          assert.equal(await page.locator('html').getAttribute('lang'), locale);
          assert.deepEqual(failures, []);
          page.off('response', listener);
          transitions.push(panel);
        }
        const geometry = await page.evaluate(() => ({ innerWidth, scrollWidth: document.documentElement.scrollWidth }));
        assert.equal(geometry.innerWidth, page.viewportSize().width);
        assert.ok(geometry.scrollWidth <= geometry.innerWidth);
        report.runs.push({
          locale,
          device,
          checks: ['request_activity_to_detail', 'viewing_activity_to_list', 'notification_panel_to_list', 'locale_preserved', 'no_horizontal_overflow'],
          apiHttpStatus: 200,
          browserHttpStatus: 200,
          transitions,
          ...geometry,
        });
      } finally {
        await context.close();
      }
    }
  }
  report.favoritesUnchanged = await mongo.collection('favorites').countDocuments({ seekerId: seeker._id }) === initialFavoriteCount;
  assert.equal(report.favoritesUnchanged, true);
  report.status = 'PASS_LOCAL_SUBCASES';
} catch (error) {
  report.status = 'FAIL_LOCAL';
  report.failure = `${stage}: ${error instanceof Error ? error.message.slice(0, 700) : 'Unknown failure'}`;
  process.exitCode = 1;
} finally {
  try {
    if (temporaryViewingId) {
      await mongo.collection('viewings').deleteOne({ _id: temporaryViewingId, seekerId: seeker._id });
      report.temporaryViewingRemoved = await mongo.collection('viewings').countDocuments({ _id: temporaryViewingId }) === 0;
      assert.ok(report.temporaryViewingRemoved);
    }
    await removeNewSessions();
  } catch (error) {
    report.status = 'FAIL_LOCAL';
    report.failure = `${report.failure ? `${report.failure}; ` : ''}session cleanup failed${error instanceof Error ? `: ${error.message}` : ''}`;
    process.exitCode = 1;
  } finally {
    await browser.close();
    await mongo.close();
    report.finishedAt = new Date().toISOString();
    await writeFile('docs/quality/guide-runs/seeker-overview-navigation-local-latest.json', `${JSON.stringify(report, null, 2)}\n`);
  }
}

console.log(JSON.stringify({ status: report.status, cases: report.runs.length, sessionsRemoved: report.sessionsRemoved, favoritesUnchanged: report.favoritesUnchanged, mockedRoutes: report.mockedRoutes }));
