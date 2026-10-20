import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import mongoose from 'mongoose';
import { chromium, webkit, expect as baseExpect } from '@playwright/test';
import { RBAC_PERMISSIONS } from '@sadat-real-estate/contracts';
import { createArgon2PasswordHasher } from '../apps/api/src/modules/auth/crypto.ts';
import { createProviderProperty } from '../apps/web/src/features/provider_property/data.ts';
import { ApiClient } from '../apps/web/src/features/contracts/api-client.ts';

const env = Object.fromEntries((await readFile('.env.local', 'utf8')).split(/\r?\n/).filter(line => line.includes('=') && !line.startsWith('#')).map(line => { const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1).replace(/^['"]|['"]$/g, '')]; }));
const uri = new URL(env.MONGODB_URI); assert(['localhost', '127.0.0.1'].includes(uri.hostname) && uri.port === '27018');
const db = await mongoose.createConnection(uri.href).asPromise(), chrome = await chromium.launch(), safari = await webkit.launch();
const expect = baseExpect.configure({ timeout: 20000 }), base = 'http://127.0.0.1:4173', prefix = `devqa${Date.now()}`, email = `${prefix}@example.invalid`, password = 'Developer-Journey!2026', at = new Date();
const adminId = new mongoose.Types.ObjectId(), roleId = new mongoose.Types.ObjectId(), contexts = [], articleIds = [], categoryIds = [], root = '.tmp/developer-content-followups';
await mkdir(root, { recursive: true });
const report = { status: 'FAIL_LOCAL', mockedResponses: false, checks: [], cleanup: false, browserErrors: [] };
let providerId, appId, lastPage;
async function ready(page) { lastPage = page; await expect(page.locator('[data-auth-resolution=pending]')).toHaveCount(0); await expect(page.locator('#site-intro')).toBeHidden(); await page.evaluate(() => document.fonts.ready); }
async function signed(ctx, identity) { const r = await ctx.request.post(base + '/api/v1/auth/login', { data: { email: identity, password } }); assert.equal(r.status(), 200, await r.text()); return (await r.json()).data.accessToken; }
async function refresh(ctx) { const r = await ctx.request.post(base + '/api/v1/auth/refresh', { data: {} }); assert.equal(r.status(), 200, await r.text()); return (await r.json()).data.accessToken; }
async function api(ctx, token, endpoint, data, method = 'GET', expected = 200, headers = {}) { const r = await ctx.request.fetch(base + '/api/v1' + endpoint, { method, data, headers: { authorization: `Bearer ${token}`, ...headers } }); assert.equal(r.status(), expected, `${endpoint}: ${await r.text()}`); return expected >= 400 ? undefined : (await r.json()).data; }
try {
  await db.collection('users').insertOne({ _id: adminId, normalizedEmail: `${prefix}-admin@example.invalid`, roleType: 'admin', status: 'verified', locale: 'en', version: 0, createdAt: at, updatedAt: at });
  await db.collection('admin_accounts').insertOne({ userId: adminId, displayName: `${prefix} admin`, accessLevel: 'standard_admin', createdAt: at, updatedAt: at });
  await db.collection('admin_profiles').insertOne({ userId: adminId, createdAt: at, updatedAt: at });
  await db.collection('admin_credentials').insertOne({ userId: adminId, passwordHash: await createArgon2PasswordHasher().hash(password), passwordChangedAt: at, version: 0 });
  await db.collection('roles').insertOne({ _id: roleId, name: prefix, nameKey: prefix, accessMode: 'custom', permissions: [...RBAC_PERMISSIONS], active: true, version: 0, createdBy: adminId, updatedBy: adminId, createdAt: at, updatedAt: at });
  await db.collection('admin_role_assignments').insertOne({ adminUserId: adminId, roleIds: [roleId], assignedBy: adminId, assignedAt: at, version: 0, createdAt: at, updatedAt: at });
  const provider = await chrome.newContext({ viewport: { width: 390, height: 844 } }); contexts.push(provider); const page = await provider.newPage(); page.on('pageerror', e => report.browserErrors.push(String(e)));
  await page.goto(base + '/auth/register/provider/type?lang=en'); await ready(page);
  await page.locator('[data-provider-type=developer_company]').click(); await page.locator('#provider-registration-password').fill(password); await page.locator('#provider-registration-password-confirmation').fill(password); await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.locator('#auth-otp-email').fill(email); await page.getByRole('button', { name: 'Send code', exact: true }).click();
  let code; await expect.poll(async () => { const box = await (await fetch('http://127.0.0.1:8025/api/messages')).json(); code = box.messages.find(m => m.to.includes(email))?.raw.replace(/=\r?\n/g, '').match(/\b(\d{6})\b/u)?.[1]; return Boolean(code); }).toBe(true);
  await page.locator('.auth-otp__digit').first().fill(code); const registration = page.waitForResponse(r => r.url().endsWith('/provider/application') && r.request().method() === 'POST'); await page.getByRole('button', { name: 'Verify code', exact: true }).click(); const registered = await registration; assert.equal(registered.status(), 201); const data = (await registered.json()).data; providerId = new mongoose.Types.ObjectId(data.session.user.id); appId = new mongoose.Types.ObjectId(data.application.id);
  let token = await refresh(provider), app = await api(provider, token, '/provider/application');
  const catalog = await (await fetch(base + '/api/v1/public/properties?limit=1')).json(), location = catalog.data.locations[0].id;
  app = await api(provider, token, '/provider/application/account', { version: app.version, accountOwnerFullName: 'Local developer', displayName: prefix, primaryLocationId: location, serviceAreaIds: [location], preferredLocale: 'en', termsAcceptedAt: at.toISOString(), privacyAcceptedAt: at.toISOString() }, 'PATCH');
  app = await api(provider, token, '/provider/application/company', { version: app.version, legalCompanyName: prefix, brandName: prefix, headOfficeAddress: 'Synthetic local office', commercialRegistrationNumber: 'LOCAL-2026', taxRegistrationNumber: 'LOCAL-TAX', authorizedRepresentativeFullName: 'Local developer', authorizedRepresentativeTitle: 'Owner', accountOwnerHasRegisteredAuthority: true }, 'PATCH');
  await page.goto(base + '/auth/register/provider/company?providerType=developer_company&lang=en'); await ready(page);
  await expect(page.locator('#provider-company-legal-name')).toHaveValue(prefix);
  const upload = page.waitForResponse(r => r.url().endsWith('/provider/organization-photos') && r.request().method() === 'POST'); await page.locator('.provider-company-image input[type=file]').setInputFiles('apps/web/public/assets/sadat-real-estate-logo.png'); assert.equal((await upload).status(), 201);
  await expect(page.locator('.provider-company-image img')).toBeVisible(); const photo = await db.collection('organization_photos').findOne({ createdBy: providerId }); assert(photo); const imageUrl = `/api/v1/public/organization-photos/${photo._id}`;
  await page.getByRole('button', { name: 'Save draft', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Details saved' })).toBeVisible();
  token = await refresh(provider); app = await api(provider, token, '/provider/application'); assert.equal(app.companyImageUrl, imageUrl);
  assert.equal((await fetch(base + imageUrl)).status, 404);
  await api(provider, token, '/provider/application/company', { version: app.version, companyImageUrl: '/api/v1/public/organization-photos/' + 'f'.repeat(24) }, 'PATCH', 400);
  report.checks.push('fresh_email_otp_registration_upload_and_save_company_cover_private_before_approval_foreign_photo_rejected');
  await page.screenshot({ path: `${root}/registration-company-cover.png`, fullPage: true });
  const bytes = await readFile('apps/web/public/assets/sadat-real-estate-logo.png');
  for (const category of app.missingDocuments) await api(provider, token, '/provider/application/documents', bytes, 'POST', 201, { 'content-type': 'image/png', 'x-document-category': category, 'x-file-name': `${category}.png` });
  app = await api(provider, token, '/provider/application'); assert.deepEqual(app.missingFields, []); assert.deepEqual(app.missingDocuments, []);
  await page.goto(base + '/auth/register/provider/review?providerType=developer_company&lang=en'); await ready(page); await expect(page.getByTestId('provider-review-submit')).toBeEnabled(); await page.getByTestId('provider-review-submit').click(); await expect(page.getByRole('heading', { name: 'Your application is under review', exact: true })).toBeVisible(); token = await refresh(provider); const pendingToken = token;
  const admin = await chrome.newContext({ viewport: { width: 1440, height: 1000 } }); contexts.push(admin); let adminToken = await signed(admin, `${prefix}-admin@example.invalid`); const adminPage = await admin.newPage(); await adminPage.goto(base + `/admin/providers/${appId}?lang=en`); await ready(adminPage);
  await expect(adminPage.getByRole('heading', { name: 'Company image submitted with application' })).toBeVisible(); await expect(adminPage.locator('.admin-company-editor__photo')).toBeVisible(); await adminPage.screenshot({ path: `${root}/admin-request-cover.png`, fullPage: true });
  await adminPage.locator('#admin-provider-review-reason').fill('Approve synthetic developer after reviewing the submitted image'); const approved = adminPage.waitForResponse(r => r.url().endsWith(`/admin/providers/${appId}/review`)); await adminPage.getByRole('button', { name: 'Verify account', exact: true }).click(); assert.equal((await approved).status(), 200);
  const organization = await db.collection('organizations').findOne({ providerId: (await db.collection('provider_profiles').findOne({ userId: providerId }))._id }); assert.equal(organization.imageUrl, imageUrl); assert.equal((await fetch(base + imageUrl)).status, 200);
  report.checks.push('four_document_submission_admin_sees_cover_and_approval_carries_cover_to_public_company');
  const statuses = []; let activeToken = pendingToken, renewals = 0;
  const created = await createProviderProperty({ kind: 'property', name: { en: `${prefix} stale approval home` }, transactionType: 'sale', reason: 'Create after approval without signing in again' }, { apiClient: new ApiClient({ baseUrl: base + '/api/v1', fetcher: async (...args) => { const r = await fetch(...args); statuses.push(r.status); return r; } }), authorization: { getAuthorizationHeader: () => `Bearer ${activeToken}`, refresh: async () => { renewals += 1; activeToken = await refresh(provider); } } });
  assert.equal(created.source.sourceType, 'developer_company'); assert.equal(created.source.organizationId, String(organization._id)); assert.equal(renewals, 1); assert([401, 403].includes(statuses[0])); assert.equal(statuses.at(-1), 201);
  report.checks.push('real_initial_property_creation_recovers_stale_preapproval_token_once_and_uses_approved_company');
  await page.goto(base + '/provider/notifications?lang=ar'); await ready(page); const row = page.locator('.provider-notifications__item').filter({ hasText: 'تم تفعيل حسابك' }); await expect(row).toHaveAttribute('data-state', 'unread'); await expect(row).toContainText('تفعيل الحساب'); await expect(row).not.toContainText('provider.review.verify'); await row.getByRole('link', { name: 'فتح التفاصيل' }).click(); await expect(page).toHaveURL(/\/provider\?lang=ar/); await ready(page);
  const receipt = await db.collection('notifications').findOne({ recipientId: providerId, type: 'provider.review.verify' }); assert(receipt.readAt instanceof Date);
  await page.goto(base + '/provider/notifications?lang=ar'); await ready(page); await expect(page.getByTestId(`provider-notification-${receipt._id}`)).toHaveAttribute('data-state', 'read'); await page.screenshot({ path: `${root}/notification-read.png`, fullPage: true });
  token = await refresh(provider); const project = await api(provider, token, '/provider/projects', { name: { ar: 'مشروع المطور التجريبي', en: `${prefix} project` }, reason: 'Create synthetic developer project' }, 'POST', 201);
  await page.goto(base + '/provider/properties/new/basic?lang=ar'); await ready(page); await expect(page.locator('#provider-property-name')).toBeVisible(); await page.locator('#provider-property-name').fill('عقار المطور التجريبي'); await page.getByText('ربط الإعلان بمشروع (اختياري)', { exact: true }).click(); await expect(page.locator('#provider-property-project option').filter({ hasText: 'مشروع المطور التجريبي' })).toHaveCount(1); await page.locator('#provider-property-project').selectOption(project.id); await page.getByRole('button', { name: 'حفظ المسودة', exact: true }).click(); await expect(page.locator('.provider-property-wizard__form-message--success')).toBeVisible();
  assert.equal((await db.collection('properties').findOne({ providerId, 'name.ar': 'عقار المطور التجريبي' })).projectId.toString(), project.id);
  await page.goto(base + '/provider/settings?lang=ar'); await ready(page); await expect(page.getByRole('heading', { name: 'بيانات شركتك وصورة الغلاف' })).toBeVisible(); await expect(page.getByLabel('سبب التعديل أو الحذف')).toHaveCount(0); await page.getByLabel('نبذة الشركة', { exact: true }).fill('نبذة بسيطة من صاحب الشركة'); const companySaved = page.waitForResponse(r => r.url().endsWith('/provider/organization') && r.request().method() === 'PATCH'); await page.getByRole('button', { name: 'حفظ ملف الشركة', exact: true }).click(); assert.equal((await companySaved).status(), 200);
  report.checks.push('notification_open_marks_read_persists_after_return_arabic_property_chooses_project_by_name_owner_settings_saves_without_internal_reason');
  adminToken = await refresh(admin);
  const category = await api(admin, adminToken, '/admin/article-categories', { name: { en: prefix, ar: 'تجربة المحتوى' }, reason: 'Create synthetic article category' }, 'POST', 201); categoryIds.push(new mongoose.Types.ObjectId(category.id));
  const cover = await api(admin, adminToken, '/admin/articles/photos', bytes, 'POST', 201, { 'content-type': 'image/png' });
  let article = await api(admin, adminToken, '/admin/articles', { categoryId: category.id, title: { ar: 'عنوان المقال التجريبي', en: prefix }, body: { ar: 'النص الكامل للمقال يظهر داخل المقال فقط.', en: 'Full article body stays in the article.' }, seoDescription: { ar: 'وصف مختصر مستقل للكارت', en: 'A separate short card description' }, authorName: { ar: 'كاتب التجربة', en: 'Local author' }, coverAssetId: cover.id, reason: 'Create a synthetic editorial example' }, 'POST', 201); articleIds.push(new mongoose.Types.ObjectId(article.id));
  article = await api(admin, adminToken, `/admin/articles/${article.id}/transitions`, { version: article.version, status: 'published', reason: 'Publish synthetic editorial example' }, 'POST');
  await adminPage.goto(base + `/admin/articles?articleId=${article.id}&lang=en`); await ready(adminPage); await expect(adminPage.getByTestId('admin-article-editor')).toBeVisible(); await expect(adminPage.getByRole('group', { name: 'Short article description' })).toBeVisible(); await expect(adminPage.getByRole('group', { name: 'Public author name (optional)' })).toBeVisible();
  const rate = await fetch(base + '/api/v1/public/bootstrap');
  if (rate.status === 429 || Number(rate.headers.get('ratelimit-remaining')) < 65) {
    const seconds = Math.min(60, Math.max(1, Number(rate.headers.get('retry-after') ?? rate.headers.get('ratelimit-reset') ?? 60)));
    console.log('QA_RATE_WINDOW_PAUSE', seconds); report.rateLimitWaitSeconds = seconds;
    await new Promise(resolve => setTimeout(resolve, seconds * 1000));
  }
  for (const [locale, width] of [['ar', 320], ['en', 390], ['en', 1440]]) {
    const ctx = await safari.newContext({ viewport: { width, height: 1000 } }); contexts.push(ctx); const p = await ctx.newPage(); await p.goto(base + `/articles?categoryId=${category.id}&lang=${locale}`); await ready(p); const card = p.locator('[data-article-card]').filter({ hasText: locale === 'ar' ? 'عنوان المقال التجريبي' : prefix }); await expect(card).toContainText(locale === 'ar' ? 'وصف مختصر مستقل للكارت' : 'A separate short card description'); await expect(card).toContainText(locale === 'ar' ? 'كاتب التجربة' : 'Local author'); await expect(card).not.toContainText(locale === 'ar' ? 'النص الكامل للمقال' : 'Full article body'); await card.screenshot({ path: `${root}/article-card-${locale}-${width}.png` });
    await p.goto(base + `/articles/${article.slug}?lang=${locale}`); await ready(p); const picture = p.locator('.public-article-details__hero-media img'); await expect(picture).toBeVisible(); assert.equal(await picture.evaluate(img => getComputedStyle(img).objectFit), 'contain'); assert(await picture.evaluate(img => img.complete && img.naturalWidth > 0)); assert(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)); await p.screenshot({ path: `${root}/article-full-cover-${locale}-${width}.png` }); await ctx.close();
  }
  report.checks.push('real_webkit_ar_en_card_description_author_full_image_and_no_overflow_at_320_390_1440');
  assert.deepEqual(report.browserErrors, []); report.status = 'PASS_LOCAL';
} catch (error) { report.error = String(error.stack ?? error); process.exitCode = 1; if (lastPage && !lastPage.isClosed()) { await lastPage.screenshot({ path: `${root}/failure.png` }); await writeFile(`${root}/failure.txt`, await lastPage.locator('body').innerText()); } }
finally {
  for (const ctx of contexts) await ctx.close().catch(() => {});
  providerId ??= (await db.collection('users').findOne({ normalizedEmail: email }))?._id;
  appId ??= providerId ? (await db.collection('provider_applications').findOne({ userId: providerId }))?._id : undefined;
  const owners = [adminId, ...(providerId ? [providerId] : [])];
  const storageRoot = path.resolve(env.PRIVATE_STORAGE_LOCAL_ROOT?.trim() || path.join(os.tmpdir(), 'sadat-real-estate-private-storage'));
  for (const collection of ['organization_photos', 'cms_article_photos', 'provider_documents']) {
    if (collection === 'provider_documents' && !appId) continue;
    const filter = collection === 'provider_documents' ? { applicationId: appId } : { createdBy: { $in: owners } };
    for (const row of await db.collection(collection).find(filter).toArray()) { if (typeof row.storageKey === 'string' && /^quarantine\/[a-f0-9]{32}$/.test(row.storageKey)) { const target = path.resolve(storageRoot, row.storageKey); assert(target.startsWith(storageRoot + path.sep)); await rm(target, { force: true }); } }
    await db.collection(collection).deleteMany(filter);
  }
  if (providerId) {
    const profile = await db.collection('provider_profiles').findOne({ userId: providerId }); const ownerIds = [providerId, appId, profile?._id].filter(Boolean);
    await db.collection('organizations').deleteMany({ providerId: { $in: [...ownerIds, ...ownerIds.map(String)] } }); await db.collection('organization_reconciliations').deleteMany({ accountId: providerId });
    await db.collection('properties').deleteMany({ providerId }); await db.collection('projects').deleteMany({ providerId }); await db.collection('account_state_transitions').deleteMany({ targetUserId: providerId });
  }
  for (const c of ['provider_profiles', 'provider_applications', 'admin_accounts', 'admin_profiles', 'admin_credentials', 'sessions']) await db.collection(c).deleteMany({ userId: { $in: owners } });
  await db.collection('admin_role_assignments').deleteMany({ adminUserId: adminId }); await db.collection('roles').deleteOne({ _id: roleId }); await db.collection('users').deleteMany({ _id: { $in: owners } }); await db.collection('notifications').deleteMany({ recipientId: { $in: owners } }); await db.collection('audit_logs').deleteMany({ actorId: { $in: owners } }); await db.collection('otp_challenges').deleteMany({ normalizedEmail: email }); await db.collection('articles').deleteMany({ _id: { $in: articleIds } }); await db.collection('article_categories').deleteMany({ _id: { $in: categoryIds } });
  report.cleanup = true; await writeFile('docs/quality/guide-runs/developer-content-followups-local-latest.json', JSON.stringify(report, null, 2) + '\n'); await db.close(); await chrome.close(); await safari.close(); console.log(JSON.stringify(report));
}
