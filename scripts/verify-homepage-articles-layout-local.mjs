import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import mongoose from 'mongoose';
import { chromium, webkit, expect as baseExpect } from '@playwright/test';

const env = Object.fromEntries((await readFile('.env.local', 'utf8')).split(/\r?\n/).filter(line => line.includes('=') && !line.startsWith('#')).map(line => { const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1).replace(/^['"]|['"]$/g, '')]; }));
const uri = new URL(env.MONGODB_URI); assert(['localhost', '127.0.0.1'].includes(uri.hostname) && uri.port === '27018');
const db = await mongoose.createConnection(uri.href).asPromise(), collection = db.collection('cms_homepage_sections'), previous = await collection.findOne({ key: 'articles' });
const owner = new mongoose.Types.ObjectId(), id = previous?._id ?? new mongoose.Types.ObjectId(), root = '.tmp/home-articles', base = 'http://127.0.0.1:4173';
const engines = [await chromium.launch(), await webkit.launch()], expect = baseExpect.configure({ timeout: 20000 });
const report = { status: 'FAIL_LOCAL', mockedResponses: false, geometry: [], browserErrors: [], cleanup: false }; let lastPage;
await mkdir(root, { recursive: true });
async function rateWindow() {
  const response = await fetch(base + '/api/v1/public/bootstrap');
  if (response.status === 429 || Number(response.headers.get('ratelimit-remaining')) < 20) { const seconds = Math.min(60, Math.max(1, Number(response.headers.get('retry-after') ?? response.headers.get('ratelimit-reset') ?? 60))); console.log('HOME_ARTICLES_RATE_PAUSE', seconds); await new Promise(resolve => setTimeout(resolve, seconds * 1000)); }
}
try {
  await collection.updateOne({ _id: id }, { $set: { key: 'articles', title: { ar: 'اهلا بيك', en: 'Welcome' }, body: { ar: 'نورت', en: 'Explore our latest property guides.' }, order: 12, visible: true, status: 'published', updatedBy: owner, updatedAt: new Date(), version: previous?.version ?? 0 }, $setOnInsert: { createdAt: new Date() } }, { upsert: true });
  for (const engine of engines) {
    for (const [variant, locale, width] of [['short', 'ar', 320], ['short', 'en', 390], ['short', 'ar', 768], ['short', 'en', 1024], ['short', 'ar', 1440], ['short', 'en', 1920], ['long', 'ar', 320], ['long', 'en', 1920], ['none', 'ar', 1440]]) {
      await rateWindow();
      const title = variant === 'long' ? { ar: 'عنوانمتصل'.repeat(30), en: 'LongUnbrokenHeading'.repeat(15) } : { ar: 'اهلا بيك', en: 'Welcome' };
      const body = variant === 'long' ? { ar: 'وصفطويلمتصل'.repeat(60), en: 'LongUnbrokenDescription'.repeat(30) } : { ar: 'نورت', en: 'Explore our latest property guides.' };
      await collection.updateOne({ _id: id, updatedBy: owner }, { $set: { title, ...(variant === 'none' ? {} : { body }) }, ...(variant === 'none' ? { $unset: { body: '' } } : {}) });
      const context = await engine.newContext({ viewport: { width, height: 1000 } }), page = await context.newPage(); lastPage = page;
      page.on('pageerror', error => report.browserErrors.push(String(error)));
      try {
        await page.goto(`${base}/?lang=${locale}`, { waitUntil: 'domcontentloaded' }); await expect(page.locator('#site-intro')).toBeHidden(); await expect(page.locator('[data-auth-resolution=pending]')).toHaveCount(0); await page.waitForLoadState('networkidle'); await page.evaluate(() => document.fonts.ready);
        const section = page.locator('.public-homepage__section--article'); await section.scrollIntoViewIfNeeded(); await expect(section.locator('h2')).toHaveText(title[locale]); await expect(section.locator('.public-homepage__section-description')).toHaveCount(variant === 'none' ? 0 : 1);
        const geometry = await section.evaluate(element => {
          const rect = node => { const r = node.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height }; };
          const heading = element.querySelector('.public-homepage__section-heading'), description = element.querySelector(':scope > .public-homepage__section-description'), grid = element.querySelector('.public-homepage__content-grid'), cards = [...grid.querySelectorAll('.public-homepage__content-card')];
          return { viewport: innerWidth, document: document.documentElement.scrollWidth, section: rect(element), heading: rect(heading), headingText: rect(heading.firstElementChild), action: rect(heading.querySelector('a')), description: description ? rect(description) : null, grid: rect(grid), cards: cards.map(card => ({ ...rect(card), media: rect(card.querySelector('.public-homepage__article-media')), meta: rect(card.querySelector('.public-homepage__article-meta') ?? card.querySelector('.public-homepage__article-body > a')), fit: getComputedStyle(card.querySelector('.public-homepage__article-media > img') ?? card.querySelector('.public-homepage__article-media > span')).objectFit })), nextTop: element.nextElementSibling.getBoundingClientRect().top };
        });
        assert(geometry.document <= width + 1, JSON.stringify(geometry)); assert(geometry.cards.length >= 3);
        assert(geometry.action.right <= geometry.headingText.left + 1 || geometry.headingText.right <= geometry.action.left + 1);
        assert(geometry.grid.top - (geometry.description?.bottom ?? geometry.heading.bottom) >= 12); assert(geometry.grid.top - (geometry.description?.bottom ?? geometry.heading.bottom) <= 32);
        if (geometry.description) assert(geometry.description.top - geometry.heading.bottom >= 8 && geometry.description.top - geometry.heading.bottom <= 24);
        assert(geometry.cards.every(card => card.bottom <= geometry.section.bottom - 12 && card.meta.bottom <= card.bottom && card.left >= geometry.section.left - 1 && card.right <= geometry.section.right + 1 && Math.abs(card.media.width / card.media.height - 16 / 9) < .02));
        assert(geometry.nextTop >= geometry.section.bottom - 1);
        const firstRow = geometry.cards.filter(card => Math.abs(card.top - geometry.cards[0].top) < 1); assert(Math.max(...firstRow.map(card => card.height)) - Math.min(...firstRow.map(card => card.height)) < 2);
        report.geometry.push({ engine: engine.browserType().name(), variant, locale, ...geometry });
        await section.screenshot({ path: `${root}/articles-${engine.browserType().name()}-${variant}-${locale}-${width}.png` });
      } finally { await page.waitForLoadState('networkidle').catch(() => {}); await context.close(); }
    }
  }
  assert.deepEqual(report.browserErrors, []); report.status = 'PASS_LOCAL';
} catch (error) { report.error = String(error.stack ?? error); process.exitCode = 1; if (lastPage && !lastPage.isClosed()) await lastPage.screenshot({ path: `${root}/failure.png` }); }
finally {
  if (previous) await collection.replaceOne({ _id: id, updatedBy: owner }, previous); else await collection.deleteOne({ _id: id, updatedBy: owner });
  assert.deepEqual(await collection.findOne({ _id: id }), previous);
  report.cleanup = true; await db.close(); for (const engine of engines) await engine.close(); await writeFile('docs/quality/guide-runs/homepage-articles-layout-local-latest.json', JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify({ status: report.status, cases: report.geometry.length, browserErrors: report.browserErrors, cleanup: report.cleanup, ...(report.error ? { error: report.error } : {}) }));
}
