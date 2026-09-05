import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
const api = 'http://127.0.0.1:3000/api/v1';
const email = `document-probe-${randomUUID()}@example.invalid`;
let token;
async function request(path, method = 'GET', data, extra = {}) {
  const response = await fetch(`${api}${path}`, { method, headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(data ? { 'content-type': 'application/json' } : {}), ...extra }, ...(data ? { body: typeof data === 'string' ? data : JSON.stringify(data) } : {}) });
  const body = await response.json();
  assert.ok(response.ok, `${path}: HTTP ${response.status} ${body.error?.code ?? ''}`);
  return body.data;
}
const identity = { email, roleType: 'provider', purpose: 'registration' };
const started = Date.now();
const sent = await request('/auth/otp/send', 'POST', identity);
let code;
for (let attempt = 0; attempt < 20; attempt++) {
  const inbox = await (await fetch('http://127.0.0.1:8025/api/messages')).json();
  const message = inbox.messages.find(item => item.to.includes(email) && new Date(item.receivedAt).getTime() >= started);
  code = message?.raw.replace(/=\r?\n/g, '').match(/Your verification code is:\s*(\d{6})/)?.[1];
  if (code) break;
  await new Promise(resolve => setTimeout(resolve, 250));
}
assert.ok(code, 'Synthetic local OTP not received');
const verified = await request('/auth/otp/verify', 'POST', { ...identity, challengeId: sent.challengeId, code });
const registration = await request('/provider/application', 'POST', { verificationToken: verified.verificationToken, providerType: 'individual_broker', password: `Probe!${randomUUID()}aA9` });
token = registration.session.accessToken;
assert.ok(token);
const locations = (await request('/public/properties?page=1&limit=1')).locations;
assert.ok(locations?.length);
const application = await request('/provider/application');
await request('/provider/application/account', 'PATCH', { version: application.version, accountOwnerFullName: 'Synthetic Document Probe', displayName: 'Synthetic Document Probe', email, primaryLocationId: locations[0].id, serviceAreaIds: [locations[0].id], preferredLocale: 'ar', termsAcceptedAt: new Date().toISOString(), privacyAcceptedAt: new Date().toISOString() });
const ids = [];
for (const category of ['government_id_front', 'government_id_back']) {
  const uploaded = await request('/provider/application/documents', 'POST', '%PDF-1.7\nSynthetic test document, no personal data.\n%%EOF', { 'content-type': 'application/pdf', 'x-document-category': category, 'x-file-name': `${category}-synthetic.pdf` });
  assert.equal(uploaded.securityState, 'clean'); ids.push(uploaded.id);
}
const listed = await request('/provider/application/documents');
assert.deepEqual(listed.items.map(item => item.id).sort(), ids.sort());
assert.ok(listed.items.every(item => !('storageKey' in item) && item.active));
const reloaded = await request('/provider/application');
assert.deepEqual(reloaded.missingFields, []);
assert.deepEqual(reloaded.missingDocuments, []);
await writeFile(new URL('../docs/quality/provider-document-live-api-2026-09-05.json', import.meta.url), JSON.stringify({ generatedAt: new Date().toISOString(), scope: 'Real loopback OTP registration, account PATCH, two synthetic PDF uploads, list and application reload; no browser or approval submission', applicationId: reloaded.id, documentCount: listed.items.length, requiredFieldsComplete: true, requiredDocumentsComplete: true, optionalDocumentsUploaded: false, privateKeysAbsent: true, retainedSyntheticDraft: true }, null, 2));
console.log('LOCAL_PROVIDER_DOCUMENT_API_OK required=2 optional=0 draftRetained=true');
if (process.argv.includes('--browser')) {
  const { chromium, expect } = await import('@playwright/test');
  const { mkdir } = await import('node:fs/promises');
  const directory = new URL('../docs/quality/provider-document-live-browser/', import.meta.url);
  await mkdir(directory, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const results = [];
  try {
    for (const locale of ['ar', 'en']) for (const width of [1440, 768, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      await page.route('**/api/v1/auth/refresh', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: registration.session, meta: { requestId: 'local-document-browser' } }) }));
      const failures = [];
      page.on('pageerror', error => failures.push(error.message));
      await page.goto(`http://127.0.0.1:4173/auth/register/provider/account?providerType=individual_broker&step=documents&lang=${locale}`);
      for (let opening = 0; opening < 2; opening++) {
        if (opening) await page.reload();
        for (const category of ['government_id_front', 'government_id_back']) {
          await expect(page.getByTestId(`provider-document-file-${category}`)).toContainText(`${category}-synthetic.pdf`);
        }
        await expect(page.getByRole('button', { name: locale === 'ar' ? 'مراجعة الطلب' : 'Review application', exact: true })).toBeEnabled();
      }
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      assert.deepEqual(failures, []);
      await page.screenshot({ path: new URL(`${locale}-${width}.png`, directory).pathname.replace(/^\/(\w:)/, '$1'), fullPage: true });
      results.push({ locale, width, reloadRestoresTwoFiles: true, reviewEnabled: true, overflow: false });
      console.log(`DOCUMENT_BROWSER_OK ${locale} ${width}`);
      await page.close();
    }
  } finally { await browser.close(); }
  await writeFile(new URL('results.json', directory), JSON.stringify({ scope: 'Real local document/application GET requests after API upload; injected real session bootstrap only; no browser upload or submission', results }, null, 2));
}
