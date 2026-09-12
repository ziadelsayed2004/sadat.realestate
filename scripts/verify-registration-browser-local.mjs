import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import mongoose from 'mongoose';
import { chromium, expect } from '@playwright/test';

function parseEnvironment(source) {
  const result = {};
  for (const raw of source.split(/\r?\n/u)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const index = line.indexOf('=');
    if (index < 1) continue;
    let value = line.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    result[line.slice(0, index).trim()] = value;
  }
  return result;
}

const base = 'http://127.0.0.1:4173';
const email = `guide04-browser-${Date.now()}@example.invalid`;
const report = {
  status: 'RUNNING', journeys: ['GUIDE-04'], environment: 'local-real-browser-api-mongodb', mockedRoutes: false,
  commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), startedAt: new Date().toISOString(),
  locale: 'en', device: 'Pixel 5', checks: [], http: [], cleanup: false
};
const env = parseEnvironment(await readFile('.env.local', 'utf8'));
assert.ok(env.MONGODB_URI);
const mongo = await mongoose.createConnection(env.MONGODB_URI).asPromise();
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 393, height: 851 }, isMobile: true });
let userId;

page.on('response', response => {
  const path = new URL(response.url()).pathname;
  if (path.startsWith('/api/v1/')) report.http.push({ method: response.request().method(), path, status: response.status() });
});

try {
  await page.goto(`${base}/auth/register?lang=en`, { waitUntil: 'networkidle' });
  await page.locator('[data-screen-id="AUTH-02"] .auth-role-card').first().click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.locator('#auth-otp-email').fill(email);
  const sent = page.waitForResponse(response => new URL(response.url()).pathname === '/api/v1/auth/otp/send');
  await page.getByRole('button', { name: 'Send code', exact: true }).click();
  assert.equal((await sent).status(), 202);

  let code;
  await expect.poll(async () => {
    const response = await fetch('http://127.0.0.1:8025/api/messages');
    assert.equal(response.status, 200);
    const body = await response.json();
    const message = body.messages.find(item => item.to.includes(email));
    code = message?.raw.match(/\b(\d{6})\b/u)?.[1];
    return Boolean(code);
  }, { timeout: 15_000 }).toBe(true);
  const digits = page.locator('.auth-otp__digit');
  for (let index = 0; index < 6; index += 1) await digits.nth(index).fill(code[index]);
  await page.getByRole('button', { name: 'Verify code', exact: true }).click();
  await expect(page.locator('[data-screen-id="AUTH-03"]')).toBeVisible();

  await page.getByLabel('First name', { exact: true }).fill('Guide');
  await page.getByLabel('Last name', { exact: true }).fill('Atomic');
  await page.locator('#auth-registration-password').fill('Guide04-Strong!2026');
  await page.locator('#auth-registration-password-confirmation').fill('Guide04-Strong!2026');
  const registered = page.waitForResponse(response => new URL(response.url()).pathname === '/api/v1/auth/register/seeker');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  const registrationResponse = await registered;
  assert.equal(registrationResponse.status(), 201);
  const body = await registrationResponse.json();
  userId = body.data.session.user.id;
  assert.equal(body.data.session.user.roleType, 'seeker');
  assert.equal(body.data.session.user.status, 'verified');
  await expect(page.locator('[data-screen-id="AUTH-06"]')).toBeVisible();
  report.checks.push('email_otp_and_browser_registration_success');

  await page.goto(`${base}/seeker?lang=en`, { waitUntil: 'networkidle' });
  await expect(page.locator('[data-screen-id="SEK-01"]')).toBeVisible();
  const width = await page.evaluate(() => ({ innerWidth: window.innerWidth, scrollWidth: document.documentElement.scrollWidth }));
  assert.equal(width.innerWidth, 393);
  assert.ok(width.scrollWidth <= width.innerWidth);
  report.width = width;
  report.checks.push('authenticated_dashboard_and_pixel5_no_overflow');

  const currentSession = await page.request.post(`${base}/api/v1/auth/refresh`, { data: {} });
  assert.equal(currentSession.status(), 200);
  const currentAccessToken = (await currentSession.json()).data.accessToken;
  const forbidden = await page.request.get(`${base}/api/v1/admin/settings/properties`, {
    headers: { authorization: `Bearer ${currentAccessToken}` }
  });
  assert.equal(forbidden.status(), 403);
  report.authorizationStatus = forbidden.status();
  report.checks.push('seeker_role_denied_admin_api');

  const logout = await page.request.post(`${base}/api/v1/auth/logout`, { data: {} });
  assert.equal(logout.status(), 200);
  const refreshAfterLogout = await page.request.post(`${base}/api/v1/auth/refresh`, { data: {} });
  assert.equal(refreshAfterLogout.status(), 401);
  report.logoutStatuses = { logout: logout.status(), refreshAfterLogout: refreshAfterLogout.status() };
  report.checks.push('logout_invalidates_refresh_session');
  report.status = 'PASS_LOCAL';
} catch (error) {
  report.status = 'FAIL_LOCAL';
  report.failure = error instanceof Error ? error.message.slice(0, 800) : String(error).slice(0, 800);
  process.exitCode = 1;
} finally {
  try {
    const user = await mongo.collection('users').findOne({ normalizedEmail: email }, { projection: { _id: 1 } });
    const id = user?._id ?? (userId && mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : undefined);
    if (id) {
      await mongo.collection('sessions').deleteMany({ userId: id });
      await mongo.collection('admin_credentials').deleteMany({ userId: id });
      await mongo.collection('seeker_profiles').deleteMany({ userId: id });
      await mongo.collection('users').deleteMany({ _id: id });
    }
    await mongo.collection('otp_challenges').deleteMany({ normalizedEmail: email });
    const residue = await Promise.all([
      mongo.collection('users').countDocuments({ normalizedEmail: email }),
      mongo.collection('otp_challenges').countDocuments({ normalizedEmail: email }),
      id ? mongo.collection('sessions').countDocuments({ userId: id }) : 0,
      id ? mongo.collection('admin_credentials').countDocuments({ userId: id }) : 0,
      id ? mongo.collection('seeker_profiles').countDocuments({ userId: id }) : 0
    ]);
    report.residue = { user: residue[0], otp: residue[1], session: residue[2], credential: residue[3], profile: residue[4] };
    report.cleanup = residue.every(value => value === 0);
    assert.equal(report.cleanup, true);
  } catch (error) {
    report.status = 'FAIL_LOCAL';
    report.cleanupFailure = error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500);
    process.exitCode = 1;
  }
  await browser.close();
  await mongo.close();
  report.finishedAt = new Date().toISOString();
  await mkdir('docs/quality/guide-runs', { recursive: true });
  await writeFile('docs/quality/guide-runs/registration-browser-local-latest.json', `${JSON.stringify(report, null, 2)}\n`);
  console.log(`REGISTRATION_BROWSER_${report.status} checks=${report.checks.length} cleanup=${report.cleanup}`);
}
