import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import mongoose from 'mongoose';
import { chromium, webkit, expect } from '@playwright/test';
import { readEnvironmentFile } from './environment-file.mjs';

const env = await readEnvironmentFile('.env.local'), uri = new URL(env.MONGODB_URI);
assert(['localhost', '127.0.0.1'].includes(uri.hostname) && uri.port === '27018', 'Local fixture database only');
const db = await mongoose.createConnection(uri.href).asPromise(), base = 'http://127.0.0.1:4173';
const id = new mongoose.Types.ObjectId(), stamp = new Date(), prefix = `exact-price-${Date.now()}`;
const previous = await db.collection('admin_settings').findOne({ namespace: 'display' });
const report = { status: 'RUNNING', apiMocks: false, checks: [], browserErrors: [], cleanup: false };
const contexts = []; let browser, lastSetting;
const output = '.tmp/exact-price'; await mkdir(output, { recursive: true });
async function json(response) { assert.equal(response.status(), 200, (await response.text()).slice(0,500)); return (await response.json()).data; }
async function rateWindow() {
  const response = await fetch(base + '/api/v1/public/bootstrap');
  if (response.status === 429 || Number(response.headers.get('ratelimit-remaining')) < 55) await new Promise(resolve => setTimeout(resolve, 60_000));
}
function normalized(value) { return value.replace(/[٠-٩]/gu, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit))).replace(/٬/gu, ',').replace(/٫/gu, '.'); }
async function visit(page, path) { await page.waitForLoadState('networkidle'); await page.goto(base + path); await page.waitForLoadState('networkidle'); }
try {
  const template = await db.collection('properties').findOne({ status: 'published', active: true }); assert(template);
  const property = { ...template, _id: id, slug: prefix, name: { ar: prefix, en: prefix }, price: { amount: 3_250_000, currency: 'EGP' }, featured: true, featuredOrder: 0, featuredAt: stamp, homepageExcluded: false, status: 'published', active: true, version: 0, createdAt: stamp, updatedAt: stamp };
  for (const key of ['publicCode', 'expiresAt', 'parentPropertyId', 'projectId']) delete property[key];
  await db.collection('properties').insertOne(property);
  for (const engine of [chromium, webkit]) {
    await rateWindow(); browser = await engine.launch();
    const admin = await browser.newContext(), guest = await browser.newContext(); contexts.push(admin,guest);
    const login = await json(await admin.request.post(base + '/api/v1/auth/login', { data: { email: 'admin.demo@example.invalid', password: 'LocalPreview-Admin-Only-2026!' } }));
    const headers = { authorization: `Bearer ${login.accessToken}` };
    const adminPage = await admin.newPage(), page = await guest.newPage();
    for (const item of [adminPage,page]) item.on('pageerror', error => report.browserErrors.push(String(error)));
    const data = await json(await guest.request.get(base + `/api/v1/public/properties/${prefix}`)); assert.equal(data.price.amount, 3_250_000);
    for (const enabled of [false,true,false]) {
      await rateWindow(); await visit(adminPage, '/admin/settings/display?lang=en');
      const field = adminPage.getByRole('checkbox', { name: 'Round property prices to millions' }); await expect(field).toBeVisible();
      const current = await json(await admin.request.get(base + '/api/v1/admin/settings/display', { headers }));
      if (current.values.round_property_prices !== enabled) {
        await field.setChecked(enabled);
        await adminPage.locator('#admin-settings-display-reason').fill(`${prefix} ${enabled ? 'enable' : 'disable'}`);
        const saved = adminPage.waitForResponse(response => response.url().endsWith('/api/v1/admin/settings/display') && response.request().method() === 'PUT');
        await adminPage.getByRole('button', { name: 'Save changes', exact: true }).click();
        lastSetting = await json(await saved); assert.equal(lastSetting.values.round_property_prices, enabled);
      }
      const bootstrap = await json(await guest.request.get(base + '/api/v1/public/bootstrap')); assert.equal(bootstrap.display.roundPropertyPrices === true, enabled);
      for (const width of [390,1440]) {
        await rateWindow(); await page.setViewportSize({ width, height: 950 });
        const routes = [
          { name: 'details', path: `/properties/${prefix}`, price: '.public-property-details__price' },
          { name: 'listing', path: `/properties?search=${prefix}`, price: '.public-property-listing__card .ui-property-card__price' },
          { name: 'compare', path: `/compare?propertyIds=${id}`, price: '.public-property-comparison__cards .ui-property-card__price' },
          { name: 'home', path: '/', price: `.public-homepage__property-card:has(a[href*="${prefix}"]) .ui-property-card__price` }
        ];
        for (const route of routes) {
          const path = `${route.path}${route.path.includes('?') ? '&' : '?'}lang=ar`;
          const html = await (await guest.request.get(base + path)).text();
          assert(html.includes(`id="sadat-public-price-rounding" type="application/json"`) && html.includes(`>${enabled}</script>`));
          assert(normalized(html).includes(enabled ? 'حوالي 3.3 مليون جنيه' : '3,250,000'), 'the initial server render uses the saved presentation policy');
          await visit(page, path); const price = page.locator(route.price).first(); await expect(price).toBeVisible();
          const text = normalized(await price.innerText());
          assert(enabled ? text.includes('حوالي 3.3 مليون جنيه') : text.includes('3,250,000') && !text.includes('حوالي'), text);
          assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
          if (route.name === 'details') {
            const ld = await page.locator('script[type="application/ld+json"]').first().textContent(); assert(ld.includes('3250000'), 'SEO retains the exact amount even when the visible label is approximate');
            await page.locator('.public-property-details__summary').screenshot({ path: `${output}/${engine.name()}-${enabled ? 'rounded' : 'exact'}-${width}.png` });
          }
        }
        report.checks.push(`${engine.name()} ${width}px ${enabled ? 'rounding ON' : 'rounding OFF'}: real admin toggle persists, bootstrap/SSR/hydrated home/list/details/comparison agree, SEO and stored price stay exact, no horizontal overflow`);
      }
      assert.equal((await db.collection('properties').findOne({ _id: id })).price.amount, 3_250_000);
    }
    await db.collection('properties').updateOne({ _id: id }, { $set: { 'price.amount': 3_250_000.75 } });
    await visit(page, `/properties/${prefix}?lang=en`); await expect(page.locator('.public-property-details__price')).toContainText('3,250,000.75');
    await db.collection('properties').updateOne({ _id: id }, { $set: { 'price.amount': 3_250_000 } });
    await admin.request.post(base + '/api/v1/auth/logout', { data: {} });
    await admin.close(); await guest.close(); contexts.splice(0); await browser.close(); browser = undefined;
  }
  assert.deepEqual(report.browserErrors, []); report.status = 'PASS_LOCAL';
} catch(error) { report.status = 'FAIL_LOCAL'; report.error = String(error.stack ?? error); process.exitCode = 1; }
finally {
  for(const context of contexts) await context.close().catch(()=>{}); await browser?.close().catch(()=>{});
  if(lastSetting) {
    const current = await db.collection('admin_settings').findOne({ namespace: 'display' });
    assert.equal(current.version,lastSetting.version,'do not replace concurrent settings edits');
    if(previous) await db.collection('admin_settings').replaceOne({ _id: current._id, version: current.version },previous);
    else await db.collection('admin_settings').deleteOne({ _id: current._id, version: current.version });
  }
  await db.collection('properties').deleteOne({ _id:id,slug:prefix });
  for(const name of ['property_view_events','property_reports']) await db.collection(name).deleteMany({ propertyId:id });
  await db.collection('audit_logs').deleteMany({ targetType:'admin_settings',targetId:'display',reason:{ $regex:`^${prefix} ` } });
  assert.deepEqual(await db.collection('admin_settings').findOne({ namespace:'display' }),previous);
  await db.close(); report.cleanup=true;
  await writeFile('docs/quality/guide-runs/exact-price-local-latest.json',JSON.stringify(report,null,2)+'\n'); console.log(JSON.stringify(report,null,2));
}
