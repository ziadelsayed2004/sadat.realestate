import assert from 'node:assert/strict';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import mongoose from 'mongoose';
import sharp from 'sharp';
import { chromium, webkit, expect } from '@playwright/test';
import { createArgon2PasswordHasher } from '../apps/api/src/modules/auth/crypto.ts';
import { readEnvironmentFile } from './environment-file.mjs';

const env = await readEnvironmentFile('.env.local'), uri = new URL(env.MONGODB_URI);
assert(['localhost', '127.0.0.1'].includes(uri.hostname) && uri.port === '27018');
const db = await mongoose.createConnection(uri.href).asPromise(), base = 'http://127.0.0.1:4173';
const oid = () => new mongoose.Types.ObjectId(), userId = oid(), appId = oid(), orgId = oid(), projectId = oid(), propertyId = oid();
const stamp = new Date(), slug = `owner-profile-${Date.now()}`, email = `${slug}@example.invalid`, password = 'Local-Profile!2026';
const output = '.tmp/owner-profile', report = { status: 'RUNNING', mockedRoutes: false, checks: [], browserErrors: [], cleanup: false };
const storageRoot = path.resolve(env.PRIVATE_STORAGE_LOCAL_ROOT || path.join(os.tmpdir(), 'sadat-real-estate-private-storage'));
await mkdir(output, { recursive: true });
let browser;
try {
  const window = await fetch(base + '/api/v1/public/bootstrap');
  if (window.status === 429 || Number(window.headers.get('ratelimit-remaining')) < 40) await new Promise(resolve => setTimeout(resolve, 60_000));
  await db.collection('users').insertOne({ _id: userId, roleType: 'provider', status: 'verified', normalizedEmail: email, version: 0, createdAt: stamp, updatedAt: stamp });
  await db.collection('admin_credentials').insertOne({ userId, passwordHash: await createArgon2PasswordHasher().hash(password), passwordChangedAt: stamp, version: 0, createdAt: stamp, updatedAt: stamp });
  await db.collection('provider_profiles').insertOne({ _id: orgId, userId, providerType: 'developer_company', status: 'approved', version: 0, createdAt: stamp, updatedAt: stamp });
  await db.collection('provider_applications').insertOne({ _id: appId, userId, providerType: 'developer_company', status: 'approved', requirementVersion: '2026-10-15.developer.1', brandName: 'Local visual developer', version: 0, createdAt: stamp, updatedAt: stamp });
  browser = await chromium.launch();
  const context = await browser.newContext();
  const login = await context.request.post(base + '/api/v1/auth/login', { data: { email, password } }); assert.equal(login.status(), 200);
  const token = (await login.json()).data.accessToken;
  const paddedLogo = await sharp({ create: { width: 1600, height: 1600, channels: 3, background: '#f7f7f7' } }).composite([{ input: await sharp({ create: { width: 1000, height: 400, channels: 3, background: '#17574a' } }).png().toBuffer(), left: 300, top: 600 }]).png().toBuffer();
  const photo = await context.request.post(base + '/api/v1/provider/organization-photos', { headers: { authorization: `Bearer ${token}`, 'content-type': 'image/png' }, data: paddedLogo });
  assert.equal(photo.status(), 201); const imageUrl = (await photo.json()).data.imageUrl;
  assert.equal((await context.request.get(base + imageUrl + '?variant=cover')).status(), 404, 'Unattached image stays private, including its cover preview');
  await db.collection('organizations').insertOne({ _id: orgId, providerId: orgId, kind: 'developer_company', slug, name: { ar: 'شركة تجربة العرض', en: 'Local visual developer' }, description: { ar: 'نبذة قصيرة عن الشركة', en: 'A short company overview' }, imageUrl, logoUrl: imageUrl, status: 'approved', version: 0, createdAt: stamp, updatedAt: stamp });
  await db.collection('projects').insertOne({ _id: projectId, providerId: userId, organizationId: orgId, name: { ar: 'مشروع بصور وتفاصيل', en: 'Project with image and details' }, description: { ar: 'تفاصيل المشروع تظهر تحت اسمه', en: 'Project details appear below its title' }, slug: 'visual-project', imageUrl, status: 'published', version: 0, createdAt: stamp, updatedAt: stamp });
  const template = await db.collection('properties').findOne({ status: 'published', active: true }); assert(template);
  const property = { ...template, _id: propertyId, providerId: orgId, organizationId: orgId, projectId, name: { ar: 'عقار محلي مختار للمراجعة', en: 'Local selected property' }, slug: `${slug}-property`, sourceType: 'developer_company', imageUrl: '/assets/canonical/public/listing-property-home.png', featured: false, version: 0, createdAt: stamp, updatedAt: stamp };
  delete property.publicCode; delete property.expiresAt; delete property.featuredOrder;
  await db.collection('properties').insertOne(property);
  const original = await (await context.request.get(base + imageUrl)).body();
  const cropped = await context.request.get(base + imageUrl + '?variant=cover'); assert.equal(cropped.status(), 200);
  const croppedMetadata = await sharp(await cropped.body()).metadata(); assert(croppedMetadata.width > 900 && croppedMetadata.width < 1100); assert(croppedMetadata.height > 350 && croppedMetadata.height < 450);
  assert.equal((await sharp(original).metadata()).height, 1600);
  assert.deepEqual(await (await context.request.get(base + imageUrl)).body(), original);
  assert.equal((await context.request.get(base + imageUrl + '?variant=invalid')).status(), 400);
  await db.collection('organizations').updateOne({ _id: orgId }, { $set: { status: 'inactive' } });
  assert.equal((await context.request.get(base + imageUrl + '?variant=cover')).status(), 404, 'Cached cover must still pass public visibility checks');
  await db.collection('organizations').updateOne({ _id: orgId }, { $set: { status: 'approved' } });
  report.checks.push('Padded 1600px square cover displays its full 1000×400 content; original unchanged; private/unpublished cover stays unavailable even after caching');
  const ownerPage = await context.newPage(); ownerPage.on('pageerror', error => report.browserErrors.push(String(error)));
  await ownerPage.goto(base + '/provider/settings?lang=en');
  await expect(ownerPage.locator('[data-auth-resolution=pending]')).toHaveCount(0);
  await expect(ownerPage.locator('#company-profile-editor')).toContainText('1600 × 900');
  await expect(ownerPage.locator('#company-profile-editor')).toContainText('512 × 512');
  await expect(ownerPage.locator('#company-profile-editor input[type=file]')).toHaveCount(2);
  report.checks.push('Provider settings exposes separate logo/cover uploads with 512×512 and 1600×900 size guidance');
  await browser.close();
  for (const engine of [chromium, webkit]) {
    browser = await engine.launch();
    const page = await browser.newPage(); page.on('pageerror', error => report.browserErrors.push(String(error)));
    for (const [locale, width] of [['ar', 390], ['en', 1440]]) {
      await page.setViewportSize({ width, height: 1000 }); await page.goto(`${base}/developers/${slug}?lang=${locale}`);
      await expect(page.locator('[data-auth-resolution=pending]')).toHaveCount(0); await expect(page.locator('#site-intro')).toBeHidden();
      const cover = page.locator('.public-developer-profile__hero-media > img');
      await expect(cover).toHaveAttribute('src', imageUrl + '?variant=cover'); await expect(cover).toHaveJSProperty('naturalWidth', croppedMetadata.width); assert.equal(await cover.evaluate(el => getComputedStyle(el).objectFit), 'contain');
      await expect(page.locator('.public-developer-profile__project-card')).toContainText(locale === 'ar' ? 'تفاصيل المشروع تظهر تحت اسمه' : 'Project details appear below its title');
      assert(await page.locator('.public-developer-profile__overview-content').evaluate(el => el.getBoundingClientRect().height < 200));
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      const card = page.locator('.public-developer-profile__property-card'); await expect(card).toBeVisible();
      const style = await card.evaluate(el => { const s = getComputedStyle(el); return { border: s.borderTopWidth, color: s.backgroundColor, page: getComputedStyle(document.body).backgroundColor }; });
      assert.equal(style.border, '2px'); assert.notEqual(style.color, style.page);
      await page.screenshot({ path: `${output}/${engine.name()}-${locale}-${width}.png`, fullPage: true });
      report.checks.push(`${engine.name()} ${locale} ${width}px: readable complete cover, compact overview, project details, property card has 2px border and light background, no overflow`);
    }
    await browser.close();
  }
  browser = await chromium.launch();
  const admin = await browser.newContext();
  const adminLogin = await admin.request.post(base + '/api/v1/auth/login', { data: { email: 'admin.demo@example.invalid', password: 'LocalPreview-Admin-Only-2026!' } }); assert.equal(adminLogin.status(), 200);
  const adminPage = await admin.newPage(); adminPage.on('pageerror', error => report.browserErrors.push(String(error)));
  await adminPage.goto(`${base}/admin/properties/review?propertyId=${propertyId}&lang=ar`);
  await expect(adminPage.locator('[data-auth-resolution=pending]')).toHaveCount(0); await expect(adminPage.locator('#site-intro')).toBeHidden();
  await expect(adminPage.locator('#property-homepage-featured')).toHaveAttribute('open', '');
  await adminPage.getByRole('checkbox', { name: 'تمييز العقار في الرئيسية', exact: true }).check();
  await adminPage.getByRole('spinbutton', { name: 'ترتيب العرض', exact: true }).fill('0');
  const saved = adminPage.waitForResponse(r => r.url().endsWith(`/admin/properties/${propertyId}/featured`) && r.request().method() === 'PUT');
  await adminPage.getByRole('button', { name: 'حفظ التمييز', exact: true }).click(); assert.equal((await saved).status(), 200);
  await expect(adminPage.getByText('تم حفظ ترتيب أبرز العقارات.', { exact: true })).toBeVisible();
  const stored = await db.collection('properties').findOne({ _id: propertyId }); assert.equal(stored.featured, true); assert.equal(stored.featuredOrder, 0);
  const homeResponse = await admin.request.get(base + '/api/v1/public/home'); assert.equal(homeResponse.status(), 200);
  assert((await homeResponse.json()).data.properties.slice(0, 3).some(item => item.id === String(propertyId)));
  await adminPage.goto(base + '/?lang=ar');
  await expect(adminPage.locator('.public-homepage__property-card').filter({ hasText: 'عقار محلي مختار للمراجعة' })).toBeVisible();
  report.checks.push('Arabic admin review → Feature on homepage → save order 0 → property appears among the homepage first three cards');
  await admin.request.post(base + '/api/v1/auth/logout'); await admin.close();
  assert.deepEqual(report.browserErrors, []); report.status = 'PASS_LOCAL';
} catch (error) { report.status = 'FAIL_LOCAL'; report.error = String(error.stack ?? error); process.exitCode = 1; }
finally {
  await browser?.close().catch(() => {});
  for (const photo of await db.collection('organization_photos').find({ createdBy: userId }).toArray()) {
    assert(/^quarantine\/[a-f0-9]{32}$/.test(photo.storageKey)); const target = path.resolve(storageRoot, photo.storageKey); assert(target.startsWith(storageRoot + path.sep)); await rm(target, { force: true });
  }
  for (const name of ['users', 'provider_profiles', 'provider_applications', 'admin_credentials', 'sessions', 'organization_photos', 'audit_logs']) await db.collection(name).deleteMany({ $or: [{ _id: { $in: [userId, appId, orgId] } }, { userId }, { createdBy: userId }, { actorId: userId }] });
  await db.collection('organizations').deleteOne({ _id: orgId }); await db.collection('projects').deleteOne({ _id: projectId }); await db.collection('properties').deleteOne({ _id: propertyId });
  await db.collection('audit_logs').deleteMany({ targetId: String(propertyId) });
  await db.close(); report.cleanup = true; await writeFile('docs/quality/guide-runs/owner-profile-local-latest.json', JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify(report, null, 2));
