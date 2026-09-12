import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import mongoose from 'mongoose';
import { chromium, devices, expect } from '@playwright/test';
import { readEnvironmentFile } from './environment-file.mjs';

const env = await readEnvironmentFile('.env.local');
const mongoUri = process.env.MONGODB_URI ?? env.MONGODB_URI;
const base = process.env.LOCAL_GUIDE_BASE_URL ?? `http://127.0.0.1:${env.WEB_PORT ?? '4173'}`;
assert.ok(mongoUri);
assert.equal(new URL(mongoUri).hostname, '127.0.0.1');
const report = {
  status: 'RUNNING', journey: 'GUIDE-17', journeys: ['GUIDE-17'], mockedRoutes: false,
  environment: 'local-real-browser-api-mongodb',
  commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  startedAt: new Date().toISOString(), runs: [], authorization: [], api: {}, cleanup: false
};
const mongo = await mongoose.createConnection(mongoUri).asPromise();
const browser = await chromium.launch();
const password = 'LocalProvider-Journey-Only!2026';
let provider;
let admin;
let originalProviderStatus;
let originalSessionIds = [];
let foreignFixtureId;
let stage = 'setup';

async function login(context, email, secret) {
  const response = await context.request.post(`${base}/api/v1/auth/login`, { data: { email, password: secret } });
  assert.equal(response.status(), 200);
  return (await response.json()).data.accessToken;
}

try {
  provider = await mongo.collection('users').findOne({ roleType: 'provider', status: 'verified' }, { sort: { _id: -1 } });
  admin = await mongo.collection('users').findOne({ normalizedEmail: 'admin.demo@example.invalid', roleType: 'admin' });
  assert.ok(provider?._id && admin?._id);
  originalProviderStatus = provider.status;
  originalSessionIds = (await mongo.collection('sessions').find({ userId: { $in: [provider._id, admin._id] } }, { projection: { _id: 1 } }).toArray()).map(row => row._id);
  const beforeCounts = {
    requests: await mongo.collection('ad_requests').countDocuments({}),
    confirmations: await mongo.collection('commission_confirmations').countDocuments({})
  };
  const occupied = new Set((await mongo.collection('ad_requests').find({ providerId: provider._id }, { projection: { status: 1 } }).toArray()).map(row => row.status));
  const emptyStatus = ['expired', 'cancelled', 'ended', 'rejected', 'active', 'scheduled', 'waiting_payment', 'quote_sent', 'waiting_pricing', 'review', 'draft'].find(value => !occupied.has(value));
  assert.ok(emptyStatus, 'Provider fixture occupies every advertising status');

  let foreign = await mongo.collection('ad_requests').findOne({ providerId: { $ne: provider._id } }, { projection: { _id: 1 } });
  if (!foreign) {
    foreignFixtureId = new mongoose.Types.ObjectId();
    const now = new Date();
    await mongo.collection('ad_requests').insertOne({
      _id: foreignFixtureId, providerId: new mongoose.Types.ObjectId(), placementKey: `guide17-${randomUUID()}`,
      purpose: 'Temporary foreign ownership proof', intervalStart: now,
      intervalEnd: new Date(now.getTime() + 86_400_000), status: 'draft',
      history: [{ status: 'draft', version: 0, changedAt: now }], version: 0, createdAt: now, updatedAt: now
    });
    foreign = { _id: foreignFixtureId };
  }

  for (const locale of ['ar', 'en']) for (const [device, preset] of [['desktop', 'Desktop Chrome'], ['tablet', 'Galaxy Tab S4'], ['mobile', 'Pixel 5']]) {
    const context = await browser.newContext({ ...devices[preset] });
    try {
      stage = `${locale}/${device}/login`;
      await login(context, provider.normalizedEmail, password);
      const page = await context.newPage();
      const initial = page.waitForResponse(response => response.request().method() === 'GET' && new URL(response.url()).pathname === '/api/v1/provider/ads');
      await page.goto(`${base}/provider/ads?lang=${locale}`, { waitUntil: 'networkidle' });
      assert.equal((await initial).status(), 200);
      await expect(page.locator('[data-screen-id="PRV-19"]')).toBeVisible();
      const timeOrigin = await page.evaluate(() => performance.timeOrigin);

      stage = `${locale}/${device}/empty`;
      await page.locator('#provider-advertising-status').selectOption(emptyStatus);
      const empty = page.waitForResponse(response => response.request().method() === 'GET'
        && new URL(response.url()).pathname === '/api/v1/provider/ads'
        && new URL(response.url()).searchParams.get('status') === emptyStatus);
      await page.locator('.provider-advertising__filters button[type="submit"]').click();
      assert.equal((await empty).status(), 200);
      await expect(page.locator('.provider-advertising__empty')).toBeVisible();
      const clear = page.waitForResponse(response => response.request().method() === 'GET'
        && new URL(response.url()).pathname === '/api/v1/provider/ads'
        && !new URL(response.url()).searchParams.has('status'));
      await page.locator('.provider-advertising__filter-actions button[type="button"]').click();
      assert.equal((await clear).status(), 200);

      stage = `${locale}/${device}/ads-offline-retry`;
      await context.setOffline(true);
      await page.locator('#provider-advertising-status').selectOption(emptyStatus);
      await page.locator('.provider-advertising__filters button[type="submit"]').click();
      const adsRetry = page.locator('.provider-advertising__state[data-state="retry"]');
      await expect(adsRetry).toBeVisible();
      await context.setOffline(false);
      const recovered = page.waitForResponse(response => response.request().method() === 'GET'
        && new URL(response.url()).pathname === '/api/v1/provider/ads');
      await adsRetry.getByRole('button').click();
      assert.equal((await recovered).status(), 200);
      await expect(adsRetry).toHaveCount(0);

      stage = `${locale}/${device}/commission-retry`;
      const commission = await context.newPage();
      let aborted = false;
      await commission.route('**/api/v1/provider/commission', async route => {
        if (!aborted) { aborted = true; await route.abort('internetdisconnected'); }
        else await route.continue();
      });
      await commission.goto(`${base}/provider/commission?lang=${locale}`, { waitUntil: 'networkidle' });
      const commissionRetry = commission.locator('.provider-advertising__state[data-state="retry"]');
      await expect(commissionRetry).toBeVisible();
      await commission.unroute('**/api/v1/provider/commission');
      const commissionRecovered = commission.waitForResponse(response => response.request().method() === 'GET'
        && new URL(response.url()).pathname === '/api/v1/provider/commission');
      await commissionRetry.getByRole('button').click();
      assert.equal((await commissionRecovered).status(), 200);
      await expect(commission.locator('[data-screen-id="PRV-20"][data-commission-state="success"]')).toBeVisible();
      const geometry = await commission.evaluate(() => ({ innerWidth, scrollWidth: document.documentElement.scrollWidth }));
      assert.ok(geometry.scrollWidth <= geometry.innerWidth);
      assert.equal(await page.evaluate(() => performance.timeOrigin), timeOrigin);
      report.runs.push({ locale, device, status: 'PASS', emptyStatus,
        checks: ['empty_status_filter_clear_without_navigation', 'ads_offline_retry_without_navigation', 'commission_network_retry'],
        httpStatuses: { initial: 200, empty: 200, clear: 200, adsRecovered: 200, commissionRecovered: 200 }, ...geometry });
      await commission.close();
    } finally {
      await context.setOffline(false);
      await context.request.post(`${base}/api/v1/auth/logout`, { data: {} }).catch(() => undefined);
      await context.close();
    }
  }

  const providerContext = await browser.newContext();
  stage = 'authorization/provider-login';
  const providerToken = await login(providerContext, provider.normalizedEmail, password);
  const providerHeaders = { authorization: `Bearer ${providerToken}` };
  stage = 'authorization/provider-list';
  const list = await providerContext.request.get(`${base}/api/v1/provider/ads?page=1&limit=20`, { headers: providerHeaders });
  assert.equal(list.status(), 200);
  const listBody = (await list.json()).data;
  for (const item of listBody.items) for (const field of ['providerId', 'issuerId', 'originalFilename', 'sha256', 'storageKey']) assert.equal(field in item, false);
  stage = 'authorization/invalid-query';
  assert.equal((await providerContext.request.get(`${base}/api/v1/provider/ads?page=0&limit=0`, { headers: providerHeaders })).status(), 400);
  stage = 'authorization/foreign-detail';
  assert.equal((await providerContext.request.get(`${base}/api/v1/provider/ads/${foreign._id.toHexString()}`, { headers: providerHeaders })).status(), 404);
  report.authorization.push('foreign_provider_ad_request_hidden_404');
  const anonymous = await browser.newContext();
  stage = 'authorization/anonymous-ads';
  assert.equal((await anonymous.request.get(`${base}/api/v1/provider/ads`)).status(), 401);
  stage = 'authorization/anonymous-commission';
  assert.equal((await anonymous.request.get(`${base}/api/v1/provider/commission`)).status(), 401);
  await anonymous.close();
  const adminContext = await browser.newContext();
  stage = 'authorization/admin-login';
  const adminToken = await login(adminContext, admin.normalizedEmail, 'LocalPreview-Admin-Only-2026!');
  const adminHeaders = { authorization: `Bearer ${adminToken}` };
  stage = 'authorization/admin-ads';
  assert.equal((await adminContext.request.get(`${base}/api/v1/provider/ads`, { headers: adminHeaders })).status(), 403);
  stage = 'authorization/admin-commission';
  assert.equal((await adminContext.request.get(`${base}/api/v1/provider/commission`, { headers: adminHeaders })).status(), 403);
  await adminContext.request.post(`${base}/api/v1/auth/logout`, { data: {} });
  await adminContext.close();
  report.authorization.push('anonymous_401_and_admin_role_403');
  stage = 'authorization/current-provider-state';
  await mongo.collection('users').updateOne({ _id: provider._id }, { $set: { status: 'suspended' } });
  const currentState = await providerContext.request.get(`${base}/api/v1/provider/ads`, { headers: providerHeaders });
  assert.ok([401, 403].includes(currentState.status()));
  await mongo.collection('users').updateOne({ _id: provider._id }, { $set: { status: originalProviderStatus } });
  report.authorization.push(`current_suspended_provider_denied_${currentState.status()}_and_restored`);
  await providerContext.request.post(`${base}/api/v1/auth/logout`, { data: {} });
  await providerContext.close();
  assert.equal(await mongo.collection('ad_requests').countDocuments({}), beforeCounts.requests + (foreignFixtureId ? 1 : 0));
  assert.equal(await mongo.collection('commission_confirmations').countDocuments({}), beforeCounts.confirmations);
  report.api = { safeAdvertisingProjection: true, invalidListQueryStatus: 400, foreignDetailStatus: 404,
    commissionReadOnly: true, requestsUnchanged: true, confirmationsUnchanged: true };
  report.status = 'PASS_LOCAL';
} catch (error) {
  report.status = 'FAIL_LOCAL';
  report.failure = { stage, message: error instanceof Error ? error.message : String(error) };
  process.exitCode = 1;
} finally {
  try {
    if (provider?._id && originalProviderStatus) await mongo.collection('users').updateOne({ _id: provider._id }, { $set: { status: originalProviderStatus } });
    if (foreignFixtureId) await mongo.collection('ad_requests').deleteOne({ _id: foreignFixtureId });
    if (provider?._id && admin?._id) {
      const filter = { userId: { $in: [provider._id, admin._id] }, ...(originalSessionIds.length ? { _id: { $nin: originalSessionIds } } : {}) };
      const extra = await mongo.collection('sessions').find(filter, { projection: { _id: 1 } }).toArray();
      if (extra.length) {
        await mongo.collection('sessions').deleteMany({ _id: { $in: extra.map(row => row._id) } });
        await mongo.collection('audit_logs').deleteMany({ targetType: 'auth_session', targetId: { $in: extra.map(row => row._id.toHexString()) } });
      }
      assert.equal(await mongo.collection('sessions').countDocuments(filter), 0);
    }
    report.cleanup = true;
  } catch (error) {
    report.status = 'FAIL_LOCAL'; report.cleanup = false;
    report.cleanupFailure = error instanceof Error ? error.message : String(error); process.exitCode = 1;
  }
  await browser.close();
  await mongo.close();
  report.finishedAt = new Date().toISOString();
  await writeFile('docs/quality/guide-runs/guide17-provider-ads-commission-local-latest.json', `${JSON.stringify(report, null, 2)}\n`);
}
console.log(JSON.stringify({ status: report.status, runs: report.runs.length, cleanup: report.cleanup }));
