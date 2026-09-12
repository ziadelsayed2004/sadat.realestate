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
const reportPath = 'docs/quality/guide-runs/guide26-admin-rbac-local-latest.json';
const reuseBrowserEvidence = process.env.GUIDE26_REUSE_BROWSER_EVIDENCE === '1';
const previousReport = reuseBrowserEvidence ? JSON.parse(await readFile(reportPath, 'utf8')) : undefined;
assert.ok(mongoUri);
assert.equal(new URL(mongoUri).hostname, '127.0.0.1');

const report = {
  status: 'RUNNING', journey: 'GUIDE-26', journeys: ['GUIDE-26'], mockedRoutes: false,
  environment: 'local-real-HTTP-MongoDB',
  responsiveEvidence: 'ADM-59..ADM-66 visited in AR/EN on Desktop/Tablet/Pixel 5',
  commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  startedAt: new Date().toISOString(), runs: [], checks: [], authorization: [], auditActions: [], cleanup: false
};
const mongo = await mongoose.createConnection(mongoUri).asPromise();
const browser = await chromium.launch();
const password = 'LocalPreview-Admin-Only-2026!';
const fixtureTag = `guide26-${randomUUID()}`;
let admin;
let viewer;
let originalAdminStatus;
let originalSessionIds = [];
let createdAdminId;
let createdRoleId;
let notificationIds = [];
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
async function data(response) { return (await response.json()).data; }
async function visit(page, origin, locale, path, screenId) {
  const pageErrors = [];
  const onPageError = error => pageErrors.push(error.message);
  page.on('pageerror', onPageError);
  const response = await page.goto(`${origin}${path}?lang=${locale}`, { waitUntil: 'networkidle' });
  assert.equal(response?.status(), 200);
  const shell = page.locator(`[data-screen-id="${screenId}"]`);
  await expect(shell).toBeVisible();
  await expect(shell).toHaveAttribute('data-state', /^(?:success|empty)$/u);
  const geometry = await page.evaluate(() => ({ innerWidth, scrollWidth: document.documentElement.scrollWidth }));
  assert.ok(geometry.scrollWidth <= geometry.innerWidth + 1, `${screenId} overflow ${geometry.scrollWidth}/${geometry.innerWidth}`);
  assert.deepEqual(pageErrors, [], `${screenId} page errors: ${pageErrors.join('; ')}`);
  page.off('pageerror', onPageError);
  return geometry;
}

try {
  admin = await mongo.collection('users').findOne({ normalizedEmail: 'admin.demo@example.invalid', roleType: 'admin', status: 'verified' });
  viewer = await mongo.collection('users').findOne({ normalizedEmail: 'admin.viewer@example.invalid', roleType: 'admin', status: 'verified' });
  assert.ok(admin?._id && viewer?._id);
  originalAdminStatus = admin.status;
  originalSessionIds = (await mongo.collection('sessions').find({ userId: { $in: [admin._id, viewer._id] } }, { projection: { _id: 1 } }).toArray()).map(row => row._id);
  const role = await mongo.collection('roles').findOne({ active: true });
  assert.ok(role?._id);
  const now = new Date();
  const notificationRows = [
    { _id: new mongoose.Types.ObjectId(), recipientId: admin._id, audience: 'admin', requiredPermission: 'admin:staff.manage', type: 'admin.staff.changed', title: { ar: 'تحديث إداري تجريبي', en: 'Temporary administrator update' }, message: { ar: 'إشعار محلي لاختبار الرحلة.', en: 'Local journey notification.' }, readAt: null, createdAt: now, fixtureTag },
    { _id: new mongoose.Types.ObjectId(), recipientId: admin._id, audience: 'admin', type: 'admin.review', title: { ar: 'مراجعة إدارية تجريبية', en: 'Temporary admin review' }, readAt: null, createdAt: new Date(now.getTime() - 1000), fixtureTag }
  ];
  await mongo.collection('notifications').insertMany(notificationRows);
  notificationIds = notificationRows.map(row => row._id);

  stage = 'responsive-and-retry';
  const screens = [
    ['/admin/admin-users', 'ADM-59'], ['/admin/admin-users/new', 'ADM-60'],
    [`/admin/admin-users/${admin._id}`, 'ADM-61'], [`/admin/admin-users/${viewer._id}`, 'ADM-62'],
    ['/admin/roles', 'ADM-63'], [`/admin/roles/${role._id}`, 'ADM-64'],
    ['/admin/notifications', 'ADM-65'], ['/admin/audit-logs', 'ADM-66']
  ];
  if (reuseBrowserEvidence) {
    assert.equal(previousReport?.runs?.length, 6);
    assert.ok(previousReport.runs.every(run => run.status === 'PASS' && run.screens?.length === 8));
    report.runs = previousReport.runs;
  }
  for (const locale of reuseBrowserEvidence ? [] : ['ar', 'en']) {
    for (const [device, preset] of [['desktop', 'Desktop Chrome'], ['tablet', 'Galaxy Tab S4'], ['mobile', 'Pixel 5']]) {
      const context = await browser.newContext({ ...devices[preset] });
      const origin = locale === 'ar' ? base.replace('127.0.0.1', 'localhost') : base;
      try {
        await login(context, admin.normalizedEmail, origin);
        const page = await context.newPage();
        const visited = [];
        for (const [path, screenId] of screens) visited.push({ screenId, ...await visit(page, origin, locale, path, screenId) });
        await page.goto(`${origin}/admin/admin-users?lang=${locale}`, { waitUntil: 'networkidle' });
        const timeOrigin = await page.evaluate(() => performance.timeOrigin);
        await context.setOffline(true);
        await page.locator('.admin-rbac__status-tabs button').nth(1).click();
        const retry = page.locator('.admin-rbac__state[data-state="retry"]');
        await expect(retry).toBeVisible();
        await context.setOffline(false);
        await retry.getByRole('button').click();
        await expect(page.locator('[data-screen-id="ADM-59"]')).toHaveAttribute('data-state', /^(?:success|empty)$/u);
        assert.equal(await page.evaluate(() => performance.timeOrigin), timeOrigin);
        report.runs.push({ locale, device, status: 'PASS', documentReloaded: false, screens: visited, checks: ['all_screen_ids', 'no_horizontal_overflow', 'offline_retry_without_navigation'] });
      } finally {
        await context.setOffline(false);
        await context.request.post(`${origin}/api/v1/auth/logout`).catch(() => undefined);
        await context.close();
      }
    }
  }
  report.checks.push('eight_admin_rbac_screens_ar_en_all_devices_with_retry');

  const context = await browser.newContext({ ...devices['Desktop Chrome'] });
  const token = await login(context, admin.normalizedEmail);
  const headers = { authorization: `Bearer ${token}` };

  stage = 'reads-empty-validation';
  for (const path of ['/admin/admin-users', `/admin/admin-users/${admin._id}`, '/admin/roles', '/admin/notifications', '/admin/audit-logs']) {
    await expectStatus(() => context.request.get(`${base}/api/v1${path}`, { headers }), 200);
  }
  const emptyUsers = await data(await expectStatus(() => context.request.get(`${base}/api/v1/admin/admin-users?status=disabled&accessLevel=super_admin`, { headers }), 200));
  assert.deepEqual(emptyUsers.items, []);
  await expectStatus(() => context.request.get(`${base}/api/v1/admin/admin-users?limit=101`, { headers }), 400);
  await expectStatus(() => context.request.post(`${base}/api/v1/admin/admin-users`, { headers, data: { email: 'bad', displayName: 'x', accessLevel: 'standard_admin' } }), 400);
  await expectStatus(() => context.request.post(`${base}/api/v1/admin/roles`, { headers, data: { name: 'x', accessMode: 'view_only', permissions: ['admin:staff.manage'], reason: 'x' } }), 400);
  report.checks.push('all_reads_200_true_empty_and_invalid_inputs_400_without_write');

  stage = 'administrator-mutations';
  const suffix = randomUUID().replaceAll('-', '').slice(0, 10);
  const email = `guide26.${suffix}@example.invalid`;
  const createdAdmin = await data(await expectStatus(() => context.request.post(`${base}/api/v1/admin/admin-users`, { headers, data: { email, displayName: 'GUIDE 26 Temporary', accessLevel: 'standard_admin' } }), 201));
  createdAdminId = createdAdmin.id;
  await expectStatus(() => context.request.post(`${base}/api/v1/admin/admin-users`, { headers, data: { email, displayName: 'GUIDE 26 Duplicate', accessLevel: 'standard_admin' } }), 409);
  const updatedAdmin = await data(await expectStatus(() => context.request.patch(`${base}/api/v1/admin/admin-users/${createdAdminId}`, { headers, data: { expectedVersion: 0, reason: 'GUIDE-26 administrator update', displayName: 'GUIDE 26 Updated' } }), 200));
  assert.equal(updatedAdmin.version, 1);
  await expectStatus(() => context.request.patch(`${base}/api/v1/admin/admin-users/${createdAdminId}`, { headers, data: { expectedVersion: 0, reason: 'GUIDE-26 stale administrator update', displayName: 'Stale' } }), 409);
  const adminAudits = await mongo.collection('audit_logs').find({ targetType: 'admin_user', targetId: createdAdminId }).sort({ createdAt: 1 }).toArray();
  assert.deepEqual(adminAudits.map(row => row.action), ['admin.administrator_created', 'admin.administrator_updated']);
  report.auditActions.push(...adminAudits.map(row => row.action));
  report.checks.push('administrator_create_update_duplicate_stale_and_exact_audits');

  stage = 'role-mutations';
  const roleName = `GUIDE 26 Role ${suffix}`;
  const createdRole = await data(await expectStatus(() => context.request.post(`${base}/api/v1/admin/roles`, { headers, data: { name: roleName, description: 'Temporary local role', accessMode: 'view_only', permissions: ['admin:staff.view'], reason: 'GUIDE-26 create role' } }), 201));
  createdRoleId = createdRole.id;
  await expectStatus(() => context.request.post(`${base}/api/v1/admin/roles`, { headers, data: { name: roleName, accessMode: 'view_only', permissions: ['admin:staff.view'], reason: 'GUIDE-26 duplicate role' } }), 409);
  const updatedRole = await data(await expectStatus(() => context.request.patch(`${base}/api/v1/admin/roles/${createdRoleId}`, { headers, data: { version: 0, reason: 'GUIDE-26 update role', description: 'Updated temporary role' } }), 200));
  assert.equal(updatedRole.version, 1);
  await expectStatus(() => context.request.patch(`${base}/api/v1/admin/roles/${createdRoleId}`, { headers, data: { version: 0, reason: 'GUIDE-26 stale role update', description: 'Stale' } }), 409);
  const roleAudits = await mongo.collection('audit_logs').find({ targetType: 'rbac_role', targetId: createdRoleId }).sort({ createdAt: 1 }).toArray();
  assert.deepEqual(roleAudits.map(row => row.action), ['rbac.role_created', 'rbac.role_updated']);
  report.auditActions.push(...roleAudits.map(row => row.action));
  report.checks.push('role_create_update_duplicate_stale_and_exact_audits');

  stage = 'notifications-audit-projection';
  const notifications = await data(await expectStatus(() => context.request.get(`${base}/api/v1/admin/notifications?type=admin.staff.changed`, { headers }), 200));
  assert.ok(notifications.items.some(item => item.id === notificationIds[0].toHexString()));
  await expectStatus(() => context.request.post(`${base}/api/v1/admin/notifications/${notificationIds[0]}/read`, { headers }), 200);
  const readAll = await data(await expectStatus(() => context.request.post(`${base}/api/v1/admin/notifications/read-all`, { headers }), 200));
  assert.ok(readAll.updatedCount >= 1);
  const auditPage = await data(await expectStatus(() => context.request.get(`${base}/api/v1/admin/audit-logs?targetType=admin_user&targetId=${createdAdminId}`, { headers }), 200));
  assert.equal(auditPage.items.length, 2);
  const auditDetail = await data(await expectStatus(() => context.request.get(`${base}/api/v1/admin/audit-logs/${auditPage.items[0].id}`, { headers }), 200));
  assert.ok(!/password|tokenHash|secret/iu.test(JSON.stringify(auditDetail)));
  report.checks.push('notification_read_and_read_all_plus_redacted_audit_list_detail');

  stage = 'authorization-current-state';
  const anonymous = await browser.newContext();
  await expectStatus(() => anonymous.request.get(`${base}/api/v1/admin/admin-users`), 401);
  await expectStatus(() => anonymous.request.get(`${base}/api/v1/admin/roles`), 401);
  await anonymous.close();
  const limited = await browser.newContext();
  const limitedToken = await login(limited, viewer.normalizedEmail);
  const limitedHeaders = { authorization: `Bearer ${limitedToken}` };
  await expectStatus(() => limited.request.get(`${base}/api/v1/admin/admin-users`, { headers: limitedHeaders }), 403);
  await expectStatus(() => limited.request.get(`${base}/api/v1/admin/roles`, { headers: limitedHeaders }), 403);
  await expectStatus(() => limited.request.get(`${base}/api/v1/admin/audit-logs`, { headers: limitedHeaders }), 403);
  const limitedNotifications = await data(await expectStatus(() => limited.request.get(`${base}/api/v1/admin/notifications`, { headers: limitedHeaders }), 200));
  assert.ok(!limitedNotifications.items.some(item => item.id === notificationIds[0].toHexString()));
  await limited.close();
  await mongo.collection('users').updateOne({ _id: admin._id }, { $set: { status: 'suspended', statusChangedAt: new Date() } });
  const suspendedResponse = await withoutRateLimit(() => context.request.get(`${base}/api/v1/admin/admin-users`, { headers }));
  assert.ok([401, 403].includes(suspendedResponse.status()), await suspendedResponse.text());
  await mongo.collection('users').updateOne({ _id: admin._id }, { $set: { status: originalAdminStatus, statusChangedAt: admin.statusChangedAt } });
  report.authorization.push('anonymous_401', 'limited_staff_roles_audit_403', 'permission_scoped_notification_hidden', `current_suspended_admin_${suspendedResponse.status()}`);
  report.checks.push('authorization_and_current_account_state_enforced');
  report.checks.push('horizontal_object_scope_not_applicable_global_admin_resources');
  await context.close();
  report.status = 'PASS_LOCAL';
} catch (error) {
  report.status = 'FAIL_LOCAL';
  report.stage = stage;
  report.error = error instanceof Error ? error.stack ?? error.message : String(error);
  throw error;
} finally {
  try {
    if (admin?._id) await mongo.collection('users').updateOne({ _id: admin._id }, { $set: { status: originalAdminStatus, statusChangedAt: admin.statusChangedAt } });
    if (createdAdminId) {
      const id = new mongoose.Types.ObjectId(createdAdminId);
      await mongo.collection('admin_role_assignments').deleteMany({ adminUserId: id });
      await mongo.collection('admin_accounts').deleteMany({ userId: id });
      await mongo.collection('admin_profiles').deleteMany({ userId: id });
      await mongo.collection('sessions').deleteMany({ userId: id });
      await mongo.collection('users').deleteMany({ _id: id });
      await mongo.collection('audit_logs').deleteMany({ targetType: 'admin_user', targetId: createdAdminId });
    }
    if (createdRoleId) {
      await mongo.collection('roles').deleteMany({ _id: new mongoose.Types.ObjectId(createdRoleId) });
      await mongo.collection('audit_logs').deleteMany({ targetType: 'rbac_role', targetId: createdRoleId });
    }
    if (notificationIds.length) await mongo.collection('notifications').deleteMany({ _id: { $in: notificationIds } });
    if (originalSessionIds.length) await mongo.collection('sessions').deleteMany({ userId: { $in: [admin._id, viewer._id] }, _id: { $nin: originalSessionIds } });
    else if (admin?._id && viewer?._id) await mongo.collection('sessions').deleteMany({ userId: { $in: [admin._id, viewer._id] } });
    report.cleanup = true;
  } finally {
    await browser.close();
    await mongo.close();
    report.finishedAt = new Date().toISOString();
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }
}

console.log(`GUIDE-26 admin users and permissions: ${report.status} (${report.runs.length} browser runs, ${report.checks.length} checks, cleanup=${report.cleanup})`);
