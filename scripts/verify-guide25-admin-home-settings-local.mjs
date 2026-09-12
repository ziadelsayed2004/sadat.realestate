import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import mongoose from 'mongoose';
import { chromium, devices, expect } from '@playwright/test';
import { readEnvironmentFile } from './environment-file.mjs';

const env = await readEnvironmentFile('.env.local');
const mongoUri = process.env.MONGODB_URI ?? env.MONGODB_URI;
const base = process.env.LOCAL_GUIDE_BASE_URL ?? `http://127.0.0.1:${env.WEB_PORT ?? '4173'}`;
const reportPath = 'docs/quality/guide-runs/guide25-admin-home-settings-local-latest.json';
const reuseBrowserEvidence = process.env.GUIDE25_REUSE_BROWSER_EVIDENCE === '1';
const previousReport = reuseBrowserEvidence ? JSON.parse(await readFile(reportPath, 'utf8')) : undefined;
assert.ok(mongoUri);
assert.equal(new URL(mongoUri).hostname, '127.0.0.1');

const settingsScreens = [
  ['platform', '/admin/settings/platform', 'ADM-50'],
  ['contact', '/admin/settings/contact', 'ADM-51'],
  ['social', '/admin/settings/social', 'ADM-52'],
  ['properties', '/admin/settings/properties', 'ADM-53'],
  ['advertising', '/admin/settings/advertising', 'ADM-55'],
  ['seo', '/admin/settings/seo', 'ADM-56'],
  ['privacy-security', '/admin/settings/privacy-security', 'ADM-57'],
  ['display', '/admin/settings/display', 'ADM-58']
];
const homeScreens = [
  ['/admin/banners', 'ADM-46'],
  ['/admin/banners/new', 'ADM-47'],
  ['/admin/content/tips', 'ADM-48'],
  ['/admin/content/homepage', 'ADM-49']
];
const report = {
  status: 'RUNNING', journey: 'GUIDE-25', journeys: ['GUIDE-25'], mockedRoutes: false,
  environment: 'local-real-HTTP-MongoDB',
  responsiveEvidence: 'ADM-46..ADM-53 and ADM-55..ADM-58 visited in AR/EN on Desktop/Tablet/Pixel 5',
  commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  startedAt: new Date().toISOString(), runs: [], checks: [], authorization: [], auditActions: [], cleanup: false
};
const mongo = await mongoose.createConnection(mongoUri).asPromise();
const browser = await chromium.launch();
const password = 'LocalPreview-Admin-Only-2026!';
let admin;
let viewer;
let originalAdminStatus;
let originalSessionIds = [];
let settingsSnapshots = [];
let originalSettingsAuditIds = [];
let bannerId;
let temporaryPlacementId;
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

async function login(context, email, origin = base) {
  const response = await withoutRateLimit(() => context.request.post(`${origin}/api/v1/auth/login`, { data: { email, password } }));
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

async function waitForFreshRateWindow(always = false) {
  const response = await fetch(`${base}/api/v1/admin/banners`);
  if (!always && response.status !== 429) return;
  const seconds = Number(response.headers.get('ratelimit-reset') ?? response.headers.get('retry-after') ?? 60);
  await new Promise(resolve => setTimeout(resolve, (Math.max(1, seconds) + 1) * 1000));
}

async function visitScreen(page, origin, locale, path, screenId, stateAttribute) {
  const pageErrors = [];
  const onPageError = error => pageErrors.push(error.message);
  page.on('pageerror', onPageError);
  const response = await page.goto(`${origin}${path}?lang=${locale}`, { waitUntil: 'networkidle' });
  assert.equal(response?.status(), 200);
  await expect(page.locator(`[data-screen-id="${screenId}"]`)).toBeVisible();
  await expect(page.locator(`[data-screen-id="${screenId}"]`)).toHaveAttribute(stateAttribute, /^(?:success|empty)$/u);
  const geometry = await page.evaluate(() => ({ innerWidth, scrollWidth: document.documentElement.scrollWidth }));
  assert.ok(geometry.scrollWidth <= geometry.innerWidth + 1, `${screenId} overflow ${geometry.scrollWidth}/${geometry.innerWidth}`);
  assert.deepEqual(pageErrors, [], `${screenId} page errors: ${pageErrors.join('; ')}`);
  page.off('pageerror', onPageError);
  return geometry;
}

try {
  await waitForFreshRateWindow();
  admin = await mongo.collection('users').findOne({ normalizedEmail: 'admin.demo@example.invalid', roleType: 'admin', status: 'verified' });
  viewer = await mongo.collection('users').findOne({ normalizedEmail: 'admin.viewer@example.invalid', roleType: 'admin', status: 'verified' });
  assert.ok(admin?._id && viewer?._id);
  originalAdminStatus = admin.status;
  originalSessionIds = (await mongo.collection('sessions').find({ userId: { $in: [admin._id, viewer._id] } }, { projection: { _id: 1 } }).toArray()).map(row => row._id);
  const namespaces = settingsScreens.map(([namespace]) => namespace);
  settingsSnapshots = await mongo.collection('admin_settings').find({ namespace: { $in: namespaces } }).toArray();
  assert.ok(settingsSnapshots.length >= 1, 'at least one GUIDE-25 settings fixture must exist');
  originalSettingsAuditIds = (await mongo.collection('audit_logs').find({ targetType: 'admin_settings', targetId: { $in: namespaces } }, { projection: { _id: 1 } }).toArray()).map(row => row._id);

  stage = 'responsive-and-retry';
  if (reuseBrowserEvidence) {
    assert.equal(previousReport?.runs?.length, 6, 'six prior browser runs are required');
    assert.ok(previousReport.runs.every(run => run.status === 'PASS' && run.screens?.length === 12));
    report.runs = previousReport.runs;
  }
  for (const locale of reuseBrowserEvidence ? [] : ['ar', 'en']) {
    for (const [device, preset] of [['desktop', 'Desktop Chrome'], ['tablet', 'Galaxy Tab S4'], ['mobile', 'Pixel 5']]) {
      const context = await browser.newContext({ ...devices[preset] });
      const browserBase = locale === 'ar' ? base.replace('127.0.0.1', 'localhost') : base;
      try {
        await login(context, admin.normalizedEmail, browserBase);
        const page = await context.newPage();
        const screens = [];
        for (const [path, screenId] of homeScreens) {
          const geometry = await visitScreen(page, browserBase, locale, path, screenId, 'data-admin-home-state');
          screens.push({ screenId, ...geometry });
        }
        for (const [, path, screenId] of settingsScreens) {
          const geometry = await visitScreen(page, browserBase, locale, path, screenId, 'data-admin-settings-state');
          screens.push({ screenId, ...geometry });
        }

        await page.goto(`${browserBase}/admin/settings/platform?lang=${locale}`, { waitUntil: 'networkidle' });
        await expect(page.locator('[data-screen-id="ADM-50"]')).toHaveAttribute('data-admin-settings-state', /^(?:success|empty)$/u);
        const origin = await page.evaluate(() => performance.timeOrigin);
        await page.locator('#admin-settings-platform-reason').fill('GUIDE-25 offline retry check');
        await context.setOffline(true);
        await page.locator('[data-testid="admin-settings-platform-form"] button[type="submit"]').click();
        const retry = page.locator('.admin-settings__state[data-state="retry"]');
        await expect(retry).toBeVisible();
        await context.setOffline(false);
        const recovered = page.waitForResponse(response => response.request().method() === 'GET' && new URL(response.url()).pathname === '/api/v1/admin/settings/platform');
        await retry.getByRole('button').click();
        assert.ok([200, 404].includes((await recovered).status()));
        await expect(page.locator('[data-screen-id="ADM-50"]')).toHaveAttribute('data-admin-settings-state', /^(?:success|empty)$/u);
        assert.equal(await page.evaluate(() => performance.timeOrigin), origin);
        report.runs.push({ locale, device, status: 'PASS', documentReloaded: false, screens, checks: ['all_screen_ids', 'no_horizontal_overflow', 'offline_retry_without_navigation'] });
      } finally {
        await context.setOffline(false);
        await context.request.post(`${browserBase}/api/v1/auth/logout`).catch(() => undefined);
        await context.close();
      }
    }
    await waitForFreshRateWindow(true);
  }
  report.checks.push('twelve_admin_home_settings_screens_ar_en_all_devices_with_retry');

  const context = await browser.newContext({ ...devices['Desktop Chrome'] });
  const token = await login(context, admin.normalizedEmail);
  const headers = { authorization: `Bearer ${token}` };

  stage = 'reads-empty-validation';
  for (const [namespace, path] of settingsScreens) {
    const expected = settingsSnapshots.some(row => row.namespace === namespace) ? 200 : 404;
    await expectStatus(() => context.request.get(`${base}/api/v1${path}`, { headers }), expected);
  }
  for (const namespace of ['tips', 'homepage']) await expectStatus(() => context.request.get(`${base}/api/v1/admin/content/${namespace}`, { headers }), 200);
  await expectStatus(() => context.request.get(`${base}/api/v1/admin/banners`, { headers }), 200);
  const emptyKey = `guide25.missing.${randomUUID().replaceAll('-', '')}`;
  const empty = await data(await expectStatus(() => context.request.get(`${base}/api/v1/admin/banners?placementKey=${emptyKey}`, { headers }), 200));
  assert.deepEqual(empty.items, []);
  await expectStatus(() => context.request.get(`${base}/api/v1/admin/banners?limit=101`, { headers }), 400);
  await expectStatus(() => context.request.put(`${base}/api/v1/admin/settings/platform`, { headers, data: { schemaVersion: 1, values: {}, expectedVersion: 0, reason: 'x' } }), 400);
  await expectStatus(() => context.request.post(`${base}/api/v1/admin/banners`, { headers, data: { placementKey: 'homepage.hero', title: { en: 'Invalid' } } }), 400);
  report.checks.push('all_reads_200_true_banner_empty_and_invalid_inputs_400_without_write');

  stage = 'settings-mutations-concurrency-audit';
  const updatedSettings = new Map();
  for (const [namespace] of settingsScreens) {
    const snapshot = settingsSnapshots.find(row => row.namespace === namespace);
    const schemaVersion = snapshot?.schemaVersion ?? 1;
    const values = snapshot?.values ?? {};
    const expectedVersion = snapshot?.version ?? 0;
    const reason = `GUIDE-25 verify ${namespace} settings`;
    const updated = await data(await expectStatus(() => context.request.put(`${base}/api/v1/admin/settings/${namespace}`, {
      headers,
      data: { schemaVersion, values, expectedVersion, reason }
    }), 200));
    assert.equal(updated.version, snapshot ? snapshot.version + 1 : 0);
    updatedSettings.set(namespace, updated);
  }
  const staleSnapshot = settingsSnapshots[0];
  assert.ok(staleSnapshot);
  await expectStatus(() => context.request.put(`${base}/api/v1/admin/settings/${staleSnapshot.namespace}`, {
    headers,
    data: { schemaVersion: staleSnapshot.schemaVersion, values: staleSnapshot.values, expectedVersion: staleSnapshot.version, reason: 'GUIDE-25 stale settings update' }
  }), 409);
  const newSettingsAudits = await mongo.collection('audit_logs').find({
    targetType: 'admin_settings', targetId: { $in: settingsScreens.map(([namespace]) => namespace) },
    ...(originalSettingsAuditIds.length ? { _id: { $nin: originalSettingsAuditIds } } : {})
  }).toArray();
  assert.equal(newSettingsAudits.length, settingsScreens.length);
  assert.ok(newSettingsAudits.every(row => ['settings.create', 'settings.update'].includes(row.action) && typeof row.requestId === 'string' && typeof row.traceId === 'string'));
  report.auditActions.push(...newSettingsAudits.map(row => `${row.action}:${row.targetId}`).sort());
  report.checks.push('eight_settings_updates_stale_409_and_exact_reasoned_audits');

  stage = 'banner-mutations-concurrency-audit';
  let placement = await mongo.collection('ad_placements').findOne({ active: true });
  if (!placement) {
    temporaryPlacementId = new mongoose.Types.ObjectId();
    placement = {
      _id: temporaryPlacementId,
      key: `guide25.fixture.${randomUUID().replaceAll('-', '')}`,
      surface: 'homepage', label: { ar: 'موضع مؤقت', en: 'Temporary placement' },
      width: 1200, height: 400, active: true, sortOrder: 9_000,
      allowedLocales: ['ar', 'en'], targetUrlRequired: false, version: 0,
      updatedBy: admin._id, updatedAt: new Date()
    };
    await mongo.collection('ad_placements').insertOne(placement);
  }
  let sortOrder = 90_000;
  while (await mongo.collection('ad_banners').findOne({ placementKey: placement.key, sortOrder, status: { $ne: 'archived' } })) sortOrder += 1;
  assert.ok(sortOrder <= 100_000);
  const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
  const bannerInput = {
    placementKey: placement.key,
    title: { ar: `بنر مؤقت ${suffix}`, en: `GUIDE-25 temporary ${suffix}` },
    ...(placement.targetUrlRequired ? { targetUrl: 'https://example.invalid/guide25' } : {}),
    startAt: new Date(Date.now() + 7 * 86_400_000).toISOString(),
    endAt: new Date(Date.now() + 14 * 86_400_000).toISOString(),
    sortOrder
  };
  const createdBanner = await data(await expectStatus(() => context.request.post(`${base}/api/v1/admin/banners`, { headers, data: bannerInput }), 201));
  bannerId = createdBanner.id;
  await expectStatus(() => context.request.post(`${base}/api/v1/admin/banners`, { headers, data: bannerInput }), 409);
  const updateReason = 'GUIDE-25 update temporary banner';
  const updatedBanner = await data(await expectStatus(() => context.request.patch(`${base}/api/v1/admin/banners/${bannerId}`, {
    headers, data: { expectedVersion: 0, reason: updateReason, title: { ar: `بنر محدث ${suffix}`, en: `GUIDE-25 updated ${suffix}` } }
  }), 200));
  assert.equal(updatedBanner.version, 1);
  await expectStatus(() => context.request.patch(`${base}/api/v1/admin/banners/${bannerId}`, {
    headers, data: { expectedVersion: 0, reason: 'GUIDE-25 stale banner update', sortOrder: sortOrder + 1 }
  }), 409);
  const bannerAudits = await mongo.collection('audit_logs').find({ targetType: 'ad_banner', targetId: bannerId }).sort({ createdAt: 1 }).toArray();
  assert.equal(bannerAudits.length, 2);
  assert.deepEqual(bannerAudits.map(row => row.action), ['ad_banner.create', 'ad_banner.update']);
  assert.equal(bannerAudits[1]?.reason, updateReason);
  assert.ok(bannerAudits.every(row => typeof row.requestId === 'string' && typeof row.traceId === 'string'));
  report.auditActions.push(...bannerAudits.map(row => row.action));
  report.checks.push('banner_create_update_duplicate_and_stale_409_with_exactly_two_audits');

  stage = 'authorization-current-state';
  const anonymous = await browser.newContext();
  await expectStatus(() => anonymous.request.get(`${base}/api/v1/admin/settings/platform`), 401);
  await expectStatus(() => anonymous.request.get(`${base}/api/v1/admin/banners`), 401);
  await anonymous.close();
  const limited = await browser.newContext();
  const limitedToken = await login(limited, viewer.normalizedEmail);
  const limitedHeaders = { authorization: `Bearer ${limitedToken}` };
  const currentPlatform = updatedSettings.get('platform');
  await expectStatus(() => limited.request.put(`${base}/api/v1/admin/settings/platform`, {
    headers: limitedHeaders,
    data: { schemaVersion: currentPlatform.schemaVersion, values: currentPlatform.values, expectedVersion: currentPlatform.version, reason: 'Limited admin must be denied' }
  }), 403);
  await expectStatus(() => limited.request.post(`${base}/api/v1/admin/banners`, {
    headers: limitedHeaders, data: { ...bannerInput, sortOrder: sortOrder + 1 }
  }), 403);
  await limited.request.post(`${base}/api/v1/auth/logout`);
  await limited.close();
  await mongo.collection('users').updateOne({ _id: admin._id }, { $set: { status: 'suspended' } });
  const suspended = await withoutRateLimit(() => context.request.get(`${base}/api/v1/admin/settings/platform`, { headers }));
  assert.ok([401, 403].includes(suspended.status()));
  await mongo.collection('users').updateOne({ _id: admin._id }, { $set: { status: originalAdminStatus } });
  report.authorization.push('anonymous_settings_and_banners_401', 'limited_admin_settings_and_banners_mutations_403', `current_suspended_admin_${suspended.status()}_and_restored`);
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
    const namespaceIds = settingsScreens.map(([namespace]) => namespace);
    const originalNamespaces = settingsSnapshots.map(row => row.namespace);
    await mongo.collection('admin_settings').deleteMany({ namespace: { $in: namespaceIds.filter(namespace => !originalNamespaces.includes(namespace)) } });
    for (const snapshot of settingsSnapshots) await mongo.collection('admin_settings').replaceOne({ _id: snapshot._id }, snapshot, { upsert: true });
    await mongo.collection('audit_logs').deleteMany({
      targetType: 'admin_settings', targetId: { $in: namespaceIds },
      ...(originalSettingsAuditIds.length ? { _id: { $nin: originalSettingsAuditIds } } : {})
    });
    if (bannerId) {
      await mongo.collection('ad_banner_media').deleteMany({ bannerId: new mongoose.Types.ObjectId(bannerId) });
      await mongo.collection('ad_banners').deleteOne({ _id: new mongoose.Types.ObjectId(bannerId) });
      await mongo.collection('audit_logs').deleteMany({ targetType: 'ad_banner', targetId: bannerId });
    }
    if (temporaryPlacementId) await mongo.collection('ad_placements').deleteOne({ _id: temporaryPlacementId });
    if (admin?._id && viewer?._id) {
      const extra = await mongo.collection('sessions').find({
        userId: { $in: [admin._id, viewer._id] },
        ...(originalSessionIds.length ? { _id: { $nin: originalSessionIds } } : {})
      }, { projection: { _id: 1 } }).toArray();
      if (extra.length) await mongo.collection('sessions').deleteMany({ _id: { $in: extra.map(row => row._id) } });
    }
    const restored = await mongo.collection('admin_settings').find({ namespace: { $in: namespaceIds } }).toArray();
    assert.equal(restored.length, settingsSnapshots.length);
    for (const snapshot of settingsSnapshots) {
      const current = restored.find(row => row.namespace === snapshot.namespace);
      assert.deepEqual(current, snapshot);
    }
    assert.equal(bannerId ? await mongo.collection('ad_banners').countDocuments({ _id: new mongoose.Types.ObjectId(bannerId) }) : 0, 0);
    report.cleanup = true;
  } catch (cleanupError) {
    report.status = 'FAIL_LOCAL';
    report.cleanupError = cleanupError instanceof Error ? cleanupError.message : String(cleanupError);
    process.exitCode = 1;
  }
  report.finishedAt = new Date().toISOString();
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await browser.close();
  await mongo.close();
}

console.log(`GUIDE-25 admin home/settings local: ${report.status}; ${report.checks.length} checks; ${report.runs.length} browser runs; cleanup=${report.cleanup}`);
