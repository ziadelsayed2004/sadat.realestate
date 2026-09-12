import { expect, test } from '@playwright/test';

test('article category stays inside media and clear of card content at 360px', async ({ page }) => {
  test.skip(!['mobile-ar', 'mobile-en'].includes(test.info().project.name), 'Article narrow-layout regression runs on both supported copy directions.');
  const locale = test.info().project.name.endsWith('-en') ? 'en' : 'ar';
  const category = {
    id: '67000000000000000000000a', slug: 'buying-tips',
    name: { ar: 'نصائح شراء', en: 'Buying tips' },
    description: { ar: 'إرشادات السوق العقاري', en: 'Property market guidance' }
  };
  await page.route('**/api/v1/public/article-categories**', route => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ data: [category], meta: { requestId: 'articles-responsive-categories' } })
  }));
  await page.route('**/api/v1/public/articles**', route => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({
      data: [{
        id: '67000000000000000000000b', categoryId: category.id, slug: 'buying-in-sadat',
        title: { ar: 'دليلك الكامل للشراء في مدينة السادات 2024', en: 'Your complete guide to buying in Sadat City 2024' },
        body: { ar: 'كل ما تحتاج معرفته قبل شراء عقار في مدينة السادات.', en: 'Everything you need before buying property in Sadat City.' },
        publishedAt: '2024-01-15T10:00:00.000Z', imageUrl: '/assets/clone/pub07-a.png',
        category, authorName: { ar: 'أحمد محمود', en: 'Ahmed Mahmoud' }, readingTimeMinutes: 8
      }],
      meta: { requestId: 'articles-responsive-list', page: 1, limit: 20, total: 1 }
    })
  }));

  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto(`/articles?lang=${locale}`, { waitUntil: 'domcontentloaded' });
  const card = page.locator('[data-article-card]').first();
  await expect(card).toBeVisible();

  const geometry = await page.evaluate(() => {
    const rect = (selector: string) => document.querySelector<HTMLElement>(selector)?.getBoundingClientRect();
    const badge = rect('.public-articles__card-category');
    const media = rect('.public-articles__card-media');
    const title = rect('.public-articles__card-body h2');
    const toolbar = rect('.public-articles__toolbar');
    const card = rect('[data-article-card]');
    const overlaps = (first?: DOMRect, second?: DOMRect) => first !== undefined && second !== undefined
      && first.left < second.right && first.right > second.left && first.top < second.bottom && first.bottom > second.top;
    return {
      viewportWidth: document.documentElement.clientWidth,
      documentWidth: document.documentElement.scrollWidth,
      badgeInsideMedia: badge !== undefined && media !== undefined && badge.top >= media.top && badge.bottom <= media.bottom
        && badge.left >= media.left && badge.right <= media.right,
      badgeTitleOverlap: overlaps(badge, title),
      toolbarCardOverlap: overlaps(toolbar, card),
      cardFits: card !== undefined && card.left >= 0 && card.right <= document.documentElement.clientWidth
    };
  });

  expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.viewportWidth);
  expect(geometry.badgeInsideMedia).toBe(true);
  expect(geometry.badgeTitleOverlap).toBe(false);
  expect(geometry.toolbarCardOverlap).toBe(false);
  expect(geometry.cardFits).toBe(true);
});
