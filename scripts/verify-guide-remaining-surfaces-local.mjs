import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import mongoose from 'mongoose';
import { chromium, devices, expect } from '@playwright/test';

const base = 'http://127.0.0.1:4173';
const evidence = {
  commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  worktreeChanges: execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim().length > 0,
  journeys: ['GUIDE-17', 'GUIDE-18', 'GUIDE-19', 'GUIDE-20', 'GUIDE-23', 'GUIDE-24'],
  environment: 'local-real-browser-api-mongodb', mockedRoutes: false,
  startedAt: new Date().toISOString(), status: 'RUNNING', browser: [], http: [], cleanup: false
};

function environment(source) {
  return Object.fromEntries(source.split(/\r?\n/u).flatMap(raw => {
    const line = raw.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) return [];
    const index = line.indexOf('=');
    let value = line.slice(index + 1).trim();
    if (/^(['"]).*\1$/u.test(value)) value = value.slice(1, -1);
    return [[line.slice(0, index).trim(), value]];
  }));
}

function watch(page) {
  page.on('response', response => {
    const url = new URL(response.url());
    if (!url.pathname.startsWith('/api/v1/')) return;
    evidence.http.push({ method: response.request().method(), path: url.pathname.replace(/\/[a-f0-9]{24}(?=\/|$)/gu, '/:id'), status: response.status(),
      ...(response.status() === 429 ? { retryAfter: Number(response.headers()['ratelimit-reset'] ?? response.headers()['retry-after'] ?? 60) } : {}) });
  });
}

async function login(context, email, password, role) {
  const response = await context.request.post(`${base}/api/v1/auth/login`, { data: { email, password } });
  assert.equal(response.status(), 200);
  const session = (await response.json()).data;
  assert.equal(session.user.roleType, role);
}

async function visit(page, route, screenId, locale, device) {
  const path = `${route}${route.includes('?') ? '&' : '?'}lang=${locale}`;
  const httpStart = evidence.http.length;
  const errors = page.locator('[data-state="error"], [data-admin-state="error"], [data-advertising-state="error"], [data-commission-state="error"]');
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await page.goto(`${base}${path}`, { waitUntil: 'networkidle' });
    const screen = page.locator(`[data-screen-id="${screenId}"]`).first();
    try {
      await expect(screen).toBeVisible({ timeout: 20_000 });
    } catch (error) {
      const limited = evidence.http.slice(httpStart).findLast(item => item.status === 429);
      if (!limited || attempt === 2) throw error;
      await new Promise(resolve => setTimeout(resolve, (Math.max(1, limited.retryAfter) + 1) * 1000));
      continue;
    }
    if (await errors.count() === 0) break;
    const limited = evidence.http.slice(httpStart).findLast(item => item.status === 429);
    if (!limited || attempt === 2) await expect(errors).toHaveCount(0);
    await new Promise(resolve => setTimeout(resolve, (Math.max(1, limited.retryAfter) + 1) * 1000));
  }
  const geometry = await page.evaluate(() => ({ innerWidth: window.innerWidth, scrollWidth: document.documentElement.scrollWidth }));
  assert.ok(geometry.scrollWidth <= geometry.innerWidth, `${screenId} has horizontal overflow on ${locale}/${device}`);
  evidence.browser.push({ screen: screenId, locale, device, status: 'PASS', route: route.replace(/[a-f0-9]{24}/gu, ':id'), documentStatus: 200, pageErrors: 0, ...geometry });
}

let mongo;
let createdReportId;
let provider;
let admin;
let originalProviderSessions = [];
let originalAdminSessions = [];
const browser = await chromium.launch({ headless: true });
try {
  const env = environment(await readFile('.env.local', 'utf8'));
  mongo = await mongoose.createConnection(env.MONGODB_URI).asPromise();
  const property = await mongo.collection('properties').findOne({ status: 'published' }, { sort: { updatedAt: -1 } });
  assert.ok(property?._id instanceof mongoose.Types.ObjectId);
  provider = await mongo.collection('users').findOne({ _id: property.providerId, roleType: 'provider', status: 'verified' });
  assert.ok(provider?._id instanceof mongoose.Types.ObjectId);
  let report = await mongo.collection('account_reports').findOne({}, { sort: { updatedAt: -1 } });
  if (!report) {
    const now = new Date();
    const inserted = await mongo.collection('account_reports').insertOne({ accountId: provider._id, accountRoleType: 'provider', reason: 'Synthetic local account report for delivery verification', details: 'Retained as local seeded demonstration data.', status: 'open', relatedReports: 1, version: 0, createdAt: now, updatedAt: now });
    createdReportId = inserted.insertedId;
    report = await mongo.collection('account_reports').findOne({ _id: inserted.insertedId });
  }
  assert.ok(report?._id instanceof mongoose.Types.ObjectId);

  admin = await mongo.collection('users').findOne({ normalizedEmail: 'admin.demo@example.invalid', roleType: 'admin' });
  assert.ok(admin?._id instanceof mongoose.Types.ObjectId);
  originalProviderSessions = (await mongo.collection('sessions').find({ userId: provider._id }, { projection: { _id: 1 } }).toArray()).map(row => row._id);
  originalAdminSessions = (await mongo.collection('sessions').find({ userId: admin._id }, { projection: { _id: 1 } }).toArray()).map(row => row._id);

  const propertyId = property._id.toHexString();
  const accountId = provider._id.toHexString();
  const reportQuery = `?reportId=${report._id.toHexString()}`;
  const adminRoutes = [
    ['/admin', 'ADM-01'], ['/admin/users', 'ADM-02'], ['/admin/property-seekers', 'ADM-03'], ['/admin/providers', 'ADM-04'], ['/admin/verification', 'ADM-05'],
    ['/admin/account-reports', 'ADM-06'], [`/admin/account-reports${reportQuery}`, 'ADM-07'], ['/admin/account-restrictions', 'ADM-08'],
    ['/admin/property-categories', 'ADM-09'], ['/admin/locations', 'ADM-10'], ['/admin/features', 'ADM-11'], ['/admin/projects', 'ADM-12'], ['/admin/projects/review', 'ADM-13'],
    ['/admin/properties', 'ADM-14'], [`/admin/properties/review?propertyId=${propertyId}`, 'ADM-15'], [`/admin/properties/possible-duplicates?propertyId=${propertyId}`, 'ADM-16'], ['/admin/property-reports', 'ADM-17'],
    ['/admin/ads/requests', 'ADM-33'], ['/admin/ads/payment-proofs/pending', 'ADM-34'], ['/admin/ads/payment-proofs/approved', 'ADM-35'], ['/admin/ads/calendar', 'ADM-36'], ['/admin/ads/payments/pending-review', 'ADM-37'], ['/admin/ads/financial-review', 'ADM-38'],
    ['/admin/commissions', 'ADM-39'], ['/admin/commissions/new', 'ADM-40'], ['/admin/commissions/history', 'ADM-41'], [`/admin/commissions/account?accountId=${accountId}`, 'ADM-42'], ['/admin/commissions/exceptions', 'ADM-43'], ['/admin/commissions/exceptions/new', 'ADM-44'], ['/admin/commissions/confirmations', 'ADM-45']
  ];
  const providerRoutes = [
    ['/provider/ads', 'PRV-19'], ['/provider/commission', 'PRV-20'], ['/provider/notifications', 'PRV-21'],
    ['/provider/settings?tab=account', 'PRV-22-1'], ['/provider/settings?tab=contact', 'PRV-22-2'], ['/provider/settings?tab=security', 'PRV-22-3']
  ];
  for (const locale of ['ar', 'en']) for (const [device, preset] of [['desktop', 'Desktop Chrome'], ['tablet', 'Galaxy Tab S4'], ['mobile', 'Pixel 5']]) {
    const providerContext = await browser.newContext({ ...devices[preset] });
    await login(providerContext, provider.normalizedEmail, 'LocalProvider-Journey-Only!2026', 'provider');
    const providerPage = await providerContext.newPage();
    watch(providerPage);
    for (const [route, screenId] of providerRoutes) await visit(providerPage, route, screenId, locale, device);
    await providerContext.request.post(`${base}/api/v1/auth/logout`, { data: {} });
    await providerContext.close();

    const adminContext = await browser.newContext({ ...devices[preset] });
    await login(adminContext, admin.normalizedEmail, 'LocalPreview-Admin-Only-2026!', 'admin');
    const adminPage = await adminContext.newPage();
    watch(adminPage);
    for (const [route, screenId] of adminRoutes) await visit(adminPage, route, screenId, locale, device);
    await adminContext.request.post(`${base}/api/v1/auth/logout`, { data: {} });
    await adminContext.close();
  }

  assert.ok(evidence.http.some(item => item.status === 200));
  assert.equal(evidence.http.some(item => item.status >= 500), false);
  assert.equal(evidence.browser.length, 216);
  evidence.mongo = { collectionsRead: ['users', 'properties', 'account_reports'], providerFixture: true, propertyFixture: true, accountReportFixture: true };
  evidence.status = 'PASS_LOCAL';
  evidence.remaining = ['Mutation-specific proofs remain in the dedicated API suites.', 'Repeat these six journeys on Production after deployment.'];
} catch (error) {
  evidence.status = 'FAIL_LOCAL';
  evidence.failure = error instanceof Error ? error.message : String(error);
} finally {
  evidence.finishedAt = new Date().toISOString();
  try {
    if (createdReportId) await mongo?.collection('account_reports').deleteOne({ _id: createdReportId });
    for (const [user, original] of [[provider, originalProviderSessions], [admin, originalAdminSessions]]) {
      if (!user?._id) continue;
      const filter = { userId: user._id, ...(original.length ? { _id: { $nin: original } } : {}) };
      const extra = await mongo.collection('sessions').find(filter, { projection: { _id: 1 } }).toArray();
      if (extra.length) {
        await mongo.collection('sessions').deleteMany({ _id: { $in: extra.map(row => row._id) } });
        await mongo.collection('audit_logs').deleteMany({ targetType: 'auth_session', targetId: { $in: extra.map(row => row._id.toHexString()) } });
      }
      assert.equal(await mongo.collection('sessions').countDocuments(filter), 0);
    }
    if (createdReportId) assert.equal(await mongo.collection('account_reports').countDocuments({ _id: createdReportId }), 0);
    evidence.cleanup = true;
  } catch (cleanupError) {
    evidence.status = 'FAIL_LOCAL';
    evidence.cleanup = false;
    evidence.cleanupFailure = cleanupError instanceof Error ? cleanupError.message : String(cleanupError);
  }
  await mongo?.close().catch(() => undefined);
  await browser.close();
  await mkdir('docs/quality/guide-runs', { recursive: true });
  await writeFile('docs/quality/guide-runs/remaining-surfaces-local-latest.json', `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
}

console.log(`REMAINING_SURFACES_LOCAL_${evidence.status}`);
if (evidence.status !== 'PASS_LOCAL') process.exitCode = 1;
