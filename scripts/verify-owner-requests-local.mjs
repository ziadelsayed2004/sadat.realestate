import assert from 'node:assert/strict';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import mongoose from 'mongoose';
import sharp from 'sharp';
import { chromium, webkit, expect } from '@playwright/test';
import { createArgon2PasswordHasher } from '../apps/api/src/modules/auth/crypto.ts';
import { featuredHomepagePlacementFields } from '../apps/api/src/modules/ads/homepage-placements.ts';
import { egyptLocalDateTime } from '../apps/web/src/features/public/egypt-time.ts';
import { readEnvironmentFile } from './environment-file.mjs';

const env = await readEnvironmentFile('.env.local'), uri = new URL(env.MONGODB_URI);
assert(['localhost', '127.0.0.1'].includes(uri.hostname) && uri.port === '27018');
const db = await mongoose.createConnection(uri.href).asPromise(), base = 'http://127.0.0.1:4173';
const oid = () => new mongoose.Types.ObjectId(), suffix = Date.now(), password = 'Local-Owner-Only!2026', stamp = new Date();
const providers = ['individual_broker', 'brokerage_office', 'developer_company'].map(type => ({ type, user: oid(), application: oid(), profile: oid(), email: `${type}-${suffix}@example.invalid` }));
const seeker = { user: oid(), email: `seeker-${suffix}@example.invalid` }, propertyId = oid();
const requestIds = [], leadIds = [], bannerIds = [], mediaIds = [], postIds = [], contexts = [], browsers = [], storageKeys = [];
const report = { status: 'RUNNING', mockedRoutes: false, checks: [], timings: [], browserErrors: [], httpErrors: [], cleanup: false };
const output = '.tmp/owner-requests', storageRoot = path.resolve(env.PRIVATE_STORAGE_LOCAL_ROOT || path.join(os.tmpdir(), 'sadat-real-estate-private-storage'));
await mkdir(output, { recursive: true });
let settingsBefore, settingsChanged = false, bannerSettingsBefore, placementsBefore, stage = 'setup';
async function login(browser, email, secret = password) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } }); contexts.push(context);
  const response = await context.request.post(base + '/api/v1/auth/login', { data: { email, password: secret } });
  assert.equal(response.status(), 200, await response.text());
  return { context, token: (await response.json()).data.accessToken };
}
async function raw(actor, method, url, data, extra = {}, retried = false) {
  const response = await actor.context.request.fetch(base + '/api/v1' + url, { method, ...(data === undefined ? {} : { data }), ...extra, headers: { authorization: `Bearer ${actor.token}`, ...extra.headers } });
  if (response.status() === 401 && !retried) {
    const refresh = await actor.context.request.post(base + '/api/v1/auth/refresh', { data: {} });
    assert.equal(refresh.status(), 200, await refresh.text()); actor.token = (await refresh.json()).data.accessToken;
    return raw(actor, method, url, data, extra, true);
  }
  return response;
}
async function api(actor, method, url, data, extra) {
  const response = await raw(actor, method, url, data, extra);
  assert(response.ok(), `${method} ${url} ${response.status()} ${await response.text()}`); return (await response.json()).data;
}
async function ready(page) {
  await expect(page.locator('[data-auth-resolution=pending]')).toHaveCount(0);
  await expect(page.locator('#site-intro')).toBeHidden();
  await page.evaluate(() => document.fonts.ready);
}
async function newPage(actor, width = 390) {
  const page = await actor.context.newPage(); await page.setViewportSize({ width, height: 844 });
  page.on('response', response => {
    const url = new URL(response.url());
    if (response.status() >= 400 && url.pathname.startsWith('/api/')) report.httpErrors.push({ path: url.pathname, status: response.status() });
    if (url.pathname === '/api/v1/auth/refresh' && response.status() === 200) void response.json().then(body => { actor.token = body.data.accessToken; }, () => {});
  });
  page.on('pageerror', error => report.browserErrors.push(String(error))); return page;
}
async function noOverflow(page) { assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'No horizontal document overflow'); }
async function rateWindow() {
  const response = await fetch(base + '/api/v1/public/bootstrap');
  if (response.status === 429 || Number(response.headers.get('ratelimit-remaining')) < 60) await new Promise(resolve => setTimeout(resolve, 60_000));
}
function recordCheck(value) { report.checks.push(value); console.log('CHECK', value); }
try {
  const hash = await createArgon2PasswordHasher().hash(password);
  for (const p of providers) {
    await db.collection('users').insertOne({ _id: p.user, normalizedEmail: p.email, roleType: 'provider', status: 'verified', version: 0, createdAt: stamp, updatedAt: stamp });
    await db.collection('provider_profiles').insertOne({ _id: p.profile, userId: p.user, providerType: p.type, status: 'approved', version: 0, createdAt: stamp, updatedAt: stamp });
    await db.collection('provider_applications').insertOne({ _id: p.application, userId: p.user, providerType: p.type, status: 'approved', brandName: 'Local owner request provider', displayName: 'Local owner request provider', accountOwnerFullName: 'Local owner', email: p.email, requirementVersion: `2026-10-15.${p.type === 'developer_company' ? 'developer' : 'broker'}.1`, version: 0, createdAt: stamp, updatedAt: stamp, statusChangedAt: stamp });
    if (p.type === 'developer_company') await db.collection('organizations').insertOne({ _id: p.profile, providerId: p.profile, kind: p.type, slug: `local-owner-company-${suffix}`, name: { ar: 'شركة تجربة محلية', en: 'Local owner request provider' }, status: 'approved', version: 0, createdAt: stamp, updatedAt: stamp });
  }
  await db.collection('users').insertOne({ _id: seeker.user, normalizedEmail: seeker.email, roleType: 'seeker', status: 'verified', version: 0, createdAt: stamp, updatedAt: stamp });
  await db.collection('seeker_profiles').insertOne({ userId: seeker.user, firstName: 'Local', lastName: 'Resident', version: 0, createdAt: stamp, updatedAt: stamp });
  await db.collection('admin_credentials').insertMany([...providers.map(p => p.user), seeker.user].map(userId => ({ userId, passwordHash: hash, passwordChangedAt: stamp, version: 0, createdAt: stamp, updatedAt: stamp })));
  const source = await db.collection('properties').findOne({ status: 'published', active: true }); assert(source);
  const property = { ...source, _id: propertyId, slug: `owner-requests-${suffix}`, publicCode: `owner-requests-${suffix}`, name: { ar: 'عقار اختبار طلبات المالك', en: 'Owner request test property' }, featured: false, featuredOrder: 100, version: 0, createdAt: stamp, updatedAt: stamp };
  delete property.projectId; delete property.publicCode; delete property.expiresAt;
  property.providerId = providers[2].user; property.organizationId = providers[2].profile; property.sourceType = 'developer_company';
  await db.collection('properties').insertOne(property);
  settingsBefore = await db.collection('admin_settings').findOne({ namespace: 'advertising' });
  settingsChanged = true;
  bannerSettingsBefore = await db.collection('ad_settings').find({}).toArray();
  placementsBefore = await db.collection('ad_placements').find({ key: { $in: ['homepage.hero', 'homepage.featured'] } }).toArray();
  await db.collection('ad_placements').updateOne({ key: 'homepage.featured' }, { $set: featuredHomepagePlacementFields(providers[2].user, stamp) }, { upsert: true });
  if (settingsBefore) await db.collection('admin_settings').updateOne({ _id: settingsBefore._id }, { $addToSet: { 'values.payment_proof_methods': 'cash' } });
  else await db.collection('admin_settings').insertOne({ namespace: 'advertising', values: { payment_proof_methods: ['cash'], cash_payment_details: ['Synthetic local payment only'] }, version: 0, createdAt: stamp, updatedAt: stamp });
  for (const engine of [chromium, webkit]) {
    await rateWindow();
    const browser = await engine.launch(); browsers.push(browser);
    const admin = await login(browser, 'admin.demo@example.invalid', 'LocalPreview-Admin-Only-2026!');
    await api(admin, 'GET', `/admin/properties/${propertyId}`);
    const resident = await login(browser, seeker.email);
    const actors = await Promise.all(providers.map(p => login(browser, p.email)));
    const adminPage = await newPage(admin);
    for (const [index, p] of providers.entries()) {
      stage = `${engine.name()} subscription ${p.type}`;
      await adminPage.goto(`${base}/admin/providers/${p.application}?lang=ar`); await ready(adminPage);
      const form = adminPage.locator('#provider-subscription-form'); await expect(form).toBeVisible();
      const period = form.locator('input[type=datetime-local]');
      await period.nth(0).fill(egyptLocalDateTime(new Date(Date.now() - 3600000)));
      await period.nth(1).fill(egyptLocalDateTime(new Date(Date.now() + 86400000)));
      await form.getByRole('checkbox').check();
      const saved = adminPage.waitForResponse(r => r.url().endsWith('/public-identity-subscription') && r.request().method() === 'PUT' && r.status() !== 401);
      await form.getByRole('button', { name: /تفعيل الظهور|تجديد/ }).click(); assert.equal((await saved).status(), 200);
      await expect(form.getByText('ظاهر الآن', { exact: true })).toBeVisible();
      const own = await api(actors[index], 'GET', '/provider/public-identity-subscription'); assert(own.visible && !own.canManage);
      const page = await newPage(actors[index]); await page.goto(base + '/provider/settings?tab=account&lang=ar'); await ready(page);
      await expect(page.locator('#provider-display-subscription')).toContainText('الاشتراك ساري'); await noOverflow(page);
      await page.screenshot({ path: `${output}/${engine.name()}-${p.type}-subscription.png`, fullPage: true });
      await page.close();
    }
    const denied = await raw(resident, 'GET', '/provider/public-identity-subscription'); assert.equal(denied.status(), 403);
    const p = providers[1];
    await db.collection('provider_applications').updateOne({ _id: p.application }, { $set: { status: 'under_review' } });
    const ineligible = await api(admin, 'GET', `/admin/providers/${p.application}/public-identity-subscription`); assert.equal(ineligible.eligible, false);
    assert.equal((await raw(admin, 'PUT', `/admin/providers/${p.application}/public-identity-subscription`, { status: 'active', paymentConfirmed: true, startAt: stamp.toISOString(), endAt: new Date(Date.now() + 86400000).toISOString(), expectedVersion: ineligible.version })).status(), 400);
    await db.collection('provider_applications').updateOne({ _id: p.application }, { $set: { status: 'approved' } });
    recordCheck(`${engine.name()}: all 3 provider types activate through real admin UI, read own period, seeker denied; unapproved activation rejected`);

    stage = `${engine.name()} seeker notice and WhatsApp`;
    const providerPage = await newPage(actors[0]); await providerPage.goto(`${base}/properties/${property.slug}?lang=ar`); await ready(providerPage);
    await expect(providerPage.getByRole('heading', { name: 'إجراءات الباحث', exact: true })).toBeVisible();
    const wa = providerPage.getByRole('link', { name: 'استفسر عن العقار عبر واتساب' }); await expect(wa).toHaveAttribute('href', /https:\/\/wa.me\/.*text=/);
    assert(decodeURIComponent(await wa.getAttribute('href')).includes(property.slug));
    await expect(providerPage.locator('#public-property-viewing-submit')).toHaveCount(0); await noOverflow(providerPage);
    recordCheck(`${engine.name()}: provider keeps seeker notice and can contact platform about the current property without seeker mutation controls`);

    stage = `${engine.name()} ad receipt persistence`;
    await rateWindow();
    const advertiser = actors[2];
    const requested = await api(advertiser, 'POST', '/provider/ads', { requestMode: 'assisted', contactPhone: '01012345678', purpose: `Local receipt persistence ${engine.name()} ${suffix}` }); requestIds.push(new mongoose.Types.ObjectId(requested.id));
    const reviewed = await api(admin, 'POST', `/admin/ad-requests/${requested.id}/review`, { action: 'approve', expectedVersion: requested.version, reason: 'Review synthetic local request' }); assert.equal(reviewed.request.status, 'waiting_pricing');
    await api(admin, 'POST', `/admin/ad-requests/${requested.id}/quote`, { campaign: { placementKey: 'homepage.featured', adType: 'featured_card', intervalStart: new Date(Date.now() + 86400000).toISOString(), intervalEnd: new Date(Date.now() + 172800000).toISOString() }, currency: 'EGP', lineItems: [{ description: 'Local test', quantity: 1, unitAmountMinor: 50000 }], validUntil: new Date(Date.now() + 3600000).toISOString(), terms: 'Synthetic local payment; no real money' });
    const adPage = await newPage(advertiser); await adPage.goto(`${base}/provider/ads/${requested.id}?lang=en`); await ready(adPage);
    await adPage.getByRole('button', { name: /Accept.*quote/i }).click(); await expect(adPage.locator('#provider-advertising-payment-method')).toBeVisible();
    await adPage.locator('#provider-advertising-payment-method').selectOption('cash');
    const image = await sharp({ create: { width: 80, height: 60, channels: 3, background: '#335577' } }).png().toBuffer();
    await adPage.locator('input[type=file]').setInputFiles({ name: 'local-receipt.png', mimeType: 'image/png', buffer: image });
    await expect(adPage.getByRole('button', { name: 'Send request', exact: true })).toBeEnabled();
    const [upload] = await Promise.all([adPage.waitForResponse(r => r.url().endsWith('/payment-proof') && r.request().method() === 'POST' && r.status() !== 401), adPage.getByRole('button', { name: 'Send request', exact: true }).click()]); assert.equal(upload.status(), 201);
    await expect(adPage.getByText(/Your request and transfer proof have been submitted/)).toBeVisible(); await adPage.reload(); await ready(adPage); await expect(adPage.getByText(/Your request and transfer proof have been submitted/)).toBeVisible();
    await expect(adPage.locator('input[type=file]')).toHaveCount(0);
    const other = await sharp({ create: { width: 80, height: 60, channels: 3, background: '#553377' } }).png().toBuffer();
    const second = await raw(advertiser, 'POST', `/provider/ads/${requested.id}/payment-proof`, other, { headers: { 'content-type': 'image/png', 'x-file-name': 'different.png', 'x-payment-method': 'cash' } }); assert.equal(second.status(), 409);
    let proof = await db.collection('payment_proofs').findOne({ adRequestId: new mongoose.Types.ObjectId(requested.id), active: true, status: 'pending_review' }); assert(proof); storageKeys.push(proof.storageKey);
    await api(admin, 'POST', `/admin/payment-proofs/${proof._id}/review`, { action: 'reject', expectedVersion: proof.version, reason: 'Correct synthetic receipt for test' });
    await adPage.reload(); await ready(adPage); await expect(adPage.locator('input[type=file]')).toBeVisible();
    await adPage.locator('#provider-advertising-payment-method').selectOption('cash');
    await adPage.locator('input[type=file]').setInputFiles({ name: 'local-receipt.png', mimeType: 'image/png', buffer: image });
    const [corrected] = await Promise.all([adPage.waitForResponse(r => r.url().endsWith('/payment-proof') && r.request().method() === 'POST' && r.status() !== 401), adPage.getByRole('button', { name: 'Send request', exact: true }).click()]); assert.equal(corrected.status(), 201);
    proof = await db.collection('payment_proofs').findOne({ adRequestId: new mongoose.Types.ObjectId(requested.id), status: 'pending_review' }); storageKeys.push(proof.storageKey);
    await api(admin, 'POST', `/admin/payment-proofs/${proof._id}/review`, { action: 'approve', expectedVersion: proof.version, reason: 'Confirm synthetic local payment' });
    await adPage.goto(`${base}/provider/ads/${requested.id}?lang=en`); await ready(adPage); await expect(adPage.locator('input[type=file]')).toHaveCount(0); await expect(adPage.getByText('Paid — awaiting scheduling', { exact: true }).first()).toBeVisible();
    await noOverflow(adPage); await adPage.screenshot({ path: `${output}/${engine.name()}-receipt-approved.png`, fullPage: true });
    recordCheck(`${engine.name()}: real request, quote acceptance, receipt upload, reload persisted, different receipt rejected by server; rejected receipt corrected with same file; approval survives reload without upload form`);

    stage = `${engine.name()} actual banner location and mobile media`;
    const startAt = new Date(Date.now() - 3600000), endAt = new Date(Date.now() + 86400000);
    await db.collection('ad_requests').updateOne({ _id: new mongoose.Types.ObjectId(requested.id) }, { $set: { status: 'active', intervalStart: startAt, intervalEnd: endAt }, $inc: { version: 1 } });
    await db.collection('ad_settings').updateOne({}, { $set: { enabled: true, allowedSurfaces: ['homepage'], maxActiveBanners: 100 } }, { upsert: true });
    await db.collection('ad_placements').updateOne({ key: 'homepage.featured' }, { $set: { surface: 'homepage', active: true, sortOrder: 0 } }, { upsert: true });
    const bannerId = oid(), mediaId = oid(); bannerIds.push(bannerId); mediaIds.push(mediaId);
    await db.collection('ad_banners').insertOne({ _id: bannerId, adRequestId: new mongoose.Types.ObjectId(requested.id), placementKey: 'homepage.featured', title: { ar: 'إعلان اختبار بمكانه الصحيح', en: 'Exact local ad destination' }, body: { ar: 'إعلان بصور احتياطية وأبعاد مناسبة', en: 'Responsive ad with image fallback' }, targetUrl: `/properties/${property.slug}`, featured: { advertiserProviderId: String(providers[2].user), destination: { kind: 'property', id: String(propertyId) }, highlight: { ar: '500 جنيه', en: 'EGP 500' } }, status: 'active', startAt, endAt, sortOrder: 0, mediaIds: [mediaId], version: 0, createdAt: stamp, updatedAt: stamp });
    await db.collection('ad_banner_media').insertOne({ _id: mediaId, bannerId, active: true, url: '/assets/does-not-exist-local-ad.png', mime: 'image/png', width: 1200, height: 800 });
    await adPage.reload(); await ready(adPage);
    const location = adPage.getByRole('link', { name: 'Open its location on the site' }); await expect(location).toHaveAttribute('href', new RegExp(`featuredAd=${bannerId}#homepage-featured`));
    const [adPopup] = await Promise.all([adPage.waitForEvent('popup'), location.click()]); await ready(adPopup); await adPopup.setViewportSize({ width: 390, height: 844 });
    const card = adPopup.locator('#homepage-featured'); await expect(card).toContainText('Exact local ad destination');
    const media = card.locator('.public-homepage__banner-media-wrapper img'); await expect(media).toHaveAttribute('src', '/assets/canonical/public/home-hero-sadat-city.png'); await expect.poll(() => media.evaluate(el => el.naturalWidth)).toBeGreaterThan(0);
    assert(await card.locator('.public-homepage__banner-layout').evaluate(el => el.getBoundingClientRect().height < 750));
    assert(await card.evaluate(el => Math.abs(el.getBoundingClientRect().top) < 220)); await noOverflow(adPopup);
    await adPopup.screenshot({ path: `${output}/${engine.name()}-featured-mobile.png`, fullPage: true }); await adPopup.close();
    recordCheck(`${engine.name()}: provider link selects its live banner and scrolls to placement; broken ad image gets a real fallback with bounded mobile dimensions`);
    if (engine === chromium) {
      stage = 'concurrent different receipt uploads';
      await rateWindow();
      const concurrentId = oid(); requestIds.push(concurrentId);
      const payableFixture = await db.collection('ad_requests').findOne({ _id: new mongoose.Types.ObjectId(requested.id) });
      await db.collection('ad_requests').insertOne({ ...payableFixture, _id: concurrentId, status: 'waiting_payment', version: 0, history: [{ status: 'waiting_payment', version: 0, changedAt: stamp }] });
      const concurrent = { id: String(concurrentId) };
      await api(advertiser, 'GET', `/provider/ads/${concurrent.id}`);
      const uploads = await Promise.all([image, other].map((data, index) => raw(advertiser, 'POST', `/provider/ads/${concurrent.id}/payment-proof`, data, { headers: { 'content-type': 'image/png', 'x-file-name': `concurrent-${index}.png`, 'x-payment-method': 'cash' } })));
      assert.deepEqual(uploads.map(response => response.status()).sort(), [201, 409]);
      assert.equal(await db.collection('payment_proofs').countDocuments({ adRequestId: new mongoose.Types.ObjectId(concurrent.id), active: true }), 1);
      recordCheck('Real concurrent uploads with different file hashes persist exactly one active receipt; losing request is rejected');
    }

    stage = `${engine.name()} mobile customer details and private notes`;
    await rateWindow();
    const lead = await api(advertiser, 'POST', '/provider/customer-requests', { firstName: 'Local', lastName: `Customer-${engine.name()}`, phone: '01000000001', message: 'Asked about a property through a local office', propertyId: String(propertyId) }); leadIds.push(new mongoose.Types.ObjectId(lead.id));
    await adminPage.goto(base + '/admin/customer-requests?lang=ar'); await ready(adminPage);
    const leadRow = adminPage.locator(`[data-testid=admin-request-${lead.id}]`); await expect(leadRow).toBeVisible();
    await leadRow.getByRole('button', { name: `Local Customer-${engine.name()}`, exact: true }).click();
    const dialog = adminPage.getByRole('dialog'); await expect(dialog).toBeVisible(); await expect(dialog).toContainText('Asked about a property through a local office');
    await dialog.locator('#admin-request-note').fill('Private local admin follow-up note');
    await dialog.getByRole('button', { name: 'إضافة الملاحظة', exact: true }).click();
    await expect(dialog).toContainText('Private local admin follow-up note');
    const ownLead = await api(advertiser, 'GET', `/provider/customer-requests/${lead.id}`); assert.equal(ownLead.internalNotes, undefined);
    await noOverflow(adminPage); await adminPage.screenshot({ path: `${output}/${engine.name()}-customer-details.png`, fullPage: true });
    recordCheck(`${engine.name()}: mobile customer name opens full details; saved internal note appears in activity and stays absent from provider response`);

    stage = `${engine.name()} featured property control`;
    await adminPage.goto(`${base}/admin/properties/review?propertyId=${propertyId}&lang=ar`); await ready(adminPage);
    await expect(adminPage.locator('#property-homepage-featured')).toHaveAttribute('open', '');
    await adminPage.getByRole('checkbox', { name: 'تمييز العقار في الرئيسية' }).check();
    await adminPage.getByRole('spinbutton', { name: 'ترتيب العرض' }).fill('0');
    const feature = adminPage.waitForResponse(r => r.url().endsWith('/featured') && r.request().method() === 'PUT' && r.status() !== 401);
    await adminPage.getByRole('button', { name: 'حفظ التمييز' }).click(); assert.equal((await feature).status(), 200);
    const home = await api(admin, 'GET', '/public/home'); assert(home.properties.slice(0, 3).some(item => item.id === String(propertyId)));
    recordCheck(`${engine.name()}: expanded featured-property control saves and property appears in first 3 homepage results`);

    stage = `${engine.name()} community publication`;
    await rateWindow();
    const postTitle = `Local resident experience ${engine.name()} ${suffix}`;
    const post = await api(resident, 'POST', '/public/community/posts', { title: postTitle, body: 'An actual local resident experience for homepage verification.', category: 'experience' }); postIds.push(post.id); assert.equal((await db.collection('community_posts').findOne({ id: post.id })).authorName.en, 'Local Resident');
    assert(!(await api(admin, 'GET', '/public/home')).content.some(item => item.key === `community_${post.id}`));
    const published = await api(admin, 'POST', `/admin/community/posts/${post.id}/moderate`, { action: 'publish', reason: 'Review synthetic local resident post', expectedVersion: post.version });
    assert((await api(admin, 'GET', '/public/home')).content.some(item => item.key === `community_${post.id}` && item.title.en === 'Local Resident'));
    const publicPage = await newPage(resident, 1440); await publicPage.goto(base + '/?lang=en'); await ready(publicPage);
    const postLink = publicPage.getByRole('link', { name: postTitle, exact: true }); await expect(postLink).toBeVisible(); await postLink.click();
    await expect(publicPage.getByRole('dialog')).toBeVisible(); await expect(publicPage.getByRole('dialog')).toContainText(postTitle);
    recordCheck(`${engine.name()}: draft excluded, admin publication adds real author/post to homepage, link opens the exact post`);
    stage = `${engine.name()} homepage return timing`;
    await publicPage.goto(base + '/?lang=en'); await ready(publicPage);
    let homeDocuments = 0; publicPage.on('request', request => { const url = new URL(request.url()); if (url.pathname === '/' && request.resourceType() === 'fetch') homeDocuments++; });
    await publicPage.locator('.public-homepage__header a[href*="/properties"]').first().click();
    await expect(publicPage.locator('[data-page="public-home"]')).toHaveCount(0);
    await api(admin, 'POST', `/admin/community/posts/${post.id}/moderate`, { action: 'hide', reason: 'Verify hidden posts disappear on refresh', expectedVersion: published.version });
    const start = Date.now(); await publicPage.goBack(); await expect(publicPage.locator('[data-homepage-state=success]')).toBeVisible(); const elapsed = Date.now() - start;
    report.timings.push({ engine: engine.name(), cachedReturnMs: elapsed }); assert.equal(homeDocuments, 0); assert(elapsed < 2000);
    await expect(publicPage.getByRole('link', { name: postTitle, exact: true })).toHaveCount(0);
    await noOverflow(publicPage);
    recordCheck(`${engine.name()}: public homepage returns from memory without waiting for a second HTML request; public data refreshes separately`);
    await providerPage.close(); await adPage.close(); await publicPage.close(); await adminPage.close();
    await browser.close();
  }
  assert.deepEqual(report.browserErrors, []); report.status = 'PASS';
} catch (error) {
  report.status = 'FAIL'; report.stage = stage; report.error = String(error?.stack ?? error);
  for (const [i, context] of contexts.entries()) for (const [j, page] of context.pages().entries()) { await page.screenshot({ path: `${output}/failure-${i}-${j}.png`, fullPage: true }).catch(() => {}); await writeFile(`${output}/failure-${i}-${j}.txt`, await page.locator('body').innerText().catch(() => '')); }
  throw error;
}
finally {
  for (const browser of browsers) await browser.close().catch(() => {});
  const proofRows = await db.collection('payment_proofs').find({ adRequestId: { $in: requestIds } }).toArray();
  for (const row of proofRows) if (row.storageKey) storageKeys.push(row.storageKey);
  for (const key of new Set(storageKeys)) { const resolved = path.resolve(storageRoot, key); assert(resolved.startsWith(storageRoot + path.sep)); await rm(resolved, { force: true }); }
  const users = [...providers.map(p => p.user), seeker.user];
  for (const collection of ['users', 'admin_credentials', 'provider_profiles', 'provider_applications', 'seeker_profiles', 'provider_identity_subscriptions', 'sessions']) await db.collection(collection).deleteMany({ $or: [{ _id: { $in: users } }, { userId: { $in: users } }] });
  await db.collection('provider_profiles').deleteMany({ _id: { $in: providers.map(p => p.profile) } });
  await db.collection('provider_applications').deleteMany({ _id: { $in: providers.map(p => p.application) } });
  await db.collection('properties').deleteOne({ _id: propertyId });
  await db.collection('organizations').deleteMany({ _id: { $in: providers.map(p => p.profile) } });
  for (const collection of ['ad_requests', 'ad_quotes', 'payment_proofs', 'ad_schedules']) await db.collection(collection).deleteMany({ $or: [{ _id: { $in: requestIds } }, { requestId: { $in: requestIds } }, { adRequestId: { $in: requestIds } }] });
  await db.collection('community_posts').deleteMany({ id: { $in: postIds } });
  await db.collection('requests').deleteMany({ _id: { $in: leadIds } });
  await db.collection('ad_banners').deleteMany({ _id: { $in: bannerIds } });
  await db.collection('ad_banner_media').deleteMany({ _id: { $in: mediaIds } });
  if (bannerSettingsBefore) { await db.collection('ad_settings').deleteMany({}); if (bannerSettingsBefore.length) await db.collection('ad_settings').insertMany(bannerSettingsBefore); }
  if (placementsBefore) { await db.collection('ad_placements').deleteMany({ key: { $in: ['homepage.hero', 'homepage.featured'] } }); if (placementsBefore.length) await db.collection('ad_placements').insertMany(placementsBefore); }
  await db.collection('notifications').deleteMany({ recipientId: { $in: users } });
  await db.collection('audit_logs').deleteMany({ $or: [{ actorId: { $in: users } }, { targetId: { $in: [...requestIds, ...leadIds, ...proofRows.map(row => row._id), ...providers.map(p => p.application), propertyId].map(String).concat(postIds) } }] });
  if (settingsChanged) { if (settingsBefore) await db.collection('admin_settings').replaceOne({ _id: settingsBefore._id }, settingsBefore); else await db.collection('admin_settings').deleteOne({ namespace: 'advertising' }); }
  await db.close(); report.cleanup = true;
  await mkdir('docs/quality/guide-runs', { recursive: true });
  await writeFile('docs/quality/guide-runs/owner-requests-local-latest.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
}
