import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import mongoose from 'mongoose';
import { chromium, expect } from '@playwright/test';
import { createArgon2PasswordHasher } from '../apps/api/src/modules/auth/crypto.ts';
import { readEnvironmentFile } from './environment-file.mjs';

const env = await readEnvironmentFile('.env.local'), uri = new URL(env.MONGODB_URI);
assert(['localhost', '127.0.0.1'].includes(uri.hostname) && uri.port === '27018', 'Native local database only');
const db = await mongoose.createConnection(uri.href).asPromise(), base = 'http://127.0.0.1:4173';
const oid = () => new mongoose.Types.ObjectId(), seekerId = oid(), providerId = oid(), appId = oid(), profileId = oid();
const stamp = new Date(), suffix = Date.now(), password = 'Local-Reactivate!2026';
const fixtures = [seekerId, providerId], contexts = [], browserErrors = [];
const report = { status: 'RUNNING', mockedRoutes: false, checks: [], browserErrors, cleanup: false };
let browser, page, stage = 'setup';
await mkdir('.tmp/account-reactivation', { recursive: true });
async function login(context, email) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await context.request.post(base + '/api/v1/auth/login', { data: { email, password: email === 'admin.demo@example.invalid' ? 'LocalPreview-Admin-Only-2026!' : password } });
    if (response.status() === 429) { await new Promise(resolve => setTimeout(resolve, 60_000)); continue; }
    assert.equal(response.status(), 200, await response.text()); return (await response.json()).data.accessToken;
  }
  throw new Error('Login rate window did not clear');
}
async function ready() {
  await expect(page.locator('[data-auth-resolution=pending]')).toHaveCount(0);
  await expect(page.locator('#site-intro')).toBeHidden();
}
try {
  const hash = await createArgon2PasswordHasher().hash(password);
  for (const [id, roleType] of [[seekerId, 'seeker'], [providerId, 'provider']]) {
    await db.collection('users').insertOne({ _id: id, roleType, status: 'verified', normalizedEmail: `${roleType}-reactivate-${suffix}@example.invalid`, normalizedPhone: roleType === 'seeker' ? '+201012345671' : '+201012345672', locale: 'ar', version: 0, statusChangedAt: stamp, createdAt: stamp, updatedAt: stamp });
    await db.collection('admin_credentials').insertOne({ userId: id, passwordHash: hash, passwordChangedAt: stamp, version: 0, createdAt: stamp, updatedAt: stamp });
    await db.collection('requests').insertOne({ _id: oid(), creatorId: id, type: 'contact', status: 'new', payload: { message: 'Existing customer history retained through suspension' }, version: 0, createdAt: stamp, updatedAt: stamp });
  }
  await db.collection('seeker_profiles').insertOne({ userId: seekerId, firstName: 'Local', lastName: 'Reactivation', version: 0, createdAt: stamp, updatedAt: stamp });
  await db.collection('provider_profiles').insertOne({ _id: profileId, userId: providerId, providerType: 'brokerage_office', status: 'approved', version: 0, createdAt: stamp, updatedAt: stamp });
  await db.collection('provider_applications').insertOne({ _id: appId, userId: providerId, providerType: 'brokerage_office', status: 'approved', requirementVersion: '2026-10-15.office.1', displayName: 'Local office reactivation', brandName: 'Local office reactivation', version: 0, statusChangedAt: stamp, createdAt: stamp, updatedAt: stamp });
  browser = await chromium.launch();
  const adminContext = await browser.newContext(); contexts.push(adminContext); await login(adminContext, 'admin.demo@example.invalid');
  page = await adminContext.newPage(); page.on('pageerror', error => browserErrors.push(String(error)));
  for (const [id, roleType] of [[seekerId, 'seeker'], [providerId, 'provider']]) {
    const context = await browser.newContext(); contexts.push(context);
    const email = `${roleType}-reactivate-${suffix}@example.invalid`; let token = await login(context, email);
    for (const [locale, width] of [['ar', 390], ['en', 1440]]) {
      stage = `${roleType} ${locale} disable and reactivate`;
      const window = await fetch(base + '/api/v1/public/bootstrap');
      if (window.status === 429 || Number(window.headers.get('ratelimit-remaining')) < 35) await new Promise(resolve => setTimeout(resolve, 60_000));
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(`${base}/admin/users/${id}?lang=${locale}`); await ready();
      const section = page.locator('section.admin-accounts__detail-card').filter({ has: page.getByRole('heading', { name: locale === 'ar' ? 'إجراءات الحساب' : 'Account actions', exact: true }) });
      await section.locator('details > summary').click();
      const reason = section.getByRole('textbox'), confirmation = section.getByRole('checkbox');
      await reason.fill('Local suspension verification'); await confirmation.check();
      const path = roleType === 'provider' ? `/admin/providers/${appId}/review` : `/admin/users/${id}/transitions`;
      const disabled = page.waitForResponse(r => r.url().endsWith(path) && r.request().method() === 'POST');
      await section.getByRole('button', { name: locale === 'ar' ? 'تعطيل الحساب' : 'Disable account', exact: true }).click();
      assert.equal((await disabled).status(), 200);
      const reactivate = section.getByRole('button', { name: locale === 'ar' ? 'إعادة تفعيل الحساب' : 'Reactivate account', exact: true });
      await expect(reactivate).toBeVisible(); await expect(reactivate).toBeDisabled();
      assert.equal((await db.collection('users').findOne({ _id: id })).status, 'suspended');
      assert.equal((await context.request.get(base + '/api/v1/public/bootstrap', { headers: { authorization: `Bearer ${token}` } })).status(), 401);
      const rejectedLogin = await context.request.post(base + '/api/v1/auth/login', { data: { email, password } });
      assert.equal((await rejectedLogin.json()).error.code, 'ACCOUNT_NOT_ACTIVE');
      await reason.fill('Reviewed suspension and restored access'); await expect(reactivate).toBeDisabled();
      await confirmation.check();
      await page.screenshot({ path: `.tmp/account-reactivation/${roleType}-${locale}-${width}.png`, fullPage: true });
      const restored = page.waitForResponse(r => r.url().endsWith(path) && r.request().method() === 'POST');
      await reactivate.click(); assert.equal((await restored).status(), 200);
      await expect(section.locator('[role=status]').filter({ hasText: locale === 'ar' ? 'تمت إعادة تفعيل الحساب' : 'Account reactivated' })).toBeVisible();
      await expect(section.getByRole('button', { name: locale === 'ar' ? 'تعطيل الحساب' : 'Disable account', exact: true, includeHidden: true })).toBeAttached();
      const account = await db.collection('users').findOne({ _id: id }); assert.equal(account.status, 'verified'); assert.equal(account.deletedAt, undefined);
      if (roleType === 'provider') {
        assert.equal((await db.collection('provider_applications').findOne({ _id: appId })).status, 'approved');
        assert.equal((await db.collection('provider_profiles').findOne({ userId: id })).status, 'approved');
      }
      assert.equal(await db.collection('requests').countDocuments({ creatorId: id }), 1);
      assert.equal((await context.request.get(base + '/api/v1/public/bootstrap', { headers: { authorization: `Bearer ${token}` } })).status(), 401, 'Reactivation must not revive old sessions');
      token = await login(context, email);
      assert.equal((await context.request.get(base + '/api/v1/public/bootstrap', { headers: { authorization: `Bearer ${token}` } })).status(), 200);
      const history = await db.collection('account_state_transitions').find({ targetUserId: id }).toArray();
      assert(history.some(entry => entry.action === 'verify' && entry.fromAccountStatus === 'suspended' && entry.toAccountStatus === 'verified' && entry.reason === 'Reviewed suspension and restored access'));
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      report.checks.push(`${roleType} ${locale} ${width}px: user-page suspension/reactivation, login blocked/restored, old sessions stay revoked, history retained, audited coherent state`);
    }
  }
  assert.deepEqual(browserErrors, []); report.status = 'PASS_LOCAL';
} catch (error) {
  report.status = 'FAIL_LOCAL'; report.error = `${stage}: ${error.stack ?? error}`; process.exitCode = 1;
  await page?.screenshot({ path: '.tmp/account-reactivation/failure.png', fullPage: true }).catch(() => {});
} finally {
  for (const context of contexts) { await context.request.post(base + '/api/v1/auth/logout').catch(() => {}); await context.close(); }
  await browser?.close();
  for (const name of ['users', 'seeker_profiles', 'provider_profiles', 'provider_applications', 'admin_credentials', 'sessions', 'requests', 'notifications', 'account_state_transitions', 'audit_logs']) await db.collection(name).deleteMany({ $or: [{ _id: { $in: [...fixtures, appId, profileId] } }, { userId: { $in: fixtures } }, { creatorId: { $in: fixtures } }, { recipientId: { $in: fixtures } }, { targetUserId: { $in: fixtures } }, { targetId: { $in: [...fixtures, appId].map(String) } }] });
  await db.close(); report.cleanup = true; await writeFile('docs/quality/guide-runs/account-reactivation-local-latest.json', JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify(report, null, 2));
