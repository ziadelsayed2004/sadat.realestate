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
assert.equal(new URL(base).hostname, '127.0.0.1');
const browser = await chromium.launch();
let seeker;
let originalSessionIds = [];
let stage = 'setup';

let acceptedPassword;
async function login(context, email) {
  for (const password of acceptedPassword ? [acceptedPassword] : passwordCandidates) {
    let response;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      response = await context.request.post(`${base}/api/v1/auth/login`, { data: { email, password } });
      if (response.status() !== 429) break;
      const seconds = Math.min(60, Math.max(1, Number(response.headers()['retry-after']) || 60));
      await new Promise(resolve => setTimeout(resolve, seconds * 1000));
    }
    if (response.status() === 200) { acceptedPassword = password; return (await response.json()).data; }
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
    if (await mongo.collection('favorites').countDocuments({ seekerId: candidate._id }) === 0) {
      seeker = candidate;
      break;
    }
  }
  assert.ok(seeker, 'A verified local GUIDE-04 seeker with zero favorites is required');
  const initialFavoriteCount = await mongo.collection('favorites').countDocuments({ seekerId: seeker._id });
  assert.equal(initialFavoriteCount, 0);
  originalSessionIds = (await mongo.collection('sessions').find({ userId: seeker._id }, { projection: { _id: 1 } }).toArray())
    .map(session => session._id.toHexString());

  for (const locale of ['ar', 'en']) {
    for (const [device, preset] of [['desktop', 'Desktop Chrome'], ['tablet', 'Galaxy Tab S4'], ['mobile', 'Pixel 5']]) {
      stage = `${locale}/${device}`;
      const context = await browser.newContext({ ...devices[preset] });
      try {
        const session = await login(context, seeker.normalizedEmail);
        const headers = { authorization: `Bearer ${session.accessToken}` };
        const read = await context.request.get(`${base}/api/v1/seeker/overview`, { headers });
        assert.equal(read.status(), 200);
        const loggedOut = await context.request.post(`${base}/api/v1/auth/logout`, { data: {} });
        assert.equal(loggedOut.status(), 200);
        const denied = await context.request.get(`${base}/api/v1/seeker/overview`, { headers });
        assert.equal(denied.status(), 401);
        const results = [{ method: 'GET', httpStatus: denied.status() }];
        assert.equal(await mongo.collection('favorites').countDocuments({ seekerId: seeker._id }), 0);
        const page = await context.newPage();
        await page.goto(`${base}/seeker?lang=${locale}`, { waitUntil: 'networkidle' });
        await expect(page.locator('[data-state="permission"]').first()).toBeVisible();
        assert.equal(await page.locator('.seeker-dashboard__summary-card').count(), 0);
        report.runs.push({ locale, device, authenticatedRead: 200, logout: 200, revokedToken: results,
          browserPermissionState: true, favoriteWrites: 0 });
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
    await removeNewSessions();
  } catch (error) {
    report.status = 'FAIL_LOCAL';
    report.failure = `${report.failure ? `${report.failure}; ` : ''}session cleanup failed${error instanceof Error ? `: ${error.message}` : ''}`;
    process.exitCode = 1;
  } finally {
    await browser.close();
    await mongo.close();
    report.finishedAt = new Date().toISOString();
    await writeFile('docs/quality/guide-runs/seeker-overview-logout-local-latest.json', `${JSON.stringify(report, null, 2)}\n`);
  }
}

console.log(JSON.stringify({ status: report.status, cases: report.runs.length, sessionsRemoved: report.sessionsRemoved, favoritesUnchanged: report.favoritesUnchanged, mockedRoutes: report.mockedRoutes }));
