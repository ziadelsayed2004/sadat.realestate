import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { writeFile, readFile } from 'node:fs/promises';
import { chromium, devices, expect } from '@playwright/test';

const base = 'http://127.0.0.1:4174';
const report = { status: 'RUNNING', environment: 'local-built-web-real-API', mockedRoutes: false,
  journeys: ['GUIDE-03'], commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  worktreeChanges: true, runs: [] };
const browser = await chromium.launch();
try {
  const response = await fetch(`${base}/api/v1/public/community/posts?page=1&limit=20`);
  assert.equal(response.status, 200);
  const { data } = await response.json();
  assert.ok(data.items.length > 0);
  for (const [device, options] of [['Desktop', { viewport: { width: 1440, height: 1000 } }], ['Tablet', { viewport: { width: 768, height: 1024 } }], ['Pixel 5', devices['Pixel 5']]]) {
    for (const locale of ['ar', 'en']) {
      const context = await browser.newContext(options);
      try {
        const copy = JSON.parse(await readFile(`apps/web/src/features/localization/messages/${locale}.json`, 'utf8'))['community/presentation-copy#getCommunityPresentationCopy'];
        const page = await context.newPage();
        await page.goto(`${base}/community?lang=${locale}`, { waitUntil: 'networkidle' });
        const cards = page.locator('.public-community__card');
        await expect(cards).toHaveCount(data.items.length);
        for (const post of data.items) {
          const card = page.locator(`[data-post-id="${post.id}"]`);
          await expect(card).toHaveAttribute('data-category', post.category);
          await expect(card.locator('.public-community__author strong')).toHaveText(post.authorName?.[locale] || copy.member);
          assert.deepEqual(await card.locator('.public-community__stat').allTextContents(), [post.likeCount, post.dislikeCount, post.commentCount].map(String));
        }
        const timeOrigin = await page.evaluate(() => performance.timeOrigin);
        const category = data.items[0].category;
        await page.getByRole('button', { name: copy.categories[category], exact: true }).click();
        await expect(cards).toHaveCount(data.items.filter(post => post.category === category).length);
        await page.getByRole('button', { name: copy.categories.all, exact: true }).click();
        await expect(cards).toHaveCount(data.items.length);
        assert.equal(await page.evaluate(() => performance.timeOrigin), timeOrigin);
        const dimensions = await page.evaluate(() => ({ innerWidth, scrollWidth: document.documentElement.scrollWidth }));
        assert.deepEqual(dimensions, { innerWidth: options.viewport.width, scrollWidth: options.viewport.width });
        report.runs.push({ locale, device, dimensions, status: 'PASS', postsVerified: data.items.length,
          checks: ['API_author_category_and_counts_rendered', 'category_filter_and_reset_without_navigation'] });
      } finally { await context.close(); }
    }
  }
  report.status = 'PASS_LOCAL_SUBCASES';
} finally {
  await browser.close();
  if (report.status === 'RUNNING') report.status = 'FAIL_LOCAL';
  report.finishedAt = new Date().toISOString();
  await writeFile('docs/quality/guide-runs/community-presentation-local-latest.json', `${JSON.stringify(report, null, 2)}\n`);
}
console.log(`COMMUNITY_PRESENTATION_PASS runs=${report.runs.length}`);
