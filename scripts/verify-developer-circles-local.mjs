import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import mongoose from 'mongoose';
import { chromium, webkit, expect } from '@playwright/test';

const env = Object.fromEntries((await readFile('.env.local', 'utf8')).split(/\r?\n/).filter(line => line.includes('=') && !line.startsWith('#')).map(line => { const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1).replace(/^['"]|['"]$/g, '')]; }));
const uri = new URL(env.MONGODB_URI);
assert(['localhost', '127.0.0.1'].includes(uri.hostname) && uri.port === '27018', 'Local fixtures only');
const db = await mongoose.createConnection(uri.href).asPromise();
const base = 'http://127.0.0.1:4173', prefix = `local-circle-${Date.now()}`, at = new Date();
const logo = '/assets/sadat-real-estate-logo.png', cover = '/assets/canonical/public/home-hero-sadat-city.png';
const fixtures = [
  { key: 'both', imageUrl: cover, logoUrl: logo, expected: logo },
  { key: 'cover', imageUrl: cover, expected: cover },
  { key: 'none', expected: logo },
  { key: 'broken-logo', imageUrl: cover, logoUrl: '/assets/qa-missing-logo.png', expected: cover },
  { key: 'broken-both', imageUrl: '/assets/qa-missing-cover.png', logoUrl: '/assets/qa-missing-logo.png', expected: logo }
].map(item => ({ ...item, userId: new mongoose.Types.ObjectId(), profileId: new mongoose.Types.ObjectId(), orgId: new mongoose.Types.ObjectId(), slug: `${prefix}-${item.key}` }));
const report = { status: 'FAIL_LOCAL', mockedResponses: false, geometry: [], browserErrors: [] };
const browsers = [], contexts = [];
let lastPage;
await mkdir('.tmp/developer-circles', { recursive: true });
try {
  for (const item of fixtures) {
    await db.collection('users').insertOne({ _id: item.userId, roleType: 'provider', status: 'verified', normalizedEmail: `${item.slug}@example.invalid`, locale: 'ar', version: 0, createdAt: at, updatedAt: at });
    await db.collection('provider_profiles').insertOne({ _id: item.profileId, userId: item.userId, providerType: 'developer_company', status: 'approved', version: 0, createdAt: at, updatedAt: at });
    await db.collection('provider_applications').insertOne({ userId: item.userId, providerType: 'developer_company', status: 'approved', requirementVersion: '2026-08-13.1', version: 0, createdAt: at, updatedAt: at });
    await db.collection('organizations').insertOne({ _id: item.orgId, providerId: item.profileId, kind: 'developer_company', status: 'approved', slug: item.slug, name: { ar: item.slug, en: item.slug }, ...(item.imageUrl ? { imageUrl: item.imageUrl } : {}), ...(item.logoUrl ? { logoUrl: item.logoUrl } : {}), createdAt: at, updatedAt: at });
  }
  for (const engine of [chromium, webkit]) {
    const browser = await engine.launch(); browsers.push(browser);
    for (const [locale, width] of [['ar', 320], ['en', 390], ['ar', 1440]]) {
      const rate = await fetch(base + '/api/v1/public/bootstrap');
      if (rate.status === 429 || Number(rate.headers.get('ratelimit-remaining')) < 20) { console.log('LOCAL_RATE_WINDOW'); await new Promise(resolve => setTimeout(resolve, 60000)); }
      const context = await browser.newContext({ viewport: { width, height: 1000 } }); contexts.push(context);
      const page = await context.newPage(); lastPage = page;
      page.on('pageerror', error => report.browserErrors.push(String(error)));
      await page.goto(base + `/developers?search=${prefix}&lang=${locale}`);
      await expect(page.locator('#site-intro')).toBeHidden();
      await expect(page.locator('.public-developer-directory__card')).toHaveCount(fixtures.length);
      await page.evaluate(() => document.fonts.ready);
      for (const item of fixtures) {
        const card = page.locator('.public-developer-directory__card').filter({ has: page.locator(`h2 a[href*="/${item.slug}?"]`) });
        const circle = card.locator('.public-developer-directory__card-logo');
        await circle.scrollIntoViewIfNeeded();
        await expect(circle.locator('img')).toHaveAttribute('src', item.expected);
        await expect.poll(() => circle.locator('img').evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
        const geometry = await circle.evaluate(element => {
          const r = element.getBoundingClientRect(), media = element.parentElement.getBoundingClientRect();
          return { width: r.width, height: r.height, borderRadius: getComputedStyle(element).borderRadius, fit: getComputedStyle(element.querySelector('img')).objectFit, contained: r.left >= media.left && r.right <= media.right && r.top >= media.top && r.bottom <= media.bottom };
        });
        assert.equal(geometry.width, geometry.height); assert(geometry.width >= 48 && geometry.width <= 68);
        assert.equal(geometry.borderRadius, '50%'); assert.equal(geometry.fit, item.expected === cover ? 'cover' : 'contain'); assert(geometry.contained);
        report.geometry.push({ engine: engine.name(), locale, viewport: width, case: item.key, ...geometry });
      }
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.screenshot({ path: `.tmp/developer-circles/${engine.name()}-${locale}-${width}.png`, fullPage: true });
      await context.close();
    }
  }
  assert.deepEqual(report.browserErrors, []); report.status = 'PASS_LOCAL';
} catch (error) {
  process.exitCode = 1; report.error = String(error.stack ?? error);
  if (lastPage && !lastPage.isClosed()) { await lastPage.screenshot({ path: '.tmp/developer-circles/failure.png', fullPage: true }); await writeFile('.tmp/developer-circles/failure.txt', await lastPage.locator('body').innerText()); }
} finally {
  for (const context of contexts) await context.close().catch(() => {});
  const userIds = fixtures.map(item => item.userId);
  for (const name of ['provider_applications', 'provider_profiles']) await db.collection(name).deleteMany({ userId: { $in: userIds } });
  await db.collection('users').deleteMany({ _id: { $in: userIds } });
  await db.collection('organizations').deleteMany({ _id: { $in: fixtures.map(item => item.orgId) } });
  await db.close(); for (const browser of browsers) await browser.close();
  report.cleanup = true;
  await writeFile('docs/quality/guide-runs/developer-circles-local-latest.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
}
