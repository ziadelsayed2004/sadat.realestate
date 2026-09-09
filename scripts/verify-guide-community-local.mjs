import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import mongoose from 'mongoose';
import { chromium, expect } from '@playwright/test';

const base = 'http://127.0.0.1:4173';
const mail = 'http://127.0.0.1:8025';
const email = `community-guide-${Date.now()}@example.invalid`;
const title = `Community delivery proof ${Date.now()}`;
const password = `LocalCommunity!${randomUUID()}aA9`;
const moderationPath = (postId) => `/api/v1/admin/community/posts/${postId}/moderate`;
const evidence = {
  commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  worktreeChanges: execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim().length > 0,
  journeys: ['GUIDE-03', 'GUIDE-22'],
  environment: 'local',
  mockedRoutes: false,
  startedAt: new Date().toISOString(),
  status: 'RUNNING',
  transitions: [],
  authorization: [],
  http: [],
  browser: []
};

function record(method, path, status) {
  evidence.http.push({ method, path, status });
}

async function json(response, expectedStatus, path, method = 'POST') {
  record(typeof response.request === 'function' ? response.request().method() : method, path, response.status());
  assert.equal(response.status(), expectedStatus, `${path} returned ${response.status()}`);
  return (await response.json()).data;
}

async function registerSeeker(context) {
  const identity = { email, roleType: 'seeker', purpose: 'registration' };
  const started = Date.now();
  const sentResponse = await context.request.post(`${base}/api/v1/auth/otp/send`, { data: identity });
  const sent = await json(sentResponse, 202, '/api/v1/auth/otp/send');
  let code;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const inboxResponse = await fetch(`${mail}/api/messages`);
    assert.equal(inboxResponse.status, 200);
    const inbox = await inboxResponse.json();
    const message = inbox.messages.find((item) => item.to.includes(email) && new Date(item.receivedAt).getTime() >= started);
    code = message?.raw.replace(/=\r?\n/g, '').match(/\b(\d{6})\b/u)?.[1];
    if (code) break;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  assert.ok(code, 'Synthetic local OTP was not received');
  const verifiedResponse = await context.request.post(`${base}/api/v1/auth/otp/verify`, {
    data: { ...identity, challengeId: sent.challengeId, code }
  });
  const verified = await json(verifiedResponse, 200, '/api/v1/auth/otp/verify');
  const registeredResponse = await context.request.post(`${base}/api/v1/auth/register/seeker`, {
    data: { verificationToken: verified.verificationToken, firstName: 'Community', lastName: 'Guide', password, locale: 'en' }
  });
  const registered = await json(registeredResponse, 201, '/api/v1/auth/register/seeker');
  assert.equal(registered.session.user.roleType, 'seeker');
  evidence.transitions.push('verified_seeker_registered');
}

async function loginAdmin(context, emailAddress) {
  const response = await context.request.post(`${base}/api/v1/auth/login`, {
    data: { email: emailAddress, password: 'LocalPreview-Admin-Only-2026!' }
  });
  const session = await json(response, 200, '/api/v1/auth/login');
  assert.equal(session.user.roleType, 'admin');
  return session.accessToken;
}

async function filterPost(page, postId) {
  await page.locator('#admin-community-search').fill(title);
  const response = page.waitForResponse((item) => new URL(item.url()).pathname === '/api/v1/admin/community/posts' && new URL(item.url()).searchParams.get('search') === title);
  await page.getByRole('button', { name: 'Apply', exact: true }).click();
  assert.equal((await response).status(), 200);
  const row = page.getByTestId(`admin-community-post-${postId}`);
  await expect(row).toBeVisible();
  return row;
}

async function moderateInBrowser(page, postId, actionLabel, reason) {
  const row = page.getByTestId(`admin-community-post-${postId}`);
  await row.getByRole('button', { name: 'Review', exact: true }).click();
  await page.locator('#community-moderation-reason').fill(reason);
  const pending = page.waitForResponse((item) => new URL(item.url()).pathname === moderationPath(postId) && item.request().method() === 'POST');
  await page.getByRole('button', { name: actionLabel, exact: true }).click();
  const response = await pending;
  const data = await json(response, 200, moderationPath(postId));
  await expect(page.locator('.admin-community__resolution')).toHaveCount(0);
  await expect(page.getByTestId(`admin-community-post-${postId}`)).toBeVisible();
  assert.equal(await page.evaluate(() => document.documentElement.classList.contains('app-navigating')), false);
  return data;
}

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

const browser = await chromium.launch({ headless: true });
let mongo;
try {
  const seekerContext = await browser.newContext({ viewport: { width: 402, height: 874 }, isMobile: true });
  await registerSeeker(seekerContext);
  const seekerPage = await seekerContext.newPage();
  let createdResponse;
  seekerPage.on('response', (response) => {
    const path = new URL(response.url()).pathname;
    if (path.endsWith('/public/community/posts') && response.request().method() === 'POST') createdResponse = response;
  });
  await seekerPage.goto(`${base}/community?lang=en`, { waitUntil: 'networkidle' });
  await seekerPage.getByRole('button', { name: 'Create a post', exact: true }).click();
  await expect(seekerPage.locator('#community-create-form')).toBeVisible();
  await seekerPage.getByLabel('Post title', { exact: true }).fill(title);
  await seekerPage.locator('#community-post-body').fill('A synthetic local post that verifies the complete moderation contract without personal data.');
  assert.equal(await seekerPage.locator('#community-create-form').evaluate((form) => form.checkValidity()), true);
  const publishButton = seekerPage.getByRole('button', { name: 'Publish post', exact: true });
  const submitControl = await publishButton.evaluate((button) => ({ disabled: button.disabled, form: button.getAttribute('form'), type: button.getAttribute('type') }));
  assert.deepEqual(submitControl, { disabled: false, form: 'community-create-form', type: 'submit' });
  await publishButton.click();
  await expect.poll(() => Boolean(createdResponse), { timeout: 10_000 }).toBe(true);
  const created = await json(createdResponse, 201, '/api/v1/public/community/posts');
  assert.equal(created.status, 'draft');
  assert.equal(created.version, 0);
  const postId = created.id;
  evidence.transitions.push('browser_post_created_as_draft');
  evidence.browser.push({ role: 'seeker', width: await seekerPage.evaluate(() => innerWidth), overflow: await seekerPage.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1) });

  const publicBefore = await seekerContext.request.get(`${base}/api/v1/public/community/posts/${postId}`);
  record('GET', `/api/v1/public/community/posts/${postId}`, publicBefore.status());
  assert.equal(publicBefore.status(), 404);

  const viewerContext = await browser.newContext();
  const viewerToken = await loginAdmin(viewerContext, 'admin.viewer@example.invalid');
  const denied = await viewerContext.request.post(`${base}${moderationPath(postId)}`, {
    headers: { authorization: `Bearer ${viewerToken}` },
    data: { action: 'publish', expectedVersion: 0, reason: 'Viewer must not moderate' }
  });
  record('POST', moderationPath(postId), denied.status());
  assert.equal(denied.status(), 403);
  evidence.authorization.push('limited_admin_moderation_denied_403');
  await viewerContext.close();

  const adminContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await loginAdmin(adminContext, 'admin.operations@example.invalid');
  const adminPage = await adminContext.newPage();
  await adminPage.goto(`${base}/admin/community?lang=en`, { waitUntil: 'networkidle' });
  await filterPost(adminPage, postId);
  let current = await moderateInBrowser(adminPage, postId, 'Publish post', 'Approved by the complete local delivery journey');
  assert.equal(current.status, 'published');
  assert.equal(current.version, 1);
  evidence.transitions.push('browser_admin_published_v1');

  const publicPublished = await seekerContext.request.get(`${base}/api/v1/public/community/posts/${postId}`);
  record('GET', `/api/v1/public/community/posts/${postId}`, publicPublished.status());
  assert.equal(publicPublished.status(), 200);
  const publicPage = await seekerContext.newPage();
  await publicPage.goto(`${base}/community?lang=en`, { waitUntil: 'networkidle' });
  await expect(publicPage.getByText(title, { exact: true })).toBeVisible();
  evidence.transitions.push('public_api_and_browser_show_published_post');

  const concurrentInput = { action: 'hide', expectedVersion: 1, reason: 'Concurrent moderation proof' };
  const concurrencyContext = await browser.newContext();
  const concurrencyToken = await loginAdmin(concurrencyContext, 'admin.operations@example.invalid');
  const concurrent = await Promise.all([
    concurrencyContext.request.post(`${base}${moderationPath(postId)}`, { headers: { authorization: `Bearer ${concurrencyToken}` }, data: concurrentInput }),
    concurrencyContext.request.post(`${base}${moderationPath(postId)}`, { headers: { authorization: `Bearer ${concurrencyToken}` }, data: concurrentInput })
  ]);
  const statuses = concurrent.map((response) => response.status()).sort((left, right) => left - right);
  concurrent.forEach((response) => record('POST', moderationPath(postId), response.status()));
  assert.deepEqual(statuses, [200, 409]);
  current = await concurrent.find((response) => response.status() === 200).json().then((body) => body.data);
  await concurrencyContext.close();
  assert.equal(current.status, 'hidden');
  assert.equal(current.version, 2);
  evidence.transitions.push('concurrent_hide_one_200_one_409_v2');

  await adminPage.reload({ waitUntil: 'networkidle' });
  await filterPost(adminPage, postId);
  current = await moderateInBrowser(adminPage, postId, 'Publish post', 'Republished after concurrency verification');
  assert.equal(current.version, 3);
  current = await moderateInBrowser(adminPage, postId, 'Hide post', 'Hidden before final rejection verification');
  assert.equal(current.version, 4);
  current = await moderateInBrowser(adminPage, postId, 'Reject post', 'Rejected after full moderation lifecycle proof');
  assert.equal(current.status, 'rejected');
  assert.equal(current.version, 5);
  evidence.transitions.push('browser_republished_v3', 'browser_hidden_v4', 'browser_rejected_v5');
  evidence.browser.push({ role: 'admin', width: await adminPage.evaluate(() => innerWidth), overflow: await adminPage.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), stuckNavigationClass: await adminPage.evaluate(() => document.documentElement.classList.contains('app-navigating')) });

  const publicAfter = await seekerContext.request.get(`${base}/api/v1/public/community/posts/${postId}`);
  record('GET', `/api/v1/public/community/posts/${postId}`, publicAfter.status());
  assert.equal(publicAfter.status(), 404);
  await publicPage.reload({ waitUntil: 'networkidle' });
  await expect(publicPage.getByText(title, { exact: true })).toHaveCount(0);
  evidence.transitions.push('public_api_and_browser_hide_rejected_post');

  const env = parseEnvironment(await readFile('.env.local', 'utf8'));
  assert.ok(env.MONGODB_URI, 'MONGODB_URI is missing from .env.local');
  mongo = await mongoose.createConnection(env.MONGODB_URI).asPromise();
  const stored = await mongo.collection('community_posts').findOne({ id: postId });
  assert.equal(stored?.status, 'rejected');
  assert.equal(stored?.version, 5);
  const audits = await mongo.collection('audit_logs').find({ targetType: 'community_post', targetId: postId }).sort({ createdAt: 1 }).toArray();
  assert.equal(audits.length, 5);
  assert.deepEqual(audits.map((entry) => entry.action), [
    'community_post.publish', 'community_post.hide', 'community_post.publish', 'community_post.hide', 'community_post.reject'
  ]);
  assert.ok(audits.every((entry) => typeof entry.reason === 'string' && entry.reason.length >= 5));
  assert.deepEqual(audits.map((entry) => entry.after.version), [1, 2, 3, 4, 5]);
  evidence.mongo = { collections: ['community_posts', 'audit_logs'], finalStatus: stored.status, finalVersion: stored.version, auditCount: audits.length, actions: audits.map((entry) => entry.action), orderedAfterVersions: audits.map((entry) => entry.after.version) };
  evidence.authorization.push('full_admin_moderation_allowed', 'public_projection_only_exposes_published');
  evidence.status = 'PASS_LOCAL';
  evidence.remaining = ['Run the same journey on Production after deployment of this commit.'];
  await publicPage.close();
  await adminContext.close();
  await seekerContext.close();
} catch (error) {
  evidence.status = 'FAIL_LOCAL';
  evidence.failure = error instanceof Error ? error.message.slice(0, 700) : 'Unknown failure';
  process.exitCode = 1;
} finally {
  if (mongo) await mongo.close();
  await browser.close();
  evidence.finishedAt = new Date().toISOString();
  await mkdir('docs/quality/guide-runs', { recursive: true });
  await writeFile('docs/quality/guide-runs/community-local-latest.json', `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(`COMMUNITY_LOCAL_${evidence.status}`);
}
