import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import mongoose from 'mongoose';
import { chromium, expect } from '@playwright/test';

const base = 'http://127.0.0.1:4173';
const originalPassword = 'LocalGuide04-Only!2026';
const temporaryPassword = 'LocalGuide10-Only!2026';
const evidence = {
  commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  worktreeChanges: execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim().length > 0,
  journeys: ['GUIDE-09', 'GUIDE-10'],
  environment: 'local-real-browser-api-mongodb',
  mockedRoutes: false,
  startedAt: new Date().toISOString(),
  status: 'RUNNING',
  transitions: [],
  authorization: [],
  http: [],
  browser: []
};

function parseEnvironment(source) {
  const values = {};
  for (const raw of source.split(/\r?\n/u)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    values[key] = value;
  }
  return values;
}

function record(method, path, status) {
  evidence.http.push({ method, path: path.replace(/\/[a-f0-9]{24}(?=\/|$)/gu, '/:id'), status });
}

async function login(context, email, password, expectedStatus = 200) {
  const response = await context.request.post(`${base}/api/v1/auth/login`, { data: { email, password } });
  record('POST', '/api/v1/auth/login', response.status());
  assert.equal(response.status(), expectedStatus);
  return expectedStatus === 200 ? (await response.json()).data : undefined;
}

async function findWorkingPassword(context, email) {
  for (const password of [originalPassword, temporaryPassword]) {
    const response = await context.request.post(`${base}/api/v1/auth/login`, { data: { email, password } });
    record('POST', '/api/v1/auth/login', response.status());
    if (response.status() === 200) return { password, session: (await response.json()).data };
    assert.equal(response.status(), 401);
  }
  throw new Error('No known local GUIDE-04 password authenticates the latest seeker fixture');
}

function watchApi(page) {
  page.on('response', (response) => {
    const path = new URL(response.url()).pathname;
    if (path.startsWith('/api/v1/')) record(response.request().method(), path, response.status());
  });
}

async function recordGeometry(page, screen) {
  const geometry = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    direction: document.documentElement.dir || document.body.dir
  }));
  assert.equal(geometry.innerWidth, 402);
  assert.ok(geometry.scrollWidth <= 402, `${screen} overflows by ${geometry.scrollWidth - 402}px`);
  evidence.browser.push({ screen, ...geometry });
}

let mongo;
const browser = await chromium.launch({ headless: true });
try {
  const env = parseEnvironment(await readFile('.env.local', 'utf8'));
  assert.ok(env.MONGODB_URI, 'MONGODB_URI is missing from .env.local');
  mongo = await mongoose.createConnection(env.MONGODB_URI).asPromise();
  const user = await mongo.collection('users').findOne(
    { roleType: 'seeker', normalizedEmail: /^guide04-/u },
    { sort: { _id: -1 }, projection: { _id: 1, normalizedEmail: 1, status: 1 } }
  );
  assert.ok(user?._id instanceof mongoose.Types.ObjectId);
  assert.equal(user.status, 'verified');
  assert.equal(typeof user.normalizedEmail, 'string');
  const userId = user._id;
  const fixtureTag = `guide-09-10-${Date.now()}`;
  const now = Date.now();
  const notificationIds = [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()];
  const otherNotificationId = new mongoose.Types.ObjectId();
  const otherSeeker = await mongo.collection('users').findOne(
    { roleType: 'seeker', _id: { $ne: userId } },
    { projection: { _id: 1 } }
  );
  assert.ok(otherSeeker?._id instanceof mongoose.Types.ObjectId, 'A second seeker fixture is required for the IDOR check');
  await mongo.collection('notifications').insertMany([
    {
      _id: notificationIds[0], recipientId: userId, type: 'request.updated', audience: 'seeker',
      title: { ar: 'تحديث تجريبي للطلب', en: 'Synthetic request update' },
      message: { ar: 'إشعار محلي لاختبار رحلة التسليم.', en: 'Local notification for the delivery journey.' },
      link: '/seeker/requests', readAt: null, createdAt: new Date(now), fixtureTag
    },
    {
      _id: notificationIds[1], recipientId: userId, type: 'viewing.reminder', audience: 'seeker',
      title: { ar: 'تذكير تجريبي بالمعاينة', en: 'Synthetic viewing reminder' },
      message: { ar: 'تذكير محلي قابل للتعليم كمقروء.', en: 'Local reminder that can be marked as read.' },
      link: '/seeker/viewings', readAt: null, createdAt: new Date(now - 1_000), fixtureTag
    },
    {
      _id: notificationIds[2], recipientId: userId, type: 'profile.updated', audience: 'seeker',
      title: { ar: 'إشعار مقروء تجريبي', en: 'Synthetic read notification' },
      readAt: new Date(now - 2_000), createdAt: new Date(now - 2_000), fixtureTag
    },
    {
      _id: otherNotificationId, recipientId: otherSeeker._id, type: 'account.updated', audience: 'seeker',
      title: { ar: 'إشعار حساب آخر', en: 'Another account notification' },
      readAt: null, createdAt: new Date(now), fixtureTag
    }
  ]);
  evidence.transitions.push('explicit_notification_fixture_inserted');

  const context = await browser.newContext({ viewport: { width: 402, height: 874 }, isMobile: true });
  const authenticated = await findWorkingPassword(context, user.normalizedEmail);
  assert.equal(authenticated.session.user.roleType, 'seeker');
  const currentPassword = authenticated.password;
  const nextPassword = currentPassword === originalPassword ? temporaryPassword : originalPassword;
  const accessToken = authenticated.session.accessToken;
  const page = await context.newPage();
  watchApi(page);

  const anonymous = await fetch(`${base}/api/v1/me`);
  record('GET', '/api/v1/me', anonymous.status);
  assert.equal(anonymous.status, 401);
  const idor = await fetch(`${base}/api/v1/seeker/notifications/${otherNotificationId.toHexString()}/read`, {
    method: 'POST', headers: { authorization: `Bearer ${accessToken}` }
  });
  record('POST', '/api/v1/seeker/notifications/:id/read', idor.status);
  assert.equal(idor.status, 404);
  evidence.authorization.push('anonymous_profile_denied_401', 'cross_account_notification_hidden_as_404');

  await page.goto(`${base}/seeker/notifications?lang=en`, { waitUntil: 'networkidle' });
  await expect(page.locator('[data-screen-id="SEK-07"]')).toBeVisible();
  const timeOrigin = await page.evaluate(() => performance.timeOrigin);
  await recordGeometry(page, 'SEK-07');
  await page.locator('.seeker-notifications__tab').filter({ hasText: 'Unread' }).click();
  await expect(page.getByTestId(`seeker-notification-${notificationIds[0].toHexString()}`)).toBeVisible();
  await expect(page.getByTestId(`seeker-notification-${notificationIds[1].toHexString()}`)).toBeVisible();
  const firstRow = page.getByTestId(`seeker-notification-${notificationIds[0].toHexString()}`);
  const markedOne = page.waitForResponse((response) => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith(`/${notificationIds[0].toHexString()}/read`));
  await firstRow.getByRole('button', { name: 'Mark as read', exact: true }).click();
  assert.equal((await markedOne).status(), 200);
  await expect(firstRow).toHaveCount(0);
  const markedAll = page.waitForResponse((response) => response.request().method() === 'POST' && new URL(response.url()).pathname === '/api/v1/seeker/notifications/read-all');
  await page.getByRole('button', { name: 'Mark all as read', exact: true }).click();
  assert.equal((await markedAll).status(), 200);
  await expect(page.locator('.seeker-dashboard__empty')).toBeVisible();
  assert.equal(await page.evaluate(() => performance.timeOrigin), timeOrigin);
  await page.locator('.seeker-notifications__tab').filter({ hasText: 'All' }).click();
  for (const id of notificationIds) await expect(page.getByTestId(`seeker-notification-${id.toHexString()}`)).toHaveAttribute('data-state', 'read');
  assert.equal(await page.evaluate(() => performance.timeOrigin), timeOrigin);
  evidence.transitions.push('unread_filter_without_reload', 'single_notification_marked_read', 'mark_all_reached_empty_without_reload', 'all_tab_restored_read_items_without_reload');

  await page.goto(`${base}/seeker/profile?tab=preferences&lang=en`, { waitUntil: 'networkidle' });
  await expect(page.locator('[data-screen-id="SEK-08"]')).toBeVisible();
  await recordGeometry(page, 'SEK-08');
  let preferencePatchCount = 0;
  page.on('request', (request) => {
    if (request.method() === 'PATCH' && new URL(request.url()).pathname === '/api/v1/me/preferences') preferencePatchCount += 1;
  });
  await page.locator('#seeker-preferences-min-price').fill('900000');
  await page.locator('#seeker-preferences-max-price').fill('800000');
  await page.locator('form.seeker-profile__form').getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  assert.equal(preferencePatchCount, 0);
  await page.getByRole('group', { name: 'Transaction purpose' }).getByRole('button', { name: 'Buy', exact: true }).click();
  await page.getByRole('group', { name: 'Preferred payment method' }).getByRole('button', { name: 'Cash', exact: true }).click();
  await page.locator('#seeker-preferences-min-price').fill('800000');
  await page.locator('#seeker-preferences-max-price').fill('900000');
  await page.locator('#seeker-preferences-min-area').fill('100');
  await page.locator('#seeker-preferences-max-area').fill('180');
  const preferencesSaved = page.waitForResponse((response) => response.request().method() === 'PATCH' && new URL(response.url()).pathname === '/api/v1/me/preferences');
  await page.locator('form.seeker-profile__form').getByRole('button', { name: 'Save changes', exact: true }).click();
  assert.equal((await preferencesSaved).status(), 200);
  await expect(page.getByRole('status')).toContainText('Search preferences saved.');
  evidence.transitions.push('invalid_preferences_blocked_before_api', 'valid_preferences_persisted_via_browser');

  await page.goto(`${base}/seeker/profile?tab=personal&lang=en`, { waitUntil: 'networkidle' });
  await expect(page.locator('[data-screen-id="SEK-09"]')).toBeVisible();
  await recordGeometry(page, 'SEK-09');
  await page.locator('#seeker-profile-first-name').fill('Delivery');
  await page.locator('#seeker-profile-last-name').fill('Seeker QA');
  const profileSaved = page.waitForResponse((response) => response.request().method() === 'PATCH' && new URL(response.url()).pathname === '/api/v1/me');
  await page.locator('form.seeker-profile__form').getByRole('button', { name: 'Save changes', exact: true }).click();
  assert.equal((await profileSaved).status(), 200);
  await expect(page.getByRole('status')).toContainText('Personal information saved.');
  evidence.transitions.push('personal_profile_persisted_via_browser');

  await page.goto(`${base}/seeker/settings?lang=en`, { waitUntil: 'networkidle' });
  await expect(page.locator('[data-screen-id="SEK-10"]')).toBeVisible();
  await recordGeometry(page, 'SEK-10');
  const localeSaved = page.waitForResponse((response) => response.request().method() === 'PATCH' && new URL(response.url()).pathname === '/api/v1/me');
  await page.locator('#seeker-profile-settings-language').selectOption('ar');
  assert.equal((await localeSaved).status(), 200);
  await expect(page.locator('#seeker-profile-settings-language')).toHaveValue('ar');
  await page.locator('#seeker-profile-current-password').fill(currentPassword);
  await page.locator('#seeker-profile-new-password').fill(nextPassword);
  await page.locator('#seeker-profile-confirm-password').fill(`${nextPassword}x`);
  await page.locator('form[aria-labelledby="seeker-profile-password-title"]').getByRole('button', { name: 'Change password', exact: true }).click();
  await expect(page.locator('form[aria-labelledby="seeker-profile-password-title"] [role="alert"]')).toBeVisible();
  await page.locator('#seeker-profile-confirm-password').fill(nextPassword);
  const passwordChanged = page.waitForResponse((response) => response.request().method() === 'POST' && new URL(response.url()).pathname === '/api/v1/auth/account-access/change');
  await page.locator('form[aria-labelledby="seeker-profile-password-title"]').getByRole('button', { name: 'Change password', exact: true }).click();
  assert.equal((await passwordChanged).status(), 200);
  evidence.transitions.push('account_locale_persisted', 'invalid_password_confirmation_blocked', 'password_changed_and_current_session_signed_out');
  await context.close();

  const passwordContext = await browser.newContext();
  await login(passwordContext, user.normalizedEmail, currentPassword, 401);
  const nextSession = await login(passwordContext, user.normalizedEmail, nextPassword, 200);
  const restored = await passwordContext.request.post(`${base}/api/v1/auth/account-access/change`, {
    headers: { authorization: `Bearer ${nextSession.accessToken}` },
    data: { currentPassword: nextPassword, newPassword: originalPassword }
  });
  record('POST', '/api/v1/auth/account-access/change', restored.status());
  assert.equal(restored.status(), 200);
  await login(passwordContext, user.normalizedEmail, originalPassword, 200);
  evidence.transitions.push('old_password_rejected', 'new_password_authenticated', 'fixture_password_restored');
  await passwordContext.close();

  const [storedUser, storedProfile, storedNotifications, otherNotification] = await Promise.all([
    mongo.collection('users').findOne({ _id: userId }),
    mongo.collection('seeker_profiles').findOne({ userId }),
    mongo.collection('notifications').find({ fixtureTag, recipientId: userId }).toArray(),
    mongo.collection('notifications').findOne({ _id: otherNotificationId })
  ]);
  assert.equal(storedUser?.locale, 'ar');
  assert.equal(storedProfile?.firstName, 'Delivery');
  assert.equal(storedProfile?.lastName, 'Seeker QA');
  assert.deepEqual(storedProfile?.preferences, {
    propertyTypes: [], locations: [], purpose: 'buy', minPrice: 800000, maxPrice: 900000,
    minArea: 100, maxArea: 180, paymentMethod: 'cash'
  });
  assert.equal(storedNotifications.length, 3);
  assert.ok(storedNotifications.every((item) => item.readAt instanceof Date));
  assert.equal(otherNotification?.readAt, null);
  evidence.mongo = {
    collections: ['users', 'seeker_profiles', 'notifications', 'auth_credentials'],
    finalProfile: { locale: storedUser.locale, firstName: storedProfile.firstName, lastName: storedProfile.lastName },
    preferences: storedProfile.preferences,
    fixtureNotificationsRead: storedNotifications.length,
    crossAccountNotificationUnchanged: otherNotification.readAt === null
  };
  evidence.status = 'PASS_LOCAL';
  evidence.remaining = ['Run GUIDE-09 and GUIDE-10 on Production after deployment.'];
} catch (error) {
  evidence.status = 'FAIL_LOCAL';
  evidence.failure = error instanceof Error ? error.message.slice(0, 700) : 'Unknown failure';
  process.exitCode = 1;
} finally {
  if (mongo) await mongo.close();
  await browser.close();
  evidence.finishedAt = new Date().toISOString();
  await mkdir('docs/quality/guide-runs', { recursive: true });
  await writeFile('docs/quality/guide-runs/seeker-account-local-latest.json', `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(`SEEKER_ACCOUNT_LOCAL_${evidence.status}`);
}
