import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import mongoose from 'mongoose';
import { chromium, webkit, expect } from '@playwright/test';
import { readEnvironmentFile } from './environment-file.mjs';

const env = await readEnvironmentFile('.env.local'), uri = new URL(env.MONGODB_URI);
assert(['localhost', '127.0.0.1'].includes(uri.hostname) && uri.port === '27018', 'Local database only');
const connection = await mongoose.createConnection(uri.href).asPromise();
const base = 'http://127.0.0.1:4173', output = '.tmp/featured-automatic';
const ids = Array.from({ length: 5 }, () => new mongoose.Types.ObjectId()), targetId = ids[4];
const suffix = Date.now(), report = { status: 'RUNNING', mockedRoutes: false, checks: [], browserErrors: [], cleanup: false };
let browser;
await mkdir(output, { recursive: true });
try {
  const rate = await fetch(base + '/api/v1/public/bootstrap');
  if (rate.status === 429 || Number(rate.headers.get('ratelimit-remaining')) < 70) await new Promise(resolve => setTimeout(resolve, 60000));
  const template = await connection.collection('properties').findOne({ status: 'published', active: true });
  assert(template, 'A local published fixture is required');
  const stamp = new Date();
  await connection.collection('properties').insertMany(ids.map((id, index) => {
    const property = { ...template, _id: id, slug: `featured-auto-${suffix}-${index}`, name: { ar: `عقار تلقائي ${index}`, en: `Automatic property ${index}` }, version: 0, featured: index < 4, featuredOrder: index < 4 ? 0 : 99999, featuredAt: index < 4 ? new Date(stamp.getTime() - 60000 + index) : undefined, createdAt: stamp, updatedAt: stamp };
    delete property.publicCode; delete property.expiresAt;
    return property;
  }));
  const home = async () => {
    const response = await fetch(base + '/api/v1/public/home');
    assert.equal(response.status, 200);
    return (await response.json()).data;
  };
  assert(!(await home()).properties.slice(0, 3).some(property => property.id === String(targetId)));
  report.checks.push('Reproduced selection outside the first three behind four older featured properties');
  for (const [name, engine, locale, width] of [['chromium', chromium, 'ar', 390], ['webkit', webkit, 'en', 1440]]) {
    browser = await engine.launch();
    const context = await browser.newContext({ viewport: { width, height: 950 } });
    const login = await context.request.post(base + '/api/v1/auth/login', { data: { email: 'admin.demo@example.invalid', password: 'LocalPreview-Admin-Only-2026!' } });
    assert.equal(login.status(), 200);
    let token = (await login.json()).data.accessToken;
    await connection.collection('properties').updateOne({ _id: targetId }, { $unset: { expiresAt: '' }, $inc: { version: 1 } });
    const page = await context.newPage();
    page.on('pageerror', error => report.browserErrors.push(String(error)));
    page.on('response', response => {
      if (new URL(response.url()).pathname === '/api/v1/auth/refresh' && response.status() === 200) void response.json().then(body => { token = body.data.accessToken; }, () => {});
    });
    await page.goto(`${base}/admin/properties/review?propertyId=${targetId}&lang=${locale}`);
    await expect(page.locator('[data-auth-resolution=pending]')).toHaveCount(0);
    await expect(page.locator('#site-intro')).toBeHidden();
    const control = page.locator('#property-homepage-featured');
    await expect(control.getByRole('spinbutton')).toHaveCount(0);
    await control.getByRole('checkbox').check();
    const saveButton = control.getByRole('button', { name: locale === 'ar' ? 'حفظ التمييز' : 'Save featured selection' });
    const [saved] = await Promise.all([
      page.waitForResponse(response => response.url().endsWith(`/properties/${targetId}/featured`) && response.request().method() === 'PUT'),
      saveButton.click()
    ]);
    assert.equal(saved.status(), 200);
    assert.equal('order' in saved.request().postDataJSON(), false);
    const savedData = (await saved.json()).data;
    await expect(control.getByRole('status')).toContainText(locale === 'ar' ? 'تمت إضافة العقار في أول' : 'Property added first');
    const stored = await connection.collection('properties').findOne({ _id: targetId });
    assert(stored.featuredAt instanceof Date); assert.equal(stored.featured, true);
    assert.equal((await home()).properties[0].id, String(targetId));
    await control.screenshot({ path: `${output}/${name}-control.png` });
    await control.getByRole('link').click();
    await expect(page.locator('.public-homepage__property-card').first()).toContainText(locale === 'ar' ? 'عقار تلقائي 4' : 'Automatic property 4');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
    await page.locator('.public-homepage__property-card').first().screenshot({ path: `${output}/${name}-first-property.png` });
    const stale = await context.request.put(`${base}/api/v1/admin/properties/${targetId}/featured`, { headers: { authorization: `Bearer ${token}` }, data: { version: savedData.version - 1, featured: false, reason: 'Local stale request test' } });
    assert.equal(stale.status(), 409);
    await connection.collection('properties').updateOne({ _id: targetId }, { $set: { expiresAt: new Date('2020-01-01') }, $inc: { version: 1 } });
    await page.goto(`${base}/admin/properties/review?propertyId=${targetId}&lang=${locale}`);
    await expect(page.locator('[data-auth-resolution=pending]')).toHaveCount(0);
    const [expired] = await Promise.all([
      page.waitForResponse(response => response.url().endsWith(`/properties/${targetId}/featured`) && response.request().method() === 'PUT'),
      saveButton.click()
    ]);
    assert.equal(expired.status(), 200);
    await expect(control.getByRole('status')).toContainText(locale === 'ar' ? 'لن يظهر حتى' : 'must be published, active and unexpired');
    await expect(control.getByRole('link')).toHaveCount(0);
    assert(!(await home()).properties.some(property => property.id === String(targetId)));
    report.checks.push(`${name} ${locale} ${width}: save without order, latest selection first in real homepage, no overflow, stale write rejected, expired selection explained and excluded`);
    await context.request.post(base + '/api/v1/auth/logout');
    await browser.close(); browser = undefined;
  }
  assert.deepEqual(report.browserErrors, []);
  report.status = 'PASS_LOCAL';
} catch (error) { report.status = 'FAIL_LOCAL'; report.error = String(error.stack ?? error); process.exitCode = 1; }
finally {
  await browser?.close().catch(() => {});
  await connection.collection('properties').deleteMany({ _id: { $in: ids } });
  await connection.collection('audit_logs').deleteMany({ targetId: { $in: ids.map(String) }, targetType: 'property' });
  await connection.close(); report.cleanup = true;
  await mkdir('docs/quality/guide-runs', { recursive: true });
  await writeFile('docs/quality/guide-runs/homepage-featured-local-latest.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
}
