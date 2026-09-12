import { expect, test } from '@playwright/test';
import { routePublicHomepageApi } from './public-fixtures';

test.beforeEach(({}, testInfo) => {
  test.skip(!['mobile-ar', 'mobile-en'].includes(testInfo.project.name), 'Homepage narrow-layout regression runs on the two supported copy directions.');
});

test('homepage statistics and community cards stay readable on narrow screens', async ({ page }) => {
  const locale = test.info().project.name.endsWith('-en') ? 'en' : 'ar';
  await routePublicHomepageApi(page);
  await page.goto(`/?lang=${locale}`, { waitUntil: 'domcontentloaded' });

  const summary = page.locator('.public-homepage__summary');
  const community = page.locator('.public-homepage__section--community');
  await expect(summary).toBeVisible();
  await expect(community).toBeVisible();

  const geometry = await page.evaluate(() => {
    const grid = document.querySelector<HTMLElement>('.public-homepage__section--community .public-homepage__content-grid');
    const cards = Array.from(grid?.querySelectorAll<HTMLElement>('.public-homepage__content-card') ?? []);
    const summaryItems = Array.from(document.querySelectorAll<HTMLElement>('.public-homepage__summary-item'));
    const headersAreSeparated = cards.every(card => {
      const badge = card.querySelector<HTMLElement>('.public-homepage__community-header > .public-homepage__content-type');
      const author = card.querySelector<HTMLElement>('.public-homepage__community-author');
      if (badge === null || author === null) return false;
      const badgeRect = badge.getBoundingClientRect();
      const authorRect = author.getBoundingClientRect();
      return badgeRect.right <= authorRect.left + 0.5 || authorRect.right <= badgeRect.left + 0.5;
    });

    return {
      viewportWidth: document.documentElement.clientWidth,
      documentWidth: document.documentElement.scrollWidth,
      communityColumns: grid === null ? 0 : getComputedStyle(grid).gridTemplateColumns.split(' ').length,
      communityCardCount: cards.length,
      headersAreSeparated,
      summaryItemsFit: summaryItems.every(item => item.scrollWidth <= item.clientWidth + 1)
    };
  });

  expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.viewportWidth);
  expect(geometry.communityColumns).toBe(1);
  expect(geometry.communityCardCount).toBe(2);
  expect(geometry.headersAreSeparated).toBe(true);
  expect(geometry.summaryItemsFit).toBe(true);
});
