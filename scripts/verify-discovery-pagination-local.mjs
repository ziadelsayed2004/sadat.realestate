import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { chromium, devices, expect } from '@playwright/test';

const base = process.env.LOCAL_GUIDE_BASE_URL ?? 'http://127.0.0.1:4173';
const report = {
  status: 'RUNNING',
  journeys: ['GUIDE-01', 'GUIDE-02'],
  environment: 'local-real-browser-api',
  mockedRoutes: false,
  commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  runs: [],
  startedAt: new Date().toISOString(),
};

assert.equal((await fetch(`${base}/health`)).status, 200);
const browser = await chromium.launch();
let stage = 'setup';

try {
  for (const locale of ['ar', 'en']) {
    for (const [device, preset] of [['desktop', 'Desktop Chrome'], ['tablet', 'Galaxy Tab S4'], ['mobile', 'Pixel 5']]) {
      stage = `${locale}/${device}`;
      const context = await browser.newContext({ ...devices[preset] });
      try {
        const page = await context.newPage();
        const initialResponse = await context.request.get(`${base}/api/v1/public/properties?page=999&limit=20`);
        assert.equal(initialResponse.status(), 200);
        await page.goto(`${base}/properties?lang=${locale}&page=999`, { waitUntil: 'networkidle' });
        const empty = page.locator('.public-property-listing__state[data-state="empty"]');
        await expect(empty).toBeVisible();
        const timeOrigin = await page.evaluate(() => performance.timeOrigin);
        const navigationCount = await page.evaluate(() => performance.getEntriesByType('navigation').length);

        const recovered = page.waitForResponse(response => {
          const url = new URL(response.url());
          return response.request().method() === 'GET'
            && url.pathname === '/api/v1/public/properties'
            && url.searchParams.get('page') === '1'
            && response.status() === 200;
        });
        await empty.locator('button').last().click();
        await recovered;
        await expect(page.locator('[data-listing-state="success"]')).toBeVisible();
        await expect(page.locator('.public-property-listing__card').first()).toBeVisible();

        assert.equal(new URL(page.url()).pathname, '/properties');
        assert.equal(new URL(page.url()).searchParams.get('page'), null);
        assert.equal(await page.evaluate(() => performance.timeOrigin), timeOrigin);
        assert.equal(await page.evaluate(() => performance.getEntriesByType('navigation').length), navigationCount);
        const geometry = await page.evaluate(() => ({ innerWidth, scrollWidth: document.documentElement.scrollWidth }));
        assert.equal(geometry.innerWidth, page.viewportSize().width);
        assert.ok(geometry.scrollWidth <= geometry.innerWidth);
        report.runs.push({
          locale,
          device,
          check: 'out_of_range_empty_page_recovers_to_page_one_without_navigation',
          initialHttpStatus: 200,
          recoveredHttpStatus: 200,
          documentReloaded: false,
          ...geometry,
        });
      } finally {
        await context.close();
      }
    }
  }
  report.status = 'PASS_LOCAL_SUBCASES';
} catch (error) {
  report.status = 'FAIL_LOCAL';
  report.failure = `${stage}: ${error instanceof Error ? error.message.slice(0, 700) : 'Unknown failure'}`;
  process.exitCode = 1;
} finally {
  await browser.close();
  report.finishedAt = new Date().toISOString();
  await writeFile('docs/quality/guide-runs/discovery-pagination-local-latest.json', `${JSON.stringify(report, null, 2)}\n`);
}

console.log(JSON.stringify({ status: report.status, cases: report.runs.length, mockedRoutes: report.mockedRoutes }));
