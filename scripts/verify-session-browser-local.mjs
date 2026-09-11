import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import mongoose, { Types } from 'mongoose';
import { chromium, devices, expect } from '@playwright/test';

const base = 'http://127.0.0.1:4174';
assert.equal(new URL(process.env.MONGODB_URI).hostname, '127.0.0.1');
assert.ok(process.env.LOCAL_GUIDE_SEEKER_PASSWORD);
const report = { status: 'RUNNING', journeys: ['GUIDE-10'], mockedRoutes: false, environment: 'local-real-browser-api-mongodb', runs: [], sessionsClosed: true };
const mongo = await mongoose.createConnection(process.env.MONGODB_URI).asPromise();
const browser = await chromium.launch();
try {
  const user = await mongo.collection('users').findOne({ roleType: 'seeker', normalizedEmail: /^guide04-/, status: 'verified' }, { sort: { _id: -1 } });
  assert.ok(user);
  const login = async context => {
    const response = await context.request.post(`${base}/api/v1/auth/login`, { data: { email: user.normalizedEmail, password: process.env.LOCAL_GUIDE_SEEKER_PASSWORD } });
    assert.equal(response.status(), 200);
    return (await response.json()).data;
  };
  for (const locale of ['ar', 'en']) for (const [device, preset] of [['desktop', 'Desktop Chrome'], ['tablet', 'Galaxy Tab S4'], ['mobile', 'Pixel 5']]) {
    const current = await browser.newContext({ ...devices[preset] });
    const other = await browser.newContext();
    let targetRevoked = false;
    try {
      await login(current);
      const target = await login(other);
      const targetId = JSON.parse(Buffer.from(target.accessToken.split('.')[1], 'base64url').toString()).sid;
      assert.ok(Types.ObjectId.isValid(targetId));
      const page = await current.newPage();
      const loaded = page.waitForResponse(response => response.request().method() === 'GET' && new URL(response.url()).pathname === '/api/v1/me/sessions');
      await page.goto(`${base}/seeker/settings?lang=${locale}`, { waitUntil: 'networkidle' });
      const inventory = await loaded;
      assert.equal(inventory.status(), 200);
      const items = (await inventory.json()).data.items;
      const index = items.findIndex(item => item.id === targetId && !item.current);
      assert.ok(index >= 0);
      const card = page.locator('[aria-labelledby="seeker-profile-sessions-title"]');
      await expect(card.locator('.seeker-profile__session')).toHaveCount(items.length);
      const origin = await page.evaluate(() => performance.timeOrigin);
      const revoked = page.waitForResponse(response => response.request().method() === 'DELETE' && new URL(response.url()).pathname === `/api/v1/me/sessions/${targetId}`);
      await card.locator('.seeker-profile__session').nth(index).getByRole('button').click();
      assert.equal((await revoked).status(), 200);
      await expect(card.locator('.seeker-profile__session')).toHaveCount(items.length - 1);
      await expect(card.locator('[data-current="true"]')).toHaveCount(1);
      assert.equal(await page.evaluate(() => performance.timeOrigin), origin);
      const stored = await mongo.collection('sessions').findOne({ _id: new Types.ObjectId(targetId), userId: user._id });
      assert.ok(stored.revokedAt instanceof Date);
      targetRevoked = true;
      const denied = await other.request.get(`${base}/api/v1/me`, { headers: { authorization: `Bearer ${target.accessToken}` } });
      assert.equal(denied.status(), 401);
      const currentProfile = page.waitForResponse(response => new URL(response.url()).pathname === '/api/v1/me' && response.request().method() === 'GET');
      await page.reload({ waitUntil: 'networkidle' });
      assert.equal((await currentProfile).status(), 200);
      const geometry = await page.evaluate(() => ({ innerWidth, scrollWidth: document.documentElement.scrollWidth }));
      assert.equal(geometry.innerWidth, page.viewportSize().width);
      assert.ok(geometry.scrollWidth <= geometry.innerWidth);
      report.runs.push({ locale, device, browserRevocation: 200, revokedToken: 401, currentProfile: 200, mongoRevoked: true, ...geometry });
    } finally {
      for (const context of [current, other]) {
        try {
          const response = await context.request.post(`${base}/api/v1/auth/logout`, { data: {} });
          if (![200, 204].includes(response.status()) && !(context === other && targetRevoked && response.status() === 401)) report.sessionsClosed = false;
        } catch { report.sessionsClosed = false; }
        await context.close();
      }
    }
  }
  assert.equal(report.sessionsClosed, true);
  report.status = 'PASS_LOCAL_SUBCASES';
} catch {
  report.status = 'FAIL_LOCAL';
  process.exitCode = 1;
} finally {
  await browser.close();
  await mongo.close();
  report.finishedAt = new Date().toISOString();
  await writeFile('docs/quality/guide-runs/session-browser-local-latest.json', `${JSON.stringify(report, null, 2)}\n`);
}
console.log(JSON.stringify({ status: report.status, cases: report.runs.length, sessionsClosed: report.sessionsClosed }));
