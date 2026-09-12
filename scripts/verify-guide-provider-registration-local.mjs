import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import mongoose from 'mongoose';
import { chromium, expect } from '@playwright/test';

const base = 'http://127.0.0.1:4173';
const mail = 'http://127.0.0.1:8025';
const password = 'LocalProvider-Journey-Only!2026';
const email = `guide-provider-${Date.now()}@example.invalid`;
const requiredDocuments = [
  'commercial_registration',
  'tax_card',
  'authorized_representative_id_front',
  'authorized_representative_id_back'
];
const evidence = {
  commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  worktreeChanges: execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim().length > 0,
  journeys: ['GUIDE-11', 'GUIDE-12', 'GUIDE-13'],
  environment: 'local-real-browser-api-mailhog-mongodb',
  mockedRoutes: false,
  startedAt: new Date().toISOString(),
  status: 'RUNNING',
  transitions: [],
  authorization: [],
  http: [],
  browser: [],
  cleanup: false
};
let applicationId;
let userId;
const sessionIds = new Set();

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

function record(method, path, status) {
  evidence.http.push({ method, path, status });
}

async function responseData(response, expectedStatus, path) {
  record(typeof response.request === 'function' ? response.request().method() : 'POST', path, response.status());
  assert.equal(response.status(), expectedStatus, `${path} returned HTTP ${response.status()}`);
  return (await response.json()).data;
}

async function api(path, { method = 'GET', body, token, headers = {}, expected = 200 } = {}) {
  const requestHeaders = {
    ...(token ? { authorization: `Bearer ${token}` } : {}),
    ...(body !== undefined && !Buffer.isBuffer(body) ? { 'content-type': 'application/json' } : {}),
    ...headers
  };
  const response = await fetch(`${base}/api/v1${path}`, {
    method,
    headers: requestHeaders,
    ...(body === undefined ? {} : { body: Buffer.isBuffer(body) ? body : JSON.stringify(body) })
  });
  record(method, `/api/v1${path}`, response.status);
  let payload;
  try { payload = await response.json(); } catch { payload = undefined; }
  assert.equal(response.status, expected, `${path} returned HTTP ${response.status} ${payload?.error?.code ?? ''}`);
  return payload?.data;
}

async function login(context, loginEmail, loginPassword, expectedRole) {
  const response = await context.request.post(`${base}/api/v1/auth/login`, {
    data: { email: loginEmail, password: loginPassword }
  });
  const session = await responseData(response, 200, '/api/v1/auth/login');
  assert.equal(session.user.roleType, expectedRole);
  trackSession(session.accessToken);
  return session;
}

async function refresh(context, expectedRole) {
  const response = await context.request.post(`${base}/api/v1/auth/refresh`);
  const session = await responseData(response, 200, '/api/v1/auth/refresh');
  assert.equal(session.user.roleType, expectedRole);
  trackSession(session.accessToken);
  return session;
}

function trackSession(accessToken) {
  const claims = JSON.parse(Buffer.from(accessToken.split('.')[1], 'base64url').toString('utf8'));
  assert.match(claims.sid, /^[a-f0-9]{24}$/u);
  sessionIds.add(claims.sid);
}

async function readOtp(startedAt) {
  let code;
  await expect.poll(async () => {
    const response = await fetch(`${mail}/api/messages`);
    assert.equal(response.status, 200);
    const inbox = await response.json();
    const message = inbox.messages.find((item) => item.to.includes(email) && new Date(item.receivedAt).getTime() >= startedAt);
    code = message?.raw.replace(/=\r?\n/g, '').match(/\b(\d{6})\b/u)?.[1];
    return Boolean(code);
  }, { timeout: 15_000 }).toBe(true);
  return code;
}

const browserProfiles = [
  { device: 'desktop', viewport: { width: 1440, height: 1000 }, isMobile: false },
  { device: 'tablet', viewport: { width: 768, height: 900 }, isMobile: false },
  { device: 'mobile', viewport: { width: 390, height: 844 }, isMobile: true }
];

async function captureBrowserStage(context, stage, routes) {
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  for (const locale of ['ar', 'en']) {
    const errorsBefore = pageErrors.length;
    const runs = browserProfiles.map(profile => ({
      stage, locale, device: profile.device, status: 'PASS', pageErrors: 0, routeChecks: []
    }));
    for (const [routeIndex, route] of routes.entries()) {
      if (routeIndex === 0) {
        const response = await page.goto(`${base}${route}${route.includes('?') ? '&' : '?'}lang=${locale}`, { waitUntil: 'networkidle' });
        assert.equal(response?.status(), 200);
      } else {
        await page.evaluate(({ nextRoute, nextLocale }) => {
          const target = `${nextRoute}${nextRoute.includes('?') ? '&' : '?'}lang=${nextLocale}`;
          globalThis.history.pushState({}, '', target);
          globalThis.dispatchEvent(new globalThis.PopStateEvent('popstate'));
        }, { nextRoute: route, nextLocale: locale });
        await page.waitForTimeout(500);
      }
      await expect(page.locator('body')).toBeVisible();
      await expect.poll(() => page.evaluate(() => document.readyState)).toBe('complete');
      for (const [profileIndex, profile] of browserProfiles.entries()) {
        await page.setViewportSize(profile.viewport);
        await page.waitForTimeout(100);
        const geometry = await page.evaluate(() => ({ innerWidth, scrollWidth: document.documentElement.scrollWidth }));
        assert.ok(geometry.scrollWidth <= geometry.innerWidth + 1, `${stage}/${locale}/${profile.device}/${route} overflow`);
        runs[profileIndex].routeChecks.push({ route, finalPath: new URL(page.url()).pathname, documentStatus: 200, ...geometry });
      }
    }
    assert.equal(pageErrors.length, errorsBefore);
    evidence.browser.push(...runs);
  }
  await page.close();
}

const env = parseEnvironment(await readFile('.env.local', 'utf8'));
assert.ok(env.MONGODB_URI, 'MONGODB_URI is missing from .env.local');
const mongo = await mongoose.createConnection(env.MONGODB_URI).asPromise();
const browser = await chromium.launch({ headless: true });
try {
  const providerContext = await browser.newContext({ viewport: { width: 402, height: 874 }, isMobile: true });
  const providerPage = await providerContext.newPage();
  providerPage.on('response', (response) => {
    const path = new URL(response.url()).pathname;
    if (path.startsWith('/api/v1/')) record(response.request().method(), path, response.status());
  });

  await providerPage.goto(`${base}/auth/register/provider/type?lang=en`, { waitUntil: 'networkidle' });
  await expect(providerPage.locator('[data-screen-id="AUTH-07"]')).toBeVisible();
  await providerPage.locator('[data-provider-type="developer_company"]').click();
  await providerPage.locator('#provider-registration-password').fill(password);
  await providerPage.locator('#provider-registration-password-confirmation').fill(password);
  await providerPage.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(providerPage.locator('#auth-otp-email')).toBeVisible();
  await providerPage.locator('#auth-otp-email').fill(email);
  const otpStartedAt = Date.now();
  const sentPending = providerPage.waitForResponse((response) => new URL(response.url()).pathname === '/api/v1/auth/otp/send');
  await providerPage.getByRole('button', { name: 'Send code', exact: true }).click();
  assert.equal((await sentPending).status(), 202);
  const otp = await readOtp(otpStartedAt);
  const digits = providerPage.locator('.auth-otp__digit');
  await expect(digits).toHaveCount(6);
  for (let index = 0; index < 6; index += 1) await digits.nth(index).fill(otp[index]);
  const registrationPending = providerPage.waitForResponse((response) => new URL(response.url()).pathname === '/api/v1/provider/application' && response.request().method() === 'POST');
  await providerPage.getByRole('button', { name: 'Verify code', exact: true }).click();
  const registration = await responseData(await registrationPending, 201, '/api/v1/provider/application');
  assert.equal(registration.session.user.roleType, 'provider');
  assert.equal(registration.session.user.status, 'draft');
  assert.equal(registration.application.providerType, 'developer_company');
  applicationId = registration.application.id;
  userId = registration.session.user.id;
  trackSession(registration.session.accessToken);
  let providerToken = registration.session.accessToken;
  await expect(providerPage.locator('[data-screen-id="AUTH-09"]')).toBeVisible();
  evidence.transitions.push('browser_provider_type_password_and_email_otp', 'provider_draft_created', 'browser_account_step_visible');

  const forbidden = await api('/admin/providers', { token: providerToken, expected: 403 });
  assert.equal(forbidden, undefined);
  evidence.authorization.push('draft_provider_denied_admin_projection_403');

  let application = await api('/provider/application', { token: providerToken });
  assert.equal(application.version, 0);
  await api('/provider/application/submit', { method: 'POST', token: providerToken, body: { version: application.version }, expected: 409 });
  evidence.transitions.push('incomplete_submission_rejected_409');

  const propertyProjection = await api('/public/properties?page=1&limit=1');
  const locationId = propertyProjection.locations?.[0]?.id;
  assert.match(locationId, /^[a-f0-9]{24}$/u);
  const acceptedAt = new Date().toISOString();
  application = await api('/provider/application/account', {
    method: 'PATCH', token: providerToken, body: {
      version: application.version,
      accountOwnerFullName: 'Local Delivery Provider',
      displayName: 'Local Delivery Developments',
      email,
      primaryLocationId: locationId,
      serviceAreaIds: [locationId],
      preferredLocale: 'en',
      termsAcceptedAt: acceptedAt,
      privacyAcceptedAt: acceptedAt
    }
  });
  application = await api('/provider/application/company', {
    method: 'PATCH', token: providerToken, body: {
      version: application.version,
      legalCompanyName: 'Local Delivery Developments LLC',
      brandName: 'Local Delivery Developments',
      headOfficeAddress: 'Synthetic local delivery address',
      commercialRegistrationNumber: 'LOCAL-CR-2026',
      taxRegistrationNumber: 'LOCAL-TAX-2026',
      authorizedRepresentativeFullName: 'Local Delivery Provider',
      authorizedRepresentativeTitle: 'Authorized representative',
      accountOwnerHasRegisteredAuthority: true
    }
  });
  assert.deepEqual(application.missingFields, []);

  const documentBytes = await readFile('apps/web/public/assets/sadat-real-estate-logo.png');
  const uploadedIds = [];
  for (const category of requiredDocuments) {
    const uploaded = await api('/provider/application/documents', {
      method: 'POST', token: providerToken, body: documentBytes, expected: 201,
      headers: { 'content-type': 'image/png', 'x-document-category': category, 'x-file-name': `${category}-local-proof.png` }
    });
    assert.equal(uploaded.securityState, 'clean');
    assert.equal(uploaded.reviewState, 'uploaded');
    uploadedIds.push(uploaded.id);
  }
  const duplicateUpload = await api('/provider/application/documents', {
    method: 'POST', token: providerToken, body: documentBytes, expected: 200,
    headers: { 'content-type': 'image/png', 'x-document-category': requiredDocuments[0], 'x-file-name': `${requiredDocuments[0]}-local-proof.png` }
  });
  assert.equal(duplicateUpload.idempotentReplay, true);
  const documents = await api('/provider/application/documents', { token: providerToken });
  assert.equal(documents.items.length, requiredDocuments.length);
  assert.deepEqual(documents.items.map((item) => item.id).sort(), uploadedIds.sort());
  assert.ok(documents.items.every((item) => item.active && !('storageKey' in item)));
  application = await api('/provider/application', { token: providerToken });
  assert.deepEqual(application.missingFields, []);
  assert.deepEqual(application.missingDocuments, []);
  evidence.transitions.push('account_and_company_completed', 'four_required_documents_uploaded', 'duplicate_document_upload_idempotent');

  await captureBrowserStage(providerContext, 'draft_ready', [
    '/auth/register/provider/account?providerType=developer_company',
    '/auth/register/provider/company?providerType=developer_company',
    '/auth/register/provider/documents?providerType=developer_company',
    '/auth/register/provider/review?providerType=developer_company'
  ]);
  providerToken = (await refresh(providerContext, 'provider')).accessToken;

  application = await api('/provider/application/submit', { method: 'POST', token: providerToken, body: { version: application.version } });
  assert.equal(application.status, 'pending_review');
  await providerPage.goto(`${base}/auth/register/provider/review?providerType=developer_company&lang=en`, { waitUntil: 'networkidle' });
  await expect(providerPage.getByRole('heading', { name: 'Your application is under review', exact: true })).toBeVisible();
  await expect(providerPage.getByTestId('provider-review-track')).toBeVisible();
  evidence.browser.push({ stage: 'pending_review', width: await providerPage.evaluate(() => innerWidth), overflow: await providerPage.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1) });
  evidence.transitions.push('application_submitted', 'browser_pending_review_visible');
  await captureBrowserStage(providerContext, 'pending_review_responsive', ['/provider-application/status']);

  const limitedAdminContext = await browser.newContext();
  const limitedAdminSession = await login(limitedAdminContext, 'admin.operations@example.invalid', 'LocalPreview-Admin-Only-2026!', 'admin');
  const deniedReview = await api(`/admin/providers/${applicationId}/review`, {
    method: 'POST', token: limitedAdminSession.accessToken,
    body: { action: 'needs_information', reason: 'Limited administrator must be denied' }, expected: 403
  });
  assert.equal(deniedReview, undefined);
  evidence.authorization.push('limited_admin_provider_review_denied_403');
  await limitedAdminContext.close();

  const adminContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await login(adminContext, 'admin.demo@example.invalid', 'LocalPreview-Admin-Only-2026!', 'admin');
  const adminPage = await adminContext.newPage();
  await adminPage.goto(`${base}/admin/providers/${applicationId}?lang=en`, { waitUntil: 'networkidle' });
  await expect(adminPage.locator('#admin-provider-detail-title')).toHaveText('Local Delivery Developments');
  const requestInformation = adminPage.getByRole('button', { name: 'Request information', exact: true });
  await expect(requestInformation).toBeDisabled();
  await adminPage.locator('#admin-provider-review-reason').fill('Please confirm the synthetic delivery office name');
  const needsInformationPending = adminPage.waitForResponse((response) => new URL(response.url()).pathname === `/api/v1/admin/providers/${applicationId}/review`);
  await requestInformation.click();
  const needsInformation = await responseData(await needsInformationPending, 200, `/api/v1/admin/providers/${applicationId}/review`);
  assert.equal(needsInformation.applicationStatus, 'needs_information');
  const staleAdminSession = await refresh(adminContext, 'admin');
  const staleReview = await api(`/admin/providers/${applicationId}/review`, {
    method: 'POST', token: staleAdminSession.accessToken,
    body: { action: 'needs_information', reason: 'Repeated stale review must be rejected' }, expected: 409
  });
  assert.equal(staleReview, undefined);
  evidence.authorization.push('admin_review_reason_required_in_browser', 'repeated_stale_review_rejected_409');
  evidence.transitions.push('admin_browser_requested_information');

  const revisionContext = await browser.newContext({ viewport: { width: 768, height: 900 } });
  let providerSession = await login(revisionContext, email, password, 'provider');
  assert.equal(providerSession.user.status, 'needs_information');
  providerToken = providerSession.accessToken;
  const revisionPage = await revisionContext.newPage();
  await revisionPage.goto(`${base}/provider-application/needs-information?lang=en`, { waitUntil: 'networkidle' });
  await expect(revisionPage.getByRole('heading', { name: 'More information is needed', exact: true })).toBeVisible();
  await expect(revisionPage.getByText('Please confirm the synthetic delivery office name', { exact: true })).toBeVisible();
  await captureBrowserStage(revisionContext, 'needs_information_responsive', ['/provider-application/needs-information']);
  providerSession = await refresh(revisionContext, 'provider');
  providerToken = providerSession.accessToken;
  application = await api('/provider/application', { token: providerToken });
  application = await api('/provider/application/account', {
    method: 'PATCH', token: providerToken,
    body: { version: application.version, displayName: 'Local Delivery Developments Confirmed' }
  });
  application = await api('/provider/application/submit', { method: 'POST', token: providerToken, body: { version: application.version } });
  assert.equal(application.status, 'pending_review');
  evidence.browser.push({ stage: 'needs_information', width: await revisionPage.evaluate(() => innerWidth), overflow: await revisionPage.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1) });
  evidence.transitions.push('provider_browser_saw_review_reason', 'provider_revised_and_resubmitted');

  await adminPage.goto(`${base}/admin/providers/${applicationId}?lang=en`, { waitUntil: 'networkidle' });
  await expect(adminPage.locator('#admin-provider-detail-title')).toHaveText('Local Delivery Developments Confirmed');
  await adminPage.locator('#admin-provider-review-reason').fill('Verified by the complete local provider delivery journey');
  const approvePending = adminPage.waitForResponse((response) => new URL(response.url()).pathname === `/api/v1/admin/providers/${applicationId}/review`);
  await adminPage.getByRole('button', { name: 'Verify account', exact: true }).click();
  const approved = await responseData(await approvePending, 200, `/api/v1/admin/providers/${applicationId}/review`);
  assert.equal(approved.applicationStatus, 'approved');
  assert.equal(approved.accountStatus, 'verified');
  evidence.transitions.push('admin_browser_approved_provider');

  const approvedContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  providerSession = await login(approvedContext, email, password, 'provider');
  assert.equal(providerSession.user.status, 'verified');
  const approvedApplication = await api('/provider/application', { token: providerSession.accessToken });
  assert.equal(approvedApplication.status, 'approved');
  const approvedPage = await approvedContext.newPage();
  approvedPage.on('response', (response) => {
    const path = new URL(response.url()).pathname;
    if (path.startsWith('/api/v1/')) record(response.request().method(), path, response.status());
  });
  await approvedPage.goto(`${base}/provider-application/approved?lang=en`, { waitUntil: 'networkidle' });
  const approvedReview = approvedPage.getByTestId('provider-review');
  await expect(approvedReview).toBeVisible();
  await expect(approvedReview).toHaveAttribute('data-state', 'ready', { timeout: 10_000 });
  const approvedHeadings = await approvedReview.locator('h1').allTextContents();
  assert.ok(approvedHeadings.includes('Your account is approved'), `Unexpected approved headings: ${JSON.stringify(approvedHeadings)}`);
  await expect(approvedPage.getByTestId('provider-review-dashboard')).toBeVisible();
  evidence.browser.push({ stage: 'approved', width: await approvedPage.evaluate(() => innerWidth), overflow: await approvedPage.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1) });
  assert.ok(evidence.browser.every((item) => item.overflow === undefined
    ? item.routeChecks?.every(route => route.scrollWidth <= route.innerWidth + 1)
    : item.overflow === false));
  evidence.transitions.push('provider_reauthenticated_as_verified', 'browser_approved_state_and_dashboard_action_visible');
  await captureBrowserStage(approvedContext, 'approved_responsive', ['/provider-application/approved']);

  const objectId = new mongoose.Types.ObjectId(applicationId);
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const [storedApplication, storedUser, storedProfile, storedDocuments, transitions, audits] = await Promise.all([
    mongo.collection('provider_applications').findOne({ _id: objectId }),
    mongo.collection('users').findOne({ _id: userObjectId }),
    mongo.collection('provider_profiles').findOne({ userId: userObjectId }),
    mongo.collection('provider_documents').find({ applicationId: objectId, active: true }).toArray(),
    mongo.collection('account_state_transitions').find({ providerApplicationId: objectId }).sort({ createdAt: 1 }).toArray(),
    mongo.collection('audit_logs').find({ targetType: 'provider_application', targetId: applicationId }).sort({ createdAt: 1 }).toArray()
  ]);
  assert.equal(storedApplication?.status, 'approved');
  assert.equal(storedUser?.status, 'verified');
  assert.equal(storedProfile?.status, 'approved');
  assert.equal(storedDocuments.length, requiredDocuments.length);
  assert.deepEqual(transitions.map((item) => item.action), ['needs_information', 'verify']);
  assert.deepEqual(audits.map((item) => item.action), ['provider.needs_information', 'provider.verify']);
  assert.ok(audits.every((item) => typeof item.reason === 'string' && item.reason.length >= 3));
  evidence.mongo = {
    collections: ['users', 'provider_profiles', 'provider_applications', 'provider_documents', 'account_state_transitions', 'audit_logs'],
    finalStates: { account: storedUser.status, profile: storedProfile.status, application: storedApplication.status },
    activeDocumentCount: storedDocuments.length,
    transitionActions: transitions.map((item) => item.action),
    auditActions: audits.map((item) => item.action),
    atomicStateCoherence: storedUser.status === 'verified' && storedProfile.status === 'approved' && storedApplication.status === 'approved'
  };
  evidence.authorization.push('provider_sessions_revoked_after_each_admin_decision', 'provider_reauthentication_reflects_authoritative_status');
  evidence.status = 'PASS_LOCAL';
  evidence.remaining = ['Run the same provider registration and review lifecycle on Production after deployment.'];

  await approvedContext.close();
  await revisionContext.close();
  await adminContext.close();
  await providerContext.close();
} catch (error) {
  evidence.status = 'FAIL_LOCAL';
  evidence.failure = error instanceof Error ? error.message.slice(0, 700) : 'Unknown failure';
  process.exitCode = 1;
} finally {
  await browser.close();
  try {
    const sessionObjectIds = [...sessionIds].map(id => new mongoose.Types.ObjectId(id));
    if (applicationId && userId) {
      const applicationObjectId = new mongoose.Types.ObjectId(applicationId);
      const userObjectId = new mongoose.Types.ObjectId(userId);
      const documents = await mongo.collection('provider_documents').find({ applicationId: applicationObjectId }, { projection: { storageKey: 1 } }).toArray();
      const storageRoot = path.resolve(env.PRIVATE_STORAGE_LOCAL_ROOT?.trim() || path.join(os.tmpdir(), 'sadat-real-estate-private-storage'));
      for (const document of documents) {
        assert.match(document.storageKey, /^quarantine\/[a-f0-9]{32}$/u);
        const target = path.resolve(storageRoot, document.storageKey);
        assert.ok(target.startsWith(`${storageRoot}${path.sep}`));
        await rm(target, { force: true });
      }
      await Promise.all([
        mongo.collection('account_state_transitions').deleteMany({ providerApplicationId: applicationObjectId }),
        mongo.collection('audit_logs').deleteMany({ targetType: 'provider_application', targetId: applicationId }),
        mongo.collection('provider_documents').deleteMany({ applicationId: applicationObjectId }),
        mongo.collection('provider_applications').deleteMany({ _id: applicationObjectId, userId: userObjectId }),
        mongo.collection('provider_profiles').deleteMany({ userId: userObjectId }),
        mongo.collection('admin_credentials').deleteMany({ userId: userObjectId }),
        mongo.collection('otp_challenges').deleteMany({ normalizedEmail: email }),
        mongo.collection('sessions').deleteMany({ $or: [{ userId: userObjectId }, { _id: { $in: sessionObjectIds } }] }),
        mongo.collection('users').deleteMany({ _id: userObjectId, normalizedEmail: email })
      ]);
      const residue = await Promise.all([
        mongo.collection('users').countDocuments({ _id: userObjectId }),
        mongo.collection('provider_profiles').countDocuments({ userId: userObjectId }),
        mongo.collection('provider_applications').countDocuments({ _id: applicationObjectId }),
        mongo.collection('provider_documents').countDocuments({ applicationId: applicationObjectId }),
        mongo.collection('admin_credentials').countDocuments({ userId: userObjectId }),
        mongo.collection('sessions').countDocuments({ $or: [{ userId: userObjectId }, { _id: { $in: sessionObjectIds } }] }),
        mongo.collection('otp_challenges').countDocuments({ normalizedEmail: email }),
        mongo.collection('account_state_transitions').countDocuments({ providerApplicationId: applicationObjectId }),
        mongo.collection('audit_logs').countDocuments({ targetType: 'provider_application', targetId: applicationId })
      ]);
      assert.ok(residue.every(count => count === 0), `Provider journey cleanup residue: ${residue.join(',')}`);
      evidence.cleanup = true;
      evidence.cleanupCollections = ['users', 'provider_profiles', 'provider_applications', 'provider_documents', 'admin_credentials', 'sessions', 'otp_challenges', 'account_state_transitions', 'audit_logs'];
    }
  } catch (error) {
    evidence.status = 'FAIL_LOCAL';
    evidence.cleanupFailure = error instanceof Error ? error.message.slice(0, 700) : String(error).slice(0, 700);
    process.exitCode = 1;
  }
  await mongo.close();
  evidence.finishedAt = new Date().toISOString();
  await mkdir('docs/quality/guide-runs', { recursive: true });
  await writeFile('docs/quality/guide-runs/provider-registration-local-latest.json', `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(`PROVIDER_REGISTRATION_LOCAL_${evidence.status}`);
}
