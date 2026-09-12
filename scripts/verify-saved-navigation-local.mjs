import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import mongoose, { Types } from 'mongoose';
import { chromium, devices, expect } from '@playwright/test';
import { getPublicPropertyDetailsCopy } from '../apps/web/src/features/public/details-copy.ts';
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
let propertyIds = [];
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
  const catalog = await fetch(`${base}/api/v1/public/properties?page=1&limit=2`);
  assert.equal(catalog.status, 200);
  const properties = (await catalog.json()).data.items;
  assert.equal(properties.length, 2);
  propertyIds = properties.map(p => new Types.ObjectId(p.id));


  originalSessionIds = (await mongo.collection('sessions').find({ userId: seeker._id }, { projection: { _id: 1 } }).toArray())
    .map(session => session._id.toHexString());

  for (const locale of ['ar', 'en']) {
    for (const [device, preset] of [['desktop', 'Desktop Chrome'], ['tablet', 'Galaxy Tab S4'], ['mobile', 'Pixel 5']]) {
      stage = `${locale}/${device}`;
      const context = await browser.newContext({ ...devices[preset] });
      try {
        await login(context, seeker.normalizedEmail);
        await mongo.collection('favorites').deleteMany({ seekerId: seeker._id, propertyId: { $in: propertyIds } });
        const page = await context.newPage();
        await page.goto(`${base}/seeker/saved?lang=${locale}`, { waitUntil: 'networkidle' });
        await expect(page.locator('.seeker-dashboard__empty[data-state="empty"]')).toBeVisible();
        for (const property of properties) {
          await page.goto(`${base}/properties/${property.slug}?lang=${locale}`, { waitUntil: 'networkidle' });
          await expect(page.locator('[data-details-state="success"]')).toBeVisible();
          const saved = page.waitForResponse(response => response.request().method() === 'PUT' && new URL(response.url()).pathname === `/api/v1/seeker/favorites/${property.id}`);
          const copy = getPublicPropertyDetailsCopy(locale);
          await page.getByRole('button', { name: copy.saveProperty, exact: true }).click();
          const savedResponse = await saved;
          assert.equal(savedResponse.status(), 200);
          assert.equal((await savedResponse.json()).data.alreadySaved, false);
          await expect(page.getByRole('button', { name: copy.propertySaved, exact: true })).toBeDisabled();
          assert.equal(await mongo.collection('favorites').countDocuments({ seekerId: seeker._id, propertyId: new Types.ObjectId(property.id) }), 1);
        }

        await page.goto(`${base}/seeker/saved?lang=${locale}`, { waitUntil: 'networkidle' });
        const cards = page.locator('.seeker-saved-property-card');
        await expect(cards).toHaveCount(2);
        const link = page.locator('.seeker-saved-property-card__view').first();
        const href = await link.getAttribute('href');
        assert.equal(new URL(href, base).searchParams.get('lang'), locale);
        const detailRead = page.waitForResponse(response => new URL(response.url()).pathname.startsWith('/api/v1/public/properties/') && response.request().method() === 'GET');
        await link.click();
        assert.equal((await detailRead).status(), 200);
        await expect(page.locator('[data-details-state="success"]')).toBeVisible();
        await page.locator('.public-property-details__back').click();
        await expect(page.locator('[data-listing-state="success"]')).toBeVisible();
        await page.locator('.public-property-listing__compare-button').nth(0).click();
        await page.locator('.public-property-listing__compare-button').nth(1).click();
        await page.locator('.public-property-listing__compare-tray a').click();
        await expect(page.locator('[data-comparison-state="success"]')).toHaveAttribute('data-comparison-count', '2');
        assert.equal(await page.locator('html').getAttribute('lang'), locale);
        const geometry = await page.evaluate(() => ({ innerWidth, scrollWidth: document.documentElement.scrollWidth }));
        assert.equal(geometry.innerWidth, page.viewportSize().width);
        assert.ok(geometry.scrollWidth <= geometry.innerWidth);
        report.runs.push({
          locale,
          device,
          checks: ['detail_save_real_http_and_mongo', 'saved_card_to_real_detail', 'detail_back_to_listing', 'listing_to_two_property_comparison', 'locale_preserved', 'no_horizontal_overflow'],
          detailHttpStatus: 200,
          savedCount: 2,
          ...geometry,
        });
      } finally {
        await context.close();
      }
    }
  }
  await mongo.collection('favorites').deleteMany({ seekerId: seeker._id, propertyId: { $in: propertyIds } });
  report.favoritesUnchanged = await mongo.collection('favorites').countDocuments({ seekerId: seeker._id }) === initialFavoriteCount;
  assert.equal(report.favoritesUnchanged, true);
  report.status = 'PASS_LOCAL_SUBCASES';
} catch (error) {
  report.status = 'FAIL_LOCAL';
  report.failure = `${stage}: ${error instanceof Error ? error.message.slice(0, 700) : 'Unknown failure'}`;
  process.exitCode = 1;
} finally {
  try {
    if (seeker && propertyIds.length) await mongo.collection('favorites').deleteMany({ seekerId: seeker._id, propertyId: { $in: propertyIds } });
    await removeNewSessions();
  } catch (error) {
    report.status = 'FAIL_LOCAL';
    report.failure = `${report.failure ? `${report.failure}; ` : ''}session cleanup failed${error instanceof Error ? `: ${error.message}` : ''}`;
    process.exitCode = 1;
  } finally {
    await browser.close();
    await mongo.close();
    report.finishedAt = new Date().toISOString();
    await writeFile('docs/quality/guide-runs/saved-navigation-local-latest.json', `${JSON.stringify(report, null, 2)}\n`);
  }
}

console.log(JSON.stringify({ status: report.status, cases: report.runs.length, sessionsRemoved: report.sessionsRemoved, favoritesUnchanged: report.favoritesUnchanged, mockedRoutes: report.mockedRoutes }));
