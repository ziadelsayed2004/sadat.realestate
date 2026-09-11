import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import mongoose from 'mongoose';
import { chromium, devices, expect } from '@playwright/test';
import { readEnvironmentFile } from './environment-file.mjs';

const localEnvironment = await readEnvironmentFile('.env.local');
const mongoUri = process.env.MONGODB_URI ?? localEnvironment.MONGODB_URI;
const base = process.env.LOCAL_GUIDE_BASE_URL ?? `http://127.0.0.1:${localEnvironment.WEB_PORT ?? '4173'}`;
assert.ok(mongoUri, 'Local MongoDB configuration required');
assert.equal(new URL(mongoUri).hostname, '127.0.0.1', 'Local MongoDB required');

const report = {
  status: 'RUNNING',
  journeys: ['GUIDE-04'],
  environment: 'local-real-browser-api-mongodb',
  mockedRoutes: false,
  commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  runs: [],
  startedAt: new Date().toISOString(),
  otpChallengesRemoved: false,
};
const emails = new Set();
const mongo = await mongoose.createConnection(mongoUri).asPromise();
const browser = await chromium.launch();
let stage = 'setup';

async function readOtp(email) {
  let code;
  await expect.poll(async () => {
    const response = await fetch('http://127.0.0.1:8025/api/messages');
    assert.equal(response.status, 200);
    const body = await response.json();
    const message = body.messages.find(item => item.to.includes(email));
    code = message?.raw.match(/\b(\d{6})\b/u)?.[1];
    return Boolean(code);
  }, { timeout: 15_000 }).toBe(true);
  assert.match(code ?? '', /^\d{6}$/u);
  return code;
}

try {
  assert.equal((await fetch(`${base}/health`)).status, 200);
  for (const locale of ['ar', 'en']) {
    for (const [device, preset] of [['desktop', 'Desktop Chrome'], ['tablet', 'Galaxy Tab S4'], ['mobile', 'Pixel 5']]) {
      stage = `${locale}/${device}`;
      const email = `guide04-recovery-${locale}-${device}-${Date.now()}@example.invalid`;
      emails.add(email);
      const context = await browser.newContext({ ...devices[preset] });
      try {
        const page = await context.newPage();
        let registrationMutations = 0;
        page.on('request', request => {
          if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/v1/auth/register/seeker') registrationMutations += 1;
        });

        await page.goto(`${base}/auth/register?lang=${locale}`, { waitUntil: 'networkidle' });
        await page.locator('[data-screen-id="AUTH-02"] .auth-role-card').first().click();
        await page.getByRole('button', { name: locale === 'ar' ? 'متابعة' : 'Continue', exact: true }).click();
        await expect(page.locator('[data-screen-id="AUTH-04"]')).toBeVisible();
        await page.locator('#auth-otp-email').fill(email);
        const timeOrigin = await page.evaluate(() => performance.timeOrigin);
        const navigationCount = await page.evaluate(() => performance.getEntriesByType('navigation').length);

        await context.setOffline(true);
        await page.getByRole('button', { name: locale === 'ar' ? 'إرسال الرمز' : 'Send code', exact: true }).click();
        await expect(page.locator('[data-screen-id="AUTH-04"]')).toHaveAttribute('data-state', 'retry');
        await context.setOffline(false);
        const sent = page.waitForResponse(response => new URL(response.url()).pathname === '/api/v1/auth/otp/send' && response.status() === 202);
        await page.getByRole('button', { name: locale === 'ar' ? 'إعادة المحاولة' : 'Try again', exact: true }).click();
        assert.equal((await sent).status(), 202);
        const code = await readOtp(email);
        await expect(page.locator('.auth-otp__digit')).toHaveCount(6);
        for (let position = 0; position < 6; position += 1) {
          await page.locator('.auth-otp__digit').nth(position).fill(code[position]);
        }
        const verified = page.waitForResponse(response => new URL(response.url()).pathname === '/api/v1/auth/otp/verify' && response.status() === 200);
        await page.getByRole('button', { name: locale === 'ar' ? 'تأكيد الرمز' : 'Verify code', exact: true }).click();
        assert.equal((await verified).status(), 200);
        await expect(page.locator('[data-screen-id="AUTH-03"]')).toBeVisible();

        const submit = () => page.getByRole('button', { name: locale === 'ar' ? 'إنشاء الحساب' : 'Create account', exact: true }).click();
        await submit();
        await expect(page.locator('[data-screen-id="AUTH-03"]')).toHaveAttribute('data-state', 'error');
        assert.equal(registrationMutations, 0);
        await page.getByLabel(locale === 'ar' ? 'الاسم الأول' : 'First name', { exact: true }).fill('Guide');
        await page.getByLabel(locale === 'ar' ? 'اسم العائلة' : 'Last name', { exact: true }).fill('Recovery');
        await page.locator('#auth-registration-password').fill('LocalGuide04-Only!2026');
        await page.locator('#auth-registration-password-confirmation').fill('LocalGuide04-Different!2026');
        await submit();
        await expect(page.locator('[data-screen-id="AUTH-03"]')).toHaveAttribute('data-state', 'error');
        assert.equal(registrationMutations, 0);
        assert.equal(await page.evaluate(() => performance.timeOrigin), timeOrigin);
        assert.equal(await page.evaluate(() => performance.getEntriesByType('navigation').length), navigationCount);
        const geometry = await page.evaluate(() => ({ innerWidth, scrollWidth: document.documentElement.scrollWidth }));
        assert.equal(geometry.innerWidth, page.viewportSize().width);
        assert.ok(geometry.scrollWidth <= geometry.innerWidth);
        report.runs.push({
          locale,
          device,
          checks: ['offline_registration_otp_retry_recovers_without_navigation', 'empty_registration_blocks_mutation', 'mismatched_password_blocks_mutation'],
          otpSendStatus: 202,
          otpVerifyStatus: 200,
          registrationMutations,
          documentReloaded: false,
          ...geometry,
        });
      } finally {
        await context.setOffline(false);
        await context.close();
      }
    }
  }
  report.status = 'PASS_LOCAL_SUBCASES';
} catch (error) {
  report.status = 'FAIL_LOCAL';
  report.failure = `${stage}: ${error instanceof Error ? error.message.slice(0, 700) : 'Unknown failure'}`;
  process.exitCode = 1;
} finally {
  try {
    if (emails.size > 0) {
      const values = [...emails];
      await mongo.collection('otp_challenges').deleteMany({ normalizedEmail: { $in: values } });
      report.otpChallengesRemoved = (await mongo.collection('otp_challenges').countDocuments({ normalizedEmail: { $in: values } })) === 0;
    }
  } catch (error) {
    report.status = 'FAIL_LOCAL';
    report.failure = `${report.failure ? `${report.failure}; ` : ''}cleanup failed${error instanceof Error ? `: ${error.message}` : ''}`;
    process.exitCode = 1;
  } finally {
    await browser.close();
    await mongo.close();
    report.finishedAt = new Date().toISOString();
    await writeFile('docs/quality/guide-runs/registration-recovery-local-latest.json', `${JSON.stringify(report, null, 2)}\n`);
  }
}

console.log(JSON.stringify({ status: report.status, cases: report.runs.length, otpChallengesRemoved: report.otpChallengesRemoved, mockedRoutes: report.mockedRoutes }));
