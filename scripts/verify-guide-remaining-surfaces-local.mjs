import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import mongoose from 'mongoose';
import { chromium, expect } from '@playwright/test';

const base = 'http://127.0.0.1:4173';
const evidence = {
  commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  worktreeChanges: execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim().length > 0,
  journeys: ['GUIDE-17', 'GUIDE-18', 'GUIDE-19', 'GUIDE-20', 'GUIDE-23', 'GUIDE-24'],
  environment: 'local-real-browser-api-mongodb', mockedRoutes: false,
  startedAt: new Date().toISOString(), status: 'RUNNING', browser: [], http: []
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
    evidence.http.push({ method: response.request().method(), path: url.pathname.replace(/\/[a-f0-9]{24}(?=\/|$)/gu, '/:id'), status: response.status() });
  });
}

async function login(context, email, password, role) {
  const response = await context.request.post(`${base}/api/v1/auth/login`, { data: { email, password } });
  assert.equal(response.status(), 200);
  const session = (await response.json()).data;
  assert.equal(session.user.roleType, role);
}

async function visit(page, route, screenId) {
  const path = `${route}${route.includes('?') ? '&' : '?'}lang=en`;
  await page.goto(`${base}${path}`, { waitUntil: 'networkidle' });
  const screen = page.locator(`[data-screen-id="${screenId}"]`).first();
  await expect(screen).toBeVisible();
  await expect(page.locator('[data-state="error"], [data-admin-state="error"], [data-advertising-state="error"], [data-commission-state="error"]')).toHaveCount(0);
  const geometry = await page.evaluate(() => ({ innerWidth: window.innerWidth, scrollWidth: document.documentElement.scrollWidth }));
  assert.equal(geometry.innerWidth, 402);
  assert.ok(geometry.scrollWidth <= 402, `${screenId} has horizontal overflow`);
  evidence.browser.push({ screen: screenId, route: route.replace(/[a-f0-9]{24}/gu, ':id'), ...geometry });
}

let mongo;
const browser = await chromium.launch({ headless: true });
try {
  const env = environment(await readFile('.env.local', 'utf8'));
  mongo = await mongoose.createConnection(env.MONGODB_URI).asPromise();
  const property = await mongo.collection('properties').findOne({ status: 'published' }, { sort: { updatedAt: -1 } });
  assert.ok(property?._id instanceof mongoose.Types.ObjectId);
  const provider = await mongo.collection('users').findOne({ _id: property.providerId, roleType: 'provider', status: 'verified' });
  assert.ok(provider?._id instanceof mongoose.Types.ObjectId);
  let report = await mongo.collection('account_reports').findOne({}, { sort: { updatedAt: -1 } });
  if (!report) {
    const now = new Date();
    const inserted = await mongo.collection('account_reports').insertOne({ accountId: provider._id, accountRoleType: 'provider', reason: 'Synthetic local account report for delivery verification', details: 'Retained as local seeded demonstration data.', status: 'open', relatedReports: 1, version: 0, createdAt: now, updatedAt: now });
    report = await mongo.collection('account_reports').findOne({ _id: inserted.insertedId });
  }
  assert.ok(report?._id instanceof mongoose.Types.ObjectId);

  const providerContext = await browser.newContext({ viewport: { width: 402, height: 874 }, isMobile: true });
  await login(providerContext, provider.normalizedEmail, 'LocalProvider-Journey-Only!2026', 'provider');
  const providerPage = await providerContext.newPage();
  watch(providerPage);
  await visit(providerPage, '/provider/ads', 'PRV-19');
  await visit(providerPage, '/provider/commission', 'PRV-20');
  await visit(providerPage, '/provider/notifications', 'PRV-21');
  await visit(providerPage, '/provider/settings?tab=account', 'PRV-22-1');
  await visit(providerPage, '/provider/settings?tab=contact', 'PRV-22-2');
  await visit(providerPage, '/provider/settings?tab=security', 'PRV-22-3');
  await providerContext.close();

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
  const adminContext = await browser.newContext({ viewport: { width: 402, height: 874 }, isMobile: true });
  await login(adminContext, 'admin.demo@example.invalid', 'LocalPreview-Admin-Only-2026!', 'admin');
  const adminPage = await adminContext.newPage();
  watch(adminPage);
  for (const [route, screenId] of adminRoutes) await visit(adminPage, route, screenId);
  await adminContext.close();

  assert.ok(evidence.http.some(item => item.status === 200));
  assert.equal(evidence.http.some(item => item.status >= 500), false);
  evidence.mongo = { collectionsRead: ['users', 'properties', 'account_reports'], providerFixture: true, propertyFixture: true, accountReportFixture: true };
  evidence.status = 'PASS_LOCAL';
  evidence.remaining = ['Mutation-specific proofs remain in the dedicated API suites.', 'Repeat these six journeys on Production after deployment.'];
} catch (error) {
  evidence.status = 'FAIL_LOCAL';
  evidence.failure = error instanceof Error ? error.message : String(error);
} finally {
  evidence.finishedAt = new Date().toISOString();
  await mongo?.close().catch(() => undefined);
  await browser.close();
  await mkdir('docs/quality/guide-runs', { recursive: true });
  await writeFile('docs/quality/guide-runs/remaining-surfaces-local-latest.json', `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
}

console.log(`REMAINING_SURFACES_LOCAL_${evidence.status}`);
if (evidence.status !== 'PASS_LOCAL') process.exitCode = 1;
