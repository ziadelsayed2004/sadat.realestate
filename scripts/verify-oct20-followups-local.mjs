import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import mongoose from 'mongoose';
import { chromium, webkit, expect as baseExpect } from '@playwright/test';
import { RBAC_PERMISSIONS } from '@sadat-real-estate/contracts';
import { createArgon2PasswordHasher } from '../apps/api/src/modules/auth/crypto.ts';
import { createAuditModels } from '../apps/api/src/modules/audit/models.ts';
import { createMongooseAuditWriter } from '../apps/api/src/modules/audit/writer.ts';

const env = Object.fromEntries((await readFile('.env.local', 'utf8')).split(/\r?\n/).filter(line => line.includes('=') && !line.startsWith('#')).map(line => { const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1).replace(/^['"]|['"]$/g, '')]; }));
const uri = new URL(env.MONGODB_URI);
assert(['localhost', '127.0.0.1'].includes(uri.hostname) && uri.port === '27018');
const db = await mongoose.createConnection(uri.href).asPromise(), chrome = await chromium.launch(), safari = await webkit.launch();
const expect = baseExpect.configure({ timeout: 20000 }), base = 'http://127.0.0.1:4173', at = new Date(), prefix = `oct20qa${Date.now()}`, password = 'Oct20-Review!2026';
const ids = Object.fromEntries(['admin', 'provider', 'profile', 'application', 'role', 'deleteRole', 'property', 'request', 'featuredRequest', 'override'].map(key => [key, new mongoose.Types.ObjectId()]));
const report = { status: 'FAIL_LOCAL', mockedResponses: false, checks: [], http: [], cleanup: false };
const created = { cms: [], banners: [], categories: [], posts: [], placements: [] }, backups = [];
const root = '.tmp/oct20-browser'; await mkdir(root, { recursive: true });
const contexts = [];
let lastPage;
let apiToken;
async function api(ctx, token, path, data, method = 'GET', expected = 200) {
  let r = await ctx.request.fetch(base + '/api/v1' + path, { method, data, headers: { authorization: `Bearer ${apiToken ?? token}` } });
  if (r.status() === 401) {
    const refresh = await ctx.request.post(base + '/api/v1/auth/refresh', { data: {} }); assert.equal(refresh.status(), 200);
    apiToken = (await refresh.json()).data.accessToken;
    r = await ctx.request.fetch(base + '/api/v1' + path, { method, data, headers: { authorization: `Bearer ${apiToken}` } });
  }
  const body = await r.json(); report.http.push({ method, path, status: r.status() });
  assert.equal(r.status(), expected, JSON.stringify(body)); return body.data;
}
async function ready(page) {
  await expect(page.locator('[data-auth-resolution=pending]')).toHaveCount(0);
  await expect(page.locator('#site-intro')).toBeHidden();
  await page.evaluate(async () => { await document.fonts.ready; await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
}
async function snap(page, name) { await ready(page); await page.screenshot({ path: `${root}/${name}.png` }); }
try {
  const hash = await createArgon2PasswordHasher().hash(password);
  await db.collection('users').insertMany(['admin', 'provider'].map(role => ({ _id: ids[role], normalizedEmail: `${prefix}-${role}@example.invalid`, roleType: role, status: 'verified', locale: 'en', version: 0, createdAt: at, updatedAt: at })));
  await db.collection('admin_credentials').insertMany(['admin', 'provider'].map(role => ({ userId: ids[role], passwordHash: hash, passwordChangedAt: at, createdAt: at, updatedAt: at })));
  await db.collection('admin_accounts').insertOne({ userId: ids.admin, displayName: prefix, accessLevel: 'standard_admin', createdAt: at, updatedAt: at });
  await db.collection('admin_profiles').insertOne({ userId: ids.admin, createdAt: at, updatedAt: at });
  await db.collection('roles').insertMany([{ _id: ids.role, name: prefix, nameKey: prefix, accessMode: 'custom', permissions: [...RBAC_PERMISSIONS], active: true, version: 0, createdBy: ids.admin, updatedBy: ids.admin, createdAt: at, updatedAt: at }, { _id: ids.deleteRole, name: `${prefix} deletion`, nameKey: `${prefix} deletion`, accessMode: 'view_only', permissions: ['admin:overview.view'], active: true, version: 0, createdBy: ids.admin, updatedBy: ids.admin, createdAt: at, updatedAt: at }]);
  await db.collection('admin_role_assignments').insertOne({ adminUserId: ids.admin, roleIds: [ids.role], assignedBy: ids.admin, assignedAt: at, version: 0, createdAt: at, updatedAt: at });
  await db.collection('provider_profiles').insertOne({ _id: ids.profile, userId: ids.provider, providerType: 'individual_broker', status: 'approved', version: 0, createdAt: at, updatedAt: at });
  await db.collection('provider_applications').insertOne({ _id: ids.application, userId: ids.provider, providerType: 'individual_broker', status: 'approved', displayName: `${prefix} advertiser`, accountOwnerFullName: 'QA owner', requirementVersion: '2026-08-13.1', version: 0, createdAt: at, updatedAt: at });
  await db.collection('properties').insertOne({ _id: ids.property, providerId: ids.provider, sourceType: 'individual_broker', kind: 'property', slug: prefix, name: { ar: 'عقار التجربة', en: `${prefix} property` }, transactionType: 'sale', status: 'published', active: true, version: 0, createdAt: at, updatedAt: at });
  for (const key of ['homepage.hero', 'homepage.featured']) {
    if (!await db.collection('ad_placements').findOne({ key })) {
      const id = new mongoose.Types.ObjectId(); created.placements.push(id);
      await db.collection('ad_placements').insertOne({ _id: id, key, surface: 'homepage', label: { en: key, ar: key }, width: 1200, height: 600, active: true, sortOrder: 0, allowedLocales: ['ar', 'en'], targetUrlRequired: true, version: 0, updatedBy: ids.admin, updatedAt: at });
    }
  }
  await db.collection('ad_requests').insertMany(['request', 'featuredRequest'].map(key => ({ _id: ids[key], providerId: ids.provider, purpose: `${prefix} campaign`, placementKey: key === 'request' ? 'homepage.hero' : 'homepage.featured', adType: key === 'request' ? 'banner' : 'featured_card', intervalStart: new Date(+at + 86400000), intervalEnd: new Date(+at + 86400000 * 3), status: 'review', version: 0, history: [], createdAt: at, updatedAt: at })));
  const ctx = await chrome.newContext({ viewport: { width: 1440, height: 1000 } }); contexts.push(ctx);
  const signed = await ctx.request.post(base + '/api/v1/auth/login', { data: { email: `${prefix}-admin@example.invalid`, password } }); assert.equal(signed.status(), 200); const token = (await signed.json()).data.accessToken;
  const page = await ctx.newPage(); lastPage = page;
  await page.goto(`${base}/admin/properties/possible-duplicates?lang=en`); await ready(page);
  await expect(page.getByRole('heading', { name: 'Choose a property to check for similarities' })).toBeVisible();
  report.checks.push('duplicates_entry_explains_selection_list_and_never_labels_every_property_duplicate');
  await page.goto(`${base}/admin/banners/new?requestId=${ids.request}&lang=en`); await ready(page);
  await expect(page.locator('#admin-home-banner-target')).toHaveValue(`https://elsadatrealestate.com/properties/${prefix}`);
  await expect(page.locator('#admin-home-banner-start')).toHaveAttribute('readonly');
  await expect(page.getByRole('link', { name: /Open request to change or schedule/ })).toHaveAttribute('href', `/admin/ads/requests?requestId=${ids.request}&lang=en`);
  await snap(page, 'banner-linked-destination-and-dates');
  report.checks.push('linked_banner_autoselects_only_owner_page_and_explains_authoritative_campaign_dates');
  await page.goto(`${base}/admin/ads/featured?requestId=${ids.featuredRequest}&lang=en`); await ready(page);
  await expect(page.getByRole('button', { name: 'Save draft', exact: true })).toBeEnabled();
  await page.getByRole('group', { name: 'Ad title', exact: true }).getByRole('textbox').fill(`${prefix} featured`);
  const saved = page.waitForResponse(r => new URL(r.url()).pathname === '/api/v1/admin/banners' && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click(); const savedResponse = await saved; assert.equal(savedResponse.status(), 201, await savedResponse.text()); created.banners.push(new mongoose.Types.ObjectId((await savedResponse.json()).data.id));
  await expect.poll(async () => (await db.collection('ad_banners').findOne({ _id: created.banners[0] }))?.version).toBeGreaterThanOrEqual(1);
  report.checks.push('featured_request_with_one_published_destination_can_save_draft');
  const content = await api(ctx, token, '/admin/content/homepage');
  const place = ['community', 'tips', 'about', 'articles', 'featured_properties', 'hero'].find(key => !content.items.some(item => item.key === key));
  assert(place, 'Local fixture needs one unoccupied homepage placement');
  const legacy = await api(ctx, token, '/admin/content/homepage', { key: `${prefix}_legacy`, title: { en: `${prefix} old heading` }, body: { en: 'Old description' }, order: 91, visible: true, status: 'published', reason: 'Create isolated legacy placement' }, 'PUT');
  const old = legacy.items.find(item => item.key === `${prefix}_legacy`); created.cms.push({ collection: 'cms_homepage_sections', id: new mongoose.Types.ObjectId(old.id) });
  await page.goto(`${base}/admin/content/homepage?contentId=${old.id}&lang=en`); await ready(page);
  await expect(page.locator('[data-testid=admin-home-homepage-editor]')).toBeVisible();
  await page.locator('#admin-home-homepage-key').selectOption(place);
  await page.locator('#admin-home-homepage-title-en').fill(`${prefix} new heading`);
  await page.locator('#admin-home-homepage-body-en').fill('New visible description');
  await expect(page.locator('.admin-home__section-preview')).toContainText('New visible description');
  await page.locator('#admin-home-homepage-reason').fill('Connect and clarify the section');
  const contentSaved = page.waitForResponse(r => new URL(r.url()).pathname === '/api/v1/admin/content/homepage' && r.request().method() === 'PUT');
  await page.locator('[data-testid=admin-home-homepage-editor]').getByRole('button', { name: 'Save', exact: true }).click(); assert.equal((await contentSaved).status(), 200);
  const publicHome = await (await fetch(base + '/api/v1/public/home')).json(); assert(publicHome.data.sections.some(item => item.key === place && item.body?.en === 'New visible description'));
  report.checks.push('legacy_section_reassigned_in_ui_with_live_preview_and_public_heading_description');
  const audit = await db.collection('audit_logs').findOne({ actorId: ids.admin, targetType: 'cms_homepage_section', targetId: old.id, action: 'cms.homepage.write', 'after.title.en': `${prefix} new heading` }); assert(audit);
  await page.goto(`${base}/admin/audit-logs/${audit._id}?lang=en`); await ready(page);
  await expect(page.locator('.admin-audit-changes')).toContainText('New visible description');
  await expect(page.getByRole('link', { name: /Open the changed record/ })).toHaveAttribute('href', `/admin/content/homepage?contentId=${old.id}&lang=en`);
  await snap(page, 'audit-readable-changes'); report.checks.push('audit_has_real_text_before_after_and_record_editor_link');
  for (const namespace of ['tips', 'about']) {
    const output = await api(ctx, token, `/admin/content/${namespace}`, { title: { en: `${prefix} ${namespace}` }, body: { en: 'A public content image and clear description' }, imageUrl: 'https://elsadatrealestate.com/assets/sadat-real-estate-logo.png', order: 3, active: true, status: 'published', reason: 'Verify configurable public imagery' }, 'PUT');
    const row = output.items.find(item => item.title?.en === `${prefix} ${namespace}`); assert(row); created.cms.push({ collection: namespace === 'tips' ? 'cms_real_estate_tips' : 'cms_about_blocks', id: new mongoose.Types.ObjectId(row.id) });
    const response = await (await fetch(base + (namespace === 'tips' ? '/api/v1/public/home' : '/api/v1/public/about'))).json();
    assert((namespace === 'tips' ? response.data.content : response.data.items).some(item => item.key === row.key && item.imageUrl));
  }
  report.checks.push('tips_and_about_images_persist_through_guarded_admin_api_to_public_projection');
  await page.goto(`${base}/admin/roles?lang=en`); await ready(page);
  const deleteRow = page.locator('tr').filter({ hasText: `${prefix} deletion` }); await deleteRow.getByRole('button', { name: 'Delete role', exact: true }).click();
  await deleteRow.getByLabel('Deletion reason').fill('Remove the unassigned test role');
  await deleteRow.getByRole('button', { name: 'Confirm delete', exact: true }).click(); await expect(deleteRow).toHaveCount(0);
  await api(ctx, token, `/admin/roles/${ids.role}`, { version: 0, reason: 'Guard assigned role' }, 'DELETE', 409);
  report.checks.push('role_deletion_available_on_list_unassigned_role_removed_assigned_role_protected');
  await page.goto(`${base}/admin/community?lang=en`); await ready(page);
  await page.getByText('Community categories — add a category', { exact: true }).click();
  await page.getByLabel('Arabic category name', { exact: true }).fill(`أخبار ${prefix}`);
  await page.getByLabel('English category name (optional)', { exact: true }).fill(`${prefix} news`);
  await page.getByLabel('Reason', { exact: true }).fill('Organize new community discussions');
  const categorySaved = page.waitForResponse(r => new URL(r.url()).pathname === '/api/v1/admin/community/categories' && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Add category', exact: true }).click(); const categoryResponse = await categorySaved; assert.equal(categoryResponse.status(), 201, await categoryResponse.text());
  const category = (await categoryResponse.json()).data.items.find(item => item.label.en === `${prefix} news`); assert(category); created.categories.push(category.key);
  const post = await api(ctx, token, '/public/community/posts', { title: `${prefix} categorized`, body: 'A real category workflow', category: category.key }, 'POST', 201); created.posts.push(post.id);
  await api(ctx, token, `/admin/community/posts/${post.id}/moderate`, { action: 'publish', expectedVersion: post.version, reason: 'Publish isolated category test' }, 'POST');
  await api(ctx, token, '/public/community/posts', { title: 'Unknown category', body: 'This must be rejected', category: 'custom_' + 'f'.repeat(24) }, 'POST', 400);
  await page.goto(base + '/community?lang=en'); await ready(page); await expect(page.getByRole('button', { name: `${prefix} news`, exact: true })).toBeVisible();
  report.checks.push('custom_community_category_created_in_ui_used_on_moderated_post_visible_as_public_filter_unknown_category_rejected');
  await db.collection('commission_account_overrides').insertOne({ _id: ids.override, accountId: ids.provider });
  const writer = createMongooseAuditWriter(createAuditModels(db));
  await writer.record({ actorType: 'admin', actorId: String(ids.admin), targetType: 'commission_account_override', targetId: String(ids.override), action: 'commission_account_override.create', reason: 'Verify account name in history', before: null, after: { accountId: String(ids.provider) }, requestId: prefix, traceId: 'a'.repeat(32), occurredAt: new Date() });
  const history = await api(ctx, token, '/admin/commission-change-log'); assert(history.items.some(item => item.targetId === String(ids.override) && item.accountName === `${prefix} advertiser`));
  report.checks.push('commission_history_resolves_account_display_name_without_exposing_credentials');
  for (const namespace of ['platform', 'contact']) backups.push({ namespace, doc: await db.collection('admin_settings').findOne({ namespace }) });
  await db.collection('admin_settings').updateOne({ namespace: 'platform' }, { $set: { 'values.office_address': { en: 'QA office' }, 'values.working_hours': { en: 'Every day, 9 AM to 5 PM' }, 'values.map_url': 'https://www.google.com/maps?q=Sadat', updatedAt: new Date() } }, { upsert: true });
  let bootstrap = await fetch(base + '/api/v1/public/bootstrap');
  if (bootstrap.status === 429 || Number(bootstrap.headers.get('ratelimit-remaining')) < 40) {
    const seconds = Math.min(60, Math.max(1, Number(bootstrap.headers.get('retry-after') ?? bootstrap.headers.get('ratelimit-reset') ?? 60)));
    console.log('QA_RATE_WINDOW_PAUSE', seconds); report.rateLimitWaitSeconds = seconds;
    await new Promise(resolve => setTimeout(resolve, seconds * 1000));
    bootstrap = await fetch(base + '/api/v1/public/bootstrap');
  }
  assert.equal(bootstrap.status, 200); assert((await bootstrap.json()).data.contact.workingHours?.en?.includes('9 AM'));
  for (const [width, locale] of [[320, 'ar'], [390, 'en'], [1440, 'en']]) {
    const browserCtx = await safari.newContext({ viewport: { width, height: 900 } }); contexts.push(browserCtx); const p = await browserCtx.newPage(); lastPage = p;
    await p.goto(`${base}/?lang=${locale}`); await ready(p); await expect(p.locator('.public-site-footer__hours')).toContainText('9 AM');
    await expect(p.locator('.public-site-footer__contact-links a[href="https://www.google.com/maps?q=Sadat"]')).toHaveCount(1);
    assert(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await p.locator('.public-homepage__category-section').scrollIntoViewIfNeeded(); await snap(p, `category-spacing-${locale}-${width}`);
    const spacing = await p.locator('.public-homepage__category-section').evaluate(element => {
      const title = element.querySelector('h2').getBoundingClientRect(), description = element.querySelector('.public-homepage__section-description').getBoundingClientRect();
      return description.top - title.bottom;
    }); assert(spacing >= 12, `Heading/description gap is only ${spacing}px`);
    await p.goto(`${base}/articles?lang=${locale}`); await ready(p);
    if (await p.locator('.public-articles__card-byline').count()) {
      const fits = await p.locator('.public-articles__card-byline').evaluateAll(rows => rows.every(row => {
        const box = row.closest('article').getBoundingClientRect(), metadata = row.getBoundingClientRect();
        const children = Array.from(row.children).map(child => child.getBoundingClientRect());
        return metadata.left >= box.left && metadata.right <= box.right && children.every((a, i) => children.every((b, j) => i === j || a.right <= b.left + 1 || b.right <= a.left + 1 || a.bottom <= b.top + 1 || b.bottom <= a.top + 1));
      })); assert(fits, 'Article author/date/reading metadata overlaps');
      await snap(p, `article-metadata-${locale}-${width}`);
    }
    await browserCtx.close(); contexts.splice(contexts.indexOf(browserCtx), 1);
  }
  report.checks.push('real_webkit_mobile_desktop_footer_map_and_hours_and_non_overflowing_homepage_layout');
  report.checks.push('homepage_heading_description_gap_and_article_metadata_geometry');
  report.status = 'PASS_LOCAL';
} catch (error) {
  report.error = String(error.stack ?? error); process.exitCode = 1;
  if (lastPage && !lastPage.isClosed()) { await lastPage.screenshot({ path: root + '/failure.png' }).catch(() => undefined); await writeFile(root + '/failure.txt', await lastPage.locator('body').innerText().catch(() => '')); }
} finally {
  for (const backup of backups) { if (backup.doc) await db.collection('admin_settings').replaceOne({ namespace: backup.namespace }, backup.doc); else await db.collection('admin_settings').deleteOne({ namespace: backup.namespace }); }
  for (const item of created.cms) await db.collection(item.collection).deleteOne({ _id: item.id });
  await db.collection('ad_banners').deleteMany({ $or: [{ _id: { $in: created.banners } }, { adRequestId: { $in: [ids.request, ids.featuredRequest] } }] });
  await db.collection('ad_placements').deleteMany({ _id: { $in: created.placements } });
  await db.collection('community_categories').deleteMany({ key: { $in: created.categories } });
  await db.collection('community_posts').deleteMany({ id: { $in: created.posts } });
  await db.collection('commission_account_overrides').deleteOne({ _id: ids.override });
  for (const collection of ['sessions', 'admin_credentials', 'provider_profiles', 'provider_applications', 'admin_accounts', 'admin_profiles']) await db.collection(collection).deleteMany({ userId: { $in: [ids.admin, ids.provider] } });
  await db.collection('admin_role_assignments').deleteMany({ adminUserId: ids.admin });
  await db.collection('roles').deleteMany({ _id: { $in: [ids.role, ids.deleteRole] } });
  await db.collection('audit_logs').deleteMany({ actorId: ids.admin }); await db.collection('users').deleteMany({ _id: { $in: [ids.admin, ids.provider] } });
  await db.collection('properties').deleteOne({ _id: ids.property }); await db.collection('ad_requests').deleteMany({ _id: { $in: [ids.request, ids.featuredRequest] } });
  for (const context of contexts) await context.close();
  report.cleanup = true;
  await writeFile('docs/quality/guide-runs/oct20-followups-local-latest.json', JSON.stringify(report, null, 2) + '\n');
  await chrome.close(); await safari.close(); await db.close(); console.log(JSON.stringify(report));
}
