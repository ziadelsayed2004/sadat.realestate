import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
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
  status: 'RUNNING', journey: 'GUIDE-23', journeys: ['GUIDE-23'], mockedRoutes: false,
  environment: 'local-real-HTTP-MongoDB',
  responsiveEvidence: 'remaining-surfaces-local-latest.json covers ADM-33..ADM-38 in AR/EN on Desktop/Tablet/Pixel 5',
  commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  startedAt: new Date().toISOString(), runs: [], checks: [], authorization: [], auditActions: [], cleanup: false
};
const mongo = await mongoose.createConnection(mongoUri).asPromise();
const browser = await chromium.launch();
const password = 'LocalPreview-Admin-Only-2026!';
let admin;
let viewer;
let provider;
let originalAdminStatus;
let originalSessionIds = [];
let adRequestId;
let paymentProofId;
let stage = 'setup';

async function withoutRateLimit(operation) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await operation();
    if (response.status() !== 429) return response;
    const seconds = Number(response.headers()['ratelimit-reset'] ?? response.headers()['retry-after'] ?? 60);
    await new Promise(resolve => setTimeout(resolve, (Math.max(1, seconds) + 1) * 1000));
  }
  throw new Error('Rate limit did not clear');
}

async function login(context, email) {
  const response = await withoutRateLimit(() => context.request.post(`${base}/api/v1/auth/login`, { data: { email, password } }));
  assert.equal(response.status(), 200, await response.text());
  return (await response.json()).data.accessToken;
}

async function expectStatus(operation, expected) {
  const response = await withoutRateLimit(operation);
  if (response.status() !== expected) throw new Error(`Expected HTTP ${expected}, received ${response.status()}: ${await response.text()}`);
  return response;
}

async function data(response) {
  return (await response.json()).data;
}

try {
  admin = await mongo.collection('users').findOne({ normalizedEmail: 'admin.demo@example.invalid', roleType: 'admin', status: 'verified' });
  viewer = await mongo.collection('users').findOne({ normalizedEmail: 'admin.viewer@example.invalid', roleType: 'admin', status: 'verified' });
  provider = await mongo.collection('users').findOne({ roleType: 'provider', status: 'verified' });
  assert.ok(admin?._id && viewer?._id && provider?._id);
  originalAdminStatus = admin.status;
  originalSessionIds = (await mongo.collection('sessions').find({ userId: { $in: [admin._id, viewer._id] } }, { projection: { _id: 1 } }).toArray()).map(row => row._id);

  const now = new Date();
  adRequestId = new mongoose.Types.ObjectId();
  paymentProofId = new mongoose.Types.ObjectId();
  await mongo.collection('ad_requests').insertOne({
    _id: adRequestId, providerId: provider._id, placementKey: 'homepage.hero', adType: 'banner',
    purpose: `GUIDE-23 ${randomUUID()}`, intervalStart: new Date(now.getTime() + 86_400_000),
    intervalEnd: new Date(now.getTime() + 172_800_000), status: 'review', version: 0,
    history: [{ status: 'review', version: 0, reason: 'GUIDE-23 fixture', changedAt: now }], createdAt: now, updatedAt: now
  });
  await mongo.collection('payment_proofs').insertOne({
    _id: paymentProofId, adRequestId, providerId: provider._id, paymentMethod: 'bank_transfer',
    originalFilename: 'guide23-proof.pdf', normalizedExtension: '.pdf', detectedMime: 'application/pdf',
    byteSize: 128, sha256: randomBytes(32).toString('hex'), version: 1, securityState: 'clean',
    status: 'pending_review', reviewHistory: [], uploadedAt: now, active: true, idempotentReplay: false,
    storageKey: `guide23/${paymentProofId.toHexString()}.pdf`
  });

  stage = 'responsive-empty-retry';
  for (const locale of ['ar', 'en']) for (const [device, preset] of [['desktop', 'Desktop Chrome'], ['tablet', 'Galaxy Tab S4'], ['mobile', 'Pixel 5']]) {
    const browserContext = await browser.newContext({ ...devices[preset] });
    try {
      await login(browserContext, admin.normalizedEmail);
      const page = await browserContext.newPage();
      await page.goto(`${base}/admin/ads/requests?lang=${locale}`, { waitUntil: 'networkidle' });
      await expect(page.locator('[data-screen-id="ADM-33"]')).toBeVisible();
      const origin = await page.evaluate(() => performance.timeOrigin);
      await page.locator('#admin-ads-provider').fill(new mongoose.Types.ObjectId().toHexString());
      await page.locator('.admin-ads__filters button[type="submit"]').click();
      await expect(page.locator('.admin-ads__state[data-state="empty"]')).toBeVisible();
      await page.locator('.admin-ads__filters button[type="button"]').click();
      await expect(page.locator('[data-testid="admin-ad-request-metrics"]')).toBeVisible();
      await browserContext.setOffline(true);
      await page.locator('.admin-ads__filters button[type="submit"]').click();
      const retry = page.locator('.admin-ads__state[data-state="retry"]');
      await expect(retry).toBeVisible();
      await browserContext.setOffline(false);
      const recovered = page.waitForResponse(response => response.request().method() === 'GET' && new URL(response.url()).pathname === '/api/v1/admin/ad-requests');
      await retry.getByRole('button').click();
      assert.equal((await recovered).status(), 200);
      const geometry = await page.evaluate(() => ({ innerWidth, scrollWidth: document.documentElement.scrollWidth }));
      assert.ok(geometry.scrollWidth <= geometry.innerWidth);
      assert.equal(await page.evaluate(() => performance.timeOrigin), origin);
      report.runs.push({ locale, device, status: 'PASS', documentReloaded: false, ...geometry, checks: ['true_empty', 'offline_retry_without_navigation'] });
    } finally {
      await browserContext.setOffline(false);
      await browserContext.request.post(`${base}/api/v1/auth/logout`).catch(() => undefined);
      await browserContext.close();
    }
  }
  report.checks.push('admin_ads_empty_and_offline_retry_ar_en_all_devices');

  const context = await browser.newContext({ ...devices['Desktop Chrome'] });
  const token = await login(context, admin.normalizedEmail);
  const headers = { authorization: `Bearer ${token}` };

  stage = 'read-and-validation';
  for (const path of ['/api/v1/admin/ad-requests', '/api/v1/admin/payment-proofs', '/api/v1/admin/ad-calendar', '/api/v1/admin/ad-financial-review', '/api/v1/admin/ad-ledger']) {
    await expectStatus(() => context.request.get(`${base}${path}`, { headers }), 200);
  }
  const empty = await data(await expectStatus(() => context.request.get(`${base}/api/v1/admin/ad-requests?providerId=${new mongoose.Types.ObjectId().toHexString()}`, { headers }), 200));
  assert.deepEqual(empty.items, []);
  await expectStatus(() => context.request.get(`${base}/api/v1/admin/ad-requests?limit=101`, { headers }), 400);
  await expectStatus(() => context.request.get(`${base}/api/v1/admin/payment-proofs?status=invalid`, { headers }), 400);
  await expectStatus(() => context.request.post(`${base}/api/v1/admin/ad-requests/${adRequestId.toHexString()}/review`, { headers, data: { action: 'approve', expectedVersion: 0, reason: 'x' } }), 400);
  await expectStatus(() => context.request.post(`${base}/api/v1/admin/payment-proofs/${paymentProofId.toHexString()}/review`, { headers, data: { action: 'approve', expectedVersion: 1, reason: 'x' } }), 400);
  assert.equal((await mongo.collection('ad_requests').findOne({ _id: adRequestId }))?.status, 'review');
  assert.equal((await mongo.collection('payment_proofs').findOne({ _id: paymentProofId }))?.status, 'pending_review');
  report.checks.push('all_admin_ads_reads_200_true_empty_and_invalid_inputs_400_without_write');

  stage = 'ad-request-review';
  const adReason = 'GUIDE-23 approved advertising request';
  const reviewedAdResponse = await expectStatus(() => context.request.post(`${base}/api/v1/admin/ad-requests/${adRequestId.toHexString()}/review`, { headers, data: { action: 'approve', expectedVersion: 0, reason: adReason } }), 200);
  const reviewedAd = await data(reviewedAdResponse);
  assert.equal(reviewedAd.request.status, 'waiting_pricing');
  assert.equal(reviewedAd.request.version, 1);
  await expectStatus(() => context.request.post(`${base}/api/v1/admin/ad-requests/${adRequestId.toHexString()}/review`, { headers, data: { action: 'reject', expectedVersion: 0, reason: 'GUIDE-23 stale competing review' } }), 409);
  report.checks.push('ad_request_review_success_and_stale_409');

  stage = 'payment-proof-review';
  const proofReason = 'GUIDE-23 approved clean payment proof';
  const reviewedProof = await data(await expectStatus(() => context.request.post(`${base}/api/v1/admin/payment-proofs/${paymentProofId.toHexString()}/review`, { headers, data: { action: 'approve', expectedVersion: 1, reason: proofReason } }), 200));
  assert.equal(reviewedProof.status, 'approved');
  assert.equal(reviewedProof.version, 2);
  const replayedProof = await data(await expectStatus(() => context.request.post(`${base}/api/v1/admin/payment-proofs/${paymentProofId.toHexString()}/review`, { headers, data: { action: 'approve', expectedVersion: 1, reason: proofReason } }), 200));
  assert.equal(replayedProof.version, 2);
  await expectStatus(() => context.request.post(`${base}/api/v1/admin/payment-proofs/${paymentProofId.toHexString()}/review`, { headers, data: { action: 'reject', expectedVersion: 1, reason: 'GUIDE-23 stale competing proof review' } }), 409);
  report.checks.push('payment_proof_review_idempotent_replay_and_stale_409');

  stage = 'authorization';
  const anonymous = await browser.newContext();
  await expectStatus(() => anonymous.request.get(`${base}/api/v1/admin/ad-requests`), 401);
  await anonymous.close();
  const limited = await browser.newContext();
  const limitedToken = await login(limited, viewer.normalizedEmail);
  const limitedHeaders = { authorization: `Bearer ${limitedToken}` };
  await expectStatus(() => limited.request.post(`${base}/api/v1/admin/ad-requests/${adRequestId.toHexString()}/review`, { headers: limitedHeaders, data: { action: 'reject', expectedVersion: 1, reason: 'Limited admin must be denied' } }), 403);
  await expectStatus(() => limited.request.post(`${base}/api/v1/admin/payment-proofs/${paymentProofId.toHexString()}/review`, { headers: limitedHeaders, data: { action: 'reject', expectedVersion: 2, reason: 'Limited admin must be denied' } }), 403);
  await limited.request.post(`${base}/api/v1/auth/logout`);
  await limited.close();
  await mongo.collection('users').updateOne({ _id: admin._id }, { $set: { status: 'suspended' } });
  const suspended = await withoutRateLimit(() => context.request.get(`${base}/api/v1/admin/ad-requests`, { headers }));
  assert.ok([401, 403].includes(suspended.status()));
  await mongo.collection('users').updateOne({ _id: admin._id }, { $set: { status: originalAdminStatus } });
  report.authorization.push('anonymous_401', 'limited_admin_mutations_403', `current_suspended_admin_${suspended.status()}_and_restored`);

  stage = 'audit';
  const audits = await mongo.collection('audit_logs').find({ targetId: { $in: [adRequestId.toHexString(), paymentProofId.toHexString()] } }).toArray();
  report.auditActions = audits.map(row => row.action).sort();
  const adAudit = audits.find(row => row.action === 'ad_request.review');
  const proofAudits = audits.filter(row => row.action === 'payment_proof.approve');
  assert.equal(adAudit?.reason, adReason);
  assert.equal(typeof adAudit?.requestId, 'string');
  assert.equal(typeof adAudit?.traceId, 'string');
  assert.equal(proofAudits.length, 1);
  assert.equal(proofAudits[0]?.reason, proofReason);
  assert.equal(typeof proofAudits[0]?.requestId, 'string');
  assert.equal(typeof proofAudits[0]?.traceId, 'string');
  report.checks.push('reasoned_request_trace_audits_and_no_duplicate_replay_audit');
  await context.request.post(`${base}/api/v1/auth/logout`);
  await context.close();
  report.status = 'PASS_LOCAL';
} catch (error) {
  report.status = 'FAIL_LOCAL';
  report.failure = { stage, message: error instanceof Error ? error.message : String(error) };
  process.exitCode = 1;
} finally {
  try {
    if (admin?._id && originalAdminStatus) await mongo.collection('users').updateOne({ _id: admin._id }, { $set: { status: originalAdminStatus } });
    const targetIds = [adRequestId?.toHexString(), paymentProofId?.toHexString()].filter(Boolean);
    if (paymentProofId) await mongo.collection('payment_proofs').deleteOne({ _id: paymentProofId });
    if (adRequestId) {
      await mongo.collection('ad_quotes').deleteMany({ requestId: adRequestId });
      await mongo.collection('ad_schedules').deleteMany({ requestId: adRequestId });
      await mongo.collection('ad_ledger_entries').deleteMany({ requestId: adRequestId });
      await mongo.collection('ad_requests').deleteOne({ _id: adRequestId });
    }
    if (targetIds.length) await mongo.collection('audit_logs').deleteMany({ targetId: { $in: targetIds } });
    if (admin?._id && viewer?._id) {
      const extra = await mongo.collection('sessions').find({ userId: { $in: [admin._id, viewer._id] }, ...(originalSessionIds.length ? { _id: { $nin: originalSessionIds } } : {}) }, { projection: { _id: 1 } }).toArray();
      if (extra.length) await mongo.collection('sessions').deleteMany({ _id: { $in: extra.map(row => row._id) } });
    }
    const leftovers = await Promise.all([
      adRequestId ? mongo.collection('ad_requests').countDocuments({ _id: adRequestId }) : 0,
      paymentProofId ? mongo.collection('payment_proofs').countDocuments({ _id: paymentProofId }) : 0,
      targetIds.length ? mongo.collection('audit_logs').countDocuments({ targetId: { $in: targetIds } }) : 0
    ]);
    assert.deepEqual(leftovers, [0, 0, 0]);
    report.cleanup = true;
  } catch (cleanupError) {
    report.cleanupError = cleanupError instanceof Error ? cleanupError.message : String(cleanupError);
    report.status = 'FAIL_LOCAL';
    process.exitCode = 1;
  }
  report.finishedAt = new Date().toISOString();
  await writeFile('docs/quality/guide-runs/guide23-admin-ads-payments-local-latest.json', `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await browser.close();
  await mongo.close();
}

console.log(`GUIDE-23 admin ads/payments local: ${report.status}; ${report.checks.length} checks; ${report.runs.length} browser runs; cleanup=${report.cleanup}`);
