import assert from 'node:assert/strict';
import { mkdir, writeFile, copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

// Deliberately loopback-only: this audit must not send OTPs or use production data.
const api = 'http://127.0.0.1:3000/api/v1';
const site = 'http://127.0.0.1:4173';
const mail = 'http://127.0.0.1:8025/api/messages';
const email = 'broker.demo@example.invalid';
const output = resolve('docs/quality/provider-live-local-responsive-2026-09-05');
await mkdir(output, { recursive: true });
// Keep the original failed run as evidence instead of replacing it with a green rerun.
await copyFile(resolve(output, 'results.json'), resolve(output, 'before-fixture-repair.json'), 1).catch(error => {
  if (!['ENOENT', 'EEXIST'].includes(error.code)) throw error;
});
async function post(path, payload) {
  const response = await fetch(`${api}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
  const body = await response.json();
  assert.ok(response.ok, `${path}: HTTP ${response.status} ${body.error?.code ?? ''}`);
  return body.data;
}
const identity = { email, roleType: 'provider', purpose: 'login' };
const resumeChallenge = process.env.LOCAL_AUDIT_CHALLENGE_ID;
const started = Date.now() - (resumeChallenge ? 5 * 60_000 : 0);
const sent = resumeChallenge ? { challengeId: resumeChallenge } : await post('/auth/otp/send', identity);
let code;
for (let attempt = 0; attempt < 20; attempt++) {
  const inbox = await (await fetch(mail)).json();
  const message = inbox.messages.find(item => item.to.includes(email) && new Date(item.receivedAt).getTime() >= started);
  code = message?.raw.replace(/=\r?\n/g, '').match(/Your verification code is:\s*(\d{6})/)?.[1];
  if (code) break;
  await new Promise(resolve => setTimeout(resolve, 250));
}
assert.ok(code, 'No new local OTP received for the synthetic broker account');
const authenticated = await post('/auth/otp/verify', { ...identity, challengeId: sent.challengeId, code });
assert.equal(authenticated.outcome, 'authenticated');
const session = { ...authenticated };
delete session.outcome;
console.log('LOCAL_PROVIDER_SESSION_OK');
const routes = ['/provider', '/provider/properties', '/provider/projects', '/provider/customer-requests', '/provider/viewings', '/provider/ads', '/provider/commission', '/provider/notifications', '/provider/settings?tab=account', '/provider/settings?tab=contact', '/provider/settings?tab=security'];
const viewports = [{ name: 'desktop', width: 1577, height: 944 }, { name: 'tablet', width: 768, height: 1024 }, { name: 'mobile', width: 390, height: 844 }];
const browser = await chromium.launch({ headless: true });
const rows = [];
try {
  for (const locale of ['ar', 'en']) for (const viewport of viewports) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, locale });
    // Only session bootstrap is injected. All provider data endpoints are real local API calls.
    await context.route('**/api/v1/auth/refresh', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: session, meta: { requestId: 'local-responsive-audit' } }) }));
    for (const route of routes) {
      const page = await context.newPage();
      const failures = [];
      const apiResponses = [];
      page.on('pageerror', error => failures.push(error.message));
      page.on('response', response => {
        if (response.url().includes('/api/v1/provider/')) apiResponses.push({ path: new URL(response.url()).pathname, status: response.status() });
      });
      const url = new URL(route, site); url.searchParams.set('lang', locale);
      let result;
      try {
        await page.goto(url.toString(), { waitUntil: 'networkidle', timeout: 20000 });
        await page.locator('.provider-dashboard').waitFor({ timeout: 10000 });
        result = await page.evaluate(() => ({ width: innerWidth, documentWidth: document.documentElement.scrollWidth, direction: document.documentElement.dir, headings: [...document.querySelectorAll('h1')].map(node => node.textContent?.trim()), state: document.querySelector('.provider-dashboard [data-state]')?.getAttribute('data-state'), activeLinks: document.querySelectorAll('.provider-dashboard__navigation [aria-current="page"]').length }));
        result.overflow = result.documentWidth > result.width + 1;
      } catch (error) { failures.push(error.message); }
      const row = { route, locale, viewport: viewport.name, ...result, apiResponses, failures };
      row.apiErrors = apiResponses.filter(item => item.status >= 400);
      row.layoutCheckPassed = !!result && !row.overflow && failures.length === 0 && row.apiErrors.length === 0;
      if (row.overflow || failures.length || row.apiErrors.length || ['/provider/customer-requests', '/provider', '/provider/settings?tab=account'].includes(route)) {
        row.screenshot = `${locale}-${viewport.name}-${routes.indexOf(route)}.png`;
        await page.screenshot({ path: resolve(output, row.screenshot), fullPage: true });
      }
      rows.push(row);
      console.log(JSON.stringify({ route, locale, viewport: viewport.name, overflow: row.overflow, failures: failures.length, apiErrors: apiResponses.filter(item => item.status >= 400).length }));
      await page.close();
    }
    await context.close();
  }
} finally {
  await browser.close();
  await writeFile(resolve(output, 'results.json'), JSON.stringify({ generatedAt: new Date().toISOString(), scope: 'Real local provider API, synthetic broker, injected session bootstrap; layout/read-only route audit, not Figma parity or mutation journeys', rows }, null, 2));
}
