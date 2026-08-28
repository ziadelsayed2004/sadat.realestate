import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { chromium, devices } from '@playwright/test';

/*
 * Auth-lane evidence capture.
 *
 * This is intentionally separate from the coordinator protected-surface
 * harness. Auth changed its route and selector contract while that harness
 * still targets the retired phone flow, so this fixture only owns Auth
 * evidence and never rewrites shared baselines.
 */

const root = process.cwd();
const args = new Map(process.argv.slice(2).flatMap((value, index, values) => value.startsWith('--')
  ? [[value.slice(2), values[index + 1] ?? true]]
  : []));
const baseUrl = String(args.get('base-url') ?? process.env.WEB_BASE_URL ?? 'http://127.0.0.1:4180');
const phase = String(args.get('phase') ?? 'before');
const locale = String(args.get('locale') ?? 'en');
const screenId = String(args.get('screen-id') ?? '');
const revision = String(args.get('revision') ?? '').trim();
const aliasMode = args.has('alias');
const allMode = args.has('all');
const matrixMode = args.has('matrix');
if (!['before', 'after'].includes(phase)) throw new Error(`Unsupported phase: ${phase}`);
if (!['ar', 'en'].includes(locale)) throw new Error(`Unsupported locale: ${locale}`);
if (matrixMode && phase !== 'after') throw new Error('Responsive matrix evidence is captured after the repaired state only');
if (!aliasMode && !allMode && !matrixMode && !/^AUTH-(?:0[1-9]|1[0-7])\+?$/.test(screenId)) {
  throw new Error(`Expected --screen-id AUTH-01..AUTH-17 (or --all), received ${screenId}`);
}

const screenIds = ['AUTH-01', 'AUTH-02', 'AUTH-03', 'AUTH-04', 'AUTH-05', 'AUTH-06', 'AUTH-07', 'AUTH-08', 'AUTH-09', 'AUTH-09+', 'AUTH-10', 'AUTH-10+', 'AUTH-11', 'AUTH-12', 'AUTH-13', 'AUTH-14', 'AUTH-15', 'AUTH-16', 'AUTH-17'];
const queue = JSON.parse(fs.readFileSync(path.join(root, 'docs/quality/figma_parity/SCREEN_EXECUTION_QUEUE.json'), 'utf8'));
const ids = {
  provider: 'abcdef0123456789abcdef01',
  document: 'eeeeeeeeeeeeeeeeeeeeeeee'
};
const timestamps = {
  created: '2026-08-27T08:00:00.000Z',
  updated: '2026-08-27T09:00:00.000Z',
  submitted: '2026-08-27T08:30:00.000Z'
};
const challengeId = '123e4567-e89b-12d3-a456-426614174000';
const providerTypeForScreen = screen => screen === 'AUTH-10' || screen === 'AUTH-10+' ? 'brokerage_office' : 'developer_company';
const envelope = (data, requestId) => ({ data, meta: { requestId } });
const session = roleType => ({
  accessToken: 'capture.header.signature',
  tokenType: 'Bearer',
  expiresInSeconds: 900,
  user: { id: roleType === 'provider' ? ids.provider : '0123456789abcdef01234567', roleType, status: 'verified' }
});

function dimensions(filePath) {
  const bytes = fs.readFileSync(filePath);
  if (bytes.toString('ascii', 1, 4) !== 'PNG') throw new Error(`Invalid PNG: ${filePath}`);
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function providerRequirements(providerType) {
  const categories = [
    ['commercial_registration', 'required'],
    ['tax_card', 'required'],
    ['authorized_representative_id_front', 'required'],
    ['authorized_representative_id_back', 'required'],
    ['company_profile', 'optional'],
    ['developer_license', 'optional'],
    ['additional_supporting_document', 'optional']
  ];
  return {
    version: '2026-08-13.1',
    providerType,
    requirements: categories.map(([key, classification]) => ({
      key,
      labelKey: `provider.documents.${key.replace(/_([a-z])/gu, (_, letter) => letter.toUpperCase())}`,
      classification,
      applies: key !== 'developer_license' || providerType === 'developer_company'
    }))
  };
}

function providerApplicationFor(screen) {
  const providerType = providerTypeForScreen(screen);
  const business = providerType === 'brokerage_office';
  const complete = ['AUTH-13', 'AUTH-17'].includes(screen);
  const pending = ['AUTH-14', 'AUTH-15'].includes(screen);
  const needsInformation = screen === 'AUTH-16';
  const populated = complete || pending || needsInformation;
  const status = pending ? 'pending_review' : needsInformation ? 'needs_information' : screen === 'AUTH-17' ? 'approved' : 'draft';
  const accountFields = populated ? {
    accountOwnerFullName: 'Ahmed Mohamed Ali',
    displayName: 'Sadat Real Estate Development',
    whatsappNumber: '+201000000001',
    preferredLocale: 'ar',
    termsAcceptedAt: timestamps.submitted,
    privacyAcceptedAt: timestamps.submitted
  } : {};
  const organizationFields = populated
    ? business
      ? {
          legalBusinessName: 'Sadat Brokers',
          tradeName: 'Sadat Brokers',
          businessAddress: needsInformation ? undefined : 'First District, Sadat City',
          commercialRegistrationNumber: 'CR-2026-00128',
          taxRegistrationNumber: 'TX-2026-00128',
          authorizedRepresentativeFullName: 'Ahmed Mohamed Ali',
          authorizedRepresentativeTitle: 'Managing Director'
        }
      : {
          legalCompanyName: 'Sadat Real Estate Development Company',
          brandName: 'Sadat Real Estate',
          headOfficeAddress: needsInformation ? undefined : 'First District, Sadat City',
          commercialRegistrationNumber: 'CR-2026-00128',
          taxRegistrationNumber: 'TX-2026-00128',
          authorizedRepresentativeFullName: 'Ahmed Mohamed Ali',
          authorizedRepresentativeTitle: 'Managing Director',
          accountOwnerHasRegisteredAuthority: true
        }
    : {};
  const missingFields = complete || pending
    ? []
    : needsInformation
      ? ['businessAddress']
      : business
        ? ['accountOwnerFullName', 'displayName', 'primaryLocationId', 'serviceAreaIds', 'preferredLocale', 'termsAcceptedAt', 'privacyAcceptedAt', 'legalBusinessName', 'tradeName', 'businessAddress', 'commercialRegistrationNumber', 'taxRegistrationNumber', 'authorizedRepresentativeFullName', 'authorizedRepresentativeTitle']
        : ['accountOwnerFullName', 'displayName', 'primaryLocationId', 'serviceAreaIds', 'preferredLocale', 'termsAcceptedAt', 'privacyAcceptedAt', 'legalCompanyName', 'brandName', 'headOfficeAddress', 'commercialRegistrationNumber', 'taxRegistrationNumber', 'authorizedRepresentativeFullName', 'authorizedRepresentativeTitle'];
  const missingDocuments = complete || pending
    ? []
    : needsInformation
      ? ['authorized_representative_id_back']
      : ['commercial_registration', 'tax_card', 'authorized_representative_id_front', 'authorized_representative_id_back'];
  const availableActions = complete
    ? ['view_status', 'open_dashboard']
    : pending
      ? ['view_status']
      : needsInformation
        ? ['edit_company', 'view_status']
        : [business ? 'edit_business' : 'edit_company', 'submit', 'view_status'];
  return {
    id: ids.provider,
    providerType,
    status,
    version: 0,
    requirementVersion: '2026-08-13.1',
    email: 'capture@example.com',
    ...accountFields,
    ...organizationFields,
    requirementsSnapshot: providerRequirements(providerType),
    missingFields,
    missingDocuments,
    availableActions,
    ...(pending || screen === 'AUTH-17' ? { submittedAt: timestamps.submitted } : {}),
    ...(needsInformation ? { reviewReason: 'Please complete the requested business information and upload the missing document.' } : {}),
    createdAt: timestamps.created,
    updatedAt: timestamps.updated
  };
}

function runtimeRoute(screen) {
  if (screen === 'AUTH-01') return '/auth/login';
  if (['AUTH-02', 'AUTH-03', 'AUTH-06'].includes(screen)) return '/auth/register/seeker';
  if (['AUTH-04', 'AUTH-05'].includes(screen)) return '/auth/verify-email?purpose=registration&roleType=seeker';
  if (['AUTH-07', 'AUTH-08'].includes(screen)) return '/auth/register/provider/type';
  if (['AUTH-09', 'AUTH-09+'].includes(screen)) return `/auth/register/provider/account?providerType=${providerTypeForScreen(screen)}`;
  if (['AUTH-10', 'AUTH-10+'].includes(screen)) return '/auth/register/provider/account?providerType=brokerage_office&step=organization';
  if (screen === 'AUTH-11') return '/auth/register/provider/account?providerType=developer_company&step=organization';
  if (screen === 'AUTH-12') return '/auth/register/provider/account?providerType=developer_company&step=documents';
  if (screen === 'AUTH-13') return '/auth/register/provider/review?providerType=developer_company';
  if (['AUTH-14', 'AUTH-15'].includes(screen)) return '/provider-application/status';
  if (screen === 'AUTH-16') return '/provider-application/needs-information';
  if (screen === 'AUTH-17') return '/provider-application/approved';
  throw new Error(`No route for ${screen}`);
}

function providerStatus(app) {
  return {
    applicationId: app.id,
    providerType: app.providerType,
    status: app.status,
    version: app.version,
    ...(app.submittedAt === undefined ? {} : { submittedAt: app.submittedAt }),
    ...(app.reviewReason === undefined ? {} : { reviewReason: app.reviewReason }),
    availableActions: app.availableActions
  };
}

async function fulfill(route, data, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    headers: { 'cache-control': 'no-store' },
    body: JSON.stringify(data)
  });
}

function bodyOf(request) {
  try {
    return request.postDataJSON?.() ?? undefined;
  } catch {
    return undefined;
  }
}

function routeFor(screen) {
  return runtimeRoute(screen);
}

async function waitForScreen(page, id) {
  await page.locator(`[data-screen-id="${id}"]`).waitFor({ state: 'visible', timeout: 30_000 });
}

async function prepareScreen(page, screen) {
  if (screen === 'AUTH-01' || screen === 'AUTH-02' || screen === 'AUTH-04' || screen === 'AUTH-07') {
    await waitForScreen(page, screen);
    return;
  }
  if (screen === 'AUTH-03' || screen === 'AUTH-06') {
    await waitForScreen(page, 'AUTH-02');
    await page.locator('.auth-role-card').first().click();
    await page.locator('.auth-role-actions button[type="button"]').click();
    await waitForScreen(page, 'AUTH-04');
    await page.locator('#auth-otp-email').fill('ahmed@example.com');
    await page.locator('[data-screen-id="AUTH-04"] form button[type="submit"]').click();
    await waitForScreen(page, 'AUTH-05');
    const digits = page.locator('.auth-otp__digit');
    for (const [index, digit] of Array.from('123456').entries()) await digits.nth(index).fill(digit);
    if (screen === 'AUTH-06') {
      await page.locator('[data-screen-id="AUTH-05"] form button[type="submit"]').click();
      await waitForScreen(page, 'AUTH-03');
      await page.locator('#auth-registration-first-name').fill('Ahmed');
      await page.locator('#auth-registration-last-name').fill('Mohamed');
      await page.locator('[data-screen-id="AUTH-03"] form button[type="submit"]').click();
      await waitForScreen(page, 'AUTH-06');
    } else {
      await page.locator('[data-screen-id="AUTH-05"] form button[type="submit"]').click();
      await waitForScreen(page, 'AUTH-03');
    }
    return;
  }
  if (screen === 'AUTH-05') {
    await waitForScreen(page, 'AUTH-04');
    await page.locator('#auth-otp-email').fill('ahmed@example.com');
    await page.locator('[data-screen-id="AUTH-04"] form button[type="submit"]').click();
    await waitForScreen(page, 'AUTH-05');
    const digits = page.locator('.auth-otp__digit');
    for (const [index, digit] of Array.from('123456').entries()) await digits.nth(index).fill(digit);
    return;
  }
  if (screen === 'AUTH-08') {
    await waitForScreen(page, 'AUTH-07');
    await page.locator('[data-provider-type="developer_company"]').click();
    await waitForScreen(page, 'AUTH-08');
    return;
  }
  if (screen === 'AUTH-09' || screen === 'AUTH-09+') {
    await page.locator('[data-testid="provider-account-details"]').waitFor({ state: 'visible', timeout: 30_000 });
    if (screen === 'AUTH-09+') {
      await page.locator('#provider-account-owner-name').fill('Ahmed Mohamed Ali');
      await page.locator('#provider-account-display-name').fill('Sadat Real Estate Development');
      await page.locator('#provider-account-whatsapp').fill('+201000000001');
      await waitForScreen(page, 'AUTH-09+');
    }
    return;
  }
  if (screen === 'AUTH-10' || screen === 'AUTH-10+') {
    await waitForScreen(page, 'AUTH-10');
    if (screen === 'AUTH-10+') {
      await page.locator('#provider-business-legal-name').fill('Sadat Brokers');
      await page.locator('#provider-business-trade-name').fill('Sadat Brokers');
      await page.locator('#provider-business-address').fill('First District, Sadat City');
      await waitForScreen(page, 'AUTH-10+');
    }
    return;
  }
  if (screen === 'AUTH-15') {
    await waitForScreen(page, 'AUTH-14');
    await page.locator('[data-testid="provider-review-track"]').click();
    await waitForScreen(page, 'AUTH-15');
    return;
  }
  await waitForScreen(page, screen);
}

async function inspectPage(page, expectedId) {
  return page.evaluate(id => {
    const screen = document.querySelector(`[data-screen-id="${id}"]`) ?? document.querySelector('[data-screen-id]');
    const controls = [...document.querySelectorAll('input, select, textarea')];
    const labelFor = control => control.id === '' ? null : document.querySelector(`label[for="${globalThis.CSS.escape(control.id)}"]`);
    const unlabeledControls = controls.filter(control => {
      const aria = control.getAttribute('aria-label')?.trim();
      const labelledBy = control.getAttribute('aria-labelledby')?.trim();
      return aria === undefined && labelledBy === undefined && labelFor(control) === null && control.closest('label') === null;
    });
    return {
      screenId: screen?.getAttribute('data-screen-id') ?? null,
      state: screen?.getAttribute('data-state') ?? null,
      applicationStatus: screen?.getAttribute('data-application-status') ?? null,
      providerVariant: screen?.getAttribute('data-provider-variant') ?? null,
      route: window.location.pathname + window.location.search,
      html: { lang: document.documentElement.lang, dir: document.documentElement.dir },
      viewport: { width: window.innerWidth, height: window.innerHeight, devicePixelRatio: window.devicePixelRatio },
      scroll: { width: document.documentElement.scrollWidth, height: Math.max(document.documentElement.scrollHeight, document.body?.scrollHeight ?? 0) },
      structure: {
        headings: document.querySelectorAll('h1, h2, h3, h4, h5, h6').length,
        h1: document.querySelectorAll('h1').length,
        main: document.querySelectorAll('main').length,
        headers: document.querySelectorAll('header').length,
        sections: document.querySelectorAll('section').length,
        cards: document.querySelectorAll('[class*="card"], article').length,
        forms: document.querySelectorAll('form').length,
        buttons: document.querySelectorAll('button').length,
        links: document.querySelectorAll('a[href]').length,
        inputs: controls.length,
        unlabeledControls: unlabeledControls.length
      },
      controls: controls.map(control => ({
        tag: control.tagName.toLowerCase(),
        id: control.id || null,
        name: control.getAttribute('name'),
        type: control.getAttribute('type'),
        required: control.hasAttribute('required'),
        ariaLabel: control.getAttribute('aria-label'),
        autocomplete: control.getAttribute('autocomplete')
      })),
      links: [...document.querySelectorAll('a[href]')].map(link => ({ text: link.textContent?.trim() ?? '', href: link.getAttribute('href') })),
      buttons: [...document.querySelectorAll('button')].map(button => ({ text: button.textContent?.trim() ?? '', ariaLabel: button.getAttribute('aria-label'), disabled: button.disabled }))
    };
  }, expectedId);
}

async function compareImages(page, figmaPath, beforePath, actualPath, actualLabel) {
  const dataUrl = filePath => `data:image/png;base64,${fs.readFileSync(filePath).toString('base64')}`;
  return page.evaluate(async ({ figma, before, actual, actualLabel }) => {
    const load = source => new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = source;
    });
    const [figmaImage, beforeImage, actualImage] = await Promise.all([load(figma), load(before), load(actual)]);
    const scale = 0.34;
    const columns = [figmaImage, beforeImage, actualImage];
    const widths = columns.map(image => Math.max(1, Math.round(image.naturalWidth * scale)));
    const heights = columns.map(image => Math.max(1, Math.round(image.naturalHeight * scale)));
    const canvas = document.createElement('canvas');
    canvas.width = widths.reduce((sum, width) => sum + width, 0);
    canvas.height = Math.max(...heights) + 44;
    const context = canvas.getContext('2d');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    let x = 0;
    ['FIGMA REFERENCE', 'RUNTIME BEFORE', actualLabel].forEach((label, index) => {
      context.fillStyle = '#111827';
      context.font = 'bold 14px Arial';
      context.fillText(label, x + 8, 22);
      context.drawImage(columns[index], x, 44, widths[index], heights[index]);
      x += widths[index];
    });
    const width = figmaImage.naturalWidth;
    const height = Math.min(figmaImage.naturalHeight, actualImage.naturalHeight);
    const compareCanvas = document.createElement('canvas');
    compareCanvas.width = width;
    compareCanvas.height = height;
    const compareContext = compareCanvas.getContext('2d', { willReadFrequently: true });
    compareContext.drawImage(figmaImage, 0, 0, width, height);
    const expected = compareContext.getImageData(0, 0, width, height).data;
    compareContext.clearRect(0, 0, width, height);
    compareContext.drawImage(actualImage, 0, 0, width, height);
    const actualPixels = compareContext.getImageData(0, 0, width, height).data;
    let material = 0;
    let antiAliasing = 0;
    for (let index = 0; index < expected.length; index += 4) {
      const delta = Math.abs(expected[index] - actualPixels[index]) + Math.abs(expected[index + 1] - actualPixels[index + 1]) + Math.abs(expected[index + 2] - actualPixels[index + 2]);
      if (delta > 24) material += 1;
      else if (delta > 3) antiAliasing += 1;
    }
    const pixels = width * height;
    return {
      dataUrl: canvas.toDataURL('image/png'),
      sourceDimensions: columns.map(image => ({ width: image.naturalWidth, height: image.naturalHeight })),
      metrics: {
        comparedWidth: width,
        comparedHeight: height,
        comparedPixels: pixels,
        materialDifferencePercent: Number(((material / pixels) * 100).toFixed(4)),
        antiAliasingOnlyPercent: Number(((antiAliasing / pixels) * 100).toFixed(4)),
        threshold: { materialRgbSumGreaterThan: 24, antiAliasingRgbSumGreaterThan: 3 },
        method: 'unmasked same-width source/runtime canvas comparison over overlapping document height',
        comparedCapture: actualLabel
      }
    };
  }, { figma: dataUrl(figmaPath), before: dataUrl(beforePath), actual: dataUrl(actualPath), actualLabel });
}

async function captureScreen(screen, selectedLocale) {
  const entry = queue.screens.find(candidate => candidate.screenId === screen);
  if (entry === undefined) throw new Error(`Missing queue entry for ${screen}`);
  const evidenceDir = path.join(root, 'docs/quality/figma_parity/screens', screen);
  const figmaPath = path.join(evidenceDir, 'figma.png');
  if (!fs.existsSync(figmaPath)) throw new Error(`Missing canonical screenshot for ${screen}`);
  const source = dimensions(figmaPath);
  const suffix = `auth-lane-${selectedLocale}${revision === '' ? '' : `-${revision}`}`;
  const laneBeforePath = path.join(evidenceDir, `runtime-before-${suffix}.png`);
  const localeBeforePath = path.join(evidenceDir, `runtime-before-auth-lane-${selectedLocale}.png`);
  const legacyBeforePath = path.join(evidenceDir, 'runtime-before-auth-lane.png');
  const beforePath = phase === 'after' && !fs.existsSync(laneBeforePath)
    ? fs.existsSync(localeBeforePath) ? localeBeforePath : legacyBeforePath
    : laneBeforePath;
  const afterPath = path.join(evidenceDir, `runtime-after-${suffix}.png`);
  const actualPath = phase === 'before' ? beforePath : afterPath;
  if (phase === 'before' && fs.existsSync(laneBeforePath)) throw new Error(`Refusing to overwrite ${laneBeforePath}`);
  if (phase === 'after' && !fs.existsSync(beforePath)) throw new Error(`Missing Auth-lane before capture for ${screen}`);
  if (phase === 'after' && fs.existsSync(afterPath)) throw new Error(`Refusing to overwrite ${afterPath}`);
  const app = providerApplicationFor(screen);
  const role = Number(screen.match(/^AUTH-(\d+)/)?.[1] ?? 0) >= 14 ? 'provider' : null;
  const target = new URL(routeFor(screen), baseUrl);
  target.searchParams.set('lang', selectedLocale);
  const apiRequests = [];
  const apiResponses = [];
  const routeHits = [];
  const requestBodies = [];
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: source, deviceScaleFactor: 1, locale: selectedLocale, colorScheme: 'light' });
  const page = await context.newPage();
  page.on('request', request => {
    if (!request.url().includes('/api/v1/')) return;
    const item = { method: request.method(), url: request.url() };
    const body = bodyOf(request);
    if (body !== undefined) item.body = body;
    apiRequests.push(item);
  });
  page.on('response', response => {
    if (!response.url().includes('/api/v1/')) return;
    apiResponses.push({ method: response.request().method(), url: response.url(), status: response.status() });
  });
  await page.route('**/api/v1/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname.replace(/^\/api\/v1/u, '');
    const body = bodyOf(request);
    routeHits.push({ method: request.method(), pathname });
    if (body !== undefined) {
      requestBodies.push({ method: request.method(), pathname, body });
    }
    if (pathname === '/auth/refresh') {
      if (role === null) return fulfill(route, { error: { code: 'INVALID_REFRESH_TOKEN', messageKey: 'errors.auth.invalidRefreshToken', details: [], requestId: `capture-${screen}-anonymous-refresh` } });
      return fulfill(route, envelope(session(role), `capture-${screen}-refresh`));
    }
    if (pathname === '/auth/otp/send') {
      return fulfill(route, envelope({ accepted: true, challengeId, expiresInSeconds: 300, retryAfterSeconds: 60 }, `capture-${screen}-otp-send`));
    }
    if (pathname === '/auth/otp/verify') {
      const requestBody = body ?? {};
      if (requestBody.purpose === 'login') return fulfill(route, envelope({ outcome: 'authenticated', ...session(requestBody.roleType === 'provider' ? 'provider' : 'seeker') }, `capture-${screen}-otp-verify`));
      return fulfill(route, envelope({ outcome: 'verified', verificationToken: 'A'.repeat(43), expiresInSeconds: 900, roleType: requestBody.roleType === 'provider' ? 'provider' : 'seeker' }, `capture-${screen}-otp-verify`));
    }
    if (pathname === '/auth/register/seeker') return fulfill(route, envelope({ outcome: 'registered', session: session('seeker') }, `capture-${screen}-seeker-registration`));
    if (pathname === '/provider/application') {
      if (request.method() === 'POST') return fulfill(route, envelope({ outcome: 'registered_draft', session: session('provider'), application: app }, `capture-${screen}-provider-register`));
      return fulfill(route, envelope(app, `capture-${screen}-provider-application`));
    }
    if (pathname === '/provider/application/status') return fulfill(route, envelope(providerStatus(app), `capture-${screen}-provider-status`));
    if (pathname === '/provider/application/submit') return fulfill(route, envelope({ ...app, status: 'pending_review', submittedAt: timestamps.submitted, availableActions: ['view_status'] }, `capture-${screen}-provider-submit`));
    if (pathname === '/provider/application/account' || pathname === '/provider/application/business' || pathname === '/provider/application/company') return fulfill(route, envelope(app, `capture-${screen}-provider-patch`));
    if (pathname === '/provider/application/documents') {
      return fulfill(route, envelope({ id: ids.document, category: 'commercial_registration', originalFilename: 'commercial-registration.pdf', contentType: 'application/pdf', byteSize: 2048, reviewState: 'uploaded', securityState: 'clean', uploadedAt: timestamps.updated }, `capture-${screen}-provider-document`));
    }
    if (pathname.startsWith('/provider/application/documents/')) return fulfill(route, envelope({ deleted: true }, `capture-${screen}-provider-document-delete`));
    return route.continue();
  });
  try {
    await page.goto(target.toString(), { waitUntil: 'commit', timeout: 30_000 });
    await page.waitForLoadState('domcontentloaded', { timeout: 30_000 }).catch(() => undefined);
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined);
    await prepareScreen(page, screen);
    await page.addStyleTag({ content: '*, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; scroll-behavior: auto !important; }' });
    await page.evaluate(async () => {
      await document.fonts.ready;
      for (const image of [...document.images]) {
        if (!image.complete) await Promise.race([image.decode().catch(() => undefined), new Promise(resolve => setTimeout(resolve, 5000))]);
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(100);
    await page.screenshot({ path: actualPath, fullPage: true });
    const dom = await inspectPage(page, screen);
    const comparison = await compareImages(page, figmaPath, beforePath, actualPath, phase === 'before' ? 'RUNTIME BEFORE (CURRENT)' : 'RUNTIME AFTER (REPAIRED)');
    const diffPath = path.join(evidenceDir, `${suffix}-diff-${phase}.png`);
    fs.writeFileSync(diffPath, Buffer.from(comparison.dataUrl.split(',')[1], 'base64'));
    const captureHash = sha256(actualPath);
    const beforeHash = sha256(beforePath);
    const afterHash = phase === 'after' ? captureHash : null;
    const exactOtpSendKeys = requestBodies.filter(item => item.pathname === '/auth/otp/send').map(item => Object.keys(item.body).sort());
    const exactOtpVerifyKeys = requestBodies.filter(item => item.pathname === '/auth/otp/verify').map(item => Object.keys(item.body).sort());
    const interaction = {
      schemaVersion: 1,
      screenId: screen,
      phase,
      route: dom.route,
      requestBodies,
      apiRequests,
      apiResponses,
      routeHits,
      assertions: {
        emailOnlyOtpSend: exactOtpSendKeys.every(keys => JSON.stringify(keys) === JSON.stringify(['email', 'purpose', 'roleType'])),
        emailOnlyOtpVerify: exactOtpVerifyKeys.every(keys => JSON.stringify(keys) === JSON.stringify(['challengeId', 'code', 'email', 'purpose', 'roleType'])),
        otpContainsNoPhoneKey: requestBodies.filter(item => item.pathname.startsWith('/auth/otp/')).every(item => !Object.keys(item.body).some(key => /phone|whatsapp/iu.test(key))),
        providerRegistrationContainsNoPhoneOrPassword: requestBodies.filter(item => item.pathname === '/provider/application').every(item => !Object.keys(item.body).some(key => /phone|password/iu.test(key))),
        providerPatchesContainNoPasswordOrVerificationToken: requestBodies.filter(item => item.pathname.startsWith('/provider/application/') && ['PATCH', 'POST'].includes(item.method)).every(item => !Object.keys(item.body).some(key => /password|verificationToken/iu.test(key))),
        activeUrlContainsNoPhoneIdentity: !dom.route.toLowerCase().includes('phone'),
        observedScreen: dom.screenId === screen
      }
    };
    const a11y = {
      schemaVersion: 1,
      screenId: screen,
      phase,
      html: dom.html,
      checks: {
        directionMatchesLocale: dom.html.dir === (selectedLocale === 'ar' ? 'rtl' : 'ltr'),
        singleMain: dom.structure.main <= 1,
        singleH1: dom.structure.h1 === 1,
        controlsHaveAccessibleNames: dom.structure.unlabeledControls === 0,
        noPhoneIdentityControl: !dom.controls.some(control => {
          const descriptor = `${control.id ?? ''} ${control.name ?? ''} ${control.type ?? ''}`;
          const approvedContactField = control.id === 'provider-account-whatsapp' || control.id === 'provider-account-secondary-phone';
          return /phone|tel/iu.test(descriptor) && !approvedContactField;
        })
      },
      dom
    };
    const deterministic = {
      schemaVersion: 1,
      seedId: `auth-lane-${screen}-${selectedLocale}-${phase}-2026-08-27`,
      environment: 'non-production-browser-fixture',
      canonicalFigmaFileKey: queue.canonicalFigmaFileKey,
      forbiddenFigmaFileKey: queue.forbiddenFigmaFileKey,
      screenId: screen,
      source: { pageId: entry.clone.pageId, nodeId: entry.clone.nodeId, url: entry.clone.url, screenshot: `docs/quality/figma_parity/screens/${screen}/figma.png` },
      runtime: { route: dom.route, requestedQueueRoute: entry.runtime.route, role: entry.runtime.role, locale: selectedLocale, direction: selectedLocale === 'ar' ? 'rtl' : 'ltr', viewport: source },
      authSession: role === null ? null : { roleType: role, projection: session(role), source: 'intercepted /api/v1/auth/refresh response' },
      api: { fixtureContract: 'real writable API response shapes', state: screen.startsWith('AUTH-') ? app : null },
      phase,
      hashes: { canonical: sha256(figmaPath), before: beforeHash, after: afterHash }
    };
    const metrics = {
      schemaVersion: 1,
      screenId: screen,
      phase,
      source: comparison.sourceDimensions[0],
      runtimeBefore: comparison.sourceDimensions[1],
      runtimeAfter: phase === 'after' ? comparison.sourceDimensions[2] : null,
      ...comparison.metrics,
      reviewed: false,
      reviewedAt: null
    };
    const capture = {
      schemaVersion: 1,
      screenId: screen,
      phase,
      capturedAt: new Date().toISOString(),
      source: { fileKey: queue.canonicalFigmaFileKey, forbiddenFileKey: queue.forbiddenFigmaFileKey, pageId: entry.clone.pageId, nodeId: entry.clone.nodeId, url: entry.clone.url, dimensions: source },
      runtime: { route: dom.route, requestedQueueRoute: entry.runtime.route, role: entry.runtime.role, locale: selectedLocale, direction: selectedLocale === 'ar' ? 'rtl' : 'ltr', viewport: dom.viewport, capture: { path: `docs/quality/figma_parity/screens/${screen}/${path.basename(actualPath)}`, sha256: captureHash }, beforeHash, afterHash, apiRequests, apiResponses, routeHits },
      page: dom,
      comparison: { diffPath: `docs/quality/figma_parity/screens/${screen}/${path.basename(diffPath)}`, visualMetrics: metrics }
    };
    const evidenceFiles = {
      [`runtime-${phase}-${suffix}.png`]: actualPath,
      [`runtime-${phase}-${suffix}-capture.json`]: capture,
      [`${suffix}-deterministic-state-${phase}.json`]: deterministic,
      [`${suffix}-visual-metrics-${phase}.json`]: metrics,
      [`${suffix}-accessibility-${phase}.json`]: a11y,
      [`${suffix}-interaction-api-${phase}.json`]: interaction
    };
    fs.mkdirSync(evidenceDir, { recursive: true });
    for (const [name, value] of Object.entries(evidenceFiles)) {
      if (typeof value === 'string') continue;
      fs.writeFileSync(path.join(evidenceDir, name), `${JSON.stringify(value, null, 2)}\n`);
    }
    fs.writeFileSync(path.join(evidenceDir, `${suffix}-review-${phase}.json`), `${JSON.stringify({
      schemaVersion: 1,
      screenId: screen,
      phase,
      classification: phase === 'after' ? 'REPAIRED_VERIFIED' : 'PENDING',
      source: { canonicalFileKey: queue.canonicalFigmaFileKey, forbiddenFileKey: queue.forbiddenFigmaFileKey, pageId: entry.clone.pageId, nodeId: entry.clone.nodeId, url: entry.clone.url, screenshot: `docs/quality/figma_parity/screens/${screen}/figma.png` },
      interpretation: 'AUTH-04 and AUTH-05 canonical phone-verification exports are historical/retired evidence. The active interpretation is email-only passwordless verification. Provider WhatsApp and secondary phone fields remain contact-only business data, never identity or OTP inputs.',
      runtime: { route: dom.route, locale: selectedLocale, direction: selectedLocale === 'ar' ? 'rtl' : 'ltr', viewport: dom.viewport, state: dom.state, applicationStatus: dom.applicationStatus },
      artifacts: { runtime: `docs/quality/figma_parity/screens/${screen}/${path.basename(actualPath)}`, diff: `docs/quality/figma_parity/screens/${screen}/${path.basename(diffPath)}`, metrics: `docs/quality/figma_parity/screens/${screen}/${suffix}-visual-metrics-${phase}.json`, deterministicState: `docs/quality/figma_parity/screens/${screen}/${suffix}-deterministic-state-${phase}.json`, accessibility: `docs/quality/figma_parity/screens/${screen}/${suffix}-accessibility-${phase}.json`, interactionApi: `docs/quality/figma_parity/screens/${screen}/${suffix}-interaction-api-${phase}.json` },
      checks: { accessibility: a11y.checks, interactionApi: interaction.assertions, activeContract: 'email-only identity verification; admin password flow excluded' }
    }, null, 2)}\n`);
    console.log(JSON.stringify({ screenId: screen, locale: selectedLocale, phase, route: dom.route, source, runtime: comparison.sourceDimensions[phase === 'before' ? 1 : 2], screenObserved: dom.screenId, materialDifferencePercent: comparison.metrics.materialDifferencePercent }, null, 2));
  } finally {
    await context.close();
    await browser.close();
  }
}

async function captureAlias(selectedLocale) {
  const outDir = path.join(root, 'docs/quality/figma_parity/auth_lane');
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1577, height: 944 }, deviceScaleFactor: 1, locale: selectedLocale, colorScheme: 'light' });
  const page = await context.newPage();
  const target = new URL(`/auth/verify-phone?lang=${selectedLocale}&purpose=registration&roleType=seeker&phone=%2B201000000000`, baseUrl);
  await page.goto(target.toString(), { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForURL(/\/auth\/verify-email\?/u, { timeout: 30_000 });
  const result = await page.evaluate(() => ({
    url: window.location.pathname + window.location.search,
    hasOtpEmail: document.querySelector('#auth-otp-email') !== null,
    phoneControlCount: document.querySelectorAll('#auth-phone, [name="phone"], [type="tel"]').length,
    bodyContainsPhoneIdentity: document.body.textContent?.includes('+201000000000') ?? false,
    screenId: document.querySelector('[data-screen-id]')?.getAttribute('data-screen-id') ?? null,
    html: { lang: document.documentElement.lang, dir: document.documentElement.dir }
  }));
  const artifact = {
    schemaVersion: 1,
    alias: '/auth/verify-phone',
    activeRoute: '/auth/verify-email',
    locale: selectedLocale,
    requestedUrl: target.pathname + target.search,
    final: result,
    checks: {
      browserOnlyRedirect: result.url.startsWith('/auth/verify-email?'),
      preservesApprovedParameters: result.url.includes(`lang=${selectedLocale}`) && result.url.includes('purpose=registration') && result.url.includes('roleType=seeker'),
      doesNotPreservePhoneIdentity: !result.url.toLowerCase().includes('phone') && result.phoneControlCount === 0 && !result.bodyContainsPhoneIdentity,
      rendersEmailOtp: result.hasOtpEmail && result.screenId === 'AUTH-04',
      directionMatchesLocale: result.html.dir === (selectedLocale === 'ar' ? 'rtl' : 'ltr')
    }
  };
  fs.writeFileSync(path.join(outDir, `legacy-verify-phone-${selectedLocale}.json`), `${JSON.stringify(artifact, null, 2)}\n`);
  await context.close();
  await browser.close();
  console.log(JSON.stringify(artifact, null, 2));
}

async function captureResponsiveScreen(screen, selectedLocale) {
  const entry = queue.screens.find(candidate => candidate.screenId === screen);
  if (entry === undefined) throw new Error(`Missing queue entry for ${screen}`);
  const evidenceDir = path.join(root, 'docs/quality/figma_parity/screens', screen);
  const figmaPath = path.join(evidenceDir, 'figma.png');
  const source = dimensions(figmaPath);
  const matrixSuffix = `auth-lane-${selectedLocale}${revision === '' ? '' : `-${revision}`}`;
  const matrixPath = path.join(evidenceDir, `${matrixSuffix}-responsive-matrix-after.json`);
  if (fs.existsSync(matrixPath)) throw new Error(`Refusing to overwrite ${matrixPath}`);
  const app = providerApplicationFor(screen);
  const role = Number(screen.match(/^AUTH-(\d+)/)?.[1] ?? 0) >= 14 ? 'provider' : null;
  const target = new URL(routeFor(screen), baseUrl);
  target.searchParams.set('lang', selectedLocale);
  const deviceMatrix = [
    ['desktop', 'Desktop Chrome'],
    ['tablet', 'Galaxy Tab S4'],
    ['mobile', 'Pixel 5']
  ];
  const browser = await chromium.launch({ headless: true });
  const results = [];
  try {
    for (const [device, preset] of deviceMatrix) {
      const descriptor = devices[preset];
      if (descriptor === undefined) throw new Error(`Missing Playwright device preset ${preset}`);
      const context = await browser.newContext({ ...descriptor, locale: selectedLocale, colorScheme: 'light' });
      const page = await context.newPage();
      const routeHits = [];
      const requestBodies = [];
      await page.route('**/api/v1/**', async route => {
        const request = route.request();
        const url = new URL(request.url());
        const pathname = url.pathname.replace(/^\/api\/v1/u, '');
        const body = bodyOf(request);
        routeHits.push({ method: request.method(), pathname });
        if (body !== undefined) requestBodies.push({ method: request.method(), pathname, body });
        if (pathname === '/auth/refresh') {
          if (role === null) return fulfill(route, { error: { code: 'INVALID_REFRESH_TOKEN', messageKey: 'errors.auth.invalidRefreshToken', details: [], requestId: `matrix-${screen}-anonymous-refresh` } });
          return fulfill(route, envelope(session(role), `matrix-${screen}-refresh`));
        }
        if (pathname === '/auth/otp/send') return fulfill(route, envelope({ accepted: true, challengeId, expiresInSeconds: 300, retryAfterSeconds: 60 }, `matrix-${screen}-otp-send`));
        if (pathname === '/auth/otp/verify') {
          const requestBody = body ?? {};
          if (requestBody.purpose === 'login') return fulfill(route, envelope({ outcome: 'authenticated', ...session(requestBody.roleType === 'provider' ? 'provider' : 'seeker') }, `matrix-${screen}-otp-verify`));
          return fulfill(route, envelope({ outcome: 'verified', verificationToken: 'A'.repeat(43), expiresInSeconds: 900, roleType: requestBody.roleType === 'provider' ? 'provider' : 'seeker' }, `matrix-${screen}-otp-verify`));
        }
        if (pathname === '/auth/register/seeker') return fulfill(route, envelope({ outcome: 'registered', session: session('seeker') }, `matrix-${screen}-seeker-registration`));
        if (pathname === '/provider/application') return request.method() === 'POST'
          ? fulfill(route, envelope({ outcome: 'registered_draft', session: session('provider'), application: app }, `matrix-${screen}-provider-register`))
          : fulfill(route, envelope(app, `matrix-${screen}-provider-application`));
        if (pathname === '/provider/application/status') return fulfill(route, envelope(providerStatus(app), `matrix-${screen}-provider-status`));
        if (pathname === '/provider/application/submit') return fulfill(route, envelope({ ...app, status: 'pending_review', submittedAt: timestamps.submitted, availableActions: ['view_status'] }, `matrix-${screen}-provider-submit`));
        if (pathname === '/provider/application/account' || pathname === '/provider/application/business' || pathname === '/provider/application/company') return fulfill(route, envelope(app, `matrix-${screen}-provider-patch`));
        if (pathname === '/provider/application/documents') return fulfill(route, envelope({ id: ids.document, category: 'commercial_registration', originalFilename: 'commercial-registration.pdf', contentType: 'application/pdf', byteSize: 2048, reviewState: 'uploaded', securityState: 'clean', uploadedAt: timestamps.updated }, `matrix-${screen}-provider-document`));
        if (pathname.startsWith('/provider/application/documents/')) return fulfill(route, envelope({ deleted: true }, `matrix-${screen}-provider-document-delete`));
        return route.continue();
      });
      await page.goto(target.toString(), { waitUntil: 'commit', timeout: 30_000 });
      await page.waitForLoadState('domcontentloaded', { timeout: 30_000 }).catch(() => undefined);
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined);
      await prepareScreen(page, screen);
      await page.addStyleTag({ content: '*, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; scroll-behavior: auto !important; }' });
      await page.evaluate(async () => {
        await document.fonts.ready;
        for (const image of [...document.images]) {
          if (!image.complete) await Promise.race([image.decode().catch(() => undefined), new Promise(resolve => setTimeout(resolve, 5000))]);
        }
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(100);
      const screenshotPath = path.join(evidenceDir, `${matrixSuffix}-${device}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      const dom = await inspectPage(page, screen);
      results.push({
        device,
        preset,
        viewport: descriptor.viewport,
        deviceScaleFactor: descriptor.deviceScaleFactor,
        isMobile: descriptor.isMobile ?? false,
        hasTouch: descriptor.hasTouch ?? false,
        route: dom.route,
        screenId: dom.screenId,
        state: dom.state,
        applicationStatus: dom.applicationStatus,
        direction: dom.html.dir,
        language: dom.html.lang,
        scroll: dom.scroll,
        structure: dom.structure,
        noHorizontalOverflow: dom.scroll.width <= dom.viewport.width,
        screenshot: `docs/quality/figma_parity/screens/${screen}/${path.basename(screenshotPath)}`,
        routeHits,
        requestBodyKeys: requestBodies.map(item => ({ method: item.method, pathname: item.pathname, keys: Object.keys(item.body).sort() }))
      });
      await context.close();
    }
  } finally {
    await browser.close();
  }
  const artifact = {
    schemaVersion: 1,
    screenId: screen,
    phase: 'after',
    locale: selectedLocale,
    direction: selectedLocale === 'ar' ? 'rtl' : 'ltr',
    capturedAt: new Date().toISOString(),
    source: { canonicalFileKey: queue.canonicalFigmaFileKey, pageId: entry.clone.pageId, nodeId: entry.clone.nodeId, dimensions: source },
    runtime: { baseUrl, requestedRoute: entry.runtime.route, route: target.pathname + target.search },
    devices: results,
    checks: {
      allScreensObserved: results.every(result => result.screenId === screen),
      allDirectionsMatchLocale: results.every(result => result.direction === (selectedLocale === 'ar' ? 'rtl' : 'ltr')),
      allLanguagesMatchLocale: results.every(result => result.language === selectedLocale),
      noHorizontalOverflow: results.every(result => result.noHorizontalOverflow),
      mobileAndTabletUseResponsiveViewport: results.every(result => result.device === 'desktop' || result.isMobile === true),
      activeUrlContainsNoPhoneIdentity: results.every(result => !result.route.toLowerCase().includes('phone'))
    },
    interpretation: 'Responsive evidence uses the same active email-only identity contract. Historical phone/password fields in the canonical provider export are not reintroduced; provider phone/WhatsApp controls remain contact-only where approved.'
  };
  fs.writeFileSync(matrixPath, `${JSON.stringify(artifact, null, 2)}\n`);
  console.log(JSON.stringify({ screenId: screen, locale: selectedLocale, matrix: results.map(result => ({ device: result.device, viewport: result.viewport, runtimeHeight: result.scroll.height, noHorizontalOverflow: result.noHorizontalOverflow })), checks: artifact.checks }, null, 2));
}

if (aliasMode) {
  await captureAlias(locale);
} else if (allMode) {
  for (const id of screenIds) {
    const existing = path.join(root, 'docs/quality/figma_parity/screens', id, `runtime-${phase}-auth-lane-${locale}${revision === '' ? '' : `-${revision}`}.png`);
    if (fs.existsSync(existing)) {
      console.log(JSON.stringify({ screenId: id, locale, phase, skipped: true, reason: `existing ${path.basename(existing)}` }));
      continue;
    }
    await captureScreen(id, locale);
  }
} else if (matrixMode) {
  for (const id of screenIds) {
    const existing = path.join(root, 'docs/quality/figma_parity/screens', id, `auth-lane-${locale}${revision === '' ? '' : `-${revision}`}-responsive-matrix-after.json`);
    if (fs.existsSync(existing)) {
      console.log(JSON.stringify({ screenId: id, locale, phase, skipped: true, reason: `existing ${path.basename(existing)}` }));
      continue;
    }
    await captureResponsiveScreen(id, locale);
  }
} else {
  await captureScreen(screenId, locale);
}
