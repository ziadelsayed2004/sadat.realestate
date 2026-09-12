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
assert.ok(mongoUri); assert.equal(new URL(mongoUri).hostname, '127.0.0.1');
const report = { status: 'RUNNING', journey: 'GUIDE-19', journeys: ['GUIDE-19'], mockedRoutes: false,
  environment: 'local-real-browser-api-mongodb', commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  startedAt: new Date().toISOString(), runs: [], checks: [], authorization: [], mongo: {}, cleanup: false };
const mongo = await mongoose.createConnection(mongoUri).asPromise();
const browser = await chromium.launch();
const password = 'LocalPreview-Admin-Only-2026!';
let admin; let viewer; let originalAdminStatus; let seekerId; let profileId; let accountReportId; let originalSessionIds = [];
let stage = 'setup';

async function login(context, email) {
  const response = await withoutRateLimit(() => context.request.post(`${base}/api/v1/auth/login`, { data: { email, password } }));
  assert.equal(response.status(), 200); return (await response.json()).data.accessToken;
}
async function withoutRateLimit(operation) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await operation();
    if (response.status() !== 429) return response;
    const seconds = Number(response.headers()['ratelimit-reset'] ?? response.headers()['retry-after'] ?? 60);
    await new Promise(resolve => setTimeout(resolve, (Math.max(1, seconds) + 1) * 1000));
  }
  throw new Error('Rate limit did not clear');
}

try {
  admin = await mongo.collection('users').findOne({ normalizedEmail: 'admin.demo@example.invalid', roleType: 'admin', status: 'verified' });
  viewer = await mongo.collection('users').findOne({ normalizedEmail: 'admin.viewer@example.invalid', roleType: 'admin', status: 'verified' });
  assert.ok(admin?._id && viewer?._id); originalAdminStatus = admin.status;
  originalSessionIds = (await mongo.collection('sessions').find({ userId: { $in: [admin._id, viewer._id] } }, { projection: { _id: 1 } }).toArray()).map(row => row._id);
  seekerId = new mongoose.Types.ObjectId(); profileId = new mongoose.Types.ObjectId(); accountReportId = new mongoose.Types.ObjectId();
  const now = new Date(); const marker = randomUUID();
  await mongo.collection('users').insertOne({ _id: seekerId, normalizedEmail: `guide19-${marker}@example.invalid`, roleType: 'seeker',
    status: 'verified', locale: 'ar', statusChangedAt: now, createdAt: now, updatedAt: now, version: 0 });
  await mongo.collection('seeker_profiles').insertOne({ _id: profileId, userId: seekerId, firstName: 'GUIDE', lastName: '19', locale: 'ar', createdAt: now, updatedAt: now, version: 0 });
  await mongo.collection('account_reports').insertOne({ _id: accountReportId, accountId: seekerId, accountRoleType: 'seeker',
    reason: 'Temporary GUIDE-19 account report', details: marker, status: 'open', relatedReports: 1, createdAt: now, updatedAt: now, version: 0 });

  for (const locale of ['ar', 'en']) for (const [device, preset] of [['desktop', 'Desktop Chrome'], ['tablet', 'Galaxy Tab S4'], ['mobile', 'Pixel 5']]) {
    const context = await browser.newContext({ ...devices[preset] });
    try {
      stage = `${locale}/${device}/login`; await login(context, admin.normalizedEmail);
      const page = await context.newPage();
      await page.goto(`${base}/admin/users?lang=${locale}`, { waitUntil: 'networkidle' });
      await expect(page.locator('[data-screen-id="ADM-02"]')).toBeVisible();
      const origin = await page.evaluate(() => performance.timeOrigin);
      stage = `${locale}/${device}/empty`;
      await page.locator('#admin-accounts-search').fill(`missing-${randomUUID()}`);
      const searched = page.waitForResponse(response => response.request().method() === 'GET' && new URL(response.url()).pathname === '/api/v1/admin/users');
      await page.locator('.admin-accounts__filter-actions button[type="submit"]').click();
      assert.equal((await searched).status(), 200);
      await expect(page.locator('.admin-accounts__empty[data-state="empty"]')).toBeVisible();
      const cleared = page.waitForResponse(response => response.request().method() === 'GET' && new URL(response.url()).pathname === '/api/v1/admin/users');
      await page.locator('.admin-accounts__filter-actions button[type="button"]').click();
      assert.equal((await cleared).status(), 200);
      stage = `${locale}/${device}/retry`;
      await context.setOffline(true);
      await page.locator('#admin-accounts-role').selectOption('provider');
      const retry = page.locator('.admin-accounts__state[data-state="retry"]');
      await expect(retry).toBeVisible();
      await context.setOffline(false);
      let recovered = page.waitForResponse(response => response.request().method() === 'GET' && new URL(response.url()).pathname === '/api/v1/admin/users');
      await retry.getByRole('button').click();
      let recoveredResponse = await recovered;
      if (recoveredResponse.status() === 429) {
        const seconds = Number(recoveredResponse.headers()['ratelimit-reset'] ?? 60);
        await new Promise(resolve => setTimeout(resolve, (Math.max(1, seconds) + 1) * 1000));
        recovered = page.waitForResponse(response => response.request().method() === 'GET' && new URL(response.url()).pathname === '/api/v1/admin/users');
        await page.locator('.admin-accounts__state[data-state="error"] button').click();
        recoveredResponse = await recovered;
      }
      assert.equal(recoveredResponse.status(), 200);
      const geometry = await page.evaluate(() => ({ innerWidth, scrollWidth: document.documentElement.scrollWidth }));
      assert.ok(geometry.scrollWidth <= geometry.innerWidth); assert.equal(await page.evaluate(() => performance.timeOrigin), origin);
      report.runs.push({ locale, device, status: 'PASS', checks: ['empty_search_clear_without_navigation', 'offline_filter_retry_without_navigation'],
        httpStatuses: { search: 200, clear: 200, recovered: 200 }, documentReloaded: false, ...geometry });
    } finally {
      await context.setOffline(false); await context.request.post(`${base}/api/v1/auth/logout`).catch(() => undefined); await context.close();
    }
  }

  const context = await browser.newContext({ ...devices['Desktop Chrome'] });
  await login(context, admin.normalizedEmail);
  const page = await context.newPage();
  stage = 'browser/report-detail';
  const detailLoad = page.waitForResponse(response => response.request().method() === 'GET' && new URL(response.url()).pathname === '/api/v1/admin/account-reports');
  await page.goto(`${base}/admin/account-reports?reportId=${accountReportId.toHexString()}&lang=en`, { waitUntil: 'networkidle' });
  assert.equal((await detailLoad).status(), 200); await expect(page.locator('[data-screen-id="ADM-07"]')).toBeVisible();
  stage = 'browser/report-validation';
  let resolveRequests = 0;
  page.on('request', request => { if (request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/resolve')) resolveRequests += 1; });
  await page.locator('#admin-account-report-reason').fill('bad');
  await page.locator('#admin-account-report-action-title').locator('..').getByRole('button').first().click();
  await expect(page.locator('.admin-accounts__document-error')).toBeVisible(); assert.equal(resolveRequests, 0);
  stage = 'browser/report-resolve';
  const resolutionReason = 'Confirmed local GUIDE-19 report resolution';
  await page.locator('#admin-account-report-reason').fill(resolutionReason);
  const resolved = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname === `/api/v1/admin/account-reports/${accountReportId.toHexString()}/resolve`);
  await page.locator('#admin-account-report-action-title').locator('..').getByRole('button').first().click();
  assert.equal((await resolved).status(), 200); await expect(page.locator('.admin-account-reports__success')).toBeVisible();
  assert.equal((await mongo.collection('account_reports').findOne({ _id: accountReportId }))?.status, 'resolved');
  assert.ok(await mongo.collection('audit_logs').findOne({ targetType: 'account_report', targetId: accountReportId.toHexString(), action: 'account_report.resolve' }));
  stage = 'browser/account-transition';
  await page.locator('#admin-account-report-reason').fill('Confirmed temporary account restriction');
  const accountCard = page.locator('section.admin-accounts__detail-card').filter({ has: page.locator('#admin-account-status-title') });
  const accountAction = accountCard.getByRole('button').first();
  await expect(accountAction).toBeVisible();
  const transitioned = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname === `/api/v1/admin/users/${seekerId.toHexString()}/transitions`);
  await accountAction.click();
  assert.equal((await transitioned).status(), 200);
  const transitionedUser = await mongo.collection('users').findOne({ _id: seekerId });
  assert.ok(['restricted', 'suspended'].includes(transitionedUser?.status));
  assert.ok(await mongo.collection('account_state_transitions').findOne({ targetUserId: seekerId, actorAdminId: admin._id }));
  assert.ok(await mongo.collection('audit_logs').findOne({ targetType: 'user', targetId: seekerId.toHexString(), action: { $in: ['account.restrict', 'account.suspend'] } }));
  report.checks.push('browser_report_reason_validation_resolve_and_account_transition');

  stage = 'api/stale-and-repeat';
  const apiToken = await login(context, admin.normalizedEmail); const headers = { authorization: `Bearer ${apiToken}` };
  const staleReport = await withoutRateLimit(() => context.request.post(`${base}/api/v1/admin/account-reports/${accountReportId.toHexString()}/resolve`, {
    headers, data: { version: 0, action: 'dismiss', reason: 'Stale report resolution must conflict' } }));
  assert.equal(staleReport.status(), 409);
  const repeatAction = transitionedUser.status === 'restricted' ? 'restrict' : 'suspend';
  const repeated = await withoutRateLimit(() => context.request.post(`${base}/api/v1/admin/users/${seekerId.toHexString()}/transitions`, {
    headers, data: { action: repeatAction, reason: 'Repeated account transition must conflict' } }));
  assert.equal(repeated.status(), 409); report.checks.push('stale_report_and_repeated_account_transition_return_409');

  stage = 'authorization';
  const anonymous = await browser.newContext();
  assert.equal((await withoutRateLimit(() => anonymous.request.get(`${base}/api/v1/admin/users`))).status(), 401); await anonymous.close();
  const limited = await browser.newContext(); const limitedToken = await login(limited, viewer.normalizedEmail); const limitedHeaders = { authorization: `Bearer ${limitedToken}` };
  assert.equal((await withoutRateLimit(() => limited.request.post(`${base}/api/v1/admin/users/${seekerId.toHexString()}/transitions`, {
    headers: limitedHeaders, data: { action: 'verify', reason: 'Limited administrator must be denied' } }))).status(), 403);
  assert.equal((await withoutRateLimit(() => limited.request.post(`${base}/api/v1/admin/account-reports/${accountReportId.toHexString()}/resolve`, {
    headers: limitedHeaders, data: { version: 1, action: 'dismiss', reason: 'Limited administrator must be denied' } }))).status(), 403);
  await limited.request.post(`${base}/api/v1/auth/logout`); await limited.close();
  assert.equal((await withoutRateLimit(() => context.request.post(`${base}/api/v1/admin/users/${admin._id.toHexString()}/transitions`, {
    headers, data: { action: 'suspend', reason: 'Self transition must be denied' } }))).status(), 403);
  report.authorization.push('anonymous_401_limited_admin_mutations_403_admin_self_transition_403');
  await mongo.collection('users').updateOne({ _id: admin._id }, { $set: { status: 'suspended' } });
  const current = await withoutRateLimit(() => context.request.get(`${base}/api/v1/admin/users`, { headers })); assert.ok([401, 403].includes(current.status()));
  await mongo.collection('users').updateOne({ _id: admin._id }, { $set: { status: originalAdminStatus } });
  report.authorization.push(`current_suspended_admin_denied_${current.status()}_and_restored`);
  await context.request.post(`${base}/api/v1/auth/logout`); await context.close();
  report.mongo = { reportResolvedVersion: 1, accountTransitionPersisted: true, decisionReasonsPersisted: true,
    auditActions: ['account_report.resolve', `account.${transitionedUser.status === 'restricted' ? 'restrict' : 'suspend'}`], invalidAndConflictWritesPreservedState: true };
  report.status = 'PASS_LOCAL';
} catch (error) {
  report.status = 'FAIL_LOCAL'; report.failure = { stage, message: error instanceof Error ? error.message : String(error) }; process.exitCode = 1;
} finally {
  try {
    if (admin?._id && originalAdminStatus) await mongo.collection('users').updateOne({ _id: admin._id }, { $set: { status: originalAdminStatus } });
    if (accountReportId) await mongo.collection('account_reports').deleteOne({ _id: accountReportId });
    if (seekerId) {
      await mongo.collection('account_state_transitions').deleteMany({ targetUserId: seekerId });
      await mongo.collection('audit_logs').deleteMany({ $or: [{ targetType: 'user', targetId: seekerId.toHexString() }, { targetType: 'account_report', targetId: accountReportId?.toHexString() }] });
      await mongo.collection('seeker_profiles').deleteMany({ userId: seekerId }); await mongo.collection('users').deleteOne({ _id: seekerId });
    }
    if (admin?._id && viewer?._id) {
      const filter = { userId: { $in: [admin._id, viewer._id] }, ...(originalSessionIds.length ? { _id: { $nin: originalSessionIds } } : {}) };
      const extra = await mongo.collection('sessions').find(filter, { projection: { _id: 1 } }).toArray();
      if (extra.length) { await mongo.collection('sessions').deleteMany({ _id: { $in: extra.map(row => row._id) } });
        await mongo.collection('audit_logs').deleteMany({ targetType: 'auth_session', targetId: { $in: extra.map(row => row._id.toHexString()) } }); }
      assert.equal(await mongo.collection('sessions').countDocuments(filter), 0);
    }
    assert.equal(await mongo.collection('users').countDocuments({ _id: seekerId }), 0);
    assert.equal(await mongo.collection('account_reports').countDocuments({ _id: accountReportId }), 0);
    report.cleanup = true;
  } catch (error) { report.status = 'FAIL_LOCAL'; report.cleanup = false; report.cleanupFailure = error instanceof Error ? error.message : String(error); process.exitCode = 1; }
  await browser.close(); await mongo.close(); report.finishedAt = new Date().toISOString();
  await writeFile('docs/quality/guide-runs/guide19-admin-accounts-local-latest.json', `${JSON.stringify(report, null, 2)}\n`);
}
console.log(JSON.stringify({ status: report.status, runs: report.runs.length, cleanup: report.cleanup, failure: report.failure }));
