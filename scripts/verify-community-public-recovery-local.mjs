import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import mongoose, { Types } from 'mongoose';
import { chromium, devices, expect } from '@playwright/test';
import { readEnvironmentFile } from './environment-file.mjs';

const localEnvironment = await readEnvironmentFile('.env.local');
const mongoUri = process.env.MONGODB_URI ?? localEnvironment.MONGODB_URI;
const base = process.env.LOCAL_GUIDE_BASE_URL ?? `http://127.0.0.1:${localEnvironment.WEB_PORT ?? '4173'}`;
const passwordCandidates = [...new Set([
  process.env.LOCAL_GUIDE_SEEKER_PASSWORD,
  'LocalGuide04-Only!2026',
  'LocalGuide10-Only!2026',
].filter(Boolean))];
const categoryKeys = ['question', 'experience', 'advice', 'service', 'area', 'property'];
assert.ok(mongoUri, 'Local MongoDB configuration required');
assert.equal(new URL(mongoUri).hostname, '127.0.0.1', 'Local MongoDB required');

const report = {
  status: 'RUNNING', journeys: ['GUIDE-03'], mockedRoutes: false,
  environment: 'local-real-browser-api-mongodb',
  commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  runs: [], temporaryPostRemoved: false, sessionsRemoved: false, cleanup: false,
};
const mongo = await mongoose.createConnection(mongoUri).asPromise();
const browser = await chromium.launch();
let seeker;
let temporaryPostId;
let stage = 'setup';
let originalSessionIds = [];

async function removeNewSessions() {
  if (!seeker) return 0;
  const filter = {
    userId: seeker._id,
    ...(originalSessionIds.length > 0 ? { _id: { $nin: originalSessionIds.map(id => new Types.ObjectId(id)) } } : {}),
  };
  const sessions = await mongo.collection('sessions').find(filter, { projection: { _id: 1 } }).toArray();
  const ids = sessions.map(session => session._id.toHexString());
  if (sessions.length > 0) await mongo.collection('sessions').deleteMany({ _id: { $in: sessions.map(session => session._id) }, userId: seeker._id });
  if (ids.length > 0) await mongo.collection('audit_logs').deleteMany({ targetType: 'auth_session', targetId: { $in: ids } });
  const remaining = await mongo.collection('sessions').countDocuments(filter);
  report.sessionsRemoved = remaining === 0;
  return remaining;
}

try {
  seeker = await mongo.collection('users').findOne(
    { roleType: 'seeker', normalizedEmail: /^guide04-/u, status: 'verified' },
    { sort: { _id: -1 } },
  );
  assert.ok(seeker, 'Existing local GUIDE-04 fixture required');
  originalSessionIds = (await mongo.collection('sessions').find({ userId: seeker._id }, { projection: { _id: 1 } }).toArray())
    .map(session => session._id.toHexString());

  const setupContext = await browser.newContext();
  try {
    stage = 'create-temporary-post';
    for (const password of passwordCandidates) {
      const login = await setupContext.request.post(`${base}/api/v1/auth/login`, {
        data: { email: seeker.normalizedEmail, password },
      });
      if (login.status() === 200) {
        const session = (await login.json()).data;
        const created = await setupContext.request.post(`${base}/api/v1/public/community/posts`, {
          headers: { authorization: `Bearer ${session.accessToken}` },
          data: { title: `Local GUIDE-03 recovery ${randomUUID()}`, body: 'Temporary draft used only for local browser validation.', category: 'question' },
        });
        assert.equal(created.status(), 201);
        temporaryPostId = (await created.json()).data.id;
        assert.ok(Types.ObjectId.isValid(temporaryPostId));
        break;
      }
      assert.equal(login.status(), 401, 'Unexpected fixture login response');
    }
  } finally {
    await setupContext.close();
  }
  assert.ok(temporaryPostId, 'Temporary community post was not created');

  const publicResponse = await fetch(`${base}/api/v1/public/community/posts?page=1&limit=20`);
  assert.equal(publicResponse.status, 200);
  const publicEnvelope = await publicResponse.json();
  const publicData = publicEnvelope.data;
  assert.ok(Array.isArray(publicData.items) && publicData.items.length > 0, 'Seeded published community post required');
  assert.ok(!JSON.stringify(publicData).match(/authorId|internalNotes|status/u), 'Public projection exposed private fields');
  assert.ok(!publicData.items.some(item => item.id === temporaryPostId), 'Draft appeared in public projection');
  const missingCategory = categoryKeys.find(key => !publicData.items.some(item => item.category === key));
  assert.ok(missingCategory, 'A category with no published posts is required for the empty filter check');

  for (const locale of ['ar', 'en']) {
    for (const [device, preset] of [['desktop', 'Desktop Chrome'], ['tablet', 'Galaxy Tab S4'], ['mobile', 'Pixel 5']]) {
      stage = `${locale}/${device}/login`;
      const context = await browser.newContext({ ...devices[preset] });
      try {
        const login = await context.request.post(`${base}/api/v1/auth/login`, {
          data: { email: seeker.normalizedEmail, password: passwordCandidates[0] },
        });
        if (login.status() !== 200) {
          let recoveredLogin;
          for (const password of passwordCandidates.slice(1)) {
            recoveredLogin = await context.request.post(`${base}/api/v1/auth/login`, { data: { email: seeker.normalizedEmail, password } });
            if (recoveredLogin.status() === 200) break;
          }
          assert.equal(recoveredLogin?.status() ?? login.status(), 200, 'Local fixture login failed');
        }
        const page = await context.newPage();
        let postMutations = 0;
        page.on('request', request => {
          if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/v1/public/community/posts') postMutations += 1;
        });

        stage = `${locale}/${device}/success-filter`;
        await page.goto(`${base}/community?lang=${locale}`, { waitUntil: 'networkidle' });
        const cards = page.locator('.public-community__card');
        await expect(cards.first()).toBeVisible();
        const navigationCount = await page.evaluate(() => performance.getEntriesByType('navigation').length);
        const timeOrigin = await page.evaluate(() => performance.timeOrigin);
        await page.locator(`[data-category-filter="${missingCategory}"]`).click();
        const empty = page.locator('.public-community__state[data-state="empty"]');
        await expect(empty).toBeVisible();
        await expect(cards).toHaveCount(0);
        await empty.locator('button').last().click();
        await expect(cards.first()).toBeVisible();
        assert.equal(await page.evaluate(() => performance.timeOrigin), timeOrigin);
        assert.equal(await page.evaluate(() => performance.getEntriesByType('navigation').length), navigationCount);

        stage = `${locale}/${device}/validation`;
        await page.locator('.public-community__intro .ui-button').click();
        const form = page.locator('#community-create-form');
        await expect(form).toBeVisible();
        const submit = page.locator('button[form="community-create-form"]');
        await submit.click();
        await expect(form.locator('.public-community__form-error[role="alert"]')).toBeVisible();
        await page.locator('.public-community__composer-title input').fill('Valid title');
        await page.locator('#community-post-body').fill('   ');
        await submit.click();
        await expect(form.locator('.public-community__form-error[role="alert"]')).toBeVisible();
        assert.equal(postMutations, 0);
        await page.locator('.ui-modal__close').click();

        stage = `${locale}/${device}/empty-page-network-retry`;
        await page.goto(`${base}/community?lang=${locale}&page=999`, { waitUntil: 'networkidle' });
        const pageEmpty = page.locator('.public-community__state[data-state="empty"]');
        await expect(pageEmpty).toBeVisible();
        const outOfRangeTimeOrigin = await page.evaluate(() => performance.timeOrigin);
        const outOfRangeNavigationCount = await page.evaluate(() => performance.getEntriesByType('navigation').length);
        await context.setOffline(true);
        await pageEmpty.locator('button').last().click();
        const retry = page.locator('.public-community__state[data-state="retry"]');
        await expect(retry).toBeVisible();
        await context.setOffline(false);
        const recovered = page.waitForResponse(response => response.request().method() === 'GET'
          && new URL(response.url()).pathname === '/api/v1/public/community/posts'
          && response.status() === 200);
        await retry.locator('button').click();
        await recovered;
        await expect(retry).toHaveCount(0);
        await expect(cards.first()).toBeVisible();
        assert.equal(await page.evaluate(() => performance.timeOrigin), outOfRangeTimeOrigin);
        assert.equal(await page.evaluate(() => performance.getEntriesByType('navigation').length), outOfRangeNavigationCount);
        const geometry = await page.evaluate(() => ({ innerWidth, scrollWidth: document.documentElement.scrollWidth }));
        assert.equal(geometry.innerWidth, page.viewportSize().width);
        assert.ok(geometry.scrollWidth <= geometry.innerWidth);
        report.runs.push({ locale, device, missingCategory, checks: ['public_projection_hides_private_fields', 'empty_category_filter_recovers_without_navigation', 'invalid_post_blocks_mutation', 'out_of_range_page_recovers_to_page_one', 'offline_retry_recovers_without_navigation'], publicHttpStatus: 200, recoveredHttpStatus: 200, postMutations, documentReloaded: false, ...geometry });
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
    if (temporaryPostId && Types.ObjectId.isValid(temporaryPostId)) {
      await mongo.collection('community_comments').deleteMany({ postId: temporaryPostId });
      await mongo.collection('community_reports').deleteMany({ postId: temporaryPostId });
      await mongo.collection('audit_logs').deleteMany({ targetType: 'community_post', targetId: temporaryPostId });
      await mongo.collection('community_posts').deleteOne({ id: temporaryPostId, authorId: seeker?._id.toHexString() });
      report.temporaryPostRemoved = (await mongo.collection('community_posts').countDocuments({ id: temporaryPostId })) === 0;
    }
    await removeNewSessions();
    report.cleanup = report.temporaryPostRemoved && report.sessionsRemoved;
    assert.ok(report.cleanup, 'Temporary post or browser sessions were not cleaned up');
  } catch (error) {
    report.status = 'FAIL_LOCAL';
    report.failure = `${report.failure ? `${report.failure}; ` : ''}cleanup failed${error instanceof Error ? `: ${error.message}` : ''}`;
    process.exitCode = 1;
  } finally {
    await browser.close();
    await mongo.close();
    report.finishedAt = new Date().toISOString();
    await writeFile('docs/quality/guide-runs/community-public-recovery-local-latest.json', `${JSON.stringify(report, null, 2)}\n`);
  }
}

console.log(JSON.stringify({ status: report.status, cases: report.runs.length, temporaryPostRemoved: report.temporaryPostRemoved, sessionsRemoved: report.sessionsRemoved, cleanup: report.cleanup }));
