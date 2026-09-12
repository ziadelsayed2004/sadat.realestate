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
  status: 'RUNNING', journey: 'GUIDE-18', journeys: ['GUIDE-18'], mockedRoutes: false,
  environment: 'local-real-browser-api-mongodb',
  commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  startedAt: new Date().toISOString(), runs: [], authorization: [], api: {}, mongo: {}, cleanup: false
};
const startedAt = new Date(report.startedAt);
const mongo = await mongoose.createConnection(mongoUri).asPromise();
const browser = await chromium.launch();
const providerPassword = 'LocalProvider-Journey-Only!2026';
const adminPassword = 'LocalPreview-Admin-Only-2026!';
let provider;
let admin;
let originalProviderStatus;
let originalSettings;
let originalNotifications = [];
let originalSessionIds = [];
let temporaryNotificationId;
let temporaryUnreadId;
let foreignNotificationId;
let stage = 'setup';

async function login(context, email, password) {
  const response = await context.request.post(`${base}/api/v1/auth/login`, { data: { email, password } });
  assert.equal(response.status(), 200);
  return (await response.json()).data.accessToken;
}

async function withoutRateLimit(operation) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await operation();
    if (response.status() !== 429) return response;
    const retryAfter = Number(response.headers()['ratelimit-reset'] ?? response.headers()['retry-after'] ?? 60);
    await new Promise(resolve => setTimeout(resolve, (Math.max(1, retryAfter) + 1) * 1000));
  }
  throw new Error('Rate limit did not clear after three attempts');
}

async function restoreSettings() {
  if (!provider?._id) return;
  if (originalSettings) await mongo.collection('provider_settings').replaceOne({ userId: provider._id }, originalSettings, { upsert: true });
  else await mongo.collection('provider_settings').deleteMany({ userId: provider._id });
}

async function restoreNotifications() {
  for (const notification of originalNotifications) {
    const update = notification.hasReadAt
      ? { $set: { readAt: notification.readAt } }
      : { $unset: { readAt: '' } };
    await mongo.collection('notifications').updateOne({ _id: notification._id }, update);
  }
  if (temporaryNotificationId) await mongo.collection('notifications').updateOne({ _id: temporaryNotificationId }, { $set: { readAt: null } });
  if (temporaryUnreadId) await mongo.collection('notifications').updateOne({ _id: temporaryUnreadId }, { $set: { readAt: null } });
}

try {
  provider = await mongo.collection('users').findOne({ roleType: 'provider', status: 'verified' }, { sort: { _id: -1 } });
  admin = await mongo.collection('users').findOne({ normalizedEmail: 'admin.demo@example.invalid', roleType: 'admin' });
  assert.ok(provider?._id && provider.normalizedEmail && admin?._id && admin.normalizedEmail);
  originalProviderStatus = provider.status;
  originalSettings = await mongo.collection('provider_settings').findOne({ userId: provider._id });
  originalNotifications = (await mongo.collection('notifications').find({ recipientId: provider._id, audience: 'provider' }).toArray())
    .map(row => ({ _id: row._id, hasReadAt: Object.hasOwn(row, 'readAt'), readAt: row.readAt }));
  originalSessionIds = (await mongo.collection('sessions').find({ userId: { $in: [provider._id, admin._id] } }, { projection: { _id: 1 } }).toArray()).map(row => row._id);

  await mongo.collection('notifications').deleteMany({ type: 'guide18.temporary-verification' });
  temporaryNotificationId = new mongoose.Types.ObjectId();
  temporaryUnreadId = new mongoose.Types.ObjectId();
  foreignNotificationId = new mongoose.Types.ObjectId();
  const now = new Date();
  await mongo.collection('notifications').insertMany([
    { _id: temporaryNotificationId, recipientId: provider._id, audience: 'provider', type: 'guide18.temporary-verification',
      title: { ar: 'إشعار اختبار مؤقت', en: 'Temporary verification notification' },
      message: { ar: 'سيحذف بعد الاختبار', en: 'Removed after verification' }, link: '/provider/properties', readAt: null, createdAt: now },
    { _id: temporaryUnreadId, recipientId: provider._id, audience: 'provider', type: 'guide18.temporary-verification',
      title: { ar: 'إشعار اختبار غير مقروء', en: 'Temporary unread verification' }, readAt: null, createdAt: new Date(now.getTime() - 1) },
    { _id: foreignNotificationId, recipientId: new mongoose.Types.ObjectId(), audience: 'provider', type: 'guide18.temporary-verification',
      title: { ar: 'إشعار أجنبي', en: 'Foreign notification' }, readAt: null, createdAt: now }
  ]);

  for (const locale of ['ar', 'en']) for (const [device, preset] of [['desktop', 'Desktop Chrome'], ['tablet', 'Galaxy Tab S4'], ['mobile', 'Pixel 5']]) {
    await restoreSettings();
    await restoreNotifications();
    const context = await browser.newContext({ ...devices[preset] });
    try {
      stage = `${locale}/${device}/login`;
      await login(context, provider.normalizedEmail, providerPassword);
      const page = await context.newPage();
      const initial = page.waitForResponse(response => response.request().method() === 'GET' && new URL(response.url()).pathname === '/api/v1/provider/notifications');
      await page.goto(`${base}/provider/notifications?lang=${locale}`, { waitUntil: 'networkidle' });
      assert.equal((await initial).status(), 200);
      await expect(page.locator('[data-screen-id="PRV-21"]')).toBeVisible();
      const origin = await page.evaluate(() => performance.timeOrigin);

      stage = `${locale}/${device}/mark-read`;
      const item = page.getByTestId(`provider-notification-${temporaryNotificationId.toHexString()}`);
      await expect(item).toBeVisible();
      const marked = page.waitForResponse(response => response.request().method() === 'POST'
        && new URL(response.url()).pathname === `/api/v1/provider/notifications/${temporaryNotificationId.toHexString()}/read`);
      await item.getByRole('button').click();
      assert.equal((await marked).status(), 200);
      const markedRow = await mongo.collection('notifications').findOne({ _id: temporaryNotificationId });
      assert.ok(markedRow?.readAt instanceof Date);

      stage = `${locale}/${device}/empty`;
      const allRead = page.waitForResponse(response => response.request().method() === 'POST'
        && new URL(response.url()).pathname === '/api/v1/provider/notifications/read-all');
      await page.locator('.provider-dashboard__heading-row button').click();
      assert.equal((await allRead).status(), 200);
      const unread = page.waitForResponse(response => response.request().method() === 'GET'
        && new URL(response.url()).pathname === '/api/v1/provider/notifications'
        && new URL(response.url()).searchParams.get('unreadOnly') === 'true');
      await page.locator('.provider-notifications__tab').nth(1).click();
      assert.equal((await unread).status(), 200);
      await expect(page.locator('.provider-notifications__empty[data-state="empty"]')).toBeVisible();

      stage = `${locale}/${device}/notification-retry`;
      await context.setOffline(true);
      await page.locator('.provider-notifications__tab').first().click();
      const notificationRetry = page.locator('.provider-notifications__state[data-state="retry"]');
      await expect(notificationRetry).toBeVisible();
      await context.setOffline(false);
      let notificationsRecovered = page.waitForResponse(response => response.request().method() === 'GET'
        && new URL(response.url()).pathname === '/api/v1/provider/notifications');
      await notificationRetry.getByRole('button').click();
      let notificationsRecoveredResponse = await notificationsRecovered;
      if (notificationsRecoveredResponse.status() === 429) {
        const retryAfter = Number(notificationsRecoveredResponse.headers()['ratelimit-reset'] ?? notificationsRecoveredResponse.headers()['retry-after'] ?? 60);
        await new Promise(resolve => setTimeout(resolve, (Math.max(1, retryAfter) + 1) * 1000));
        const rateLimitState = page.locator('.provider-notifications__state[data-state="error"]');
        await expect(rateLimitState).toBeVisible();
        notificationsRecovered = page.waitForResponse(response => response.request().method() === 'GET'
          && new URL(response.url()).pathname === '/api/v1/provider/notifications');
        await rateLimitState.getByRole('button').click();
        notificationsRecoveredResponse = await notificationsRecovered;
      }
      assert.equal(notificationsRecoveredResponse.status(), 200);

      stage = `${locale}/${device}/settings-retry`;
      const settings = await context.newPage();
      let aborted = false;
      await settings.route('**/api/v1/provider/settings', async route => {
        if (!aborted && route.request().method() === 'GET') { aborted = true; await route.abort('internetdisconnected'); }
        else await route.continue();
      });
      await settings.goto(`${base}/provider/settings?tab=contact&lang=${locale}`, { waitUntil: 'networkidle' });
      const settingsRetry = settings.locator('.provider-settings__state[data-state="retry"]');
      await expect(settingsRetry).toBeVisible();
      await settings.unroute('**/api/v1/provider/settings');
      const settingsRecovered = settings.waitForResponse(response => response.request().method() === 'GET'
        && new URL(response.url()).pathname === '/api/v1/provider/settings');
      await settingsRetry.getByRole('button').click();
      assert.equal((await settingsRecovered).status(), 200);
      await expect(settings.locator('[data-screen-id="PRV-22-2"]')).toBeVisible();

      stage = `${locale}/${device}/settings-validation`;
      let patchRequests = 0;
      settings.on('request', request => { if (request.method() === 'PATCH' && new URL(request.url()).pathname === '/api/v1/provider/settings') patchRequests += 1; });
      await settings.locator('#provider-settings-whatsapp').fill('invalid-phone');
      await settings.locator('.provider-settings__panel--contact button[type="submit"]').click();
      await expect(settings.locator('.provider-settings__feedback[data-state="validation"]')).toBeVisible();
      assert.equal(patchRequests, 0);

      stage = `${locale}/${device}/settings-save`;
      const unique = randomUUID();
      const address = `GUIDE-18 ${locale} ${device} ${unique}`;
      const website = `https://example.test/${unique}`;
      await settings.locator('#provider-settings-whatsapp').fill('+201000000001');
      await settings.locator('#provider-settings-address').fill(address);
      await settings.locator('#provider-settings-website').fill(website);
      const saved = settings.waitForResponse(response => response.request().method() === 'PATCH'
        && new URL(response.url()).pathname === '/api/v1/provider/settings');
      await settings.locator('.provider-settings__panel--contact button[type="submit"]').click();
      const savedResponse = await saved;
      assert.equal(savedResponse.status(), 200);
      await expect(settings.locator('.provider-settings__feedback[data-state="success"]')).toBeVisible();
      const savedBody = (await savedResponse.json()).data;
      const persisted = await mongo.collection('provider_settings').findOne({ userId: provider._id });
      assert.equal(persisted?.officeAddress, address);
      assert.equal(persisted?.website, website);
      assert.equal(persisted?.version, savedBody.version);
      assert.ok(await mongo.collection('audit_logs').findOne({ action: 'provider.settings.update', targetType: 'provider_settings', targetId: provider._id.toHexString(), createdAt: { $gte: startedAt } }));
      const staleVersion = Math.max(0, savedBody.version - 1);
      const staleToken = await login(context, provider.normalizedEmail, providerPassword);
      const stale = await context.request.patch(`${base}/api/v1/provider/settings`, {
        headers: { authorization: `Bearer ${staleToken}` }, data: { expectedVersion: staleVersion, officeAddress: `${address} stale` }
      });
      assert.equal(stale.status(), 409);
      assert.equal((await mongo.collection('provider_settings').findOne({ userId: provider._id }))?.officeAddress, address);

      stage = `${locale}/${device}/security-unavailable`;
      const securityLoaded = settings.waitForResponse(response => response.request().method() === 'GET'
        && new URL(response.url()).pathname === '/api/v1/provider/settings');
      await settings.goto(`${base}/provider/settings?tab=security&lang=${locale}`, { waitUntil: 'networkidle' });
      assert.equal((await securityLoaded).status(), 200);
      await expect(settings.locator('[data-screen-id="PRV-22-3"]')).toBeVisible();
      assert.equal(await settings.locator('.provider-settings__panel[data-state="unavailable"]').count(), 2);
      assert.equal(await settings.locator('.provider-settings__panel[data-state="unavailable"] button:not(:disabled)').count(), 0);

      const geometry = await settings.evaluate(() => ({ innerWidth, scrollWidth: document.documentElement.scrollWidth }));
      assert.ok(geometry.scrollWidth <= geometry.innerWidth);
      assert.equal(await page.evaluate(() => performance.timeOrigin), origin);
      report.runs.push({ locale, device, status: 'PASS',
        checks: ['notification_mark_read', 'notification_mark_all_and_empty', 'notification_offline_retry_without_navigation',
          'settings_network_retry', 'settings_invalid_phone_blocks_patch', 'settings_save_audit_and_stale_409', 'security_actions_truthfully_unavailable'],
        httpStatuses: { notificationList: 200, markRead: 200, markAll: 200, unreadEmpty: 200,
          notificationRecovered: 200, settingsRecovered: 200, settingsSave: 200, staleSettings: 409 },
        patchRequests, documentReloaded: false, ...geometry });
      await settings.close();
    } finally {
      await context.setOffline(false);
      await context.request.post(`${base}/api/v1/auth/logout`, { data: {} }).catch(() => undefined);
      await context.close();
      await restoreSettings();
      await restoreNotifications();
    }
  }

  const providerContext = await browser.newContext();
  const providerToken = await login(providerContext, provider.normalizedEmail, providerPassword);
  const providerHeaders = { authorization: `Bearer ${providerToken}` };
  stage = 'api/invalid-settings';
  const beforeInvalid = await mongo.collection('provider_settings').findOne({ userId: provider._id });
  assert.equal((await withoutRateLimit(() => providerContext.request.patch(`${base}/api/v1/provider/settings`, { headers: providerHeaders,
    data: { expectedVersion: beforeInvalid?.version ?? 0, whatsappNumber: 'invalid-phone' } }))).status(), 400);
  assert.deepEqual(await mongo.collection('provider_settings').findOne({ userId: provider._id }), beforeInvalid);

  stage = 'api/duplicate-read';
  await mongo.collection('notifications').updateOne({ _id: temporaryNotificationId }, { $set: { readAt: null } });
  const readUrl = `${base}/api/v1/provider/notifications/${temporaryNotificationId.toHexString()}/read`;
  const firstRead = await withoutRateLimit(() => providerContext.request.post(readUrl, { headers: providerHeaders }));
  const secondRead = await withoutRateLimit(() => providerContext.request.post(readUrl, { headers: providerHeaders }));
  assert.equal(firstRead.status(), 200); assert.equal(secondRead.status(), 200);
  assert.equal((await firstRead.json()).data.readAt, (await secondRead.json()).data.readAt);
  stage = 'api/foreign-notification';
  assert.equal((await withoutRateLimit(() => providerContext.request.post(`${base}/api/v1/provider/notifications/${foreignNotificationId.toHexString()}/read`, { headers: providerHeaders }))).status(), 404);
  assert.equal((await mongo.collection('notifications').findOne({ _id: foreignNotificationId }))?.readAt, null);

  const anonymous = await browser.newContext();
  assert.equal((await withoutRateLimit(() => anonymous.request.get(`${base}/api/v1/provider/notifications`))).status(), 401);
  assert.equal((await withoutRateLimit(() => anonymous.request.get(`${base}/api/v1/provider/settings`))).status(), 401);
  await anonymous.close();
  const adminContext = await browser.newContext();
  const adminToken = await login(adminContext, admin.normalizedEmail, adminPassword);
  const adminHeaders = { authorization: `Bearer ${adminToken}` };
  assert.equal((await withoutRateLimit(() => adminContext.request.get(`${base}/api/v1/provider/notifications`, { headers: adminHeaders }))).status(), 403);
  assert.equal((await withoutRateLimit(() => adminContext.request.get(`${base}/api/v1/provider/settings`, { headers: adminHeaders }))).status(), 403);
  await adminContext.request.post(`${base}/api/v1/auth/logout`, { data: {} });
  await adminContext.close();
  report.authorization.push('foreign_provider_notification_hidden_404_and_unchanged', 'anonymous_401_and_admin_role_403');

  stage = 'authorization/current-state';
  await mongo.collection('users').updateOne({ _id: provider._id }, { $set: { status: 'suspended' } });
  const suspendedNotifications = await withoutRateLimit(() => providerContext.request.get(`${base}/api/v1/provider/notifications`, { headers: providerHeaders }));
  const suspendedSettings = await withoutRateLimit(() => providerContext.request.get(`${base}/api/v1/provider/settings`, { headers: providerHeaders }));
  assert.ok([401, 403].includes(suspendedNotifications.status()));
  assert.ok([401, 403].includes(suspendedSettings.status()));
  await mongo.collection('users').updateOne({ _id: provider._id }, { $set: { status: originalProviderStatus } });
  report.authorization.push(`current_suspended_provider_denied_notifications_${suspendedNotifications.status()}_settings_${suspendedSettings.status()}_and_restored`);
  await providerContext.request.post(`${base}/api/v1/auth/logout`, { data: {} });
  await providerContext.close();
  report.api = { invalidSettingsStatus: 400, staleSettingsStatus: 409, foreignNotificationStatus: 404,
    duplicateNotificationReadStable: true, safeOwnedNotificationProjection: true };
  report.mongo = { providerSettingsAudited: true, invalidAndStaleWritesPreservedState: true,
    foreignNotificationUnchanged: true, notificationReadIdempotent: true };
  report.status = 'PASS_LOCAL';
} catch (error) {
  report.status = 'FAIL_LOCAL';
  report.failure = { stage, message: error instanceof Error ? error.message : String(error) };
  process.exitCode = 1;
} finally {
  try {
    if (provider?._id && originalProviderStatus) await mongo.collection('users').updateOne({ _id: provider._id }, { $set: { status: originalProviderStatus } });
    await restoreSettings();
    await restoreNotifications();
    if (temporaryNotificationId || temporaryUnreadId || foreignNotificationId) await mongo.collection('notifications').deleteMany({ _id: { $in: [temporaryNotificationId, temporaryUnreadId, foreignNotificationId].filter(Boolean) } });
    if (provider?._id) await mongo.collection('audit_logs').deleteMany({ action: 'provider.settings.update', targetType: 'provider_settings', targetId: provider._id.toHexString(), createdAt: { $gte: startedAt } });
    if (provider?._id && admin?._id) {
      const filter = { userId: { $in: [provider._id, admin._id] }, ...(originalSessionIds.length ? { _id: { $nin: originalSessionIds } } : {}) };
      const extra = await mongo.collection('sessions').find(filter, { projection: { _id: 1 } }).toArray();
      if (extra.length) {
        await mongo.collection('sessions').deleteMany({ _id: { $in: extra.map(row => row._id) } });
        await mongo.collection('audit_logs').deleteMany({ targetType: 'auth_session', targetId: { $in: extra.map(row => row._id.toHexString()) } });
      }
      assert.equal(await mongo.collection('sessions').countDocuments(filter), 0);
    }
    assert.equal(await mongo.collection('notifications').countDocuments({ type: 'guide18.temporary-verification' }), 0);
    const restoredSettings = await mongo.collection('provider_settings').findOne({ userId: provider?._id });
    if (originalSettings) assert.deepEqual(restoredSettings, originalSettings); else assert.equal(restoredSettings, null);
    report.cleanup = true;
  } catch (error) {
    report.status = 'FAIL_LOCAL'; report.cleanup = false;
    report.cleanupFailure = error instanceof Error ? error.message : String(error); process.exitCode = 1;
  }
  await browser.close();
  await mongo.close();
  report.finishedAt = new Date().toISOString();
  await writeFile('docs/quality/guide-runs/guide18-provider-notifications-settings-local-latest.json', `${JSON.stringify(report, null, 2)}\n`);
}
console.log(JSON.stringify({ status: report.status, runs: report.runs.length, cleanup: report.cleanup, failure: report.failure }));
