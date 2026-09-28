import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import mongoose from 'mongoose';
import { chromium } from '@playwright/test';

// Browser audit of seeded Local pages. Status-specific property fixtures are
// temporary and removed in finally. Registration uses dedicated journey suites.
const base = process.env.LOCAL_AUDIT_URL ?? 'http://127.0.0.1:4173';
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(base).hostname));
const matrix = JSON.parse(await readFile('docs/quality/figma_parity/SCREEN_ROUTE_API_JOURNEY_MATRIX.json', 'utf8'));
const env = Object.fromEntries((await readFile('.env.local', 'utf8')).split(/\r?\n/u).flatMap(line => {
  if (!line.includes('=') || line.trim().startsWith('#')) return [];
  const index = line.indexOf('=');
  return [[line.slice(0, index).trim(), line.slice(index + 1).trim().replace(/^['"]|['"]$/gu, '')]];
}));
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(env.MONGODB_URI).hostname));
const mongo = await mongoose.createConnection(env.MONGODB_URI).asPromise();
const db = mongo.db;
const property = await db.collection('properties').findOne({ status: 'published' });
const provider = await db.collection('users').findOne({ _id: property.providerId });
const statusFixtureIds = [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()];
const statusFixtureRows = ['pending_review', 'rejected'].map((status, index) => {
  const original = { ...property };
  delete original.publishedAt;
  delete original.reviewedAt;
  return {
    ...original,
    _id: statusFixtureIds[index],
    slug: `local-audit-${status.replaceAll('_', '-')}-${statusFixtureIds[index]}`,
    publicCode: `AUDIT-${statusFixtureIds[index].toString().slice(-8)}`,
    seedKey: `local-page-audit-${statusFixtureIds[index]}`,
    status,
    synthetic: true,
    submittedAt: new Date(),
    ...(status === 'rejected' ? { reviewedAt: new Date(), reviewReason: 'Local audit status fixture' } : {})
  };
});
await db.collection('properties').insertMany(statusFixtureRows);
const organization = await db.collection('organizations').findOne({ kind: 'developer_company', directoryVisible: true });
const article = await db.collection('articles').findOne({ status: 'published' });
const request = await db.collection('requests').findOne({});
let report = await db.collection('account_reports').findOne({});
if (!report) {
  const now = new Date();
  const fixture = { synthetic: true, seedKey: 'local-page-audit', accountId: provider._id, accountRoleType: 'provider', reason: 'Local synthetic report for browser auditing', status: 'open', relatedReports: 1, version: 0, createdAt: now, updatedAt: now };
  const inserted = await db.collection('account_reports').insertOne(fixture);
  report = { ...fixture, _id: inserted.insertedId };
}
const project = await db.collection('projects').findOne({});
const admin = await db.collection('users').findOne({ normalizedEmail: 'admin.demo@example.invalid' });
const role = await db.collection('roles').findOne({});
const browser = await chromium.launch();
const result = { startedAt: new Date().toISOString(), sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), environment: 'isolated-local-browser-api-mongodb', mockedRoutes: false, canonicalScreens: matrix.rows.length, cases: [], issues: [], registrationScope: 'Dedicated registration/provider journey suites; temporary local property status fixtures removed after this crawl' };
const output = 'docs/quality/LOCAL_PAGE_AUDIT_2026-09-28.json';
const recheck = process.argv.includes('--recheck');
let recheckScreens;
if (recheck) {
  const previous = JSON.parse(await readFile(output, 'utf8'));
  recheckScreens = new Set([
    ...previous.issues.map(item => item.screen),
    ...process.argv.filter(value => value.startsWith('--screen=')).map(value => value.slice('--screen='.length)),
    ...matrix.rows.filter(row => row.surface !== 'auth' || ['AUTH-01', 'AUTH-02', 'AUTH-04', 'AUTH-07'].includes(row.screenId))
      .filter(row => !['ar', 'en'].every(locale => previous.cases.some(item => item.screen === row.screenId && item.locale === locale))).map(row => row.screenId)
  ]);
  result.cases = previous.cases.filter(item => !recheckScreens.has(item.screen));
}
const snapshots = '.local/page-audit';
await mkdir(snapshots, { recursive: true });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function save() { await writeFile(output, `${JSON.stringify(result, null, 2)}\n`); }
async function login(context, email, roleType) {
  if (roleType === 'admin') {
    const response = await context.request.post(`${base}/api/v1/auth/login`, { data: { email, password: 'LocalPreview-Admin-Only-2026!' } });
    assert.equal(response.status(), 200, 'Local admin login');
    return;
  }
  assert.ok(email.endsWith('@example.invalid'));
  const identity = { email, roleType, purpose: 'login' };
  const before = await fetch('http://127.0.0.1:8025/api/messages').then(response => response.json());
  const existingMessages = new Set(before.messages.map(item => item.id));
  const sent = await context.request.post(`${base}/api/v1/auth/otp/send`, { data: identity });
  assert.equal(sent.status(), 202, 'Local inbox OTP send');
  const challenge = (await sent.json()).data;
  let code;
  for (let attempt = 0; attempt < 20 && !code; attempt += 1) {
    const body = await fetch('http://127.0.0.1:8025/api/messages').then(response => response.json());
    code = body.messages.find(item => item.to.includes(email) && !existingMessages.has(item.id))?.raw.match(/\b(\d{6})\b/u)?.[1];
    if (!code) await sleep(250);
  }
  assert.ok(code, 'OTP captured locally');
  const verified = await context.request.post(`${base}/api/v1/auth/otp/verify`, { data: { ...identity, challengeId: challenge.challengeId, code } });
  assert.equal(verified.status(), 200, 'Local OTP verify');
}
function routeFor(row) {
  let route = row.route;
  const id = row.screenId;
  if (id === 'PUB-03') route = `/properties/${property.slug}`;
  if (id === 'PUB-06') route = `/developers/${organization.slug}`;
  if (id === 'PUB-08') route = `/articles/${article.slug}`;
  if (id === 'PUB-04') route = `/compare?ids=${property._id}`;
  if (id.startsWith('SEK-03') || id.startsWith('SEK-04')) route = `/seeker/requests/${request._id}`;
  if (route.startsWith('/provider/properties/:id/')) route = route.replace(':id', property._id.toString());
  if (id === 'PRV-12' || id === 'PRV-13') route = `/provider/properties/${statusFixtureIds[id === 'PRV-12' ? 0 : 1]}/${id === 'PRV-12' ? 'submitted' : 'rejected'}`;
  if (id.startsWith('PRV-22')) route = `/provider/settings?tab=${id.endsWith('1') ? 'account' : id.endsWith('2') ? 'contact' : 'security'}`;
  if (id === 'ADM-07') route = `/admin/account-reports?reportId=${report._id}`;
  if (id === 'ADM-13') route += `?projectId=${project._id}`;
  if (id === 'ADM-15' || id === 'ADM-16') route += `?propertyId=${property._id}`;
  if (id === 'ADM-42') route = `/admin/commissions/account?accountId=${provider._id}`;
  if (id === 'ADM-61' || id === 'ADM-62') route = `/admin/admin-users/${admin._id}${id === 'ADM-62' ? '?accessLevel=standard_admin' : ''}`;
  if (id === 'ADM-64') route = `/admin/roles/${role._id}`;
  return route;
}
function expectedUnconfiguredSettings(response, surface) {
  return surface === 'admin' && response.status === 404 && /^\/api\/v1\/admin\/settings\/(?:platform|contact|social|properties|requests|advertising|seo|privacy-security|display)$/u.test(response.path);
}
try {
  for (const [surface, email, roleType] of [['public'], ['auth'], ['seeker', 'seeker.demo@example.invalid', 'seeker'], ['provider', provider.normalizedEmail, 'provider'], ['admin', admin.normalizedEmail, 'admin']]) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    if (roleType) await login(context, email, roleType);
    const page = await context.newPage();
    let responses = [];
    let assetErrors = [];
    let pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message.slice(0, 300)));
    page.on('response', response => {
      if (new URL(response.url()).pathname.startsWith('/api/v1/')) responses.push({ path: new URL(response.url()).pathname, status: response.status(), retryAfter: Number(response.headers()['retry-after'] ?? 1) });
      if (response.status() >= 400 && ['script', 'stylesheet'].includes(response.request().resourceType())) assetErrors.push({ path: new URL(response.url()).pathname, status: response.status() });
    });
    const rows = matrix.rows.filter(row => row.surface === surface && (!recheckScreens || recheckScreens.has(row.screenId)) && (surface !== 'auth' || ['AUTH-01', 'AUTH-02', 'AUTH-04', 'AUTH-07'].includes(row.screenId)));
    for (const locale of ['ar', 'en']) for (const row of rows) {
      const route = new URL(routeFor(row), base);
      route.searchParams.set('lang', locale);
      responses = []; pageErrors = []; assetErrors = [];
      await page.setViewportSize({ width: 1440, height: 1000 });
      let documentStatus;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        documentStatus = (await page.goto(route.href, { waitUntil: 'networkidle' }))?.status();
        const limited = responses.filter(item => item.status === 429).at(-1);
        if (!limited) break;
        console.log(`RATE_LIMIT_PAUSE ${limited.retryAfter}s ${row.screenId}`);
        await sleep((limited.retryAfter + 1) * 1000);
        responses = [];
      }
      await page.locator('.session-loading').waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
      for (const [device, width, height] of [['desktop', 1440, 1000], ['tablet', 768, 1024], ['mobile', 360, 800]]) {
        await page.setViewportSize({ width, height });
        await sleep(100);
        const facts = await page.evaluate(() => ({
          viewport: innerWidth, documentWidth: document.documentElement.scrollWidth,
          screens: [...document.querySelectorAll('[data-screen-id]')].map(element => element.getAttribute('data-screen-id')),
          mainReady: Boolean(document.querySelector('main')?.textContent?.trim().length > 20),
          headings: [...document.querySelectorAll('h1')].map(element => element.textContent?.trim()),
          technicalPlaceholder: Boolean(document.querySelector('.route-heading')),
          sessionPending: Boolean(document.querySelector('.session-loading')),
          errorStates: [...document.querySelectorAll('[data-state="error"], [data-admin-state="error"], [data-page="not-found"]')].map(element => element.textContent?.trim().slice(0, 220)),
          brokenImages: [...document.images].filter(image => image.complete && !image.naturalWidth && image.getBoundingClientRect().width > 0).map(image => image.getAttribute('src')),
          dialogs: [...document.querySelectorAll('[role="dialog"]')].map(element => { const r = element.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom }; })
        }));
        const issues = [];
        if (facts.documentWidth > width + 1) issues.push('horizontal-overflow');
        if (facts.technicalPlaceholder) issues.push('technical-placeholder');
        if (facts.sessionPending || (surface === 'public' ? !facts.mainReady : !facts.screens.length)) issues.push('screen-not-ready');
        if (assetErrors.length) issues.push('asset-error');
        if (pageErrors.length) issues.push('browser-exception');
        if (facts.errorStates.length) issues.push('error-state');
        if (facts.brokenImages.length) issues.push('broken-image');
        if (responses.some(item => item.status >= 500)) issues.push('server-error');
        if (responses.some(item => item.status >= 400 && !expectedUnconfiguredSettings(item, surface))) issues.push('api-error');
        const item = { screen: row.screenId, surface, route: route.pathname + route.search, locale, device, documentStatus, ...facts, apiErrors: responses.filter(item => item.status >= 400), assetErrors, pageErrors, issues };
        result.cases.push(item);
        if (issues.length) result.issues.push(item);
        if (device === 'mobile' || issues.length) {
          try {
            await page.screenshot({ path: `${snapshots}/${row.screenId}-${locale}-${device}.png`, fullPage: true, animations: 'disabled', timeout: 10000 });
          } catch (error) {
            console.warn(`SCREENSHOT_SKIPPED ${row.screenId} ${locale} ${device}: ${error.message.split('\n')[0]}`);
          }
        }
      }
      console.log(`VISITED ${row.screenId} ${locale} cases=${result.cases.length} issues=${result.issues.length}`);
      await save();
    }
    await context.close();
  }
  result.finishedAt = new Date().toISOString();
  result.status = result.issues.length ? 'ISSUES_FOUND' : 'PASS';
} catch (error) {
  result.status = 'AUDIT_INTERRUPTED';
  result.failure = error.message;
  process.exitCode = 1;
} finally {
  await save();
  await browser.close();
  await db.collection('properties').deleteMany({ _id: { $in: statusFixtureIds } });
  await db.collection('account_reports').deleteMany({ synthetic: true, seedKey: 'local-page-audit' });
  await mongo.close();
}
console.log(`LOCAL_PAGE_AUDIT ${result.status} cases=${result.cases.length} issues=${result.issues.length}`);
