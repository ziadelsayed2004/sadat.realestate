import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import mongoose from 'mongoose';
import { chromium, webkit, expect } from '@playwright/test';
import { readEnvironmentFile } from './environment-file.mjs';
import { createMongooseAdBannerRepository } from '../apps/api/src/modules/ads/banner-repository.ts';
import { readPublishedBannerRows } from '../apps/api/src/modules/ads/banner-management.ts';

const env = await readEnvironmentFile('.env.local'), uri = new URL(env.MONGODB_URI);
assert(['127.0.0.1', 'localhost'].includes(uri.hostname) && uri.port === '27018');
const db = await mongoose.createConnection(uri.href).asPromise(), base = 'http://127.0.0.1:4173';
const output = '.tmp/cms-settings-followup';
await mkdir(output, { recursive: true });
const report = { status: 'RUNNING', mockedRoutes: false, checks: [], errors: [], cleanup: false };
const savedHero = await db.collection('cms_homepage_sections').findOne({ key: 'hero' });
const savedSettings = await db.collection('ad_settings').find({}).toArray();
const savedPlacements = await db.collection('ad_placements').find({ key: 'homepage.hero' }).toArray();
const fixtureHero = new mongoose.Types.ObjectId(), bannerIds = [], mediaIds = [];
let browser;
async function rateWindow() {
  const response = await fetch(base + '/api/v1/public/bootstrap');
  if (response.status === 429 || Number(response.headers.get('ratelimit-remaining')) < 65) await new Promise(resolve => setTimeout(resolve, 60_000));
}
async function ready(page) {
  await expect(page.locator('[data-auth-resolution=pending]')).toHaveCount(0);
  await expect(page.locator('#site-intro')).toBeHidden();
}
async function noOverflow(page) { assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)); }
try {
  const admin = await db.collection('users').findOne({ normalizedEmail: 'admin.demo@example.invalid' });
  assert(admin);
  const repository = createMongooseAdBannerRepository(db);
  await db.collection('ad_settings').updateOne({}, { $set: { enabled: true, allowedSurfaces: ['homepage'], maxActiveBanners: 100 } }, { upsert: true });
  await db.collection('ad_placements').updateOne({ key: 'homepage.hero' }, { $set: { surface: 'homepage', active: true, sortOrder: 0, allowedLocales: ['ar', 'en'], targetUrlRequired: false } }, { upsert: true });
  await db.collection('cms_homepage_sections').deleteMany({ key: 'hero' });
  for (const [engineName, engine] of [['chromium', chromium], ['webkit', webkit]]) {
    await rateWindow();
    await db.collection('cms_homepage_sections').deleteMany({ _id: fixtureHero });
    await db.collection('cms_homepage_sections').insertOne({ _id: fixtureHero, key: 'hero', title: { en: 'CMS follow-up heading' }, body: { ar: 'Old Arabic description', en: 'Old English description' }, order: 0, status: 'published', visible: true, version: 0, updatedBy: admin._id, createdAt: new Date(), updatedAt: new Date() });
    browser = await engine.launch();
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    const login = await context.request.post(base + '/api/v1/auth/login', { data: { email: 'admin.demo@example.invalid', password: 'LocalPreview-Admin-Only-2026!' } });
    assert.equal(login.status(), 200, await login.text());
    const page = await context.newPage();
    page.on('pageerror', error => report.errors.push({ engine: engineName, error: String(error), url: page.url() }));
    await page.goto(`${base}/admin/content/homepage?contentId=${fixtureHero}&lang=en`); await ready(page);
    const editor = page.getByTestId('admin-home-homepage-editor');
    await expect(editor).toBeVisible();
    for (const locale of ['ar', 'en']) await editor.locator(`#admin-home-homepage-body-${locale}`).fill('');
    await editor.getByLabel('Change reason').fill('Clear outdated homepage description');
    await editor.locator('button[type=submit]').click();
    await expect(editor).toHaveCount(0);
    assert.equal((await db.collection('cms_homepage_sections').findOne({ _id: fixtureHero })).body, undefined);
    const row = page.getByTestId(`admin-home-homepage-${fixtureHero}`);
    for (const value of ['First saved description', 'Second saved description']) {
      await row.getByRole('button', { name: 'Edit', exact: true }).click();
      await editor.locator('#admin-home-homepage-body-en').fill(value);
      await editor.getByLabel('Change reason').fill('Repeated edit with latest version');
      await editor.locator('button[type=submit]').click(); await expect(editor).toHaveCount(0);
      assert.deepEqual((await db.collection('cms_homepage_sections').findOne({ _id: fixtureHero })).body, { en: value });
    }
    await row.getByRole('button', { name: 'Edit', exact: true }).click();
    await editor.locator('#admin-home-homepage-body-en').fill('Preserved unsaved draft');
    await editor.getByLabel('Change reason').fill('Try an outdated editor');
    await db.collection('cms_homepage_sections').updateOne({ _id: fixtureHero }, { $inc: { version: 1 } });
    await editor.locator('button[type=submit]').click();
    await expect(editor.getByRole('alert')).toBeVisible();
    await expect(editor.locator('#admin-home-homepage-body-en')).toHaveValue('Preserved unsaved draft');
    assert.equal((await db.collection('cms_homepage_sections').findOne({ _id: fixtureHero })).body.en, 'Second saved description');
    await page.waitForLoadState('networkidle');
    report.checks.push(`${engineName}: both descriptions cleared in MongoDB; direct-link editor closed; two repeated edits persisted; stale save refused and draft preserved`);

    await page.goto(`${base}/admin/user-guide?lang=ar#guide-settings-reference-display`); await ready(page);
    await expect(page.locator('#guide-settings-reference-display')).toBeVisible();
    await noOverflow(page);
    report.checks.push(`${engineName}: in-app field reference opens at its linked topic`);
    await rateWindow();
    const now = new Date();
    let banner = await repository.createBanner(String(admin._id), { placementKey: 'homepage.hero', title: { en: `Platform banner ${engineName}` }, body: { en: 'General banner description' }, keepOriginalHero: true, targetUrl: 'https://elsadatrealestate.com/', startAt: new Date(now.getTime() - 60_000).toISOString(), endAt: new Date(now.getTime() + 3600_000).toISOString() }, now);
    bannerIds.push(new mongoose.Types.ObjectId(banner.id));
    const images = [];
    for (let index = 0; index < 2; index++) {
      const image = await repository.createBannerMedia(String(admin._id), banner.id, { url: '/assets/canonical/public/home-hero-sadat-city.png', mime: 'image/png', width: 2752, height: 1536 }, now);
      images.push(image); mediaIds.push(new mongoose.Types.ObjectId(image.id));
    }
    banner = await repository.updateBanner(String(admin._id), banner.id, { expectedVersion: banner.version, mediaIds: images.map(image => image.id), reason: 'Prepare image-specific copy verification' }, now);
    await page.goto(`${base}/admin/banners?lang=en`); await ready(page);
    await page.getByTestId(`admin-home-banner-${banner.id}`).getByRole('button', { name: 'Edit', exact: true }).click();
    const bannerEditor = page.getByTestId('admin-home-banner-editor');
    await expect(bannerEditor.getByTestId('banner-saved-image')).toHaveCount(2);
    const details = bannerEditor.locator('.admin-home__slide-copy details');
    for (let index = 0; index < 2; index++) {
      await details.nth(index).locator('summary').click();
      await details.nth(index).getByLabel('Image title — English').fill(`Company ${index + 1} ${engineName}`);
      await details.nth(index).getByLabel('Image title — العربية').fill(`إعلان الشركة ${index + 1}`);
      await details.nth(index).getByLabel('Image description — English').fill(`Independent description ${index + 1}`);
      await details.nth(index).getByLabel('Destination for this image (optional)').fill(`https://elsadatrealestate.com/properties?image=${index + 1}`);
    }
    const preview = page.getByRole('complementary', { name: 'Banner preview before publishing' });
    await expect(preview).toContainText(`Company 1 ${engineName}`);
    await preview.getByRole('button', { name: 'Next image' }).click();
    await expect(preview).toContainText(`Company 2 ${engineName}`);
    await expect(preview).toContainText('Independent description 2');
    await expect(preview).toContainText('https://elsadatrealestate.com/properties?image=2');
    await preview.getByRole('button', { name: 'Phone view' }).click();
    await expect(preview.locator('.admin-home__draft-preview-frame > img')).toHaveCSS('object-fit', 'cover');
    await preview.screenshot({ path: `${output}/${engineName}-live-preview.png` });
    await bannerEditor.locator('#admin-home-banner-reason').fill('Save separate company slides');
    await bannerEditor.locator('button[type=submit]').click();
    await expect(bannerEditor.locator('[data-tone=success]')).toBeVisible();
    await page.waitForLoadState('networkidle');
    const stored = await db.collection('ad_banners').findOne({ _id: new mongoose.Types.ObjectId(banner.id) });
    assert.equal(stored.slides.length, 2); assert.equal(stored.slides[1].title.en, `Company 2 ${engineName}`);
    banner = await repository.updateBanner(String(admin._id), banner.id, { expectedVersion: stored.version, status: 'active', reason: 'Publish verified independent slides' }, new Date());
    const rows = (await readPublishedBannerRows(db)).filter(row => String(row._id) === banner.id);
    assert.deepEqual(rows.map(row => row.body.en), ['Independent description 1', 'Independent description 2']);
    assert.equal(rows[1].targetUrl, 'https://elsadatrealestate.com/properties?image=2');
    await assert.rejects(repository.updateBanner(String(admin._id), banner.id, { expectedVersion: banner.version, slides: [{ mediaId: new mongoose.Types.ObjectId().toString(), title: { en: 'Unselected' } }], reason: 'Invalid media override' }, new Date()));
    report.checks.push(`${engineName}: two live image previews, independent text and links saved and publicly projected; unrelated media override refused; original platform introduction retained`);
    await rateWindow();
    for (const width of [390, 820, 1440]) {
      await page.setViewportSize({ width, height: 950 });
      await page.goto(`${base}/?lang=en&heroAd=${banner.id}`); await ready(page);
      const hero = page.locator('#homepage-hero'), photo = hero.locator('.public-homepage__hero-image[data-active]');
      await expect(hero.getByRole('heading', { level: 1 })).toHaveText(`Company 1 ${engineName}`);
      await expect(hero.getByRole('link', { name: 'View advertisement' })).toHaveAttribute('href', 'https://elsadatrealestate.com/properties?image=1');
      await expect(photo).toBeVisible();
      await page.waitForFunction(() => [...document.querySelectorAll('.public-homepage__hero-image')].some(image => !image.hidden && image.complete && image.naturalWidth > 0));
      const geometry = await photo.evaluate(image => ({ width: image.clientWidth, height: image.clientHeight, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight, fit: getComputedStyle(image).objectFit }));
      if (width === 390) { assert.equal(geometry.fit, 'cover'); const picture = await hero.locator('.public-homepage__hero-picture').boundingBox(), visual = await hero.locator('.public-homepage__hero-visual').boundingBox(); assert(Math.abs(picture.height - visual.height) < 1); assert(visual.height >= 700); }
      else { const picture = await hero.locator('.public-homepage__hero-picture').boundingBox(), container = await hero.locator('.public-homepage__hero-visual').boundingBox(); assert(Math.abs(picture.height - container.height) < 1); }
      await noOverflow(page);
      await page.screenshot({ path: `${output}/${engineName}-home-${width}.png` });
      await hero.getByRole('button', { name: 'Next image', exact: true }).click();
      await expect(hero.getByRole('heading', { level: 1 })).toHaveText(`Company 2 ${engineName}`);
      await expect(hero.getByRole('link', { name: 'View advertisement' })).toHaveAttribute('href', 'https://elsadatrealestate.com/properties?image=2');
      await page.waitForLoadState('networkidle');
    }
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 950 });
      await page.goto(`${base}/?lang=ar&heroAd=${banner.id}`); await ready(page);
      await expect(page.locator('#homepage-hero h1')).toHaveText('إعلان الشركة 1');
      await expect(page.locator('#homepage-hero')).toHaveAttribute('aria-labelledby', 'public-homepage-hero-title');
      await noOverflow(page);
      await page.screenshot({ path: `${output}/${engineName}-home-ar-${width}.png` });
      await page.waitForLoadState('networkidle');
    }
    report.checks.push(`${engineName}: phone photograph fills the viewport behind its copy, full-height desktop/tablet photograph, independently rotating copy/links; no overflow at 390/820/1440 and Arabic RTL verified at 390/1440`);
    await browser.close(); browser = undefined;
    await db.collection('ad_banners').updateOne({ _id: new mongoose.Types.ObjectId(banner.id) }, { $set: { status: 'draft' } });
  }
  assert.deepEqual(report.errors, []); report.status = 'PASS_LOCAL';
} catch (error) { report.status = 'FAIL_LOCAL'; report.error = error.stack; process.exitCode = 1; }
finally {
  if (browser) await browser.close();
  await db.collection('cms_homepage_sections').deleteMany({ _id: fixtureHero });
  if (savedHero) await db.collection('cms_homepage_sections').insertOne(savedHero);
  await db.collection('ad_banners').deleteMany({ _id: { $in: bannerIds } });
  await db.collection('ad_banner_media').deleteMany({ _id: { $in: mediaIds } });
  await db.collection('ad_settings').deleteMany({}); if (savedSettings.length) await db.collection('ad_settings').insertMany(savedSettings);
  await db.collection('ad_placements').deleteMany({ key: 'homepage.hero' }); if (savedPlacements.length) await db.collection('ad_placements').insertMany(savedPlacements);
  await db.close(); report.cleanup = true;
  await writeFile('docs/quality/guide-runs/cms-settings-followup-local-latest.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
}
