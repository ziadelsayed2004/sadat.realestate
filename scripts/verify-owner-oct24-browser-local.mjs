import assert from 'node:assert/strict';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import mongoose from 'mongoose';
import sharp from 'sharp';
import { chromium, webkit, expect } from '@playwright/test';
import { createArgon2PasswordHasher } from '../apps/api/src/modules/auth/crypto.ts';
import { deliverDueIdentityNotifications } from '../apps/api/src/modules/provider/subscription-notifications.ts';
import { readEnvironmentFile } from './environment-file.mjs';

const env = await readEnvironmentFile('.env.local'), uri = new URL(env.MONGODB_URI);
assert(['127.0.0.1', 'localhost'].includes(uri.hostname) && uri.port === '27018');
const db = await mongoose.createConnection(uri.href).asPromise(), base = 'http://127.0.0.1:4173';
const suffix = Date.now(), output = '.tmp/owner-oct24-browser';
const report = { status: 'RUNNING', mockedRoutes: false, checks: [], browserErrors: [], cleanup: false };
const banners = [], users = [], photos = [], keys = [], properties = [], categories = [], articles = [];
const storageRoot = path.resolve(env.PRIVATE_STORAGE_LOCAL_ROOT || path.join(os.tmpdir(), 'sadat-real-estate-private-storage'));
let browser, bannerSettingsBefore, contactBefore, placementsBefore;
await mkdir(output, { recursive: true });
async function rateWindow() {
  const response = await fetch(base + '/api/v1/public/bootstrap');
  if (response.status === 429 || Number(response.headers.get('ratelimit-remaining')) < 65) await new Promise(resolve => setTimeout(resolve, 60_000));
}
async function login(context, email = 'admin.demo@example.invalid', password = 'LocalPreview-Admin-Only-2026!') {
  const response = await context.request.post(base + '/api/v1/auth/login', { data: { email, password } });
  assert.equal(response.status(), 200, await response.text()); return (await response.json()).data.accessToken;
}
async function ready(page) { await expect(page.locator('[data-auth-resolution=pending]')).toHaveCount(0); await expect(page.locator('#site-intro')).toBeHidden(); }
async function noOverflow(page) { assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)); }
try {
  placementsBefore = await db.collection('ad_placements').find({ key: { $in: ['homepage.hero', 'homepage.featured'] } }).toArray();
  bannerSettingsBefore = await db.collection('ad_settings').find({}).toArray();
  await db.collection('ad_settings').updateMany({}, { $set: { enabled: true, allowedSurfaces: ['homepage'], maxActiveBanners: 100 } });
  contactBefore = await db.collection('admin_settings').findOne({ namespace: 'contact' });
  await db.collection('admin_settings').updateOne({ namespace: 'contact' }, { $set: { 'values.whatsapp_number': '+201012345678', updatedAt: new Date() } }, { upsert: true });
  const category = new mongoose.Types.ObjectId(), article = new mongoose.Types.ObjectId(); categories.push(category); articles.push(article);
  await db.collection('article_categories').insertOne({ _id: category, slug: `oct24-category-${suffix}`, name: { en: 'Local verification category' }, active: true });
  await db.collection('articles').insertOne({ _id: article, categoryId: category, slug: `oct24-article-${suffix}`, title: { en: 'Verified homepage article', ar: 'مقال تحقق حقيقي' }, body: { en: 'Published locally for homepage verification.', ar: 'مقال منشور محليًا لاختبار الرئيسية.' }, status: 'published', publishedAt: new Date(Date.now() + 60_000), updatedAt: new Date() });
  for (const [name, engine] of [['chromium', chromium], ['webkit', webkit]]) {
    await rateWindow(); browser = await engine.launch();
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    let token = await login(context);
    const page = await context.newPage(); page.on('pageerror', error => report.browserErrors.push({ message: String(error), stack: error.stack, url: page.url() }));
    page.on('response', response => { if (new URL(response.url()).pathname === '/api/v1/auth/refresh' && response.status() === 200) void response.json().then(body => { token = body.data.accessToken; }); });
    await page.goto(base + '/admin/banners/new?lang=en'); await ready(page);
    const setup = page.getByRole('button', { name: 'Prepare and enable banner position' });
    if (!await db.collection('ad_placements').findOne({ key: 'homepage.hero', active: true })) { await expect(setup).toBeVisible(); await setup.click(); await expect(setup).toHaveCount(0); }
    const preview = page.getByRole('complementary', { name: 'Banner preview before publishing' });
    await expect(preview).toBeVisible();
    const writes = [];
    const listener = request => { if (new URL(request.url()).pathname.startsWith('/api/v1/admin/banners') && request.method() !== 'GET') writes.push(request.url()); };
    page.on('request', listener);
    await page.locator('#admin-home-banner-title-en').fill(`Owner preview ${name}`);
    await page.locator('#admin-home-banner-body-en').fill('Real preview before publication');
    const buffer = await sharp({ create: { width: 1200, height: 400, channels: 3, background: '#d4a33d' } }).png().toBuffer();
    await page.locator('#admin-home-banner-file').setInputFiles({ name: 'owner-preview.png', mimeType: 'image/png', buffer });
    await expect(preview.locator('img')).toHaveAttribute('src', /^blob:/);
    await expect(preview.getByRole('heading', { level: 4 })).toHaveText(`Owner preview ${name}`);
    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: 950 }); await noOverflow(page);
      await preview.screenshot({ path: `${output}/${name}-preview-${width}.png` });
    }
    await preview.getByRole('button', { name: 'Phone view' }).click();
    await expect(preview.locator('[data-mobile=true]')).toBeVisible();
    await preview.getByRole('button', { name: 'Preview original introduction' }).click();
    await expect(preview.getByRole('heading', { level: 4 })).toContainText('Find your property');
    await preview.getByRole('button', { name: 'Preview advertisement' }).click();
    assert.equal(writes.length, 0, 'Draft preview must not create, upload or publish anything'); page.off('request', listener);
    const today = new Date(), tomorrow = new Date(Date.now() + 86400_000);
    const cairo = date => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
    await page.locator('#admin-home-banner-start').fill(cairo(today));
    await page.locator('#admin-home-banner-end').fill(cairo(tomorrow));
    await page.locator('#admin-home-banner-start-time').fill('00:00');
    await page.locator('#admin-home-banner-end-time').fill('23:59');
    await page.locator('#admin-home-banner-reason').fill('Owner banner local verification');
    const [created] = await Promise.all([page.waitForResponse(response => new URL(response.url()).pathname === '/api/v1/admin/banners' && response.request().method() === 'POST'), page.getByRole('button', { name: 'Save', exact: true }).click()]);
    assert.equal(created.status(), 201, await created.text()); const createdBanner = (await created.json()).data; banners.push(createdBanner.id);
    await expect(page.getByRole('button', { name: 'Publish / schedule' })).toBeEnabled();
    const [published] = await Promise.all([page.waitForResponse(response => response.url().endsWith(`/banners/${createdBanner.id}`) && response.request().postDataJSON()?.status === 'active'), page.getByRole('button', { name: 'Publish / schedule' }).click()]);
    assert.equal(published.status(), 200, await published.text());
    await expect(page.getByRole('button', { name: 'Publish / schedule' })).toHaveCount(0);
    await page.waitForLoadState('networkidle');
    await page.goto(base + '/?lang=en'); await ready(page);
    await expect(page.locator('h1')).not.toContainText('Owner preview');
    await expect(page.locator('.public-homepage__hero-content form')).toBeVisible();
    await page.getByRole('button', { name: 'Next image', exact: true }).click();
    await expect(page.locator('h1')).toContainText('Owner preview');
    await expect(page.getByRole('link', { name: 'Read more' }).filter({ hasText: 'Read more' }).first()).toBeVisible();
    const articleLink = page.locator(`a[href="/articles/oct24-article-${suffix}?lang=en"]`).first();
    await expect(articleLink).toBeVisible();
    const goldLink = page.locator('.public-homepage__section-heading > a').first();
    assert.equal(await goldLink.evaluate(el => getComputedStyle(el).backgroundColor === 'rgba(0, 0, 0, 0)'), false);
    await page.goto(base + '/?lang=en&providerApplication=submitted'); await ready(page);
    const notice = page.locator('.public-homepage__request-success'); await expect(notice).toContainText('Account application sent');
    await expect(notice).toBeHidden({ timeout: 12_000 });
    assert(!page.url().includes('providerApplication'));
    await page.goto(base + '/?lang=en&providerApplication=submitted'); await ready(page);
    await page.getByRole('button', { name: 'Dismiss success message' }).click(); await expect(notice).toBeHidden();
    report.checks.push(`${name}: pre-save local image/text preview at 390/768/1440, no mutations, phone/original toggle, real save/upload/publish, original/ad rotation with search, real article link, gold view-all, ten-second and manual dismissal`);
    await rateWindow();
    const user = new mongoose.Types.ObjectId(), profile = new mongoose.Types.ObjectId(), application = new mongoose.Types.ObjectId(); users.push(user);
    const password = 'Local-Oct24-Provider!2026', email = `oct24-${name}-${suffix}@example.invalid`, stamp = new Date();
    await db.collection('users').insertOne({ _id: user, normalizedEmail: email, roleType: 'provider', status: 'verified', version: 0, createdAt: stamp, updatedAt: stamp });
    await db.collection('admin_credentials').insertOne({ userId: user, passwordHash: await createArgon2PasswordHasher().hash(password), version: 0, createdAt: stamp, updatedAt: stamp });
    await db.collection('provider_profiles').insertOne({ _id: profile, userId: user, providerType: 'individual_broker', status: 'approved', version: 0 });
    await db.collection('provider_applications').insertOne({ _id: application, userId: user, providerType: 'individual_broker', status: 'approved', displayName: 'Local broker', email, requirementVersion: '2026-10-15.broker.1', version: 0, createdAt: stamp, updatedAt: stamp });
    const template = await db.collection('properties').findOne({ status: 'published', active: true }); assert(template);
    const property = { ...template, _id: new mongoose.Types.ObjectId(), slug: `oct24-broker-${name}-${suffix}`, providerId: user, sourceType: 'individual_broker', version: 0 };
    delete property.organizationId; delete property.publicCode; delete property.expiresAt; properties.push(property._id);
    await db.collection('properties').insertOne(property);
    const subscription = await context.request.put(`${base}/api/v1/admin/providers/${application}/public-identity-subscription`, { headers: { authorization: `Bearer ${token}` }, data: { expectedVersion: 0, status: 'active', paymentConfirmed: true, startAt: new Date(Date.now() - 60_000).toISOString(), endAt: new Date(Date.now() + 3600_000).toISOString() } });
    assert.equal(subscription.status(), 200, await subscription.text());
    const providerContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    let providerToken = await login(providerContext, email, password);
    const providerPage = await providerContext.newPage();
    providerPage.on('response', response => { if (new URL(response.url()).pathname === '/api/v1/auth/refresh' && response.status() === 200) void response.json().then(body => { providerToken = body.data.accessToken; }); });
    await providerPage.goto(base + '/provider/settings?tab=account&lang=en'); await ready(providerPage);
    await expect(providerPage.getByText('Active — identity visible now', { exact: true })).toBeVisible();
    await expect(providerPage.locator('a[href="https://wa.me/201012345678"]')).toContainText('WhatsApp');
    const editor = providerPage.locator('#company-profile-editor'); await expect(editor).toBeVisible();
    const names = editor.locator('input:not([type=file])'); await names.nth(1).fill('Visible local broker');
    await editor.locator('input[type=file]').setInputFiles({ name: 'broker.png', mimeType: 'image/png', buffer });
    await expect(editor.getByText('Image uploaded. Save the profile to display it publicly.')).toBeVisible();
    await editor.getByRole('button', { name: 'Save company', exact: true }).click();
    await expect(editor.getByText('Company profile saved.', { exact: true })).toBeVisible();
    const profileRow = await db.collection('provider_profiles').findOne({ _id: profile }), photoId = new mongoose.Types.ObjectId(profileRow.publicImageUrl.split('/').at(-1)); photos.push(photoId);
    const photo = await db.collection('organization_photos').findOne({ _id: photoId }); keys.push(photo.storageKey);
    let detail = await providerContext.request.get(`${base}/api/v1/public/properties/${property.slug}`);
    assert.equal(detail.status(), 200); assert.equal((await detail.json()).data.source.name.en, 'Visible local broker');
    assert.equal((await providerContext.request.get(base + profileRow.publicImageUrl)).status(), 200);
    const notices = await providerContext.request.get(base + '/api/v1/provider/notifications', { headers: { authorization: `Bearer ${providerToken}` } });
    assert.equal(notices.status(), 200, await notices.text()); assert((await notices.json()).data.items.some(row => row.type === 'provider.identity_subscription.activated'));
    await db.collection('provider_identity_subscriptions').updateOne({ _id: user }, { $set: { startAt: new Date(Date.now() - 7200_000), endAt: new Date(Date.now() - 60_000) } });
    if (name === 'chromium') await expect.poll(() => db.collection('notifications').countDocuments({ recipientId: user, type: 'provider.identity_subscription.expired' }), { timeout: 70_000, intervals: [1000, 3000] }).toBe(1);
    else await deliverDueIdentityNotifications(db);
    detail = await providerContext.request.get(`${base}/api/v1/public/properties/${property.slug}`); assert.equal('name' in (await detail.json()).data.source, false);
    assert.equal((await providerContext.request.get(base + profileRow.publicImageUrl)).status(), 404);
    assert.equal(await db.collection('notifications').countDocuments({ recipientId: user, type: 'provider.identity_subscription.expired' }), 1);
    await providerPage.reload(); await ready(providerPage); await expect(providerPage.getByText('Subscription is not currently active', { exact: true })).toBeVisible(); await expect(editor).toHaveCount(0);
    const deniedEdit = await providerContext.request.patch(base + '/api/v1/provider/organization', { headers: { authorization: `Bearer ${providerToken}` }, data: { version: profileRow.version, name: { en: 'Forbidden expired edit' }, reason: 'Expired account edit must be denied' } }); assert.equal(deniedEdit.status(), 403);
    await noOverflow(providerPage); await providerPage.screenshot({ path: `${output}/${name}-expired-settings.png` });
    report.checks.push(`${name}: actual provider account activation notice, WhatsApp, editable name/photo upload, public source/image shown while active, hidden after expiry, expiry notice once, editor removed`);
    await providerPage.waitForLoadState('networkidle'); await page.waitForLoadState('networkidle');
    await providerContext.close(); await context.close(); await browser.close(); browser = undefined;
  }
  assert.deepEqual(report.browserErrors, []); report.status = 'PASS_LOCAL';
} catch (error) { report.status = 'FAIL_LOCAL'; report.error = error.stack; process.exitCode = 1; }
finally {
  await browser?.close().catch(() => {});
  const bannerIds = banners.map(id => new mongoose.Types.ObjectId(id));
  const media = await db.collection('ad_banner_media').find({ bannerId: { $in: bannerIds } }).toArray(); keys.push(...media.flatMap(row => row.storageKey ? [row.storageKey] : []));
  await db.collection('ad_banner_media').deleteMany({ bannerId: { $in: bannerIds } }); await db.collection('ad_banners').deleteMany({ _id: { $in: bannerIds } });
  for (const collection of ['provider_profiles', 'provider_applications', 'admin_credentials', 'provider_settings', 'sessions']) await db.collection(collection).deleteMany({ userId: { $in: users } });
  await db.collection('provider_identity_subscriptions').deleteMany({ _id: { $in: users } });
  await db.collection('notifications').deleteMany({ recipientId: { $in: users } }); await db.collection('users').deleteMany({ _id: { $in: users } });
  await db.collection('properties').deleteMany({ _id: { $in: properties } }); await db.collection('organization_photos').deleteMany({ _id: { $in: photos } });
  await db.collection('articles').deleteMany({ _id: { $in: articles } }); await db.collection('article_categories').deleteMany({ _id: { $in: categories } });
  if (bannerSettingsBefore) { await db.collection('ad_settings').deleteMany({}); if (bannerSettingsBefore.length) await db.collection('ad_settings').insertMany(bannerSettingsBefore); }
  if (placementsBefore) { await db.collection('ad_placements').deleteMany({ key: { $in: ['homepage.hero', 'homepage.featured'] } }); if (placementsBefore.length) await db.collection('ad_placements').insertMany(placementsBefore); }
  if (contactBefore) await db.collection('admin_settings').replaceOne({ namespace: 'contact' }, contactBefore); else await db.collection('admin_settings').deleteOne({ namespace: 'contact' });
  for (const key of keys) { const target = path.resolve(storageRoot, key); assert(target.startsWith(storageRoot + path.sep)); await rm(target, { force: true }); }
  await db.close(); report.cleanup = true;
  await writeFile('docs/quality/guide-runs/owner-oct24-browser-local-latest.json', JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify(report, null, 2));
}
