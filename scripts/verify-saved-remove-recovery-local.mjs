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
  journeys: ['GUIDE-08'],
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
let fixtureProperties = [];

let seeker;
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
    if (await mongo.collection('favorites').countDocuments({ seekerId: candidate._id }) === 0) {
      seeker = candidate;
      break;
    }
  }
  assert.ok(seeker, 'A verified local GUIDE-04 seeker with zero favorites is required');
  const initialFavoriteCount = await mongo.collection('favorites').countDocuments({ seekerId: seeker._id });
  assert.equal(initialFavoriteCount, 0);
  fixtureProperties = Array.from({ length: 1 }, (_, i) => ({
    _id: new Types.ObjectId(), slug: `qa-saved-pagination-${Date.now()}-${i}`, kind: 'property',
    name: { ar: `???? ?????? ${i}`, en: `Pagination property ${i}` }, transactionType: 'sale',
    status: 'published', active: true,
  }));
  await mongo.collection('properties').insertMany(fixtureProperties);
  originalSessionIds = (await mongo.collection('sessions').find({ userId: seeker._id }, { projection: { _id: 1 } }).toArray())
    .map(session => session._id.toHexString());

  for (const locale of ['ar', 'en']) {
    for (const [device, preset] of [['desktop', 'Desktop Chrome'], ['tablet', 'Galaxy Tab S4'], ['mobile', 'Pixel 5']]) {
      stage = `${locale}/${device}`;
      const context = await browser.newContext({ ...devices[preset] });
      try {
        await login(context, seeker.normalizedEmail);
        await mongo.collection('favorites').deleteMany({ seekerId: seeker._id, propertyId: { $in: fixtureProperties.map(p => p._id) } });
        await mongo.collection('favorites').insertMany(fixtureProperties.map((property, index) => ({
          seekerId: seeker._id, propertyId: property._id, savedAt: new Date(1000 * index),
        })));
        const page = await context.newPage();
        let currentAuthorization;
        page.on('request', request => {
          if (new URL(request.url()).pathname === '/api/v1/seeker/favorites') currentAuthorization = request.headers().authorization;
        });
        await page.goto(`${base}/seeker/saved?lang=${locale}`, { waitUntil: 'networkidle' });
        const cards = page.locator('.seeker-saved-property-card');
        await expect(cards).toHaveCount(1);
        const button = cards.locator('button');
        await context.setOffline(true);
        await button.click();
        await expect(page.locator('.seeker-saved__feedback[role="alert"]')).toBeVisible();
        await expect(button).toBeEnabled();
        await expect(cards).toHaveCount(1);
        assert.equal(await mongo.collection('favorites').countDocuments({ seekerId: seeker._id }), 1);
        await context.setOffline(false);
        const deleted = page.waitForResponse(response => response.request().method() === 'DELETE' && new URL(response.url()).pathname.startsWith('/api/v1/seeker/favorites/'));
        await button.click();
        assert.equal((await deleted).status(), 200);
        await expect(cards).toHaveCount(0);
        await expect(page.locator('.seeker-dashboard__empty[data-state="empty"]')).toBeVisible();
        await expect(page.locator('.seeker-saved__feedback[role="alert"]')).toHaveCount(0);
        assert.equal(await mongo.collection('favorites').countDocuments({ seekerId: seeker._id }), 0);

        const propertyId = fixtureProperties[0]._id;
        await mongo.collection('favorites').insertOne({ seekerId: seeker._id, propertyId, savedAt: new Date() });
        await page.reload({ waitUntil: 'networkidle' });
        await expect(cards).toHaveCount(1);
        await mongo.collection('properties').updateOne({ _id: propertyId }, { $set: { active: false } });
        const unavailable = await context.request.get(`${base}/api/v1/seeker/favorites`, { headers: { authorization: currentAuthorization } });
        assert.equal(unavailable.status(), 200);
        assert.equal((await unavailable.json()).data.total, 0);
        const staleDelete = page.waitForResponse(response => response.request().method() === 'DELETE' && new URL(response.url()).pathname.endsWith(propertyId.toHexString()));
        await button.click();
        assert.equal((await staleDelete).status(), 200);
        await expect(cards).toHaveCount(0);
        await expect(page.locator('.seeker-dashboard__empty[data-state="empty"]')).toBeVisible();
        assert.equal(await mongo.collection('favorites').countDocuments({ seekerId: seeker._id }), 0);
        await mongo.collection('properties').updateOne({ _id: propertyId }, { $set: { active: true } });
        const geometry = await page.evaluate(() => ({ innerWidth, scrollWidth: document.documentElement.scrollWidth }));
        assert.equal(geometry.innerWidth, page.viewportSize().width);
        assert.ok(geometry.scrollWidth <= geometry.innerWidth);
        report.runs.push({
          locale,
          device,
          checks: ['offline_remove_preserves_card_and_record', 'retry_remove_real_http_200_and_empty', 'unavailable_property_excluded_from_api', 'stale_card_remove_succeeds', 'no_horizontal_overflow'],
          apiHttpStatus: 200,
          browserHttpStatus: 200,
          savedCount: 0,
          ...geometry,
        });
      } finally {
        await context.close();
      }
    }
  }
  await mongo.collection('favorites').deleteMany({ seekerId: seeker._id, propertyId: { $in: fixtureProperties.map(p => p._id) } });
  report.favoritesUnchanged = await mongo.collection('favorites').countDocuments({ seekerId: seeker._id }) === initialFavoriteCount;
  assert.equal(report.favoritesUnchanged, true);
  report.status = 'PASS_LOCAL_SUBCASES';
} catch (error) {
  report.status = 'FAIL_LOCAL';
  report.failure = `${stage}: ${error instanceof Error ? error.message.slice(0, 700) : 'Unknown failure'}`;
  process.exitCode = 1;
} finally {
  try {
    if (fixtureProperties.length) {
      const ids = fixtureProperties.map(p => p._id);
      if (seeker) await mongo.collection('favorites').deleteMany({ seekerId: seeker._id, propertyId: { $in: ids } });
      await mongo.collection('properties').deleteMany({ _id: { $in: ids } });
      report.fixturesRemoved = await mongo.collection('properties').countDocuments({ _id: { $in: ids } }) === 0;
      assert.ok(report.fixturesRemoved);
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
    await writeFile('docs/quality/guide-runs/saved-remove-recovery-local-latest.json', `${JSON.stringify(report, null, 2)}\n`);
  }
}

console.log(JSON.stringify({ status: report.status, cases: report.runs.length, sessionsRemoved: report.sessionsRemoved, favoritesUnchanged: report.favoritesUnchanged, mockedRoutes: report.mockedRoutes }));
