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
assert(['127.0.0.1', 'localhost'].includes(uri.hostname) && uri.port === '27018', 'Only the native local database is permitted');
const db = await mongoose.createConnection(uri.href).asPromise(), base = 'http://127.0.0.1:4173';
const oid = () => new mongoose.Types.ObjectId(), userId = oid(), appId = oid(), orgId = oid(), seekerId = oid();
const stamp = new Date(), suffix = Date.now(), email = `owner-followup-${suffix}@example.invalid`, password = 'Local-Followup!2026';
const report = { status: 'RUNNING', mockedRoutes: false, checks: [], browserErrors: [], cleanup: false };
const browsers = [], contexts = [], createdProjects = [], requestIds = [];
let originalAdvertising, temporaryAdvertisingId;
let originalBannerSettings, originalPlacements, roleId;
const output = '.tmp/owner-followup'; await mkdir(output, { recursive: true });
let page, stage = 'setup';
const storageRoot = path.resolve(env.PRIVATE_STORAGE_LOCAL_ROOT || path.join(os.tmpdir(), 'sadat-real-estate-private-storage'));
async function login(context, accountEmail, accountPassword) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await context.request.post(base + '/api/v1/auth/login', { data: { email: accountEmail, password: accountPassword } });
    if (response.status() === 429) { await new Promise(resolve => setTimeout(resolve, 30_000)); continue; }
    assert.equal(response.status(), 200, await response.text());
    return { context, token: (await response.json()).data.accessToken };
  }
  throw new Error('Login rate limit persisted');
}
async function api(actor, method, url, data, extra = {}, attempts = 0) {
  const response = await actor.context.request.fetch(base + '/api/v1' + url, { method, ...(data === undefined ? {} : { data }), ...extra, headers: { authorization: `Bearer ${actor.token}`, ...extra.headers } });
  if (response.status() === 429 && attempts < 3) {
    await new Promise(resolve => setTimeout(resolve, Math.min(60, Math.max(1, Number(response.headers()['retry-after'] ?? response.headers()['ratelimit-reset'] ?? 60))) * 1000));
    return api(actor, method, url, data, extra, attempts + 1);
  }
  if (response.status() === 401) {
    const refresh = await actor.context.request.post(base + '/api/v1/auth/refresh', { data: {} });
    assert.equal(refresh.status(), 200, await refresh.text()); actor.token = (await refresh.json()).data.accessToken;
    return api(actor, method, url, data, extra);
  }
  assert(response.ok(), `${method} ${url} ${response.status()} ${await response.text()}`);
  return (await response.json()).data;
}
async function ready(p) {
  await expect(p.locator('[data-auth-resolution=pending]')).toHaveCount(0);
  await expect(p.locator('#site-intro')).toBeHidden();
  await p.evaluate(() => document.fonts.ready);
}
async function rateWindow() {
  const response = await fetch(base + '/api/v1/public/bootstrap');
  if (response.status === 429 || Number(response.headers.get('ratelimit-remaining')) < 70) {
    await new Promise(resolve => setTimeout(resolve, 60_000));
  }
}
try {
  originalBannerSettings = await db.collection('ad_settings').find({}).toArray();
  originalPlacements = await db.collection('ad_placements').find({ key: { $in: ['homepage.hero', 'homepage.featured'] } }).toArray();
  const hashed = await createArgon2PasswordHasher().hash(password);
  await db.collection('users').insertMany([
    { _id: userId, roleType: 'provider', status: 'verified', normalizedEmail: email, normalizedPhone: '+201012345678', version: 0, createdAt: stamp, updatedAt: stamp },
    { _id: seekerId, roleType: 'seeker', status: 'verified', normalizedEmail: `seeker-${email}`, normalizedPhone: '+201012345679', version: 0, createdAt: stamp, updatedAt: stamp }
  ]);
  await db.collection('admin_credentials').insertMany([userId, seekerId].map(id => ({ userId: id, passwordHash: hashed, passwordChangedAt: stamp, createdAt: stamp, updatedAt: stamp, version: 0 })));
  await db.collection('provider_profiles').insertOne({ _id: orgId, userId, providerType: 'developer_company', status: 'approved', version: 0, createdAt: stamp, updatedAt: stamp });
  await db.collection('provider_applications').insertOne({ _id: appId, userId, providerType: 'developer_company', status: 'approved', requirementVersion: '2026-10-15.developer.1', brandName: 'Owner followup local developer', legalCompanyName: 'Owner followup local developer', displayName: 'Owner followup local developer', accountOwnerFullName: 'Local owner', email, version: 0, statusChangedAt: stamp, createdAt: stamp, updatedAt: stamp });
  await db.collection('organizations').insertOne({ _id: orgId, providerId: orgId, kind: 'developer_company', slug: `owner-followup-${suffix}`, name: { ar: 'مطور تجربة محلية', en: 'Owner followup local developer' }, description: { ar: 'نبذة قصيرة لا تحتاج لمساحة فارغة', en: 'A short overview without empty space' }, status: 'approved', version: 0, createdAt: stamp, updatedAt: stamp });
  for (const browserType of [chromium, webkit]) {
    await rateWindow();
    const browser = await browserType.launch(); browsers.push(browser);
    const adminContext = await browser.newContext(), providerContext = await browser.newContext(), seekerContext = await browser.newContext();
    contexts.push(adminContext, providerContext, seekerContext);
    const admin = await login(adminContext, 'admin.demo@example.invalid', 'LocalPreview-Admin-Only-2026!');
    const provider = await login(providerContext, email, password); await login(seekerContext, `seeker-${email}`, password);
    page = await providerContext.newPage(); page.on('pageerror', error => report.browserErrors.push(String(error)));
    stage = `${browserType.name()} project image creation`;
    await page.goto(base + '/provider/projects?lang=en'); await ready(page);
    await page.getByRole('button', { name: /New project|Create project|Add project/i }).first().click();
    await page.locator('#provider-project-name-en').fill(`Owner project ${browserType.name()}`);
    await page.locator('#provider-project-reason').fill('Create local project with an image');
    await page.locator('#provider-project-description-en').fill('Project details supplied through the developer account.');
    const image = await sharp({ create: { width: 1600, height: 900, channels: 3, background: '#17574a' } }).png().toBuffer();
    const upload = page.waitForResponse(r => r.url().endsWith('/provider/organization-photos') && r.request().method() === 'POST');
    await page.locator('#project-image-file').setInputFiles({ name: 'project.png', mimeType: 'image/png', buffer: image });
    const uploaded = await upload; assert.equal(uploaded.status(), 201, await uploaded.text());
    const imageUrl = (await uploaded.json()).data.imageUrl;
    await expect(page.getByAltText('Project image preview')).toBeVisible();
    const broken = page.waitForResponse(r => r.url().endsWith('/provider/organization-photos') && r.request().method() === 'POST');
    await page.locator('#project-image-file').setInputFiles({ name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('not an image') });
    assert.equal((await broken).status(), 400); await expect(page.getByAltText('Project image preview')).toBeVisible();
    const saved = page.waitForResponse(r => r.url().endsWith('/provider/projects') && r.request().method() === 'POST');
    await page.getByRole('button', { name: 'Save', exact: true }).click(); const saveResponse = await saved;
    assert.equal(saveResponse.status(), 201, await saveResponse.text()); let project = (await saveResponse.json()).data; createdProjects.push(new mongoose.Types.ObjectId(project.id));
    assert.equal(project.imageUrl, imageUrl); assert.equal((await seekerContext.request.get(base + imageUrl)).status(), 404, 'Draft project photo stays private');
    project = await api(provider, 'POST', `/provider/projects/${project.id}/submit`, { version: project.version, reason: 'Submit complete project for review' });
    project = await api(admin, 'POST', `/admin/projects/${project.id}/review`, { version: project.version, action: 'approve', reason: 'Verified local synthetic project' });
    project = await api(admin, 'POST', `/admin/projects/${project.id}/review`, { version: project.version, action: 'publish', reason: 'Publish local synthetic project' });
    assert.equal((await seekerContext.request.get(base + imageUrl)).status(), 200, 'Published project photo is delivered');
    const foreign = await providerContext.request.post(base + '/api/v1/provider/projects', { headers: { authorization: `Bearer ${provider.token}` }, data: { name: { en: 'Invalid photo ownership' }, imageUrl: '/api/v1/public/organization-photos/aaaaaaaaaaaaaaaaaaaaaaaa', reason: 'Reject unattached photo' } });
    assert.equal(foreign.status(), 403);
    const publicPage = await seekerContext.newPage(); publicPage.on('pageerror', error => report.browserErrors.push(String(error)));
    const projectPath = `/developers/owner-followup-${suffix}/projects/${project.slug}`;
    for (const [locale, width] of [['ar', 390], ['en', 1440]]) {
      await publicPage.setViewportSize({ width, height: 1000 });
      await publicPage.goto(base + projectPath + `?lang=${locale}`); await ready(publicPage);
      await expect(publicPage.locator('[data-project-detail] h1')).toHaveText(project.name.en);
      await expect(publicPage.locator('[data-project-detail] img')).toHaveJSProperty('naturalWidth', 1600);
      assert.equal(await publicPage.locator('[data-project-detail] img').evaluate(el => getComputedStyle(el).objectFit), 'contain');
      assert(await publicPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await publicPage.screenshot({ path: `${output}/${browserType.name()}-project-${locale}.png`, fullPage: true });
      report.checks.push(`${browserType.name()} ${locale} ${width}px published project image, description, inquiry and no horizontal overflow`);
    }
    await publicPage.goto(base + projectPath + '?lang=en'); await ready(publicPage);
    await publicPage.locator('input[name="name"]').fill('Local customer'); await publicPage.locator('input[name="phone"]').fill('01012345679');
    await publicPage.locator('textarea[name="message"]').fill('Please provide project details.');
    const inquiry = publicPage.waitForResponse(r => r.url().endsWith('/seeker/contact-requests') && r.request().method() === 'POST' && r.status() !== 401);
    await publicPage.locator('.public-developer-profile__inquiry button[type="submit"]').click();
    const inquiryResponse = await inquiry; assert.equal(inquiryResponse.status(), 201, await inquiryResponse.text());
    const customerRequest = (await inquiryResponse.json()).data; requestIds.push(new mongoose.Types.ObjectId(customerRequest.id)); assert.equal(customerRequest.projectId, project.id);
    stage = `${browserType.name()} advertising identity and receipts`;
    const adId = oid(); requestIds.push(adId);
    await db.collection('ad_requests').insertOne({ _id: adId, providerId: userId, requestMode: 'assisted', contactPhone: '+201012345678', purpose: 'Local assisted advertisement', status: 'waiting_pricing', version: 0, history: [{ status: 'waiting_pricing', version: 0, changedAt: stamp }], createdAt: stamp, updatedAt: stamp });
    const detail = await api(admin, 'GET', `/admin/ad-requests/${adId}`);
    assert.equal(detail.advertiserName, 'Owner followup local developer');
    assert(detail.pricingOptions.placements.some(item => item.key === 'homepage.hero')); assert(detail.pricingOptions.placements.some(item => item.key === 'homepage.featured'));
    assert(detail.pricingOptions.adTypes.includes('banner') && detail.pricingOptions.adTypes.includes('featured_card'));
    if (browserType === chromium) {
      let config = await api(admin, 'GET', '/admin/banners/config');
      config = await api(admin, 'PUT', '/admin/banners/config', { enabled: config.enabled, heroActive: true, expectedVersion: config.version, reason: 'Enable local hero for restore verification' });
      const controls = await adminContext.newPage();
      await controls.goto(base + '/admin/banners?lang=en'); await ready(controls);
      await controls.getByText('Original homepage cover and restore', { exact: true }).click();
      const restored = controls.waitForResponse(r => r.url().endsWith('/admin/banners/config') && r.request().method() === 'PUT');
      await controls.getByRole('button', { name: 'Restore original homepage cover', exact: true }).click();
      assert.equal((await restored).status(), 200);
      config = await api(admin, 'GET', '/admin/banners/config');
      assert.equal(config.placements.find(item => item.key === 'homepage.hero').active, false);
      await expect(controls.getByRole('button', { name: 'Restore original homepage cover', exact: true })).toBeDisabled();
      await controls.screenshot({ path: `${output}/original-cover-restored.png`, fullPage: true });
      config = await api(admin, 'PUT', '/admin/banners/config', { enabled: config.enabled, heroActive: true, expectedVersion: config.version, reason: 'Local advertising journey verification' });
      roleId = (await api(admin, 'POST', '/admin/roles', { name: `Local owner role ${suffix}`, description: 'Temporary verification role', accessMode: 'view_only', permissions: ['admin:staff.view'], reason: 'Verify role deletion layout' })).id;
      await controls.setViewportSize({ width: 390, height: 844 });
      await controls.goto(base + `/admin/roles/${roleId}?lang=ar`); await ready(controls);
      await controls.getByRole('button', { name: 'حذف الدور', exact: true }).click();
      const dialog = controls.getByRole('dialog'); await expect(dialog).toBeVisible();
      assert(await dialog.evaluate(el => el.getBoundingClientRect().width <= innerWidth));
      await dialog.locator('input').fill('Local verification complete');
      await controls.screenshot({ path: `${output}/role-delete-mobile-ar.png`, fullPage: true });
      const deleted = controls.waitForResponse(r => r.url().endsWith(`/admin/roles/${roleId}`) && r.request().method() === 'DELETE');
      await dialog.getByRole('button', { name: 'تأكيد الحذف', exact: true }).click(); assert.equal((await deleted).status(), 200); roleId = undefined;
      report.checks.push('Native original-cover restore turns off only hero placement; Arabic mobile role deletion modal and confirmed deletion work');
      originalAdvertising = await db.collection('admin_settings').findOne({ namespace: 'advertising' });
      if (originalAdvertising) await db.collection('admin_settings').updateOne({ _id: originalAdvertising._id }, { $addToSet: { 'values.payment_proof_methods': 'cash' } });
      else { temporaryAdvertisingId = oid(); await db.collection('admin_settings').insertOne({ _id: temporaryAdvertisingId, namespace: 'advertising', values: { payment_proof_methods: ['cash'], cash_payment_details: ['Synthetic local receipt only'] }, version: 0, createdAt: stamp, updatedAt: stamp }); }
      const request = await api(provider, 'POST', '/provider/ads', { requestMode: 'assisted', contactPhone: '01012345678', purpose: 'Local full advertising payment journey' });
      requestIds.push(new mongoose.Types.ObjectId(request.id));
      const reviewed = await api(admin, 'POST', `/admin/ad-requests/${request.id}/review`, { action: 'approve', expectedVersion: request.version, reason: 'Review local customer brief' });
      assert.equal(reviewed.request.status, 'waiting_pricing');
      const active = (await api(admin, 'GET', `/admin/ad-requests/${adId}`)).pricingOptions.placements.find(item => item.active);
      assert(active, 'An active local placement is required');
      const quote = await api(admin, 'POST', `/admin/ad-requests/${request.id}/quote`, { campaign: { placementKey: active.key, adType: active.key === 'homepage.hero' ? 'banner' : 'featured_card', intervalStart: new Date(Date.now() + 86400000).toISOString(), intervalEnd: new Date(Date.now() + 172800000).toISOString() }, currency: 'EGP', lineItems: [{ description: 'Local advertising quote', quantity: 1, unitAmountMinor: 10000 }], validUntil: new Date(Date.now() + 3600000).toISOString(), terms: 'Local test only, no real payment' });
      await page.goto(base + `/provider/ads/${request.id}?lang=en`); await ready(page);
      const accepted = page.waitForResponse(r => r.url().endsWith(`/provider/ads/${request.id}/accept-quote`) && r.request().method() === 'POST');
      await page.getByRole('button', { name: /Accept.*quote/i }).click();
      assert.equal((await accepted).status(), 200);
      await page.locator('#provider-advertising-payment-method').selectOption('cash');
      await page.locator('input[type="file"]').setInputFiles({ name: 'receipt.png', mimeType: 'image/png', buffer: image });
      const proofResponse = page.waitForResponse(r => r.url().endsWith(`/provider/ads/${request.id}/payment-proof`) && r.request().method() === 'POST');
      await page.locator('.provider-advertising__proof-form button[type="submit"]').click();
      const proofResult = await proofResponse; assert.equal(proofResult.status(), 201);
      const storedProof = await db.collection('payment_proofs').findOne({ adRequestId: new mongoose.Types.ObjectId(request.id), active: true });
      assert(storedProof); const proof = { id: String(storedProof._id), version: storedProof.version };
      assert.equal((await api(admin, 'GET', `/admin/payment-proofs?requestId=${request.id}&status=pending_review`)).items.length, 1);
      const review = await api(admin, 'POST', `/admin/payment-proofs/${proof.id}/review`, { action: 'approve', expectedVersion: proof.version, reason: 'Verified synthetic local receipt' });
      assert.equal(review.status, 'approved'); assert.equal(quote.totalMinor, 10000);
      assert.equal((await api(admin, 'GET', `/admin/payment-proofs?requestId=${request.id}&status=pending_review`)).items.length, 0);
      assert.equal((await api(admin, 'GET', `/admin/payment-proofs?requestId=${request.id}&status=approved`)).items.length, 1);
      if (originalAdvertising) await db.collection('admin_settings').replaceOne({ _id: originalAdvertising._id }, originalAdvertising);
      if (temporaryAdvertisingId) await db.collection('admin_settings').deleteOne({ _id: temporaryAdvertisingId });
      originalAdvertising = undefined; temporaryAdvertisingId = undefined;
      report.checks.push('Real assisted ad request → admin review/quote → customer UI acceptance/upload → clean receipt admin approval → approved queue');
    }
    for (let n = 0; n < 21; n++) await db.collection('payment_proofs').insertOne({ _id: oid(), adRequestId: adId, providerId: userId, originalFilename: `local-${n}.png`, normalizedExtension: '.png', detectedMime: 'image/png', byteSize: image.length, sha256: String(n).padStart(64, '0'), storageKey: 'local-fixture-not-previewed', version: 1, securityState: 'clean', status: 'pending_review', reviewHistory: [], uploadedAt: new Date(stamp.getTime() + n), active: true, idempotentReplay: false });
    const proofs = await api(admin, 'GET', `/admin/payment-proofs?requestId=${adId}&status=pending_review&page=2&limit=20`); assert.equal(proofs.items.length, 1); assert.equal(proofs.items[0].adRequestId, String(adId));
    const adminPage = await adminContext.newPage();
    await rateWindow();
    await adminPage.goto(base + `/admin/ads/requests?requestId=${adId}&lang=en`); await ready(adminPage);
    await expect(adminPage.locator('#admin-ad-placement option[value="homepage.hero"]')).toBeAttached();
    await adminPage.goto(base + `/admin/ads/payments/pending-review?requestId=${adId}&lang=en`); await ready(adminPage);
    await expect(adminPage.locator('.admin-ads__table tbody tr')).toHaveCount(20);
    const next = adminPage.waitForResponse(r => r.url().includes('/admin/payment-proofs?') && new URL(r.url()).searchParams.get('page') === '2');
    await adminPage.getByRole('button', { name: /Next/i }).click(); assert.equal((await next).status(), 200);
    await expect(adminPage.locator('.admin-ads__table tbody tr')).toHaveCount(1);
    report.checks.push(`${browserType.name()} real API advertiser name, both placements/types, request-specific receipt filtering and next page`);
    stage = `${browserType.name()} deletion request`;
    await rateWindow();
    await page.goto(base + '/provider/settings?tab=security&lang=en'); await ready(page);
    await page.getByRole('button', { name: 'Request account deletion' }).click();
    await page.locator('#provider-deletion-reason').fill(`Local ${browserType.name()} verification of account deletion review request`);
    const deletion = page.waitForResponse(r => r.url().endsWith('/provider/account-deletion-requests') && r.request().method() === 'POST');
    await page.getByRole('button', { name: 'Send deletion request' }).click(); const deletionResponse = await deletion; assert.equal(deletionResponse.status(), 201, await deletionResponse.text());
    const deletionData = (await deletionResponse.json()).data; requestIds.push(new mongoose.Types.ObjectId(deletionData.id));
    assert.equal((await api(admin, 'GET', `/admin/requests/${deletionData.id}`)).creatorId, String(userId));
    assert.equal((await db.collection('users').findOne({ _id: userId })).status, 'verified');
    report.checks.push(`${browserType.name()} deletion request created and visible to administration; provider remains active`);
    await adminContext.request.post(base + '/api/v1/auth/logout');
    await adminContext.close(); await providerContext.close(); await seekerContext.close();
  }
  stage = 'password change and session revocation';
  await rateWindow();
  const context = await browsers[0].newContext(); contexts.push(context);
  const actor = await login(context, email, password);
  page = await context.newPage();
  await page.goto(base + '/provider/settings?tab=security&lang=en'); await ready(page);
  await page.locator('#provider-settings-current-password').fill(password);
  await page.locator('#provider-settings-new-password').fill('Local-Changed!2026');
  await page.locator('#provider-settings-confirm-password').fill('Local-Changed!2026');
  const changed = page.waitForResponse(r => r.url().endsWith('/auth/account-access/change') && r.request().method() === 'POST');
  await page.locator('form[aria-labelledby="provider-settings-security-heading"] button[type="submit"]').click();
  assert.equal((await changed).status(), 200);
  assert.equal((await context.request.get(base + '/api/v1/provider/settings', { headers: { authorization: `Bearer ${actor.token}` } })).status(), 401);
  assert.equal((await context.request.post(base + '/api/v1/auth/login', { data: { email, password } })).status(), 401);
  await login(context, email, 'Local-Changed!2026');
  report.checks.push('Password changed through settings; old sessions and old password rejected; new password login succeeds');
  assert.deepEqual(report.browserErrors, []); report.status = 'PASS_LOCAL';
} catch (error) {
  report.status = 'FAIL_LOCAL'; report.error = `${stage}: ${error.stack ?? error}`;
  if (page && !page.isClosed()) await page.screenshot({ path: `${output}/failure.png`, fullPage: true }).catch(() => {});
} finally {
  if (roleId) await db.collection('roles').deleteOne({ _id: new mongoose.Types.ObjectId(roleId) });
  if (originalBannerSettings) { await db.collection('ad_settings').deleteMany({}); if (originalBannerSettings.length) await db.collection('ad_settings').insertMany(originalBannerSettings); }
  if (originalPlacements) { await db.collection('ad_placements').deleteMany({ key: { $in: ['homepage.hero', 'homepage.featured'] } }); if (originalPlacements.length) await db.collection('ad_placements').insertMany(originalPlacements); }
  if (originalAdvertising) await db.collection('admin_settings').replaceOne({ _id: originalAdvertising._id }, originalAdvertising);
  if (temporaryAdvertisingId) await db.collection('admin_settings').deleteOne({ _id: temporaryAdvertisingId });
  for (const context of contexts) await context.close().catch(() => {});
  for (const browser of browsers) await browser.close().catch(() => {});
  for (const photo of await db.collection('organization_photos').find({ createdBy: userId }).toArray()) {
    assert(/^quarantine\/[a-f0-9]{32}$/.test(photo.storageKey)); const target = path.resolve(storageRoot, photo.storageKey); assert(target.startsWith(storageRoot + path.sep)); await rm(target, { force: true });
  }
  await db.collection('organization_photos').deleteMany({ createdBy: userId });
  for (const proof of await db.collection('payment_proofs').find({ providerId: userId, storageKey: { $ne: 'local-fixture-not-previewed' } }).toArray()) {
    assert(/^quarantine\/[a-f0-9]{32}$/.test(proof.storageKey)); const target = path.resolve(storageRoot, proof.storageKey); assert(target.startsWith(storageRoot + path.sep)); await rm(target, { force: true });
  }
  for (const name of ['ad_requests', 'payment_proofs', 'ad_quotes', 'projects', 'requests', 'notifications', 'sessions', 'admin_credentials', 'provider_profiles', 'provider_applications', 'users', 'audit_logs']) {
    await db.collection(name).deleteMany({ $or: [{ _id: { $in: [userId, seekerId, appId, ...createdProjects, ...requestIds] } }, { userId: { $in: [userId, seekerId] } }, { providerId: userId }, { creatorId: { $in: [userId, seekerId] } }, { createdBy: userId }, { actorId: { $in: [userId, seekerId] } }] });
  }
  await db.collection('organizations').deleteOne({ _id: orgId }); await db.close(); report.cleanup = true;
  await writeFile('docs/quality/guide-runs/owner-followup-local-latest.json', JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify(report, null, 2)); if (report.status !== 'PASS_LOCAL') process.exitCode = 1;
