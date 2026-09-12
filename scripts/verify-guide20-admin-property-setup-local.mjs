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
  status: 'RUNNING', journey: 'GUIDE-20', journeys: ['GUIDE-20'], mockedRoutes: false,
  environment: 'local-real-HTTP-MongoDB',
  responsiveEvidence: 'remaining-surfaces-local-latest.json covers ADM-09..ADM-17 in AR/EN on Desktop/Tablet/Pixel 5',
  commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  startedAt: new Date().toISOString(), runs: [], checks: [], authorization: [], auditActions: [], cleanup: false
};
const mongo = await mongoose.createConnection(mongoUri).asPromise();
const browser = await chromium.launch();
const password = 'LocalPreview-Admin-Only-2026!';
const createdIds = [];
let admin;
let viewer;
let originalAdminStatus;
let originalSessionIds = [];
let projectId;
let propertyReportId;
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
  assert.equal(response.status(), 200);
  return (await response.json()).data.accessToken;
}

async function expectStatus(operation, expected) {
  const response = await withoutRateLimit(operation);
  if (response.status() !== expected) {
    throw new Error(`Expected HTTP ${expected}, received ${response.status()}: ${await response.text()}`);
  }
  return response;
}

async function data(response) {
  return (await response.json()).data;
}

try {
  admin = await mongo.collection('users').findOne({ normalizedEmail: 'admin.demo@example.invalid', roleType: 'admin', status: 'verified' });
  viewer = await mongo.collection('users').findOne({ normalizedEmail: 'admin.viewer@example.invalid', roleType: 'admin', status: 'verified' });
  assert.ok(admin?._id && viewer?._id);
  originalAdminStatus = admin.status;
  originalSessionIds = (await mongo.collection('sessions').find({ userId: { $in: [admin._id, viewer._id] } }, { projection: { _id: 1 } }).toArray()).map(row => row._id);

  const context = await browser.newContext({ ...devices['Desktop Chrome'] });
  const token = await login(context, admin.normalizedEmail);
  const headers = { authorization: `Bearer ${token}` };
  const marker = randomUUID();
  const suffix = marker.replaceAll('-', '');

  stage = 'responsive-network-retry';
  for (const locale of ['ar', 'en']) for (const [device, preset] of [['desktop', 'Desktop Chrome'], ['tablet', 'Galaxy Tab S4'], ['mobile', 'Pixel 5']]) {
    const browserContext = await browser.newContext({ ...devices[preset] });
    try {
      await login(browserContext, admin.normalizedEmail);
      const page = await browserContext.newPage();
      const initial = page.waitForResponse(response => response.request().method() === 'GET' && new URL(response.url()).pathname === '/api/v1/admin/property-categories');
      await page.goto(`${base}/admin/property-categories?lang=${locale}`, { waitUntil: 'networkidle' });
      assert.equal((await initial).status(), 200);
      await expect(page.locator('[data-screen-id="ADM-09"]')).toBeVisible();
      const origin = await page.evaluate(() => performance.timeOrigin);
      await browserContext.setOffline(true);
      await page.locator('.admin-master-data__panel-heading button').click();
      const retry = page.locator('.admin-master-data__state[data-state="retry"]');
      await expect(retry).toBeVisible();
      await browserContext.setOffline(false);
      const recovered = page.waitForResponse(response => response.request().method() === 'GET' && new URL(response.url()).pathname === '/api/v1/admin/property-categories');
      await retry.getByRole('button').click();
      assert.equal((await recovered).status(), 200);
      const geometry = await page.evaluate(() => ({ innerWidth, scrollWidth: document.documentElement.scrollWidth }));
      assert.ok(geometry.scrollWidth <= geometry.innerWidth);
      assert.equal(await page.evaluate(() => performance.timeOrigin), origin);
      report.runs.push({ locale, device, status: 'PASS', documentReloaded: false, ...geometry, checks: ['offline_retry_without_navigation'] });
    } finally {
      await browserContext.setOffline(false);
      await browserContext.request.post(`${base}/api/v1/auth/logout`).catch(() => undefined);
      await browserContext.close();
    }
  }
  report.checks.push('admin_master_data_offline_retry_ar_en_all_devices');

  stage = 'empty-query';
  const empty = await data(await expectStatus(() => context.request.get(`${base}/api/v1/admin/property-categories?search=missing-${suffix}`, { headers }), 200));
  assert.deepEqual(empty.items, []);
  report.checks.push('admin_master_data_true_empty_query');

  stage = 'validation';
  const invalidSlug = `guide20-invalid-${suffix}`;
  await expectStatus(() => context.request.post(`${base}/api/v1/admin/property-categories`, {
    headers, data: { kind: 'category', name: { ar: 'Temporary invalid category', en: 'Temporary invalid category' }, slug: invalidSlug, order: 999, active: true, reason: 'bad' }
  }), 400);
  assert.equal(await mongo.collection('property_taxonomy').countDocuments({ slug: invalidSlug }), 0);
  report.checks.push('short_reason_validation_returns_400_without_write');

  stage = 'taxonomy-crud';
  const taxonomySlug = `guide20-category-${suffix}`;
  const taxonomyCreated = await data(await expectStatus(() => context.request.post(`${base}/api/v1/admin/property-categories`, {
    headers, data: { kind: 'category', name: { ar: 'Temporary category', en: 'Temporary category' }, slug: taxonomySlug, order: 900, active: true, reason: 'GUIDE-20 category creation' }
  }), 201));
  createdIds.push(taxonomyCreated.id);
  const taxonomyUpdated = await data(await expectStatus(() => context.request.patch(`${base}/api/v1/admin/property-categories/${taxonomyCreated.id}`, {
    headers, data: { version: 0, order: 901, reason: 'GUIDE-20 category update' }
  }), 200));
  assert.equal(taxonomyUpdated.version, 1);
  await expectStatus(() => context.request.patch(`${base}/api/v1/admin/property-categories/${taxonomyCreated.id}`, {
    headers, data: { version: 0, order: 902, reason: 'GUIDE-20 stale category update' }
  }), 409);
  await expectStatus(() => context.request.delete(`${base}/api/v1/admin/property-categories/${taxonomyCreated.id}`, {
    headers, data: { version: 1, reason: 'GUIDE-20 category deletion' }
  }), 200);
  assert.equal(await mongo.collection('property_taxonomy').countDocuments({ _id: new mongoose.Types.ObjectId(taxonomyCreated.id) }), 0);
  report.checks.push('taxonomy_create_update_stale_409_delete');

  stage = 'location-crud';
  const locationSlug = `guide20-location-${suffix}`;
  const locationCreated = await data(await expectStatus(() => context.request.post(`${base}/api/v1/admin/locations`, {
    headers, data: { kind: 'location', name: { ar: 'Temporary location', en: 'Temporary location' }, slug: locationSlug, order: 900, active: true, reason: 'GUIDE-20 location creation' }
  }), 201));
  createdIds.push(locationCreated.id);
  const locationUpdated = await data(await expectStatus(() => context.request.patch(`${base}/api/v1/admin/locations/${locationCreated.id}`, {
    headers, data: { version: 0, order: 901, reason: 'GUIDE-20 location update' }
  }), 200));
  assert.equal(locationUpdated.version, 1);
  await expectStatus(() => context.request.patch(`${base}/api/v1/admin/locations/${locationCreated.id}`, {
    headers, data: { version: 0, order: 902, reason: 'GUIDE-20 stale location update' }
  }), 409);
  await expectStatus(() => context.request.delete(`${base}/api/v1/admin/locations/${locationCreated.id}`, {
    headers, data: { version: 1, reason: 'GUIDE-20 location deletion' }
  }), 200);
  assert.equal(await mongo.collection('locations').countDocuments({ _id: new mongoose.Types.ObjectId(locationCreated.id) }), 0);
  report.checks.push('location_create_update_stale_409_delete');

  stage = 'feature-crud';
  const featureSlug = `guide20-feature-${suffix}`;
  const featureCreated = await data(await expectStatus(() => context.request.post(`${base}/api/v1/admin/features`, {
    headers, data: { kind: 'feature', groupKey: 'guide20', name: { ar: 'Temporary feature', en: 'Temporary feature' }, slug: featureSlug, order: 900, active: true, reason: 'GUIDE-20 feature creation' }
  }), 201));
  createdIds.push(featureCreated.id);
  const featureUpdated = await data(await expectStatus(() => context.request.patch(`${base}/api/v1/admin/features/${featureCreated.id}`, {
    headers, data: { version: 0, order: 901, reason: 'GUIDE-20 feature update' }
  }), 200));
  assert.equal(featureUpdated.version, 1);
  await expectStatus(() => context.request.patch(`${base}/api/v1/admin/features/${featureCreated.id}`, {
    headers, data: { version: 0, order: 902, reason: 'GUIDE-20 stale feature update' }
  }), 409);
  await expectStatus(() => context.request.delete(`${base}/api/v1/admin/features/${featureCreated.id}`, {
    headers, data: { version: 1, reason: 'GUIDE-20 feature deletion' }
  }), 200);
  assert.equal(await mongo.collection('features_services').countDocuments({ _id: new mongoose.Types.ObjectId(featureCreated.id) }), 0);
  report.checks.push('feature_create_update_stale_409_delete');

  stage = 'project-review';
  projectId = new mongoose.Types.ObjectId();
  const now = new Date();
  await mongo.collection('projects').insertOne({ _id: projectId, providerId: viewer._id, name: { ar: 'Temporary project', en: 'Temporary project' }, slug: `guide20-project-${suffix}`, status: 'pending_review', submittedAt: now, createdAt: now, updatedAt: now, version: 0 });
  const approved = await data(await expectStatus(() => context.request.post(`${base}/api/v1/admin/projects/${projectId.toHexString()}/review`, {
    headers, data: { version: 0, action: 'approve', reason: 'GUIDE-20 project approval' }
  }), 200));
  assert.equal(approved.status, 'approved');
  await expectStatus(() => context.request.post(`${base}/api/v1/admin/projects/${projectId.toHexString()}/review`, {
    headers, data: { version: 0, action: 'reject', reason: 'GUIDE-20 stale project review' }
  }), 409);
  const published = await data(await expectStatus(() => context.request.post(`${base}/api/v1/admin/projects/${projectId.toHexString()}/review`, {
    headers, data: { version: 1, action: 'publish', reason: 'GUIDE-20 project publication' }
  }), 200));
  assert.equal(published.status, 'published');
  assert.equal((await mongo.collection('projects').findOne({ _id: projectId }))?.version, 2);
  report.checks.push('project_approve_stale_409_publish_with_versioned_audits');

  stage = 'property-report';
  propertyReportId = new mongoose.Types.ObjectId();
  const propertyId = new mongoose.Types.ObjectId();
  await mongo.collection('property_reports').insertOne({ _id: propertyReportId, propertyId, reporterId: viewer._id, reason: 'inaccurate', details: 'Temporary GUIDE-20 property report', status: 'open', createdAt: now, updatedAt: now, version: 0 });
  const resolved = await data(await expectStatus(() => context.request.post(`${base}/api/v1/admin/property-reports/${propertyReportId.toHexString()}/resolve`, {
    headers, data: { version: 0, action: 'resolve', reason: 'GUIDE-20 property report resolution' }
  }), 200));
  assert.equal(resolved.status, 'resolved');
  await expectStatus(() => context.request.post(`${base}/api/v1/admin/property-reports/${propertyReportId.toHexString()}/resolve`, {
    headers, data: { version: 0, action: 'dismiss', reason: 'GUIDE-20 stale report resolution' }
  }), 409);
  report.checks.push('property_report_resolve_and_stale_409');

  stage = 'authorization';
  const anonymous = await browser.newContext();
  await expectStatus(() => anonymous.request.get(`${base}/api/v1/admin/property-categories`), 401);
  await anonymous.close();
  const limited = await browser.newContext();
  const limitedToken = await login(limited, viewer.normalizedEmail);
  const limitedHeaders = { authorization: `Bearer ${limitedToken}` };
  await expectStatus(() => limited.request.post(`${base}/api/v1/admin/property-categories`, {
    headers: limitedHeaders, data: { kind: 'category', name: { ar: 'Denied category', en: 'Denied category' }, slug: `guide20-denied-${suffix}`, order: 1, active: true, reason: 'Limited admin must be denied' }
  }), 403);
  await expectStatus(() => limited.request.post(`${base}/api/v1/admin/projects/${projectId.toHexString()}/review`, {
    headers: limitedHeaders, data: { version: 2, action: 'reject', reason: 'Limited admin must be denied' }
  }), 403);
  await expectStatus(() => limited.request.post(`${base}/api/v1/admin/property-reports/${propertyReportId.toHexString()}/resolve`, {
    headers: limitedHeaders, data: { version: 1, action: 'dismiss', reason: 'Limited admin must be denied' }
  }), 403);
  await limited.request.post(`${base}/api/v1/auth/logout`);
  await limited.close();
  await mongo.collection('users').updateOne({ _id: admin._id }, { $set: { status: 'suspended' } });
  const suspended = await withoutRateLimit(() => context.request.get(`${base}/api/v1/admin/property-categories`, { headers }));
  assert.ok([401, 403].includes(suspended.status()));
  await mongo.collection('users').updateOne({ _id: admin._id }, { $set: { status: originalAdminStatus } });
  report.authorization.push('anonymous_401', 'limited_admin_mutations_403', `current_suspended_admin_${suspended.status()}_and_restored`);

  const audits = await mongo.collection('audit_logs').find({ targetId: { $in: [...createdIds, projectId.toHexString(), propertyReportId.toHexString()] } }, { projection: { action: 1, reason: 1 } }).toArray();
  report.auditActions = audits.map(row => row.action).sort();
  for (const action of ['taxonomy.create', 'taxonomy.update', 'taxonomy.delete', 'location.create', 'location.update', 'location.delete', 'feature.create', 'feature.update', 'feature.delete', 'project.review', 'property_report.resolve']) {
    assert.ok(report.auditActions.includes(action), `missing audit ${action}`);
  }
  assert.ok(audits.every(row => typeof row.reason === 'string' && row.reason.length >= 5));
  report.checks.push('all_successful_mutations_have_reasoned_audits');
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
    if (projectId) await mongo.collection('projects').deleteOne({ _id: projectId });
    if (propertyReportId) await mongo.collection('property_reports').deleteOne({ _id: propertyReportId });
    if (createdIds.length) {
      const objectIds = createdIds.map(id => new mongoose.Types.ObjectId(id));
      await mongo.collection('property_taxonomy').deleteMany({ _id: { $in: objectIds } });
      await mongo.collection('locations').deleteMany({ _id: { $in: objectIds } });
      await mongo.collection('features_services').deleteMany({ _id: { $in: objectIds } });
    }
    const targetIds = [...createdIds, projectId?.toHexString(), propertyReportId?.toHexString()].filter(Boolean);
    if (targetIds.length) await mongo.collection('audit_logs').deleteMany({ targetId: { $in: targetIds } });
    if (admin?._id && viewer?._id) {
      const sessionFilter = { userId: { $in: [admin._id, viewer._id] }, ...(originalSessionIds.length ? { _id: { $nin: originalSessionIds } } : {}) };
      const extra = await mongo.collection('sessions').find(sessionFilter, { projection: { _id: 1 } }).toArray();
      if (extra.length) {
        await mongo.collection('sessions').deleteMany({ _id: { $in: extra.map(row => row._id) } });
        await mongo.collection('audit_logs').deleteMany({ targetType: 'auth_session', targetId: { $in: extra.map(row => row._id.toHexString()) } });
      }
      assert.equal(await mongo.collection('sessions').countDocuments(sessionFilter), 0);
    }
    assert.equal(projectId ? await mongo.collection('projects').countDocuments({ _id: projectId }) : 0, 0);
    assert.equal(propertyReportId ? await mongo.collection('property_reports').countDocuments({ _id: propertyReportId }) : 0, 0);
    report.cleanup = true;
  } catch (error) {
    report.status = 'FAIL_LOCAL'; report.cleanup = false;
    report.cleanupFailure = error instanceof Error ? error.message : String(error);
    process.exitCode = 1;
  }
  await browser.close();
  await mongo.close();
  report.finishedAt = new Date().toISOString();
  await writeFile('docs/quality/guide-runs/guide20-admin-property-setup-local-latest.json', `${JSON.stringify(report, null, 2)}\n`);
}

console.log(JSON.stringify({ status: report.status, checks: report.checks.length, authorization: report.authorization.length, cleanup: report.cleanup, failure: report.failure }));
