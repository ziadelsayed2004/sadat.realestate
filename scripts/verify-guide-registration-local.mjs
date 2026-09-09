import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';

// Uses the repository's loopback preview and mail catcher, never external mail.
const base = 'http://127.0.0.1:4173';
const email = `guide04-${Date.now()}@example.invalid`;
const evidence = {
  journey: 'GUIDE-04', environment: 'local', mockedRoutes: false,
  startedAt: new Date().toISOString(), status: 'RUNNING',
  scope: 'Browser registration through real email OTP, API persistence, and authenticated seeker dashboard. Test account remains in isolated local data.',
  guideDeviation: 'The current implemented authority is email OTP; the historical guide says phone OTP.',
  transitions: [], http: []
};
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 402, height: 874 }, isMobile: true });
page.on('response', response => {
  const path = new URL(response.url()).pathname;
  if (path.startsWith('/api/v1/')) evidence.http.push({ method: response.request().method(), path, status: response.status() });
});
try {
  await page.goto(`${base}/auth/register?lang=en`, { waitUntil: 'networkidle' });
  await page.locator('[data-screen-id="AUTH-02"] .auth-role-card').first().click();
  await expect(page.locator('[data-screen-id="AUTH-02"] .auth-role-card').first()).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.locator('#auth-otp-email').fill(email);
  const sent = page.waitForResponse(response => new URL(response.url()).pathname === '/api/v1/auth/otp/send');
  await page.getByRole('button', { name: 'Send code', exact: true }).click();
  assert.equal((await sent).status(), 202);
  evidence.transitions.push('role_selected', 'email_challenge_issued');
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
  await expect(digits).toHaveCount(6);
  for (let index = 0; index < 6; index += 1) await digits.nth(index).fill(code[index]);
  await page.getByRole('button', { name: 'Verify code', exact: true }).click();
  await expect(page.locator('[data-screen-id="AUTH-03"]')).toBeVisible();
  evidence.transitions.push('email_verified');
  await page.getByLabel('First name', { exact: true }).fill('Guide');
  await page.getByLabel('Last name', { exact: true }).fill('Local QA');
  await page.locator('#auth-registration-password').fill('LocalGuide04-Only!2026');
  await page.locator('#auth-registration-password-confirmation').fill('LocalGuide04-Only!2026');
  const registered = page.waitForResponse(response => new URL(response.url()).pathname === '/api/v1/auth/register/seeker');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  const response = await registered;
  assert.equal(response.status(), 201);
  const body = await response.json();
  assert.equal(body.data.session.user.roleType, 'seeker');
  assert.equal(body.data.session.user.status, 'verified');
  const forbidden = await page.request.get(`${base}/api/v1/admin/settings/properties`, {
    headers: { authorization: `Bearer ${body.data.session.accessToken}` }
  });
  assert.equal(forbidden.status(), 403);
  evidence.http.push({ method: 'GET', path: '/api/v1/admin/settings/properties', status: forbidden.status() });
  evidence.transitions.push('seeker_denied_admin_settings');
  await expect(page.locator('[data-screen-id="AUTH-06"]')).toBeVisible();
  evidence.transitions.push('verified_seeker_created', 'success_screen');
  await page.goto(`${base}/seeker?lang=en`);
  await expect(page.locator('[data-screen-id="SEK-01"]')).toBeVisible();
  await expect(page.locator('[data-activity-state="projected"]')).toBeVisible();
  evidence.transitions.push('authenticated_dashboard_after_full_navigation');
  evidence.width = await page.evaluate(() => ({ innerWidth: window.innerWidth, scrollWidth: document.documentElement.scrollWidth }));
  assert.equal(evidence.width.innerWidth, 402);
  assert.ok(evidence.width.scrollWidth <= 402);
  const logout = await page.request.post(`${base}/api/v1/auth/logout`, { data: {} });
  assert.equal(logout.status(), 200);
  const refreshAfterLogout = await page.request.post(`${base}/api/v1/auth/refresh`, { data: {} });
  assert.equal(refreshAfterLogout.status(), 401);
  evidence.http.push(
    { method: 'POST', path: '/api/v1/auth/logout', status: logout.status() },
    { method: 'POST', path: '/api/v1/auth/refresh', status: refreshAfterLogout.status() }
  );
  evidence.transitions.push('logout_revoked_refresh_session');
  evidence.status = 'PASS_LOCAL';
} catch (error) {
  evidence.status = 'FAIL_LOCAL';
  // Do not serialize response bodies, tokens, OTPs, or page state.
  evidence.failure = error instanceof Error ? error.message.slice(0, 700) : 'Unknown failure';
  process.exitCode = 1;
} finally {
  await browser.close();
  evidence.finishedAt = new Date().toISOString();
  await fs.mkdir('docs/quality/guide-runs', { recursive: true });
  await fs.writeFile('docs/quality/guide-runs/guide-04-local-latest.json', `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(JSON.stringify(evidence));
}
