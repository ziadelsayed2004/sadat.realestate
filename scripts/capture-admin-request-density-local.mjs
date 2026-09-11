import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium, devices, expect } from '@playwright/test';

const phase = process.argv[2];
assert.ok(['before', 'after'].includes(phase));
const base = 'http://127.0.0.1:4174';
const directory = 'docs/quality/figma_parity/screens/ADM-18';
await mkdir(directory, { recursive: true });
const browser = await chromium.launch();
const report = { phase, environment: 'local-real-browser-API', mockedRoutes: false, sourceNode: '6017:69859', runs: [] };
try {
  for (const [device, options] of [['Desktop', { viewport: { width: 1577, height: 944 } }], ['Tablet', { viewport: { width: 768, height: 1024 } }], ['Pixel5', devices['Pixel 5']]]) {
    for (const locale of ['ar', 'en']) {
      const context = await browser.newContext(options);
      try {
        assert.equal((await context.request.post(`${base}/api/v1/auth/login`, { data: { email: 'admin.operations@example.invalid', password: 'LocalPreview-Admin-Only-2026!' } })).status(), 200);
        const page = await context.newPage();
        await page.goto(`${base}/admin/requests?lang=${locale}`, { waitUntil: 'networkidle' });
        await expect(page.locator('.admin-requests__table tbody tr').first()).toBeVisible();
        const metrics = await page.evaluate(() => {
          const measure = selector => {
            const element = document.querySelector(selector);
            const box = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            return { x: box.x, y: box.y, width: box.width, height: box.height, fontSize: style.fontSize,
              fontFamily: style.fontFamily, color: style.color, background: style.backgroundColor, padding: style.padding };
          };
          return { innerWidth, scrollWidth: document.documentElement.scrollWidth,
            heading: measure('.admin-requests__heading h1'), filters: measure('.admin-requests__filters'),
            table: measure('.admin-requests__table'), row: measure('.admin-requests__table tbody tr'),
            header: measure('.admin-requests__table thead'), content: measure('.admin-requests__content') };
        });
        assert.equal(metrics.innerWidth, options.viewport.width);
        assert.equal(metrics.scrollWidth, metrics.innerWidth);
        const screenshot = `${directory}/density-${phase}-${device}-${locale}.png`;
        await page.screenshot({ path: screenshot });
        const checks = [];
        if (phase === 'after') {
          const copy = JSON.parse(await readFile(`apps/web/src/features/localization/messages/${locale}.json`, 'utf8'))['admin_requests/copy#getAdminRequestsCopy'];
          const origin = await page.evaluate(() => performance.timeOrigin);
          const response = () => page.waitForResponse(item => new URL(item.url()).pathname === '/api/v1/admin/requests');
          let pending = response();
          await page.locator('.admin-requests__quick-status').getByRole('button', { name: copy.statusLabel.new, exact: true }).click();
          let loaded = await pending;
          assert.equal(loaded.status(), 200);
          assert.equal(new URL(loaded.url()).searchParams.get('status'), 'new');
          await page.locator('.admin-requests__advanced-filters summary').click();
          await page.locator('#admin-requests-status').selectOption('closed');
          await page.locator('#admin-requests-type').selectOption('contact');
          pending = response();
          await page.getByRole('button', { name: copy.apply, exact: true }).click();
          loaded = await pending;
          assert.equal(loaded.status(), 200);
          assert.equal(new URL(loaded.url()).searchParams.get('status'), 'closed');
          assert.equal(new URL(loaded.url()).searchParams.get('type'), 'contact');
          pending = response();
          await page.getByRole('button', { name: copy.clear, exact: true }).click();
          assert.equal((await pending).status(), 200);
          await page.locator('.admin-requests__advanced-filters summary').click();
          await page.locator('#admin-requests-search').fill('no-match-density-verification');
          pending = response();
          await page.locator('#admin-requests-search').press('Enter');
          assert.equal((await pending).status(), 200);
          await expect(page.locator('[data-admin-requests-state="empty"]')).toBeVisible();
          assert.equal(await page.evaluate(() => performance.timeOrigin), origin);
          checks.push('quick_status_real_API', 'advanced_status_and_type_real_API', 'clear_restores_results', 'search_enter_empty_without_navigation');
        }
        report.runs.push({ device, locale, metrics, screenshot, checks, status: 'PASS' });
      } finally {
        await context.request.post(`${base}/api/v1/auth/logout`);
        await context.close();
      }
    }
  }
} finally { await browser.close(); }
report.finishedAt = new Date().toISOString();
await writeFile(`${directory}/density-${phase}-2026-09-11.json`, `${JSON.stringify(report, null, 2)}\n`);
console.log(`ADM18_DENSITY_${phase.toUpperCase()} runs=${report.runs.length}`);
