import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import mongoose from 'mongoose';
import sharp from 'sharp';
import { chromium, webkit, expect as baseExpect } from '@playwright/test';
import { RBAC_PERMISSIONS } from '@sadat-real-estate/contracts';
import { createArgon2PasswordHasher } from '../apps/api/src/modules/auth/crypto.ts';

const env = Object.fromEntries((await readFile('.env.local', 'utf8')).split(/\r?\n/).filter(line => line.includes('=') && !line.startsWith('#')).map(line => { const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1).replace(/^['"]|['"]$/g, '')]; }));
const uri = new URL(env.MONGODB_URI); assert(['localhost', '127.0.0.1'].includes(uri.hostname) && uri.port === '27018');
const db = await mongoose.createConnection(uri.href).asPromise(), chrome = await chromium.launch(), safari = await webkit.launch(), expect = baseExpect.configure({ timeout: 20000 });
const base = 'http://127.0.0.1:4173', prefix = `article-rules-${Date.now()}`, password = 'Article-Image-Rules!2026', adminId = new mongoose.Types.ObjectId(), roleId = new mongoose.Types.ObjectId(), at = new Date();
const root = '.tmp/article-image-rules', storageRoot = path.resolve(env.PRIVATE_STORAGE_LOCAL_ROOT || path.join(os.tmpdir(), 'sadat-real-estate-private-storage')), ids = { articles: [], categories: [] }, contexts = [];
await mkdir(root, { recursive: true });
const report = { status: 'FAIL_LOCAL', mockedResponses: false, checks: [], geometry: [], cleanup: false, browserErrors: [] }; let lastPage;
async function ready(page) { lastPage = page; await expect(page.locator('[data-auth-resolution=pending]')).toHaveCount(0); await expect(page.locator('#site-intro')).toBeHidden(); if (!new URL(page.url()).pathname.startsWith('/admin/')) await page.waitForLoadState('networkidle'); await page.evaluate(() => document.fonts.ready); }
async function rateWindow(threshold = 35) { const r = await fetch(base + '/api/v1/public/bootstrap'); if (r.status === 429 || Number(r.headers.get('ratelimit-remaining')) < threshold) { const seconds = Math.min(60, Math.max(1, Number(r.headers.get('retry-after') ?? r.headers.get('ratelimit-reset') ?? 60))); console.log('ARTICLE_QA_RATE_PAUSE', seconds); await new Promise(resolve => setTimeout(resolve, seconds * 1000)); } }
function objectPath(key) { assert.match(key, /^quarantine\/[a-f0-9]{32}$/); const target = path.resolve(storageRoot, key); assert(target.startsWith(storageRoot + path.sep)); return target; }
try {
  await rateWindow(70);
  await db.collection('users').insertOne({ _id: adminId, normalizedEmail: `${prefix}@example.invalid`, roleType: 'admin', status: 'verified', locale: 'en', version: 0, createdAt: at, updatedAt: at });
  await db.collection('admin_accounts').insertOne({ userId: adminId, displayName: prefix, accessLevel: 'standard_admin', createdAt: at, updatedAt: at });
  await db.collection('admin_profiles').insertOne({ userId: adminId, createdAt: at, updatedAt: at });
  await db.collection('admin_credentials').insertOne({ userId: adminId, passwordHash: await createArgon2PasswordHasher().hash(password), createdAt: at, updatedAt: at });
  await db.collection('roles').insertOne({ _id: roleId, name: prefix, nameKey: prefix, accessMode: 'custom', permissions: [...RBAC_PERMISSIONS], active: true, version: 0, createdBy: adminId, updatedBy: adminId, createdAt: at, updatedAt: at });
  await db.collection('admin_role_assignments').insertOne({ adminUserId: adminId, roleIds: [roleId], assignedBy: adminId, assignedAt: at, version: 0, createdAt: at, updatedAt: at });
  const admin = await chrome.newContext({ viewport: { width: 1440, height: 1000 } }); contexts.push(admin);
  const login = await admin.request.post(base + '/api/v1/auth/login', { data: { email: `${prefix}@example.invalid`, password } }); assert.equal(login.status(), 200); let token = (await login.json()).data.accessToken;
  async function api(endpoint, data, method = 'GET', expected = 200, headers = {}) {
    let r = await admin.request.fetch(base + '/api/v1' + endpoint, { method, data, headers: { authorization: `Bearer ${token}`, ...headers } });
    if (r.status() === 401) { const renewed = await admin.request.post(base + '/api/v1/auth/refresh', { data: {} }); assert.equal(renewed.status(), 200); token = (await renewed.json()).data.accessToken; r = await admin.request.fetch(base + '/api/v1' + endpoint, { method, data, headers: { authorization: `Bearer ${token}`, ...headers } }); }
    assert.equal(r.status(), expected, `${endpoint}: ${await r.text()}`); return expected >= 400 ? undefined : (await r.json()).data;
  }
  const photos = [];
  for (const [width, height, background] of [[1200, 700, '#124c3e'], [500, 1100, '#c99743'], [1600, 100, '#1a2942'], [700, 500, '#8f3043']]) {
    const bytes = await sharp({ create: { width, height, channels: 3, background } }).png().toBuffer(); photos.push(await api('/admin/articles/photos', bytes, 'POST', 201, { 'content-type': 'image/png' }));
  }
  const before = await db.collection('cms_article_photos').countDocuments({ createdBy: adminId });
  await api('/admin/articles/photos', Buffer.from('not a real PNG image'), 'POST', 400, { 'content-type': 'image/png' });
  await api('/admin/articles/photos', Buffer.from('<svg/>'), 'POST', 400, { 'content-type': 'image/svg+xml' });
  assert.equal(await db.collection('cms_article_photos').countDocuments({ createdBy: adminId }), before);
  report.checks.push('real_scanned_image_upload_rejects_corrupt_and_unsupported_files_without_creating_records');
  const category = await api('/admin/article-categories', { name: { en: prefix, ar: 'اختبار قواعد المقال' }, reason: 'Create synthetic image rules category' }, 'POST', 201); ids.categories.push(new mongoose.Types.ObjectId(category.id));
  const text = 'نصمتصل'.repeat(180), title = 'عنوانطويل'.repeat(35), body = { ar: `${text}\n\n"فقرة اقتباس سليمة"`, en: `${text}\n\n"A normal quotation"` };
  let article = await api('/admin/articles', { categoryId: category.id, title: { ar: title, en: title }, body, coverAssetId: photos[0].id, galleryAssetIds: [photos[0].id, photos[1].id, photos[3].id, photos[2].id], reason: 'Reproduce long unbroken text and varied images' }, 'POST', 201); ids.articles.push(new mongoose.Types.ObjectId(article.id)); assert.deepEqual(article.galleryAssetIds, [photos[1].id, photos[3].id, photos[2].id]);
  article = await api(`/admin/articles/${article.id}/transitions`, { version: article.version, status: 'published', reason: 'Publish synthetic layout reproduction' }, 'POST');
  const missing = new mongoose.Types.ObjectId();
  // Simulate retained legacy references and a later storage failure on fixture-owned objects only.
  await db.collection('articles').updateOne({ _id: new mongoose.Types.ObjectId(article.id), authorId: adminId }, { $set: { imageUrl: `/api/v1/public/article-photos/${missing}`, coverAssetId: missing, galleryAssetIds: [new mongoose.Types.ObjectId(photos[1].id), new mongoose.Types.ObjectId(photos[3].id), new mongoose.Types.ObjectId(photos[2].id), new mongoose.Types.ObjectId(photos[1].id)] } });
  const damaged = await db.collection('cms_article_photos').findOne({ _id: new mongoose.Types.ObjectId(photos[3].id), createdBy: adminId }); assert(damaged); await writeFile(objectPath(damaged.storageKey), 'corrupted synthetic image after upload');
  let empty = await api('/admin/articles', { categoryId: category.id, title: { en: `${prefix} no usable images`, ar: 'مقال صوره غير متاحة' }, body: { ar: text, en: text }, reason: 'Create all-images-failed reproduction' }, 'POST', 201); ids.articles.push(new mongoose.Types.ObjectId(empty.id)); empty = await api(`/admin/articles/${empty.id}/transitions`, { version: empty.version, status: 'published', reason: 'Publish fallback reproduction' }, 'POST');
  await db.collection('articles').updateOne({ _id: new mongoose.Types.ObjectId(empty.id), authorId: adminId }, { $set: { imageUrl: `/api/v1/public/article-photos/${new mongoose.Types.ObjectId()}` } });
  await rateWindow(); const editor = await admin.newPage(); await editor.goto(base + `/admin/articles?articleId=${article.id}&lang=en`); await ready(editor); await expect(editor.getByTestId('admin-article-editor')).toBeVisible(); const beforeText = await editor.getByRole('group', { name: 'Body', exact: true }).getByRole('textbox').evaluateAll(elements => elements.map(element => element.value));
  const uploadFailed = editor.waitForResponse(r => r.url().endsWith('/admin/articles/photos') && r.request().method() === 'POST'); await editor.getByLabel('Add image', { exact: true }).setInputFiles({ name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('corrupt image') }); assert.equal((await uploadFailed).status(), 400); await expect(editor.getByText('Image upload failed. Retry; your article text remains in the form.')).toBeVisible(); assert.deepEqual(await editor.getByRole('group', { name: 'Body', exact: true }).getByRole('textbox').evaluateAll(elements => elements.map(element => element.value)), beforeText);
  await editor.getByRole('button', { name: 'Preview article', exact: true }).click(); await expect(editor.getByTestId('admin-article-preview').locator('.article-image-slider')).toBeVisible(); await expect(editor.getByTestId('admin-article-preview').locator('img')).toHaveCount(1);
  report.checks.push('administrative_preview_uses_same_slider_and_rejected_upload_preserves_article_text'); await editor.close();
  for (const engine of [chrome, safari]) for (const [locale, width] of [['ar', 320], ['en', 390], ['ar', 1440]]) {
    await rateWindow(); const ctx = await engine.newContext({ viewport: { width, height: 1000 } }); contexts.push(ctx); const page = await ctx.newPage(); page.on('pageerror', error => report.browserErrors.push(String(error)));
    await page.goto(base + `/articles/${article.slug}?lang=${locale}`); await ready(page); const gallery = page.getByRole('region', { name: locale === 'ar' ? 'صور المقال' : 'Article images' });
    await expect(gallery.locator('img')).toHaveAttribute('src', photos[1].imageUrl); await expect.poll(() => gallery.locator('img').evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true); await expect(gallery.locator('img')).toHaveCount(1); await expect(page.locator('.public-article-details__body')).toContainText(text); await expect(page.locator('.public-article-details__body img')).toHaveCount(0);
    await gallery.getByRole('button', { name: locale === 'ar' ? 'الصورة التالية' : 'Next image' }).click(); await expect(gallery.locator('img')).toHaveAttribute('src', photos[2].imageUrl); await expect(gallery.getByRole('button', { name: locale === 'ar' ? 'الصورة التالية' : 'Next image' })).toBeDisabled();
    await gallery.getByRole('button', { name: locale === 'ar' ? 'الصورة السابقة' : 'Previous image' }).click(); await expect(gallery.locator('img')).toHaveAttribute('src', photos[1].imageUrl); await gallery.focus(); await page.keyboard.press(locale === 'ar' ? 'ArrowLeft' : 'ArrowRight'); await expect(gallery.locator('img')).toHaveAttribute('src', photos[2].imageUrl);
    const geometry = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, bodyWidth: document.querySelector('.public-article-details__body').getBoundingClientRect().width, fit: getComputedStyle(document.querySelector('.article-image-slider img')).objectFit })); assert(geometry.scrollWidth <= width + 1, JSON.stringify(geometry)); assert.equal(geometry.fit, 'contain'); report.geometry.push({ engine: engine.browserType().name(), locale, ...geometry });
    await page.screenshot({ path: `${root}/long-text-slider-${engine.browserType().name()}-${locale}-${width}.png`, fullPage: true }); await gallery.screenshot({ path: `${root}/slider-${engine.browserType().name()}-${locale}-${width}.png` });
    await page.goto(base + `/articles/${empty.slug}?lang=${locale}`); await ready(page); await expect(page.getByText(locale === 'ar' ? 'صور المقال غير متاحة حاليًا' : 'Article images are currently unavailable')).toBeVisible(); await expect(page.locator('.public-article-details__body')).toContainText(text); assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    for (const slug of ['buying-in-sadat', 'investment-opportunities-sadat']) { await page.goto(base + `/articles/${slug}?lang=${locale}`); await ready(page); await expect(page.locator('.article-image-slider img')).toBeVisible(); await expect(page.locator('.article-image-slider__frame > button')).toHaveCount(0); assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)); }
    await ctx.close();
  }
  report.checks.push('chromium_webkit_320_390_1440_long_unbroken_text_and_portrait_panorama_stay_inside_viewport', 'legacy_missing_cover_recovers_after_hydration_corrupt_image_skipped_and_duplicate_images_removed', 'gallery_buttons_rtl_ltr_keyboard_single_frame_and_all_images_failed_keep_body_readable', 'both_healthy_article_examples_keep_single_image_layout_without_redundant_controls');
  assert.deepEqual(report.browserErrors, []); report.status = 'PASS_LOCAL';
} catch (error) { report.error = String(error.stack ?? error); process.exitCode = 1; if (lastPage && !lastPage.isClosed()) { await lastPage.screenshot({ path: `${root}/failure.png` }); await writeFile(`${root}/failure.txt`, await lastPage.locator('body').innerText()); } }
finally {
  for (const ctx of contexts) await ctx.close().catch(() => {});
  for (const photo of await db.collection('cms_article_photos').find({ createdBy: adminId }).toArray()) await rm(objectPath(photo.storageKey), { force: true });
  await db.collection('cms_article_photos').deleteMany({ createdBy: adminId }); await db.collection('articles').deleteMany({ _id: { $in: ids.articles }, authorId: adminId }); await db.collection('article_categories').deleteMany({ _id: { $in: ids.categories } });
  for (const name of ['admin_accounts', 'admin_profiles', 'admin_credentials', 'sessions']) await db.collection(name).deleteMany({ userId: adminId });
  await db.collection('admin_role_assignments').deleteMany({ adminUserId: adminId }); await db.collection('roles').deleteOne({ _id: roleId }); await db.collection('users').deleteOne({ _id: adminId }); await db.collection('audit_logs').deleteMany({ actorId: adminId }); await db.collection('admin_attention_receipts').deleteMany({ adminId });
  report.cleanup = true; await writeFile('docs/quality/guide-runs/article-image-rules-local-latest.json', JSON.stringify(report, null, 2) + '\n'); await db.close(); await chrome.close(); await safari.close(); console.log(JSON.stringify(report));
}
