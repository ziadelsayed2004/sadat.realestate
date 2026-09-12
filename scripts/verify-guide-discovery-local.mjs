import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';

const base = 'http://127.0.0.1:4173';
const profiles = [
  { device: 'desktop', width: 1280, height: 900, isMobile: false },
  { device: 'tablet', width: 712, height: 1024, isMobile: false },
  { device: 'mobile', width: 393, height: 851, isMobile: true },
];
const report = {
  journeys: ['GUIDE-01', 'GUIDE-02'], environment: 'local-real-browser-api', mockedRoutes: false,
  commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  startedAt: new Date().toISOString(), status: 'RUNNING', runs: []
};
const browser = await chromium.launch({ headless: true });

try {
  for (const locale of ['ar', 'en']) for (const profile of profiles) {
    const context = await browser.newContext({ viewport: { width: profile.width, height: profile.height }, isMobile: profile.isMobile });
    const page = await context.newPage();
    const run = { locale, device: profile.device, checks: [], publicHttpStatuses: [], pageErrors: 0 };
    page.on('pageerror', () => { run.pageErrors += 1; });
    page.on('response', response => {
      const path = new URL(response.url()).pathname;
      if (path.startsWith('/api/v1/public/')) run.publicHttpStatuses.push(response.status());
    });

    await page.goto(`${base}/?lang=${locale}`, { waitUntil: 'networkidle' });
    await expect(page.locator('[data-page="public-home"]')).toBeVisible();
    await page.locator('.public-homepage__search button[type="submit"]').click();
    await expect(page).toHaveURL(/\/properties\?/u);
    await expect(page.locator('[data-listing-state="success"]')).toBeVisible();
    run.checks.push('homepage_search_to_listing');

    await page.locator('input[name="transactionType"][value="rent"]').check();
    await expect(page).toHaveURL(/transactionType=rent/u);
    await expect(page.locator('[data-listing-state="success"]')).toBeVisible();
    run.checks.push('filter_updates_results');

    const documentStart = await page.evaluate(() => performance.timeOrigin);
    await context.setOffline(true);
    await page.locator('input[name="transactionType"][value="sale"]').check();
    await expect(page.locator('[data-listing-state="retry"]')).toBeVisible();
    await context.setOffline(false);
    const retryResponse = page.waitForResponse(response => new URL(response.url()).pathname === '/api/v1/public/properties');
    await page.locator('.public-property-listing__state button').click();
    assert.equal((await retryResponse).status(), 200);
    await expect(page.locator('[data-listing-state="success"], [data-listing-state="empty"]')).toBeVisible();
    assert.equal(await page.evaluate(() => performance.timeOrigin), documentStart);
    run.checks.push('offline_filter_retry_recovers_without_navigation');

    await page.goto(`${base}/properties?lang=${locale}&search=guide-no-match-${Date.now()}`, { waitUntil: 'networkidle' });
    await expect(page.locator('[data-listing-state="empty"]')).toBeVisible();
    const emptyDocumentStart = await page.evaluate(() => performance.timeOrigin);
    await page.locator('.public-property-listing__reset').click();
    await expect(page.locator('[data-listing-state="success"]')).toBeVisible();
    assert.equal(await page.evaluate(() => performance.timeOrigin), emptyDocumentStart);
    run.checks.push('empty_results_reset_without_navigation');

    const propertyLink = page.locator('.public-property-listing__results a[href*="/properties/"]').first();
    const propertyHref = await propertyLink.getAttribute('href');
    assert.ok(propertyHref?.startsWith('/properties/'));
    await page.locator('.public-property-listing__compare-button').nth(0).click();
    await page.locator('.public-property-listing__compare-button').nth(1).click();
    const selected = await page.evaluate(() => JSON.parse(window.localStorage.getItem('sadat-property-comparison') ?? '[]'));
    assert.equal(selected.length, 2);
    await page.locator('.public-property-listing__compare-tray a').click();
    await expect(page.locator('[data-page="public-comparison"][data-comparison-state="success"]')).toHaveAttribute('data-comparison-count', '2');
    run.checks.push('two_properties_selected_for_comparison');

    await page.goto(`${base}${propertyHref}${propertyHref.includes('?') ? '&' : '?'}lang=${locale}`, { waitUntil: 'networkidle' });
    await expect(page.locator('[data-details-state="success"]')).toBeVisible();
    run.checks.push('published_property_detail');

    await page.goto(`${base}/developers?lang=${locale}`, { waitUntil: 'networkidle' });
    await expect(page.locator('[data-developers-state="success"]')).toBeVisible();
    await Promise.all([
      page.waitForURL(/\/developers\/[^?]+/u, { timeout: 15_000 }),
      page.locator('.public-developer-directory__card-link').first().click(),
    ]);
    await expect(page.locator('[data-developer-profile-state="success"]')).toBeVisible({ timeout: 15_000 });
    run.checks.push('developer_directory_to_public_profile');

    const dimensions = await page.evaluate(() => ({ innerWidth, scrollWidth: document.documentElement.scrollWidth }));
    assert.equal(dimensions.innerWidth, profile.width);
    assert.ok(dimensions.scrollWidth <= dimensions.innerWidth);
    assert.equal(run.pageErrors, 0);
    assert.ok(run.publicHttpStatuses.every(status => status === 200));
    Object.assign(run, dimensions, { status: 'PASS' });
    report.runs.push(run);
    await context.close();
  }
  report.status = 'PASS_LOCAL';
  report.cleanup = true;
  report.remaining = ['Production verification remains pending while the project stays in Demo mode.'];
} catch (error) {
  report.status = 'FAIL_LOCAL';
  report.failure = error instanceof Error ? error.message.slice(0, 900) : String(error).slice(0, 900);
  process.exitCode = 1;
} finally {
  await browser.close();
  report.finishedAt = new Date().toISOString();
  await mkdir('docs/quality/guide-runs', { recursive: true });
  await writeFile('docs/quality/guide-runs/discovery-local-latest.json', `${JSON.stringify(report, null, 2)}\n`);
  console.log(`DISCOVERY_${report.status} runs=${report.runs.length}`);
}
