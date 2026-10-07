import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { writeFile } from 'node:fs/promises';
import mongoose from 'mongoose';
import { chromium, expect } from '@playwright/test';
import { createAuthRuntime } from '../apps/api/dist/modules/auth/runtime.js';
import { createAuthModels } from '../apps/api/dist/modules/auth/models.js';
import { createArgon2PasswordHasher } from '../apps/api/dist/modules/auth/crypto.js';
import { createIdentityModels } from '../apps/api/dist/modules/identity/models.js';
import { createAuditModels } from '../apps/api/dist/modules/audit/models.js';
import { createMongooseAuditWriter } from '../apps/api/dist/modules/audit/writer.js';
import { createAccountRuntime } from '../apps/api/dist/modules/accounts/runtime.js';
import { createSeekerRuntime } from '../apps/api/dist/modules/seeker/runtime.js';
import { createPublicRuntime } from '../apps/api/dist/modules/public/runtime.js';
import { createApiServer, startApiServer, stopApiServer } from '../apps/api/dist/server.js';

// This verifier owns a temporary database and never accepts production config.
const database = `shared_link_${randomUUID().replaceAll('-', '')}`;
const connection = await mongoose.createConnection(`mongodb://127.0.0.1:27018/${database}?replicaSet=rs0`).asPromise();
const report = { status: 'RUNNING', environment: 'isolated-local-real-MongoDB-API-web-browser', mockedRoutes: false, checks: [], cleanup: false };
const base = 'http://127.0.0.1:4178';
let server, web, browser;
try {
  const identity = createIdentityModels(connection);
  const credentials = createAuthModels(connection);
  await Promise.all([identity.User.init(), identity.Session.init(), credentials.AdminCredential.init()]);
  const password = randomBytes(20).toString('hex');
  const hash = await createArgon2PasswordHasher().hash(password);
  const auth = createAuthRuntime(connection, {
    accessTokenSecret: randomBytes(32), accessTokenTtlSeconds: 900, refreshTokenTtlSeconds: 3600,
    otpProviderMode: 'unconfigured',
    cookie: { name: 'sadat_refresh', path: '/api/v1/auth', httpOnly: true, sameSite: 'Strict', secure: false, maxAgeSeconds: 3600 }
  });
  const audit = createMongooseAuditWriter(createAuditModels(connection));
  server = createApiServer({ database: { isReady: async () => true }, auth,
    accounts: createAccountRuntime(connection, auth.accessTokens, audit, { async authorize() { return false; } }),
    seeker: createSeekerRuntime(connection, auth.service, auth.accessTokens, auth.cookie),
    publicHomepage: createPublicRuntime(connection, auth.accessTokens),
    security: { rateLimit: { max: 5000 } }, observability: { logger: { log() {} } }
  });
  const address = await startApiServer(server, { host: '127.0.0.1', port: 0 });
  web = spawn(process.execPath, ['apps/web/server.mjs', '--mode', 'production'], {
    windowsHide: true, stdio: ['ignore', 'ignore', 'ignore'],
    env: { ...process.env, WEB_PORT: '4178', WEB_HOST: '127.0.0.1', WEB_API_ORIGIN: `http://127.0.0.1:${address.port}`, WEB_PUBLIC_ORIGIN: base }
  });
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (web.exitCode !== null) throw new Error('Local web server exited');
    try { if ((await fetch(`${base}/health`)).ok) { ready = true; break; } } catch { /* Starting. */ }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.ok(ready);
  browser = await chromium.launch();
  for (const role of ['seeker', 'provider', 'admin']) {
    const accounts = [];
    for (const person of ['sender', 'recipient']) {
      const user = await identity.User.create({ normalizedEmail: `${role}-${person}@example.invalid`, roleType: role, status: 'verified', locale: 'en' });
      await credentials.AdminCredential.create({ userId: user._id, passwordHash: hash, passwordChangedAt: new Date() });
      if (role === 'seeker') await identity.SeekerProfile.create({ userId: user._id, firstName: person, lastName: role });
      accounts.push(user);
    }
    const [sender, recipient, guest] = await Promise.all([browser.newContext(), browser.newContext(), browser.newContext()]);
    try {
      for (const [context, user] of [[sender, accounts[0]], [recipient, accounts[1]]]) {
        const login = await context.request.post(`${base}/api/v1/auth/login`, { data: { email: user.normalizedEmail, password } });
        assert.equal(login.status(), 200);
        assert.equal((await login.json()).data.user.id, String(user._id));
        assert.match(login.headers()['set-cookie'], /HttpOnly; SameSite=Strict/u);
        assert.equal(login.headers()['cache-control'], 'no-store');
        await context.addInitScript(() => globalThis.localStorage.setItem('sadat-real-estate.auth.session-hint', 'authenticated'));
      }
      const senderPage = await sender.newPage();
      const senderRefresh = senderPage.waitForResponse(r => new URL(r.url()).pathname === '/api/v1/auth/refresh');
      const document = await senderPage.goto(`${base}/?lang=en`);
      assert.equal((await (await senderRefresh).json()).data.user.id, String(accounts[0]._id));
      assert.equal(document.headers()['cache-control'], 'no-store');
      assert.equal(document.headers()['cdn-cache-control'], 'no-store');
      assert.match(document.headers().vary, /Cookie/u);
      const html = await document.text();
      assert.ok(!html.includes(accounts[0].normalizedEmail));
      assert.ok(!html.includes('accessToken'));
      await expect(senderPage.locator('.public-homepage__account').first()).toHaveAttribute('href', new RegExp(`^/${role}(?:\\?|$)`));
      const sharedHome = senderPage.url();
      const recipientPage = await recipient.newPage();
      const recipientRefresh = recipientPage.waitForResponse(r => new URL(r.url()).pathname === '/api/v1/auth/refresh');
      await recipientPage.goto(sharedHome);
      assert.equal((await (await recipientRefresh).json()).data.user.id, String(accounts[1]._id));
      const guestPage = await guest.newPage();
      await guestPage.goto(sharedHome);
      await expect(guestPage.locator('.public-homepage__login').first()).toHaveAttribute('href', /\/auth\/login/u);
      await expect(guestPage.locator('.public-homepage__account')).toHaveCount(0);
      assert.ok(!(await guest.cookies()).some(cookie => cookie.name === 'sadat_refresh'));
      report.checks.push({ role, case: 'shared-homepage', senderKeepsOwnAccount: true, signedInRecipientKeepsOwnAccount: true, guestStaysAnonymous: true, ssrContainsNoCredentials: true });

      // Even a forged browser hint and tokens embedded in a URL cannot replace
      // a recipient's own HttpOnly refresh cookie.
      const senderCookie = (await sender.cookies()).find(cookie => cookie.name === 'sadat_refresh');
      assert.ok(senderCookie);
      const forgedQuery = new URLSearchParams({ lang: 'en', token: senderCookie.value, refreshToken: senderCookie.value, accessToken: senderCookie.value, session: senderCookie.value });
      const sharedAccount = `${base}/${role}/settings?${forgedQuery}#accessToken=${senderCookie.value}`;
      await guestPage.evaluate(() => globalThis.localStorage.setItem('sadat-real-estate.auth.session-hint', 'authenticated'));
      const denied = guestPage.waitForResponse(r => new URL(r.url()).pathname === '/api/v1/auth/refresh');
      await guestPage.goto(sharedAccount);
      assert.equal((await denied).status(), 401);
      await expect(guestPage.locator('[data-access="authentication-required"]')).toBeVisible();
      const ownRefresh = recipientPage.waitForResponse(r => new URL(r.url()).pathname === '/api/v1/auth/refresh');
      await recipientPage.goto(sharedAccount);
      assert.equal((await (await ownRefresh).json()).data.user.id, String(accounts[1]._id));
      report.checks.push({ role, case: 'shared-account-url-with-forged-query-hash-and-storage-hint', guestRefresh: 401, loginRequired: true, recipientSessionNotReplaced: true });

      if (role === 'seeker') {
        for (const [context, user] of [[sender, accounts[0]], [recipient, accounts[1]]]) {
          const renewed = await context.request.post(`${base}/api/v1/auth/refresh`, { data: {} });
          const token = (await renewed.json()).data.accessToken;
          const profile = await context.request.get(`${base}/api/v1/me`, { headers: { authorization: `Bearer ${token}` } });
          assert.equal(profile.status(), 200);
          assert.ok(JSON.stringify(await profile.json()).includes(user.normalizedEmail));
          const withoutAuthorization = await context.request.get(`${base}/api/v1/me?accessToken=${token}&userId=${accounts[0]._id}`);
          assert.equal(withoutAuthorization.status(), 401);
          assert.equal(withoutAuthorization.headers()['cache-control'], 'no-store');
        }
        report.checks.push({ role, case: 'real-private-profile-access', eachTokenReturnsOwnProfile: true, queryAndCookieWithoutBearer: 401 });
      }
    } finally {
      await Promise.all([sender.close(), recipient.close(), guest.close()]);
    }
  }
  report.status = 'PASS_LOCAL';
} catch (error) {
  report.status = 'FAIL_LOCAL';
  // Never include URLs, cookies, or credentials in the saved report.
  console.error(error instanceof Error ? error.stack?.replaceAll(/(?:token|Token|session)=[^\s&#]+/gu, 'credential=[REDACTED]') : 'Local verification failed');
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  if (web && web.exitCode === null) { const stopped = once(web, 'exit'); web.kill(); await stopped; }
  if (server) await stopApiServer(server);
  assert.equal(connection.name, database);
  assert.match(database, /^shared_link_[a-f0-9]{32}$/u);
  await connection.dropDatabase();
  report.cleanup = (await connection.db.listCollections().toArray()).length === 0;
  await connection.close();
  report.finishedAt = new Date().toISOString();
  await writeFile('docs/quality/guide-runs/shared-link-session-isolation-local-latest.json', `${JSON.stringify(report, null, 2)}\n`);
}
console.log(JSON.stringify({ status: report.status, checks: report.checks.length, cleanup: report.cleanup }));
