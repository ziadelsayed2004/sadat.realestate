import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import mongoose from 'mongoose';
import sharp from 'sharp';
import { chromium, webkit, expect } from '@playwright/test';
import { providerDocumentDataSchema, providerDocumentListSuccessEnvelopeSchema } from '@sadat-real-estate/contracts';
import { createArgon2PasswordHasher } from '../apps/api/src/modules/auth/crypto.ts';

const reproduce = process.argv.includes('--reproduce');
const env = Object.fromEntries((await readFile('.env.local', 'utf8')).split(/\r?\n/).filter(line => line.includes('=') && !line.startsWith('#')).map(line => { const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1).replace(/^['"]|['"]$/g, '')]; }));
const uri = new URL(env.MONGODB_URI);
assert(['localhost', '127.0.0.1'].includes(uri.hostname) && uri.port === '27018', 'Local fixture database only');
const db = await mongoose.createConnection(uri.href).asPromise();
const base = 'http://127.0.0.1:4173', root = '.tmp/office-documents';
const userId = new mongoose.Types.ObjectId(), appId = new mongoose.Types.ObjectId();
const at = new Date(), email = `office-documents-${Date.now()}@example.invalid`, password = 'Local-Office!2026';
const storageRoot = path.resolve(env.PRIVATE_STORAGE_LOCAL_ROOT || path.join(os.tmpdir(), 'sadat-real-estate-private-storage'));
const report = { status: 'FAIL_LOCAL', mockedResponses: false, checks: [], browsers: [], browserErrors: [] };
const browsers = [], contexts = [];
let lastPage;
await mkdir(root, { recursive: true });
async function ready(page) {
  lastPage = page;
  await expect(page.locator('[data-auth-resolution=pending]')).toHaveCount(0);
  await expect(page.locator('#site-intro')).toBeHidden();
  await page.evaluate(() => document.fonts.ready);
}
async function rateWindow() {
  const response = await fetch(base + '/api/v1/public/bootstrap');
  if (response.status === 429 || Number(response.headers.get('ratelimit-remaining')) < 35) {
    const seconds = Math.min(60, Math.max(1, Number(response.headers.get('retry-after') ?? response.headers.get('ratelimit-reset') ?? 60)));
    console.log('LOCAL_RATE_WINDOW', seconds);
    await new Promise(resolve => setTimeout(resolve, seconds * 1000));
  }
}
try {
  await rateWindow();
  const catalog = await (await fetch(base + '/api/v1/public/properties?limit=1')).json();
  const location = new mongoose.Types.ObjectId(catalog.data.locations[0].id);
  await db.collection('users').insertOne({ _id: userId, roleType: 'provider', status: 'draft', normalizedEmail: email, locale: 'ar', version: 0, createdAt: at, updatedAt: at });
  await db.collection('admin_credentials').insertOne({ userId, passwordHash: await createArgon2PasswordHasher().hash(password), passwordChangedAt: at, createdAt: at, updatedAt: at, version: 0 });
  await db.collection('provider_profiles').insertOne({ userId, providerType: 'brokerage_office', status: 'draft', version: 0, createdAt: at, updatedAt: at });
  await db.collection('provider_applications').insertOne({ _id: appId, userId, providerType: 'brokerage_office', status: 'draft', requirementVersion: '2026-10-15.office.1', accountOwnerFullName: 'Local office owner', displayName: 'Local office documents fixture', email, phone: '+201012345678', primaryLocationId: location, serviceAreaIds: [location], preferredLocale: 'ar', termsAcceptedAt: at, privacyAcceptedAt: at, legalBusinessName: 'Local synthetic office', tradeName: 'Local synthetic office', businessAddress: 'Local synthetic address', authorizedRepresentativeFullName: 'Local office owner', authorizedRepresentativeTitle: 'Owner', accountOwnerHasRegisteredAuthority: true, version: 0, statusChangedAt: at, createdAt: at, updatedAt: at });
  for (const browserType of reproduce ? [chromium] : [chromium, webkit]) {
    const browser = await browserType.launch(); browsers.push(browser);
    for (const [locale, width] of reproduce ? [['ar', 390]] : [['ar', 390], ['en', 1440]]) {
      await rateWindow();
      const context = await browser.newContext({ viewport: { width, height: 1000 } }); contexts.push(context);
      const login = await context.request.post(base + '/api/v1/auth/login', { data: { email, password } });
      assert.equal(login.status(), 200, await login.text());
      const page = await context.newPage();
      page.on('pageerror', error => report.browserErrors.push(String(error)));
      await page.goto(base + `/auth/register/provider/account?providerType=brokerage_office&lang=${locale}&step=documents`);
      await ready(page);
      await expect(page.getByTestId('provider-documents')).toHaveAttribute('data-state', 'ready');
      for (const [i, category] of ['authorized_representative_id_front', 'authorized_representative_id_back'].entries()) {
        const filename = i ? 'هوية خلفية.jpeg' : 'WhatsApp Image 2026-10-20 at 12.25.11.png';
        const image = sharp({ create: { width: 800, height: 600, channels: 3, background: i ? '#c99e4e' : '#174f44' } });
        const buffer = await (i ? image.jpeg() : image.png()).toBuffer();
        const uploaded = page.waitForResponse(response => response.url().endsWith('/provider/application/documents') && response.request().method() === 'POST');
        await page.locator(`#provider-document-input-${category}`).setInputFiles({ name: filename, mimeType: i ? 'image/jpeg' : 'image/png', buffer });
        const response = await uploaded;
        assert([200, 201].includes(response.status()), await response.text());
        const document = (await response.json()).data;
        assert.equal(document.securityState, 'clean');
        assert.equal(document.requirementVersion, '2026-10-15.office.1');
        if (reproduce) {
          const parsed = providerDocumentDataSchema.safeParse(document);
          assert.equal(parsed.success, false);
          report.checks.push({ before: 'Clean successful upload rejected by document contract', issues: parsed.error.issues.map(issue => issue.path.join('.')) });
          await expect(page.getByTestId(`provider-document-${category}`)).toHaveAttribute('data-upload-state', 'idle');
          break;
        }
        assert.equal(providerDocumentDataSchema.safeParse(document).success, true);
        await expect(page.getByTestId(`provider-document-${category}`)).toHaveAttribute('data-upload-state', 'success');
        await expect(page.getByTestId(`provider-document-file-${category}`)).toContainText(filename);
      }
      const metadata = page.waitForResponse(response => response.url().endsWith('/provider/application/documents') && response.request().method() === 'GET');
      await page.reload(); await ready(page);
      const list = await metadata; assert.equal(list.status(), 200);
      const envelope = await list.json();
      assert.equal(providerDocumentListSuccessEnvelopeSchema.safeParse(envelope).success, !reproduce);
      await expect(page.getByTestId('provider-documents')).toHaveAttribute('data-state', reproduce ? 'retry' : 'ready');
      if (!reproduce) {
        for (const category of ['authorized_representative_id_front', 'authorized_representative_id_back']) await expect(page.getByTestId(`provider-document-file-${category}`)).toBeVisible();
        assert.equal(envelope.data.items.length, 2, 'Repeated identical uploads must remain idempotent');
        assert.equal(await db.collection('provider_documents').countDocuments({ applicationId: appId }), 2);
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        if (browserType === chromium && locale === 'ar') {
          const rejected = page.waitForResponse(response => response.url().endsWith('/provider/application/documents') && response.request().method() === 'POST');
          await page.locator('#provider-document-input-authorized_representative_id_front').setInputFiles({ name: 'corrupt.png', mimeType: 'image/png', buffer: Buffer.from('broken image') });
          assert.equal((await rejected).status(), 400);
          await expect(page.getByTestId('provider-document-authorized_representative_id_front')).toHaveAttribute('data-upload-state', 'idle');
          await expect(page.getByTestId('provider-document-file-authorized_representative_id_front')).toContainText('WhatsApp Image');
          assert.equal(await db.collection('provider_documents').countDocuments({ applicationId: appId }), 2);
          const unauthenticated = await fetch(base + '/api/v1/provider/application/documents');
          assert.equal(unauthenticated.status, 401);
          report.checks.push('Corrupt replacement is rejected without losing the saved document; unauthenticated metadata stays private');
        }
      }
      await page.screenshot({ path: `${root}/${reproduce ? 'before' : 'after'}-${browserType.name()}-${locale}-${width}.png`, fullPage: true });
      report.browsers.push({ engine: browserType.name(), locale, width, persistedFiles: envelope.data.items.length });
      await context.close();
    }
  }
  if (!reproduce) {
    const context = await browsers[0].newContext(); contexts.push(context);
    const login = await context.request.post(base + '/api/v1/auth/login', { data: { email, password } });
    assert.equal(login.status(), 200);
    const authorization = `Bearer ${(await login.json()).data.accessToken}`;
    const response = await context.request.get(base + '/api/v1/provider/application', { headers: { authorization } });
    assert.equal(response.status(), 200);
    const application = (await response.json()).data;
    assert.deepEqual(application.missingDocuments, []);
    assert.deepEqual(application.missingFields, []);
    const page = await context.newPage();
    await page.goto(base + '/auth/register/provider/review?providerType=brokerage_office&lang=ar');
    await ready(page);
    await expect(page.getByTestId('provider-review-submit')).toBeEnabled();
    const submitted = page.waitForResponse(response => response.url().endsWith('/provider/application/submit') && response.request().method() === 'POST');
    await page.getByTestId('provider-review-submit').click();
    const submit = await submitted; assert.equal(submit.status(), 200, await submit.text());
    await expect(page).toHaveURL(/\/\?lang=ar&providerApplication=submitted$/);
    await expect(page.getByRole('link', { name: 'متابعة حالة الطلب' })).toBeVisible();
    report.checks.push('Complete office application submits from review UI and returns to homepage with confirmation and status tracking');
  }
  report.checks.push(reproduce ? 'Refresh reproduces unavailable page despite HTTP 200 saved metadata' : 'Office JPEG/PNG uploads, Arabic/timestamp filenames, refresh persistence, idempotency and mobile layout pass');
  assert.deepEqual(report.browserErrors, []);
  report.status = reproduce ? 'REPRODUCED_LOCAL' : 'PASS_LOCAL';
} catch (error) {
  process.exitCode = 1; report.error = String(error.stack ?? error);
  if (lastPage && !lastPage.isClosed()) { await lastPage.screenshot({ path: `${root}/failure.png`, fullPage: true }); await writeFile(`${root}/failure.txt`, await lastPage.locator('body').innerText()); }
} finally {
  for (const context of contexts) await context.close().catch(() => {});
  for (const document of await db.collection('provider_documents').find({ applicationId: appId }).toArray()) {
    assert.match(document.storageKey, /^quarantine\/[a-f0-9]{32}$/);
    const target = path.resolve(storageRoot, document.storageKey); assert(target.startsWith(storageRoot + path.sep));
    await rm(target, { force: true });
  }
  await db.collection('provider_documents').deleteMany({ applicationId: appId });
  for (const name of ['provider_applications', 'provider_profiles', 'admin_credentials', 'sessions']) await db.collection(name).deleteMany({ userId });
  await db.collection('users').deleteOne({ _id: userId });
  await db.collection('audit_logs').deleteMany({ actorId: userId });
  await db.close(); for (const browser of browsers) await browser.close();
  report.cleanup = true;
  await writeFile(`docs/quality/guide-runs/office-documents-${reproduce ? 'before' : 'local-latest'}.json`, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
}
