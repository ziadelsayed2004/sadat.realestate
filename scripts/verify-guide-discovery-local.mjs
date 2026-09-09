import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';

const base = 'http://127.0.0.1:4173';
const report = { journeys: ['GUIDE-01', 'GUIDE-02'], environment: 'local', mockedRoutes: false, startedAt: new Date().toISOString(), status: 'RUNNING', transitions: [], http: [] };
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 402, height: 874 }, isMobile: true });
page.on('response', response => {
  const path = new URL(response.url()).pathname;
  if (path.startsWith('/api/v1/public/')) report.http.push({ path, status: response.status() });
});
try {
  await page.goto(`${base}/?lang=en`, { waitUntil: 'networkidle' });
  await page.locator('.public-homepage__search button[type="submit"]').click();
  await expect(page).toHaveURL(/\/properties\?/u);
  await expect(page.locator('[data-listing-state="success"]')).toBeVisible();
  report.transitions.push('homepage_search_to_listing');
  await page.locator('input[name="transactionType"][value="rent"]').check();
  await expect(page).toHaveURL(/transactionType=rent/u);
  await expect(page.locator('[data-listing-state="success"]')).toBeVisible();
  report.transitions.push('rent_filter_applied');
  await page.goto(`${base}/properties?lang=en&search=guide-no-match-${Date.now()}`, { waitUntil: 'networkidle' });
  await expect(page.locator('[data-listing-state="empty"]')).toBeVisible();
  const documentStart = await page.evaluate(() => performance.timeOrigin);
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(page.locator('[data-listing-state="success"]')).toBeVisible();
  assert.equal(await page.evaluate(() => performance.timeOrigin), documentStart);
  assert.ok(!page.url().includes('guide-no-match'));
  report.transitions.push('empty_results_reset_without_document_navigation');
  const propertyLink = page.locator('.public-property-listing__results a[href*="/properties/"]').first();
  const propertyHref = await propertyLink.getAttribute('href');
  assert.ok(propertyHref?.startsWith('/properties/'));
  await page.locator('.public-property-listing__compare-button').nth(0).click();
  await page.locator('.public-property-listing__compare-button').nth(1).click();
  const selected = await page.evaluate(() => JSON.parse(window.localStorage.getItem('sadat-property-comparison') ?? '[]'));
  assert.equal(selected.length, 2);
  await page.locator('.public-property-listing__compare-tray a').click();
  await expect(page.locator('[data-page="public-comparison"][data-comparison-state="success"]')).toHaveAttribute('data-comparison-count', '2');
  report.transitions.push('two_properties_selected_for_comparison');
  await page.goto(`${base}${propertyHref}?lang=en`, { waitUntil: 'networkidle' });
  await expect(page.locator('[data-details-state="success"]')).toBeVisible();
  report.transitions.push('published_property_detail');
  await page.goto(`${base}/developers?lang=en`, { waitUntil: 'networkidle' });
  await expect(page.locator('[data-developers-state="success"]')).toBeVisible();
  const profile = page.locator('a[href*="/developers/"]').first();
  await profile.click();
  await expect(page.locator('[data-developer-profile-state="success"]')).toBeVisible();
  report.transitions.push('developer_directory_to_public_profile');
  report.width = await page.evaluate(() => ({ innerWidth, scrollWidth: document.documentElement.scrollWidth }));
  assert.equal(report.width.innerWidth, 402);
  assert.ok(report.width.scrollWidth <= 402);
  report.status = 'PASS_LOCAL_PARTIAL';
  report.remaining = ['Authenticated favorites must be exercised before GUIDE-02 closure.', 'Production verification remains pending.'];
} catch (error) {
  report.status = 'FAIL_LOCAL';
  report.failure = error instanceof Error ? error.message.slice(0, 700) : 'Unknown failure';
  process.exitCode = 1;
} finally {
  await browser.close();
  report.finishedAt = new Date().toISOString();
  await fs.mkdir('docs/quality/guide-runs', { recursive: true });
  await fs.writeFile('docs/quality/guide-runs/discovery-local-latest.json', `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report));
}
