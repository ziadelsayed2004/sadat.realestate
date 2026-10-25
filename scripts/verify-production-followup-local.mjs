import assert from 'node:assert/strict';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import mongoose from 'mongoose';
import sharp from 'sharp';
import { build } from 'esbuild';
import { chromium, webkit, expect } from '@playwright/test';
import { createArgon2PasswordHasher } from '../apps/api/src/modules/auth/crypto.ts';
import { readEnvironmentFile } from './environment-file.mjs';

const env = await readEnvironmentFile('.env.local'), uri = new URL(env.MONGODB_URI);
assert(['localhost', '127.0.0.1'].includes(uri.hostname) && uri.port === '27018', 'Local fixture database only');
const db = await mongoose.createConnection(uri.href).asPromise(), base = 'http://127.0.0.1:4173';
const oid = () => new mongoose.Types.ObjectId(), stamp = new Date(), prefix = `followup-${Date.now()}`;
const password = 'Local-Followup!2026', users = [], properties = [], organizations = [], projects = [], contexts = [];
const report = { status: 'RUNNING', mockedApiRoutes: false, checks: [], browserErrors: [], cleanup: false };
const profileCards = process.argv.includes('--profile-cards');
const unitReview = process.argv.includes('--unit-review') || profileCards;
const output = '.tmp/production-followup', storageRoot = path.resolve(env.PRIVATE_STORAGE_LOCAL_ROOT || path.join(os.tmpdir(), 'sadat-real-estate-private-storage'));
await mkdir(output, { recursive: true });
let browser;
async function rateWindow() {
  const response = await fetch(base + '/api/v1/public/bootstrap');
  if (response.status === 429 || Number(response.headers.get('ratelimit-remaining')) < 55) await new Promise(resolve => setTimeout(resolve, 60_000));
}
async function visit(page, url) { await page.waitForLoadState('networkidle'); await page.goto(url); await page.waitForLoadState('networkidle'); }
async function json(response, expected = 200) { assert.equal(response.status(), expected, (await response.text()).slice(0, 700)); return (await response.json()).data; }
async function account(type) {
  const user = { id: oid(), profileId: oid(), applicationId: oid(), email: `${prefix}-${type}@example.invalid`, type };
  users.push(user);
  await db.collection('users').insertOne({ _id: user.id, roleType: type === 'seeker' ? 'seeker' : 'provider', status: 'verified', normalizedEmail: user.email, version: 0, createdAt: stamp, updatedAt: stamp });
  await db.collection('admin_credentials').insertOne({ userId: user.id, passwordHash: await createArgon2PasswordHasher().hash(password), passwordChangedAt: stamp, version: 0, createdAt: stamp, updatedAt: stamp });
  if (type !== 'seeker') {
    await db.collection('provider_profiles').insertOne({ _id: user.profileId, userId: user.id, providerType: type, status: 'approved', version: 0, createdAt: stamp, updatedAt: stamp });
    await db.collection('provider_applications').insertOne({ _id: user.applicationId, userId: user.id, providerType: type, status: 'approved', requirementVersion: '2026-10-15.developer.1', brandName: type, version: 0, createdAt: stamp, updatedAt: stamp });
    const org = { _id: oid(), providerId: user.profileId, kind: type, slug: `${prefix}-${type.replaceAll('_', '-')}`, name: { ar: type === 'brokerage_office' ? 'مكتب الاختبار المحلي' : 'شركة الاختبار المحلي', en: `${type} fixture` }, status: 'approved', coverFit: 'contain', version: 0, createdAt: stamp, updatedAt: stamp };
    organizations.push(org); user.org = org; await db.collection('organizations').insertOne(org);
    if (type === 'brokerage_office') await db.collection('provider_identity_subscriptions').insertOne({ _id: user.id, status: 'active', paymentConfirmed: true, startAt: new Date(Date.now() - 60_000), endAt: new Date(Date.now() + 86_400_000), version: 0 });
  }
  return user;
}
async function login(context, user) { return json(await context.request.post(base + '/api/v1/auth/login', { data: { email: user.email, password } })); }
try {
  await rateWindow();
  const developer = await account('developer_company'), office = await account('brokerage_office'), seeker = await account('seeker');
  browser = await chromium.launch();
  const owner = await browser.newContext(); contexts.push(owner);
  const session = await login(owner, developer), headers = { authorization: `Bearer ${session.accessToken}` };
  const portrait = await sharp({ create: { width: 640, height: 960, channels: 3, background: '#165748' } }).composite([{ input: await sharp({ create: { width: 480, height: 400, channels: 3, background: '#d1a044' } }).png().toBuffer(), left: 80, top: 280 }]).png().toBuffer();
  const photo = await json(await owner.request.post(base + '/api/v1/provider/organization-photos', { headers: { ...headers, 'content-type': 'image/png' }, data: portrait }), 201);
  for (const org of organizations) await db.collection('organizations').updateOne({ _id: org._id }, { $set: { imageUrl: photo.imageUrl, logoUrl: photo.imageUrl } });
  const company = await json(await owner.request.get(base + '/api/v1/provider/organization', { headers }));
  const filledCompany = await json(await owner.request.patch(base + '/api/v1/provider/organization', { headers, data: { version: company.version, name: company.name, coverFit: 'cover', reason: 'Local owner chooses cover fit' } })); assert.equal(filledCompany.coverFit, 'cover');
  const fullCompany = await json(await owner.request.patch(base + '/api/v1/provider/organization', { headers, data: { version: filledCompany.version, name: filledCompany.name, coverFit: 'contain', reason: 'Local owner chooses full image' } })); assert.equal(fullCompany.coverFit, 'contain');
  const created = await json(await owner.request.post(base + '/api/v1/provider/projects', { headers, data: { name: { ar: 'كمبوند الاختبار المحلي', en: 'Local compound' }, imageUrl: photo.imageUrl, imageFit: 'contain', reason: 'Local owner project fixture' } }), 201);
  const project = { ...created, _id: new mongoose.Types.ObjectId(created.id) }; projects.push(project);
  if (profileCards) await db.collection('projects').updateOne({ _id: project._id }, { $set: { website: 'https://example.com/local-compound' } });
  await db.collection('projects').updateOne({ _id: project._id }, { $set: { status: 'published' } });
  const projectList = await json(await owner.request.get(base + '/api/v1/provider/projects?limit=100', { headers }));
  assert(projectList.items.some(item => item.id === created.id)); assert(projectList.items.every(item => item.providerId === String(developer.id)));
  const template = await db.collection('properties').findOne({ status: 'published', active: true }); assert(template);
  async function listing(user, name, linked = false) {
    const row = { ...template, _id: oid(), providerId: user.id, organizationId: user.org._id, kind: linked ? 'unit' : 'property', name: { ar: name, en: name }, slug: `${prefix}-property-${properties.length}`, sourceType: user.type, imageUrl: '/assets/canonical/public/listing-property-home.png', status: 'published', active: true, viewCount: 37, featured: true, featuredAt: stamp, featuredOrder: properties.length, version: 0, createdAt: stamp, updatedAt: stamp };
    delete row.publicCode; delete row.expiresAt; delete row.parentPropertyId; delete row.projectId; delete row.homepageExcluded;
    if (linked) row.projectId = project._id;
    properties.push(row); await db.collection('properties').insertOne(row); return row;
  }
  await listing(developer, 'Local standalone');
  const unit = await listing(developer, 'Local project unit', true), officeHome = await listing(office, 'Local office listing');
  // Account/profile aliases used by older published office data must still hydrate.
  await db.collection('properties').updateOne({ _id: officeHome._id }, { $unset: { organizationId: '' }, $set: { providerId: office.profileId.toString() } });
  const draft = await json(await owner.request.post(base + '/api/v1/provider/properties', { headers, data: { kind: 'unit', name: { en: 'Local draft project unit' }, transactionType: 'sale', projectId: created.id, reason: 'Local project property creation' } }), 201);
  properties.push({ _id: new mongoose.Types.ObjectId(draft.id) }); assert.equal(draft.projectId, created.id);
  const details = await json(await owner.request.patch(base + `/api/v1/provider/properties/${draft.id}/steps/details`, { headers, data: { version: draft.version, deliveryStatus: 'partial_infrastructure', reason: 'Local partial infrastructure check' } }));
  assert.equal(details.deliveryStatus, 'partial_infrastructure'); assert.equal((await db.collection('properties').findOne({ _id: new mongoose.Types.ObjectId(draft.id) })).deliveryStatus, 'partial_infrastructure');
  const foreignProject = oid(); projects.push({ _id: foreignProject });
  await db.collection('projects').insertOne({ _id: foreignProject, providerId: office.id, organizationId: office.org._id, name: { en: 'Other owner private project' }, slug: 'other-owner', status: 'draft', version: 0, createdAt: stamp, updatedAt: stamp });
  const denied = await owner.request.post(base + '/api/v1/provider/properties', { headers, data: { kind: 'unit', name: { en: 'Foreign project attempt' }, transactionType: 'sale', projectId: String(foreignProject), reason: 'Local ownership isolation check' } });
  if (denied.status() === 201) properties.push({ _id: new mongoose.Types.ObjectId((await denied.json()).data.id) });
  assert([400, 403, 404].includes(denied.status()), `Foreign project must be rejected, received ${denied.status()}`);
  assert.equal((await owner.request.patch(base + `/api/v1/provider/properties/${draft.id}/steps/basic`, { headers, data: { version: details.version, projectId: String(foreignProject), reason: 'Reject changed foreign project' } })).status(), 404);
  const ownList = await json(await owner.request.get(base + '/api/v1/provider/projects?limit=100', { headers })); assert(!ownList.items.some(item => item.id === String(foreignProject)));
  // Valid minimal PDF goes through the real media upload/storage path.
  const pdfObjects = ['<</Type/Catalog/Pages 2 0 R>>', '<</Type/Pages/Count 1/Kids[3 0 R]>>', '<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 300]/Contents 4 0 R>>', '<</Length 18>>\nstream\n30 30 240 240 re S\nendstream'];
  let pdfDocument = '%PDF-1.4\n'; const offsets = [0];
  for (const [index, object] of pdfObjects.entries()) { offsets.push(Buffer.byteLength(pdfDocument)); pdfDocument += `${index + 1} 0 obj\n${object}\nendobj\n`; }
  const xref = Buffer.byteLength(pdfDocument); pdfDocument += `xref\n0 5\n0000000000 65535 f \n${offsets.slice(1).map(offset => String(offset).padStart(10, '0') + ' 00000 n \n').join('')}trailer\n<</Size 5/Root 1 0 R>>\nstartxref\n${xref}\n%%EOF\n`;
  const pdf = Buffer.from(pdfDocument);
  const plan = await json(await owner.request.post(base + `/api/v1/provider/properties/${draft.id}/media`, { headers: { ...headers, 'content-type': 'application/pdf', 'x-media-kind': 'floor_plan', 'x-file-name': 'floor-plan.pdf' }, data: pdf }), 201);
  if (unitReview) {
    await db.collection('projects').updateOne({ _id: project._id }, { $set: { status: 'draft' } });
    await db.collection('properties').updateOne({ _id: new mongoose.Types.ObjectId(draft.id) }, { $set: { status: 'pending_review', imageUrl: photo.imageUrl } });
    await db.collection('properties').updateOne({ _id: unit._id }, { $set: { imageUrl: photo.imageUrl } });
    for (const engine of [chromium, webkit]) {
      await rateWindow(); const reviewBrowser = await engine.launch();
      const reviewer = await reviewBrowser.newContext(); contexts.push(reviewer);
      try {
        const adminSession = await json(await reviewer.request.post(base + '/api/v1/auth/login', { data: { email: 'admin.demo@example.invalid', password: 'LocalPreview-Admin-Only-2026!' } }));
        const reviewHeaders = { authorization: `Bearer ${adminSession.accessToken}` };
        const pending = await json(await reviewer.request.get(base + `/api/v1/admin/properties/${draft.id}`, { headers: reviewHeaders }));
        assert.equal(pending.reviewContext.project.name.en, 'Local compound'); assert.equal(pending.reviewContext.project.status, 'draft');
        assert.equal(pending.reviewContext.project.publicPath, undefined); assert.equal(pending.reviewContext.organization.adminPath, `/admin/providers/${developer.applicationId}`);
        assert.equal((await reviewer.request.get(base + `/api/v1/admin/providers/${developer.applicationId}`, { headers: reviewHeaders })).status(), 200);
        const reviewPage = await reviewer.newPage(); reviewPage.on('pageerror', error => report.browserErrors.push(String(error)));
        for (const width of [390, 820, 1440]) {
          if (profileCards) await rateWindow();
          await reviewPage.setViewportSize({ width, height: 950 });
          await visit(reviewPage, base + `/admin/properties/review?propertyId=${draft.id}&lang=ar`);
          const summary = reviewPage.locator('.admin-property-review-summary');
          await expect(summary.getByRole('heading', { name: 'كمبوند الاختبار المحلي' })).toBeVisible();
          await expect(summary.getByRole('heading', { name: 'شركة الاختبار المحلي' })).toBeVisible();
          await expect(summary.getByRole('link', { name: 'فتح المشروع في الموقع' })).toHaveCount(0);
          await expect(summary.locator('.admin-property-review-summary__technical')).not.toHaveAttribute('open', '');
          const mediaFrame = await summary.locator('.admin-property-review-summary__media').boundingBox(), mediaImage = await summary.locator('.admin-property-review-summary__media img').boundingBox();
          assert(mediaFrame && mediaImage && Math.abs(mediaImage.height - mediaFrame.height) <= 1 && Math.abs(mediaImage.width - mediaFrame.width) <= 1, 'the full portrait preview must fit its frame rather than overflowing and being clipped');
          assert.equal(await summary.locator('.admin-property-review-summary__media img').evaluate(el => getComputedStyle(el).objectFit), 'contain');
          assert(await reviewPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
          await summary.screenshot({ path: `${output}/${engine.name()}-pending-compound-review-${width}.png` });
          if (width === 390) {
            await summary.getByRole('link', { name: 'مراجعة المشروع بالإدارة' }).click(); await reviewPage.waitForLoadState('networkidle');
            await expect(reviewPage.locator('.admin-projects__detail-card').filter({ hasText: 'كمبوند الاختبار المحلي' }).first()).toBeVisible();
          }
          if (profileCards) {
            await visit(reviewPage, base + '/admin/projects?lang=ar');
            const identity = reviewPage.getByTestId(`admin-project-${created.id}`).locator('.admin-projects__identity');
            await expect(identity).toBeVisible();
            const image = identity.locator('img'); await expect(image).toHaveJSProperty('naturalHeight', 960);
            assert.equal(await image.evaluate(el => getComputedStyle(el).objectFit), 'contain');
            assert(await reviewPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
            await identity.screenshot({ path: `${output}/${engine.name()}-admin-project-image-${width}.png` });
            await identity.click(); await reviewPage.waitForLoadState('networkidle');
            const preview = reviewPage.getByAltText('معاينة صورة المشروع'); await expect(preview).toHaveJSProperty('naturalHeight', 960);
            assert.equal(await preview.evaluate(el => getComputedStyle(el).objectFit), 'contain');
            const frame = await preview.locator('..').boundingBox(), bounds = await preview.boundingBox(); assert(Math.abs(frame.height - bounds.height) < 1);
          }
        }
        if (profileCards) await rateWindow();
        const providerRead = await json(await owner.request.get(base + `/api/v1/provider/properties/${draft.id}`, { headers }));
        assert.equal(providerRead.reviewContext, undefined, 'administrative project context is never emitted in provider reads');
        report.checks.push(`${engine.name()}: pending unit identifies its draft compound and provider at 390/820/1440px; real administrative project/provider links work, draft public link is absent, technical IDs are collapsed, provider reads exclude administrative context`);
        if (profileCards) report.checks.push(`${engine.name()}: administrative project thumbnails and protected editor previews retain the complete portrait at 390/820/1440px, with working review navigation and no horizontal overflow`);
      } finally { await reviewer.close(); contexts.splice(contexts.indexOf(reviewer), 1); await reviewBrowser.close(); }
    }
    await db.collection('projects').updateOne({ _id: project._id }, { $set: { status: 'published' } });
  }
  await db.collection('properties').updateOne({ _id: new mongoose.Types.ObjectId(draft.id) }, { $set: { status: 'published', active: true } });
  assert.equal((await json(await owner.request.get(base + `/api/v1/public/properties/${draft.slug}`))).deliveryStatus, 'partial_infrastructure');
  assert((await json(await owner.request.get(base + '/api/v1/public/properties?deliveryStatus=partial_infrastructure&limit=100'))).items.some(item => item.id === draft.id));
  const publicPlan = await owner.request.get(base + `/api/v1/public/properties/${draft.id}/media/${plan.id}/content`); assert.equal(publicPlan.status(), 200); assert.match(publicPlan.headers()['content-type'], /application\/pdf/);
  const officeData = await json(await owner.request.get(base + `/api/v1/public/developers/${office.org.slug}`)); assert.equal(officeData.kind, 'brokerage_office'); assert(officeData.properties.some(item => item.id === String(officeHome._id))); assert.equal(officeData.contactPhone, undefined);
  const search = await json(await owner.request.get(base + '/api/v1/public/properties?search=Local%20project%20unit&limit=100'));
  const affiliated = search.items.find(item => item.id === String(unit._id)); assert(affiliated); assert.equal(affiliated.projectName.en, 'Local compound'); assert.match(affiliated.projectUrl, new RegExp(`/developers/${developer.org.slug}/projects/`));
  report.checks.push('Real Mongo/API: office account/profile aliases hydrate published units while preserving kind and contact privacy; project list and unit links are owner-only; partial infrastructure persists; PDF uploads and streams as application/pdf; project labels link to the right compound');
  const providerPage = await owner.newPage(); providerPage.on('pageerror', error => report.browserErrors.push(String(error)));
  await visit(providerPage, `${base}/provider/properties/new/basic?projectId=${created.id}&lang=en`); await expect(providerPage.locator('#provider-property-project')).toHaveValue(created.id); await expect(providerPage.locator('#provider-property-project option:checked')).toHaveText('Local compound');
  assert.equal(await providerPage.locator('#provider-property-project option').count(), ownList.items.length + 1);
  report.checks.push('Provider browser: entering Add property to this project automatically selects its named project; all own projects load without expanding/searching or entering an ID');
  await owner.close(); contexts.splice(contexts.indexOf(owner), 1); await browser.close(); browser = undefined;
  for (const engine of [chromium, webkit]) {
    await rateWindow(); browser = await engine.launch(); const guest = await browser.newContext(); contexts.push(guest); const page = await guest.newPage();
    page.on('pageerror', error => report.browserErrors.push(String(error)));
    for (const width of [390, 820, 1440]) {
      if (profileCards) await rateWindow();
      await page.setViewportSize({ width, height: 950 });
      await visit(page, `${base}/developers/${developer.org.slug}?lang=ar`); await expect(page.locator('.public-developer-profile__identity')).toBeVisible();
      const logo = page.locator('.public-developer-profile__identity-logo');
      await expect(page.locator('.public-developer-profile__hero-media > img')).toHaveJSProperty('naturalHeight', 960);
      if (width === 390) assert.equal(await logo.evaluate(el => getComputedStyle(el).borderTopWidth), '0px');
      const cards = page.locator('.public-developer-profile__property-card'); await expect(cards).toContainText(['Local standalone']); await expect(cards).toHaveCount(1);
      if (unitReview) {
        const frame = await cards.locator('.public-developer-profile__property-media').boundingBox(); assert(Math.abs(frame.width / frame.height - 4 / 3) < .02);
        const image = await cards.locator('.public-developer-profile__property-media img').boundingBox(); assert(Math.abs(image.height - frame.height) <= 1 && Math.abs(image.width - frame.width) <= 1);
        assert.deepEqual(await cards.evaluate(el => { const style = getComputedStyle(el); return [style.backgroundColor, style.borderTopWidth, style.paddingTop]; }), ['rgb(255, 255, 255)', '1px', '0px']);
        await expect(cards.locator('.public-developer-profile__property-footer')).toContainText('عرض تفاصيل العقار');
      }
      const projectImage = page.locator('.public-developer-profile__project-media > img'); assert.equal(await projectImage.evaluate(el => getComputedStyle(el).objectFit), 'contain');
      if (profileCards) {
        const hero = page.locator('.public-developer-profile__hero-media > img'); await expect(hero).toHaveAttribute('src', photo.imageUrl);
        const logoImage = logo.locator('img'); assert.equal(await logoImage.evaluate(el => getComputedStyle(el).objectFit), 'contain');
        assert.deepEqual(await logoImage.evaluate(el => [getComputedStyle(el).borderTopWidth,getComputedStyle(el).paddingTop]), ['0px','0px']);
        assert.equal(await cards.locator('.public-developer-profile__property-media img').evaluate(el => getComputedStyle(el).objectFit), 'contain');
        const cardFrame = await projectImage.locator('..').boundingBox(); assert(Math.abs(cardFrame.width/cardFrame.height-4/3)<.02);
      }
      await page.screenshot({ path: `${output}/${engine.name()}-company-${width}.png`, fullPage: true });
      await visit(page, `${base}/developers/${developer.org.slug}/projects/${created.slug}?lang=ar`); await expect(page.locator('.public-developer-profile__property-card').filter({ hasText: 'Local project unit' })).toBeVisible(); await expect(page.locator('.public-developer-profile__property-card').filter({ hasText: 'Local standalone' })).toHaveCount(0);
      if (profileCards) {
        const website = page.getByRole('link', { name: 'زيارة الموقع الإلكتروني' }); await expect(website).toHaveAttribute('href','https://example.com/local-compound'); await expect(website).toHaveAttribute('rel','noopener noreferrer');
        assert.equal(await website.evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(245, 206, 104)'); assert.equal(await website.locator('svg').count(),1);
        await page.keyboard.press('Tab'); await website.focus(); assert(await website.evaluate(el => el.matches(':focus-visible') && (getComputedStyle(el).outlineStyle !== 'none' || getComputedStyle(el).boxShadow !== 'none')), 'keyboard focus has a visible indicator');
        await page.screenshot({ path: `${output}/${engine.name()}-project-website-${width}.png`, fullPage: true });
      }
      if (unitReview) {
        const label = page.locator('.public-developer-profile__property-card').filter({ hasText: 'Local project unit' }).locator('.public-property-project-label'); await label.scrollIntoViewIfNeeded();
        assert(await label.evaluate(el => { const box = el.getBoundingClientRect(); return document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)?.closest('a') === el; }), 'the project label must stay clickable above the card’s stretched property link');
        await page.locator('.public-developer-profile__property-card').filter({ hasText: 'Local project unit' }).screenshot({ path: `${output}/${engine.name()}-unit-card-${width}.png` });
      }
      await visit(page, `${base}/developers/${office.org.slug}?lang=ar#developer-properties`); await expect(page.locator('.public-developer-profile__property-card').filter({ hasText: 'Local office listing' })).toBeVisible(); await expect(page.locator('.public-developer-profile__kind')).toHaveText('مكتب وساطة');
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await page.screenshot({ path: `${output}/${engine.name()}-office-${width}.png`, fullPage: true });
      await visit(page, base + '/?lang=ar'); const homeCard = page.locator('.public-homepage__property-card').filter({ hasText: 'Local project unit' }); await expect(homeCard.locator('.public-property-views')).toBeVisible(); await expect(homeCard.locator('.public-property-project-label')).toContainText('كمبوند الاختبار المحلي');
      const badge = await homeCard.locator('.public-property-views').boundingBox(); assert(badge.height >= 24 && badge.width >= 65); assert.equal(await homeCard.locator('.public-property-views svg').evaluate(el => el.getBoundingClientRect().width), 16);
      await visit(page, base + '/properties?search=Local&lang=ar'); await expect(page.locator('.public-property-listing__card').first()).toBeVisible(); assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await page.screenshot({ path: `${output}/${engine.name()}-listing-${width}.png`, fullPage: true });
      report.checks.push(`${engine.name()} ${width}px: borderless phone identity, complete image fit, office named correctly with working units/anchor, compound units separated, visible view badges and project labels, listing cards without overflow`);
    }
    await rateWindow();
    await db.collection('organizations').updateOne({ _id: developer.org._id }, { $set: { coverFit: 'cover' } }); await db.collection('projects').updateOne({ _id: project._id }, { $set: { imageFit: 'cover' } });
    await visit(page, `${base}/developers/${developer.org.slug}?lang=en`); assert.equal(await page.locator('.public-developer-profile__hero-media > img').evaluate(el => getComputedStyle(el).objectFit), 'cover'); assert.equal(await page.locator('.public-developer-profile__project-media > img').evaluate(el => getComputedStyle(el).objectFit), 'cover');
    await db.collection('organizations').updateOne({ _id: developer.org._id }, { $set: { coverFit: 'contain' } }); await db.collection('projects').updateOne({ _id: project._id }, { $set: { imageFit: 'contain' } });
    await visit(page, `${base}/properties/${draft.slug}?lang=en`); await expect(page.locator('.public-property-details__floor-plan')).toBeVisible(); await expect(page.getByRole('link', { name: 'Open or download floor plan (PDF)' })).toHaveAttribute('href', `/api/v1/public/properties/${draft.id}/media/${plan.id}/content`);
    await page.getByRole('button', { name: 'Report this property', exact: true }).click(); await expect(page.getByRole('dialog')).toContainText('Sign in'); await page.keyboard.press('Escape');
    await login(guest, seeker); await page.evaluate(() => window.localStorage.setItem('sadat-real-estate.auth.session-hint', 'authenticated')); await page.reload(); await page.waitForLoadState('networkidle'); await expect(page.locator('[data-auth-resolution=pending]')).toHaveCount(0); await page.getByRole('button', { name: 'Report this property', exact: true }).click(); await expect(page.getByRole('dialog')).toContainText('Report reason');
    await page.getByLabel('Details for administration').fill(`Local test report ${engine.name()}`); const sent = page.waitForResponse(response => response.url().endsWith(`/provider/properties/${draft.id}/reports`) && response.request().method() === 'POST'); await page.getByRole('button', { name: 'Submit report', exact: true }).click(); const sentResponse = await sent; assert.equal(sentResponse.status(), engine === chromium ? 201 : 409); const reportAuthorization = sentResponse.request().headers().authorization;
    if (engine === chromium) await expect(page.getByRole('dialog')).toContainText('Your report was sent'); else await expect(page.getByRole('dialog')).toContainText('already reported');
    const invisible = await guest.request.post(base + `/api/v1/provider/properties/${oid()}/reports`, { headers: { authorization: reportAuthorization }, data: { reason: 'inaccurate' } }); assert.equal(invisible.status(), 404);
    report.checks.push(`${engine.name()}: contain/cover applies to cover and project; PDF renders a working document link; guests sign in to report, verified seeker creates a private real report, duplicate rejected, missing target rejected`);
    await guest.close(); contexts.splice(contexts.indexOf(guest), 1); await browser.close(); browser = undefined;
  }
  // Real AuthClient, HttpOnly rotation and cross-tab locks; only a tiny HTML harness is served locally.
  const harness = await build({ stdin: { contents: "import {AuthClient} from './apps/web/src/features/auth/client.ts'; import {ApiClient} from './apps/web/src/features/contracts/api-client.ts'; window.fixtureClient = new AuthClient({apiClient:new ApiClient({baseUrl:location.origin})});", resolveDir: process.cwd(), sourcefile: 'auth-fixture.ts' }, bundle: true, write: false, format: 'iife', platform: 'browser', define: { 'import.meta.env': '{}' } });
  for (const engine of [chromium, webkit]) {
    await rateWindow(); browser = await engine.launch();
    for (const credentials of [{ email: developer.email, password }, { email: seeker.email, password }, { email: 'admin.demo@example.invalid', password: 'LocalPreview-Admin-Only-2026!' }]) {
      const endpoint = credentials.email === developer.email ? '/provider/organization' : credentials.email === seeker.email ? '/seeker/favorites' : '/admin/property-reports?limit=1';
      const context = await browser.newContext(); contexts.push(context);
      await context.route('**/local-auth-fixture', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Local auth fixture</title><script>' + harness.outputFiles[0].text + '</script>' }));
      const tabs = await Promise.all([context.newPage(), context.newPage()]); await Promise.all(tabs.map(tab => tab.goto(base + '/local-auth-fixture')));
      assert(await tabs[0].evaluate(() => Boolean(window.navigator.locks)), 'Supported browser must coordinate rotating cookies with Web Locks');
      await tabs[0].evaluate(input => window.fixtureClient.loginAdmin(input), credentials);
      for (let round = 0; round < 3; round++) {
        assert((await Promise.all(tabs.map(tab => tab.evaluate(() => window.fixtureClient.refresh().then(snapshot => snapshot.status))))).every(status => status === 'authenticated'));
        const privateStatuses = await Promise.all(tabs.map(tab => tab.evaluate(endpoint => fetch(window.location.origin + '/api/v1' + endpoint, { headers: { authorization: window.fixtureClient.getAuthorizationHeader() }, credentials: 'include' }).then(response => response.status), endpoint)));
        assert.deepEqual(privateStatuses, [200, 200], 'rotation in one tab must not invalidate another tab’s access to actual protected endpoints');
      }
      await context.setOffline(true); await tabs[0].evaluate(() => window.fixtureClient.refresh().catch(() => undefined)); assert.equal(await tabs[0].evaluate(() => window.fixtureClient.getSnapshot().status), 'authenticated'); await context.setOffline(false);
      await tabs[1].reload(); assert.equal(await tabs[1].evaluate(() => window.fixtureClient.refresh().then(snapshot => snapshot.status)), 'authenticated');
      const previousAuthorization = await tabs[1].evaluate(() => window.fixtureClient.getAuthorizationHeader());
      await tabs[0].evaluate(() => window.fixtureClient.logout()); await expect.poll(() => tabs[1].evaluate(() => window.fixtureClient.getSnapshot().status)).toBe('anonymous');
      assert.equal((await context.request.get(base + '/api/v1' + endpoint, { headers: { authorization: previousAuthorization } })).status(), 401, 'logout revokes the entire replacement chain for old access tokens too');
      assert.equal(await tabs[1].evaluate(() => window.fixtureClient.refresh().then(snapshot => snapshot.status)), 'anonymous');
      report.checks.push(`${engine.name()} ${credentials.email === developer.email ? 'provider' : credentials.email === seeker.email ? 'seeker' : 'admin'}: simultaneous two-tab rotations ×3, offline recovery retains authenticated screen, reload restores cookie, logout broadcasts and revoked refresh stays anonymous`);
      await context.close(); contexts.splice(contexts.indexOf(context), 1);
    }
    const replay = await browser.newContext(); contexts.push(replay);
    await login(replay, developer); const cookie = (await replay.cookies()).find(cookie => /refresh/u.test(cookie.name)); assert(cookie);
    const rotated = await json(await replay.request.post(base + '/api/v1/auth/refresh', { data: {} }));
    assert.equal((await replay.request.post(base + '/api/v1/auth/refresh', { headers: { cookie: `${cookie.name}=${cookie.value}` }, data: {} })).status(), 401);
    assert.equal((await replay.request.get(base + '/api/v1/provider/organization', { headers: { authorization: `Bearer ${rotated.accessToken}` } })).status(), 401, 'replayed refresh token revokes the live session and all earlier access sessions');
    await replay.close(); contexts.splice(contexts.indexOf(replay), 1);
    report.checks.push(`${engine.name()}: protected API access stays valid in both tabs through rotation; logout and explicit old-refresh replay still revoke access immediately`);
    await browser.close(); browser = undefined;
  }
  const savedReport = await db.collection('property_reports').findOne({ propertyId: new mongoose.Types.ObjectId(draft.id), reporterId: seeker.id }); assert(savedReport && savedReport.status === 'open');
  await rateWindow(); browser = await chromium.launch(); const admin = await browser.newContext(); contexts.push(admin);
  const adminSession = await json(await admin.request.post(base + '/api/v1/auth/login', { data: { email: 'admin.demo@example.invalid', password: 'LocalPreview-Admin-Only-2026!' } }));
  const listedReports = await json(await admin.request.get(base + `/api/v1/admin/property-reports?propertyId=${draft.id}`, { headers: { authorization: `Bearer ${adminSession.accessToken}` } })); assert(listedReports.items.some(item => item.id === String(savedReport._id)));
  const adminPage = await admin.newPage(); adminPage.on('pageerror', error => report.browserErrors.push(String(error)));
  await visit(adminPage, base + `/admin/property-reports?propertyId=${draft.id}&reportId=${savedReport._id}&lang=ar`); await expect(adminPage.locator('.admin-properties__report-detail')).toContainText('Local test report');
  await adminPage.waitForLoadState('networkidle');
  await visit(adminPage, base + `/admin/properties/review?propertyId=${draft.id}&lang=ar`); await expect(adminPage.locator('.admin-property-editor__floor-plan')).toContainText('PDF'); await expect(adminPage.locator('.admin-property-editor__floor-plan a').first()).toHaveAttribute('href', /^blob:/u); await expect(adminPage.locator('#admin-property-delivery-status')).toHaveValue('partial_infrastructure');
  await adminPage.waitForLoadState('networkidle');
  report.checks.push('Admin browser: the seeker report appears with its real property and reason in moderation; review opens a protected PDF document and edits the saved partial-infrastructure delivery option');
  assert.deepEqual(report.browserErrors, []); report.status = 'PASS_LOCAL';
} catch (error) { report.status = 'FAIL_LOCAL'; report.error = String(error.stack ?? error); process.exitCode = 1; }
finally {
  for (const context of contexts) await context.close().catch(() => {}); await browser?.close().catch(() => {});
  const userIds = users.map(user => user.id), propertyIds = properties.map(value => value._id), orgIds = organizations.map(value => value._id);
  for (const name of ['organization_photos', 'property_media']) for (const row of await db.collection(name).find(name === 'organization_photos' ? { createdBy: { $in: userIds } } : { propertyId: { $in: propertyIds } }).toArray()) if (typeof row.storageKey === 'string' && /^quarantine\/[a-f0-9]{32}$/u.test(row.storageKey)) { const target = path.resolve(storageRoot, row.storageKey); assert(target.startsWith(storageRoot + path.sep)); await rm(target, { force: true }); }
  for (const name of ['users', 'provider_profiles', 'provider_applications', 'admin_credentials', 'sessions', 'provider_identity_subscriptions', 'organization_photos']) await db.collection(name).deleteMany({ $or: [{ _id: { $in: [...userIds, ...users.flatMap(user => [user.profileId, user.applicationId])] } }, { userId: { $in: userIds } }, { createdBy: { $in: userIds } }] });
  await db.collection('organizations').deleteMany({ _id: { $in: orgIds } }); await db.collection('projects').deleteMany({ _id: { $in: projects.map(value => value._id) } });
  for (const name of ['properties', 'property_media', 'property_reports', 'property_view_events']) await db.collection(name).deleteMany({ $or: [{ _id: { $in: propertyIds } }, { propertyId: { $in: propertyIds } }] });
  await db.collection('audit_logs').deleteMany({ $or: [{ actorId: { $in: userIds.map(String) } }, { targetId: { $in: [...propertyIds, ...projects.map(value => value._id)].map(String) } }] });
  await db.close(); report.cleanup = true; await writeFile(`docs/quality/guide-runs/${profileCards ? 'profile-cards' : unitReview ? 'unit-review' : 'production-followup'}-local-latest.json`, JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify(report, null, 2));
