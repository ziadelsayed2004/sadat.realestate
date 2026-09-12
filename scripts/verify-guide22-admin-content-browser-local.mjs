import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import mongoose, { Types } from 'mongoose';
import { chromium, expect } from '@playwright/test';
import { readEnvironmentFile } from './environment-file.mjs';

const environment = await readEnvironmentFile('.env.local');
const mongoUri = process.env.MONGODB_URI ?? environment.MONGODB_URI;
const base = process.env.LOCAL_GUIDE_BASE_URL ?? `http://127.0.0.1:${environment.WEB_PORT ?? '4173'}`;
assert.ok(mongoUri);
assert.equal(new URL(mongoUri).hostname, '127.0.0.1');
const mongo = await mongoose.createConnection(mongoUri).asPromise();
const browser = await chromium.launch();
const routes = [
  ['ADM-25', '/admin/articles'], ['ADM-26', '/admin/article-categories'],
  ['ADM-27', '/admin/community'], ['ADM-28', '/admin/community/comments'],
  ['ADM-29', '/admin/community/moderation'], ['ADM-30', '/admin/content/about'],
  ['ADM-31', '/admin/content/team'], ['ADM-32', '/admin/content/population-counter']
];
const report = { status: 'RUNNING', journeys: ['GUIDE-22'], environment: 'local-real-browser-api-mongodb', mockedRoutes: false,
  commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), routes: routes.map(([screenId, route]) => ({ screenId, route })),
  runs: [], sessionsRemoved: false, cleanup: false };
let admin;
let originalSessionIds = [];

try {
  admin = await mongo.collection('users').findOne({ normalizedEmail: 'admin.demo@example.invalid', roleType: 'admin', status: 'verified' });
  assert.ok(admin);
  originalSessionIds = (await mongo.collection('sessions').find({ userId: admin._id }, { projection: { _id: 1 } }).toArray()).map(row => row._id.toHexString());
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  try {
    const login = await context.request.post(`${base}/api/v1/auth/login`, { data: { email: admin.normalizedEmail, password: 'LocalPreview-Admin-Only-2026!' } });
    assert.equal(login.status(), 200);
    const page = await context.newPage();
    for (const [device, viewport] of [['desktop', { width: 1440, height: 1000 }], ['tablet', { width: 834, height: 1112 }], ['mobile', { width: 393, height: 851 }]]) {
      await page.setViewportSize(viewport);
      for (const locale of ['ar', 'en']) {
        const errors = [];
        const onPageError = error => errors.push(error.message);
        page.on('pageerror', onPageError);
        const checks = [];
        for (const [screenId, route] of routes) {
          const apiStatuses = [];
          const listener = response => {
            const url = new URL(response.url());
            if (url.pathname.startsWith('/api/v1/admin/')) apiStatuses.push(response.status());
          };
          page.on('response', listener);
          const response = await page.goto(`${base}${route}?lang=${locale}`, { waitUntil: 'networkidle' });
          assert.equal((await response)?.status(), 200, screenId);
          await expect(page.locator(`[data-screen-id="${screenId}"]`)).toBeVisible();
          page.off('response', listener);
          assert.ok(apiStatuses.length > 0, `${screenId} API request missing`);
          assert.ok(apiStatuses.every(status => status === 200), `${screenId} API ${apiStatuses}`);
          const dimensions = await page.evaluate(() => ({ innerWidth, scrollWidth: document.documentElement.scrollWidth }));
          assert.equal(dimensions.scrollWidth, dimensions.innerWidth, `${screenId} overflow`);
          checks.push({ screenId, documentStatus: 200, apiStatuses, ...dimensions });
          await new Promise(resolve => setTimeout(resolve, 1300));
        }
        page.off('pageerror', onPageError);
        assert.deepEqual(errors, []);
        report.runs.push({ device, locale, status: 'PASS', screens: checks, pageErrors: 0 });
      }
    }
  } finally {
    await context.request.post(`${base}/api/v1/auth/logout`);
    await context.close();
  }
  report.status = 'PASS_LOCAL';
} finally {
  await browser.close();
  if (admin?._id) {
    const original = originalSessionIds.map(id => new Types.ObjectId(id));
    const filter = { userId: admin._id, ...(original.length ? { _id: { $nin: original } } : {}) };
    const created = await mongo.collection('sessions').find(filter, { projection: { _id: 1 } }).toArray();
    if (created.length) {
      await mongo.collection('sessions').deleteMany({ _id: { $in: created.map(row => row._id) }, userId: admin._id });
      await mongo.collection('audit_logs').deleteMany({ targetType: 'auth_session', targetId: { $in: created.map(row => row._id.toHexString()) } });
    }
    report.sessionsRemoved = await mongo.collection('sessions').countDocuments(filter) === 0;
    report.cleanup = report.sessionsRemoved;
  }
  await mongo.close();
  if (report.status === 'RUNNING') report.status = 'FAIL_LOCAL';
  report.finishedAt = new Date().toISOString();
  await writeFile('docs/quality/guide-runs/guide22-admin-content-browser-local-latest.json', `${JSON.stringify(report, null, 2)}\n`);
}

console.log(`GUIDE22_ADMIN_CONTENT_${report.status} runs=${report.runs.length} cleanup=${report.cleanup}`);
