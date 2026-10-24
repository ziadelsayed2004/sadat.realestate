import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import mongoose from 'mongoose';
import { chromium, webkit, expect } from '@playwright/test';
import { readEnvironmentFile } from './environment-file.mjs';
import { createMongooseAdBannerRepository } from '../apps/api/src/modules/ads/banner-repository.ts';

const env = await readEnvironmentFile('.env.local'), uri = new URL(env.MONGODB_URI);
assert(['127.0.0.1', 'localhost'].includes(uri.hostname) && uri.port === '27018');
const db = await mongoose.createConnection(uri.href).asPromise(), base = 'http://127.0.0.1:4173';
const output = '.tmp/public-carousels'; await mkdir(output, { recursive: true });
const report = { status: 'RUNNING', mockedRoutes: false, checks: [], errors: [], cleanup: false };
const settings = await db.collection('ad_settings').find({}).toArray();
const placements = await db.collection('ad_placements').find({ key: { $in: ['homepage.hero', 'homepage.featured'] } }).toArray();
const user = new mongoose.Types.ObjectId(), profile = new mongoose.Types.ObjectId(), application = new mongoose.Types.ObjectId(), organization = new mongoose.Types.ObjectId();
const banners = [], media = [], now = new Date(); let browser;
const copy = (ar, en) => ({ ar, en });
try {
  await db.collection('users').insertOne({ _id: user, roleType: 'provider', status: 'verified', deletedAt: null });
  await db.collection('provider_profiles').insertOne({ _id: profile, userId: user, status: 'approved', providerType: 'developer_company' });
  await db.collection('provider_applications').insertOne({ _id: application, userId: user, status: 'approved', providerType: 'developer_company', displayName: 'Carousel verification' });
  await db.collection('organizations').insertOne({ _id: organization, providerId: user, status: 'approved', kind: 'developer_company', slug: `carousel-${user}`, name: copy('شركة اختبار العرض', 'Carousel verification company') });
  await db.collection('ad_settings').updateOne({}, { $set: { enabled: true, allowedSurfaces: ['homepage'], maxActiveBanners: 100 } }, { upsert: true });
  for (const key of ['homepage.hero', 'homepage.featured']) await db.collection('ad_placements').updateOne({ key }, { $set: { surface: 'homepage', active: true, sortOrder: key === 'homepage.hero' ? 0 : 1, allowedLocales: ['ar', 'en'], targetUrlRequired: false } }, { upsert: true });
  const repository = createMongooseAdBannerRepository(db);
  async function create(key, title, imageUrl, extra = {}) {
    let banner = await repository.createBanner(String(user), { placementKey: key, title, body: copy('تفاصيل الإعلان تظهر بوضوح أثناء التقليب.', 'Clear advertisement details during rotation.'), displaySeconds: 60, startAt: new Date(now.getTime() - 60_000).toISOString(), endAt: new Date(now.getTime() + 3600_000).toISOString(), ...extra }, now);
    banners.push(new mongoose.Types.ObjectId(banner.id));
    const picture = await repository.createBannerMedia(String(user), banner.id, { url: imageUrl, mime: 'image/png', width: 1200, height: 400 }, now); media.push(new mongoose.Types.ObjectId(picture.id));
    banner = await repository.updateBanner(String(user), banner.id, { expectedVersion: banner.version, mediaIds: [picture.id], status: 'active', reason: 'Verify real carousel layout and motion' }, now);
    return banner;
  }
  const heroA = await create('homepage.hero', copy('البانر الأول', 'First hero'), '/assets/canonical/public/home-hero-sadat-city.png');
  await create('homepage.hero', copy('البانر الثاني', 'Second hero'), '/assets/canonical/public/listing-property-home.png');
  const featured = { advertiserProviderId: String(user), destination: { kind: 'organization', id: String(organization) }, highlight: copy('اختيار مناسب لعقارك', 'Find your next property'), ctaLabel: copy('شاهد التفاصيل', 'View details') };
  const cardA = await create('homepage.featured', copy('إعلان أول', 'First promotion'), '/assets/canonical/public/home-hero-sadat-city.png', { featured });
  await create('homepage.featured', copy('إعلان بعنوان طويل لاختبار ثبات ارتفاع القسم أثناء الانتقال بين الصور المختلفة', 'A considerably longer second promotion title to verify stable slide dimensions'), '/assets/sadat-real-estate-logo.png', { featured, body: copy('تفاصيل أطول للشركة واختيارات العقارات ومواعيد التواصل مع الإدارة.'.repeat(7), 'Longer company information, property options and contact times. '.repeat(9)) });
  for (const [name, engine] of [['chromium', chromium], ['webkit', webkit]]) {
    browser = await engine.launch();
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage(); page.on('pageerror', error => report.errors.push({ engine: name, error: String(error) }));
    for (const locale of ['ar', 'en']) for (const width of [390, 820, 1440]) {
      const response = await fetch(base + '/api/v1/public/bootstrap');
      if (response.status === 429 || Number(response.headers.get('ratelimit-remaining')) < 25) await new Promise(resolve => setTimeout(resolve, 60_000));
      await page.setViewportSize({ width, height: 844 });
      await page.goto(`${base}/?lang=${locale}&heroAd=${heroA.id}&featuredAd=${cardA.id}`);
      await expect(page.locator('#site-intro')).toBeHidden();
      const hero = page.locator('#homepage-hero'), section = page.locator('#homepage-featured');
      const card = section.locator('.public-homepage__banner-card');
      await expect(hero.locator('h1')).toHaveText(locale === 'ar' ? 'البانر الأول' : 'First hero');
      await expect(section.locator('h2')).toHaveText(locale === 'ar' ? 'إعلان أول' : 'First promotion');
      const previous = section.getByRole('button', { name: locale === 'ar' ? 'الإعلان السابق' : 'Previous banner' });
      const next = section.getByRole('button', { name: locale === 'ar' ? 'الإعلان التالي' : 'Next banner' });
      const before = await card.boundingBox(), previousRect = await previous.boundingBox(), nextRect = await next.boundingBox();
      assert(Math.abs(previousRect.x - nextRect.x) > before.width * .6);
      assert(locale === 'ar' ? previousRect.x > nextRect.x : previousRect.x < nextRect.x);
      assert.equal(await section.locator('.public-homepage__banner-slide').evaluate(node => getComputedStyle(node).animationName), 'featured-slide-in');
      await next.click();
      await expect(section.locator('h2')).not.toHaveText(locale === 'ar' ? 'إعلان أول' : 'First promotion');
      assert(Math.abs((await card.boundingBox()).height - before.height) < 1);
      const dot = section.getByRole('button', { name: locale === 'ar' ? 'الإعلان 1' : 'Slide 1', exact: true });
      await dot.click(); await expect(dot).toHaveAttribute('aria-pressed', 'true');
      await expect(section.locator('h2')).toHaveText(locale === 'ar' ? 'إعلان أول' : 'First promotion');
      await card.screenshot({ animations: 'disabled', path: `${output}/${name}-${locale}-${width}-featured.png` });
      const heroPhoto = hero.locator('.public-homepage__hero-image[data-active]');
      await page.waitForFunction(() => document.querySelector('.public-homepage__hero-image[data-active]')?.naturalWidth > 0);
      await heroPhoto.evaluate(image => Promise.all(image.getAnimations().map(animation => animation.finished)));
      const visual = await hero.locator('.public-homepage__hero-visual').boundingBox(), image = await heroPhoto.boundingBox();
      if (width === 390) { assert(visual.height >= 844 - 90); assert(Math.abs(image.width - width) < 1); assert(Math.abs(image.height - visual.height) < 1); }
      await hero.getByRole('button', { name: locale === 'ar' ? 'الصورة التالية' : 'Next image', exact: true }).click();
      await expect(hero.locator('h1')).toHaveText(locale === 'ar' ? 'البانر الثاني' : 'Second hero');
      await expect(hero.locator('.public-homepage__hero-image[data-active]')).toHaveCSS('animation-name', 'hero-image-in');
      const target = await hero.locator('.public-homepage__hero-visual').boundingBox(); assert(Math.abs(visual.height - target.height) < 1);
      const heroDot = hero.getByRole('button', { name: locale === 'ar' ? 'صورة 1' : 'Image 1', exact: true });
      await heroDot.focus(); await page.keyboard.press('Enter');
      await expect(hero.locator('h1')).toHaveText(locale === 'ar' ? 'البانر الأول' : 'First hero');
      await expect(heroDot).toBeFocused();
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ animations: 'disabled', path: `${output}/${name}-${locale}-${width}-hero.png` });
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await page.waitForLoadState('networkidle');
      report.checks.push(`${name} ${locale} ${width}: stable featured/hero heights, arrows on opposite sides with correct direction, selected pagination, smooth animation and no page overflow`);
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(page.locator('.public-homepage__banner-slide')).toHaveCSS('animation-name', 'none');
    await expect(page.locator('.public-homepage__hero-image[data-active]')).toHaveCSS('animation-name', 'none');
    await browser.close(); browser = undefined;
  }
  assert.deepEqual(report.errors, []); report.status = 'PASS_LOCAL';
} catch (error) { report.status = 'FAIL_LOCAL'; report.error = error.stack; process.exitCode = 1; }
finally {
  if (browser) await browser.close();
  await db.collection('ad_banners').deleteMany({ _id: { $in: banners } }); await db.collection('ad_banner_media').deleteMany({ _id: { $in: media } });
  for (const [collection, id] of [['users', user], ['provider_profiles', profile], ['provider_applications', application], ['organizations', organization]]) await db.collection(collection).deleteOne({ _id: id });
  await db.collection('ad_settings').deleteMany({}); if (settings.length) await db.collection('ad_settings').insertMany(settings);
  await db.collection('ad_placements').deleteMany({ key: { $in: ['homepage.hero', 'homepage.featured'] } }); if (placements.length) await db.collection('ad_placements').insertMany(placements);
  await db.close(); report.cleanup = true;
  await writeFile('docs/quality/guide-runs/public-carousels-local-latest.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
}
