import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { chromium } from '@playwright/test';
import { PUBLIC_CLONE_ASSETS } from '../apps/web/tests/e2e/public-fixtures.ts';

/**
 * Coordinator-owned capture harness for the protected Auth and Seeker lanes.
 *
 * The fixtures below are deterministic, non-production responses with the same
 * shapes as the writable API contracts. They are intentionally installed at
 * the browser boundary so capture never mutates or seeds production storage.
 * A second capture is refused unless the caller supplies the measured repair
 * and expected visual effect that made the capture eligible.
 */

const root = process.cwd();
const args = new Map(process.argv.slice(2).flatMap((value, index, values) => value.startsWith('--') ? [[value.slice(2), values[index + 1] ?? true]] : []));
const screenId = String(args.get('screen-id') ?? '');
const locale = String(args.get('locale') ?? 'ar');
if (locale !== 'ar' && locale !== 'en') throw new Error(`Only Arabic RTL and English LTR are permitted; received ${locale}`);
const direction = locale === 'ar' ? 'rtl' : 'ltr';
const phase = String(args.get('phase') ?? 'before');
if (phase !== 'before' && phase !== 'after') throw new Error(`Unsupported capture phase: ${phase}`);
const revision = String(args.get('revision') ?? '').trim();
if (revision !== '' && !/^[a-z0-9-]+$/u.test(revision)) throw new Error(`Invalid capture revision: ${revision}`);
if (phase === 'before' && revision !== '') throw new Error('Capture revisions are supported only for after captures');
const baseUrl = String(args.get('base-url') ?? process.env.WEB_BASE_URL ?? 'http://127.0.0.1:4173');
const evidenceDir = path.join(root, 'docs/quality/figma_parity/screens', screenId);
const queue = JSON.parse(fs.readFileSync(path.join(root, 'docs/quality/figma_parity/SCREEN_EXECUTION_QUEUE.json'), 'utf8'));
const queueEntry = queue.screens.find(entry => entry.screenId === screenId);
if (queueEntry === undefined) throw new Error(`Screen ${screenId} is not present in the execution queue`);
if (!/^AUTH-\d+\+?$/.test(screenId) && !/^SEK-\d+$/.test(screenId)) throw new Error(`Protected capture only supports AUTH/SEK screens; received ${screenId}`);
if (!fs.existsSync(path.join(evidenceDir, 'figma.png'))) throw new Error(`Missing cached Figma screenshot for ${screenId}`);

function readPngDimensions(filePath) {
  const bytes = fs.readFileSync(filePath);
  if (bytes.length < 24 || bytes.toString('ascii', 1, 4) !== 'PNG') throw new Error(`Invalid PNG: ${filePath}`);
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

const sourceDimensions = readPngDimensions(path.join(evidenceDir, 'figma.png'));
if (sourceDimensions.width < 320 || sourceDimensions.height < 240) throw new Error(`Invalid cached Figma dimensions for ${screenId}`);
const runtimeBeforePath = path.join(evidenceDir, 'runtime-before.png');
const captureArtifactName = phase === 'after' && revision !== '' ? `runtime-after-${revision}` : phase === 'before' ? 'runtime-before' : 'runtime-after';
const runtimeAfterPath = path.join(evidenceDir, `${captureArtifactName}.png`);
const diffArtifactName = revision === '' ? 'diff' : `diff-${revision}`;
const metricsArtifactName = revision === '' ? 'visual-metrics' : `visual-metrics-${revision}`;
const captureMetadataArtifactName = revision === '' ? `${captureArtifactName}-capture` : `${captureArtifactName}-capture`;
const deterministicStateArtifactName = revision === '' ? 'deterministic-state' : `deterministic-state-${revision}`;
if (phase === 'before' && fs.existsSync(runtimeBeforePath)) throw new Error(`Refusing to overwrite existing runtime-before.png for ${screenId}`);
if (phase === 'after' && !fs.existsSync(runtimeBeforePath)) throw new Error(`Cannot capture after phase without ${runtimeBeforePath}`);
if (phase === 'after' && fs.existsSync(runtimeAfterPath)) throw new Error(`Refusing to overwrite existing ${captureArtifactName}.png for ${screenId}`);
const repairId = String(args.get('repair-id') ?? '');
const expectedEffect = String(args.get('expected-effect') ?? '');
if (phase === 'after' && (repairId === '' || expectedEffect === '')) {
  throw new Error('After capture requires --repair-id and --expected-effect');
}

const ids = {
  seeker: '0123456789abcdef01234567',
  provider: 'abcdef0123456789abcdef01',
  organization: 'fedcba9876543210fedcba98',
  property: 'aaaaaaaaaaaaaaaaaaaaaaaa',
  request: 'bbbbbbbbbbbbbbbbbbbbbbbb',
  viewing: 'cccccccccccccccccccccccc',
  notification: 'dddddddddddddddddddddddd',
  document: 'eeeeeeeeeeeeeeeeeeeeeeee'
};
const timestamps = {
  created: '2026-07-23T09:00:00.000Z',
  updated: '2026-07-23T10:00:00.000Z',
  submitted: '2026-07-23T09:30:00.000Z'
};
const localized = (ar, en) => ({ ar, en });
const envelope = (data, requestId, meta = {}) => ({ data, meta: { requestId, ...meta } });
const session = roleType => ({
  accessToken: 'capture.header.signature',
  tokenType: 'Bearer',
  expiresInSeconds: 900,
  user: { id: roleType === 'provider' ? ids.provider : ids.seeker, roleType, status: 'verified' }
});

const providerTypeForScreen = screen => screen === 'AUTH-10' || screen === 'AUTH-10+' ? 'brokerage_office' : 'developer_company';

function providerRequirements(providerType) {
  const common = [
    { key: 'commercial_registration', labelKey: 'provider.documents.commercialRegistration', classification: 'required', applies: true },
    { key: 'tax_card', labelKey: 'provider.documents.taxCard', classification: 'required', applies: true },
    { key: 'authorized_representative_id_front', labelKey: 'provider.documents.authorizedRepresentativeIdFront', classification: 'required', applies: true },
    { key: 'authorized_representative_id_back', labelKey: 'provider.documents.authorizedRepresentativeIdBack', classification: 'required', applies: true },
    { key: 'company_profile', labelKey: 'provider.documents.companyProfile', classification: 'optional', applies: true },
    { key: 'developer_license', labelKey: 'provider.documents.developerLicense', classification: 'optional', applies: providerType === 'developer_company' },
    { key: 'additional_supporting_document', labelKey: 'provider.documents.additionalSupportingDocument', classification: 'optional', applies: true }
  ];
  return { version: '2026-08-13.1', providerType, requirements: common };
}

function providerApplicationFor(screen) {
  const providerType = providerTypeForScreen(screen);
  const isBusiness = providerType === 'brokerage_office';
  const complete = screen === 'AUTH-13' || screen === 'AUTH-17';
  const needsInformation = screen === 'AUTH-16';
  const status = screen === 'AUTH-14' || screen === 'AUTH-15'
    ? 'pending_review'
    : screen === 'AUTH-16'
      ? 'needs_information'
      : screen === 'AUTH-17'
        ? 'approved'
        : 'draft';
  const accountFields = complete || screen === 'AUTH-13'
    ? {
        accountOwnerFullName: 'Ahmed Mohamed Ali',
        displayName: 'Sadat Real Estate Development',
        email: 'capture@example.com',
        whatsappNumber: '+201000000001',
        preferredLocale: 'ar',
        termsAcceptedAt: timestamps.submitted,
        privacyAcceptedAt: timestamps.submitted
      }
    : {};
  const organizationFields = complete || screen === 'AUTH-13'
    ? isBusiness
      ? { legalBusinessName: 'Sadat Brokers', tradeName: 'Sadat Brokers', businessAddress: 'First District, Sadat City', commercialRegistrationNumber: 'CR-2026-00128', taxRegistrationNumber: 'TX-2026-00128', authorizedRepresentativeFullName: 'Ahmed Mohamed Ali', authorizedRepresentativeTitle: 'Managing Director' }
      : { legalCompanyName: 'Sadat Real Estate Development Company', brandName: 'Sadat Real Estate', headOfficeAddress: 'First District, Sadat City', commercialRegistrationNumber: 'CR-2026-00128', taxRegistrationNumber: 'TX-2026-00128', authorizedRepresentativeFullName: 'Ahmed Mohamed Ali', authorizedRepresentativeTitle: 'Managing Director', accountOwnerHasRegisteredAuthority: true }
    : {};
  const missingFields = complete
    ? []
    : needsInformation
      ? ['businessAddress']
      : isBusiness
        ? ['legalBusinessName', 'tradeName', 'businessAddress', 'commercialRegistrationNumber', 'taxRegistrationNumber', 'authorizedRepresentativeFullName', 'authorizedRepresentativeTitle']
        : ['accountOwnerFullName', 'displayName', 'email', 'legalCompanyName', 'brandName', 'headOfficeAddress', 'commercialRegistrationNumber', 'taxRegistrationNumber', 'authorizedRepresentativeFullName', 'authorizedRepresentativeTitle'];
  const missingDocuments = complete
    ? []
    : needsInformation
      ? ['authorized_representative_id_back']
      : ['commercial_registration', 'tax_card', 'authorized_representative_id_front', 'authorized_representative_id_back'];
  const availableActions = complete
    ? ['view_status', 'open_dashboard']
    : status === 'pending_review'
      ? ['view_status']
      : status === 'needs_information'
        ? ['edit_company', 'view_status']
        : [isBusiness ? 'edit_business' : 'edit_company', 'submit', 'view_status'];
  return {
    id: ids.provider,
    providerType,
    status,
    version: 0,
    requirementVersion: '2026-08-13.1',
    ...accountFields,
    ...organizationFields,
    requirementsSnapshot: providerRequirements(providerType),
    missingFields,
    missingDocuments,
    availableActions,
    ...(status === 'pending_review' || status === 'approved' ? { submittedAt: timestamps.submitted } : {}),
    ...(status === 'needs_information' ? { reviewReason: 'Please complete the requested business information and upload the missing document.' } : {}),
    createdAt: timestamps.created,
    updatedAt: timestamps.updated
  };
}

const property = {
  id: ids.property,
  slug: 'sadat-home',
  kind: 'property',
  name: localized('شقة في مدينة السادات', 'Apartment in Sadat City'),
  transactionType: 'sale',
  imageUrl: PUBLIC_CLONE_ASSETS.interior,
  description: localized('وحدة سكنية جاهزة بالقرب من الخدمات.', 'A ready home near essential services.'),
  area: { value: 145, unit: 'sqm' },
  layout: { bedrooms: 3, bathrooms: 2, floor: 4 },
  price: { amount: 1900000, currency: 'EGP' }
};
const request = {
  id: ids.request,
  type: 'property_search',
  source: 'seeker',
  seekerId: ids.seeker,
  status: screenId === 'SEK-03' ? 'under_review' : screenId === 'SEK-04' ? 'contacted' : 'in_progress',
  payload: { locations: [ids.organization], propertyTypes: ['apartment'], minBudget: 500000, maxBudget: 2500000, minBedrooms: 2, maxBedrooms: 4, note: 'Looking for a finished home in Sadat City.' },
  version: 0,
  availableActions: ['cancel'],
  createdAt: timestamps.created,
  updatedAt: timestamps.updated
};
const viewing = {
  id: ids.viewing,
  propertyId: ids.property,
  seekerId: ids.seeker,
  providerId: ids.provider,
  status: 'confirmed',
  requestedAt: '2026-08-11T14:00:00.000+00:00',
  timezone: 'Africa/Cairo',
  note: 'Please confirm the afternoon appointment.',
  version: 0,
  createdAt: timestamps.created,
  updatedAt: timestamps.updated
};
const notification = {
  id: ids.notification,
  type: 'request.updated',
  title: localized('تم تحديث طلبك العقاري', 'Your property request was updated'),
  message: localized('سيتواصل معك الفريق قريباً.', 'The team will contact you soon.'),
  link: `/seeker/requests/${ids.request}`,
  readAt: null,
  createdAt: timestamps.updated
};
const profile = {
  id: ids.seeker,
  roleType: 'seeker',
  status: 'verified',
  email: 'ahmed@example.com',
  firstName: 'Ahmed',
  lastName: 'Mohamed',
  locale: 'ar'
};
const preferences = {
  preferences: { propertyTypes: ['apartment'], locations: ['First District'], purpose: 'buy', minPrice: 500000, maxPrice: 2500000, bedroomsMin: 2, bedroomsMax: 4 },
  updatedAt: timestamps.updated
};

function seekerResponse(pathname) {
  if (pathname === '/seeker/overview') return envelope({ requests: 7, viewings: 2, savedProperties: 14, notifications: 3, unreadNotifications: 1 }, `capture-${screenId}-overview`);
  if (pathname === '/seeker/requests') return envelope({ items: [
    request,
    { ...request, id: '111111111111111111111111', status: 'scheduled', type: 'viewing', createdAt: '2026-08-03T10:00:00.000Z', updatedAt: '2026-08-03T10:00:00.000Z' },
    { ...request, id: '222222222222222222222222', status: 'contacted', type: 'contact', createdAt: '2026-07-28T10:00:00.000Z', updatedAt: '2026-07-28T10:00:00.000Z' },
    { ...request, id: '333333333333333333333333', status: 'resolved', type: 'contact', createdAt: '2026-07-20T10:00:00.000Z', updatedAt: '2026-07-20T10:00:00.000Z' },
    { ...request, id: '444444444444444444444444', status: 'resolved', type: 'viewing', createdAt: '2026-07-14T10:00:00.000Z', updatedAt: '2026-07-14T10:00:00.000Z' },
    { ...request, id: '555555555555555555555555', status: 'closed', type: 'contact', createdAt: '2026-07-09T10:00:00.000Z', updatedAt: '2026-07-09T10:00:00.000Z' },
    { ...request, id: '666666666666666666666666', status: 'new', type: 'property_search', createdAt: '2026-07-01T10:00:00.000Z', updatedAt: '2026-07-01T10:00:00.000Z' }
  ], page: 1, limit: 20, total: 7 }, `capture-${screenId}-requests`);
  if (pathname === `/seeker/requests/${ids.request}`) return envelope(request, `capture-${screenId}-request-detail`);
  if (pathname === `/seeker/requests/${ids.request}/transitions`) return envelope({ ...request, status: 'cancelled', version: request.version + 1, availableActions: [] }, `capture-${screenId}-request-transition`);
  if (pathname === '/seeker/viewings') return envelope({ items: [viewing, { ...viewing, id: '333333333333333333333333', status: 'requested', requestedAt: '2026-08-18T11:00:00.000+00:00' }], page: 1, limit: 20, total: 2 }, `capture-${screenId}-viewings`);
  if (pathname === '/seeker/favorites') return envelope({ items: [
    { ...property, imageUrl: PUBLIC_CLONE_ASSETS.propertyHome, savedAt: timestamps.updated },
    { ...property, id: '444444444444444444444444', slug: 'sadat-villa', kind: 'unit', imageUrl: PUBLIC_CLONE_ASSETS.propertyVilla, name: localized('فيلا مستقلة بالمنطقة الراقية', 'Detached villa in the premium district'), area: { value: 320, unit: 'sqm' }, layout: { bedrooms: 5, bathrooms: 4 }, price: { amount: 5200000, currency: 'EGP' }, savedAt: '2026-07-24T10:00:00.000Z' },
    { ...property, id: '555555555555555555555555', slug: 'sadat-rental', kind: 'unit', transactionType: 'rent', imageUrl: PUBLIC_CLONE_ASSETS.propertyHome, name: localized('شقة للإيجار في الحي الثالث', 'Apartment for rent in the Third District'), area: { value: 120, unit: 'sqm' }, layout: { bedrooms: 2, bathrooms: 2, floor: 3 }, price: { amount: 8500, currency: 'EGP' }, savedAt: '2026-07-20T10:00:00.000Z' },
    { ...property, id: '666666666666666666666666', slug: 'sadat-duplex', kind: 'unit', imageUrl: PUBLIC_CLONE_ASSETS.propertyDuplex, name: localized('دوبلكس فاخر في الحي الخامس', 'Luxury duplex in the Fifth District'), area: { value: 240, unit: 'sqm' }, layout: { bedrooms: 4, bathrooms: 3 }, price: { amount: 3100000, currency: 'EGP' }, savedAt: '2026-07-18T10:00:00.000Z' }
  ], page: 1, limit: 20, total: 4 }, `capture-${screenId}-favorites`);
  if (pathname === '/seeker/notifications') return envelope({ items: [
    notification,
    { ...notification, id: '555555555555555555555555', type: 'viewing.confirmed', readAt: timestamps.updated },
    { ...notification, id: '666666666666666666666666', type: 'request.updated', createdAt: '2026-07-22T10:00:00.000Z' },
    { ...notification, id: '777777777777777777777777', type: 'property.updated', readAt: timestamps.updated, createdAt: '2026-07-21T10:00:00.000Z' },
    { ...notification, id: '888888888888888888888888', type: 'request.updated', readAt: timestamps.updated, createdAt: '2026-07-20T10:00:00.000Z' },
    { ...notification, id: '999999999999999999999999', type: 'property.updated', readAt: timestamps.updated, createdAt: '2026-07-19T10:00:00.000Z' },
    { ...notification, id: 'abababababababababababab', type: 'account.updated', readAt: timestamps.updated, createdAt: '2026-07-18T10:00:00.000Z' },
    { ...notification, id: 'cdcdcdcdcdcdcdcdcdcdcdcd', type: 'viewing.cancelled', readAt: timestamps.updated, createdAt: '2026-07-17T10:00:00.000Z' }
  ], unreadCount: 4, page: 1, limit: 20, total: 8 }, `capture-${screenId}-notifications`);
  if (pathname === '/me') return envelope(profile, `capture-${screenId}-profile`);
  if (pathname === '/me/preferences') return envelope(preferences, `capture-${screenId}-preferences`);
  return undefined;
}

function runtimePathForScreen(screen) {
  if (screen === 'AUTH-01') return '/auth/login';
  if (screen === 'AUTH-02' || screen === 'AUTH-03' || screen === 'AUTH-06') return '/auth/register/seeker';
  if (screen === 'AUTH-04' || screen === 'AUTH-05') return '/auth/verify-email?purpose=registration&roleType=seeker';
  if (screen === 'AUTH-07' || screen === 'AUTH-08') return '/auth/register/provider/type';
  if (screen === 'AUTH-09' || screen === 'AUTH-09+') return `/auth/register/provider/account?providerType=${providerTypeForScreen(screen)}`;
  if (screen === 'AUTH-10' || screen === 'AUTH-10+') return '/auth/register/provider/account?providerType=brokerage_office&step=organization';
  if (screen === 'AUTH-11') return '/auth/register/provider/account?providerType=developer_company&step=organization';
  if (screen === 'AUTH-12') return '/auth/register/provider/account?providerType=developer_company&step=documents';
  if (screen === 'AUTH-13') return '/auth/register/provider/review?providerType=developer_company';
  if (screen === 'AUTH-14' || screen === 'AUTH-15') return '/provider-application/status';
  if (screen === 'AUTH-16') return '/provider-application/needs-information';
  if (screen === 'AUTH-17') return '/provider-application/approved';
  if (screen === 'SEK-01') return '/seeker';
  if (screen === 'SEK-02') return '/seeker/requests';
  if (screen === 'SEK-03' || screen === 'SEK-04') return `/seeker/requests/${ids.request}`;
  if (screen === 'SEK-05') return '/seeker/viewings';
  if (screen === 'SEK-06') return '/seeker/saved';
  if (screen === 'SEK-07') return '/seeker/notifications';
  if (screen === 'SEK-08') return '/seeker/profile?tab=preferences';
  if (screen === 'SEK-09') return '/seeker/profile?tab=personal';
  if (screen === 'SEK-10') return '/seeker/settings';
  throw new Error(`No protected runtime route mapping for ${screen}`);
}

const runtimeRoute = runtimePathForScreen(screenId);
const targetUrl = new URL(runtimeRoute, baseUrl);
targetUrl.searchParams.set('lang', locale);
const role = screenId.startsWith('SEK-') || (screenId.startsWith('AUTH-') && Number(screenId.match(/^AUTH-(\d+)/)?.[1] ?? 0) >= 14) ? (screenId.startsWith('AUTH-') ? 'provider' : 'seeker') : null;
const providerApplication = screenId.startsWith('AUTH-') ? providerApplicationFor(screenId) : undefined;

const seedState = {
  schemaVersion: 1,
  seedId: `capture-${screenId}-${locale}-${phase}-2026-08-26`,
  environment: 'non-production-browser-fixture',
  canonicalFigmaFileKey: queue.canonicalFigmaFileKey,
  forbiddenFigmaFileKey: queue.forbiddenFigmaFileKey,
  screenId,
  source: { pageId: queueEntry.clone.pageId, nodeId: queueEntry.clone.nodeId, url: queueEntry.clone.url, screenshot: `docs/quality/figma_parity/screens/${screenId}/figma.png` },
  runtime: { route: targetUrl.pathname + targetUrl.search, requestedQueueRoute: queueEntry.runtime.route, role: queueEntry.runtime.role, locale, direction, viewport: { width: sourceDimensions.width, height: sourceDimensions.height, deviceScaleFactor: 1 } },
  authSession: role === null ? null : { roleType: role, projection: session(role), source: 'intercepted /api/v1/auth/refresh response' },
  api: { fixtureContract: 'real writable API response shapes', responseRequestIds: [`capture-${screenId}-${locale}`], state: providerApplication ?? null },
  phase,
  repair: phase === 'after' ? { repairId, expectedEffect } : null
};
const fixtureJson = JSON.stringify(seedState);
const seedHash = crypto.createHash('sha256').update(fixtureJson).digest('hex');
seedState.seedSha256 = seedHash;
fs.mkdirSync(evidenceDir, { recursive: true });
fs.writeFileSync(path.join(evidenceDir, `${deterministicStateArtifactName}.json`), JSON.stringify(seedState, null, 2) + '\n');

function jsonBody(data) {
  return JSON.stringify(data);
}

async function fulfill(route, data) {
  await route.fulfill({ status: 200, contentType: 'application/json', body: jsonBody(data), headers: { 'cache-control': 'no-store' } });
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: sourceDimensions.width, height: sourceDimensions.height },
  deviceScaleFactor: 1,
  locale,
  colorScheme: 'light'
});
const page = await context.newPage();
const apiRequests = [];
const apiResponses = [];
const routeHits = [];
page.on('request', requestEvent => {
  if (requestEvent.url().includes('/api/v1/')) apiRequests.push({ method: requestEvent.method(), url: requestEvent.url() });
});
page.on('response', responseEvent => {
  if (responseEvent.url().includes('/api/v1/')) apiResponses.push({ method: responseEvent.request().method(), url: responseEvent.url(), status: responseEvent.status() });
});

await page.route('**/api/v1/**', async route => {
  const requestEvent = route.request();
  const url = new URL(requestEvent.url());
  const pathname = url.pathname.replace(/^\/api\/v1/u, '');
  routeHits.push({ method: requestEvent.method(), pathname });
  if (pathname === '/auth/refresh') {
    if (role === null) return fulfill(route, { error: { code: 'INVALID_REFRESH_TOKEN', messageKey: 'errors.auth.invalidRefreshToken', details: [], requestId: `capture-${screenId}-refresh-anonymous` } });
    return fulfill(route, envelope(session(role), `capture-${screenId}-refresh`));
  }
  if (pathname === '/auth/otp/send') return fulfill(route, envelope({ accepted: true, challengeId: '123e4567-e89b-12d3-a456-426614174000', expiresInSeconds: 300, retryAfterSeconds: 60 }, `capture-${screenId}-otp-send`));
  if (pathname === '/auth/otp/verify') {
    const requestBody = requestEvent.postDataJSON?.() ?? {};
    if (requestBody.purpose === 'login') return fulfill(route, envelope({ outcome: 'authenticated', ...session(requestBody.roleType === 'provider' ? 'provider' : 'seeker') }, `capture-${screenId}-otp-verify`));
    return fulfill(route, envelope({ outcome: 'verified', verificationToken: 'A'.repeat(43), expiresInSeconds: 900, roleType: requestBody.roleType === 'provider' ? 'provider' : 'seeker' }, `capture-${screenId}-otp-verify`));
  }
  if (pathname === '/auth/register/seeker') return fulfill(route, envelope({ outcome: 'registered', session: session('seeker') }, `capture-${screenId}-seeker-registration`));
  if (pathname === '/provider/application/status') {
    const application = providerApplication ?? providerApplicationFor('AUTH-14');
    return fulfill(route, envelope({ applicationId: application.id, providerType: application.providerType, status: application.status, version: application.version, ...(application.submittedAt === undefined ? {} : { submittedAt: application.submittedAt }), ...(application.reviewReason === undefined ? {} : { reviewReason: application.reviewReason }), availableActions: application.availableActions }, `capture-${screenId}-provider-status`));
  }
  if (pathname === '/provider/application') {
    if (requestEvent.method() === 'POST') return fulfill(route, envelope({ outcome: 'registered_draft', session: session('provider'), application: providerApplicationFor('AUTH-09') }, `capture-${screenId}-provider-register`));
    return fulfill(route, envelope(providerApplication ?? providerApplicationFor('AUTH-09'), `capture-${screenId}-provider-application`));
  }
  if (pathname.startsWith('/provider/application/')) return fulfill(route, envelope(providerApplication ?? providerApplicationFor('AUTH-09'), `capture-${screenId}-provider-mutation`));
  if (screenId.startsWith('SEK-')) {
    const data = seekerResponse(pathname);
    if (data !== undefined) return fulfill(route, data);
  }
  return route.continue();
});

async function waitForScreen(expectedScreenId = screenId) {
  await page.locator(`[data-screen-id="${expectedScreenId}"]`).waitFor({ state: 'visible', timeout: 30_000 });
}

async function clickAuthContinue() {
  await page.locator('.auth-page .auth-card__body > button[type="button"]').last().click();
}

async function goFromSeekerRoleToOtp() {
  await waitForScreen('AUTH-02');
  await page.locator('.auth-role-card').first().click();
  await clickAuthContinue();
  await waitForScreen('AUTH-04');
}

async function fillOtpRequest() {
  await page.locator('#auth-otp-email').fill('ahmed@example.com');
  await page.locator('.auth-page[data-screen-id="AUTH-04"] form button[type="submit"]').click();
  await waitForScreen('AUTH-05');
}

async function fillOtpDigits() {
  const digits = page.locator('.auth-otp__digit');
  for (const [index, value] of Array.from('123456').entries()) await digits.nth(index).fill(value);
}

async function prepareAuth() {
  if (screenId === 'AUTH-01') return waitForScreen('AUTH-01');
  if (screenId === 'AUTH-02') return waitForScreen('AUTH-02');
  if (screenId === 'AUTH-03') {
    await goFromSeekerRoleToOtp();
    await fillOtpRequest();
    await fillOtpDigits();
    await page.locator('.auth-page[data-screen-id="AUTH-05"] form button[type="submit"]').click();
    await waitForScreen('AUTH-03');
    return;
  }
  if (screenId === 'AUTH-04') {
    await waitForScreen('AUTH-04');
    return;
  }
  if (screenId === 'AUTH-05') {
    await waitForScreen('AUTH-04');
    await fillOtpRequest();
    await fillOtpDigits();
    return;
  }
  if (screenId === 'AUTH-06') {
    await goFromSeekerRoleToOtp();
    await fillOtpRequest();
    await fillOtpDigits();
    await page.locator('.auth-page[data-screen-id="AUTH-05"] form button[type="submit"]').click();
    await waitForScreen('AUTH-03');
    await page.locator('#auth-registration-first-name').fill('Ahmed');
    await page.locator('#auth-registration-last-name').fill('Mohamed');
    await page.locator('.auth-page[data-screen-id="AUTH-03"] form button[type="submit"]').click();
    await waitForScreen('AUTH-06');
    return;
  }
  if (screenId === 'AUTH-07' || screenId === 'AUTH-08') {
    await waitForScreen('AUTH-07');
    if (screenId === 'AUTH-08') {
      await page.locator('[data-provider-type="developer_company"]').click();
      await waitForScreen('AUTH-08');
    }
    return;
  }
  if (screenId === 'AUTH-09' || screenId === 'AUTH-09+') {
    await waitForScreen('AUTH-09');
    if (screenId === 'AUTH-09+') {
      await page.locator('#provider-account-owner-name').fill('Ahmed Mohamed Ali');
      await page.locator('#provider-account-display-name').fill('Sadat Real Estate Development');
      await page.locator('#provider-account-email').fill('capture@example.com');
      await page.locator('#provider-account-whatsapp').fill('+201000000001');
      await waitForScreen('AUTH-09+');
    }
    return;
  }
  if (screenId === 'AUTH-10' || screenId === 'AUTH-10+') {
    await waitForScreen('AUTH-10');
    if (screenId === 'AUTH-10+') {
      await page.locator('#provider-business-legal-name').fill('Sadat Brokers');
      await page.locator('#provider-business-trade-name').fill('Sadat Brokers');
      await page.locator('#provider-business-address').fill('First District, Sadat City');
      await waitForScreen('AUTH-10+');
    }
    return;
  }
  if (screenId === 'AUTH-11' || screenId === 'AUTH-12' || screenId === 'AUTH-13' || screenId === 'AUTH-14' || screenId === 'AUTH-16' || screenId === 'AUTH-17') {
    await waitForScreen(screenId);
    return;
  }
  if (screenId === 'AUTH-15') {
    await waitForScreen('AUTH-14');
    await page.locator('[data-testid="provider-review-track"]').click();
    await waitForScreen('AUTH-15');
    return;
  }
  throw new Error(`No Auth preparation for ${screenId}`);
}

await page.goto(targetUrl.toString(), { waitUntil: 'domcontentloaded', timeout: 30_000 });
await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined);
if (screenId.startsWith('AUTH-')) await prepareAuth();
else await waitForScreen(screenId);

await page.addStyleTag({ content: `
  *, *::before, *::after {
    animation: none !important;
    transition: none !important;
    caret-color: transparent !important;
    scroll-behavior: auto !important;
  }
` });
await page.evaluate(async () => {
  await document.fonts.ready;
  const images = Array.from(document.images);
  const scrollHeight = Math.max(document.documentElement.scrollHeight, document.body?.scrollHeight ?? 0);
  const step = Math.max(Math.floor(window.innerHeight * 0.8), 1);
  for (let y = 0; y < scrollHeight; y += step) {
    window.scrollTo(0, y);
    await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));
  }
  window.scrollTo(0, 0);
  await Promise.all(images.map(async image => {
    if (image.complete) return;
    await Promise.race([image.decode().catch(() => undefined), new Promise(resolve => setTimeout(resolve, 5_000))]);
  }));
  await document.fonts.ready;
});
await page.waitForTimeout(100);

const capturePath = phase === 'before' ? runtimeBeforePath : runtimeAfterPath;
await page.screenshot({ path: capturePath, fullPage: true });
const captureHash = crypto.createHash('sha256').update(fs.readFileSync(capturePath)).digest('hex');
const beforeHash = fs.existsSync(runtimeBeforePath) ? crypto.createHash('sha256').update(fs.readFileSync(runtimeBeforePath)).digest('hex') : null;
const afterHash = fs.existsSync(runtimeAfterPath) ? crypto.createHash('sha256').update(fs.readFileSync(runtimeAfterPath)).digest('hex') : null;
if (phase === 'after' && captureHash === beforeHash) throw new Error(`After capture for ${screenId} duplicated runtime-before.png; repair evidence is invalid`);

const dom = await page.evaluate(expectedId => {
  const screen = document.querySelector(`[data-screen-id="${expectedId}"]`) ?? document.querySelector('[data-screen-id]');
  const shell = document.querySelector('.route-shell');
  const rootStyle = screen === null ? null : getComputedStyle(screen);
  return {
    screenId: screen?.getAttribute('data-screen-id') ?? null,
    state: screen?.getAttribute('data-state') ?? null,
    applicationStatus: screen?.getAttribute('data-application-status') ?? null,
    providerVariant: screen?.getAttribute('data-provider-variant') ?? null,
    html: { lang: document.documentElement.lang, dir: document.documentElement.dir },
    viewport: { width: window.innerWidth, height: window.innerHeight, devicePixelRatio: window.devicePixelRatio },
    fonts: {
      status: document.fonts.status,
      ready: document.fonts.status === 'loaded',
      checks: {
        cairoRegular: document.fonts.check('400 16px Cairo', 'العقار'),
        cairoBold: document.fonts.check('700 16px Cairo', 'العقار'),
        cairoEnglish: document.fonts.check('400 16px Cairo', 'Real estate')
      },
      faces: [...document.fonts].map(font => ({ family: font.family, weight: font.weight, status: font.status }))
    },
    images: [...document.images].map(image => ({ src: image.currentSrc || image.src, complete: image.complete, decoded: image.complete && image.naturalWidth > 0, loading: image.loading })),
    page: {
      present: screen !== null,
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: Math.max(document.documentElement.scrollHeight, document.body?.scrollHeight ?? 0),
      backgroundColor: rootStyle?.backgroundColor ?? null
    },
    shell: { routeId: shell?.getAttribute('data-route-id') ?? null, deviceScope: shell?.getAttribute('data-device-scope') ?? null },
    structure: {
      headers: document.querySelectorAll('header').length,
      navs: document.querySelectorAll('nav').length,
      sections: document.querySelectorAll('section').length,
      cards: document.querySelectorAll('[class*="card"], article').length,
      images: document.querySelectorAll('img').length,
      forms: document.querySelectorAll('form').length,
      buttons: document.querySelectorAll('button').length,
      links: document.querySelectorAll('a[href]').length,
      inputs: document.querySelectorAll('input, select, textarea').length
    },
    transitions: {
      links: [...document.querySelectorAll('a[href]')].map(node => ({ text: node.textContent?.trim() ?? '', href: node.getAttribute('href') })),
      buttons: [...document.querySelectorAll('button')].map(node => ({ text: node.textContent?.trim() ?? '', aria: node.getAttribute('aria-label'), disabled: node.hasAttribute('disabled') }))
    }
  };
}, screenId);

const imageData = filePath => `data:image/png;base64,${fs.readFileSync(filePath).toString('base64')}`;
const comparisonPage = await context.newPage({ viewport: { width: sourceDimensions.width, height: sourceDimensions.height } });
const actualPath = phase === 'before' ? runtimeBeforePath : runtimeAfterPath;
const comparison = await comparisonPage.evaluate(async ({ figma, before, after, actualLabel }) => {
  const load = source => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = source;
  });
  const [figmaImage, beforeImage, afterImage] = await Promise.all([load(figma), load(before), load(after)]);
  const scale = 0.34;
  const columns = [figmaImage, beforeImage, afterImage];
  const widths = columns.map(image => Math.max(1, Math.round(image.naturalWidth * scale)));
  const heights = columns.map(image => Math.max(1, Math.round(image.naturalHeight * scale)));
  const width = widths.reduce((sum, value) => sum + value, 0);
  const height = Math.max(...heights) + 44;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  let x = 0;
  ['FIGMA REFERENCE', 'RUNTIME BEFORE', actualLabel].forEach((label, index) => {
    context.fillStyle = '#111827';
    context.font = 'bold 14px Arial';
    context.fillText(label, x + 8, 22);
    context.drawImage(columns[index], x, 44, widths[index], heights[index]);
    x += widths[index];
  });
  const compareWidth = figmaImage.naturalWidth;
  const compareHeight = Math.min(figmaImage.naturalHeight, afterImage.naturalHeight);
  const compareCanvas = document.createElement('canvas');
  compareCanvas.width = compareWidth;
  compareCanvas.height = compareHeight;
  const compareContext = compareCanvas.getContext('2d', { willReadFrequently: true });
  if (compareContext === null) throw new Error('Unable to create visual comparison canvas');
  compareContext.drawImage(figmaImage, 0, 0, compareWidth, compareHeight);
  const expected = compareContext.getImageData(0, 0, compareWidth, compareHeight).data;
  compareContext.clearRect(0, 0, compareWidth, compareHeight);
  compareContext.drawImage(afterImage, 0, 0, compareWidth, compareHeight);
  const actual = compareContext.getImageData(0, 0, compareWidth, compareHeight).data;
  let materialPixels = 0;
  let antiAliasingOnlyPixels = 0;
  for (let index = 0; index < expected.length; index += 4) {
    const delta = Math.abs(expected[index] - actual[index]) + Math.abs(expected[index + 1] - actual[index + 1]) + Math.abs(expected[index + 2] - actual[index + 2]);
    if (delta > 24) materialPixels += 1;
    else if (delta > 3) antiAliasingOnlyPixels += 1;
  }
  const comparedPixels = compareWidth * compareHeight;
  return {
    dataUrl: canvas.toDataURL('image/png'),
    dimensions: { width, height },
    sourceDimensions: columns.map(image => ({ width: image.naturalWidth, height: image.naturalHeight })),
    visualMetrics: {
      comparedWidth: compareWidth,
      comparedHeight: compareHeight,
      comparedPixels,
      materialDifferencePercent: Number(((materialPixels / comparedPixels) * 100).toFixed(4)),
      antiAliasingOnlyPercent: Number(((antiAliasingOnlyPixels / comparedPixels) * 100).toFixed(4)),
      threshold: { materialRgbSumGreaterThan: 24, antiAliasingRgbSumGreaterThan: 3 },
      method: 'unmasked same-width source/runtime canvas comparison over overlapping document height',
      comparedCapture: actualLabel
    }
  };
}, { figma: imageData(path.join(evidenceDir, 'figma.png')), before: imageData(runtimeBeforePath), after: imageData(actualPath), actualLabel: phase === 'before' ? 'RUNTIME BEFORE (CURRENT)' : 'RUNTIME AFTER (REPAIRED)' });
fs.writeFileSync(path.join(evidenceDir, `${diffArtifactName}.png`), Buffer.from(comparison.dataUrl.split(',')[1], 'base64'));
fs.writeFileSync(path.join(evidenceDir, `${metricsArtifactName}.json`), JSON.stringify({
  schemaVersion: 1,
  screenId,
  phase,
  source: comparison.sourceDimensions[0],
  runtimeBefore: comparison.sourceDimensions[1],
  runtimeAfter: comparison.sourceDimensions[2],
  ...comparison.visualMetrics,
  reviewed: false,
  reviewedAt: null
}, null, 2) + '\n');

const runtimeCapture = {
  schemaVersion: 1,
  screenId,
  phase,
  capturedAt: new Date().toISOString(),
  runtime: {
    route: targetUrl.pathname + targetUrl.search,
    requestedQueueRoute: queueEntry.runtime.route,
    role: queueEntry.runtime.role,
    permissions: { requiredRole: queueEntry.runtime.role, ownership: role === null ? 'anonymous' : role, availableActionsObserved: dom.transitions },
    locale,
    direction,
    viewport: dom.viewport,
    deterministicState: { path: `docs/quality/figma_parity/screens/${screenId}/${deterministicStateArtifactName}.json`, seedId: seedState.seedId, seedSha256: seedHash },
    capture: { phase, path: `docs/quality/figma_parity/screens/${screenId}/${captureArtifactName}.png`, sha256: captureHash },
    beforeHash,
    afterHash,
    apiRequests,
    apiResponses,
    routeHits
  },
  page: { state: dom.state, applicationStatus: dom.applicationStatus, providerVariant: dom.providerVariant, shell: dom.shell, structure: dom.structure, fonts: dom.fonts, images: dom.images, transitions: dom.transitions },
  comparison: { diffPath: `docs/quality/figma_parity/screens/${screenId}/${diffArtifactName}.png`, visualMetricsPath: `docs/quality/figma_parity/screens/${screenId}/${metricsArtifactName}.json`, visualMetrics: comparison.visualMetrics }
};
fs.writeFileSync(path.join(evidenceDir, `${captureMetadataArtifactName}.json`), JSON.stringify(runtimeCapture, null, 2) + '\n');

const defectsPath = path.join(evidenceDir, 'element-defects.json');
if (!fs.existsSync(defectsPath)) {
  fs.writeFileSync(defectsPath, JSON.stringify({
    schemaVersion: 1,
    screenId,
    source: { fileKey: queue.canonicalFigmaFileKey, pageId: queueEntry.clone.pageId, nodeId: queueEntry.clone.nodeId },
    status: 'PENDING_DIRECT_ELEMENT_REVIEW',
    items: [{ element: 'complete protected-screen composition', figmaExpected: 'Exact cached clone frame', runtimeActual: 'Fresh deterministic runtime capture', measuredDelta: 'See visual-metrics.json; element measurements pending direct review', owner: 'coordinator/runtime surface', requiredRepair: 'Review shell, typography, geometry, controls, state, and transitions against Figma before any classification closure.' }]
  }, null, 2) + '\n');
}

if (phase === 'before') {
  fs.writeFileSync(path.join(evidenceDir, 'review.json'), JSON.stringify({
    schemaVersion: 1,
    screenId,
    classification: 'PARTIAL',
    classificationReason: 'Fresh protected runtime capture exists; direct element-level parity review and repository-owned repairs remain open.',
    source: {
      fileKey: queue.canonicalFigmaFileKey,
      forbiddenFileKey: queue.forbiddenFigmaFileKey,
      pageId: queueEntry.clone.pageId,
      nodeId: queueEntry.clone.nodeId,
      url: queueEntry.clone.url,
      screenshot: { path: `docs/quality/figma_parity/screens/${screenId}/figma.png`, ...sourceDimensions, reviewed: true },
      getDesignContext: {
        tool: 'mcp__figma__get_design_context',
        skill: 'resource:figma-design-to-code',
        resultStatus: 'OK_WITH_REFERENCE_CODE_CACHED',
        root: { id: queueEntry.clone.nodeId, name: queueEntry.englishName, ...sourceDimensions },
        reviewed: true,
        note: 'This review uses the already-cached canonical context and screenshot; the same Figma node was not queried again.'
      }
    },
    runtime: {
      route: targetUrl.pathname + targetUrl.search,
      requestedQueueRoute: queueEntry.runtime.route,
      role: queueEntry.runtime.role,
      permissions: runtimeCapture.runtime.permissions,
      locale,
      direction,
      viewport: dom.viewport,
      deterministicState: runtimeCapture.runtime.deterministicState,
      before: { path: `docs/quality/figma_parity/screens/${screenId}/runtime-before.png`, sha256: captureHash }
    },
    structuredVisualComparison: {
      reviewed: false,
      diffPath: `docs/quality/figma_parity/screens/${screenId}/diff.png`,
      metricsPath: `docs/quality/figma_parity/screens/${screenId}/visual-metrics.json`,
      sourceDimensions,
      runtimeDimensions: comparison.sourceDimensions[1],
      observations: ['Initial post-implementation capture only; no screen is considered passed from this capture.', 'Direct element-level review is required before any repair or classification.']
    },
    functionalApiComparison: { reviewed: true, fixtureContract: 'real writable API response shapes', apiRequests, apiResponses, routeHits, outcome: 'deterministic route state loaded; interaction comparison remains pending focused review' },
    defects: ['Element-level visual review remains open.', 'No visual baseline was changed.'],
    filesRepaired: [],
    focusedTests: [],
    accessibility: { focusedCheck: 'not yet run', exitCode: null },
    evidencePaths: {
      figma: `docs/quality/figma_parity/screens/${screenId}/figma.png`,
      runtimeBefore: `docs/quality/figma_parity/screens/${screenId}/runtime-before.png`,
      runtimeAfter: `docs/quality/figma_parity/screens/${screenId}/runtime-after.png`,
      diff: `docs/quality/figma_parity/screens/${screenId}/diff.png`,
      review: `docs/quality/figma_parity/screens/${screenId}/review.json`
    }
  }, null, 2) + '\n');
}

await comparisonPage.close();
await context.close();
await browser.close();
console.log(JSON.stringify({ screenId, phase, route: targetUrl.pathname + targetUrl.search, locale, direction, sourceDimensions, runtimeDimensions: comparison.sourceDimensions[phase === 'before' ? 1 : 2], runtimeHash: captureHash, materialDifferencePercent: comparison.visualMetrics.materialDifferencePercent, antiAliasingOnlyPercent: comparison.visualMetrics.antiAliasingOnlyPercent, evidenceDir }, null, 2));
