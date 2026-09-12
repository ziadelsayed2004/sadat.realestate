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
const report = { status: 'RUNNING', journey: 'GUIDE-24', journeys: ['GUIDE-24'], mockedRoutes: false,
  environment: 'local-real-HTTP-MongoDB', responsiveEvidence: 'remaining-surfaces-local-latest.json covers ADM-39..ADM-45 in AR/EN on Desktop/Tablet/Pixel 5',
  commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), startedAt: new Date().toISOString(),
  runs: [], checks: [], authorization: [], auditActions: [], cleanup: false };
const mongo = await mongoose.createConnection(mongoUri).asPromise();
const browser = await chromium.launch();
const password = 'LocalPreview-Admin-Only-2026!';
const ids = { policy: undefined, exception: undefined, override: undefined };
let admin; let viewer; let provider; let originalAdminStatus; let originalSessionIds = []; let stage = 'setup';

async function withoutRateLimit(operation) { for (let i = 0; i < 3; i += 1) { const response = await operation(); if (response.status() !== 429) return response; const seconds = Number(response.headers()['ratelimit-reset'] ?? response.headers()['retry-after'] ?? 60); await new Promise(resolve => setTimeout(resolve, (Math.max(1, seconds) + 1) * 1000)); } throw new Error('Rate limit did not clear'); }
async function login(context, email) { const response = await withoutRateLimit(() => context.request.post(`${base}/api/v1/auth/login`, { data: { email, password } })); assert.equal(response.status(), 200, await response.text()); return (await response.json()).data.accessToken; }
async function expectStatus(operation, expected) { const response = await withoutRateLimit(operation); if (response.status() !== expected) throw new Error(`Expected HTTP ${expected}, received ${response.status()}: ${await response.text()}`); return response; }
async function data(response) { return (await response.json()).data; }

try {
  admin = await mongo.collection('users').findOne({ normalizedEmail: 'admin.demo@example.invalid', roleType: 'admin', status: 'verified' });
  viewer = await mongo.collection('users').findOne({ normalizedEmail: 'admin.viewer@example.invalid', roleType: 'admin', status: 'verified' });
  provider = await mongo.collection('users').findOne({ roleType: 'provider', status: 'verified' });
  assert.ok(admin?._id && viewer?._id && provider?._id); originalAdminStatus = admin.status;
  originalSessionIds = (await mongo.collection('sessions').find({ userId: { $in: [admin._id, viewer._id] } }, { projection: { _id: 1 } }).toArray()).map(row => row._id);

  stage = 'responsive-empty-retry';
  assert.equal(await mongo.collection('commission_policies').countDocuments({ status: 'archived' }), 0, 'archived policy fixture required for true empty browser evidence');
  for (const locale of ['ar', 'en']) for (const [device, preset] of [['desktop', 'Desktop Chrome'], ['tablet', 'Galaxy Tab S4'], ['mobile', 'Pixel 5']]) {
    const context = await browser.newContext({ ...devices[preset] });
    try {
      await login(context, admin.normalizedEmail); const page = await context.newPage();
      await page.goto(`${base}/admin/commissions?lang=${locale}`, { waitUntil: 'networkidle' });
      await expect(page.locator('[data-screen-id="ADM-39"]')).toBeVisible(); const origin = await page.evaluate(() => performance.timeOrigin);
      await page.locator('#admin-commission-policies-status').selectOption('archived');
      await page.locator('.admin-commissions__filters button[type="submit"]').click();
      await expect(page.locator('.admin-commissions__state[data-state="empty"]')).toBeVisible();
      await context.setOffline(true); await page.locator('.admin-commissions__filters button[type="submit"]').click();
      const retry = page.locator('.admin-commissions__state[data-state="retry"]'); await expect(retry).toBeVisible();
      await context.setOffline(false); const recovered = page.waitForResponse(response => response.request().method() === 'GET' && new URL(response.url()).pathname === '/api/v1/admin/commission-policies');
      await retry.getByRole('button').click(); assert.equal((await recovered).status(), 200);
      const geometry = await page.evaluate(() => ({ innerWidth, scrollWidth: document.documentElement.scrollWidth })); assert.ok(geometry.scrollWidth <= geometry.innerWidth); assert.equal(await page.evaluate(() => performance.timeOrigin), origin);
      report.runs.push({ locale, device, status: 'PASS', documentReloaded: false, ...geometry, checks: ['true_empty', 'offline_retry_without_navigation'] });
    } finally { await context.setOffline(false); await context.request.post(`${base}/api/v1/auth/logout`).catch(() => undefined); await context.close(); }
  }
  report.checks.push('commission_policy_empty_and_offline_retry_ar_en_all_devices');

  const context = await browser.newContext({ ...devices['Desktop Chrome'] }); const token = await login(context, admin.normalizedEmail); const headers = { authorization: `Bearer ${token}` };
  stage = 'reads-validation';
  for (const path of ['/api/v1/admin/commission-policies', `/api/v1/admin/account-commissions/${provider._id.toHexString()}`, '/api/v1/admin/commission-exceptions', '/api/v1/admin/commission-confirmations', '/api/v1/admin/commission-change-log']) await expectStatus(() => context.request.get(`${base}${path}`, { headers }), 200);
  await expectStatus(() => context.request.get(`${base}/api/v1/admin/commission-policies?limit=101`, { headers }), 400);
  await expectStatus(() => context.request.get(`${base}/api/v1/admin/commission-change-log?targetId=${new mongoose.Types.ObjectId().toHexString()}`, { headers }), 400);
  await expectStatus(() => context.request.post(`${base}/api/v1/admin/commission-exceptions`, { headers, data: { accountId: provider._id.toHexString(), kind: 'percentage', percentageBps: 50, reason: 'x', effectiveFrom: new Date().toISOString() } }), 400);
  report.checks.push('all_commission_reads_200_and_invalid_inputs_400_without_write');

  const suffix = randomUUID().replaceAll('-', ''); const effectiveFrom = new Date(Date.now() + 86_400_000).toISOString();
  stage = 'creation-and-duplicates';
  const policyInput = { key: `guide24.${suffix}`, label: 'GUIDE-24 temporary policy', kind: 'percentage', scope: { kind: 'organization', key: `guide24.${suffix}` }, percentageBps: 125, effectiveFrom };
  const policy = await data(await expectStatus(() => context.request.post(`${base}/api/v1/admin/commission-policies`, { headers, data: policyInput }), 201)); ids.policy = policy.id;
  await expectStatus(() => context.request.post(`${base}/api/v1/admin/commission-policies`, { headers, data: policyInput }), 409);
  const exceptionInput = { accountId: provider._id.toHexString(), kind: 'percentage', percentageBps: 75, reason: 'GUIDE-24 temporary approved exception', effectiveFrom };
  const exception = await data(await expectStatus(() => context.request.post(`${base}/api/v1/admin/commission-exceptions`, { headers, data: exceptionInput }), 201)); ids.exception = exception.id;
  await expectStatus(() => context.request.post(`${base}/api/v1/admin/commission-exceptions`, { headers, data: exceptionInput }), 409);
  const overrideInput = { kind: 'exempt', effectiveFrom };
  const override = await data(await expectStatus(() => context.request.put(`${base}/api/v1/admin/account-commissions/${provider._id.toHexString()}`, { headers, data: overrideInput }), 201)); ids.override = override.id;
  await expectStatus(() => context.request.put(`${base}/api/v1/admin/account-commissions/${provider._id.toHexString()}`, { headers, data: overrideInput }), 409);
  report.checks.push('policy_exception_override_create_and_duplicate_409');

  stage = 'change-log-audit';
  for (const [targetType, targetId] of [['commission_policy', ids.policy], ['commission_exception', ids.exception], ['commission_account_override', ids.override]]) {
    const history = await data(await expectStatus(() => context.request.get(`${base}/api/v1/admin/commission-change-log?targetType=${targetType}&targetId=${targetId}`, { headers }), 200));
    assert.equal(history.total, 1); assert.equal(history.items[0].targetId, targetId); assert.equal(typeof history.items[0].reason, 'string'); assert.ok(history.items[0].reason.length >= 3);
  }
  const audits = await mongo.collection('audit_logs').find({ targetId: { $in: Object.values(ids) } }).toArray(); assert.equal(audits.length, 3);
  assert.ok(audits.every(row => typeof row.requestId === 'string' && typeof row.traceId === 'string'));
  report.auditActions = audits.map(row => row.action).sort(); report.checks.push('change_log_exposes_three_reasoned_request_trace_audits');

  stage = 'authorization';
  const anonymous = await browser.newContext(); await expectStatus(() => anonymous.request.get(`${base}/api/v1/admin/commission-policies`), 401); await anonymous.close();
  const limited = await browser.newContext(); const limitedToken = await login(limited, viewer.normalizedEmail); const limitedHeaders = { authorization: `Bearer ${limitedToken}` };
  await expectStatus(() => limited.request.post(`${base}/api/v1/admin/commission-policies`, { headers: limitedHeaders, data: { ...policyInput, key: `denied.${suffix}` } }), 403);
  await expectStatus(() => limited.request.post(`${base}/api/v1/admin/commission-exceptions`, { headers: limitedHeaders, data: { ...exceptionInput, effectiveFrom: new Date(Date.now() + 172_800_000).toISOString() } }), 403);
  await limited.request.post(`${base}/api/v1/auth/logout`); await limited.close();
  await mongo.collection('users').updateOne({ _id: admin._id }, { $set: { status: 'suspended' } });
  const suspended = await withoutRateLimit(() => context.request.get(`${base}/api/v1/admin/commission-policies`, { headers })); assert.ok([401, 403].includes(suspended.status()));
  await mongo.collection('users').updateOne({ _id: admin._id }, { $set: { status: originalAdminStatus } });
  report.authorization.push('anonymous_401', 'limited_admin_mutations_403', `current_suspended_admin_${suspended.status()}_and_restored`);
  await context.request.post(`${base}/api/v1/auth/logout`); await context.close(); report.status = 'PASS_LOCAL';
} catch (error) { report.status = 'FAIL_LOCAL'; report.failure = { stage, message: error instanceof Error ? error.message : String(error) }; process.exitCode = 1; }
finally {
  try {
    if (admin?._id && originalAdminStatus) await mongo.collection('users').updateOne({ _id: admin._id }, { $set: { status: originalAdminStatus } });
    const targetIds = Object.values(ids).filter(Boolean);
    if (ids.policy) await mongo.collection('commission_policies').deleteOne({ id: ids.policy });
    if (ids.exception) await mongo.collection('commission_exceptions').deleteOne({ id: ids.exception });
    if (ids.override) await mongo.collection('commission_account_overrides').deleteOne({ id: ids.override });
    if (targetIds.length) await mongo.collection('audit_logs').deleteMany({ targetId: { $in: targetIds } });
    if (admin?._id && viewer?._id) { const extra = await mongo.collection('sessions').find({ userId: { $in: [admin._id, viewer._id] }, ...(originalSessionIds.length ? { _id: { $nin: originalSessionIds } } : {}) }, { projection: { _id: 1 } }).toArray(); if (extra.length) await mongo.collection('sessions').deleteMany({ _id: { $in: extra.map(row => row._id) } }); }
    assert.equal(await mongo.collection('audit_logs').countDocuments({ targetId: { $in: targetIds } }), 0); report.cleanup = true;
  } catch (error) { report.status = 'FAIL_LOCAL'; report.cleanupError = error instanceof Error ? error.message : String(error); process.exitCode = 1; }
  report.finishedAt = new Date().toISOString(); await writeFile('docs/quality/guide-runs/guide24-admin-commissions-local-latest.json', `${JSON.stringify(report, null, 2)}\n`, 'utf8'); await browser.close(); await mongo.close();
}
console.log(`GUIDE-24 admin commissions local: ${report.status}; ${report.checks.length} checks; ${report.runs.length} browser runs; cleanup=${report.cleanup}`);
