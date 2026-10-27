import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { routeAdminCommissionApis, commissionPolicyFixture } from '../apps/web/tests/e2e/admin-commissions.fixtures.ts';
import { routePublicHomepageApi, publicHomepageFixture } from '../apps/web/tests/e2e/public-fixtures.ts';
const require = createRequire(new URL('../apps/web/package.json', import.meta.url));
const { chromium, webkit } = require('@playwright/test');
const base = process.env.WEB_BASE_URL ?? 'http://127.0.0.1:4188';
assert.match(base, /^http:\/\/127\.0\.0\.1:\d+$/);
const output = '.local/commission-setup-qa';
await mkdir(output, { recursive: true });
const checks = [];
for (const [name, engine] of [['chromium', chromium], ['webkit', webkit]]) {
  const browser = await engine.launch();
  try {
    for (const width of [390, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 } });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await routeAdminCommissionApis(page);
      let saved;
      await page.route('**/api/v1/admin/commission-policies**', async route => {
        const method = route.request().method();
        if (method === 'POST') saved = { ...commissionPolicyFixture(), ...route.request().postDataJSON(), status: 'draft', version: 0 };
        if (method === 'PATCH') saved = { ...saved, ...route.request().postDataJSON(), version: saved.version + 1 };
        if (saved) { delete saved.expectedVersion; delete saved.reason; }
        await route.fulfill({ json: { data: method === 'GET' ? { items: saved ? [saved] : [], page: 1, limit: 20, total: saved ? 1 : 0 } : saved, meta: { requestId: 'commission-browser' } } });
      });
      await page.goto(`${base}/admin/commissions/new?lang=ar`);
      await page.getByRole('button', { name: 'تجهيز سياسة مالك العقار ٢٪' }).click();
      assert.equal(await page.locator('#admin-commission-policy-scope-key').inputValue(), 'individual_broker');
      assert.equal(await page.getByLabel('عمولة الإيجار (عدد الأشهر)').inputValue(), '0.5');
      await page.locator('.admin-commissions__form button[type=submit]').click();
      const reason = page.getByLabel('سبب اعتماد أو إيقاف السياسة');
      await reason.fill('اعتماد الاتفاق المحدد');
      await page.getByRole('button', { name: 'اعتماد وتفعيل السياسة', exact: true }).click();
      await page.getByText('السياسة معتمدة وتُطبق على الفئة المختارة.').waitFor();
      assert.equal(saved.percentageBps, 200); assert.equal(saved.rentMonths, 0.5);
      await page.getByRole('button', { name: 'تعديل عمولة البيع والإيجار', exact: true }).click();
      await page.getByLabel('عمولة الإيجار (عدد الأشهر)').last().fill('1');
      await page.getByRole('button', { name: 'حفظ تعديل العمولة', exact: true }).click();
      await page.waitForFunction(() => !Array.from(document.querySelectorAll('button')).some(button => button.textContent === 'حفظ تعديل العمولة'));
      assert.equal(saved.percentageBps, 200); assert.equal(saved.rentMonths, 1);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.screenshot({ path: `${output}/${name}-${width}-policy.png`, fullPage: true });
      await routePublicHomepageApi(page);
      const homepage = publicHomepageFixture();
      homepage.data.properties[0].layout.floor = 2; homepage.data.properties[0].viewCount = 0;
      await page.route('**/api/v1/public/home**', route => route.fulfill({ json: homepage }));
      await page.goto(`${base}/?lang=ar`);
      const card = page.locator('.public-homepage__property-card').filter({ has: page.locator('a[href^="/properties/published-home"]') }).first();
      await card.waitFor();
      assert.match((await card.locator('.public-property-views strong').innerText()).trim(), /^[0٠]$/u);
      const floor = card.locator('.ui-property-card__features > div').nth(3);
      assert.equal((await floor.locator('dd').innerText()).trim(), '2');
      assert(await floor.locator('dt').isVisible());
      assert(await floor.locator('dd').evaluate(element => { const style = getComputedStyle(element, '::before'); return style.display === 'none' || style.content === 'none'; }));
      await card.screenshot({ path: `${output}/${name}-${width}-views-floor.png` });
      assert.deepEqual(errors, []);
      checks.push(`${name} ${width}: owner 2%, rent .5→1 month, activation/edit and distinct views/floor`);
      await page.close();
    }
  } finally { await browser.close(); }
}
await writeFile(`${output}/result.json`, JSON.stringify({ status: 'PASS', checks }, null, 2));
console.log(`COMMISSION_SETUP_BROWSER_PASS checks=${checks.length}`);
