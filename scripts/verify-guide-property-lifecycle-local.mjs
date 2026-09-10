import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import mongoose from 'mongoose';
import { chromium, expect } from '@playwright/test';

const base = 'http://127.0.0.1:4173';
const providerPassword = 'LocalProvider-Journey-Only!2026';
const adminPassword = 'LocalPreview-Admin-Only-2026!';
const evidence = {
  commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  worktreeChanges: execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim().length > 0,
  journeys: ['GUIDE-14', 'GUIDE-15'], environment: 'local-real-browser-api-mongodb-storage', mockedRoutes: false,
  startedAt: new Date().toISOString(), status: 'RUNNING', transitions: [], authorization: [], http: [], browser: []
};

function parseEnvironment(source) {
  const values = {};
  for (const raw of source.split(/\r?\n/u)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    values[key] = value;
  }
  return values;
}

function safePath(path) {
  return path.replace(/\/[a-f0-9]{24}(?=\/|$)/gu, '/:id').replace(/\?.*$/u, '');
}
function record(method, path, status) { evidence.http.push({ method, path: safePath(path), status }); }
function watchApi(page) {
  page.on('response', response => {
    const url = new URL(response.url());
    if (url.pathname.startsWith('/api/v1/')) record(response.request().method(), url.pathname, response.status());
  });
}
async function login(context, email, password, role) {
  const response = await context.request.post(`${base}/api/v1/auth/login`, { data: { email, password } });
  record('POST', '/api/v1/auth/login', response.status());
  assert.equal(response.status(), 200);
  const session = (await response.json()).data;
  assert.equal(session.user.roleType, role);
  return session;
}
async function loginApi(email, password, role) {
  const response = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  record('POST', '/api/v1/auth/login', response.status);
  assert.equal(response.status, 200);
  const session = (await response.json()).data;
  assert.equal(session.user.roleType, role);
  assert.equal(typeof session.accessToken, 'string');
  return session;
}
async function api(path, { method = 'GET', token, body, expected = 200 } = {}) {
  const response = await fetch(`${base}/api/v1${path}`, {
    method,
    headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(body === undefined ? {} : { 'content-type': 'application/json' }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  record(method, `/api/v1${path}`, response.status);
  let payload;
  try { payload = await response.json(); } catch { payload = undefined; }
  assert.equal(response.status, expected, `${path} returned ${response.status} ${payload?.error?.code ?? ''}`);
  return payload?.data;
}
async function screen(page, id) {
  await expect(page.locator(`[data-screen-id="${id}"]`).first()).toBeVisible();
  const geometry = await page.evaluate(() => ({ innerWidth, scrollWidth: document.documentElement.scrollWidth }));
  assert.equal(geometry.innerWidth, 402);
  assert.ok(geometry.scrollWidth <= 402, `${id} has horizontal overflow`);
  evidence.browser.push({ screen: id, ...geometry });
}
async function continueForm(page, path, method = 'PATCH') {
  const pending = page.waitForResponse(response => response.request().method() === method && new URL(response.url()).pathname === path);
  await page.locator('button[name="intent"][value="continue"]').click();
  const response = await pending;
  assert.ok([200, 201].includes(response.status()), `${path} returned ${response.status()}`);
  return response.status();
}
async function firstNonEmptyOption(select) {
  await expect.poll(async () => select.locator('option').count()).toBeGreaterThan(1);
  const value = await select.locator('option').evaluateAll(options => options.map(option => option.value).find(Boolean));
  assert.equal(typeof value, 'string');
  await select.selectOption(value);
  return value;
}

let mongo;
const browser = await chromium.launch({ headless: true });
try {
  const env = parseEnvironment(await readFile('.env.local', 'utf8'));
  assert.ok(env.MONGODB_URI);
  mongo = await mongoose.createConnection(env.MONGODB_URI).asPromise();
  const providerUser = await mongo.collection('users').findOne(
    { roleType: 'provider', status: 'verified', normalizedEmail: /^guide-provider-/u },
    { sort: { _id: -1 }, projection: { _id: 1, normalizedEmail: 1 } }
  );
  assert.ok(providerUser?._id instanceof mongoose.Types.ObjectId);
  assert.equal(typeof providerUser.normalizedEmail, 'string');
  const providerProfile = await mongo.collection('provider_profiles').findOne({ userId: providerUser._id, status: 'approved' });
  assert.ok(providerProfile?._id instanceof mongoose.Types.ObjectId);
  const organizationId = new mongoose.Types.ObjectId();
  const organizationSlug = `delivery-developer-${Date.now()}`;
  await mongo.collection('organizations').insertOne({
    _id: organizationId,
    providerId: providerProfile._id,
    kind: 'developer_company',
    name: { ar: 'شركة التسليم التجريبية', en: 'Synthetic Delivery Developer' },
    description: { ar: 'بيانات محلية لاختبار رحلة العقار.', en: 'Local data for the property delivery journey.' },
    slug: organizationSlug,
    status: 'approved',
    directoryVisible: false,
    synthetic: true,
    seedKey: 'guide-property-lifecycle-local',
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 0
  });
  evidence.transitions.push('approved_provider_organization_fixture_inserted');

  const providerContext = await browser.newContext({ viewport: { width: 402, height: 874 }, isMobile: true });
  await login(providerContext, providerUser.normalizedEmail, providerPassword, 'provider');
  const page = await providerContext.newPage();
  watchApi(page);
  const slug = `delivery-property-${Date.now()}`;

  await page.goto(`${base}/provider/properties/new/basic?lang=en`, { waitUntil: 'networkidle' });
  await screen(page, 'PRV-03');
  let createCount = 0;
  page.on('request', request => { if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/v1/provider/properties') createCount += 1; });
  await page.locator('#provider-property-name').fill('Complete Delivery Property');
  await page.locator('#provider-property-slug').fill('Invalid Slug');
  await page.locator('#provider-property-source-type').selectOption('developer_company');
  await page.locator('#provider-property-organization').fill(organizationId.toHexString());
  await page.locator('#provider-property-reason').fill('Create complete delivery property');
  await page.locator('button[name="intent"][value="continue"]').click();
  await expect(page.getByRole('alert')).toBeVisible();
  assert.equal(createCount, 0);
  await page.locator('#provider-property-slug').fill(slug);
  await continueForm(page, '/api/v1/provider/properties', 'POST');
  await page.waitForURL(/\/provider\/properties\/[a-f0-9]{24}\/location/u);
  const propertyId = new URL(page.url()).pathname.match(/\/provider\/properties\/([a-f0-9]{24})\/location/u)?.[1];
  assert.match(propertyId, /^[a-f0-9]{24}$/u);
  const providerToken = (await loginApi(providerUser.normalizedEmail, providerPassword, 'provider')).accessToken;
  const created = await api(`/provider/properties/${propertyId}`, { token: providerToken });
  assert.equal(created.status, 'draft');
  const createdVersion = created.version;
  evidence.transitions.push('invalid_basic_blocked_before_api', 'draft_created_from_browser');

  await screen(page, 'PRV-04');
  const locationId = await firstNonEmptyOption(page.locator('#provider-property-location-id'));
  await page.locator('#provider-property-reason').fill('Save verified location');
  await continueForm(page, `/api/v1/provider/properties/${propertyId}/steps/location`);
  await page.waitForURL(new RegExp(`/provider/properties/${propertyId}/details`));
  evidence.transitions.push('location_saved_from_browser');

  const stale = await api(`/provider/properties/${propertyId}/steps/location`, {
    method: 'PATCH', token: providerToken, expected: 409,
    body: { version: createdVersion, locationId, reason: 'Stale location update must conflict' }
  });
  assert.equal(stale, undefined);
  evidence.authorization.push('stale_provider_update_rejected_409');

  await screen(page, 'PRV-05');
  await page.locator('#provider-property-description').fill('A complete synthetic property used only for local delivery verification.');
  await page.locator('#provider-property-area').fill('165');
  await page.locator('#provider-property-bedrooms').fill('3');
  await page.locator('#provider-property-bathrooms').fill('2');
  await page.locator('#provider-property-floor').fill('2');
  await page.locator('#provider-property-total-floors').fill('5');
  await page.locator('#provider-property-delivery-status').selectOption('ready_to_move');
  await firstNonEmptyOption(page.locator('#provider-property-type-id'));
  await page.locator('#provider-property-reason').fill('Save complete property details');
  await continueForm(page, `/api/v1/provider/properties/${propertyId}/steps/details`);
  await page.waitForURL(new RegExp(`/provider/properties/${propertyId}/price-payment`));
  evidence.transitions.push('details_saved_from_browser');

  await screen(page, 'PRV-06');
  await page.locator('#provider-property-price').fill('2400000');
  await page.locator('#provider-property-currency').fill('EGP');
  await page.locator('#provider-property-payment-plan').check();
  await page.locator('#provider-property-plan-name').fill('Delivery installments');
  await page.locator('#provider-property-installments').fill('24');
  await page.locator('#provider-property-frequency').selectOption('monthly');
  await page.locator('#provider-property-down-payment').fill('400000');
  await page.locator('#provider-property-installment-amount').fill('83333');
  await page.locator('#provider-property-reason').fill('Save price and compatible payment plan');
  await continueForm(page, `/api/v1/provider/properties/${propertyId}/steps/price-payment`);
  await page.waitForURL(new RegExp(`/provider/properties/${propertyId}/features`));
  evidence.transitions.push('price_and_payment_plan_saved_from_browser');

  await screen(page, 'PRV-07');
  await page.locator('#provider-property-reason').fill('Confirm empty optional features and services');
  await continueForm(page, `/api/v1/provider/properties/${propertyId}/steps/features-services`);
  await page.waitForURL(new RegExp(`/provider/properties/${propertyId}/media`));
  evidence.transitions.push('optional_features_services_saved_from_browser');

  await screen(page, 'PRV-08');
  const uploadPending = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname === `/api/v1/provider/properties/${propertyId}/media`);
  await page.locator('#provider-property-media-image').setInputFiles('apps/web/public/assets/sadat-real-estate-logo.png');
  const uploadResponse = await uploadPending;
  assert.equal(uploadResponse.status(), 201);
  let uploadedMedia;
  await expect.poll(async () => {
    uploadedMedia = await mongo.collection('property_media').findOne({ propertyId: new mongoose.Types.ObjectId(propertyId), active: true });
    return uploadedMedia?.processingState;
  }).toBe('ready');
  assert.ok(uploadedMedia?._id instanceof mongoose.Types.ObjectId);
  uploadedMedia = { ...uploadedMedia, id: uploadedMedia._id.toHexString() };
  assert.equal(uploadedMedia.processingState, 'ready');
  await expect(page.locator('.provider-property-completion__media-item')).toContainText('sadat-real-estate-logo.png');
  await page.locator('.provider-property-wizard__actions button').last().click();
  await page.waitForURL(new RegExp(`/provider/properties/${propertyId}/contact`));
  evidence.transitions.push('image_uploaded_scanned_and_rendered_from_browser');

  await screen(page, 'PRV-09');
  await page.locator('#provider-property-contact-name').fill('Delivery Provider Contact');
  await page.locator('#provider-property-contact-phone').fill('+201001234567');
  await page.locator('#provider-property-contact-email').fill('delivery-contact@example.invalid');
  await page.locator('#provider-property-contact-time').fill('Daily 9 to 5');
  await page.locator('#provider-property-contact-notes').fill('Private delivery contact instructions');
  await page.locator('.provider-property-completion__visibility input').nth(0).uncheck();
  await page.locator('.provider-property-completion__visibility input').nth(2).uncheck();
  const contactPending = page.waitForResponse(response => response.request().method() === 'PATCH' && new URL(response.url()).pathname.endsWith('/steps/contact'));
  await page.locator('form.provider-property-completion__form button[type="submit"]').click();
  assert.equal((await contactPending).status(), 200);
  const savedContact = (await api(`/provider/properties/${propertyId}`, { token: providerToken })).contact;
  assert.equal(savedContact.preferredContactTime, 'Daily 9 to 5');
  assert.equal(savedContact.internalNotes, 'Private delivery contact instructions');
  assert.equal(savedContact.showPhone, false);
  assert.equal(savedContact.showEmail, false);
  await page.waitForURL(new RegExp(`/provider/properties/${propertyId}/review`));
  evidence.transitions.push('contact_saved_from_browser');

  await screen(page, 'PRV-10');
  const confirmations = page.locator('.provider-property-completion__checks input[type="checkbox"]');
  await expect(confirmations).toHaveCount(3);
  for (let index = 0; index < 3; index += 1) {
    await confirmations.nth(index).check();
    await expect(confirmations.nth(index)).toBeChecked();
  }
  const submitButton = page.locator('form.provider-property-completion__form button[type="submit"]');
  await expect(submitButton).toBeEnabled();
  let submitCount = 0;
  page.on('request', request => { if (request.method() === 'POST' && new URL(request.url()).pathname.endsWith(`/${propertyId}/submit`)) submitCount += 1; });
  await page.locator('#provider-property-submit-reason').fill('bad');
  await submitButton.click();
  await expect(page.getByRole('alert')).toBeVisible();
  assert.equal(submitCount, 0);
  await page.locator('#provider-property-submit-reason').fill('Submit complete property for administrative review');
  const submitPending = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith(`/${propertyId}/submit`));
  await submitButton.click();
  const submitted = (await (await submitPending).json()).data;
  assert.equal(submitted.status, 'pending_review');
  await expect(page.locator('.provider-property-completion__submitted')).toBeVisible();
  await page.goto(`${base}/provider/properties/${propertyId}/submitted?lang=en`, { waitUntil: 'networkidle' });
  await screen(page, 'PRV-12');
  await expect(page.locator('[data-property-status="pending_review"]')).toBeVisible();
  evidence.transitions.push('short_submit_reason_blocked_before_api', 'submitted_for_review_from_browser', 'submitted_state_rendered');

  const limitedContext = await browser.newContext();
  const limitedSession = await login(limitedContext, 'admin.viewer@example.invalid', adminPassword, 'admin');
  await api(`/admin/properties/${propertyId}/review`, {
    method: 'POST', token: limitedSession.accessToken, expected: 403,
    body: { version: submitted.version, action: 'needs_changes', reason: 'Limited administrator must not review properties' }
  });
  await limitedContext.close();
  evidence.authorization.push('view_only_admin_review_denied_403');

  const adminContext = await browser.newContext({ viewport: { width: 402, height: 874 }, isMobile: true });
  await login(adminContext, 'admin.demo@example.invalid', adminPassword, 'admin');
  const adminPage = await adminContext.newPage();
  watchApi(adminPage);
  await adminPage.goto(`${base}/admin/properties/review?propertyId=${propertyId}&lang=en`, { waitUntil: 'networkidle' });
  await screen(adminPage, 'ADM-15');
  await adminPage.locator('#admin-property-action').selectOption('needs_changes');
  await adminPage.locator('.admin-properties__action-card button[type="submit"]').click();
  await expect(adminPage.locator('.admin-properties__feedback')).toContainText('reason');
  await adminPage.locator('#admin-property-reason').fill('Please confirm the delivery contact before publication');
  const needsChangesPending = adminPage.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith(`/${propertyId}/review`));
  await adminPage.locator('.admin-properties__action-card button[type="submit"]').click();
  const needsChanges = (await (await needsChangesPending).json()).data;
  assert.equal(needsChanges.status, 'needs_changes');
  evidence.transitions.push('admin_reason_required_before_review', 'admin_requested_changes_from_browser');

  await page.goto(`${base}/provider/properties?lang=en`, { waitUntil: 'networkidle' });
  await screen(page, 'PRV-02');
  const providerRow = page.getByTestId(`provider-property-${propertyId}`);
  await expect(providerRow).toBeVisible();
  await expect(providerRow).toContainText('Please confirm the delivery contact');
  const revised = await api(`/provider/properties/${propertyId}/steps/contact`, {
    method: 'PATCH', token: providerToken,
    body: { version: needsChanges.version, contact: { contactName: 'Confirmed Delivery Contact', phone: '+201001234567', email: 'delivery-contact@example.invalid', preferredLocale: 'en' }, reason: 'Provider confirmed requested contact details' }
  });
  const resubmitted = await api(`/provider/properties/${propertyId}/submit`, {
    method: 'POST', token: providerToken,
    body: { version: revised.version, reason: 'Resubmit after completing requested changes' }
  });
  assert.equal(resubmitted.status, 'pending_review');
  evidence.transitions.push('provider_saw_review_reason', 'provider_revised_and_resubmitted');

  await adminPage.goto(`${base}/admin/properties/review?propertyId=${propertyId}&lang=en`, { waitUntil: 'networkidle' });
  await screen(adminPage, 'ADM-15');
  await adminPage.locator('#admin-property-action').selectOption('approve');
  await adminPage.locator('#admin-property-reason').fill('Property data and source have been verified');
  const approvePending = adminPage.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith(`/${propertyId}/review`));
  await adminPage.locator('.admin-properties__action-card button[type="submit"]').click();
  let reviewed = (await (await approvePending).json()).data;
  assert.ok(['approved', 'published'].includes(reviewed.status));
  evidence.transitions.push('admin_approved_property_from_browser');
  if (reviewed.status === 'approved') {
    await adminPage.goto(`${base}/admin/properties/review?propertyId=${propertyId}&lang=en`, { waitUntil: 'networkidle' });
    await adminPage.locator('#admin-property-action').selectOption('publish');
    await adminPage.locator('#admin-property-reason').fill('Publish the approved property to the public catalog');
    const publishPending = adminPage.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith(`/${propertyId}/review`));
    await adminPage.locator('.admin-properties__action-card button[type="submit"]').click();
    reviewed = (await (await publishPending).json()).data;
    assert.equal(reviewed.status, 'published');
    evidence.transitions.push('admin_published_approved_property_from_browser');
  }

  await page.goto(`${base}/provider/properties/${propertyId}/published?lang=en`, { waitUntil: 'networkidle' });
  await screen(page, 'PRV-14');
  await expect(page.locator('[data-property-status="published"]')).toBeVisible();
  const publicProperty = await api(`/public/properties/${slug}`);
  assert.equal(publicProperty.slug, slug);
  assert.equal(publicProperty.installmentAvailable, true);
  evidence.transitions.push('published_state_rendered', 'public_projection_200_after_compatible_payment_plan_persistence');

  const adminToken = (await loginApi('admin.demo@example.invalid', adminPassword, 'admin')).accessToken;
  const hidden = await api(`/admin/properties/${propertyId}/visibility`, {
    method: 'POST', token: adminToken,
    body: { version: reviewed.version, action: 'hide', reason: 'Temporarily hide property for visibility lifecycle verification' }
  });
  assert.equal(hidden.status, 'hidden');
  await api(`/public/properties/${slug}`, { expected: 404 });
  const restored = await api(`/admin/properties/${propertyId}/visibility`, {
    method: 'POST', token: adminToken,
    body: { version: hidden.version, action: 'restore', reason: 'Restore property after visibility lifecycle verification' }
  });
  assert.equal(restored.status, 'published');
  await api(`/public/properties/${slug}`);
  evidence.transitions.push('admin_hid_property_via_protected_api_and_public_returned_404', 'admin_restored_property_via_protected_api_and_public_returned_200');

  const [storedProperty, mediaRows, audits] = await Promise.all([
    mongo.collection('properties').findOne({ _id: new mongoose.Types.ObjectId(propertyId) }),
    mongo.collection('property_media').find({ propertyId: new mongoose.Types.ObjectId(propertyId) }).toArray(),
    mongo.collection('audit_logs').find({ targetType: { $in: ['property', 'property_media'] }, targetId: { $in: [propertyId, uploadedMedia.id] } }).sort({ occurredAt: 1, createdAt: 1 }).toArray()
  ]);
  assert.equal(storedProperty?.status, 'published');
  assert.equal(storedProperty?.active, true);
  assert.equal(storedProperty?.paymentPlans?.[0]?.installments, 24);
  assert.equal(mediaRows.length, 1);
  const auditActions = audits.map(item => item.action);
  for (const action of ['property.create', 'property.update', 'property.submit', 'property.review', 'property.visibility']) {
    assert.ok(auditActions.includes(action), `Missing ${action} audit`);
  }
  evidence.mongo = {
    collections: ['properties', 'property_media', 'audit_logs'], finalStatus: storedProperty.status,
    finalVersion: storedProperty.version, activeMedia: mediaRows.filter(item => item.active).length,
    paymentPlanInstallments: storedProperty.paymentPlans[0].installments,
    auditActions: [...new Set(auditActions)]
  };
  evidence.status = 'PASS_LOCAL';
  evidence.remaining = ['Run GUIDE-14 and GUIDE-15 on Production after deployment.'];
  await adminContext.close();
  await providerContext.close();
} catch (error) {
  evidence.status = 'FAIL_LOCAL';
  evidence.failure = error instanceof Error ? error.message.slice(0, 900) : 'Unknown failure';
  process.exitCode = 1;
} finally {
  if (mongo) await mongo.close();
  await browser.close();
  evidence.finishedAt = new Date().toISOString();
  await mkdir('docs/quality/guide-runs', { recursive: true });
  await writeFile('docs/quality/guide-runs/property-lifecycle-local-latest.json', `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(`PROPERTY_LIFECYCLE_LOCAL_${evidence.status}`);
}
