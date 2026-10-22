import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import mongoose from 'mongoose';
import { chromium, webkit, expect } from '@playwright/test';
import { readEnvironmentFile } from './environment-file.mjs';

const env = await readEnvironmentFile('.env.local'), uri = new URL(env.MONGODB_URI);
assert(['localhost', '127.0.0.1'].includes(uri.hostname) && uri.port === '27018', 'Local database only');
const connection = await mongoose.createConnection(uri.href).asPromise();
const base = 'http://127.0.0.1:4173', output = '.tmp/office-location';
const before = await connection.collection('admin_settings').find({ namespace: { $in: ['platform', 'contact'] } }).toArray();
const report = { status: 'RUNNING', mockedRoutes: false, checks: [], browserErrors: [], cleanup: false };
let browser;
await mkdir(output, { recursive: true });
try {
  const rate = await fetch(base + '/api/v1/public/bootstrap');
  if (rate.status === 429 || Number(rate.headers.get('ratelimit-remaining')) < 65) await new Promise(resolve => setTimeout(resolve, 60000));
  for (const [name, engine, locale, width] of [['chromium', chromium, 'ar', 390], ['webkit', webkit, 'en', 1440]]) {
    browser = await engine.launch();
    const context = await browser.newContext({ viewport: { width, height: 1000 } });
    const login = await context.request.post(base + '/api/v1/auth/login', { data: { email: 'admin.demo@example.invalid', password: 'LocalPreview-Admin-Only-2026!' } });
    assert.equal(login.status(), 200);
    const page = await context.newPage();
    page.on('pageerror', error => report.browserErrors.push(String(error)));
    for (const namespace of ['platform', 'contact']) {
      const address = locale === 'ar' ? `مقر الاختبار المحلي ${namespace}` : `Local test office ${namespace}`;
      const map = `https://maps.google.com/?q=${namespace}-${name}`;
      await page.goto(`${base}/admin/settings/${namespace}?lang=${locale}`);
      await expect(page.locator('[data-auth-resolution=pending]')).toHaveCount(0);
      await expect(page.locator('#site-intro')).toBeHidden();
      const form = page.getByTestId(`admin-settings-${namespace}-form`);
      await form.locator(`#admin-settings-office_address-${locale}`).fill(address);
      await form.locator('#admin-settings-map_url').fill(map);
      await form.locator(`#admin-settings-${namespace}-reason`).fill('Verify local footer location from admin');
      const [saved] = await Promise.all([
        page.waitForResponse(response => response.url().endsWith(`/admin/settings/${namespace}`) && response.request().method() === 'PUT'),
        form.locator('button[type="submit"]').click()
      ]);
      assert.equal(saved.status(), 200, await saved.text());
      const bootstrap = await context.request.get(base + '/api/v1/public/bootstrap');
      assert.equal(bootstrap.status(), 200);
      const contact = (await bootstrap.json()).data.contact;
      assert.equal(contact.address[locale], address); assert.equal(contact.mapUrl, map);
      await page.goto(`${base}/?lang=${locale}`);
      const footer = page.locator('.public-site-footer');
      await expect(footer.getByRole('link', { name: address, exact: true })).toHaveAttribute('href', map);
      await expect(footer.getByRole('link', { name: address, exact: true })).toHaveAttribute('target', '_blank');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      await footer.screenshot({ path: `${output}/${name}-${namespace}-footer.png` });
      report.checks.push(`${name} ${locale} ${width}: ${namespace} UI saves address and map; public bootstrap and footer reflect the latest save`);
    }
    await context.request.post(base + '/api/v1/auth/logout');
    await browser.close(); browser = undefined;
  }
  assert.deepEqual(report.browserErrors, []);
  report.status = 'PASS_LOCAL';
} catch (error) { report.status = 'FAIL_LOCAL'; report.error = String(error.stack ?? error); process.exitCode = 1; }
finally {
  await browser?.close().catch(() => {});
  await connection.collection('admin_settings').deleteMany({ namespace: { $in: ['platform', 'contact'] } });
  if (before.length) await connection.collection('admin_settings').insertMany(before);
  await connection.collection('audit_logs').deleteMany({ targetType: 'admin_settings', reason: 'Verify local footer location from admin' });
  await connection.close(); report.cleanup = true;
  await mkdir('docs/quality/guide-runs', { recursive: true });
  await writeFile('docs/quality/guide-runs/office-location-local-latest.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
}
