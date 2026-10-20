import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import mongoose from 'mongoose';
import { chromium, webkit, expect as baseExpect } from '@playwright/test';
import { createArgon2PasswordHasher } from '../apps/api/src/modules/auth/crypto.ts';

const env = Object.fromEntries((await readFile('.env.local', 'utf8')).split(/\r?\n/).filter(line => line.includes('=') && !line.startsWith('#')).map(line => {
  const at = line.indexOf('=');
  return [line.slice(0, at), line.slice(at + 1).replace(/^['"]|['"]$/g, '')];
}));
const uri = new URL(env.MONGODB_URI);
assert(['localhost', '127.0.0.1'].includes(uri.hostname) && uri.port === '27018');
const db = await mongoose.createConnection(uri.href).asPromise();
const chrome = await chromium.launch(), safari = await webkit.launch();
const expect = baseExpect.configure({ timeout: 20000 }), base = 'http://127.0.0.1:4173';
const at = new Date(), prefix = `oct19followups${Date.now()}`, password = 'Followups-Photo!2026';
const providerId = new mongoose.Types.ObjectId(), propertyId = new mongoose.Types.ObjectId(), parentId = new mongoose.Types.ObjectId();
const typeIds = Array.from({ length: 12 }, () => new mongoose.Types.ObjectId());
const root = '.tmp/oct19-followups';
await mkdir(root, { recursive: true });
const report = { status: 'FAIL_LOCAL', mockedResponses: false, checks: [], cleanup: false };
async function ready(page) {
  await expect(page.locator('[data-auth-resolution=pending]')).toHaveCount(0);
  await expect(page.locator('#site-intro')).toBeHidden();
  await page.evaluate(async () => { await document.fonts.ready; await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
}
try {
  await db.collection('property_taxonomy').insertMany([
    { _id: parentId, kind: 'category', slug: prefix, name: { ar: 'تصنيف جديد للتجربة', en: 'New QA category' }, order: 71, active: true, version: 0, createdAt: at, updatedAt: at },
    ...typeIds.map((_id, index) => ({ _id, categoryId: parentId, kind: 'type', slug: `${prefix}-${index}`, name: { ar: `نوع للتجربة ${index}`, en: `QA type ${index}` }, order: 72 + index, active: true, version: 0, createdAt: at, updatedAt: at }))
  ]);
  const homepage = await (await fetch(`${base}/api/v1/public/home`)).json();
  assert(homepage.data.categories.some(row => row.id === String(parentId) && row.kind === 'category'));
  report.checks.push('real_homepage_api_includes_new_parent_category_without_visiting_listing');
  for (const engine of [chrome, safari]) {
    for (const [width, locale] of [[320, 'ar'], [390, 'en'], [1440, 'ar']]) {
      const ctx = await engine.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      try {
        const page = await ctx.newPage();
        await page.goto(`${base}/?lang=${locale}&notice=ad-request-sent`);
        await ready(page);
        const toast = page.locator('.public-homepage__request-success .ui-toast');
        await expect(toast).toBeVisible();
        const layout = await toast.evaluate(element => {
          const title = element.querySelector('strong').getBoundingClientRect(), message = element.querySelector('p').getBoundingClientRect();
          const action = element.querySelector('a').getBoundingClientRect(), close = element.querySelector('button').getBoundingClientRect();
          const content = element.querySelector('.ui-toast__content').getBoundingClientRect(), bounds = element.getBoundingClientRect();
          return { separated: message.top >= title.bottom && action.top >= message.bottom && (close.right <= content.left || close.left >= content.right), contained: bounds.left >= 0 && bounds.right <= innerWidth, overflow: document.documentElement.scrollWidth > innerWidth + 1 };
        });
        assert(layout.separated && layout.contained && !layout.overflow, JSON.stringify(layout));
        await page.screenshot({ path: `${root}/toast-${engine.browserType().name()}-${locale}-${width}.png` });
        await toast.getByRole('button').click();
        await expect(toast).toHaveCount(0);
        const rail = page.locator('#homepage-category-rail');
        await rail.scrollIntoViewIfNeeded();
        const geometry = await rail.evaluate(element => ({ display: getComputedStyle(element).display, overflows: element.scrollWidth > element.clientWidth, rowCount: new Set(Array.from(element.children).map(child => Math.round(child.getBoundingClientRect().top))).size }));
        assert(geometry.display === 'flex' && geometry.overflows && geometry.rowCount === 1, JSON.stringify(geometry));
        const before = await rail.evaluate(element => element.scrollLeft);
        const next = page.getByRole('button', { name: locale === 'ar' ? 'التصنيفات التالية' : 'Next categories', exact: true });
        await expect(next).toBeEnabled();
        await next.click();
        await expect.poll(() => rail.evaluate(element => element.scrollLeft)).not.toBe(before);
        const parent = rail.locator(`a[href*="propertyCategoryId=${parentId}"]`);
        await expect(parent).toHaveCount(1);
        await expect(parent.locator('img')).toHaveAttribute('src', '/assets/sadat-real-estate-logo.png');
        await parent.scrollIntoViewIfNeeded();
        await expect(parent).toBeInViewport();
        await expect.poll(() => parent.locator('img').evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
        await page.screenshot({ path: `${root}/slider-${engine.browserType().name()}-${locale}-${width}.png` });
        const form = page.locator('.public-homepage__search');
        await form.locator('.custom-select-trigger').first().click();
        await page.locator('.custom-select-menu').getByRole('option', { name: locale === 'ar' ? 'تصنيف جديد للتجربة' : 'New QA category', exact: true }).click();
        await expect(form.locator('select[name=propertyCategoryId]')).toHaveValue(String(parentId));
        await expect(form.locator('select[name=propertyTypeId]')).toHaveCount(0);
      } finally { await ctx.close(); }
    }
  }
  report.checks.push('chromium_webkit_320_390_1440_rtl_ltr_single_row_slider_controls_and_parent_filter', 'toast_title_message_link_and_close_do_not_overlap_and_dismiss_works');
  const hash = await createArgon2PasswordHasher().hash(password);
  await db.collection('users').insertOne({ _id: providerId, normalizedEmail: `${prefix}@example.invalid`, roleType: 'provider', status: 'verified', locale: 'ar', version: 0, createdAt: at, updatedAt: at });
  await db.collection('admin_credentials').insertOne({ userId: providerId, passwordHash: hash, passwordChangedAt: at, createdAt: at, updatedAt: at });
  await db.collection('properties').insertOne({ _id: propertyId, providerId, sourceType: 'individual_broker', kind: 'property', name: { ar: 'عقار اختبار', en: 'QA property' }, slug: prefix, transactionType: 'sale', status: 'draft', active: true, version: 0, createdAt: at, updatedAt: at });
  for (const [width, locale] of [[320, 'ar'], [1440, 'en']]) {
    const ctx = await safari.newContext({ viewport: { width, height: 900 } });
    try {
      const signed = await ctx.request.post(`${base}/api/v1/auth/login`, { data: { email: `${prefix}@example.invalid`, password } });
      assert.equal(signed.status(), 200);
      const page = await ctx.newPage();
      await page.goto(`${base}/provider/properties/${propertyId}/media?lang=${locale}`);
      await expect(page.locator('.provider-photo-guide')).toBeVisible();
      await ready(page);
      await expect.poll(() => page.locator('.provider-photo-guide img').evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0))).toBe(true);
      assert.equal(await page.locator('.provider-photo-guide img').count(), 3);
      assert(await page.locator('input[type=file]').count() > 0);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await page.locator('.provider-photo-guide').scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${root}/photo-guide-${locale}-${width}.png` });
      await page.locator('.provider-photo-guide summary').click();
      await expect(page.locator('.provider-photo-guide')).not.toHaveAttribute('open');
    } finally { await ctx.close(); }
  }
  report.checks.push('real_provider_media_page_three_loaded_illustrations_mobile_desktop_bilingual_collapsible_guide_and_uploader');
  report.status = 'PASS_LOCAL';
} catch (error) { report.error = String(error.stack ?? error); process.exitCode = 1; }
finally {
  await db.collection('property_taxonomy').deleteMany({ _id: { $in: [parentId, ...typeIds] } });
  for (const collection of ['sessions', 'admin_credentials', 'provider_profiles', 'provider_applications']) await db.collection(collection).deleteMany({ userId: providerId });
  await db.collection('users').deleteOne({ _id: providerId });
  await db.collection('properties').deleteOne({ _id: propertyId });
  report.cleanup = true;
  await writeFile('docs/quality/guide-runs/oct19-followups-local-latest.json', JSON.stringify(report, null, 2) + '\n');
  await chrome.close(); await safari.close(); await db.close();
  console.log(JSON.stringify(report));
}
